/**
 * Camada Adaptadora de Dados (Feature Detection / Schema Atual & Novo)
 * 
 * Implementa as regras inegociáveis de produto:
 * 1. Salvar caras ou baralhos cria REFERÊNCIA, jamais duplica linhas no banco.
 * 2. Itens salvos de terceiros nunca recebem ações de dono (apenas "Remover dos salvos").
 * 3. Detecção de hash de imagem (SHA-256 via crypto.subtle) e prevenção anti-duplicata.
 * 4. Tratamento de caras e baralhos privados, excluídos, indisponíveis e que precisam de ajuste.
 * 5. Compatibilidade transparente entre o schema atual do Supabase e o schema com migrações pendentes.
 */

import { supabase } from './supabase';
import type { SavedDeck, SavedFace } from './auth';
import type { Character } from '../types/game';
import { normalizeText } from '../utils/communitySearch';
import { TAMANHO_MINIMO_BARALHO } from '../constants/deck';

export type ItemOrigin = 'own' | 'saved' | 'official';
export type FaceStatus = 'active' | 'private' | 'unavailable' | 'deleted';
export type DeckStatus = 'active' | 'needs_adjustment' | 'unavailable';

export interface ProfileFaceItem {
  id: string;
  name: string;
  imageUrl: string;
  authorName?: string;
  isPublic: boolean;
  origin: ItemOrigin;
  status: FaceStatus;
  createdAt: string;
  contentHash?: string;
}

export interface ProfileDeckItem {
  id: string;
  name: string;
  cardCount: number;
  cards: Character[];
  authorName?: string;
  isPublic: boolean;
  origin: ItemOrigin;
  status: DeckStatus;
  createdAt: string;
  hasRemovedFaces?: boolean;
}

// Flags de Feature Detection em memória (testadas sob demanda)
let hasUserSavedFacesTable: boolean | null = null;
let hasUserSavedDecksTable: boolean | null = null;
let hasContentHashColumn: boolean | null = null;
let hasCountDecksRpc: boolean | null = null;

/**
 * Calcula o hash SHA-256 em hexadecimal de um Blob/File ou Buffer no navegador
 */
export async function computeImageHash(data: Blob | ArrayBuffer): Promise<string> {
  const buffer = data instanceof Blob ? await data.arrayBuffer() : data;
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(digest));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Normaliza referências locais do usuário
 */
