-- ==============================================================================
-- PENDENTE DE APLICAÇÃO MANUAL NO SUPABASE DASHBOARD / CLI
-- Arquivo: supabase/pending/01_unaccent_and_search_indexes.sql
-- Objetivo: Habilitar busca textual insensível a acentos e maiúsculas (unaccent)
--           e criar índices para otimizar a filtragem por relevância e paginação.
-- NOTA: O front-end possui FALLBACK completo no cliente para normalização de acentos
--       e ordenação por relevância (prefixo > palavra > trecho), operando perfeitamente
--       mesmo antes desta migração ser executada.
-- ==============================================================================

-- 1. Habilitar extensão unaccent e pg_trgm (se ainda não habilitadas)
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Função imutável auxiliar para uso em índices expressivos (necessário para o Postgres)
CREATE OR REPLACE FUNCTION public.f_unaccent(text)
  RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
AS $func$
  SELECT public.unaccent('public.unaccent', $1)
$func$;

-- 3. Índices de busca textual para saved_faces
-- Permite busca instantânea por ILIKE ou operador de trigrama ignorando acentos
CREATE INDEX IF NOT EXISTS idx_saved_faces_unaccent_name
  ON public.saved_faces (lower(public.f_unaccent(name)));

CREATE INDEX IF NOT EXISTS idx_saved_faces_community_list
  ON public.saved_faces (is_public, is_hidden, is_official, created_at DESC);

-- 4. Índices de busca textual para saved_decks
CREATE INDEX IF NOT EXISTS idx_saved_decks_unaccent_name
  ON public.saved_decks (lower(public.f_unaccent(name)));

CREATE INDEX IF NOT EXISTS idx_saved_decks_unaccent_author
  ON public.saved_decks (lower(public.f_unaccent(coalesce(author_name, ''))));

CREATE INDEX IF NOT EXISTS idx_saved_decks_community_list
  ON public.saved_decks (is_public, is_hidden, is_official, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_saved_decks_featured
  ON public.saved_decks (is_featured, featured_order ASC)
  WHERE is_featured = true AND is_official = true AND is_hidden = false;
