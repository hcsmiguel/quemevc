import { getCardDisplayName, getBoardGridClasses, calculateChatBalloonDuration } from './cardDisplay.ts';

function assertEqual(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    throw new Error(`[FALHA] ${message}: esperado "${String(expected)}", recebido "${String(actual)}"`);
  }
}

// 1. Testes de Resolução de Nomes e Apelidos (Item 4)
console.log('--- Testes de getCardDisplayName ---');

// a) Nome Completo sempre prioritário (máx 20 caracteres)
assertEqual(
  getCardDisplayName({ name: 'Adriana Lima', nickname: 'Dri' }),
  'Adriana Lima',
  'Deve priorizar o nome completo sempre'
);

assertEqual(
  getCardDisplayName({ name: 'SuperLongoNomeComMuitasLetrasDemais' }),
  'SuperLongoNomeComMui',
  'Deve limitar nome completo a 20 caracteres'
);

// b) Sem apelido -> Nome Completo (máx 20 caracteres)
assertEqual(
  getCardDisplayName({ name: 'Joel Santana' }),
  'Joel Santana',
  'Deve exibir o nome completo de Joel Santana'
);

assertEqual(
  getCardDisplayName({ name: 'Adriana Lima' }),
  'Adriana Lima',
  'Deve exibir o nome completo de Adriana Lima'
);

assertEqual(
  getCardDisplayName({ name: 'MrBeast' }),
  'MrBeast',
  'Nome único deve permanecer idêntico'
);

assertEqual(
  getCardDisplayName({ name: 'Vin Diesel Muito Longo Demais' }),
  'Vin Diesel Muito Lon',
  'Deve limitar nome completo a 20 caracteres'
);

// c) Nome vazio
assertEqual(
  getCardDisplayName({ name: '' }),
  '',
  'Nome vazio deve retornar string vazia'
);

console.log('✓ getCardDisplayName passou em todos os testes');

// 2. Testes de Cálculo de Colunas da Grade sem Linhas Incompletas no Desktop (Item 3)
console.log('--- Testes de getBoardGridClasses ---');

assertEqual(
  getBoardGridClasses(90),
  'grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-10',
  '90 cartas deve usar 10 cols no desktop'
);

assertEqual(
  getBoardGridClasses(60),
  'grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-10',
  '60 cartas deve usar 10 cols no desktop'
);

assertEqual(
  getBoardGridClasses(30),
  'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6',
  '30 cartas deve usar 6 cols no desktop (6x5 perfeitamente equilibrado e legível)'
);

assertEqual(
  getBoardGridClasses(15),
  'grid-cols-3 sm:grid-cols-5',
  '15 cartas deve usar 5 cols no desktop (3 linhas exatas) e 3 cols no mobile (5 linhas exatas)'
);

assertEqual(
  getBoardGridClasses(22),
  'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6',
  '22 cartas (faixa 16..30) deve usar grid responsivo equilibrado'
);

assertEqual(
  getBoardGridClasses(40),
  'grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-10',
  '40 cartas (faixa 31..60) deve usar grid responsivo até 10 cols'
);

assertEqual(
  getBoardGridClasses(75),
  'grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-10',
  '75 cartas (faixa 61..90) deve usar grid responsivo até 10 cols'
);

console.log('✓ getBoardGridClasses passou em todos os testes');

// 3. Testes de Tempo de Exibição do Balão de Chat (Item 8)
console.log('--- Testes de calculateChatBalloonDuration ---');

assertEqual(
  calculateChatBalloonDuration(''),
  5000,
  'Mensagem vazia deve durar 5000ms'
);

assertEqual(
  calculateChatBalloonDuration('Oi'),
  5080,
  '2 caracteres: 5000 + 2*40 = 5080ms'
);

assertEqual(
  calculateChatBalloonDuration('Boa sorte na partida!'),
  5840,
  '21 caracteres deve durar 5840ms'
);

assertEqual(
  calculateChatBalloonDuration('Esta é uma mensagem muito longa que com certeza ultrapassa o teto máximo permitido de tempo'),
  8640,
  'Mensagem longa deve calcular corretamente'
);

assertEqual(
  calculateChatBalloonDuration('Esta mensagem é tão absurdamente longa e detalhada que passará tranquilamente de noventa e dois caracteres para atingir o teto de 9 segundos cravados no relógio'),
  9000,
  'Mensagem que ultrapassa o teto deve ser limitada a 9000ms'
);

console.log('✓ calculateChatBalloonDuration passou em todos os testes');
console.log('TODOS OS TESTES AUTOMATIZADOS PASSARAM COM SUCESSO!');
