/**
 * Constantes únicas e centralizadas para tamanho de baralhos e partidas em todo o projeto.
 * Fonte única de verdade: nenhum número solto no código.
 * 
 * Regra: Um baralho pode ter QUALQUER quantidade de 15 a 90 cartas (mínimo 15, máximo 90).
 * Os valores 15, 30, 60 e 90 são apenas ATALHOS de preenchimento e opções de quantidade da partida.
 */

export const TAMANHO_MINIMO_BARALHO = 15;
export const TAMANHO_MAXIMO_BARALHO = 90;
export const ATALHOS_DE_TAMANHO = [15, 30, 60, 90] as const;

export type AtalhoDeTamanho = typeof ATALHOS_DE_TAMANHO[number];

/**
 * Valida se uma quantidade de cartas é válida para salvar um baralho (15 a 90 cartas).
 */
export function isDeckSizeValid(count: number): boolean {
  return count >= TAMANHO_MINIMO_BARALHO && count <= TAMANHO_MAXIMO_BARALHO;
}

/**
 * Retorna os atalhos disponíveis para preenchimento ("Completar até"),
 * exibindo APENAS valores estritamente MAIORES que a contagem atual.
 * Se count >= 90, retorna array vazio (o menu deve ficar oculto).
 */
export function getAvailableShortcuts(currentCount: number): AtalhoDeTamanho[] {
  if (currentCount >= TAMANHO_MAXIMO_BARALHO) return [];
  return ATALHOS_DE_TAMANHO.filter((shortcut) => shortcut > currentCount);
}

export interface DeckSizeStatus {
  count: number;
  isValid: boolean;
  isMinReached: boolean;
  isMaxReached: boolean;
  canSave: boolean;
  text: string;
  missingToMin: number;
}

/**
 * Retorna o estado e a mensagem formatada para a barra fixa de seleção:
 * - abaixo do mínimo: "8 cartas · faltam 7 para o mínimo de 15" (e "1 carta · faltam 14 para o mínimo de 15")
 * - dentro da faixa: "22 cartas"
 * - no limite: "90 cartas · máximo atingido"
 */
export function getDeckSizeStatus(count: number): DeckSizeStatus {
  if (count <= 0) {
    return {
      count: 0,
      isValid: false,
      isMinReached: false,
      isMaxReached: false,
      canSave: false,
      text: `0 cartas · faltam ${TAMANHO_MINIMO_BARALHO} para o mínimo de ${TAMANHO_MINIMO_BARALHO}`,
      missingToMin: TAMANHO_MINIMO_BARALHO,
    };
  }

  if (count < TAMANHO_MINIMO_BARALHO) {
    const missing = TAMANHO_MINIMO_BARALHO - count;
    const cartaLabel = count === 1 ? 'carta' : 'cartas';
    return {
      count,
      isValid: false,
      isMinReached: false,
      isMaxReached: false,
      canSave: false,
      text: `${count} ${cartaLabel} · faltam ${missing} para o mínimo de ${TAMANHO_MINIMO_BARALHO}`,
      missingToMin: missing,
    };
  }

  if (count >= TAMANHO_MAXIMO_BARALHO) {
    return {
      count,
      isValid: count === TAMANHO_MAXIMO_BARALHO,
      isMinReached: true,
      isMaxReached: true,
      canSave: count === TAMANHO_MAXIMO_BARALHO,
      text: `${TAMANHO_MAXIMO_BARALHO} cartas · máximo atingido`,
      missingToMin: 0,
    };
  }

  // Dentro da faixa permitida (15 a 89 cartas)
  return {
    count,
    isValid: true,
    isMinReached: true,
    isMaxReached: false,
    canSave: true,
    text: `${count} cartas`,
    missingToMin: 0,
  };
}

export interface MatchCardOption {
  value: number;
  label: string;
}

/**
 * Calcula as opções de "Quantidade de cartas" para a partida com base no baralho escolhido (N cartas):
 * - Mostrar os atalhos <= N
 * - Quando N NÃO for um dos atalhos, adicionar a opção "Todas (N)"
 * - Opção padrão é a maior disponível (todas as cartas do baralho)
 * 
 * Exemplos:
 * - baralho de 22 -> 15 e "Todas (22)"
 * - baralho de 40 -> 15, 30 e "Todas (40)"
 * - baralho de 60 -> 15, 30 e 60 (60 já é todas)
 */
export function getMatchCardCountOptions(deckTotalCards: number): MatchCardOption[] {
  const total = Math.max(0, Math.min(TAMANHO_MAXIMO_BARALHO, deckTotalCards || TAMANHO_MAXIMO_BARALHO));

  if (total < TAMANHO_MINIMO_BARALHO) {
    // Fallback defensivo para baralhos que perderam cartas abaixo do mínimo
    return [{ value: total, label: `Todas (${total})` }];
  }

  const options: MatchCardOption[] = [];
  const shortcuts = ATALHOS_DE_TAMANHO.filter((s) => s <= total);

  shortcuts.forEach((s) => {
    options.push({
      value: s,
      label: `${s} cartas`,
    });
  });

  const isExactShortcut = (ATALHOS_DE_TAMANHO as readonly number[]).includes(total);
  if (!isExactShortcut) {
    options.push({
      value: total,
      label: `Todas (${total})`,
    });
  }

  return options;
}
