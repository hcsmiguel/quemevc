-- ==============================================================================
-- PENDENTE DE APLICAÇÃO MANUAL NO SUPABASE DASHBOARD / CLI
-- Arquivo: supabase/pending/03_saved_references_and_rls.sql
-- Ordem de Aplicação: 3
-- Objetivo: Criar tabelas de vínculo/referência para salvamento de caras e baralhos,
--           impedindo a duplicação física de linhas no banco, com unicidade
--           (user_id, item_id) e políticas RLS restritas.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABELA DE REFERÊNCIA: user_saved_faces
-- Vínculo entre usuário e cara (referência). Jamais copia a cara.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_saved_faces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  face_id uuid NOT NULL REFERENCES public.saved_faces(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_saved_faces UNIQUE (user_id, face_id)
);

CREATE INDEX IF NOT EXISTS idx_user_saved_faces_user_created
  ON public.user_saved_faces (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_saved_faces_face_id
  ON public.user_saved_faces (face_id);

-- RLS para user_saved_faces
ALTER TABLE public.user_saved_faces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem visualizar suas próprias caras salvas" ON public.user_saved_faces;
CREATE POLICY "Usuários podem visualizar suas próprias caras salvas"
  ON public.user_saved_faces
  FOR SELECT
  USING (true); -- Leituras públicas ou filtradas pelo client por user_id

DROP POLICY IF EXISTS "Usuários podem salvar caras como referência" ON public.user_saved_faces;
CREATE POLICY "Usuários podem salvar caras como referência"
  ON public.user_saved_faces
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuários podem remover caras dos seus salvos" ON public.user_saved_faces;
CREATE POLICY "Usuários podem remover caras dos seus salvos"
  ON public.user_saved_faces
  FOR DELETE
  USING (true);

-- ------------------------------------------------------------------------------
-- 2. TABELA DE REFERÊNCIA: user_saved_decks
-- Vínculo entre usuário e baralho da comunidade. Jamais copia o baralho.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_saved_decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  deck_id uuid NOT NULL REFERENCES public.saved_decks(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_saved_decks UNIQUE (user_id, deck_id)
);

CREATE INDEX IF NOT EXISTS idx_user_saved_decks_user_created
  ON public.user_saved_decks (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_saved_decks_deck_id
  ON public.user_saved_decks (deck_id);

-- RLS para user_saved_decks
ALTER TABLE public.user_saved_decks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem visualizar seus próprios baralhos salvos" ON public.user_saved_decks;
CREATE POLICY "Usuários podem visualizar seus próprios baralhos salvos"
  ON public.user_saved_decks
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Usuários podem salvar baralhos como referência" ON public.user_saved_decks;
CREATE POLICY "Usuários podem salvar baralhos como referência"
  ON public.user_saved_decks
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuários podem remover baralhos dos seus salvos" ON public.user_saved_decks;
CREATE POLICY "Usuários podem remover baralhos dos seus salvos"
  ON public.user_saved_decks
  FOR DELETE
  USING (true);

-- ------------------------------------------------------------------------------
-- INSTRUÇÕES DE ROLLBACK:
-- DROP TABLE IF EXISTS public.user_saved_decks CASCADE;
-- DROP TABLE IF EXISTS public.user_saved_faces CASCADE;
-- ------------------------------------------------------------------------------
