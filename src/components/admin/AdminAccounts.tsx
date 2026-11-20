import React, { useState, useEffect } from 'react';
import { adminService, type AdminUserItem } from '../../services/admin';
import { Button } from '../ui/Button';
import { Users, Ban, CheckCircle2 } from 'lucide-react';
import { sounds } from '../../utils/sound';

export const AdminAccounts: React.FC = () => {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
  const [banReason, setBanReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    const data = await adminService.getUsers(search);
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, [search]);

  const handleToggleBan = async (user: AdminUserItem, shouldBan: boolean) => {
    sounds.playClick();
    setIsProcessing(true);

    await adminService.setUserBanStatus(
      user.id,
      shouldBan,
      shouldBan ? banReason || 'Violação das regras do jogo' : undefined,
      user.username
    );

    setIsProcessing(false);
    setSelectedUser(null);
    setBanReason('');
    loadUsers();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Topo com Título e Busca */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2DACD]">
        <div>
          <h2 className="font-serif text-2xl text-[#2B2420]">
            Contas e Banimentos
          </h2>
          <p className="text-xs text-[#6F655C] mt-0.5">
            Gerenciamento de contas de jogadores, visualização de permissões e aplicação de suspensões.
          </p>
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Buscar por usuário ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs p-2.5 rounded-xl border border-[#E2DACD] bg-white outline-none focus:border-[#B4532F]"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-[#6F655C]">
          Carregando contas...
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white border border-[#E2DACD] rounded-2xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#F6F2EA] text-[#B4532F] flex items-center justify-center mx-auto">
            <Users size={22} />
          </div>
          <h3 className="font-serif text-base text-[#2B2420]">
            Nenhum usuário encontrado
          </h3>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => {
            return (
              <div
                key={u.id}
                className="bg-white border border-[#E2DACD] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-[#2B2420]/40 transition-colors"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-serif text-sm text-[#2B2420] truncate">
                      {u.username}
                    </h4>

                    {u.is_admin && (
                      <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                        Admin
                      </span>
                    )}

                    {u.is_banned && (
                      <span className="text-[10px] font-bold uppercase text-rose-800 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded">
                        Suspenso
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#6F655C] truncate">
                    {u.email || 'Sem e-mail informado'} · ID: <span className="font-mono text-[10px]">{u.id.slice(0, 8)}...</span>
                  </p>

                  {u.ban_reason && (
                    <p className="text-[11px] text-rose-700 italic">
                      Motivo da suspensão: "{u.ban_reason}"
                    </p>
                  )}
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {!u.is_admin && (
                    u.is_banned ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleToggleBan(u, false)}
                      >
                        <CheckCircle2 size={12} className="text-emerald-600" />
                        <span>Remover Suspensão</span>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          sounds.playClick();
                          setSelectedUser(u);
                        }}
                      >
                        <Ban size={12} />
                        <span>Suspender Conta</span>
                      </Button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Confirmação de Suspensão */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2B2420]/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#FBF8F3] border border-[#E2DACD] rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center mx-auto">
              <Ban size={20} />
            </div>

            <div className="text-center">
              <h3 className="font-serif text-lg text-[#2B2420]">
                Suspender {selectedUser.username}?
              </h3>
              <p className="text-xs text-[#6F655C] mt-1">
                A conta ficará impedida de acessar o jogo e publicar na comunidade.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#6F655C] uppercase tracking-wider mb-1">
                Motivo da Suspensão:
              </label>
              <textarea
                rows={2}
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Ex: Conteúdo impróprio recorrente..."
                className="w-full text-xs p-2.5 rounded-xl border border-[#E2DACD] bg-white outline-none focus:border-[#B4532F] resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setSelectedUser(null)}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={isProcessing}
                onClick={() => handleToggleBan(selectedUser, true)}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
