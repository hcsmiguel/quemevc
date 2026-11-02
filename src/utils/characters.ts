import type { Character, DifficultyCount } from '../types/game';

// 60 Personagens padrão com traços variados
export const STANDARD_60_CHARACTERS: Character[] = [
  // 1-10
  { id: 'c1', name: 'Bernardo', avatarBg: '#3B82F6', hairHex: '#EAB308', eyeHex: '#3B82F6', traits: { gender: 'masculino', hairColor: 'loiro', hairStyle: 'curto', eyeColor: 'azul', glasses: true, hat: false, beard: false, earrings: false, smile: true } },
  { id: 'c2', name: 'Camila', avatarBg: '#EC4899', hairHex: '#B45309', eyeHex: '#78350F', traits: { gender: 'feminino', hairColor: 'castanho', hairStyle: 'longo', eyeColor: 'castanho', glasses: false, hat: false, beard: false, earrings: true, smile: true } },
  { id: 'c3', name: 'Carlos', avatarBg: '#10B981', hairHex: '#18181B', eyeHex: '#78350F', traits: { gender: 'masculino', hairColor: 'preto', hairStyle: 'curto', eyeColor: 'castanho', glasses: false, hat: true, beard: true, earrings: false, smile: false } },
  { id: 'c4', name: 'Beatriz', avatarBg: '#8B5CF6', hairHex: '#EA580C', eyeHex: '#10B981', traits: { gender: 'feminino', hairColor: 'ruivo', hairStyle: 'cacheado', eyeColor: 'verde', glasses: true, hat: false, beard: false, earrings: true, smile: true } },
  { id: 'c5', name: 'Mateus', avatarBg: '#F59E0B', hairHex: '#71717A', eyeHex: '#3B82F6', traits: { gender: 'masculino', hairColor: 'grisalho', hairStyle: 'careca', eyeColor: 'azul', glasses: true, hat: false, beard: true, earrings: false, smile: true } },
  { id: 'c6', name: 'Larissa', avatarBg: '#06B6D4', hairHex: '#EAB308', eyeHex: '#10B981', traits: { gender: 'feminino', hairColor: 'loiro', hairStyle: 'longo', eyeColor: 'verde', glasses: false, hat: true, beard: false, earrings: false, smile: true } },
  { id: 'c7', name: 'Felipe', avatarBg: '#6366F1', hairHex: '#B45309', eyeHex: '#78350F', traits: { gender: 'masculino', hairColor: 'castanho', hairStyle: 'curto', eyeColor: 'castanho', glasses: false, hat: false, beard: false, earrings: true, smile: true } },
  { id: 'c8', name: 'Helena', avatarBg: '#F43F5E', hairHex: '#18181B', eyeHex: '#78350F', traits: { gender: 'feminino', hairColor: 'preto', hairStyle: 'curto', eyeColor: 'castanho', glasses: true, hat: false, beard: false, earrings: true, smile: false } },
  { id: 'c9', name: 'Gabriel', avatarBg: '#14B8A6', hairHex: '#B45309', eyeHex: '#10B981', traits: { gender: 'masculino', hairColor: 'castanho', hairStyle: 'cacheado', eyeColor: 'verde', glasses: false, hat: false, beard: true, earrings: false, smile: true } },
  { id: 'c10', name: 'Mariana', avatarBg: '#D946EF', hairHex: '#71717A', eyeHex: '#3B82F6', traits: { gender: 'feminino', hairColor: 'grisalho', hairStyle: 'curto', eyeColor: 'azul', glasses: true, hat: false, beard: false, earrings: false, smile: true } },

  // 11-20
  { id: 'c11', name: 'Rodrigo', avatarBg: '#84CC16', hairHex: '#EA580C', eyeHex: '#78350F', traits: { gender: 'masculino', hairColor: 'ruivo', hairStyle: 'curto', eyeColor: 'castanho', glasses: true, hat: true, beard: false, earrings: false, smile: false } },
  { id: 'c12', name: 'Júlia', avatarBg: '#FB923C', hairHex: '#EAB308', eyeHex: '#3B82F6', traits: { gender: 'feminino', hairColor: 'loiro', hairStyle: 'cacheado', eyeColor: 'azul', glasses: false, hat: false, beard: false, earrings: true, smile: true } },
  { id: 'c13', name: 'Lucas', avatarBg: '#3B82F6', hairHex: '#18181B', eyeHex: '#3B82F6', traits: { gender: 'masculino', hairColor: 'preto', hairStyle: 'curto', eyeColor: 'azul', glasses: false, hat: false, beard: true, earrings: true, smile: true } },
  { id: 'c14', name: 'Vanessa', avatarBg: '#A855F7', hairHex: '#B45309', eyeHex: '#10B981', traits: { gender: 'feminino', hairColor: 'castanho', hairStyle: 'longo', eyeColor: 'verde', glasses: true, hat: true, beard: false, earrings: true, smile: false } },
  { id: 'c15', name: 'Eduardo', avatarBg: '#059669', hairHex: '#71717A', eyeHex: '#78350F', traits: { gender: 'masculino', hairColor: 'grisalho', hairStyle: 'curto', eyeColor: 'castanho', glasses: false, hat: false, beard: true, earrings: false, smile: true } },
  { id: 'c16', name: 'Letícia', avatarBg: '#E11D48', hairHex: '#18181B', eyeHex: '#78350F', traits: { gender: 'feminino', hairColor: 'preto', hairStyle: 'cacheado', eyeColor: 'castanho', glasses: false, hat: false, beard: false, earrings: true, smile: true } },
  { id: 'c17', name: 'Tiago', avatarBg: '#2563EB', hairHex: '#EAB308', eyeHex: '#10B981', traits: { gender: 'masculino', hairColor: 'loiro', hairStyle: 'curto', eyeColor: 'verde', glasses: false, hat: true, beard: false, earrings: false, smile: true } },
  { id: 'c18', name: 'Amanda', avatarBg: '#0284C7', hairHex: '#EA580C', eyeHex: '#3B82F6', traits: { gender: 'feminino', hairColor: 'ruivo', hairStyle: 'longo', eyeColor: 'azul', glasses: false, hat: false, beard: false, earrings: false, smile: true } },
  { id: 'c19', name: 'André', avatarBg: '#D97706', hairHex: '#18181B', eyeHex: '#78350F', traits: { gender: 'masculino', hairColor: 'preto', hairStyle: 'careca', eyeColor: 'castanho', glasses: true, hat: false, beard: true, earrings: true, smile: false } },
  { id: 'c20', name: 'Carolina', avatarBg: '#9333EA', hairHex: '#B45309', eyeHex: '#78350F', traits: { gender: 'feminino', hairColor: 'castanho', hairStyle: 'curto', eyeColor: 'castanho', glasses: false, hat: true, beard: false, earrings: false, smile: true } },

  // 21-30
  { id: 'c21', name: 'Rafael', avatarBg: '#0D9488', hairHex: '#B45309', eyeHex: '#3B82F6', traits: { gender: 'masculino', hairColor: 'castanho', hairStyle: 'cacheado', eyeColor: 'azul', glasses: true, hat: false, beard: false, earrings: false, smile: true } },
  { id: 'c22', name: 'Bruna', avatarBg: '#BE185D', hairHex: '#EAB308', eyeHex: '#78350F', traits: { gender: 'feminino', hairColor: 'loiro', hairStyle: 'curto', eyeColor: 'castanho', glasses: true, hat: false, beard: false, earrings: true, smile: false } },
  { id: 'c23', name: 'Gustavo', avatarBg: '#4F46E5', hairHex: '#EA580C', eyeHex: '#10B981', traits: { gender: 'masculino', hairColor: 'ruivo', hairStyle: 'curto', eyeColor: 'verde', glasses: false, hat: false, beard: true, earrings: false, smile: true } },
  { id: 'c24', name: 'Sofia', avatarBg: '#059669', hairHex: '#18181B', eyeHex: '#3B82F6', traits: { gender: 'feminino', hairColor: 'preto', hairStyle: 'longo', eyeColor: 'azul', glasses: false, hat: false, beard: false, earrings: true, smile: true } },
  { id: 'c25', name: 'Danilo', avatarBg: '#E11D48', hairHex: '#71717A', eyeHex: '#3B82F6', traits: { gender: 'masculino', hairColor: 'grisalho', hairStyle: 'curto', eyeColor: 'azul', glasses: false, hat: true, beard: true, earrings: false, smile: true } },
  { id: 'c26', name: 'Clara', avatarBg: '#7C3AED', hairHex: '#EAB308', eyeHex: '#10B981', traits: { gender: 'feminino', hairColor: 'loiro', hairStyle: 'curto', eyeColor: 'verde', glasses: true, hat: true, beard: false, earrings: false, smile: true } },
  { id: 'c27', name: 'Marcelo', avatarBg: '#0284C7', hairHex: '#18181B', eyeHex: '#78350F', traits: { gender: 'masculino', hairColor: 'preto', hairStyle: 'cacheado', eyeColor: 'castanho', glasses: true, hat: false, beard: false, earrings: true, smile: false } },
  { id: 'c28', name: 'Fernanda', avatarBg: '#EA580C', hairHex: '#EA580C', eyeHex: '#78350F', traits: { gender: 'feminino', hairColor: 'ruivo', hairStyle: 'curto', eyeColor: 'castanho', glasses: false, hat: false, beard: false, earrings: true, smile: true } },
  { id: 'c29', name: 'Vinícius', avatarBg: '#15803D', hairHex: '#B45309', eyeHex: '#3B82F6', traits: { gender: 'masculino', hairColor: 'castanho', hairStyle: 'curto', eyeColor: 'azul', glasses: false, hat: false, beard: true, earrings: false, smile: true } },
  { id: 'c30', name: 'Renata', avatarBg: '#DB2777', hairHex: '#71717A', eyeHex: '#10B981', traits: { gender: 'feminino', hairColor: 'grisalho', hairStyle: 'longo', eyeColor: 'verde', glasses: true, hat: false, beard: false, earrings: true, smile: true } },

  // 31-40
  { id: 'c31', name: 'Caio', avatarBg: '#4338CA', hairHex: '#EAB308', eyeHex: '#78350F', traits: { gender: 'masculino', hairColor: 'loiro', hairStyle: 'cacheado', eyeColor: 'castanho', glasses: false, hat: false, beard: false, earrings: true, smile: true } },
  { id: 'c32', name: 'Tatiane', avatarBg: '#047857', hairHex: '#18181B', eyeHex: '#3B82F6', traits: { gender: 'feminino', hairColor: 'preto', hairStyle: 'curto', eyeColor: 'azul', glasses: true, hat: true, beard: false, earrings: false, smile: false } },
  { id: 'c33', name: 'Igor', avatarBg: '#B91C1C', hairHex: '#EA580C', eyeHex: '#10B981', traits: { gender: 'masculino', hairColor: 'ruivo', hairStyle: 'careca', eyeColor: 'verde', glasses: true, hat: false, beard: true, earrings: false, smile: true } },
  { id: 'c34', name: 'Alice', avatarBg: '#6D28D9', hairHex: '#B45309', eyeHex: '#78350F', traits: { gender: 'feminino', hairColor: 'castanho', hairStyle: 'cacheado', eyeColor: 'castanho', glasses: false, hat: false, beard: false, earrings: true, smile: true } },
  { id: 'c35', name: 'Breno', avatarBg: '#D97706', hairHex: '#71717A', eyeHex: '#3B82F6', traits: { gender: 'masculino', hairColor: 'grisalho', hairStyle: 'curto', eyeColor: 'azul', glasses: true, hat: true, beard: false, earrings: false, smile: true } },
  { id: 'c36', name: 'Patrícia', avatarBg: '#BE185D', hairHex: '#EAB308', eyeHex: '#3B82F6', traits: { gender: 'feminino', hairColor: 'loiro', hairStyle: 'longo', eyeColor: 'azul', glasses: false, hat: false, beard: false, earrings: false, smile: false } },
  { id: 'c37', name: 'Leonardo', avatarBg: '#1D4ED8', hairHex: '#18181B', eyeHex: '#10B981', traits: { gender: 'masculino', hairColor: 'preto', hairStyle: 'curto', eyeColor: 'verde', glasses: false, hat: false, beard: true, earrings: true, smile: true } },
  { id: 'c38', name: 'Bianca', avatarBg: '#0E7490', hairHex: '#EA580C', eyeHex: '#78350F', traits: { gender: 'feminino', hairColor: 'ruivo', hairStyle: 'longo', eyeColor: 'castanho', glasses: true, hat: false, beard: false, earrings: true, smile: true } },
  { id: 'c39', name: 'Sérgio', avatarBg: '#475569', hairHex: '#B45309', eyeHex: '#78350F', traits: { gender: 'masculino', hairColor: 'castanho', hairStyle: 'curto', eyeColor: 'castanho', glasses: true, hat: true, beard: true, earrings: false, smile: false } },
  { id: 'c40', name: 'Natália', avatarBg: '#9D174D', hairHex: '#18181B', eyeHex: '#3B82F6', traits: { gender: 'feminino', hairColor: 'preto', hairStyle: 'curto', eyeColor: 'azul', glasses: false, hat: false, beard: false, earrings: true, smile: true } },

  // 41-50
  { id: 'c41', name: 'Otávio', avatarBg: '#065F46', hairHex: '#EAB308', eyeHex: '#10B981', traits: { gender: 'masculino', hairColor: 'loiro', hairStyle: 'curto', eyeColor: 'verde', glasses: true, hat: false, beard: true, earrings: false, smile: true } },
  { id: 'c42', name: 'Daniela', avatarBg: '#5B21B6', hairHex: '#71717A', eyeHex: '#78350F', traits: { gender: 'feminino', hairColor: 'grisalho', hairStyle: 'cacheado', eyeColor: 'castanho', glasses: false, hat: true, beard: false, earrings: false, smile: true } },
  { id: 'c43', name: 'Fábio', avatarBg: '#C2410C', hairHex: '#B45309', eyeHex: '#3B82F6', traits: { gender: 'masculino', hairColor: 'castanho', hairStyle: 'cacheado', eyeColor: 'azul', glasses: false, hat: false, beard: false, earrings: true, smile: false } },
  { id: 'c44', name: 'Talita', avatarBg: '#155E75', hairHex: '#EA580C', eyeHex: '#10B981', traits: { gender: 'feminino', hairColor: 'ruivo', hairStyle: 'curto', eyeColor: 'verde', glasses: true, hat: false, beard: false, earrings: true, smile: true } },
  { id: 'c45', name: 'Henrique', avatarBg: '#1E40AF', hairHex: '#18181B', eyeHex: '#78350F', traits: { gender: 'masculino', hairColor: 'preto', hairStyle: 'careca', eyeColor: 'castanho', glasses: false, hat: true, beard: true, earrings: false, smile: true } },
  { id: 'c46', name: 'Vivian', avatarBg: '#831843', hairHex: '#EAB308', eyeHex: '#3B82F6', traits: { gender: 'feminino', hairColor: 'loiro', hairStyle: 'longo', eyeColor: 'azul', glasses: true, hat: true, beard: false, earrings: true, smile: true } },
  { id: 'c47', name: 'Hugo', avatarBg: '#374151', hairHex: '#71717A', eyeHex: '#78350F', traits: { gender: 'masculino', hairColor: 'grisalho', hairStyle: 'curto', eyeColor: 'castanho', glasses: false, hat: false, beard: false, earrings: false, smile: true } },
  { id: 'c48', name: 'Priscila', avatarBg: '#166534', hairHex: '#B45309', eyeHex: '#10B981', traits: { gender: 'feminino', hairColor: 'castanho', hairStyle: 'longo', eyeColor: 'verde', glasses: false, hat: false, beard: false, earrings: false, smile: false } },
  { id: 'c49', name: 'Arthur', avatarBg: '#701A75', hairHex: '#EA580C', eyeHex: '#3B82F6', traits: { gender: 'masculino', hairColor: 'ruivo', hairStyle: 'curto', eyeColor: 'azul', glasses: true, hat: false, beard: true, earrings: false, smile: true } },
  { id: 'c50', name: 'Luana', avatarBg: '#9A3412', hairHex: '#18181B', eyeHex: '#78350F', traits: { gender: 'feminino', hairColor: 'preto', hairStyle: 'cacheado', eyeColor: 'castanho', glasses: false, hat: true, beard: false, earrings: true, smile: true } },

  // 51-60
  { id: 'c51', name: 'Samuel', avatarBg: '#1E3A8A', hairHex: '#EAB308', eyeHex: '#78350F', traits: { gender: 'masculino', hairColor: 'loiro', hairStyle: 'curto', eyeColor: 'castanho', glasses: false, hat: false, beard: true, earrings: true, smile: true } },
  { id: 'c52', name: 'Sabrina', avatarBg: '#4C1D95', hairHex: '#71717A', eyeHex: '#3B82F6', traits: { gender: 'feminino', hairColor: 'grisalho', hairStyle: 'curto', eyeColor: 'azul', glasses: true, hat: false, beard: false, earrings: false, smile: false } },
  { id: 'c53', name: 'Vitor', avatarBg: '#14532D', hairHex: '#B45309', eyeHex: '#10B981', traits: { gender: 'masculino', hairColor: 'castanho', hairStyle: 'curto', eyeColor: 'verde', glasses: false, hat: true, beard: false, earrings: false, smile: true } },
  { id: 'c54', name: 'Yasmin', avatarBg: '#881337', hairHex: '#EA580C', eyeHex: '#78350F', traits: { gender: 'feminino', hairColor: 'ruivo', hairStyle: 'cacheado', eyeColor: 'castanho', glasses: false, hat: false, beard: false, earrings: true, smile: true } },
  { id: 'c55', name: 'Alexandre', avatarBg: '#134E4A', hairHex: '#18181B', eyeHex: '#3B82F6', traits: { gender: 'masculino', hairColor: 'preto', hairStyle: 'curto', eyeColor: 'azul', glasses: true, hat: false, beard: false, earrings: false, smile: true } },
  { id: 'c56', name: 'Lorena', avatarBg: '#78350F', hairHex: '#EAB308', eyeHex: '#10B981', traits: { gender: 'feminino', hairColor: 'loiro', hairStyle: 'curto', eyeColor: 'verde', glasses: false, hat: true, beard: false, earrings: true, smile: true } },
  { id: 'c57', name: 'Bruno', avatarBg: '#312E81', hairHex: '#71717A', eyeHex: '#78350F', traits: { gender: 'masculino', hairColor: 'grisalho', hairStyle: 'careca', eyeColor: 'castanho', glasses: true, hat: false, beard: true, earrings: true, smile: false } },
  { id: 'c58', name: 'Rebeca', avatarBg: '#064E3B', hairHex: '#B45309', eyeHex: '#3B82F6', traits: { gender: 'feminino', hairColor: 'castanho', hairStyle: 'longo', eyeColor: 'azul', glasses: true, hat: false, beard: false, earrings: false, smile: true } },
  { id: 'c59', name: 'Diego', avatarBg: '#701A75', hairHex: '#EA580C', eyeHex: '#10B981', traits: { gender: 'masculino', hairColor: 'ruivo', hairStyle: 'curto', eyeColor: 'verde', glasses: false, hat: true, beard: true, earrings: false, smile: true } },
  { id: 'c60', name: 'Monique', avatarBg: '#991B1B', hairHex: '#18181B', eyeHex: '#78350F', traits: { gender: 'feminino', hairColor: 'preto', hairStyle: 'longo', eyeColor: 'castanho', glasses: false, hat: false, beard: false, earrings: true, smile: true } },
];

