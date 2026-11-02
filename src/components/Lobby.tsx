import { useState, useEffect, type FC } from 'react';
import { Users, Copy, Check, Sparkles, Heart, Play, Palette, LayoutGrid, LogIn, User as UserIcon } from 'lucide-react';
import { sounds } from '../utils/sound';
import type { GameMode, DifficultyCount, RoomConfig } from '../types/game';
import type { AppUser } from '../services/auth';

interface LobbyProps {
  onJoinRoom: (roomCode: string, playerName: string, isHost: boolean, config: RoomConfig) => void;
  onOpenDeckBuilder: (targetCount: DifficultyCount) => void;
  onOpenLogin: () => void;
  currentUser: AppUser | null;
  onLogout: () => void;
  isConnecting: boolean;
  waitingForPlayer: boolean;
  roomCode: string;
}

export const Lobby: FC<LobbyProps> = ({
  onJoinRoom,
  onOpenDeckBuilder,
  onOpenLogin,
  currentUser,
  onLogout,
  isConnecting,
  waitingForPlayer,
  roomCode,
}) => {
  const [name, setName] = useState(currentUser?.username || '');
  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);

  // Configurações da Partida
  const [mode, setMode] = useState<GameMode>('standard');
  const [difficulty, setDifficulty] = useState<DifficultyCount>(30);

  useEffect(() => {
    if (currentUser?.username) {
      setName(currentUser.username);
    } else {
      const savedName = localStorage.getItem('cara_player_name') || '';
      if (savedName) setName(savedName);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const urlRoom = urlParams.get('sala') || urlParams.get('room');
    if (urlRoom) {
      setInputCode(urlRoom.toUpperCase());
    }
  }, [currentUser]);

  const handleCreateRoom = () => {
    if (!name.trim()) return;
    sounds.playClick();
    localStorage.setItem('cara_player_name', name.trim());

    if (mode === 'custom') {
      // Abre o construtor de baralho para o usuário montar as caras personalizadas
      onOpenDeckBuilder(difficulty);
      return;
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newCode = `CARA-${randomSuffix}`;
    onJoinRoom(newCode, name.trim(), true, {
      mode: 'standard',
      cardCount: difficulty,
    });
  };

  const handleJoinWithCode = () => {
    if (!name.trim() || !inputCode.trim()) return;
    sounds.playClick();
    localStorage.setItem('cara_player_name', name.trim());
    onJoinRoom(inputCode.trim().toUpperCase(), name.trim(), false, {
      mode: 'standard',
      cardCount: difficulty,
    });
  };

  const copyInviteLink = () => {
    sounds.playClick();
    const url = `${window.location.origin}${window.location.pathname}?sala=${roomCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (waitingForPlayer) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="bg-slate-900 border-2 border-indigo-500/70 rounded-3xl max-w-md w-full p-8 shadow-2xl text-center">
          <div className="w-16 h-16 bg-pink-500/20 text-pink-400 border border-pink-500/30 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Heart size={32} />
          </div>

          <h2 className="text-2xl font-black text-white mb-2">Sala Criada!</h2>
          <p className="text-sm text-slate-400 mb-6">
            Mande o código ou o link para ela entrar no outro computador:
          </p>

          <div className="bg-slate-950 border-2 border-indigo-500/50 rounded-2xl p-4 mb-4">
            <span className="text-xs uppercase text-slate-400 font-bold block mb-1">
              Código da Sala:
            </span>
            <span className="text-3xl font-black tracking-widest text-amber-400 font-mono">
              {roomCode}
            </span>
          </div>

          <button
            onClick={copyInviteLink}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white font-bold text-sm border border-slate-700 transition-all mb-6"
          >
            {copied ? (
              <>
                <Check size={18} className="text-emerald-400" />
                <span className="text-emerald-400">Link Copiado para Área de Transferência!</span>
              </>
            ) : (
              <>
                <Copy size={18} />
                <span>Copiar Link do Jogo</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span>Aguardando oponente entrar na sala...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="bg-slate-900/90 border-2 border-indigo-500/50 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        {/* Barra de Usuário no Topo do Card */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                  <UserIcon size={14} />
                </span>
                <span className="text-slate-200">Olá, <strong className="text-amber-400">{currentUser.username}</strong></span>
              </div>
            ) : (
              <span className="text-slate-400">Jogando como visitante</span>
            )}
          </div>

          <div>
            {currentUser ? (
              <button
                onClick={onLogout}
                className="text-xs text-slate-400 hover:text-red-400 transition-colors"
              >
                Sair
              </button>
            ) : (
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-bold border border-indigo-500/40 transition-all"
              >
                <LogIn size={13} />
                <span>Entrar / Cadastrar</span>
              </button>
            )}
          </div>
        </div>

        {/* Logo / Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center gap-2 bg-indigo-950/80 border border-indigo-800 text-indigo-300 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles size={14} className="text-amber-400" />
            Edição Dois Jogadores
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Cara a Cara
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Descubra o personagem secreto do outro primeiro!
          </p>
        </div>

        {/* Formulário Principal */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Seu Nome ou Apelido:
            </label>
            <input
              type="text"
              placeholder="Ex: Miguel, Amor, etc."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Requisito D: Modo Padrão vs Modo Personalizado */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Modo do Baralho:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setMode('standard');
                }}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-xs font-extrabold transition-all ${
                  mode === 'standard'
                    ? 'bg-indigo-950/80 border-indigo-500 text-indigo-300 shadow-md shadow-indigo-500/20'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <LayoutGrid size={16} />
                <span>Modo Padrão</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setMode('custom');
                }}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-xs font-extrabold transition-all ${
                  mode === 'custom'
                    ? 'bg-amber-950/60 border-amber-500 text-amber-300 shadow-md shadow-amber-500/20'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Palette size={16} />
                <span>Modo Personalizado</span>
              </button>
            </div>
          </div>

          {/* Requisito C: Quantidade de Caras (15, 30, 45, 60) */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Quantidade de Caras:
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  { count: 15, label: 'Fácil' },
                  { count: 30, label: 'Médio' },
                  { count: 45, label: 'Difícil' },
                  { count: 60, label: 'Hardcore' },
                ] as const
              ).map(({ count, label }) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setDifficulty(count);
                  }}
                  className={`p-2 rounded-xl border flex flex-col items-center justify-center transition-all ${
                    difficulty === count
                      ? 'bg-indigo-600 border-indigo-400 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="text-sm font-black">{count}</span>
                  <span className="text-[10px] uppercase font-bold">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Botão Criar Sala */}
          <button
            onClick={handleCreateRoom}
            disabled={!name.trim() || isConnecting}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-500/30 transition-all active:scale-95"
          >
            <Play size={16} />
            {mode === 'custom' ? 'Criar Caras e Abrir Sala' : 'Criar Nova Sala (Host)'}
          </button>

          {/* Divisor */}
          <div className="relative flex items-center justify-center my-3">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider absolute">
              ou entrar com código
            </span>
          </div>

          {/* Campo de Código */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ex: CARA-24"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              className="flex-1 bg-slate-950 border border-slate-700 text-amber-400 font-mono font-bold placeholder-slate-600 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleJoinWithCode}
              disabled={!name.trim() || !inputCode.trim() || isConnecting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold text-xs border border-slate-700 transition-all active:scale-95"
            >
              <Users size={15} />
              Entrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