function getLocalFaceRefs(userId: string): string[] {
  try {
    const raw = localStorage.getItem(`cara_face_refs_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalFaceRefs(userId: string, refs: string[]): void {
  try {
    localStorage.setItem(`cara_face_refs_${userId}`, JSON.stringify(refs));
  } catch {
    // ignore
  }
}

function getLocalDeckRefs(userId: string): string[] {
  try {
    const raw = localStorage.getItem(`cara_deck_refs_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalDeckRefs(userId: string, refs: string[]): void {
  try {
    localStorage.setItem(`cara_deck_refs_${userId}`, JSON.stringify(refs));
  } catch {
    // ignore
  }
}

/**
 * ------------------------------------------------------------------------------
 * CARAS: Buscar Caras do Perfil (Próprias + Salvas por Referência)
 * ------------------------------------------------------------------------------
 */
export async function getProfileFaces(userId: string, username: string): Promise<ProfileFaceItem[]> {
  const ownFaces: ProfileFaceItem[] = [];
  const savedFaces: ProfileFaceItem[] = [];
  const seenIds = new Set<string>();

  // 1. Buscar todas as caras vinculadas ao user_id na tabela atual saved_faces
  let remoteRows: SavedFace[] = [];
  try {
    const { data, error } = await supabase
      .from('saved_faces')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      remoteRows = data as SavedFace[];
    }
  } catch {
    // Fallback local
    const localKey = `cara_saved_faces_${userId}`;
    remoteRows = JSON.parse(localStorage.getItem(localKey) || '[]');
  }

  // 2. Classificar o que é próprio do usuário vs. o que foi cópia salva histórica
  for (const row of remoteRows) {
    if (seenIds.has(row.id)) continue;
    seenIds.add(row.id);

    const isOwn = (row.author_name || '').toLowerCase() === (username || '').toLowerCase() || !row.author_name;
    const isPublic = Boolean(row.is_public);
    const status: FaceStatus = (row as any).status || (isPublic ? 'active' : 'private');

    if (isOwn) {
      ownFaces.push({
        id: row.id,
        name: row.name,
        imageUrl: row.image_url,
        authorName: row.author_name || username,
        isPublic,
        origin: 'own',
        status,
        createdAt: row.created_at,
        contentHash: (row as any).content_hash,
      });
    } else {
      // Cópia histórica tratada como salva por referência
      savedFaces.push({
        id: row.id,
        name: row.name,
        imageUrl: row.image_url,
        authorName: row.author_name,
        isPublic,
        origin: 'saved',
        status: status === 'deleted' ? 'unavailable' : 'active',
        createdAt: row.created_at,
        contentHash: (row as any).content_hash,
      });
    }
  }

  // 3. Buscar referências da tabela nova user_saved_faces (se existir via Feature Detection)
  let refFaceIds: string[] = getLocalFaceRefs(userId);
  if (hasUserSavedFacesTable !== false) {
    try {
      const { data, error } = await supabase
        .from('user_saved_faces')
        .select('face_id, created_at')
        .eq('user_id', userId);

      if (!error && data) {
        hasUserSavedFacesTable = true;
        const newIds = data.map((d: any) => d.face_id);
        refFaceIds = Array.from(new Set([...refFaceIds, ...newIds]));
      } else if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
        hasUserSavedFacesTable = false;
      }
    } catch {
      hasUserSavedFacesTable = false;
    }
  }

  // Se houver IDs de caras salvas por referência que ainda não estão na lista
  const missingIds = refFaceIds.filter((id) => !seenIds.has(id));
  if (missingIds.length > 0) {
    try {
      const { data: refItems } = await supabase
        .from('saved_faces')
        .select('*')
        .in('id', missingIds);

      if (refItems) {
        for (const item of refItems) {
          if (seenIds.has(item.id)) continue;
          seenIds.add(item.id);

          const isDeleted = (item as any).status === 'deleted' || item.is_hidden;
          const isPrivate = !item.is_public;
          const status: FaceStatus = isDeleted || isPrivate ? 'unavailable' : 'active';

          savedFaces.push({
            id: item.id,
            name: item.name,
            imageUrl: item.image_url,
            authorName: item.author_name || 'Comunidade',
            isPublic: item.is_public,
            origin: item.is_official ? 'official' : 'saved',
            status,
            createdAt: item.created_at,
            contentHash: (item as any).content_hash,
          });
        }
      }
    } catch {
      // ignore
    }
  }

  return [...ownFaces, ...savedFaces];
}

/**
 * ------------------------------------------------------------------------------
 * SALVAR CARA COMO REFERÊNCIA (NUNCA CRIA CÓPIA)
 * ------------------------------------------------------------------------------
 */
export async function saveFaceAsReference(
  userId: string,
  face: SavedFace | Character | ProfileFaceItem
): Promise<{ success: boolean; message: string }> {
  // Salva no registro local de referências
  const localRefs = getLocalFaceRefs(userId);
  if (!localRefs.includes(face.id)) {
    setLocalFaceRefs(userId, [face.id, ...localRefs]);
  }

  // Tenta persistir na tabela de referência do Supabase se existir
  if (hasUserSavedFacesTable !== false) {
    try {
      const { error } = await supabase.from('user_saved_faces').insert({
        user_id: userId,
        face_id: face.id,
      });

      if (!error) {
        hasUserSavedFacesTable = true;
        return { success: true, message: 'Cara salva nos seus favoritos.' };
      } else if (error.code === '42P01' || error.message?.includes('does not exist')) {
        hasUserSavedFacesTable = false;
      }
    } catch {
      hasUserSavedFacesTable = false;
    }
  }

  return { success: true, message: 'Cara salva nos seus favoritos.' };
}

/**
 * REMOVER CARA DOS SALVOS
 */
export async function removeSavedFaceReference(userId: string, faceId: string): Promise<boolean> {
  // Remove do local
  const localRefs = getLocalFaceRefs(userId);
  setLocalFaceRefs(userId, localRefs.filter((id) => id !== faceId));

  // Remove da tabela remota de referência se existir
  if (hasUserSavedFacesTable !== false) {
    try {
      await supabase.from('user_saved_faces').delete().eq('user_id', userId).eq('face_id', faceId);
    } catch {
      // ignore
    }
  }

  // Também limpa de saved_faces se era uma linha cópia legada vinculada ao user_id
  try {
    await supabase.from('saved_faces').delete().eq('id', faceId).eq('user_id', userId);
  } catch {
    // ignore
  }

  return true;
}

/**
 * ------------------------------------------------------------------------------
 * BARALHOS: Buscar Baralhos do Perfil (Próprios + Salvos por Referência)
 * ------------------------------------------------------------------------------
 */
export async function getProfileDecks(userId: string, username: string): Promise<ProfileDeckItem[]> {
  const ownDecks: ProfileDeckItem[] = [];
  const savedDecks: ProfileDeckItem[] = [];
  const seenIds = new Set<string>();

  let remoteRows: SavedDeck[] = [];
  try {
    const { data, error } = await supabase
      .from('saved_decks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      remoteRows = data as SavedDeck[];
    }
  } catch {
    const localKey = `cara_saved_decks_${userId}`;
    remoteRows = JSON.parse(localStorage.getItem(localKey) || '[]');
  }

  for (const row of remoteRows) {
    if (seenIds.has(row.id)) continue;
    seenIds.add(row.id);

    const isOwn = (row.author_name || '').toLowerCase() === (username || '').toLowerCase() || !row.author_name;
    const cards = Array.isArray(row.cards) ? row.cards : [];
    
    // Verificar se alguma cara foi marcada como removida ou excluída
    const validCards = cards.filter((c: any) => !c.is_removed && c.name !== 'Cara removida' && c.status !== 'deleted');
    const hasRemovedFaces = cards.length > validCards.length;
    let deckStatus: DeckStatus = 'active';
    // Regra flexível: continua jogável com N-removidas cartas se ainda restarem >= 15 cartas
    if (validCards.length < TAMANHO_MINIMO_BARALHO) {
      deckStatus = 'needs_adjustment';
    }

    const effectiveCards = hasRemovedFaces ? validCards : cards;

    if (isOwn) {
      ownDecks.push({
        id: row.id,
        name: row.name,
        cardCount: effectiveCards.length || row.card_count || cards.length,
        cards: effectiveCards,
        authorName: row.author_name || username,
        isPublic: Boolean(row.is_public),
        origin: 'own',
        status: deckStatus,
        createdAt: row.created_at,
        hasRemovedFaces,
      });
    } else {
      savedDecks.push({
        id: row.id,
        name: row.name,
        cardCount: effectiveCards.length || row.card_count || cards.length,
        cards: effectiveCards,
        authorName: row.author_name,
        isPublic: Boolean(row.is_public),
        origin: 'saved',
        status: deckStatus,
        createdAt: row.created_at,
        hasRemovedFaces,
      });
    }
  }

  // Buscar referências em user_saved_decks
  let refDeckIds: string[] = getLocalDeckRefs(userId);
  if (hasUserSavedDecksTable !== false) {
    try {
      const { data, error } = await supabase
        .from('user_saved_decks')
        .select('deck_id, created_at')
        .eq('user_id', userId);

      if (!error && data) {
        hasUserSavedDecksTable = true;
        const newIds = data.map((d: any) => d.deck_id);
        refDeckIds = Array.from(new Set([...refDeckIds, ...newIds]));
      } else if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
        hasUserSavedDecksTable = false;
      }
    } catch {
      hasUserSavedDecksTable = false;
    }
  }

  const missingIds = refDeckIds.filter((id) => !seenIds.has(id));
  if (missingIds.length > 0) {
    try {
      const { data: refItems } = await supabase
        .from('saved_decks')
        .select('*')
        .in('id', missingIds);

      if (refItems) {
        for (const item of refItems) {
          if (seenIds.has(item.id)) continue;
          seenIds.add(item.id);

          const isDeleted = (item as any).status === 'deleted' || item.is_hidden;
          const isPrivate = !item.is_public;
          const cards = Array.isArray(item.cards) ? item.cards : [];
          const validCards = cards.filter((c: any) => !c.is_removed && c.name !== 'Cara removida' && c.status !== 'deleted');
          const hasRemovedFaces = cards.length > validCards.length;

          let status: DeckStatus = 'active';
          if (isDeleted || isPrivate) {
            status = 'unavailable';
          } else if (validCards.length < TAMANHO_MINIMO_BARALHO) {
            // Só entra em "precisa de ajuste" se restarem menos de 15 cartas
            status = 'needs_adjustment';
          }

          const effectiveCards = hasRemovedFaces ? validCards : cards;

          savedDecks.push({
            id: item.id,
            name: item.name,
            cardCount: effectiveCards.length || item.card_count || cards.length,
            cards: effectiveCards,
            authorName: item.author_name || 'Comunidade',
            isPublic: item.is_public,
            origin: item.is_official ? 'official' : 'saved',
            status,
            createdAt: item.created_at,
            hasRemovedFaces,
          });
        }
      }
    } catch {
      // ignore
    }
  }

  return [...ownDecks, ...savedDecks];
}

