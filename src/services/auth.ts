import { supabase, hashPassword } from './supabase';
import type { Character } from '../types/game';

export interface AppUser {
  id: string;
  username: string;
  avatarUrl?: string;
  provider?: 'google' | 'discord' | 'email';
  created_at: string;
}

export interface MatchRecord {
  id?: string;
  user_id: string;
  opponent_name: string;
  result: 'win' | 'loss';
  deck_mode: string;
  card_count: number;
  created_at?: string;
}

export interface UserStats {
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  lastMatches: MatchRecord[];
}

export interface SavedDeck {
  id: string;
  user_id: string;
  name: string;
  card_count: number;
  cards: Character[];
  created_at: string;
}

export class AuthService {
  private currentUser: AppUser | null = null;
  private authStateListeners: Set<(user: AppUser | null) => void> = new Set();

  constructor() {
    // 1. Tentar restaurar do localStorage
    const saved = localStorage.getItem('cara_auth_user');
    if (saved) {
      try {
        this.currentUser = JSON.parse(saved);
      } catch {
        this.currentUser = null;
      }
    }

    // 2. Ouvir mudanças de autenticação do Supabase (Google e Discord OAuth)
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const u = session.user;
        const meta = u.user_metadata || {};
        
        let provider: 'google' | 'discord' | 'email' = 'email';
        if (u.app_metadata?.provider === 'google' || meta.iss?.includes('google')) {
          provider = 'google';
        } else if (u.app_metadata?.provider === 'discord') {
          provider = 'discord';
        }

        const name = 
          meta.custom_claims?.global_name ||
          meta.full_name || 
          meta.name || 
          meta.preferred_username || 
          u.email?.split('@')[0] || 
          'Jogador';

        const avatar = meta.avatar_url || meta.picture || undefined;

        const appUser: AppUser = {
          id: u.id,
          username: name,
          avatarUrl: avatar,
          provider,
          created_at: u.created_at || new Date().toISOString(),
        };

        this.setCurrentUser(appUser);
      }
    });
  }

  public getCurrentUser(): AppUser | null {
    return this.currentUser;
  }

  public onAuthChange(fn: (user: AppUser | null) => void): () => void {
    this.authStateListeners.add(fn);
    return () => this.authStateListeners.delete(fn);
  }

  // Ponto 1.a: Login com Google
  public async loginWithGoogle(): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) throw error;
  }

  // Ponto 1.b: Login com Discord
  public async loginWithDiscord(): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) throw error;
  }

  // Login tradicional por Usuário e Senha
  public async register(username: string, password: string): Promise<AppUser> {
    const cleanUser = username.trim();
    if (cleanUser.length < 3) {
      throw new Error('O nome de usuário deve ter pelo menos 3 caracteres.');
    }
    if (password.length < 4) {
      throw new Error('A senha deve ter pelo menos 4 caracteres.');
    }

    const passwordHash = await hashPassword(password);

    const { data: existing } = await supabase
      .from('app_users')
      .select('id')
      .ilike('username', cleanUser)
      .maybeSingle();

    if (existing) {
      throw new Error('Este nome de usuário já está em uso.');
    }

    const { data, error } = await supabase
      .from('app_users')
      .insert({
        username: cleanUser,
        password_hash: passwordHash,
      })
      .select('id, username, created_at')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Erro ao criar conta.');
    }

    const user: AppUser = {
      id: data.id,
      username: data.username,
      provider: 'email',
      created_at: data.created_at,
    };

    this.setCurrentUser(user);
    return user;
  }

  public async login(username: string, password: string): Promise<AppUser> {
    const cleanUser = username.trim();
    const passwordHash = await hashPassword(password);

    const { data, error } = await supabase
      .from('app_users')
      .select('id, username, password_hash, created_at')
      .ilike('username', cleanUser)
      .maybeSingle();

    if (error || !data) {
      throw new Error('Usuário não encontrado.');
    }

    if (data.password_hash !== passwordHash) {
      throw new Error('Senha incorreta.');
    }

    const user: AppUser = {
      id: data.id,
      username: data.username,
      provider: 'email',
      created_at: data.created_at,
    };

    this.setCurrentUser(user);
    return user;
  }

  public async logout(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    this.currentUser = null;
    localStorage.removeItem('cara_auth_user');
    this.notifyListeners();
  }

  private setCurrentUser(user: AppUser): void {
    this.currentUser = user;
    localStorage.setItem('cara_auth_user', JSON.stringify(user));
    localStorage.setItem('cara_player_name', user.username);
    this.notifyListeners();
  }

  private notifyListeners() {
    this.authStateListeners.forEach((fn) => fn(this.currentUser));
  }

  // PONTO 2.a: Gravar e Obter Histórico de Partidas e Estatísticas
  public async recordMatch(data: Omit<MatchRecord, 'id' | 'created_at'>): Promise<void> {
    try {
      // Salva no Supabase
      await supabase.from('match_history').insert({
        user_id: data.user_id,
        opponent_name: data.opponent_name,
        result: data.result,
        deck_mode: data.deck_mode,
        card_count: data.card_count,
      });

      // Também armazena localmente como fallback
      const localKey = `cara_matches_${data.user_id}`;
      const savedMatches = JSON.parse(localStorage.getItem(localKey) || '[]');
      const newMatch: MatchRecord = {
        ...data,
        id: 'm_' + Date.now(),
        created_at: new Date().toISOString(),
      };
      localStorage.setItem(localKey, JSON.stringify([newMatch, ...savedMatches].slice(0, 30)));
    } catch (err) {
      console.warn('Erro ao salvar histórico de partida:', err);
    }
  }

  public async getUserStats(userId: string): Promise<UserStats> {
    try {
      // Tentar buscar do Supabase
      const { data: dbMatches, error } = await supabase
        .from('match_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      let matches: MatchRecord[] = [];
      if (!error && dbMatches && dbMatches.length > 0) {
        matches = dbMatches as MatchRecord[];
      } else {
        // Fallback local
        const localKey = `cara_matches_${userId}`;
        matches = JSON.parse(localStorage.getItem(localKey) || '[]');
      }

      const totalMatches = matches.length;
      const wins = matches.filter((m) => m.result === 'win').length;
      const losses = totalMatches - wins;
      const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
      const lastMatches = matches.slice(0, 5);

      return {
        totalMatches,
        wins,
        losses,
        winRate,
        lastMatches,
      };
    } catch {
      return {
        totalMatches: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        lastMatches: [],
      };
    }
  }

  // PONTO 2.b: Salvar Baralho Personalizado no Perfil
  public async saveDeck(userId: string, name: string, cardCount: number, cards: Character[]): Promise<SavedDeck> {
    const cleanName = name.trim() || `Baralho ${cardCount} Caras`;

    // Salvar no Supabase
    const { data, error } = await supabase
      .from('saved_decks')
      .insert({
        user_id: userId,
        name: cleanName,
        card_count: cardCount,
        cards,
      })
      .select('*')
      .single();

    if (error || !data) {
      // Fallback local
      const localKey = `cara_saved_decks_${userId}`;
      const localSaved: SavedDeck[] = JSON.parse(localStorage.getItem(localKey) || '[]');
      const newDeck: SavedDeck = {
        id: 'deck_' + Date.now(),
        user_id: userId,
        name: cleanName,
        card_count: cardCount,
        cards,
        created_at: new Date().toISOString(),
      };
      localStorage.setItem(localKey, JSON.stringify([newDeck, ...localSaved]));
      return newDeck;
    }

    return data as SavedDeck;
  }

  public async getUserSavedDecks(userId: string): Promise<SavedDeck[]> {
    try {
      const { data, error } = await supabase
        .from('saved_decks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data as SavedDeck[];
      }
    } catch {
      // ignore
    }

    // Fallback local
    const localKey = `cara_saved_decks_${userId}`;
    return JSON.parse(localStorage.getItem(localKey) || '[]');
  }

  public async deleteSavedDeck(deckId: string, userId: string): Promise<void> {
    try {
      await supabase.from('saved_decks').delete().eq('id', deckId);
    } catch {
      // ignore
    }
    const localKey = `cara_saved_decks_${userId}`;
    const localSaved: SavedDeck[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    localStorage.setItem(localKey, JSON.stringify(localSaved.filter((d) => d.id !== deckId)));
  }
}

export const auth = new AuthService();
