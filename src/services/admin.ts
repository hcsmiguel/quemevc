import { supabase } from './supabase';
import { auth } from './auth';

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

      if (error || !data) return false;
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
}

export const adminService = new AdminService();
