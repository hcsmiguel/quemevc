export type Gender = 'masculino' | 'feminino';
export type HairColor = 'castanho' | 'loiro' | 'preto' | 'ruivo' | 'grisalho';
export type HairStyle = 'curto' | 'longo' | 'cacheado' | 'careca';
export type EyeColor = 'castanho' | 'azul' | 'verde';

export interface CharacterTraits {
  gender: Gender;
  hairColor: HairColor;
  hairStyle: HairStyle;
  eyeColor: EyeColor;
  glasses: boolean;
  hat: boolean;
  beard: boolean;
  earrings: boolean;
  smile: boolean;
}

export interface Character {
  id: string;
  name: string;
  imageUrl?: string; // Para caras personalizadas
  traits?: CharacterTraits; // Para caras padrão
  avatarBg?: string;
  hairHex?: string;
  eyeHex?: string;
}

export type CardStatus = 'normal' | 'suspect' | 'discard' | 'target';

export type GameMode = 'standard' | 'custom';
export type DifficultyCount = 15 | 30 | 45 | 60;

export interface RoomConfig {
  mode: GameMode;
  cardCount: DifficultyCount;
  deckName?: string;
  customCards?: Character[];
}

export type GamePhase = 
  | 'LOBBY' 
  | 'CHOOSING_SECRET' 
  | 'PLAYING' 
  | 'GAME_OVER';

export interface Question {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  traitKey?: keyof CharacterTraits;
  traitValue?: any;
  answer?: boolean | null;
  timestamp: number;
}

export interface PlayerInfo {
  id: string;
  name: string;
  isHost: boolean;
  secretCharacterId?: string | null;
  ready: boolean;
}

export interface UndoAction {
  type: 'status_change';
  previousStates: Record<string, CardStatus>;
  newStates: Record<string, CardStatus>;
  description: string;
}

export interface NetworkMessage {
  type: 
    | 'JOIN' 
    | 'PLAYER_JOINED' 
    | 'SYNC_LOBBY' 
    | 'CHOSE_SECRET' 
    | 'START_GAME' 
    | 'ASK_QUESTION' 
    | 'ANSWER_QUESTION' 
    | 'PASS_TURN' 
    | 'MAKE_GUESS' 
    | 'GUESS_RESULT' 
    | 'REMATCH' 
    | 'CHAT';
  senderId: string;
  senderName: string;
  payload: any;
  timestamp: number;
}
