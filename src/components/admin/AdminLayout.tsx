import React, { useState, useEffect, useCallback } from 'react';
import type { AppUser } from '../../services/auth';
import { auth } from '../../services/auth';
import { adminService, type AdminOverviewMetrics, type AdminAuditLog } from '../../services/admin';
import { AdminOverview } from './AdminOverview';
import { AdminOfficialDecks } from './AdminOfficialDecks';
import { AdminFeaturedDecks } from './AdminFeaturedDecks';
import { AdminReports } from './AdminReports';
import { AdminAccounts } from './AdminAccounts';
import { AdminAuditLogs } from './AdminAuditLogs';
import {
  LayoutDashboard,
  Layers,
  Sparkles,
  ShieldAlert,
  Users,
  Clock,
  ArrowLeft,
  Shield,
  Loader2,
  RefreshCw,
} from 'lucide-react';

export type AdminTab =
  | 'overview'
  | 'official_decks'
  | 'featured_decks'
  | 'reports'
  | 'accounts'
  | 'audit_logs';

interface AdminLayoutProps {
  currentUser: AppUser | null;
  onBackToGame: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentUser,
  onBackToGame,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [metrics, setMetrics] = useState<AdminOverviewMetrics>({
    officialDecksCount: 0,
    communityDecksCount: 0,
    pendingReportsCount: 0,
    bannedUsersCount: 0,
  });
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 1. Verificação contínua e rigorosa de autorização no Supabase
  const checkAccess = useCallback(async () => {
    const authorized = await auth.verifyAdminStatus();
    if (!authorized) {
      setIsAuthorized(false);
      onBackToGame();
      return;
    }
    setIsAuthorized(true);
    setIsVerifying(false);
  }, [onBackToGame]);

  // 2. Carregar dados da visão geral
  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [metricsData, logsData] = await Promise.all([
        adminService.getOverviewMetrics(),
        adminService.getAuditLogs(10),
      ]);
      setMetrics(metricsData);
      setAuditLogs(logsData);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  useEffect(() => {
    if (isAuthorized) {
      loadData();
    }
  }, [isAuthorized, loadData]);

  // Se estiver verificando status
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-[#FBF8F3] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-[#B4532F] animate-spin mb-3" />
        <p className="text-xs font-bold text-[#6F655C]">Verificando credenciais...</p>
      </div>
    );
  }

  // Se não autorizado, não renderiza nada (o pai já redireciona/trata como 404)
  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#FBF8F3] flex flex-col text-[#2B2420]">
      {/* Barra Superior / Header do Painel */}
      <header className="sticky top-0 z-30 bg-[#FBF8F3]/90 backdrop-blur-md border-b border-[#E2DACD] px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Lado Esquerdo: Identidade Oficial do Painel */}
          <div className="flex items-center gap-3">
            <img
              src="/logo-horizontal.svg"
              alt="Tá na Cara!"
              className="h-7 w-auto object-contain"
            />
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#F0EAE1] text-[#786B62] border border-[#E2DACD]">
              Gestão
            </span>
          </div>

          {/* Lado Direito: Ações e Perfil do Administrador */}
          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={isRefreshing}
              title="Atualizar dados"
              className="w-8 h-8 rounded-lg border border-[#E2DACD] bg-white hover:bg-[#F6F2EA] flex items-center justify-center text-[#6F655C] hover:text-[#2B2420] transition-colors cursor-pointer"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            </button>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-white border border-[#E2DACD]">
              <Shield size={13} className="text-[#B4532F]" />
              <span className="text-xs font-bold text-[#2B2420]">{currentUser?.username || auth.getCurrentUser()?.username || 'Administrador'}</span>
              <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                Admin
              </span>
            </div>

            <button
              onClick={onBackToGame}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2DACD] bg-white hover:bg-[#F6F2EA] text-xs font-bold text-[#6F655C] hover:text-[#2B2420] transition-colors cursor-pointer"
            >
              <ArrowLeft size={13} />
              <span>Voltar ao Jogo</span>
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal com Barra Lateral e Área de Trabalho */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 flex flex-col md:flex-row gap-8">
        {/* Navegação Lateral */}
        <aside className="w-full md:w-56 shrink-0">
          <nav className="flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer shrink-0 ${
                activeTab === 'overview'
                  ? 'bg-[#2B2420] text-white shadow-2xs'
                  : 'text-[#6F655C] hover:bg-white hover:text-[#2B2420]'
              }`}
            >
              <LayoutDashboard size={15} />
              <span>Visão Geral</span>
            </button>

            <button
              onClick={() => setActiveTab('official_decks')}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer shrink-0 ${
                activeTab === 'official_decks'
                  ? 'bg-[#2B2420] text-white shadow-2xs'
                  : 'text-[#6F655C] hover:bg-white hover:text-[#2B2420]'
              }`}
            >
              <Layers size={15} />
              <span>Baralhos Oficiais</span>
            </button>

            <button
              onClick={() => setActiveTab('featured_decks')}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer shrink-0 ${
                activeTab === 'featured_decks'
                  ? 'bg-[#2B2420] text-white shadow-2xs'
                  : 'text-[#6F655C] hover:bg-white hover:text-[#2B2420]'
              }`}
            >
              <Sparkles size={15} />
              <span>Destaques da Home</span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer shrink-0 ${
                activeTab === 'reports'
                  ? 'bg-[#2B2420] text-white shadow-2xs'
                  : 'text-[#6F655C] hover:bg-white hover:text-[#2B2420]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShieldAlert size={15} />
                <span>Denúncias</span>
              </div>
              {metrics.pendingReportsCount > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    activeTab === 'reports' ? 'bg-[#B4532F] text-white' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {metrics.pendingReportsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('accounts')}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer shrink-0 ${
                activeTab === 'accounts'
                  ? 'bg-[#2B2420] text-white shadow-2xs'
                  : 'text-[#6F655C] hover:bg-white hover:text-[#2B2420]'
              }`}
            >
              <Users size={15} />
              <span>Contas e Banimentos</span>
            </button>

            <button
              onClick={() => setActiveTab('audit_logs')}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer shrink-0 ${
                activeTab === 'audit_logs'
                  ? 'bg-[#2B2420] text-white shadow-2xs'
                  : 'text-[#6F655C] hover:bg-white hover:text-[#2B2420]'
              }`}
            >
              <Clock size={15} />
              <span>Histórico de Ações</span>
            </button>
          </nav>
        </aside>

        {/* Área Central / Conteúdo da Aba */}
        <main className="flex-1 min-w-0">
          {activeTab === 'overview' && (
            <AdminOverview
              metrics={metrics}
              auditLogs={auditLogs}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'official_decks' && (
            <AdminOfficialDecks />
          )}

          {activeTab === 'featured_decks' && (
            <AdminFeaturedDecks />
          )}

          {activeTab === 'reports' && (
            <AdminReports />
          )}

          {activeTab === 'accounts' && (
            <AdminAccounts />
          )}

          {activeTab === 'audit_logs' && (
            <AdminAuditLogs />
          )}
        </main>
      </div>
    </div>
  );
};
