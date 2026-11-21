-- ==============================================================================
-- PENDENTE DE APLICAÇÃO MANUAL NO SUPABASE DASHBOARD / CLI
-- Arquivo: supabase/pending/08_server_enforcement_tanacara_owner.sql
-- Ordem de Aplicação: 8
-- Objetivo: Garantia de segurança estrita no servidor (PostgreSQL) para:
--           1) Impedir que usuários comuns criem ou atualizem caras/baralhos
--              com dono "Tá na Cara!" ou flag "is_official = true";
--           2) Impedir que usuários comuns alterem os campos de destaque na Home
--              (is_featured, featured_order);
--           3) Preservar a criação e edição normal de caras e baralhos da comunidade.
-- Dependências: Requer a função public.is_admin() existente.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TRIGGER FUNCTION: Validar autoria do dono "Tá na Cara!" em saved_faces
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_face_owner_permission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_adm boolean;
BEGIN
  -- Se estiver tentando definir autoria "Tá na Cara!" ou is_official = true
  IF (NEW.author_name = 'Tá na Cara!' OR coalesce(NEW.is_official, false) = true) THEN
    -- Verifica se o usuário atual é administrador
    v_is_adm := public.is_admin(auth.uid()::text);
    
    -- Se não for admin (ou chamada anon sem login de admin), rejeita categoricamente
    IF NOT v_is_adm THEN
      RAISE EXCEPTION 'Acesso negado: apenas administradores podem atribuir a autoria "Tá na Cara!".';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_face_owner ON public.saved_faces;
CREATE TRIGGER trg_check_face_owner
  BEFORE INSERT OR UPDATE ON public.saved_faces
  FOR EACH ROW
  EXECUTE FUNCTION public.check_face_owner_permission();


-- ------------------------------------------------------------------------------
-- 2. TRIGGER FUNCTION: Validar autoria e destaques da Home em saved_decks
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_deck_owner_and_featured_permission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_adm boolean;
BEGIN
  -- 2.1 Validação de autoria "Tá na Cara!" ou is_official
  IF (NEW.author_name = 'Tá na Cara!' OR coalesce(NEW.is_official, false) = true) THEN
    v_is_adm := public.is_admin(auth.uid()::text);
    IF NOT v_is_adm THEN
      RAISE EXCEPTION 'Acesso negado: apenas administradores podem criar ou editar baralhos com autoria "Tá na Cara!".';
    END IF;
  END IF;

  -- 2.2 Validação de controle de destaques na tela inicial (Home)
  IF (coalesce(NEW.is_featured, false) = true OR coalesce(NEW.featured_order, 0) > 0) THEN
    -- Se for INSERT ou se estiver alterando status de destaque
    IF (TG_OP = 'INSERT' OR OLD.is_featured IS DISTINCT FROM NEW.is_featured OR OLD.featured_order IS DISTINCT FROM NEW.featured_order) THEN
      v_is_adm := public.is_admin(auth.uid()::text);
      IF NOT v_is_adm THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem definir baralhos em destaque na tela principal.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_deck_owner_and_featured ON public.saved_decks;
CREATE TRIGGER trg_check_deck_owner_and_featured
  BEFORE INSERT OR UPDATE ON public.saved_decks
  FOR EACH ROW
  EXECUTE FUNCTION public.check_deck_owner_and_featured_permission();


-- ------------------------------------------------------------------------------
-- 3. VERIFICAÇÃO / DRY-RUN (SOMENTE LEITURA)
-- Testa se as triggers e funções foram criadas corretamente
-- ------------------------------------------------------------------------------
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name IN ('trg_check_face_owner', 'trg_check_deck_owner_and_featured');


-- ------------------------------------------------------------------------------
-- INSTRUÇÕES DE ROLLBACK:
-- DROP TRIGGER IF EXISTS trg_check_deck_owner_and_featured ON public.saved_decks;
-- DROP TRIGGER IF EXISTS trg_check_face_owner ON public.saved_faces;
-- DROP FUNCTION IF EXISTS public.check_deck_owner_and_featured_permission();
-- DROP FUNCTION IF EXISTS public.check_face_owner_permission();
-- ------------------------------------------------------------------------------
