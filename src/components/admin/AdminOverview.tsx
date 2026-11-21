import React from 'react';
import type { AdminOverviewMetrics, AdminAuditLog } from '../../services/admin';

interface AdminOverviewProps {
  metrics: AdminOverviewMetrics;
  auditLogs: AdminAuditLog[];
  onNavigateTab: (tab: 'overview' | 'official_decks' | 'official_faces' | 'featured_decks' | 'reports' | 'accounts' | 'audit_logs') => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({
  metrics,
  auditLogs,
  onNavigateTab,
}) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Cabeçalho da Visão Geral */}
      <div className="pb-4 border-b border-[#E2DACD]">
        <h2 className="text-2xl font-serif text-[#2B2420]">
          Painel de Gestão do Jogo
        </h2>
        <p className="text-xs text-[#6F655C] mt-1">
          Acompanhamento central de baralhos do Tá na Cara!, curadoria da Home, moderação e integridade da comunidade.
        </p>
      </div>

      {/* Grid de Métricas Principais (Sem Ícones Genéricos de IA) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Baralhos Tá na Cara! */}
        <div
          onClick={() => onNavigateTab('official_decks')}
          className="bg-white border border-[#E2DACD] rounded-xl p-4 hover:border-[#2B2420] transition-colors cursor-pointer shadow-2xs"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6F655C] block mb-2">
            Baralhos Tá na Cara!
          </span>
          <div className="text-3xl font-serif text-[#2B2420]">
            {metrics.officialDecksCount}
          </div>
          <span className="text-xs text-[#B4532F] font-medium mt-2 inline-block hover:underline">
            Gerenciar acervo →
          </span>
        </div>

        {/* Card 2: Banco de Caras (Legado) */}
        <div
          onClick={() => onNavigateTab('official_faces')}
          className="bg-white border border-[#E2DACD] rounded-xl p-4 hover:border-[#2B2420] transition-colors cursor-pointer shadow-2xs"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6F655C] block mb-2">
            Caras (Legado)
          </span>
          <div className="text-3xl font-serif text-[#2B2420]">
            {metrics.officialFacesCount}
          </div>
          <span className="text-xs text-[#B4532F] font-medium mt-2 inline-block hover:underline">
            Ver fotos legadas →
          </span>
        </div>

        {/* Card 3: Destaques da Home */}
        <div
          onClick={() => onNavigateTab('featured_decks')}
          className="bg-white border border-[#E2DACD] rounded-xl p-4 hover:border-[#2B2420] transition-colors cursor-pointer shadow-2xs"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6F655C] block mb-2">
            Destaques Home
          </span>
          <div className="text-3xl font-serif text-[#2B2420]">
            {metrics.officialDecksCount > 0 ? 'Ativo' : '0'}
          </div>
          <span className="text-xs text-[#B4532F] font-medium mt-2 inline-block hover:underline">
            Organizar ordem →
          </span>
        </div>

        {/* Card 4: Denúncias Abertas */}
        <div
          onClick={() => onNavigateTab('reports')}
          className="bg-white border border-[#E2DACD] rounded-xl p-4 hover:border-[#2B2420] transition-colors cursor-pointer shadow-2xs"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6F655C] block mb-2">
            Denúncias
          </span>
          <div className={`text-3xl font-serif ${metrics.pendingReportsCount > 0 ? 'text-[#B4532F]' : 'text-[#2B2420]'}`}>
            {metrics.pendingReportsCount}
          </div>
          <span className="text-xs text-[#6F655C] font-medium mt-2 inline-block">
            {metrics.pendingReportsCount === 0 ? 'Tudo em dia' : 'Requer moderação →'}
          </span>
        </div>

        {/* Card 5: Contas Suspensas */}
        <div
          onClick={() => onNavigateTab('accounts')}
          className="bg-white border border-[#E2DACD] rounded-xl p-4 hover:border-[#2B2420] transition-colors cursor-pointer shadow-2xs col-span-2 sm:col-span-1"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6F655C] block mb-2">
            Contas Suspensas
          </span>
          <div className="text-3xl font-serif text-[#2B2420]">
            {metrics.bannedUsersCount}
          </div>
          <span className="text-xs text-[#6F655C] font-medium mt-2 inline-block">
            Gerenciar acessos →
          </span>
        </div>
      </div>

      {/* Seção Operacional: Ações Rápidas & Auditoria Recente */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ações Rápidas de Gestão */}
        <div className="lg:col-span-1 bg-white border border-[#E2DACD] rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="font-serif text-base text-[#2B2420] mb-3">
              Ações Rápidas
            </h3>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => onNavigateTab('official_decks')}
                className="w-full p-3 rounded-lg border border-[#E2DACD] bg-[#FBF8F3] hover:bg-white hover:border-[#2B2420] transition-colors text-left flex items-center justify-between cursor-pointer"
              >
                <div>
                  <span className="text-xs font-bold text-[#2B2420] block">
                    Criar Baralho Tá na Cara!
                  </span>
                  <span className="text-[11px] text-[#6F655C]">
                    Montar coleção de 15 a 90 cartas
                  </span>
                </div>
                <span className="text-xs text-[#B4532F] font-bold">→</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('official_faces')}
                className="w-full p-3 rounded-lg border border-[#E2DACD] bg-[#FBF8F3] hover:bg-white hover:border-[#2B2420] transition-colors text-left flex items-center justify-between cursor-pointer"
              >
                <div>
                  <span className="text-xs font-bold text-[#2B2420] block">
                    Banco de Caras (Legado)
                  </span>
                  <span className="text-[11px] text-[#6F655C]">
                    Consultar acervo histórico descontinuado
                  </span>
                </div>
                <span className="text-xs text-[#B4532F] font-bold">→</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('featured_decks')}
                className="w-full p-3 rounded-lg border border-[#E2DACD] bg-[#FBF8F3] hover:bg-white hover:border-[#2B2420] transition-colors text-left flex items-center justify-between cursor-pointer"
              >
                <div>
                  <span className="text-xs font-bold text-[#2B2420] block">
                    Organizar Destaques da Home
                  </span>
                  <span className="text-[11px] text-[#6F655C]">
                    Definir ordem dos baralhos em destaque
                  </span>
                </div>
                <span className="text-xs text-[#B4532F] font-bold">→</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('reports')}
                className="w-full p-3 rounded-lg border border-[#E2DACD] bg-[#FBF8F3] hover:bg-white hover:border-[#2B2420] transition-colors text-left flex items-center justify-between cursor-pointer"
              >
                <div>
                  <span className="text-xs font-bold text-[#2B2420] block">
                    Fila de Denúncias
                  </span>
                  <span className="text-[11px] text-[#6F655C]">
                    Revisar denúncias de jogadores
                  </span>
                </div>
                <span className="text-xs text-[#B4532F] font-bold">→</span>
              </button>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#E2DACD]/60 text-[11px] text-[#6F655C] space-y-1">
            <p>• Baralhos têm autoria padronizada como <strong>Tá na Cara!</strong>.</p>
            <p>• Destaques da Home exibem baralhos selecionados em tempo real.</p>
          </div>
        </div>

        {/* Registro Recente de Auditoria */}
        <div className="lg:col-span-2 bg-white border border-[#E2DACD] rounded-xl p-5 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-base text-[#2B2420]">
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
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#FBF8F3] rounded-lg border border-dashed border-[#E2DACD]">
              <p className="text-xs font-bold text-[#2B2420] mb-1">
                Nenhuma ação recente registrada
              </p>
              <p className="text-xs text-[#6F655C] max-w-sm">
                Todas as alterações em baralhos, destaques da Home, denúncias e banimentos são registradas automaticamente.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {auditLogs.slice(0, 6).map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-lg bg-[#FBF8F3] border border-[#E2DACD] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-bold text-[#2B2420] truncate">
                      {log.action}
                    </span>
                    {log.target_name && (
                      <span className="text-[#B4532F] font-serif truncate">
                        "{log.target_name}"
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-[#6F655C] shrink-0 font-mono">
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
