import React, { useState, useEffect } from 'react';
import { adminService, type AdminAuditLog } from '../../services/admin';

export const AdminAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getAuditLogs(50).then((data) => {
      setLogs(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="pb-4 border-b border-[#E2DACD]">
        <h2 className="font-serif text-2xl text-[#2B2420]">
          Histórico de Ações (Auditoria)
        </h2>
        <p className="text-xs text-[#6F655C] mt-0.5">
          Registro cronológico de todas as modificações administrativas em baralhos, destaques, denúncias e contas.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-[#6F655C]">
          Carregando histórico...
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white border border-[#E2DACD] rounded-2xl p-10 text-center space-y-3">
          <h3 className="font-serif text-base text-[#2B2420]">
            Nenhuma ação registrada ainda
          </h3>
          <p className="text-xs text-[#6F655C]">
            As próximas ações administrativas aparecerão automaticamente aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div
              key={log.id}
              className="bg-white border border-[#E2DACD] rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-2xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#2B2420]">{log.action}</span>
                  <span className="text-[10px] uppercase font-bold text-[#6F655C] bg-[#F6F2EA] px-1.5 py-0.2 rounded">
                    {log.target_type}
                  </span>
                  {log.target_name && (
                    <span className="text-xs text-[#B4532F] font-bold">
                      "{log.target_name}"
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#6F655C] mt-0.5">
                  Por: <strong className="text-[#2B2420]">{log.admin_name}</strong>
                </p>
              </div>

              <div className="text-[11px] text-[#A39A90] font-mono shrink-0">
                {new Date(log.created_at).toLocaleString('pt-BR')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
