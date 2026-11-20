import React, { useState, useEffect, useCallback } from 'react';
import type { AppUser } from '../../services/auth';
import { auth } from '../../services/auth';
import { adminService, type AdminOverviewMetrics, type AdminAuditLog } from '../../services/admin';
import { AdminOverview } from './AdminOverview';
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
      <header className="sticky top-0 z-30 bg-[#FBF8F3]/90 backdrop-blur-md border-b border-[#E2DACD] px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Lado Esquerdo: Identidade do Painel */}
          <div className="flex items-center gap-3">
            <span className="font-serif font-black text-xl text-[#B4532F] tracking-tight">
              tá na cara!
            </span>
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#F0EAE1] text-[#786B62] border border-[#E2DACD]">
              Gestão
            </span>
          </div>

          {/* Lado Direito: Ações e Perfil do Administrador */}
          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={isRefreshing}
              title="Atualizar dados"
              className="w-9 h-9 rounded-xl border border-[#E2DACD] bg-white hover:bg-[#F6F2EA] flex items-center justify-center text-[#6F655C] hover:text-[#2B2420] transition-colors cursor-pointer"
            >
              <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
            </button>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#E2DACD]">
              <Shield size={14} className="text-[#B4532F]" />
              <span className="text-xs font-bold text-[#2B2420]">{currentUser?.username || auth.getCurrentUser()?.username || 'Administrador'}</span>
              <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                Admin
              </span>
            </div>

            <button
              onClick={onBackToGame}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E2DACD] bg-white hover:bg-[#F6F2EA] text-xs font-bold text-[#6F655C] hover:text-[#2B2420] transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Voltar ao Jogo</span>
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal com Barra Lateral e Área de Trabalho */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 flex flex-col md:flex-row gap-8">
        {/* Navegação Lateral */}
        <aside className="w-full md:w-60 shrink-0">
          <nav className="flex md:flex-col gap-1.5 overflow-x-auto pb-2 md:pb-0">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer shrink-0 ${
                activeTab === 'overview'
                  ? 'bg-[#2B2420] text-white shadow-xs'
                  : 'text-[#6F655C] hover:bg-white hover:text-[#2B2420]'
              }`}
            >
              <LayoutDashboard size={16} />
              <span>Visão Geral</span>
            </button>

            <button
              onClick={() => setActiveTab('official_decks')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer shrink-0 ${
                activeTab === 'official_decks'
                  ? 'bg-[#2B2420] text-white shadow-xs'
                  : 'text-[#6F655C] hover:bg-white hover:text-[#2B2420]'
              }`}
            >
              <Layers size={16} />
              <span>Baralhos Oficiais</span>
            </button>

            <button
              onClick={() => setActiveTab('featured_decks')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer shrink-0 ${
                activeTab === 'featured_decks'
                  ? 'bg-[#2B2420] text-white shadow-xs'
                  : 'text-[#6F655C] hover:bg-white hover:text-[#2B2420]'
              }`}
            >
              <Sparkles size={16} />
              <span>Destaques da Home</span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer shrink-0 ${
                activeTab === 'reports'
                  ? 'bg-[#2B2420] text-white shadow-xs'
                  : 'text-[#6F655C] hover:bg-white hover:text-[#2B2420]'
              }`}
            >
              <div className="flex items-center gap-3">
                <ShieldAlert size={16} />
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
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer shrink-0 ${
                activeTab === 'accounts'
                  ? 'bg-[#2B2420] text-white shadow-xs'
                  : 'text-[#6F655C] hover:bg-white hover:text-[#2B2420]'
              }`}
            >
              <Users size={16} />
              <span>Contas e Banimentos</span>
            </button>

            <button
              onClick={() => setActiveTab('audit_logs')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer shrink-0 ${
                activeTab === 'audit_logs'
                  ? 'bg-[#2B2420] text-white shadow-xs'
                  : 'text-[#6F655C] hover:bg-white hover:text-[#2B2420]'
              }`}
            >
              <Clock size={16} />
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
            <div className="bg-white border border-[#E2DACD] rounded-2xl p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#F6F2EA] text-[#B4532F] flex items-center justify-center mx-auto">
                <Layers size={24} />
              </div>
              <h3 className="text-lg font-serif font-bold text-[#2B2420]">
                Módulo de Baralhos Oficiais
              </h3>
              <p className="text-xs text-[#6F655C] max-w-md mx-auto">
                Este módulo será ativado na <strong>Etapa 2</strong> com criação, edição, rascunhos, validação de 15 a 90 cartas e publicação sob a autoria "Tá na Cara!".
              </p>
            </div>
          )}

          {activeTab === 'featured_decks' && (
            <div className="bg-white border border-[#E2DACD] rounded-2xl p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#F6F2EA] text-[#B4532F] flex items-center justify-center mx-auto">
                <Sparkles size={24} />
              </div>
              <h3 className="text-lg font-serif font-bold text-[#2B2420]">
                Destaques da Tela Principal
              </h3>
              <p className="text-xs text-[#6F655C] max-w-md mx-auto">
                Este módulo será ativado na <strong>Etapa 3</strong> para curadoria e reordenação dos baralhos exibidos na home do jogo.
              </p>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="bg-white border border-[#E2DACD] rounded-2xl p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#F6F2EA] text-[#B4532F] flex items-center justify-center mx-auto">
                <ShieldAlert size={24} />
              </div>
              <h3 className="text-lg font-serif font-bold text-[#2B2420]">
                Fila de Moderação e Denúncias
              </h3>
              <p className="text-xs text-[#6F655C] max-w-md mx-auto">
                Este módulo será ativado na <strong>Etapa 4</strong> com abas (Abertas, Resolvidas, Descartadas) e ações de ocultação de conteúdo e banimento.
              </p>
            </div>
          )}

          {activeTab === 'accounts' && (
            <div className="bg-white border border-[#E2DACD] rounded-2xl p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#F6F2EA] text-[#B4532F] flex items-center justify-center mx-auto">
                <Users size={24} />
              </div>
              <h3 className="text-lg font-serif font-bold text-[#2B2420]">
                Gestão de Contas e Banimentos
              </h3>
              <p className="text-xs text-[#6F655C] max-w-md mx-auto">
                Este módulo será ativado na <strong>Etapa 5</strong> com busca por usuário, suspensões temporárias ou permanentes e desconexão imediata.
              </p>
            </div>
          )}

          {activeTab === 'audit_logs' && (
            <div className="bg-white border border-[#E2DACD] rounded-2xl p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#F6F2EA] text-[#B4532F] flex items-center justify-center mx-auto">
                <Clock size={24} />
              </div>
              <h3 className="text-lg font-serif font-bold text-[#2B2420]">
                Histórico de Ações
              </h3>
              <p className="text-xs text-[#6F655C] max-w-md mx-auto">
                Este módulo será ativado na <strong>Etapa 5</strong> exibindo a linha do tempo completa de auditoria de cada administrador.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
