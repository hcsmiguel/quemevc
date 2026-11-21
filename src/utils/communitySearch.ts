/**
 * Normalização rigorosa para buscas em tempo real:
 * - minúsculas
 * - remoção de diacríticos (acentos) via NFD
 * - substituição de ç por c
 * - colapso de espaços e pontuações irrelevantes
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ç/g, 'c')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calcula a faixa de relevância de acordo com a especificação:
 * 1. Nome começa com o termo ("ad" -> Adélio Bispo)
 * 2. Alguma palavra do nome começa com o termo ("bis" -> Adélio Bispo)
 * 3. O termo aparece no meio do nome ("eli" -> Adélio Bispo)
 * Retorna null se não houver correspondência.
 */
export function getRelevanceTier(name: string, query: string): number | null {
  const normQ = normalizeText(query);
  if (!normQ) return 0;

  const normName = normalizeText(name);
  if (!normName) return null;

  // 1. Nome começa com o termo
  if (normName.startsWith(normQ)) {
    return 1;
  }

  // 2. Alguma palavra do nome começa com o termo
  const words = normName.split(' ');
  if (words.some((w) => w.startsWith(normQ))) {
    return 2;
  }

  // 3. O termo aparece no meio do nome
  if (normName.includes(normQ)) {
    return 3;
  }

  return null;
}

/**
 * Para baralhos, a busca também se aplica ao nome do autor.
 * Retorna a melhor faixa entre nome e autor.
 */
export function getDeckRelevanceTier(deckName: string, authorName: string, query: string): number | null {
  const nameTier = getRelevanceTier(deckName, query);
  if (nameTier !== null) return nameTier;

  const normQ = normalizeText(query);
  if (!normQ) return 0;
  const normAuthor = normalizeText(authorName);
  if (normAuthor.startsWith(normQ)) return 4;
  if (normAuthor.includes(normQ)) return 5;

  return null;
}
