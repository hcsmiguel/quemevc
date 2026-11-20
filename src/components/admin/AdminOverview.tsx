import React from 'react';
import type { AdminOverviewMetrics, AdminAuditLog } from '../../services/admin';
import { Layers, ShieldAlert, Ban, Clock, ArrowRight, Plus, Sparkles } from 'lucide-react';

interface AdminOverviewProps {
  metrics: AdminOverviewMetrics;
  auditLogs: AdminAuditLog[];
  onNavigateTab: (tab: 'overview' | 'official_decks' | 'featured_decks' | 'reports' | 'accounts' | 'audit_logs') => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({
  metrics,
  auditLogs,
  onNavigateTab,
}) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Cabeçalho da Visão Geral */}
      <div>
        <h2 className="text-2xl font-serif text-[#2B2420]">
          Painel de Gestão do Jogo
        </h2>
        <p className="text-xs text-[#6F655C] mt-1">
          Acompanhamento central de baralhos oficiais, curadoria da Home, moderação e integridade da comunidade.
        </p>
      </div>

      {/* Grid de Métricas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Baralhos Oficiais */}
        <div
          onClick={() => onNavigateTab('official_decks')}
          className="bg-white border border-[#E2DACD] rounded-2xl p-5 hover:border-[#B4532F]/50 transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6F655C]">
              Baralhos Oficiais
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#F6F2EA] flex items-center justify-center text-[#B4532F] group-hover:bg-[#B4532F] group-hover:text-white transition-colors">
              <Layers size={16} />
            </div>
          </div>
          <div className="text-3xl font-serif text-[#2B2420]">
            {metrics.officialDecksCount}
          </div>
          <p className="text-xs text-[#6F655C] mt-1 flex items-center gap-1 group-hover:text-[#B4532F] transition-colors">
            Gerenciar acervo <ArrowRight size={12} />
          </p>
        </div>

        {/* Card 2: Destaques & Comunidade */}
        <div
          onClick={() => onNavigateTab('featured_decks')}
          className="bg-white border border-[#E2DACD] rounded-2xl p-5 hover:border-[#B4532F]/50 transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6F655C]">
              Destaques da Home
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#F6F2EA] flex items-center justify-center text-[#B4532F] group-hover:bg-[#B4532F] group-hover:text-white transition-colors">
              <Sparkles size={16} />
            </div>
          </div>
          <div className="text-3xl font-serif text-[#2B2420]">
            {metrics.communityDecksCount}
          </div>
          <p className="text-xs text-[#6F655C] mt-1 flex items-center gap-1 group-hover:text-[#B4532F] transition-colors">
            Organizar destaques <ArrowRight size={12} />
          </p>
        </div>

        {/* Card 3: Denúncias Pendentes */}
        <div
          onClick={() => onNavigateTab('reports')}
          className="bg-white border border-[#E2DACD] rounded-2xl p-5 hover:border-[#B4532F]/50 transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6F655C]">
              Denúncias Abertas
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                metrics.pendingReportsCount > 0
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-[#F6F2EA] text-[#6F655C]'
              }`}
            >
              <ShieldAlert size={16} />
            </div>
          </div>
          <div className="text-3xl font-serif text-[#2B2420]">
            {metrics.pendingReportsCount}
          </div>
          <p className="text-xs text-[#6F655C] mt-1 flex items-center gap-1 group-hover:text-[#B4532F] transition-colors">
            {metrics.pendingReportsCount === 0 ? 'Tudo em dia' : 'Requer moderação'} <ArrowRight size={12} />
          </p>
        </div>

        {/* Card 4: Contas Suspensas */}
        <div
          onClick={() => onNavigateTab('accounts')}
          className="bg-white border border-[#E2DACD] rounded-2xl p-5 hover:border-[#B4532F]/50 transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6F655C]">
              Contas Suspensas
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#F6F2EA] flex items-center justify-center text-[#6F655C] group-hover:bg-[#B4532F] group-hover:text-white transition-colors">
              <Ban size={16} />
            </div>
          </div>
          <div className="text-3xl font-serif text-[#2B2420]">
            {metrics.bannedUsersCount}
          </div>
          <p className="text-xs text-[#6F655C] mt-1 flex items-center gap-1 group-hover:text-[#B4532F] transition-colors">
            Gerenciar acessos <ArrowRight size={12} />
          </p>
        </div>
      </div>

      {/* Seção Operacional: Ações Rápidas & Auditoria Recente */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ações Rápidas de Gestão */}
        <div className="lg:col-span-1 bg-white border border-[#E2DACD] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-serif text-base text-[#2B2420] mb-3">
              Ações Rápidas
            </h3>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => onNavigateTab('official_decks')}
                className="w-full p-3 rounded-xl border border-[#E2DACD] bg-[#FBF8F3] hover:bg-white hover:border-[#2B2420] transition-colors text-left flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white border border-[#E2DACD] flex items-center justify-center text-[#B4532F]">
                    <Plus size={14} />
                  </div>
                  <span className="text-xs font-bold text-[#2B2420]">
                    Criar Baralho Oficial
                  </span>
                </div>
                <ArrowRight size={13} className="text-[#6F655C] group-hover:text-[#B4532F] transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('featured_decks')}
                className="w-full p-3 rounded-xl border border-[#E2DACD] bg-[#FBF8F3] hover:bg-white hover:border-[#2B2420] transition-colors text-left flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white border border-[#E2DACD] flex items-center justify-center text-[#B4532F]">
                    <Sparkles size={14} />
                  </div>
                  <span className="text-xs font-bold text-[#2B2420]">
                    Organizar Destaques da Home
                  </span>
                </div>
                <ArrowRight size={13} className="text-[#6F655C] group-hover:text-[#B4532F] transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('reports')}
                className="w-full p-3 rounded-xl border border-[#E2DACD] bg-[#FBF8F3] hover:bg-white hover:border-[#2B2420] transition-colors text-left flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white border border-[#E2DACD] flex items-center justify-center text-[#B4532F]">
                    <ShieldAlert size={14} />
                  </div>
                  <span className="text-xs font-bold text-[#2B2420]">
                    Fila de Denúncias
                  </span>
                </div>
                <ArrowRight size={13} className="text-[#6F655C] group-hover:text-[#B4532F] transition-colors" />
              </button>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#E2DACD]/60 text-[11px] text-[#6F655C] space-y-1">
            <p>• Baralhos Oficiais pertencem sempre a <strong>Tá na Cara!</strong>.</p>
            <p>• Destaques da Home atualizam em tempo real para todos os jogadores.</p>
          </div>
        </div>

        {/* Registro Recente de Auditoria */}
        <div className="lg:col-span-2 bg-white border border-[#E2DACD] rounded-2xl p-6 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-base text-[#2B2420] flex items-center gap-2">
              <Clock size={16} className="text-[#6F655C]" />
              Últimas Ações de Gestão
            </h3>
            {auditLogs.length > 0 && (
              <button
                onClick={() => onNavigateTab('audit_logs')}
                className="text-xs text-[#B4532F] font-bold hover:underline cursor-pointer"
              >
                Ver histórico completo
              </button>
            )}
          </div>

          {auditLogs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#FBF8F3] rounded-xl border border-dashed border-[#E2DACD]">
              <p className="text-xs font-bold text-[#2B2420] mb-1">
                Nenhuma ação recente registrada
              </p>
              <p className="text-xs text-[#6F655C] max-w-sm">
                Todas as alterações em baralhos oficiais, destaques, denúncias e banimentos são registradas e auditadas aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {auditLogs.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-[#FBF8F3] border border-[#E2DACD] flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-[#B4532F]">
                      {log.action}
                    </span>
                    <span className="text-xs text-[#2B2420]">
                      {log.target_name || log.target_id}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-[#6F655C]">
                    <span>por {log.admin_name}</span>
                    <span>{new Date(log.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
