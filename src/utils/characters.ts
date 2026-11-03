import type { Character, DifficultyCount } from '../types/game';

// 15 Personagens Oficiais do Modo Padrão
export const STANDARD_15_CHARACTERS: Character[] = [
  { id: 'std_1', name: 'Ana', imageUrl: '/standard-faces/Ana.jpg' },
  { id: 'std_2', name: 'Bruno', imageUrl: '/standard-faces/Bruno.jpg' },
  { id: 'std_3', name: 'Carla', imageUrl: '/standard-faces/Carla.jpg' },
  { id: 'std_4', name: 'Davi', imageUrl: '/standard-faces/Davi.jpg' },
  { id: 'std_5', name: 'Elisa', imageUrl: '/standard-faces/Elisa.jpg' },
  { id: 'std_6', name: 'Felipe', imageUrl: '/standard-faces/Felipe.jpg' },
  { id: 'std_7', name: 'Gabi', imageUrl: '/standard-faces/Gabi.jpg' },
  { id: 'std_8', name: 'Hugo', imageUrl: '/standard-faces/Hugo.jpg' },
  { id: 'std_9', name: 'Iara', imageUrl: '/standard-faces/Iara.jpg' },
  { id: 'std_10', name: 'João', imageUrl: '/standard-faces/joao.jpg' },
  { id: 'std_11', name: 'Kátia', imageUrl: '/standard-faces/katia.jpg' },
  { id: 'std_12', name: 'Lucas', imageUrl: '/standard-faces/Lucas.jpg' },
  { id: 'std_13', name: 'Marina', imageUrl: '/standard-faces/Marina.jpg' },
  { id: 'std_14', name: 'Nilton', imageUrl: '/standard-faces/Nilton.jpg' },
  { id: 'std_15', name: 'Paula', imageUrl: '/standard-faces/Paula.jpg' },
];

// Alias para compatibilidade com o restante do projeto
export const STANDARD_60_CHARACTERS: Character[] = STANDARD_15_CHARACTERS;

export const PREDEFINED_QUESTIONS = [
  { label: 'É mulher?', traitKey: 'gender' as const, traitValue: 'feminino', text: 'O seu personagem é uma mulher?' },
  { label: 'É homem?', traitKey: 'gender' as const, traitValue: 'masculino', text: 'O seu personagem é um homem?' },
  { label: 'Usa óculos?', traitKey: 'glasses' as const, traitValue: true, text: 'O seu personagem usa óculos?' },
  { label: 'Tem chapéu/boné?', traitKey: 'hat' as const, traitValue: true, text: 'O seu personagem está de chapéu ou boné?' },
  { label: 'Tem barba/bigode?', traitKey: 'beard' as const, traitValue: true, text: 'O seu personagem tem barba ou bigode?' },
  { label: 'Usa brinco?', traitKey: 'earrings' as const, traitValue: true, text: 'O seu personagem usa brinco?' },
  { label: 'Está sorrindo?', traitKey: 'smile' as const, traitValue: true, text: 'O seu personagem está sorrindo?' },
];

export function getDeckByDifficulty(count: DifficultyCount, customCards?: Character[]): Character[] {
  if (customCards && customCards.length > 0) {
    return customCards.slice(0, count);
  }
  return STANDARD_15_CHARACTERS.slice(0, count);
}
