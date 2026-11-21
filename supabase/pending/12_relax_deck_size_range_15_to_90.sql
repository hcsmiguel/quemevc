-- ==============================================================================
-- PENDENTE DE APLICAÇÃO MANUAL NO SUPABASE DASHBOARD / CLI
-- Arquivo: supabase/pending/12_relax_deck_size_range_15_to_90.sql
-- Ordem de Aplicação: 12 (após 09_atomic_official_deck_rpc.sql e 11_deck_needs_adjustment_view.sql)
-- Objetivo:
--   1) Flexibilizar a regra de tamanho de baralhos: qualquer quantidade de 15 a 90 cartas
--      (mínimo 15, máximo 90). Os valores 15, 30, 60 e 90 tornam-se atalhos de preenchimento.
--   2) Atualizar a RPC transacional save_official_deck_atomic para validar v_total_cards
--      entre 15 e 90 cartas (em vez de exigir exatamente 15, 30, 60 ou 90).
--   3) Reavaliar a regra "precisa de ajuste": um baralho que perder cartas (por exclusão
--      ou moderação) continua jogável se ainda restarem 15 ou mais cartas válidas.
--      Só entra em needs_adjustment quando restarem menos de 15 cartas válidas.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PRÉ-VERIFICAÇÃO (OPCIONAL): Verificar baralhos existentes
-- ------------------------------------------------------------------------------
-- SELECT id, name, card_count, is_official, is_public
-- FROM public.saved_decks
-- ORDER BY created_at DESC;

