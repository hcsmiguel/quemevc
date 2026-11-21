export const TAMANHOS_VALIDOS = [15, 30, 60, 90] as const;
export type ValidDeckSize = typeof TAMANHOS_VALIDOS[number];

export interface SelectionGoal {
  count: number;
  isValidSize: boolean;
  isMaxReached: boolean;
  message: string;
  nextTarget: ValidDeckSize | null;
  missingToNext: number;
}

export function computeSelectionGoal(count: number): SelectionGoal {
  if (count === 0) {
    return {
      count: 0,
      isValidSize: false,
      isMaxReached: false,
      message: 'Nenhuma carta selecionada',
      nextTarget: 15,
      missingToNext: 15,
    };
  }

  const isExact = (TAMANHOS_VALIDOS as readonly number[]).includes(count);
  if (isExact) {
    return {
      count,
      isValidSize: true,
      isMaxReached: count === 90,
      message: count === 90 ? 'tamanho máximo atingido' : 'tamanho válido para baralho',
      nextTarget: count as ValidDeckSize,
      missingToNext: 0,
    };
  }

  if (count > 90) {
    return {
      count,
      isValidSize: false,
      isMaxReached: true,
      message: 'Máximo de 90 cartas atingido',
      nextTarget: null,
      missingToNext: 0,
    };
  }

  if (count < 15) {
    const missing = 15 - count;
    return {
      count,
      isValidSize: false,
      isMaxReached: false,
      message: `faltam ${missing} para 15`,
      nextTarget: 15,
      missingToNext: missing,
    };
  }

  if (count > 15 && count < 30) {
    const missing = 30 - count;
    const excess = count - 15;
    return {
      count,
      isValidSize: false,
      isMaxReached: false,
      message: `faltam ${missing} para 30, ou remova ${excess} para 15`,
      nextTarget: 30,
      missingToNext: missing,
    };
  }

  if (count > 30 && count < 60) {
    const missing = 60 - count;
    const excess = count - 30;
    return {
      count,
      isValidSize: false,
      isMaxReached: false,
      message: `faltam ${missing} para 60, ou remova ${excess} para 30`,
      nextTarget: 60,
      missingToNext: missing,
    };
  }

  // Entre 60 e 90
  const missing = 90 - count;
  const excess = count - 60;
  return {
    count,
    isValidSize: false,
    isMaxReached: false,
    message: `faltam ${missing} para 90, ou remova ${excess} para 60`,
    nextTarget: 90,
    missingToNext: missing,
  };
}