/**
 * SALVAR BARALHO COMO REFERÊNCIA (NUNCA COPIA)
 */
export async function saveDeckAsReference(
  userId: string,
  deck: SavedDeck | ProfileDeckItem
): Promise<{ success: boolean; message: string }> {
  const localRefs = getLocalDeckRefs(userId);
  if (!localRefs.includes(deck.id)) {
    setLocalDeckRefs(userId, [deck.id, ...localRefs]);
  }

  if (hasUserSavedDecksTable !== false) {
    try {
      const { error } = await supabase.from('user_saved_decks').insert({
        user_id: userId,
        deck_id: deck.id,
      });

      if (!error) {
        hasUserSavedDecksTable = true;
        return { success: true, message: 'Baralho salvo nos seus favoritos.' };
      } else if (error.code === '42P01' || error.message?.includes('does not exist')) {
        hasUserSavedDecksTable = false;
      }
    } catch {
      hasUserSavedDecksTable = false;
    }
  }

  return { success: true, message: 'Baralho salvo nos seus favoritos.' };
}

/**
 * REMOVER BARALHO DOS SALVOS
 */
export async function removeSavedDeckReference(userId: string, deckId: string): Promise<boolean> {
  const localRefs = getLocalDeckRefs(userId);
  setLocalDeckRefs(userId, localRefs.filter((id) => id !== deckId));

  if (hasUserSavedDecksTable !== false) {
    try {
      await supabase.from('user_saved_decks').delete().eq('user_id', userId).eq('deck_id', deckId);
    } catch {
      // ignore
    }
  }

  try {
    await supabase.from('saved_decks').delete().eq('id', deckId).eq('user_id', userId);
  } catch {
    // ignore
  }

  return true;
}

