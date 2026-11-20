import { supabase } from './supabase';
import { auth, type SavedDeck } from './auth';
import type { Character } from '../types/game';

export interface AdminAuditLog {
  id: string;
  admin_id: string;
  admin_name: string;
  action: string;
  target_type: string;
  target_id: string;
  target_name?: string;
  details?: Record<string, any>;
  created_at: string;
}

export interface AdminOverviewMetrics {
  officialDecksCount: number;
  communityDecksCount: number;
  pendingReportsCount: number;
  bannedUsersCount: number;
}

export interface OfficialDeckInput {
  id?: string;
  name: string;
  description?: string;
  cover_image_url?: string;
  card_count: number;
  cards: Character[];
  is_draft: boolean;
  is_public: boolean;
}

export interface ContentReportItem {
  id: string;
  content_type: 'deck' | 'face' | 'user';
  content_id: string;
  content_name?: string;
  author_name?: string;
  reported_by?: string;
  reason?: string;
  details?: string;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
  resolution_action?: string;
  resolved_by?: string;
  resolved_at?: string;
  admin_notes?: string;
}

export interface AdminUserItem {
  id: string;
  username: string;
  email?: string;
  is_admin: boolean;
  is_banned: boolean;
  ban_reason?: string;
  created_at: string;
}

