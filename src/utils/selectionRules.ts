import {
  TAMANHO_MINIMO_BARALHO,
  TAMANHO_MAXIMO_BARALHO,
  ATALHOS_DE_TAMANHO,
  isDeckSizeValid,
  getDeckSizeStatus,
  getAvailableShortcuts,
  type AtalhoDeTamanho,
} from '../constants/deck';

export {
  TAMANHO_MINIMO_BARALHO,
  TAMANHO_MAXIMO_BARALHO,
  isDeckSizeValid,
  getDeckSizeStatus,
};

export const TAMANHOS_VALIDOS = ATALHOS_DE_TAMANHO;
export type ValidDeckSize = AtalhoDeTamanho;

export interface SelectionGoal {
  count: number;
  isValidSize: boolean;
  isMaxReached: boolean;
  message: string;
  nextTarget: ValidDeckSize | null;
  missingToNext: number;
}

/**
 * Retorna o estado e a meta de seleção com base na nova regra de tamanho flexível (15 a 90 cartas):
 * - Abaixo do mínimo: "8 cartas · faltam 7 para o mínimo de 15"
 * - Dentro da faixa: "22 cartas"
 * - No limite: "90 cartas · máximo atingido"
 */
export function computeSelectionGoal(count: number): SelectionGoal {
  const status = getDeckSizeStatus(count);
  const shortcuts = getAvailableShortcuts(count);
  const nextTarget = shortcuts.length > 0 ? shortcuts[0] : null;
  const missingToNext = nextTarget ? Math.max(0, nextTarget - count) : 0;

  return {
    count,
    isValidSize: status.isValid,
    isMaxReached: status.isMaxReached,
    message: status.text,
    nextTarget,
    missingToNext,
  };
}
