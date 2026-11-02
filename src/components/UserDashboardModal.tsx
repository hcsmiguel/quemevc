import { useState, useEffect, type FC } from 'react';
import { auth, type AppUser, type UserStats, type SavedDeck } from '../services/auth';
import { Trophy, Swords, X, Layers, Trash2 } from 'lucide-react';
import { sounds } from '../utils/sound';

interface UserDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser;
  onSelectSavedDeck?: (deck: SavedDeck) => void;
}

export const UserDashboardModal: FC<UserDashboardModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectSavedDeck,
}) => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'decks'>('stats');

  useEffect(() => {
    if (!isOpen) return;
    const loadData = async () => {
      setLoading(true);
      const [s, d] = await Promise.all([
        auth.getUserStats(currentUser.id),
        auth.getUserSavedDecks(currentUser.id),
      ]);
      setStats(s);
      setSavedDecks(d);
      setLoading(false);
    };
    loadData();
  }, [isOpen, currentUser.id]);

  if (!isOpen) return null;

  const handleDeleteDeck = async (deckId: string) => {
    sounds.playClick();
    await auth.deleteSavedDeck(deckId, currentUser.id);
    setSavedDecks((prev) => prev.filter((d) => d.id !== deckId));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-indigo-500/70 rounded-3xl max-w-lg w-full p-6 shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
        {/* Header com Avatar do Google/Discord */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            {currentUser.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.username}
                className="w-12 h-12 rounded-2xl object-cover ring-2 ring-indigo-500 shadow-md"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md">
                {currentUser.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">{currentUser.username}</h3>
                {currentUser.provider && currentUser.provider !== 'email' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-indigo-300 uppercase">
                    {currentUser.provider}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">Perfil e Estatísticas de Jogo</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800">
            <X size={18} />
          </button>
        </div>

        {/* Abas Estatísticas / Meus Baralhos */}
        <div className="flex bg-slate-950 p-1 rounded-xl mb-4 border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'stats' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy size={14} />
            Estatísticas & Oponentes
          </button>
          <button
            onClick={() => setActiveTab('decks')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'decks' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers size={14} />
            Meus Baralhos ({savedDecks.length})
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
            Carregando seus dados...
          </div>
        ) : activeTab === 'stats' ? (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Cards de Resumo */}
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Partidas</span>
                <span className="text-lg font-black text-white">{stats?.totalMatches || 0}</span>
              </div>
              <div className="bg-slate-950/80 p-3 rounded-2xl border border-emerald-900/60 text-center">
                <span className="text-[10px] text-emerald-400 font-bold block mb-0.5">Vitórias</span>
                <span className="text-lg font-black text-emerald-400">{stats?.wins || 0}</span>
              </div>
              <div className="bg-slate-950/80 p-3 rounded-2xl border border-red-900/60 text-center">
                <span className="text-[10px] text-red-400 font-bold block mb-0.5">Derrotas</span>
                <span className="text-lg font-black text-red-400">{stats?.losses || 0}</span>
              </div>
              <div className="bg-slate-950/80 p-3 rounded-2xl border border-amber-900/60 text-center">
                <span className="text-[10px] text-amber-400 font-bold block mb-0.5">Winrate</span>
                <span className="text-lg font-black text-amber-400">{stats?.winRate || 0}%</span>
              </div>
            </div>

            {/* Últimos 5 Oponentes (Ponto 2.a) */}
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-300 uppercase tracking-wider mb-3">
                <Swords size={15} className="text-indigo-400" />
                <span>Últimos 5 Oponentes</span>
              </div>

              {stats?.lastMatches.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500 italic">
                  Você ainda não jogou nenhuma partida registrada. Jogue uma rodada para ver seu histórico aqui!
                </div>
              ) : (
                <div className="space-y-2">
                  {stats?.lastMatches.map((m, idx) => (
                    <div
                      key={m.id || idx}
                      className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-extrabold text-white flex items-center gap-1.5">
                          <span>vs</span>
                          <span className="text-amber-300">{m.opponent_name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {m.deck_mode === 'custom' ? `Personalizado (${m.card_count} cartas)` : 'Padrão (15 cartas)'}
                        </span>
                      </div>

                      <div className="text-right">
                        <span
                          className={`font-black text-[11px] px-2.5 py-1 rounded-lg uppercase tracking-wider shadow ${
                            m.result === 'win'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-red-950 text-red-400 border border-red-800'
                          }`}
                        >
                          {m.result === 'win' ? 'Vitória' : 'Derrota'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Aba Meus Baralhos Salvos (Ponto 2.b) */
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {savedDecks.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-500 italic">
                Nenhum baralho salvo ainda. Crie um baralho no modo personalizado e clique em "Salvar no meu perfil" para usá-lo sempre que quiser!
              </div>
            ) : (
              savedDecks.map((d) => (
                <div
                  key={d.id}
                  className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between hover:border-indigo-500 transition-all"
                >
                  <div>
                    <h4 className="font-black text-sm text-white">{d.name}</h4>
                    <span className="text-xs text-amber-400 font-bold block mt-0.5">
                      {d.card_count} Caras Personalizadas
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {onSelectSavedDeck && (
                      <button
                        onClick={() => {
                          onSelectSavedDeck(d);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition-all active:scale-95"
                      >
                        Jogar com este
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteDeck(d.id)}
                      className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-400 border border-red-800 transition-colors"
                      title="Excluir baralho"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