export const PREDEFINED_QUESTIONS = [
  { label: 'É mulher?', traitKey: 'gender' as const, traitValue: 'feminino', text: 'O seu personagem é uma mulher?' },
  { label: 'É homem?', traitKey: 'gender' as const, traitValue: 'masculino', text: 'O seu personagem é um homem?' },
  { label: 'Usa óculos?', traitKey: 'glasses' as const, traitValue: true, text: 'O seu personagem usa óculos?' },
  { label: 'Tem chapéu/boné?', traitKey: 'hat' as const, traitValue: true, text: 'O seu personagem está de chapéu ou boné?' },
  { label: 'Tem barba/bigode?', traitKey: 'beard' as const, traitValue: true, text: 'O seu personagem tem barba ou bigode?' },
  { label: 'Usa brinco?', traitKey: 'earrings' as const, traitValue: true, text: 'O seu personagem usa brinco?' },
  { label: 'Está sorrindo?', traitKey: 'smile' as const, traitValue: true, text: 'O seu personagem está sorrindo?' },
  { label: 'Cabelo Loiro?', traitKey: 'hairColor' as const, traitValue: 'loiro', text: 'O seu personagem tem cabelo loiro?' },
  { label: 'Cabelo Castanho?', traitKey: 'hairColor' as const, traitValue: 'castanho', text: 'O seu personagem tem cabelo castanho?' },
  { label: 'Cabelo Preto?', traitKey: 'hairColor' as const, traitValue: 'preto', text: 'O seu personagem tem cabelo preto?' },
  { label: 'Cabelo Ruivo?', traitKey: 'hairColor' as const, traitValue: 'ruivo', text: 'O seu personagem tem cabelo ruivo?' },
  { label: 'Cabelo Grisalho?', traitKey: 'hairColor' as const, traitValue: 'grisalho', text: 'O seu personagem tem cabelo grisalho?' },
  { label: 'É careca?', traitKey: 'hairStyle' as const, traitValue: 'careca', text: 'O seu personagem é careca?' },
  { label: 'Cabelo cacheado?', traitKey: 'hairStyle' as const, traitValue: 'cacheado', text: 'O seu personagem tem cabelo cacheado?' },
  { label: 'Cabelo comprido?', traitKey: 'hairStyle' as const, traitValue: 'longo', text: 'O seu personagem tem cabelo comprido?' },
  { label: 'Olhos azuis?', traitKey: 'eyeColor' as const, traitValue: 'azul', text: 'O seu personagem tem olhos azuis?' },
  { label: 'Olhos verdes?', traitKey: 'eyeColor' as const, traitValue: 'verde', text: 'O seu personagem tem olhos verdes?' },
  { label: 'Olhos castanhos?', traitKey: 'eyeColor' as const, traitValue: 'castanho', text: 'O seu personagem tem olhos castanhos?' },
];

export function getDeckByDifficulty(count: DifficultyCount, customCards?: Character[]): Character[] {
  if (customCards && customCards.length > 0) {
    return customCards.slice(0, count);
  }
  return STANDARD_60_CHARACTERS.slice(0, count);
}
