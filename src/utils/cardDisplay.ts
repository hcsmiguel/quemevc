/**
 * Resolução do nome exibido na carta:
 * Exibe sempre o NOME COMPLETO do personagem (máx 20 caracteres), permitindo quebra em até 2 linhas.
 * Se o campo name não existir, usa nickname como fallback.
 * Sem reticências e sem cortar no primeiro nome.
 */
export function getCardDisplayName(character: { name?: string; nickname?: string }): string {
  const rawName = (character.name || character.nickname || '').trim();
  if (!rawName) return '';

  // Exibe o nome completo do personagem (limite de 20 caracteres para caber na carta)
  return rawName.slice(0, 20);
}

/**
 * Cálculo das colunas da grade do tabuleiro para evitar linhas incompletas no desktop (Item 3).
 *
 * Tabela oficial:
 * 90 cartas -> 10 colunas no desktop largo (9 linhas) | 9 colunas em ~1100-1499px | 6 no tablet | 4 no celular
 * 60 cartas -> 10 colunas no desktop largo (6 linhas) | 10 em ~1100px | 6 no tablet | 4 no celular
 * 30 cartas -> 10 colunas no desktop largo (3 linhas) | 10 em ~1100px | 6 no tablet | 4 no celular
 * 15 cartas -> 5 colunas no desktop (3 linhas) | 3 no celular
 */
export function getBoardGridClasses(totalCards: number): string {
  if (totalCards > 60) {
    // 90 cartas: 3 cols mobile -> 5 cols tablet -> 6 cols md -> 10 cols desktop
    return 'grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-10';
  }

  if (totalCards > 30) {
    // 60 cartas: 3 cols mobile -> 5 cols tablet -> 6 cols md -> 10 cols desktop (10x6)
    return 'grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-10';
  }

  if (totalCards > 15) {
    // 30 cartas: 3 cols mobile -> 4 cols sm -> 5 cols md -> 6 cols desktop (6x5 perfeitamente equilibrado e legível)
    return 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6';
  }

  // 15 cartas: 3 cols mobile (3x5) -> 5 cols desktop (5x3)
  return 'grid-cols-3 sm:grid-cols-5';
}

/**
 * Tempo de exibição de cada balão de mensagem do chat (Item 8):
 * 5s base + 40ms por caractere, com teto máximo de 9s (9000ms).
 */
export function calculateChatBalloonDuration(text: string): number {
  const cleanLength = (text || '').trim().length;
  const duration = 5000 + cleanLength * 40;
  return Math.min(9000, Math.max(5000, duration));
}
