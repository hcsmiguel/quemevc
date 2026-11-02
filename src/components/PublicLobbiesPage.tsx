import { useState, useEffect, type FC } from 'react';
import { network, type RoomRecord } from '../services/network';
import {
  Users,
  ArrowLeft,
  RefreshCw,
  Play,
  Gamepad2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { sounds } from '../utils/sound';

interface PublicLobbiesPageProps {
  onBackToLobby: () => void;
  onJoinLobby: (roomCode: string) => void;
  onCreateRoomDirectly: () => void;
}

export const PublicLobbiesPage: FC<PublicLobbiesPageProps> = ({
  onBackToLobby,
  onJoinLobby,
  onCreateRoomDirectly,
}) => {
  const [lobbies, setLobbies] = useState<RoomRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLobbies = async () => {
    try {
      const publicRooms = await network.getPublicLobbies();
      setLobbies(publicRooms);
    } catch (err) {
      console.warn('Erro ao buscar lobbies públicos:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLobbies();
    const interval = setInterval(fetchLobbies, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = () => {
    sounds.playClick();
    setIsRefreshing(true);
    fetchLobbies();
  };

  const getTimeAgo = (dateStr?: string) => {
    if (!dateStr) return 'Criada agora';
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'Criada há instantes';
    const minutes = Math.floor(seconds / 60);
    if (minutes === 1) return 'Criada há 1 min';
    return `Criada há ${minutes} min`;
  };

  return (
    <div className="min-h-[80vh] max-w-4xl mx-auto w-full p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              sounds.playClick();
              onBackToLobby();
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 shadow-sm transition-all cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Voltar ao Menu</span>
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Gamepad2 className="text-sky-600" size={24} />
              <span>Lobbies Públicos</span>
            </h1>
            <p className="text-xs text-slate-500">
              Salas abertas aguardando um adversário para jogar em tempo real
            </p>
          </div>
        </div>

        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-xs border border-slate-200 shadow-sm transition-all cursor-pointer active:scale-95"
          title="Atualizar lista de salas"
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-sky-600' : ''} />
          <span className="hidden sm:inline">Atualizar</span>
        </button>
      </div>

      {/* Lista de Salas */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400 font-bold animate-pulse">
          Buscando salas abertas disponíveis...
        </div>
      ) : lobbies.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center max-w-lg mx-auto shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-3 shadow-tactile-sm">
            <Users size={30} />
          </div>
          <h2 className="text-lg font-black text-slate-800 mb-1">
            Nenhuma Sala Pública Aberta
          </h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6 leading-relaxed">
            Não há salas públicas abertas no momento. Seja o primeiro a criar uma sala pública para que outros jogadores entrem!
          </p>
          <button
            onClick={() => {
              sounds.playClick();
              onCreateRoomDirectly();
            }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-tactile-sm transition-all active:translate-y-0.5 cursor-pointer"
          >
            <Play size={16} />
            <span>Criar Minha Sala Pública</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lobbies.map((room) => {
            const cardCount = room.config?.cardCount || 15;
            const isCustom = room.config?.mode === 'custom';
            const deckTitle = room.config?.deckName || (isCustom ? 'Baralho Personalizado' : 'Modo Clássico');

            return (
              <div
                key={room.room_code}
                className="bg-white border-2 border-slate-200 hover:border-sky-300 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Aberta
                    </span>
                    <span className="text-[11px] font-mono font-bold text-slate-400 flex items-center gap-1">
                      <Clock size={12} />
                      {getTimeAgo(room.created_at)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 my-2">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-400 to-indigo-500 text-white flex items-center justify-center font-black text-lg shadow-sm">
                      {room.host_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <h3 className="font-black text-base text-slate-900 truncate">
                        Sala de {room.host_name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mt-0.5">
                        <span className="font-mono text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                          #{room.room_code}
                        </span>
                        <span>•</span>
                        <span>{deckTitle}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-500" />
                    <span>{cardCount} Caras</span>
                  </div>

                  <button
                    onClick={() => {
                      sounds.playClick();
                      onJoinLobby(room.room_code);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-black text-xs uppercase tracking-wider shadow-tactile-sm transition-all active:translate-y-0.5 cursor-pointer"
                  >
                    <Play size={13} />
                    <span>Entrar na Partida</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
