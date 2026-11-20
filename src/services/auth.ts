import { supabase, hashPassword } from './supabase';
import type { Character } from '../types/game';

export interface AppUser {
  id: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  provider?: 'google' | 'discord' | 'email';
  created_at: string;
  is_admin?: boolean;
  is_banned?: boolean;
  banned_until?: string | null;
  ban_reason?: string | null;
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
  is_public?: boolean;
  author_name?: string;
  is_official?: boolean;
  is_draft?: boolean;
  is_featured?: boolean;
  featured_order?: number;
  description?: string;
  cover_image_url?: string;
  is_hidden?: boolean;
}

export interface SavedFace {
  id: string;
  user_id: string;
  name: string;
  image_url: string;
  created_at: string;
  is_public?: boolean;
  author_name?: string;
}

export // Cache em memória para transições ultra-rápidas e instantâneas da Comunidade
let publicDecksMemoryCache: { data: SavedDeck[]; timestamp: number } | null = null;
let publicFacesMemoryCache: { data: SavedFace[]; timestamp: number } | null = null;

class AuthService {
  private currentUser: AppUser | null = null;
  private authStateListeners: Set<(user: AppUser | null) => void> = new Set();

  constructor() {
    // 1. Tentar restaurar do localStorage
    const saved = localStorage.getItem('cara_auth_user');
    if (saved) {
      try {
        this.currentUser = JSON.parse(saved);
        this.refreshUserProfile();
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
          email: u.email,
          avatarUrl: avatar,
          provider,
          created_at: u.created_at || new Date().toISOString(),
        };

        await this.syncAndLoadUserProfile(appUser);
      }
    });
  }

  public getCurrentUser(): AppUser | null {
    return this.currentUser;
  }

  public isAdmin(): boolean {
    return !!this.currentUser?.is_admin;
  }

  public isBanned(): boolean {
    return !!this.currentUser?.is_banned;
  }

  public async syncAndLoadUserProfile(appUser: AppUser): Promise<AppUser> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', appUser.id)
        .maybeSingle();

      if (!error && data) {
        const isBanned = !!data.is_banned && (!data.banned_until || new Date(data.banned_until) > new Date());
        appUser.is_admin = !!data.is_admin;
        appUser.is_banned = isBanned;
        appUser.banned_until = data.banned_until;
        appUser.ban_reason = data.ban_reason;
        appUser.email = data.email || appUser.email;
      } else {
        await supabase.from('user_profiles').insert({
          id: appUser.id,
          username: appUser.username,
          email: appUser.email || null,
          avatar_url: appUser.avatarUrl || null,
          provider: appUser.provider || 'discord',
          is_admin: false,
          is_banned: false,
        });
      }
    } catch (e) {
      console.warn('Falha ao sincronizar perfil do usuário:', e);
    }

    this.setCurrentUser(appUser);
    return appUser;
  }

  public async refreshUserProfile(): Promise<AppUser | null> {
    if (!this.currentUser) return null;
    try {
      let data: any = null;
      let error: any = null;

      // 1. Tentar por ID
      if (this.currentUser.id) {
        const res = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', this.currentUser.id)
          .maybeSingle();
        data = res.data;
        error = res.error;
      }

      // 2. Fallback por e-mail
      if (!data && this.currentUser.email) {
        const emailRes = await supabase
          .from('user_profiles')
          .select('*')
          .eq('email', this.currentUser.email)
          .maybeSingle();
        if (emailRes.data) {
          data = emailRes.data;
          error = null;
        }
      }

      // 3. Fallback por nome de usuário (case-insensitive)
      if (!data && this.currentUser.username) {
        const userRes = await supabase
          .from('user_profiles')
          .select('*')
          .ilike('username', this.currentUser.username)
          .maybeSingle();
        if (userRes.data) {
          data = userRes.data;
          error = null;
        }
      }

      if (!error && data) {
        const isBanned = !!data.is_banned && (!data.banned_until || new Date(data.banned_until) > new Date());
        this.currentUser = {
          ...this.currentUser,
          id: data.id || this.currentUser.id,
          username: data.username || this.currentUser.username,
          is_admin: !!data.is_admin,
          is_banned: isBanned,
          banned_until: data.banned_until,
          ban_reason: data.ban_reason,
          email: data.email || this.currentUser.email,
        };
        localStorage.setItem('cara_auth_user', JSON.stringify(this.currentUser));
        this.notifyListeners();
      }
    } catch (e) {
      console.warn('Falha ao atualizar perfil do usuário:', e);
    }
    return this.currentUser;
  }

  public async verifyAdminStatus(): Promise<boolean> {
    try {
      let uid = this.currentUser?.id;
      if (!uid) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          uid = sessionData.session.user.id;
        }
      }

      let data: any = null;
      let error: any = null;

      if (uid) {
        const res = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', uid)
          .maybeSingle();
        data = res.data;
        error = res.error;
      }

      if (!data && this.currentUser?.email) {
        const emailRes = await supabase
          .from('user_profiles')
          .select('*')
          .eq('email', this.currentUser.email)
          .maybeSingle();
        if (emailRes.data) {
          data = emailRes.data;
          error = null;
        }
      }

      if (!data && this.currentUser?.username) {
        const userRes = await supabase
          .from('user_profiles')
          .select('*')
          .ilike('username', this.currentUser.username)
          .maybeSingle();
        if (userRes.data) {
          data = userRes.data;
          error = null;
        }
      }

      const isAdmin = !error && !!data?.is_admin;
      if (isAdmin) {
        if (!this.currentUser && data) {
          const appUser: AppUser = {
            id: data.id,
            username: data.username,
            email: data.email,
            avatarUrl: data.avatar_url,
            provider: data.provider || 'discord',
            created_at: data.created_at,
            is_admin: true,
            is_banned: false,
          };
          this.setCurrentUser(appUser);
        } else if (this.currentUser && this.currentUser.is_admin !== isAdmin) {
          this.currentUser.is_admin = isAdmin;
          localStorage.setItem('cara_auth_user', JSON.stringify(this.currentUser));
          this.notifyListeners();
        }
      }
      return isAdmin;
    } catch {
      return false;
    }
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

  // Login tradicional por Usuário e Senha (via RPC Seguro com SECURITY DEFINER)
  public async register(username: string, password: string): Promise<AppUser> {
    const cleanUser = username.trim();
    if (cleanUser.length < 3) {
      throw new Error('O nome de usuário deve ter pelo menos 3 caracteres.');
    }
    if (password.length < 4) {
      throw new Error('A senha deve ter pelo menos 4 caracteres.');
    }

    const passwordHash = await hashPassword(password);

    const { data, error } = await supabase.rpc('register_app_user', {
      p_username: cleanUser,
      p_password_hash: passwordHash,
    });

    if (error || !data || (Array.isArray(data) && data.length === 0)) {
      throw new Error(error?.message || 'Erro ao criar conta.');
    }

    const userRecord = Array.isArray(data) ? data[0] : data;

    const user: AppUser = {
      id: userRecord.id,
      username: userRecord.username,
      provider: 'email',
      created_at: userRecord.created_at,
    };

    this.setCurrentUser(user);
    return user;
  }

  public async login(username: string, password: string): Promise<AppUser> {
    const cleanUser = username.trim();
    if (!cleanUser) {
      throw new Error('Digite o nome de usuário.');
    }
    const passwordHash = await hashPassword(password);

    const { data, error } = await supabase.rpc('authenticate_app_user', {
      p_username: cleanUser,
      p_password_hash: passwordHash,
    });

    if (error) {
      throw new Error('Erro ao processar autenticação.');
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error('Usuário não encontrado ou senha incorreta.');
    }

    const userRecord = data[0];

    const user: AppUser = {
      id: userRecord.id,
      username: userRecord.username,
      provider: 'email',
      created_at: userRecord.created_at,
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

  // PONTO 3.a: Trocar Senha
  public async updatePassword(newPassword: string): Promise<void> {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('A nova senha deve ter no mínimo 6 caracteres.');
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      throw new Error(error.message || 'Falha ao alterar senha.');
    }
  }

  // PONTO 3.a: Apagar Conta e Dados do Usuário
  public async deleteAccount(userId: string): Promise<void> {
    try {
      await supabase.from('saved_decks').delete().eq('user_id', userId);
      await supabase.from('saved_faces').delete().eq('user_id', userId);
      await supabase.from('match_history').delete().eq('user_id', userId);
      localStorage.removeItem(`cara_saved_decks_${userId}`);
      localStorage.removeItem(`cara_saved_faces_${userId}`);
      localStorage.removeItem(`cara_matches_${userId}`);
    } catch (err) {
      console.warn('Erro ao remover dados do usuário:', err);
    }
    await this.logout();
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
  public async saveDeck(
    userId: string,
    name: string,
    cardCount: number,
    cards: Character[],
    isPublic: boolean = false,
    authorName: string = ''
  ): Promise<SavedDeck> {
    const cleanName = name.trim() || `Baralho ${cardCount} Caras`;

    // Salvar no Supabase
    const { data, error } = await supabase
      .from('saved_decks')
      .insert({
        user_id: userId,
        name: cleanName,
        card_count: cardCount,
        cards,
        is_public: isPublic,
        author_name: authorName,
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
        is_public: isPublic,
        author_name: authorName,
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
      await supabase.from('saved_decks').delete().eq('id', deckId).eq('user_id', userId);
    } catch {
      // ignore
    }
    const localKey = `cara_saved_decks_${userId}`;
    const localSaved: SavedDeck[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    localStorage.setItem(localKey, JSON.stringify(localSaved.filter((d) => d.id !== deckId)));
  }

  // PONTO 3.d: Buscar Baralho por ID para Compartilhamento
  public async getDeckById(deckId: string): Promise<SavedDeck | null> {
    try {
      const { data, error } = await supabase
        .from('saved_decks')
        .select('*')
        .eq('id', deckId)
        .maybeSingle();

      if (!error && data) {
        return data as SavedDeck;
      }
    } catch {
      // ignore
    }

    // Fallback: buscar no localStorage de todos os decks conhecidos
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('cara_saved_decks_')) {
        const decks: SavedDeck[] = JSON.parse(localStorage.getItem(key) || '[]');
        const found = decks.find((d) => d.id === deckId);
        if (found) return found;
      }
    }
    return null;
  }

  // PONTO 3.e: Atualizar Baralho Existente (Editar Nome, Cartas, etc.)
  public async updateSavedDeck(
    deckId: string,
    userId: string,
    name: string,
    cardCount: number,
    cards: Character[],
    isPublic?: boolean
  ): Promise<SavedDeck> {
    const cleanName = name.trim() || `Baralho ${cardCount} Caras`;

    try {
      const updatePayload: any = {
        name: cleanName,
        card_count: cardCount,
        cards,
      };
      if (isPublic !== undefined) {
        updatePayload.is_public = isPublic;
      }

      const { data, error } = await supabase
        .from('saved_decks')
        .update(updatePayload)
        .eq('id', deckId)
        .eq('user_id', userId)
        .select('*')
        .single();

      if (!error && data) {
        return data as SavedDeck;
      }
    } catch {
      // ignore
    }

    // Fallback local
    const localKey = `cara_saved_decks_${userId}`;
    const localSaved: SavedDeck[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    const updated = localSaved.map((d) =>
      d.id === deckId
        ? {
            ...d,
            name: cleanName,
            card_count: cardCount,
            cards,
            ...(isPublic !== undefined ? { is_public: isPublic } : {}),
          }
        : d
    );
    localStorage.setItem(localKey, JSON.stringify(updated));
    return {
      id: deckId,
      user_id: userId,
      name: cleanName,
      card_count: cardCount,
      cards,
      created_at: new Date().toISOString(),
      ...(isPublic !== undefined ? { is_public: isPublic } : {}),
    };
  }

  // Alternar Visibilidade Pública do Baralho
  public async toggleDeckPublic(deckId: string, userId: string, isPublic: boolean, authorName?: string): Promise<boolean> {
    try {
      const payload: any = { is_public: isPublic };
      if (authorName) payload.author_name = authorName;

      const { error } = await supabase
        .from('saved_decks')
        .update(payload)
        .eq('id', deckId)
        .eq('user_id', userId);
      if (!error) return true;
    } catch {
      // ignore
    }

    const localKey = `cara_saved_decks_${userId}`;
    const localSaved: SavedDeck[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    const updated = localSaved.map((d) =>
      d.id === deckId ? { ...d, is_public: isPublic, ...(authorName ? { author_name: authorName } : {}) } : d
    );
    localStorage.setItem(localKey, JSON.stringify(updated));
    return true;
  }

  // Obter baralhos públicos em cache imediatamente para renderização síncrona
  public getCachedPublicDecks(): SavedDeck[] {
    return publicDecksMemoryCache ? publicDecksMemoryCache.data : [];
  }

  // Obter caras públicas em cache imediatamente
  public getCachedPublicFaces(): SavedFace[] {
    return publicFacesMemoryCache ? publicFacesMemoryCache.data : [];
  }

  // Buscar Baralhos da Comunidade (com cache em memória para resposta instantânea)
  public async getPublicDecks(searchQuery?: string): Promise<SavedDeck[]> {
    if (!searchQuery && publicDecksMemoryCache && Date.now() - publicDecksMemoryCache.timestamp < 60000) {
      return publicDecksMemoryCache.data;
    }

    try {
      let query = supabase
        .from('saved_decks')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(60);

      if (searchQuery && searchQuery.trim()) {
        query = query.ilike('name', `%${searchQuery.trim()}%`);
      }

      const { data, error } = await query;
      if (!error && data) {
        const result = data as SavedDeck[];
        if (!searchQuery) {
          publicDecksMemoryCache = { data: result, timestamp: Date.now() };
        }
        return result;
      }
    } catch {
      // ignore
    }

    // Fallback de busca local
    const publicDecks: SavedDeck[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('cara_saved_decks_')) {
        const decks: SavedDeck[] = JSON.parse(localStorage.getItem(key) || '[]');
        decks.filter((d) => d.is_public).forEach((d) => publicDecks.push(d));
      }
    }
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return publicDecks.filter((d) => d.name.toLowerCase().includes(q));
    }
    publicDecksMemoryCache = { data: publicDecks, timestamp: Date.now() };
    return publicDecks;
  }

  // PONTO 3.c: Salvar Caras Personalizadas Avulsas no Perfil do Jogador
  public async saveFace(
    userId: string,
    name: string,
    imageUrl: string,
    isPublic: boolean = false,
    authorName: string = ''
  ): Promise<SavedFace> {
    const cleanName = name.trim();
    if (!cleanName) {
      throw new Error('O nome da cara é obrigatório.');
    }

    try {
      const { data, error } = await supabase
        .from('saved_faces')
        .insert({
          user_id: userId,
          name: cleanName,
          image_url: imageUrl,
          is_public: isPublic,
          author_name: authorName,
        })
        .select('*')
        .single();

      if (!error && data) {
        return data as SavedFace;
      }
    } catch {
      // ignore
    }

    // Fallback local
    const localKey = `cara_saved_faces_${userId}`;
    const localSaved: SavedFace[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    const newFace: SavedFace = {
      id: 'face_' + Date.now(),
      user_id: userId,
      name: cleanName,
      image_url: imageUrl,
      created_at: new Date().toISOString(),
      is_public: isPublic,
      author_name: authorName,
    };
    localStorage.setItem(localKey, JSON.stringify([newFace, ...localSaved]));
    return newFace;
  }

  // Alternar Visibilidade Pública de uma Cara
  public async toggleFacePublic(faceId: string, userId: string, isPublic: boolean, authorName?: string): Promise<boolean> {
    try {
      const payload: any = { is_public: isPublic };
      if (authorName) payload.author_name = authorName;

      const { error } = await supabase
        .from('saved_faces')
        .update(payload)
        .eq('id', faceId)
        .eq('user_id', userId);
      if (!error) return true;
    } catch {
      // ignore
    }

    const localKey = `cara_saved_faces_${userId}`;
    const localSaved: SavedFace[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    const updated = localSaved.map((f) =>
      f.id === faceId ? { ...f, is_public: isPublic, ...(authorName ? { author_name: authorName } : {}) } : f
    );
    localStorage.setItem(localKey, JSON.stringify(updated));
    return true;
  }

  // Verificar se já existe uma cara com o mesmo nome público
  public async checkIfPublicFaceNameExists(name: string): Promise<boolean> {
    const clean = name.trim();
    if (!clean) return false;
    try {
      const { data, error } = await supabase
        .from('saved_faces')
        .select('id')
        .eq('is_public', true)
        .ilike('name', clean)
        .limit(1);

      if (!error && data && data.length > 0) {
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  }

  // Buscar Caras da Comunidade (com cache em memória)
  public async getPublicFaces(searchQuery?: string): Promise<SavedFace[]> {
    if (!searchQuery && publicFacesMemoryCache && Date.now() - publicFacesMemoryCache.timestamp < 60000) {
      return publicFacesMemoryCache.data;
    }

    try {
      let query = supabase
        .from('saved_faces')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(100);

      if (searchQuery && searchQuery.trim()) {
        query = query.ilike('name', `%${searchQuery.trim()}%`);
      }

      const { data, error } = await query;
      if (!error && data) {
        const result = data as SavedFace[];
        if (!searchQuery) {
          publicFacesMemoryCache = { data: result, timestamp: Date.now() };
        }
        return result;
      }
    } catch {
      // ignore
    }

    // Fallback local
    const publicFaces: SavedFace[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('cara_saved_faces_')) {
        const faces: SavedFace[] = JSON.parse(localStorage.getItem(key) || '[]');
        faces.filter((f) => f.is_public).forEach((f) => publicFaces.push(f));
      }
    }
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return publicFaces.filter((f) => f.name.toLowerCase().includes(q));
    }
    publicFacesMemoryCache = { data: publicFaces, timestamp: Date.now() };
    return publicFaces;
  }

  public async getUserSavedFaces(userId: string): Promise<SavedFace[]> {
    try {
      const { data, error } = await supabase
        .from('saved_faces')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data as SavedFace[];
      }
    } catch {
      // ignore
    }

    const localKey = `cara_saved_faces_${userId}`;
    return JSON.parse(localStorage.getItem(localKey) || '[]');
  }

  public async deleteSavedFace(faceId: string, userId: string): Promise<void> {
    try {
      await supabase.from('saved_faces').delete().eq('id', faceId).eq('user_id', userId);
    } catch {
      // ignore
    }

    const localKey = `cara_saved_faces_${userId}`;
    const localSaved: SavedFace[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    localStorage.setItem(localKey, JSON.stringify(localSaved.filter((f) => f.id !== faceId)));
  }

  // Registrar denúncia de conteúdo da comunidade
  public async submitReport(report: {
    contentType: 'deck' | 'face';
    contentId: string;
    contentName: string;
    authorName?: string;
    reportedBy?: string;
    reason: string;
    details?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('content_reports').insert({
        content_type: report.contentType,
        content_id: report.contentId,
        content_name: report.contentName,
        author_name: report.authorName || '',
        reported_by: report.reportedBy || 'Anônimo',
        reason: report.reason,
        details: report.details || '',
      });
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.warn('Erro ao registrar denúncia no Supabase:', err);
      // Fallback local se estiver offline
      try {
        const localReports = JSON.parse(localStorage.getItem('cara_content_reports') || '[]');
        localReports.push({ ...report, created_at: new Date().toISOString() });
        localStorage.setItem('cara_content_reports', JSON.stringify(localReports));
      } catch {
        // ignore
      }
      return { success: true };
    }
  }
}

export const auth = new AuthService();
