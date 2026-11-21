-- ==============================================================================
-- PENDENTE DE APLICAÇÃO MANUAL NO SUPABASE DASHBOARD / CLI
-- Arquivo: supabase/pending/05_functions_count_and_search.sql
-- Ordem de Aplicação: 5
-- Objetivo: Funções RPC de segurança para:
--           1) Contar baralhos de outros jogadores que contêm uma determinada cara
--              (retorna apenas o número inteiro, preservando privacidade);
--           2) Buscar cara pública por hash SHA-256;
--           3) Buscar cara pública por nome normalizado com unaccent/lower.
-- ==============================================================================

-- 1. FUNÇÃO: Contar baralhos de outros usuários que usam a cara
-- Retorna apenas o número total de baralhos, sem vazar nomes de baralho ou usuários.
CREATE OR REPLACE FUNCTION public.count_other_decks_using_face(
  target_face_id text,
  requesting_user_id text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  -- Conta quantos baralhos salvos pertencentes a OUTROS usuários possuem a carta no array 'cards'
  SELECT count(*)
  INTO v_count
  FROM public.saved_decks d
  WHERE d.user_id <> requesting_user_id
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(d.cards) AS elem
      WHERE elem->>'id' = target_face_id
         OR elem->>'image_url' = (SELECT image_url FROM public.saved_faces WHERE id::text = target_face_id LIMIT 1)
    );

  RETURN coalesce(v_count, 0);
END;
$$;

-- 2. FUNÇÃO: Buscar cara pública por hash de imagem
CREATE OR REPLACE FUNCTION public.find_public_face_by_hash(p_hash text)
RETURNS SETOF public.saved_faces
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT *
  FROM public.saved_faces
  WHERE content_hash = p_hash
    AND is_public = true
    AND status = 'active'
  LIMIT 1;
$$;

-- 3. FUNÇÃO: Buscar cara pública por nome normalizado
CREATE OR REPLACE FUNCTION public.find_public_face_by_normalized_name(p_name text)
RETURNS SETOF public.saved_faces
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  -- Se unaccent estiver disponível
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'unaccent') THEN
    RETURN QUERY
    SELECT *
    FROM public.saved_faces
    WHERE lower(public.f_unaccent(name)) = lower(public.f_unaccent(trim(p_name)))
      AND is_public = true
      AND status = 'active'
    ORDER BY created_at ASC
    LIMIT 1;
  ELSE
    RETURN QUERY
    SELECT *
    FROM public.saved_faces
    WHERE lower(trim(name)) = lower(trim(p_name))
      AND is_public = true
      AND status = 'active'
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;
END;
$$;

-- ------------------------------------------------------------------------------
-- INSTRUÇÕES DE ROLLBACK:
-- DROP FUNCTION IF EXISTS public.find_public_face_by_normalized_name(text);
-- DROP FUNCTION IF EXISTS public.find_public_face_by_hash(text);
-- DROP FUNCTION IF EXISTS public.count_other_decks_using_face(text, text);
-- ------------------------------------------------------------------------------