/**
 * ------------------------------------------------------------------------------
 * CHECAGEM ANTI-DUPLICATA (NOME PARECIDO E HASH DE IMAGEM)
 * ------------------------------------------------------------------------------
 */
export interface DuplicateCheckResult {
  exactHashMatch: SavedFace | null;
  similarNameMatch: SavedFace | null;
}

export async function checkAntiDuplicate(
  name: string,
  imageHash?: string
): Promise<DuplicateCheckResult> {
  const cleanName = name.trim();
  const normalizedInputName = normalizeText(cleanName);

  let exactHashMatch: SavedFace | null = null;
  let similarNameMatch: SavedFace | null = null;

  // 1. Checagem por Hash se fornecido
  if (imageHash && hasContentHashColumn !== false) {
    try {
      // Tentar via RPC se disponível
      const { data: rpcData, error: rpcErr } = await supabase.rpc('find_public_face_by_hash', {
        p_hash: imageHash,
      });
      if (!rpcErr && rpcData && rpcData.length > 0) {
        exactHashMatch = rpcData[0] as SavedFace;
      } else {
        // Tentar via coluna se RPC não existir
        const { data: colData } = await supabase
          .from('saved_faces')
          .select('*')
          .eq('is_public', true)
          .eq('content_hash', imageHash)
          .limit(1);

        if (colData && colData.length > 0) {
          exactHashMatch = colData[0] as SavedFace;
        }
      }
    } catch {
      hasContentHashColumn = false;
    }
  }

  // 2. Checagem por Nome (Normalizado)
  try {
    const { data: publicFaces } = await supabase
      .from('saved_faces')
      .select('*')
      .eq('is_public', true)
      .limit(200);

    if (publicFaces) {
      for (const face of publicFaces) {
        const norm = normalizeText(face.name);
        if (norm === normalizedInputName) {
          similarNameMatch = face as SavedFace;
          break;
        }
      }
    }
  } catch {
    // ignore
  }

  return { exactHashMatch, similarNameMatch };
}

