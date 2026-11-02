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
  hat: boolean; // chapéu, gorro ou boné
  beard: boolean; // barba ou bigode
  earrings: boolean; // brincos
  smile: boolean; // sorriso aberto
}

export interface Character {
  id: string;
  name: string;
  traits: CharacterTraits;
  avatarBg: string;
  hairHex: string;
  eyeHex: string;
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
  answer?: boolean | null; // null = aguardando resposta
  timestamp: number;
}

export interface PlayerInfo {
  id: string;
  name: string;
  isHost: boolean;
  secretCharacterId?: string | null;
  ready: boolean;
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
