import React, { useState, useEffect } from 'react';
import { adminService, type ContentReportItem } from '../../services/admin';
import { Button } from '../ui/Button';
import { ShieldAlert, X, EyeOff } from 'lucide-react';
import { sounds } from '../../utils/sound';

export const AdminReports: React.FC = () => {
  const [reports, setReports] = useState<ContentReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'resolved' | 'all'>('pending');
  const [activeReport, setActiveReport] = useState<ContentReportItem | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const loadReports = async () => {
    setLoading(true);
    const data = await adminService.getReports(filter);
    setReports(data);
    setLoading(false);
  };

  useEffect(() => {
    loadReports();
  }, [filter]);

  const handleResolve = async (action: 'resolved' | 'dismissed', hideContent: boolean) => {
    if (!activeReport) return;
    sounds.playClick();
    setIsProcessing(true);

    await adminService.resolveReport(
      activeReport.id,
      action,
      adminNotes.trim() || undefined,
      hideContent,
      activeReport.content_type === 'deck' ? 'deck' : activeReport.content_type === 'face' ? 'face' : undefined,
      activeReport.content_id
    );

    setIsProcessing(false);
    setActiveReport(null);
    setAdminNotes('');
    loadReports();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Topo com Título e Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2DACD]">
        <div>
          <h2 className="font-serif text-2xl text-[#2B2420]">
            Moderação de Denúncias
          </h2>
          <p className="text-xs text-[#6F655C] mt-0.5">
            Fila de moderação de baralhos, cartas e usuários reportados pela comunidade.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-white border border-[#E2DACD] rounded-xl">
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              filter === 'pending'
                ? 'bg-[#2B2420] text-white'
                : 'text-[#6F655C] hover:text-[#2B2420]'
            }`}
          >
            Pendentes
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              filter === 'resolved'
                ? 'bg-[#2B2420] text-white'
                : 'text-[#6F655C] hover:text-[#2B2420]'
            }`}
          >
            Resolvidas
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              filter === 'all'
                ? 'bg-[#2B2420] text-white'
                : 'text-[#6F655C] hover:text-[#2B2420]'
            }`}
          >
            Todas
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-[#6F655C]">
          Carregando denúncias...
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white border border-[#E2DACD] rounded-2xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#F6F2EA] text-[#B4532F] flex items-center justify-center mx-auto">
            <ShieldAlert size={22} />
          </div>
          <h3 className="font-serif text-base text-[#2B2420]">
            Nenhuma denúncia nesta categoria
          </h3>
          <p className="text-xs text-[#6F655C] max-w-sm mx-auto">
            A comunidade está limpa e sem pendências no momento.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((rep) => {
            const isPending = rep.status === 'pending';

            return (
              <div
                key={rep.id}
                className="bg-white border border-[#E2DACD] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs hover:border-[#2B2420]/40 transition-colors"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                        isPending
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {rep.status === 'pending' ? 'Pendente' : 'Resolvida'}
                    </span>

                    <span className="text-[10px] uppercase font-bold text-[#6F655C] bg-[#F6F2EA] px-1.5 py-0.2 rounded">
                      Tipo: {rep.content_type}
                    </span>

                    <span className="text-xs text-[#6F655C]">
                      · Reportado por: <strong>{rep.reported_by || 'Jogador anônimo'}</strong>
                    </span>
                  </div>

                  <h4 className="font-serif text-sm text-[#2B2420]">
                    Alvo: <strong className="text-[#B4532F]">{rep.content_name || rep.content_id}</strong>
                    {rep.author_name && <span className="text-[#6F655C] font-normal text-xs ml-1">(Criador: {rep.author_name})</span>}
                  </h4>

                  <p className="text-xs text-[#6F655C]">
                    Motivo: <span className="text-[#2B2420]">{rep.reason || 'Sem motivo especificado'}</span>
                  </p>

                  {rep.details && (
                    <p className="text-[11px] text-[#6F655C] bg-[#FBF8F3] p-2 rounded border border-[#E2DACD]/60 mt-1 italic">
                      "{rep.details}"
                    </p>
                  )}

                  {rep.resolution_action && (
                    <p className="text-[11px] text-emerald-800 font-bold mt-1">
                      Ação: {rep.resolution_action} {rep.resolved_by ? `(por ${rep.resolved_by})` : ''}
                    </p>
                  )}
                </div>

                {isPending && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        sounds.playClick();
                        setActiveReport(rep);
                      }}
                    >
                      Analisar e Resolver
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Ação da Denúncia */}
      {activeReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2B2420]/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#FBF8F3] border border-[#E2DACD] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2DACD]">
              <h3 className="font-serif text-lg text-[#2B2420]">
                Resolver Denúncia
              </h3>
              <button
                onClick={() => setActiveReport(null)}
                className="text-xs text-[#6F655C] hover:text-[#2B2420]"
              >
                Fechar
              </button>
            </div>

            <div className="text-xs text-[#6F655C] space-y-1 bg-white p-3 rounded-xl border border-[#E2DACD]">
              <div>Alvo: <strong className="text-[#2B2420]">{activeReport.content_name || activeReport.content_id}</strong></div>
              <div>Motivo: <strong className="text-[#B4532F]">{activeReport.reason}</strong></div>
              {activeReport.details && <div>Detalhes: <em>"{activeReport.details}"</em></div>}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#6F655C] uppercase tracking-wider mb-1">
                Anotações internas do Administrador:
              </label>
              <textarea
                rows={2}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Ex: Conteúdo verificado e inapropriado..."
                className="w-full text-xs p-2.5 rounded-xl border border-[#E2DACD] bg-white outline-none focus:border-[#B4532F] resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={isProcessing}
                onClick={() => handleResolve('dismissed', false)}
              >
                <X size={12} />
                <span>Descartar Denúncia</span>
              </Button>

              <Button
                size="sm"
                variant="primary"
                disabled={isProcessing}
                onClick={() => handleResolve('resolved', true)}
              >
                <EyeOff size={12} />
                <span>Ocultar Conteúdo</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
