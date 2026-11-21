-- ==============================================================================
-- PENDENTE DE APLICAÇÃO MANUAL NO SUPABASE DASHBOARD / CLI
-- Arquivo: supabase/pending/09_atomic_official_deck_rpc.sql
-- Ordem de Aplicação: 9
-- Objetivo: Criar função RPC transacional atômica para criar ou editar baralhos
--           oficiais com dono "Tá na Cara!".
--           Garante em uma única transação:
--           1) Validação estrita de administrador no servidor;
--           2) Validação da meta de cartas (exatamente 15, 30, 60 ou 90 cartas);
--           3) Criação atômica de novas caras diretamente no catálogo público
--              (tabela saved_faces, públicas, author_name = 'Tá na Cara!');
--           4) Montagem do baralho referenciando caras existentes e novas;
--           5) Atualização de is_featured e rollback total em caso de falha,
--              impedindo caras órfãs ou baralhos incompletos.
-- Dependências: Requer public.is_admin(), saved_faces, saved_decks.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.save_official_deck_atomic(
  p_deck_id uuid DEFAULT NULL,
  p_name text DEFAULT '',
  p_description text DEFAULT '',
  p_is_featured boolean DEFAULT false,
  p_existing_face_ids uuid[] DEFAULT '{}',
  p_new_faces jsonb DEFAULT '[]'::jsonb -- Array de objetos: [{"name": "...", "image_url": "...", "content_hash": "..."}]
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

  -- 3. Validação da Quantidade Total de Cartas
  v_total_cards := coalesce(cardinality(p_existing_face_ids), 0) + jsonb_array_length(p_new_faces);
  IF v_total_cards NOT IN (15, 30, 60, 90) THEN
    RAISE EXCEPTION 'Quantidade de cartas inválida: %. O baralho oficial precisa ter exatamente 15, 30, 60 ou 90 cartas.', v_total_cards;
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

      -- Inserção na tabela pública
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
        false, -- Regra de produto: Caras NÃO têm status oficial. Dono é 'Tá na Cara!'
        false
      )
      RETURNING id INTO v_created_face_id;

      -- Adiciona ao array de cartas do baralho
      v_all_cards := v_all_cards || jsonb_build_object(
        'id', v_created_face_id::text,
        'name', trim(v_new_face_record->>'name'),
        'imageUrl', v_new_face_record->>'image_url'
      );
    END LOOP;
  END IF;

  -- 5. Buscar e Montar Caras Existentes Selecionadas
  IF coalesce(cardinality(p_existing_face_ids), 0) > 0 THEN
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

  -- 6. Inserir ou Atualizar o Baralho em saved_decks
  IF p_deck_id IS NOT NULL THEN
    -- Edição de baralho existente
    UPDATE public.saved_decks
    SET
      name = v_clean_name,
      description = trim(coalesce(p_description, '')),
      card_count = v_total_cards,
      cards = v_all_cards,
      is_public = true,
      is_official = true,
      author_name = 'Tá na Cara!',
      is_draft = false,
      is_featured = p_is_featured,
      cover_image_url = coalesce(v_all_cards->0->>'imageUrl', '')
    WHERE id = p_deck_id
    RETURNING id INTO v_deck_id;

    IF v_deck_id IS NULL THEN
      RAISE EXCEPTION 'Baralho com ID % não encontrado para atualização.', p_deck_id;
    END IF;
  ELSE
    -- Criação de novo baralho
    INSERT INTO public.saved_decks (
      user_id,
      name,
      description,
      card_count,
      cards,
      is_public,
      is_official,
      author_name,
      is_draft,
      is_featured,
      cover_image_url,
      is_hidden
    ) VALUES (
      coalesce(v_caller_id, 'admin_tanacara'),
      v_clean_name,
      trim(coalesce(p_description, '')),
      v_total_cards,
      v_all_cards,
      true,
      true,
      'Tá na Cara!',
      false,
      p_is_featured,
      coalesce(v_all_cards->0->>'imageUrl', ''),
      false
    )
    RETURNING id INTO v_deck_id;
  END IF;

  -- Retorna JSON com o baralho salvo e status de sucesso
  v_result := jsonb_build_object(
    'success', true,
    'deck_id', v_deck_id,
    'total_cards', v_total_cards,
    'name', v_clean_name
  );

  RETURN v_result;
END;
$$;


-- ------------------------------------------------------------------------------
-- INSTRUÇÕES DE ROLLBACK:
-- DROP FUNCTION IF EXISTS public.save_official_deck_atomic(uuid, text, text, boolean, uuid[], jsonb);
-- ------------------------------------------------------------------------------
