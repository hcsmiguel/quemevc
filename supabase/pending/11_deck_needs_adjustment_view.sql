-- ==============================================================================
-- PENDENTE DE APLICAÇÃO MANUAL NO SUPABASE DASHBOARD / CLI
-- Arquivo: supabase/pending/11_deck_needs_adjustment_view.sql
-- Ordem de Aplicação: 11
-- Objetivo: Criar view e função para detecção de baralhos oficiais que necessitam
--           de ajuste (estado "precisa de ajuste"), ou seja, baralhos que contêm
--           caras de terceiros que foram excluídas logicamente, ocultadas ou tornadas
--           privadas, ficando inválidas para o baralho.
--           Permite ao painel admin listar baralhos com alerta e à API de jogadores
--           filtrar/ocultar baralhos quebrados.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. FUNÇÃO: Verificar se um baralho possui cartas quebradas ou indisponíveis
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_deck_has_broken_cards(p_deck_id uuid)
RETURNS TABLE (
  has_broken boolean,
  broken_count integer,
  broken_card_ids text[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_cards jsonb;
  v_broken_ids text[] := '{}';
  v_card record;
  v_face_exists boolean;
  v_face_public boolean;
  v_face_status text;
  v_face_hidden boolean;
BEGIN
  SELECT cards INTO v_cards FROM public.saved_decks WHERE id = p_deck_id;
  IF v_cards IS NULL THEN
    RETURN QUERY SELECT false, 0, '{}'::text[];
    RETURN;
  END IF;

  FOR v_card IN SELECT * FROM jsonb_to_recordset(v_cards) AS (id text, name text, imageUrl text)
  LOOP
    -- Verifica se a cara existe no banco e seu status
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

    -- Se não encontrou ou se foi removida/privada/ocultada por terceiros
    IF (v_face_exists IS NULL) OR (v_face_public = false) OR (v_face_status = 'deleted') OR (v_face_hidden = true) THEN
      v_broken_ids := array_append(v_broken_ids, v_card.id);
    END IF;
  END LOOP;

  RETURN QUERY SELECT
    (cardinality(v_broken_ids) > 0),
    coalesce(cardinality(v_broken_ids), 0),
    v_broken_ids;
END;
$$;


-- ------------------------------------------------------------------------------
-- 2. VIEW: Baralhos com status de integridade
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_official_decks_status AS
SELECT
  d.*,
  coalesce(chk.has_broken, false) AS needs_adjustment,
  coalesce(chk.broken_count, 0) AS broken_cards_count,
  coalesce(chk.broken_card_ids, '{}'::text[]) AS broken_card_ids
FROM public.saved_decks d
CROSS JOIN LATERAL public.check_deck_has_broken_cards(d.id) chk
WHERE d.is_official = true OR d.author_name = 'Tá na Cara!';


-- ------------------------------------------------------------------------------
-- 3. FUNÇÃO: Buscar baralhos oficiais disponíveis para jogadores
-- Oculta categoricamente qualquer baralho que necessite de ajuste (needs_adjustment = true)
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
    AND d.is_draft = false
    AND coalesce(d.is_hidden, false) = false
    AND coalesce(chk.has_broken, false) = false
  ORDER BY d.created_at DESC;
$$;


-- ------------------------------------------------------------------------------
-- INSTRUÇÕES DE ROLLBACK:
-- DROP FUNCTION IF EXISTS public.get_playable_official_decks();
-- DROP VIEW IF EXISTS public.v_official_decks_status;
-- DROP FUNCTION IF EXISTS public.check_deck_has_broken_cards(uuid);
-- ------------------------------------------------------------------------------