/**
 * ------------------------------------------------------------------------------
 * CONTAR QUANTOS BARALHOS DE OUTROS USUÁRIOS USAM UMA CARA
 * ------------------------------------------------------------------------------
 */
export async function countOtherDecksUsingFace(faceId: string, userId: string): Promise<number> {
  if (hasCountDecksRpc !== false) {
    try {
      const { data, error } = await supabase.rpc('count_other_decks_using_face', {
        target_face_id: faceId,
        requesting_user_id: userId,
      });

      if (!error && typeof data === 'number') {
        hasCountDecksRpc = true;
        return data;
      } else if (error && (error.code === '42883' || error.message?.includes('does not exist'))) {
        hasCountDecksRpc = false;
      }
    } catch {
      hasCountDecksRpc = false;
    }
  }

  // Fallback no cliente: consultar baralhos públicos
  try {
    const { data: decks } = await supabase
      .from('saved_decks')
      .select('id, user_id, cards')
      .neq('user_id', userId)
      .limit(100);

    if (decks) {
      let count = 0;
      for (const deck of decks) {
        const cards: any[] = Array.isArray(deck.cards) ? deck.cards : [];
        if (cards.some((c) => c.id === faceId)) {
          count++;
        }
      }
      return count;
    }
  } catch {
    // ignore
  }

  return 0;
}

/**
 * ------------------------------------------------------------------------------
 * SUBSTITUIR CARA REMOVIDA EM BARALHO (EM UM TOQUE)
 * ------------------------------------------------------------------------------
 */
export async function replaceRemovedFaceInDeck(
  deckId: string,
  userId: string,
  currentCards: Character[],
  availableFaces: Character[]
): Promise<Character[]> {
  const validCandidates = availableFaces.filter(
    (face) =>
      face.name !== 'Cara removida' &&
      !(face as any).is_removed &&
      !currentCards.some((c) => c.id === face.id)
  );

  const updatedCards = currentCards.map((card) => {
    if (card.name === 'Cara removida' || (card as any).is_removed) {
      if (validCandidates.length > 0) {
        const replacement = validCandidates.splice(
          Math.floor(Math.random() * validCandidates.length),
          1
        )[0];
        return { ...replacement };
      }
    }
    return card;
  });

  // Salvar no Supabase
  try {
    await supabase
      .from('saved_decks')
      .update({ cards: updatedCards })
      .eq('id', deckId)
      .eq('user_id', userId);
  } catch {
    // ignore
  }

  return updatedCards;
}
