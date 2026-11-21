import React, { useState, useEffect, useCallback } from 'react';
import type { AppUser } from '../../services/auth';
import { auth } from '../../services/auth';
import { adminService, type AdminOverviewMetrics, type AdminAuditLog } from '../../services/admin';
import { AdminOverview } from './AdminOverview';
import { AdminOfficialDecks } from './AdminOfficialDecks';
import { AdminOfficialFaces } from './AdminOfficialFaces';
import { AdminFeaturedDecks } from './AdminFeaturedDecks';
import { AdminReports } from './AdminReports';
import { AdminAccounts } from './AdminAccounts';
import { AdminAuditLogs } from './AdminAuditLogs';

export type AdminTab =
  | 'overview'
  | 'official_decks'
  | 'official_faces'
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
  const [isVerifying, setIsVerifying] = useState(!currentUser?.is_admin);
  const [isAuthorized, setIsAuthorized] = useState(Boolean(currentUser?.is_admin));
  const [metrics, setMetrics] = useState<AdminOverviewMetrics>({
    officialDecksCount: 0,
    officialFacesCount: 0,
    communityDecksCount: 0,
    pendingReportsCount: 0,
    bannedUsersCount: 0,
  });
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Verificação contínua de autorização no Supabase
  const checkAccess = useCallback(async () => {
    // Se o usuário atual já é admin confirmado em memória ou no perfil da sessão, manter o acesso
    if (currentUser?.is_admin) {
      setIsAuthorized(true);
      setIsVerifying(false);
      return;
    }

    const authorized = await auth.verifyAdminStatus();
    if (!authorized) {
      setIsAuthorized(false);
      setIsVerifying(false);
      onBackToGame();
      return;
    }
    setIsAuthorized(true);
    setIsVerifying(false);
  }, [currentUser, onBackToGame]);

  // Carregar dados da visão geral
  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [metricsData, logsData] = await Promise.all([
        adminService.getOverviewMetrics(),
        adminService.getAuditLogs(10),
      ]);
      setMetrics(metricsData);
      setAuditLogs(logsData);
    } catch (err) {
      console.warn('Falha ao carregar métricas ou logs administrativos:', err);
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

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-[#FBF8F3] flex flex-col items-center justify-center p-4">
        <p className="text-xs font-bold text-[#6F655C]">Verificando credenciais...</p>
      </div>
    );
  }

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
              className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-[#E2DACD] bg-white hover:bg-[#F6F2EA] text-[#6F655C] hover:text-[#2B2420] transition-colors cursor-pointer"
            >
              {isRefreshing ? 'Atualizando...' : 'Atualizar'}
            </button>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-white border border-[#E2DACD]">
              <span className="text-xs font-bold text-[#2B2420]">
                {currentUser?.username || auth.getCurrentUser()?.username || 'Administrador'}
              </span>
              <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded">
                Admin
              </span>
            </div>

            <button
              onClick={onBackToGame}
              className="px-3 py-1.5 rounded-lg border border-[#E2DACD] bg-white hover:bg-[#F6F2EA] text-xs font-bold text-[#6F655C] hover:text-[#2B2420] transition-colors cursor-pointer"
            >
              Voltar ao Jogo
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal com Barra Lateral e Área de Trabalho */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 flex flex-col md:flex-row gap-8">
        {/* Navegação Lateral (Design Limpo e Editorial, Sem Ícones Genéricos de IA) */}
        <aside className="w-full md:w-52 shrink-0">
          <nav className="flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all text-left cursor-pointer shrink-0 ${
                activeTab === 'overview'
                  ? 'bg-[#2B2420] text-white shadow-2xs'
                  : 'text-[#6F655C] hover:bg-white hover:text-[#2B2420]'
              }`}
            >
              Visão Geral
            </button>

            <button
              onClick={() => setActiveTab('official_decks')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all text-left cursor-pointer shrink-0 ${
                activeTab === 'official_decks'
                  ? 'bg-[#2B2420] text-white shadow-2xs'
                  : 'text-[#6F655C] hover:bg-white hover:text-[#2B2420]'
              }`}
            >
              Baralhos Oficiais
            </button>

            <button
              onClick={() => setActiveTab('official_faces')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all text-left cursor-pointer shrink-0 ${
                activeTab === 'official_faces'
                  ? 'bg-[#2B2420] text-white shadow-2xs'
                  : 'text-[#6F655C] hover:bg-white hover:text-[#2B2420]'
              }`}
            >
              Caras Oficiais
            </button>

            <button
              onClick={() => setActiveTab('featured_decks')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all text-left cursor-pointer shrink-0 ${
                activeTab === 'featured_decks'
                  ? 'bg-[#2B2420] text-white shadow-2xs'
                  : 'text-[#6F655C] hover:bg-white hover:text-[#2B2420]'
              }`}
            >
              Destaques da Home
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all text-left cursor-pointer shrink-0 ${
                activeTab === 'reports'
                  ? 'bg-[#2B2420] text-white shadow-2xs'
                  : 'text-[#6F655C] hover:bg-white hover:text-[#2B2420]'
              }`}
            >
              <span>Denúncias</span>
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
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all text-left cursor-pointer shrink-0 ${
                activeTab === 'accounts'
                  ? 'bg-[#2B2420] text-white shadow-2xs'
                  : 'text-[#6F655C] hover:bg-white hover:text-[#2B2420]'
              }`}
            >
              Contas e Banimentos
            </button>

            <button
              onClick={() => setActiveTab('audit_logs')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all text-left cursor-pointer shrink-0 ${
                activeTab === 'audit_logs'
                  ? 'bg-[#2B2420] text-white shadow-2xs'
                  : 'text-[#6F655C] hover:bg-white hover:text-[#2B2420]'
              }`}
            >
              Histórico de Ações
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

          {activeTab === 'official_faces' && (
            <AdminOfficialFaces />
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