export class AdminService {
  /**
   * Verifica se o usuário atual é administrador consultando diretamente o Supabase
   */
  public async verifyIsAdmin(): Promise<boolean> {
    const user = auth.getCurrentUser();
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();

      if (error || !data) {
        // Fallback por e-mail ou username
        if (user.email) {
          const { data: emailData } = await supabase
            .from('user_profiles')
            .select('is_admin')
            .eq('email', user.email)
            .maybeSingle();
          if (emailData?.is_admin) return true;
        }
        return false;
      }
      return !!data.is_admin;
    } catch {
      return false;
    }
  }

  /**
   * Busca métricas gerais para a Visão Geral do Painel
   */
  public async getOverviewMetrics(): Promise<AdminOverviewMetrics> {
    try {
      const [officialRes, communityRes, reportsRes, bannedRes] = await Promise.all([
        supabase.from('saved_decks').select('id', { count: 'exact', head: true }).eq('is_official', true),
        supabase.from('saved_decks').select('id', { count: 'exact', head: true }).eq('is_public', true).eq('is_official', false),
        supabase.from('content_reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('is_banned', true),
      ]);

      return {
        officialDecksCount: officialRes.count || 0,
        communityDecksCount: communityRes.count || 0,
        pendingReportsCount: reportsRes.count || 0,
        bannedUsersCount: bannedRes.count || 0,
      };
    } catch (err) {
      console.warn('Erro ao carregar métricas da visão geral:', err);
      return {
        officialDecksCount: 0,
        communityDecksCount: 0,
        pendingReportsCount: 0,
        bannedUsersCount: 0,
      };
    }
  }

  /**
   * Registra uma ação executada pelo admin na tabela de auditoria
   */
  public async logAction(
    action: string,
    targetType: 'deck' | 'card' | 'user' | 'report' | 'system',
    targetId: string,
    targetName?: string,
    details?: Record<string, any>
  ): Promise<void> {
    const user = auth.getCurrentUser();
    if (!user) return;

    try {
      await supabase.from('admin_audit_logs').insert({
        admin_id: user.id,
        admin_name: user.username,
        action,
        target_type: targetType,
        target_id: targetId,
        target_name: targetName || null,
        details: details || {},
      });
    } catch (err) {
      console.warn('Falha ao registrar log de auditoria:', err);
    }
  }

  /**
   * Lista o histórico recente de ações de auditoria
   */
  public async getAuditLogs(limit = 30): Promise<AdminAuditLog[]> {
    try {
      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.warn('Erro ao buscar logs de auditoria:', error);
        return [];
      }
      return (data as AdminAuditLog[]) || [];
    } catch {
      return [];
    }
  }

  // ==========================================
  // BARALHOS OFICIAIS
  // ==========================================

  /**
   * Busca todos os baralhos oficiais do jogo
   */
  public async getOfficialDecks(): Promise<SavedDeck[]> {
    try {
      const { data, error } = await supabase
        .from('saved_decks')
        .select('*')
        .eq('is_official', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Erro ao buscar baralhos oficiais:', error);
        return [];
      }
      return (data as SavedDeck[]) || [];
    } catch (err) {
      console.warn('Exceção ao buscar baralhos oficiais:', err);
      return [];
    }
  }

  /**
   * Salva ou atualiza um baralho oficial
   */
  public async saveOfficialDeck(deckInput: OfficialDeckInput): Promise<SavedDeck | null> {
    const user = auth.getCurrentUser();
    const adminId = user?.id || 'admin_tanacara';

    const payload = {
      user_id: adminId,
      author_name: 'Tá na Cara!',
      is_official: true,
      name: deckInput.name.trim().slice(0, 35),
      description: (deckInput.description || '').trim().slice(0, 160),
      cover_image_url: deckInput.cover_image_url || deckInput.cards[0]?.imageUrl || '',
      card_count: deckInput.card_count || deckInput.cards.length,
      cards: deckInput.cards,
      is_draft: deckInput.is_draft,
      is_public: !deckInput.is_draft,
      is_hidden: false,
    };

    try {
      if (deckInput.id) {
        // Atualização
        const { data, error } = await supabase
          .from('saved_decks')
          .update(payload)
          .eq('id', deckInput.id)
          .select()
          .single();

        if (error) {
          console.error('Erro ao atualizar baralho oficial:', error);
          throw error;
        }

        await this.logAction(
          deckInput.is_draft ? 'Salvou rascunho de baralho oficial' : 'Publicou baralho oficial',
          'deck',
          deckInput.id,
          payload.name,
          { cardsCount: payload.card_count, is_draft: payload.is_draft }
        );

        return data as SavedDeck;
      } else {
        // Criação
        const { data, error } = await supabase
          .from('saved_decks')
          .insert(payload)
          .select()
          .single();

        if (error) {
          console.error('Erro ao criar baralho oficial:', error);
          throw error;
        }

        await this.logAction(
          deckInput.is_draft ? 'Criou rascunho de baralho oficial' : 'Criou e publicou baralho oficial',
          'deck',
          data.id,
          payload.name,
          { cardsCount: payload.card_count, is_draft: payload.is_draft }
        );

        return data as SavedDeck;
      }
    } catch (err) {
      console.error('Falha ao salvar baralho oficial:', err);
      return null;
    }
  }

  /**
   * Exclui um baralho oficial
   */
  public async deleteOfficialDeck(deckId: string, deckName?: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('saved_decks')
        .delete()
        .eq('id', deckId);

      if (error) {
        console.error('Erro ao excluir baralho oficial:', error);
        return false;
      }

      await this.logAction('Excluiu baralho oficial', 'deck', deckId, deckName || 'Baralho Oficial');
      return true;
    } catch (err) {
      console.error('Exceção ao excluir baralho oficial:', err);
      return false;
    }
  }

  // ==========================================
  // DESTAQUES DA HOME
  // ==========================================

  /**
   * Busca os baralhos que estão marcados como destaque para a tela inicial
   */
  public async getFeaturedDecks(): Promise<SavedDeck[]> {
    try {
      const { data, error } = await supabase
        .from('saved_decks')
        .select('*')
        .eq('is_featured', true)
        .eq('is_hidden', false)
        .order('featured_order', { ascending: true });

      if (error) {
        console.warn('Erro ao buscar destaques da home:', error);
        return [];
      }
      return (data as SavedDeck[]) || [];
    } catch {
      return [];
    }
  }

  /**
   * Busca todos os baralhos elegíveis para destaque (publicados e não ocultos)
   */
  public async getEligibleDecksForFeatured(): Promise<SavedDeck[]> {
    try {
      const { data, error } = await supabase
        .from('saved_decks')
        .select('*')
        .eq('is_draft', false)
        .eq('is_hidden', false)
        .order('is_official', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) return [];
      return (data as SavedDeck[]) || [];
    } catch {
      return [];
    }
  }

  /**
   * Atualiza a lista e a ordenação dos destaques da Home
   */
  public async setFeaturedDecks(deckIdsInOrder: string[]): Promise<boolean> {
    try {
      // 1. Desmarcar todos os outros baralhos como destaque
      await supabase
        .from('saved_decks')
        .update({ is_featured: false, featured_order: 0 })
        .not('id', 'in', `(${deckIdsInOrder.join(',') || '00000000-0000-0000-0000-000000000000'})`);

      // 2. Marcar cada um com sua respectiva ordem (1-based)
      for (let i = 0; i < deckIdsInOrder.length; i++) {
        await supabase
          .from('saved_decks')
          .update({ is_featured: true, featured_order: i + 1 })
          .eq('id', deckIdsInOrder[i]);
      }

      await this.logAction(
        'Atualizou baralhos em destaque na Home',
        'system',
        'home_featured',
        `${deckIdsInOrder.length} baralhos`,
        { deckIds: deckIdsInOrder }
      );

      return true;
    } catch (err) {
      console.error('Erro ao atualizar destaques da home:', err);
      return false;
    }
  }

  // ==========================================
  // MODERAÇÃO DE DENÚNCIAS
  // ==========================================

  /**
   * Busca todas as denúncias de conteúdo
   */
  public async getReports(statusFilter?: 'pending' | 'resolved' | 'all'): Promise<ContentReportItem[]> {
    try {
      let query = supabase.from('content_reports').select('*').order('created_at', { ascending: false });
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      const { data, error } = await query;
      if (error) return [];
      return (data as ContentReportItem[]) || [];
    } catch {
      return [];
    }
  }

  /**
   * Resolve ou descarta uma denúncia
   */
  public async resolveReport(
    reportId: string,
    action: 'dismissed' | 'resolved',
    adminNotes?: string,
    hideContent?: boolean,
    targetType?: 'deck' | 'face',
    targetId?: string
  ): Promise<boolean> {
    const user = auth.getCurrentUser();
    try {
      const { error } = await supabase
        .from('content_reports')
        .update({
          status: action,
          resolved_by: user?.username || 'admin',
          resolved_at: new Date().toISOString(),
          admin_notes: adminNotes || null,
          resolution_action: action === 'resolved' ? (hideContent ? 'Conteúdo ocultado' : 'Aprovado após análise') : 'Denúncia descartada',
        })
        .eq('id', reportId);

      if (error) return false;

      // Se solicitado ocultar o conteúdo
      if (hideContent && targetType && targetId) {
        if (targetType === 'deck') {
          await supabase.from('saved_decks').update({ is_hidden: true }).eq('id', targetId);
        } else if (targetType === 'face') {
          await supabase.from('saved_faces').update({ is_hidden: true }).eq('id', targetId);
        }
      }

      await this.logAction(
        action === 'resolved' ? 'Resolveu denúncia' : 'Descartou denúncia',
        'report',
        reportId,
        undefined,
        { action, hideContent, targetType, targetId }
      );

      return true;
    } catch {
      return false;
    }
  }

  // ==========================================
  // CONTAS E BANIMENTOS
  // ==========================================

  /**
   * Lista usuários cadastrados
   */
  public async getUsers(query?: string): Promise<AdminUserItem[]> {
    try {
      let q = supabase
        .from('user_profiles')
        .select('id, username, email, is_admin, is_banned, ban_reason, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (query && query.trim()) {
        q = q.or(`username.ilike.%${query.trim()}%,email.ilike.%${query.trim()}%`);
      }

      const { data, error } = await q;
      if (error) return [];
      return (data as AdminUserItem[]) || [];
    } catch {
      return [];
    }
  }

  /**
   * Aplica ou remove suspensão em um usuário
   */
  public async setUserBanStatus(
    userId: string,
    isBanned: boolean,
    reason?: string,
    username?: string
  ): Promise<boolean> {
    const admin = auth.getCurrentUser();
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          is_banned: isBanned,
          ban_reason: isBanned ? (reason || 'Violação dos Termos de Uso') : null,
          banned_by: isBanned ? (admin?.username || 'admin') : null,
          banned_until: isBanned ? null : null, // Banimento permanente até remoção
        })
        .eq('id', userId);

      if (error) return false;

      await this.logAction(
        isBanned ? 'Suspendeu conta de usuário' : 'Removeu suspensão de conta',
        'user',
        userId,
        username || userId,
        { reason }
      );

      return true;
    } catch {
      return false;
    }
  }
}

export const adminService = new AdminService();
