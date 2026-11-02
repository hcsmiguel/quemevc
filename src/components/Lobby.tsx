import { useState, useEffect, type FC } from 'react';
import { Users, Copy, Check, Sparkles, Heart, Play } from 'lucide-react';
import { sounds } from '../utils/sound';

interface LobbyProps {
  onJoinRoom: (roomCode: string, playerName: string, isHost: boolean) => void;
  isConnecting: boolean;
  waitingForPlayer: boolean;
  roomCode: string;
}

export const Lobby: FC<LobbyProps> = ({
  onJoinRoom,
  isConnecting,
  waitingForPlayer,
  roomCode,
}) => {
  const [name, setName] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem('cara_player_name') || '';
    if (savedName) setName(savedName);

    const urlParams = new URLSearchParams(window.location.search);
    const urlRoom = urlParams.get('sala') || urlParams.get('room');
    if (urlRoom) {
      setInputCode(urlRoom.toUpperCase());
    }
  }, []);

  const handleCreateRoom = () => {
    if (!name.trim()) return;
    sounds.playClick();
    localStorage.setItem('cara_player_name', name.trim());
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newCode = `AMOR-${randomSuffix}`;
    onJoinRoom(newCode, name.trim(), true);
  };

  const handleJoinWithCode = () => {
    if (!name.trim() || !inputCode.trim()) return;
    sounds.playClick();
    localStorage.setItem('cara_player_name', name.trim());
    onJoinRoom(inputCode.trim().toUpperCase(), name.trim(), false);
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
            <span>Aguardando ela entrar na sala...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="bg-slate-900/90 border-2 border-indigo-500/50 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center gap-2 bg-indigo-950/80 border border-indigo-800 text-indigo-300 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles size={14} className="text-amber-400" />
            Edição Dois Jogadores
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">
            Cara a Cara
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Descubra o personagem secreto do outro primeiro!
          </p>
        </div>

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
              className="w-full bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <button
            onClick={handleCreateRoom}
            disabled={!name.trim() || isConnecting}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 disabled:opacity-50 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-indigo-500/30 transition-all active:scale-95"
          >
            <Play size={18} />
            Criar Nova Sala (Você será o Host)
          </button>

          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider absolute">
              ou entrar em uma sala existente
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Código da Sala:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: AMOR-24"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                className="flex-1 bg-slate-950 border border-slate-700 text-amber-400 font-mono font-bold placeholder-slate-600 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleJoinWithCode}
                disabled={!name.trim() || !inputCode.trim() || isConnecting}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold text-sm border border-slate-700 transition-all active:scale-95"
              >
                <Users size={16} />
                Entrar
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-400 leading-relaxed">
            🔒 Cada jogador joga na sua própria tela. Suas cartas abaixadas e seu personagem são <strong>100% secretos</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};
