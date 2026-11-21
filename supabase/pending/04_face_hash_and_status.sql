-- ==============================================================================
-- PENDENTE DE APLICAÇÃO MANUAL NO SUPABASE DASHBOARD / CLI
-- Arquivo: supabase/pending/04_face_hash_and_status.sql
-- Ordem de Aplicação: 4
-- Objetivo: Adicionar coluna de hash SHA-256 de conteúdo à cara, coluna de estado
--           ('active', 'private', 'deleted') para remoção lógica, carimbo de data
--           e índice único parcial impedindo caras públicas duplicadas.
-- ==============================================================================

-- 1. Colunas de Hash e Estado na tabela saved_faces
ALTER TABLE public.saved_faces
  ADD COLUMN IF NOT EXISTS content_hash text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 2. Restrição de status válido
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_saved_faces_status'
  ) THEN
    ALTER TABLE public.saved_faces
      ADD CONSTRAINT chk_saved_faces_status
      CHECK (status IN ('active', 'private', 'deleted'));
  END IF;
END $$;

-- 3. Índice para busca rápida de hash
CREATE INDEX IF NOT EXISTS idx_saved_faces_hash
  ON public.saved_faces (content_hash)
  WHERE content_hash IS NOT NULL;

-- 4. ÍNDICE ÚNICO PARCIAL ANTI-DUPLICATA
-- Impede categoricamente duas caras PÚBLICAS com o mesmo hash de imagem
CREATE UNIQUE INDEX IF NOT EXISTS uq_idx_saved_faces_public_hash
  ON public.saved_faces (content_hash)
  WHERE is_public = true AND status = 'active' AND content_hash IS NOT NULL;

-- 5. Índice de status para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_saved_faces_status_public
  ON public.saved_faces (status, is_public)
  WHERE status = 'active';

-- ------------------------------------------------------------------------------
-- INSTRUÇÕES DE ROLLBACK:
-- DROP INDEX IF EXISTS public.uq_idx_saved_faces_public_hash;
-- DROP INDEX IF EXISTS public.idx_saved_faces_status_public;
-- DROP INDEX IF EXISTS public.idx_saved_faces_hash;
-- ALTER TABLE public.saved_faces DROP CONSTRAINT IF EXISTS chk_saved_faces_status;
-- ALTER TABLE public.saved_faces DROP COLUMN IF EXISTS deleted_at;
-- ALTER TABLE public.saved_faces DROP COLUMN IF EXISTS status;
-- ALTER TABLE public.saved_faces DROP COLUMN IF EXISTS content_hash;
-- ------------------------------------------------------------------------------
