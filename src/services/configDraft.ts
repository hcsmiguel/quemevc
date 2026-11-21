import type { DifficultyCount, Character } from '../types/game';
import type { SavedDeck } from './auth';
import {
  TAMANHO_MINIMO_BARALHO,
  TAMANHO_MAXIMO_BARALHO,
  getMatchCardCountOptions,
} from '../constants/deck';

export interface RoomConfigDraft {
  deckId?: string;
  deckName: string;
  cardCount: DifficultyCount;
  customCards?: Character[];
  isCallMode: boolean;
  hasPassword: boolean;
  password?: string; // Estritamente em memória! Nunca persistido em storage ou URL
  isChoiceMode: boolean; // Indica se o usuário veio de "Trocar baralho" na tela de configuração
  deckContextList: string[]; // IDs de baralhos da lista ativa para navegação anterior/próximo
}

const DEFAULT_DRAFT: RoomConfigDraft = {
  deckId: undefined,
  deckName: 'Aleatório #1',
  cardCount: TAMANHO_MAXIMO_BARALHO,
  customCards: undefined,
  isCallMode: false,
  hasPassword: false,
  password: '',
  isChoiceMode: false,
  deckContextList: [],
};

// Estado singleton em memória (sobrevive à navegação entre rotas, limpo ao recarregar a página)
let currentDraft: RoomConfigDraft = { ...DEFAULT_DRAFT };
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

/**
 * Retorna uma cópia do rascunho de configuração atual
 */
export function getConfigDraft(): RoomConfigDraft {
  return { ...currentDraft };
}

/**
 * Atualiza campos parciais do rascunho
 */
export function updateConfigDraft(patch: Partial<RoomConfigDraft>): void {
  currentDraft = {
    ...currentDraft,
    ...patch,
  };
  notify();
}

/**
 * Reinicia o rascunho para os valores padrão e desativa o modo escolha
 */
export function resetConfigDraft(): void {
  currentDraft = { ...DEFAULT_DRAFT, deckContextList: [] };
  notify();
}

/**
 * Ajusta a quantidade de cartas da partida com base no baralho escolhido:
 * - As opções válidas são os atalhos <= N, e "Todas (N)" se N não for atalho.
 * - Preserva a escolha anterior se ela continuar válida para o novo baralho.
 * - Se a escolha anterior deixar de ser válida, seleciona a maior válida (todas as cartas do baralho).
 */
export function clampCardCountToDeck(
  requestedCount: DifficultyCount,
  deckTotalCards: number
): { count: DifficultyCount; adjusted: boolean } {
  const options = getMatchCardCountOptions(deckTotalCards);
  const isValid = options.some((opt) => opt.value === requestedCount);

  if (isValid) {
    return { count: requestedCount, adjusted: false };
  }

  // Se a escolha anterior deixar de ser válida, selecionar a maior válida
  const highestValid = (options[options.length - 1]?.value || TAMANHO_MINIMO_BARALHO) as DifficultyCount;
  return { count: highestValid, adjusted: true };
}

/**
 * Aplica um baralho ao rascunho de configuração:
 * - Atualiza nome, cartas e ID do baralho
 * - Verifica compatibilidade de quantidade e ajusta se necessário
 * - Preserva opções anteriores (dinâmica da rodada, senha em memória) se já estiver no rascunho
 */
export function applyDeckToDraft(
  deck: SavedDeck,
  options?: { isChoiceMode?: boolean }
): { draft: RoomConfigDraft; sizeAdjusted: boolean } {
  const deckCards = deck.cards || [];
  const deckSize = deckCards.length || deck.card_count || 90;

  const currentCount = currentDraft.cardCount || 30;
  const { count: finalCardCount, adjusted: sizeAdjusted } = clampCardCountToDeck(
    currentCount,
    deckSize
  );

  currentDraft = {
    ...currentDraft,
    deckId: deck.id,
    deckName: deck.name,
    customCards: deckCards,
    cardCount: finalCardCount,
    isChoiceMode: options?.isChoiceMode !== undefined ? options.isChoiceMode : currentDraft.isChoiceMode,
  };

  notify();
  return { draft: { ...currentDraft }, sizeAdjusted };
}

/**
 * Define o modo escolha (quando o usuário clica em "Trocar baralho" na configuração)
 */
export function setChoiceMode(enabled: boolean): void {
  currentDraft.isChoiceMode = enabled;
  notify();
}

/**
 * Verifica se a navegação atual está em modo escolha de baralho
 */
export function isChoiceMode(): boolean {
  return currentDraft.isChoiceMode;
}

/**
 * Armazena a lista de IDs de baralhos da tela de onde o jogador veio (para anterior/próximo)
 */
export function setDeckContextList(ids: string[]): void {
  currentDraft.deckContextList = [...ids];
}

/**
 * Obtém a lista de IDs de baralhos do contexto de navegação
 */
export function getDeckContextList(): string[] {
  return currentDraft.deckContextList || [];
}

/**
 * Inscreve-se para alterações no rascunho de configuração
 */
export function subscribeConfigDraft(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
