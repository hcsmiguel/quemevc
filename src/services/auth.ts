import { supabase, hashPassword } from './supabase';

export interface AppUser {
  id: string;
  username: string;
  created_at: string;
}

export class AuthService {
  private currentUser: AppUser | null = null;

  constructor() {
    const saved = localStorage.getItem('cara_auth_user');
    if (saved) {
      try {
        this.currentUser = JSON.parse(saved);
      } catch {
        this.currentUser = null;
      }
    }
  }

  public getCurrentUser(): AppUser | null {
    return this.currentUser;
  }

  public async register(username: string, password: string):Promise<AppUser> {
    const cleanUser = username.trim().toLowerCase();
    if (cleanUser.length < 3) {
      throw new Error('O nome de usuário deve ter pelo menos 3 caracteres.');
    }
    if (password.length < 4) {
      throw new Error('A senha deve ter pelo menos 4 caracteres.');
    }

    const passwordHash = await hashPassword(password);

    // Verificar se já existe
    const { data: existing } = await supabase
      .from('app_users')
      .select('id')
      .ilike('username', cleanUser)
      .maybeSingle();

    if (existing) {
      throw new Error('Este nome de usuário já está em uso.');
    }

    // Inserir novo usuário
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
      created_at: data.created_at,
    };

    this.setCurrentUser(user);
    return user;
  }

  public async login(username: string, password: string): Promise<AppUser> {
    const cleanUser = username.trim().toLowerCase();
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
      created_at: data.created_at,
    };

    this.setCurrentUser(user);
    return user;
  }

  public logout(): void {
    this.currentUser = null;
    localStorage.removeItem('cara_auth_user');
  }

  private setCurrentUser(user: AppUser): void {
    this.currentUser = user;
    localStorage.setItem('cara_auth_user', JSON.stringify(user));
    localStorage.setItem('cara_player_name', user.username);
  }
}

export const auth = new AuthService();
