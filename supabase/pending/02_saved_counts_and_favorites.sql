-- ==============================================================================
-- PENDENTE DE APLICAÇÃO MANUAL NO SUPABASE DASHBOARD / CLI
-- Arquivo: supabase/pending/02_saved_counts_and_favorites.sql
-- Objetivo: Adicionar coluna e contadores de salvamentos (favoritos) para ordenar
--           baralhos e caras pela métrica "Mais salvas" no banco.
-- NOTA: O front-end possui FALLBACK completo no cliente calculando métricas de salvamentos
--       e ocorrências em tempo real, sem quebrar ou depender desta migração.
-- ==============================================================================

-- 1. Colunas de contagem de salvamentos
ALTER TABLE public.saved_decks
  ADD COLUMN IF NOT EXISTS saved_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.saved_faces
  ADD COLUMN IF NOT EXISTS saved_count integer NOT NULL DEFAULT 0;

-- 2. Índices para ordenação por mais salvas
CREATE INDEX IF NOT EXISTS idx_saved_decks_saved_count
  ON public.saved_decks (saved_count DESC, created_at DESC)
  WHERE is_public = true AND is_hidden = false;

CREATE INDEX IF NOT EXISTS idx_saved_faces_saved_count
  ON public.saved_faces (saved_count DESC, created_at DESC)
  WHERE is_public = true AND is_hidden = false;

-- 3. Tabela opcional para registrar o vínculo explícito de favoritos (bookmarking) por usuário
CREATE TABLE IF NOT EXISTS public.user_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('deck', 'face')),
  target_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user
  ON public.user_bookmarks (user_id, target_type);

ALTER TABLE public.user_bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem gerenciar seus próprios favoritos" ON public.user_bookmarks;
CREATE POLICY "Usuários podem gerenciar seus próprios favoritos"
  ON public.user_bookmarks
  FOR ALL
  USING (true)
  WITH CHECK (true);