-- ------------------------------------------------------------------------------
-- 1. ATUALIZAÇÃO DA RPC: save_official_deck_atomic
-- Permite baralhos com qualquer quantidade de 15 a 90 cartas
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.save_official_deck_atomic(
  p_deck_id uuid DEFAULT NULL,
  p_name text DEFAULT '',
  p_description text DEFAULT '',
  p_is_featured boolean DEFAULT false,
  p_existing_face_ids uuid[] DEFAULT '{}',
  p_new_faces jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_id text := auth.uid()::text;
  v_is_adm boolean;
  v_clean_name text;
  v_total_cards integer;
  v_new_face_record jsonb;
  v_created_face_id uuid;
  v_all_cards jsonb := '[]'::jsonb;
  v_face_row record;
  v_deck_id uuid;
  v_result jsonb;
BEGIN
  -- 1. Validação de Administrador
  v_is_adm := public.is_admin(v_caller_id);
  IF NOT v_is_adm THEN
    RAISE EXCEPTION 'Acesso negado: operação restrita a administradores.';
  END IF;

  -- 2. Validação do Nome do Baralho
  v_clean_name := trim(p_name);
  IF length(v_clean_name) = 0 THEN
    RAISE EXCEPTION 'O nome do baralho não pode estar vazio.';
  END IF;
  IF length(v_clean_name) > 35 THEN
    RAISE EXCEPTION 'O nome do baralho pode ter no máximo 35 caracteres.';
  END IF;

  -- 3. Validação da Quantidade Total de Cartas (Faixa de 15 a 90 cartas)
  v_total_cards := coalesce(cardinality(p_existing_face_ids), 0) + jsonb_array_length(p_new_faces);
  IF v_total_cards < 15 OR v_total_cards > 90 THEN
    RAISE EXCEPTION 'Quantidade de cartas inválida: %. O baralho oficial precisa ter entre 15 e 90 cartas (mínimo 15, máximo 90).', v_total_cards;
  END IF;

  -- 4. Inserir Novas Caras diretamente no catálogo público com dono "Tá na Cara!"
  IF jsonb_array_length(p_new_faces) > 0 THEN
    FOR v_new_face_record IN SELECT * FROM jsonb_array_elements(p_new_faces)
    LOOP
      IF length(trim(coalesce(v_new_face_record->>'name', ''))) = 0 THEN
        RAISE EXCEPTION 'Toda nova cara precisa de um nome válido.';
      END IF;
      IF length(trim(coalesce(v_new_face_record->>'image_url', ''))) = 0 THEN
        RAISE EXCEPTION 'Toda nova cara precisa de uma imagem enviada.';
      END IF;

      INSERT INTO public.saved_faces (
        user_id,
        name,
        image_url,
        is_public,
        author_name,
        is_official,
        is_hidden
      ) VALUES (
        coalesce(v_caller_id, 'admin_tanacara'),
        trim(v_new_face_record->>'name'),
        v_new_face_record->>'image_url',
        true,
        'Tá na Cara!',
        false,
        false
      )
      RETURNING id INTO v_created_face_id;

      v_all_cards := v_all_cards || jsonb_build_object(
        'id', v_created_face_id::text,
        'name', trim(v_new_face_record->>'name'),
        'imageUrl', v_new_face_record->>'image_url'
      );
    END LOOP;
  END IF;

  -- 5. Carregar Caras Selecionadas do Catálogo Existente
  IF cardinality(p_existing_face_ids) > 0 THEN
    FOR v_face_row IN
      SELECT id, name, image_url
      FROM public.saved_faces
      WHERE id = ANY(p_existing_face_ids)
    LOOP
      v_all_cards := v_all_cards || jsonb_build_object(
        'id', v_face_row.id::text,
        'name', v_face_row.name,
        'imageUrl', v_face_row.image_url
      );
    END LOOP;
  END IF;

  -- 6. Validação de Integridade Final
  IF jsonb_array_length(v_all_cards) != v_total_cards THEN
    RAISE EXCEPTION 'Inconsistência de cartas: esperado %, montado %.', v_total_cards, jsonb_array_length(v_all_cards);
  END IF;

  -- 7. Criar ou Atualizar Baralho Oficial
  IF p_deck_id IS NOT NULL THEN
    UPDATE public.saved_decks
    SET
      name = v_clean_name,
      description = trim(coalesce(p_description, '')),
      is_featured = p_is_featured,
      cover_image_url = v_all_cards->0->>'imageUrl',
      card_count = v_total_cards,
      cards = v_all_cards,
      is_public = true,
      author_name = 'Tá na Cara!',
      is_official = true
    WHERE id = p_deck_id
    RETURNING id INTO v_deck_id;

    IF v_deck_id IS NULL THEN
      RAISE EXCEPTION 'Baralho oficial % não encontrado para edição.', p_deck_id;
    END IF;
  ELSE
    INSERT INTO public.saved_decks (
      user_id,
      name,
      description,
      cover_image_url,
      card_count,
      cards,
      is_draft,
      is_public,
      is_featured,
      author_name,
      is_official,
      is_hidden
    ) VALUES (
      coalesce(v_caller_id, 'admin_tanacara'),
      v_clean_name,
      trim(coalesce(p_description, '')),
      v_all_cards->0->>'imageUrl',
      v_total_cards,
      v_all_cards,
      false,
      true,
      p_is_featured,
      'Tá na Cara!',
      true,
      false
    )
    RETURNING id INTO v_deck_id;
  END IF;

  v_result := jsonb_build_object(
    'success', true,
    'deck_id', v_deck_id,
    'total_cards', v_total_cards
  );

  RETURN v_result;
END;
$$;


-- ------------------------------------------------------------------------------
-- 2. ATUALIZAÇÃO DA VIEW E FUNÇÃO: check_deck_has_broken_cards
-- "precisa de ajuste" só é acionado se restarem MENOS de 15 cartas válidas.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_deck_has_broken_cards(p_deck_id uuid)
RETURNS TABLE (
  has_broken boolean,
  broken_count integer,
  broken_card_ids text[],
  valid_cards_count integer,
  needs_adjustment boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_cards jsonb;
  v_broken_ids text[] := '{}';
  v_total_cards integer := 0;
  v_card record;
  v_face_exists boolean;
  v_face_public boolean;
  v_face_status text;
  v_face_hidden boolean;
  v_valid_count integer;
BEGIN
  SELECT cards INTO v_cards FROM public.saved_decks WHERE id = p_deck_id;
  IF v_cards IS NULL THEN
    RETURN QUERY SELECT false, 0, '{}'::text[], 0, false;
    RETURN;
  END IF;

  v_total_cards := jsonb_array_length(v_cards);

  FOR v_card IN SELECT * FROM jsonb_to_recordset(v_cards) AS (id text, name text, imageUrl text)
  LOOP
    SELECT
      true,
      is_public,
      coalesce(status, 'active'),
      coalesce(is_hidden, false)
    INTO
      v_face_exists,
      v_face_public,
      v_face_status,
      v_face_hidden
    FROM public.saved_faces
    WHERE id::text = v_card.id OR image_url = v_card.imageUrl
    LIMIT 1;

    IF (v_face_exists IS NULL) OR (v_face_public = false) OR (v_face_status = 'deleted') OR (v_face_hidden = true) THEN
      v_broken_ids := array_append(v_broken_ids, v_card.id);
    END IF;
  END LOOP;

  v_valid_count := v_total_cards - coalesce(cardinality(v_broken_ids), 0);

  RETURN QUERY SELECT
    (cardinality(v_broken_ids) > 0),
    coalesce(cardinality(v_broken_ids), 0),
    v_broken_ids,
    v_valid_count,
    (v_valid_count < 15); -- Só entra em 'precisa de ajuste' se restarem menos de 15 cartas
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. VIEW: Status de integridade atualizado
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_official_decks_status AS
SELECT
  d.*,
  coalesce(chk.needs_adjustment, false) AS needs_adjustment,
  coalesce(chk.has_broken, false) AS has_broken_cards,
  coalesce(chk.broken_count, 0) AS broken_cards_count,
  coalesce(chk.valid_cards_count, d.card_count) AS valid_cards_count,
  coalesce(chk.broken_card_ids, '{}'::text[]) AS broken_card_ids
FROM public.saved_decks d
CROSS JOIN LATERAL public.check_deck_has_broken_cards(d.id) chk
WHERE d.is_official = true OR d.author_name = 'Tá na Cara!';

-- ------------------------------------------------------------------------------
-- 4. FUNÇÃO: Buscar baralhos oficiais jogáveis
-- Um baralho segue disponível aos jogadores se tiver pelo menos 15 cartas válidas.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_playable_official_decks()
RETURNS SETOF public.saved_decks
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT d.*
  FROM public.saved_decks d
  CROSS JOIN LATERAL public.check_deck_has_broken_cards(d.id) chk
  WHERE (d.is_official = true OR d.author_name = 'Tá na Cara!')
    AND d.is_public = true
    AND chk.needs_adjustment = false; -- Jogável enquanto valid_cards >= 15
$$;

-- ------------------------------------------------------------------------------
-- ROLLBACK (EM CASO DE NECESSIDADE)
-- Para reverter para a versão estrita de 15/30/60/90 cartas, reaplique:
-- supabase/pending/09_atomic_official_deck_rpc.sql
-- supabase/pending/11_deck_needs_adjustment_view.sql
-- ------------------------------------------------------------------------------
