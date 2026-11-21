-- ==============================================================================
-- PROPOSTA DE ARQUITETURA E SCHEMA (NÃO OBRIGATÓRIA PARA A PARTIDA ATUAL)
-- Arquivo: supabase/pending/07_room_deck_snapshot_proposal.sql
-- Ordem de Aplicação: 7 (Opcional / Proposta Futura)
-- Objetivo: Documentar o mecanismo de snapshot de baralho na criação de salas
--           e propor tabela dedicada imutável para partidas de longa duração.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- DIAGNÓSTICO DO CÓDIGO ATUAL:
-- A partida em andamento JÁ armazena um snapshot do baralho no momento da criação
-- da sala na coluna JSONB game_rooms.config (campo customCards: Character[]).
-- Portanto, a partida NÃO faz leitura 'ao vivo' do baralho ou das cartas
-- do usuário criador durante o jogo.
-- ------------------------------------------------------------------------------

-- ------------------------------------------------------------------------------
-- PROPOSTA FUTURA (Para desonerar o JSONB de game_rooms e garantir integridade referencial):
-- Tabela imutável de snapshot de baralho de partida.
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.game_room_deck_snapshots (
  room_code text PRIMARY KEY,
  deck_name text NOT NULL,
  card_count integer NOT NULL,
  snapshot_cards jsonb NOT NULL, -- Array completo e imutável de cartas da partida
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_room_deck_snapshots_created
  ON public.game_room_deck_snapshots (created_at DESC);

ALTER TABLE public.game_room_deck_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura pública de snapshots de sala em andamento" ON public.game_room_deck_snapshots;
CREATE POLICY "Leitura pública de snapshots de sala em andamento"
  ON public.game_room_deck_snapshots
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Host pode gravar snapshot na criação da sala" ON public.game_room_deck_snapshots;
CREATE POLICY "Host pode gravar snapshot na criação da sala"
  ON public.game_room_deck_snapshots
  FOR INSERT
  WITH CHECK (true);
