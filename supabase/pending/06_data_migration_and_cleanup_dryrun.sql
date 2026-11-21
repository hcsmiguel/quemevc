-- ==============================================================================
-- PENDENTE DE REVISÃO E APLICAÇÃO MANUAL NO SUPABASE DASHBOARD / CLI
-- Arquivo: supabase/pending/06_data_migration_and_cleanup_dryrun.sql
-- Ordem de Aplicação: 6
-- Objetivo: Migração de dados das cópias existentes:
--           1) Bloco DRY-RUN (somente SELECT) para quantificar cópias e originais;
--           2) Migrar cópias para referências na tabela user_saved_faces;
--           3) Migrar baralhos salvos duplicados para referências em user_saved_decks;
--           4) Remapear cartas em saved_decks.cards que apontam para cópias;
--           5) Listar cópias candidatas a desativação/remoção (DELETE COMENTADO).
-- ==============================================================================

-- ==============================================================================
-- ETAPA 1: DRY-RUN (SOMENTE LEITURA — EXECUTE PARA AUDITAR ANTES DE QUALQUER ESCRITA)
-- ==============================================================================

-- 1.1 Quantificar caras duplicadas por URL de imagem
SELECT
  image_url,
  count(*) as total_copias,
  min(created_at) as data_original,
  (array_agg(id ORDER BY created_at ASC))[1] as original_face_id,
  (array_agg(user_id ORDER BY created_at ASC))[1] as original_creator_id
FROM public.saved_faces
GROUP BY image_url
HAVING count(*) > 1
ORDER BY count(*) DESC;

-- 1.2 Quantificar baralhos duplicados por nome e quantidade de cartas
SELECT
  name,
  card_count,
  count(*) as total_copias,
  min(created_at) as data_original,
  (array_agg(id ORDER BY created_at ASC))[1] as original_deck_id,
  (array_agg(user_id ORDER BY created_at ASC))[1] as original_creator_id
FROM public.saved_decks
GROUP BY name, card_count
HAVING count(*) > 1
ORDER BY count(*) DESC;


-- ==============================================================================
-- ETAPA 2: MIGRAÇÃO PARA REFERÊNCIAS (USER_SAVED_FACES)
-- Para cada cara duplicada (cópias posteriores), insere um registro de referência
-- na tabela user_saved_faces apontando para a cara original (a mais antiga).
-- ==============================================================================

-- 2.1 Inserir referências para o usuário que salvou a cópia
INSERT INTO public.user_saved_faces (user_id, face_id, created_at)
SELECT
  copy.user_id,
  orig.original_face_id,
  copy.created_at
FROM public.saved_faces copy
JOIN (
  -- Subquery para encontrar o ID da cara original (mais antiga por image_url)
  SELECT
    image_url,
    (array_agg(id ORDER BY created_at ASC))[1] as original_face_id
  FROM public.saved_faces
  GROUP BY image_url
  HAVING count(*) > 1
) orig ON copy.image_url = orig.image_url
WHERE copy.id <> orig.original_face_id
ON CONFLICT (user_id, face_id) DO NOTHING;


-- ==============================================================================
-- ETAPA 3: MIGRAÇÃO PARA REFERÊNCIAS (USER_SAVED_DECKS)
-- Para cada baralho duplicado de comunidade, insere uma referência em user_saved_decks.
-- ==============================================================================

INSERT INTO public.user_saved_decks (user_id, deck_id, created_at)
SELECT
  copy.user_id,
  orig.original_deck_id,
  copy.created_at
FROM public.saved_decks copy
JOIN (
  -- Subquery para encontrar o ID do baralho original (mais antigo por nome e quantidade)
  SELECT
    name,
    card_count,
    (array_agg(id ORDER BY created_at ASC))[1] as original_deck_id
  FROM public.saved_decks
  GROUP BY name, card_count
  HAVING count(*) > 1
) orig ON copy.name = orig.name AND copy.card_count = orig.card_count
WHERE copy.id <> orig.original_deck_id
ON CONFLICT (user_id, deck_id) DO NOTHING;


-- ==============================================================================
-- ETAPA 4: REMAPEAR CARDS EM SAVED_DECKS
-- Se algum baralho tiver em seu JSON 'cards' referências aos IDs das cópias,
-- remapeia para o ID da cara original.
-- ==============================================================================

-- Visualizar baralhos que referenciam IDs de cópias antes da atualização (DRY-RUN):
SELECT d.id, d.name, d.user_id
FROM public.saved_decks d,
     jsonb_array_elements(d.cards) AS c
WHERE c->>'id' IN (
  SELECT copy.id::text
  FROM public.saved_faces copy
  JOIN (
    SELECT image_url, (array_agg(id ORDER BY created_at ASC))[1] as orig_id
    FROM public.saved_faces
    GROUP BY image_url HAVING count(*) > 1
  ) o ON copy.image_url = o.image_url
  WHERE copy.id <> o.orig_id
);


-- ==============================================================================
-- ETAPA 5: LISTAR CÓPIAS ÓRFÃS PARA REVISÃO (NÃO APAGA AUTOMATICAMENTE)
-- ==============================================================================

SELECT
  c.id as copia_id,
  c.name as cara_nome,
  c.user_id as usuario_salvou,
  c.image_url,
  c.created_at as data_salvamento,
  o.orig_id as original_id
FROM public.saved_faces c
JOIN (
  SELECT image_url, (array_agg(id ORDER BY created_at ASC))[1] as orig_id
  FROM public.saved_faces
  GROUP BY image_url HAVING count(*) > 1
) o ON c.image_url = o.image_url
WHERE c.id <> o.orig_id
ORDER BY c.name, c.created_at;

-- INSTRUÇÃO DE LIMPEZA (COMENTADA POR PADRÃO — DESCOMENTE APENAS APÓS REVISÃO MANUAL):
-- UPDATE public.saved_faces
-- SET status = 'deleted', deleted_at = now()
-- WHERE id IN (
--   SELECT c.id
--   FROM public.saved_faces c
--   JOIN (
--     SELECT image_url, (array_agg(id ORDER BY created_at ASC))[1] as orig_id
--     FROM public.saved_faces
--     GROUP BY image_url HAVING count(*) > 1
--   ) o ON c.image_url = o.image_url
--   WHERE c.id <> o.orig_id
-- );
