import type { DifficultyCount, Character } from '../types/game';
import type { SavedDeck } from './auth';

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
  cardCount: 30,
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
 * Ajusta a quantidade de cartas do rascunho para ser compatível com o tamanho do baralho:
 * Se a quantidade configurada exceder o total de cartas do baralho (ex.: 90 configurado e baralho com 30),
 * ajusta automaticamente para o maior tamanho válido (15, 30, 60, 90) que caiba no baralho.
 */
export function clampCardCountToDeck(
  requestedCount: DifficultyCount,
  deckTotalCards: number
): { count: DifficultyCount; adjusted: boolean } {
  const validSizes: DifficultyCount[] = [90, 60, 30, 15];
  
  if (requestedCount <= deckTotalCards) {
    return { count: requestedCount, adjusted: false };
  }

  // Encontra o maior tamanho válido menor ou igual ao tamanho do baralho
  const bestFit = validSizes.find((size) => size <= deckTotalCards) || 15;
  return { count: bestFit, adjusted: true };
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
