import {
  TAMANHO_MINIMO_BARALHO,
  TAMANHO_MAXIMO_BARALHO,
  ATALHOS_DE_TAMANHO,
  isDeckSizeValid,
  getAvailableShortcuts,
  getDeckSizeStatus,
  getMatchCardCountOptions,
} from './deck.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[FALHA] ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`[FALHA] ${message}: esperado ${JSON.stringify(expected)}, recebido ${JSON.stringify(actual)}`);
  }
}

console.log('--- Testes de Constantes e Regras Centrais (deck.ts) ---');

// 1. Constantes
assertEqual(TAMANHO_MINIMO_BARALHO, 15, 'TAMANHO_MINIMO_BARALHO deve ser 15');
assertEqual(TAMANHO_MAXIMO_BARALHO, 90, 'TAMANHO_MAXIMO_BARALHO deve ser 90');
assertEqual([...ATALHOS_DE_TAMANHO], [15, 30, 60, 90], 'ATALHOS_DE_TAMANHO deve ser [15, 30, 60, 90]');

// 2. isDeckSizeValid
assert(!isDeckSizeValid(0), '0 não deve ser válido');
assert(!isDeckSizeValid(14), '14 não deve ser válido');
assert(isDeckSizeValid(15), '15 deve ser válido');
assert(isDeckSizeValid(22), '22 deve ser válido');
assert(isDeckSizeValid(40), '40 deve ser válido');
assert(isDeckSizeValid(60), '60 deve ser válido');
assert(isDeckSizeValid(90), '90 deve ser válido');
assert(!isDeckSizeValid(91), '91 não deve ser válido');

// 3. getAvailableShortcuts ("Completar até" deve mostrar APENAS valores MAIORES que a contagem atual)
assertEqual(getAvailableShortcuts(0), [15, 30, 60, 90], 'Para 0, deve mostrar todos os atalhos');
assertEqual(getAvailableShortcuts(8), [15, 30, 60, 90], 'Para 8, deve mostrar todos os atalhos');
assertEqual(getAvailableShortcuts(14), [15, 30, 60, 90], 'Para 14, deve mostrar todos os atalhos');
assertEqual(getAvailableShortcuts(15), [30, 60, 90], 'Para 15, deve mostrar 30, 60, 90');
assertEqual(getAvailableShortcuts(22), [30, 60, 90], 'Para 22, deve mostrar 30, 60, 90');
assertEqual(getAvailableShortcuts(30), [60, 90], 'Para 30, deve mostrar 60, 90');
assertEqual(getAvailableShortcuts(59), [60, 90], 'Para 59, deve mostrar 60, 90');
assertEqual(getAvailableShortcuts(60), [90], 'Para 60, deve mostrar 90');
assertEqual(getAvailableShortcuts(89), [90], 'Para 89, deve mostrar 90');
assertEqual(getAvailableShortcuts(90), [], 'Para 90, deve retornar vazio (menu oculto)');
assertEqual(getAvailableShortcuts(95), [], 'Para >90, deve retornar vazio');

// 4. getDeckSizeStatus (Mensagens formatadas)
assertEqual(
  getDeckSizeStatus(8).text,
  '8 cartas · faltam 7 para o mínimo de 15',
  'Mensagem abaixo do mínimo no plural'
);
assertEqual(
  getDeckSizeStatus(1).text,
  '1 carta · faltam 14 para o mínimo de 15',
  'Mensagem abaixo do mínimo no singular'
);
assertEqual(
  getDeckSizeStatus(15).text,
  '15 cartas',
  'Mensagem no mínimo de 15 cartas'
);
assertEqual(
  getDeckSizeStatus(22).text,
  '22 cartas',
  'Mensagem dentro da faixa'
);
assertEqual(
  getDeckSizeStatus(60).text,
  '60 cartas',
  'Mensagem dentro da faixa para atalho 60'
);
assertEqual(
  getDeckSizeStatus(90).text,
  '90 cartas · máximo atingido',
  'Mensagem no limite máximo de 90'
);

// 5. getMatchCardCountOptions (Opções de quantidade da partida)
// Baralho de 15 -> apenas [15 cartas]
assertEqual(
  getMatchCardCountOptions(15),
  [{ value: 15, label: '15 cartas' }],
  'Baralho de 15 deve ter apenas opção de 15'
);

// Baralho de 22 -> 15 e "Todas (22)"
assertEqual(
  getMatchCardCountOptions(22),
  [
    { value: 15, label: '15 cartas' },
    { value: 22, label: 'Todas (22)' },
  ],
  'Baralho de 22 deve ter 15 e Todas (22)'
);

// Baralho de 30 -> 15 e 30
assertEqual(
  getMatchCardCountOptions(30),
  [
    { value: 15, label: '15 cartas' },
    { value: 30, label: '30 cartas' },
  ],
  'Baralho de 30 deve ter 15 e 30'
);

// Baralho de 40 -> 15, 30 e "Todas (40)"
assertEqual(
  getMatchCardCountOptions(40),
  [
    { value: 15, label: '15 cartas' },
    { value: 30, label: '30 cartas' },
    { value: 40, label: 'Todas (40)' },
  ],
  'Baralho de 40 deve ter 15, 30 e Todas (40)'
);

// Baralho de 60 -> 15, 30 e 60 (60 já é todas)
assertEqual(
  getMatchCardCountOptions(60),
  [
    { value: 15, label: '15 cartas' },
    { value: 30, label: '30 cartas' },
    { value: 60, label: '60 cartas' },
  ],
  'Baralho de 60 deve ter 15, 30 e 60'
);

// Baralho de 90 -> 15, 30, 60 e 90
assertEqual(
  getMatchCardCountOptions(90),
  [
    { value: 15, label: '15 cartas' },
    { value: 30, label: '30 cartas' },
    { value: 60, label: '60 cartas' },
    { value: 90, label: '90 cartas' },
  ],
  'Baralho de 90 deve ter 15, 30, 60 e 90'
);

console.log('✓ Todos os testes de deck.ts passaram com sucesso!');
