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
    <div className="min-h-[80vh] max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#E8E0D8]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              sounds.playClick();
              onBackToLobby();
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-[#FAF6F0] text-[#776156] hover:text-[#382C26] font-bold text-xs border border-[#E8E0D8] transition-all cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Voltar ao Menu</span>
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#382C26] tracking-tight flex items-center gap-2">
              <Gamepad2 className="text-[#C25E3E]" size={24} />
              <span>Salas Públicas</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#8C786E]">
              Partidas abertas aguardando um oponente em tempo real
            </p>
          </div>
        </div>

        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#FAF6F0] text-[#776156] hover:text-[#382C26] font-bold text-xs border border-[#E8E0D8] transition-all cursor-pointer active:scale-95"
          title="Atualizar lista de salas"
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-[#C25E3E]' : ''} />
          <span className="hidden sm:inline">Atualizar</span>
        </button>
      </div>

      {/* Lista de Salas */}
      {loading ? (
        <div className="py-20 text-center text-xs font-bold text-[#8C786E] animate-pulse">
          Buscando salas abertas disponíveis...
        </div>
      ) : lobbies.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-[#D4C7BC] rounded-3xl p-8 sm:p-12 text-center max-w-lg mx-auto shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-[#FFE8E0] text-[#C25E3E] flex items-center justify-center mx-auto mb-3">
            <Users size={30} />
          </div>
          <h2 className="text-lg font-bold text-[#382C26] mb-1">
            Nenhuma Sala Aberta no Momento
          </h2>
          <p className="text-xs text-[#8C786E] max-w-sm mx-auto mb-6 leading-relaxed">
            Todas as salas já iniciaram ou foram preenchidas. Crie sua própria sala pública para jogar agora!
          </p>
          <button
            onClick={() => {
              sounds.playClick();
              onCreateRoomDirectly();
            }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#C25E3E] hover:bg-[#A94E31] text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-none"
          >
            <Play size={16} className="fill-white" />
            <span>Criar Minha Sala Pública</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lobbies.map((room) => {
            const cardCount = room.config?.cardCount || 15;
            const isCustom = room.config?.mode === 'custom';
            const deckTitle = room.config?.deckName || (isCustom ? 'Baralho Personalizado' : 'Turma do Clássico');

            return (
              <div
                key={room.room_code}
                className="bg-white border border-[#E8E0D8] hover:border-[#C25E3E] rounded-2xl p-5 shadow-xs hover:-translate-y-1 transition-all flex flex-col justify-between gap-4 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#E8F5E9] text-[#2E7D32] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#2E7D32] animate-pulse" />
                      Aberta
                    </span>
                    <span className="text-[11px] font-sans text-[#8C786E] flex items-center gap-1">
                      <Clock size={12} />
                      {getTimeAgo(room.created_at)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 my-2">
                    <div className="w-12 h-12 rounded-xl bg-[#FFE8E0] text-[#C25E3E] flex items-center justify-center font-bold text-lg">
                      {room.host_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <h3 className="font-bold text-base text-[#382C26] truncate">
                        Sala de {room.host_name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs font-semibold text-[#8C786E] mt-0.5">
                        <span className="font-sans font-medium text-[#776156] bg-[#FAF6F0] px-2 py-0.5 rounded-lg border border-[#E8E0D8]">
                          #{room.room_code}
                        </span>
                        <span>•</span>
                        <span>{deckTitle}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E8E0D8] flex items-center justify-between">
                  <div className="text-xs font-semibold text-[#776156] flex items-center gap-1.5">
                    <Sparkles size={14} className="text-[#C25E3E]" />
                    <span>{cardCount} Cartas</span>
                  </div>

                  <button
                    onClick={() => {
                      sounds.playClick();
                      onJoinLobby(room.room_code);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C25E3E] hover:bg-[#A94E31] text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-none"
                  >
                    <Play size={13} className="fill-white" />
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
