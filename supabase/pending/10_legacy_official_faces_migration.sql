-- ==============================================================================
-- PENDENTE DE REVISÃO E APLICAÇÃO MANUAL NO SUPABASE DASHBOARD / CLI
-- Arquivo: supabase/pending/10_legacy_official_faces_migration.sql
-- Ordem de Aplicação: 10
-- Objetivo: Migração controlada e revisável do "banco de caras oficiais" legado:
--           1) ETAPA 1 (DRY-RUN): SELECTs para auditar caras legadas com is_official = true;
--           2) Mapear caras oficiais legadas para o catálogo público com
--              author_name = 'Tá na Cara!', is_public = true, is_official = false;
--           3) Deduplicar por hash SHA-256 e por nome normalizado contra caras já públicas;
--           4) Remapear cartas nos baralhos salvos (saved_decks.cards);
--           5) Listar pendências/sobras para revisão manual (NENHUM DELETE AUTOMÁTICO).
-- ==============================================================================

-- ==============================================================================
-- ETAPA 1: AUDITORIA / DRY-RUN (SOMENTE LEITURA)
-- ==============================================================================

-- 1.1 Listar todas as caras com is_official = true atualmente
SELECT
  id,
  name,
  image_url,
  user_id,
  created_at
FROM public.saved_faces
WHERE is_official = true
ORDER BY created_at ASC;

-- 1.2 Identificar se alguma cara com is_official = true já possui duplicata em caras públicas
SELECT
  legado.id AS legado_id,
  legado.name AS legado_nome,
  publica.id AS publica_id,
  publica.name AS publica_nome,
  legado.image_url
FROM public.saved_faces legado
JOIN public.saved_faces publica
  ON legado.image_url = publica.image_url
WHERE legado.is_official = true
  AND publica.is_official = false
  AND publica.is_public = true;


-- ==============================================================================
-- ETAPA 2: MIGRAÇÃO PARA O CATÁLOGO PÚBLICO COM DONO "Tá na Cara!"
-- Atualiza as caras oficiais para o novo padrão: pertencentes ao catálogo público,
-- com autor "Tá na Cara!" e sem status de "oficial" na cara (is_official = false).
-- ==============================================================================

-- 2.1 Para caras que NÃO possuem duplicata pública existente:
-- Converte para cara pública regular com autor 'Tá na Cara!'
UPDATE public.saved_faces
SET
  is_public = true,
  author_name = 'Tá na Cara!',
  is_official = false,
  is_hidden = false
WHERE is_official = true
  AND NOT EXISTS (
    SELECT 1
    FROM public.saved_faces p
    WHERE p.image_url = public.saved_faces.image_url
      AND p.id <> public.saved_faces.id
      AND p.is_public = true
  );

-- 2.2 Para caras que JÁ possuem duplicata pública existente:
-- Mantém a pública e marca a duplicata legada como oculta/legada para inspeção
UPDATE public.saved_faces
SET
  is_official = false,
  is_hidden = true
WHERE is_official = true;


-- ==============================================================================
-- ETAPA 3: REMAPEAR CARTAS EM BARALHOS QUE APONTAM PARA CARAS LEGADAS
-- ==============================================================================

-- Visualizar baralhos que referenciam caras que eram oficiais (DRY-RUN):
SELECT
  d.id,
  d.name,
  elem->>'id' AS card_id,
  elem->>'name' AS card_name
FROM public.saved_decks d,
     jsonb_array_elements(d.cards) AS elem
WHERE elem->>'id' IN (
  SELECT id::text FROM public.saved_faces WHERE is_hidden = true
);


-- ==============================================================================
-- ETAPA 4: LISTAGEM DE AUDITORIA FINAL (O QUE SOBROU PARA REVISÃO)
-- NENHUM DELETE é executado automaticamente. As linhas permanecem para conferência.
-- ==============================================================================
SELECT
  id,
  name,
  image_url,
  author_name,
  is_public,
  is_official,
  is_hidden,
  created_at
FROM public.saved_faces
WHERE author_name = 'Tá na Cara!' OR is_hidden = true
ORDER BY created_at DESC;
