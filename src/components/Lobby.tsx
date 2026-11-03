import { useState, useEffect, type FC } from 'react';
import {
  Users,
  Copy,
  Check,
  Heart,
  Play,
  LogIn,
  User as UserIcon,
  AlertCircle,
  Loader2,
  KeyRound,
  HelpCircle,
  LogOut,
  Gamepad2,
  PlusCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { sounds } from '../utils/sound';
import type { DifficultyCount, RoomConfig } from '../types/game';
import type { AppUser, SavedDeck } from '../services/auth';

interface LobbyProps {
  onJoinRoom: (roomCode: string, playerName: string, isHost: boolean, config: RoomConfig) => void;
  onOpenCreateLobby: (playerName: string) => void;
  onOpenDeckBuilder?: (targetCount: DifficultyCount, isSecret?: boolean, password?: string) => void;
  onOpenLogin: () => void;
  onOpenProfile: () => void;
  onOpenPublicLobbies: () => void;
  onSelectSavedDeck?: (deck: SavedDeck) => void;
  onAbandonWaiting?: () => void;
  currentUser: AppUser | null;
  onLogout: () => void;
  isConnecting: boolean;
  waitingForPlayer: boolean;
  roomCode: string;
  errorMessage?: string | null;
}

export const Lobby: FC<LobbyProps> = ({
  onJoinRoom,
  onOpenCreateLobby,
  onOpenLogin,
  onOpenProfile: _onOpenProfile,
  onOpenPublicLobbies,
  onAbandonWaiting,
  currentUser,
  onLogout,
  isConnecting,
  waitingForPlayer,
  roomCode,
  errorMessage,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [name, setName] = useState(currentUser?.username || '');
  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);

  // Timer de expiração de 10 minutos (600s) para salas criadas sem começar
  const [waitingSecondsLeft, setWaitingSecondsLeft] = useState(600);

  useEffect(() => {
    if (!waitingForPlayer) {
      setWaitingSecondsLeft(600);
      return;
    }

    setWaitingSecondsLeft(600);

    const timer = setInterval(() => {
      setWaitingSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (onAbandonWaiting) {
            onAbandonWaiting();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [waitingForPlayer, onAbandonWaiting]);

  const formatWaitingTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
      setActiveTab('join');
    }
  }, [currentUser]);

  const handleProceedToCreateLobby = () => {
    if (!name.trim()) {
      sounds.playWrong();
      return;
    }
    sounds.playClick();
    localStorage.setItem('cara_player_name', name.trim());
    onOpenCreateLobby(name.trim());
  };

  const handleJoinWithCode = () => {
    if (!name.trim() || !inputCode.trim()) return;
    sounds.playClick();
    localStorage.setItem('cara_player_name', name.trim());
    onJoinRoom(inputCode.trim(), name.trim(), false, {
      mode: 'standard',
      cardCount: 15,
    });
  };

  const copyInviteLink = () => {
    sounds.playClick();
    const url = `${window.location.origin}${window.location.pathname}?sala=${roomCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Tela de Aguardando Jogador
  if (waitingForPlayer) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <div className="bg-white border-2 border-slate-200 rounded-3xl max-w-md w-full p-8 shadow-xl text-center relative overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Faixa decorativa pastel */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-200 via-rose-200 to-sky-200" />

          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-tactile-sm">
            <Heart size={30} className="fill-rose-500 text-rose-500 animate-pulse" />
          </div>

          <span className="inline-block text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 mb-2">
            Sala Aberta
          </span>

          <h2 className="text-2xl font-black text-slate-900 mb-1">Tudo Pronto!</h2>
          <p className="text-xs text-slate-500 mb-6">
            Envie o código ou copie o link direto para o outro jogador entrar:
          </p>

          {/* Ticket do Código da Sala */}
          <div className="bg-amber-50/80 border-2 border-dashed border-amber-300 rounded-2xl p-5 mb-5 text-center relative">
            <span className="text-[10px] uppercase text-amber-800 font-extrabold tracking-wider block mb-1">
              Código da Sala
            </span>
            <span className="text-3xl font-black tracking-[0.2em] text-slate-900 font-sans tabular-nums select-all">
              {roomCode}
            </span>
          </div>

          {/* Botão Copiar Link */}
          <button
            onClick={copyInviteLink}
            className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl font-bold text-sm transition-all shadow-tactile active:translate-y-1 mb-6 ${
              copied
                ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-300'
                : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
          >
            {copied ? (
              <>
                <Check size={18} className="text-emerald-600" />
                <span>Link Copiado com Sucesso!</span>
              </>
            ) : (
              <>
                <Copy size={18} />
                <span>Copiar Link da Partida</span>
              </>
            )}
          </button>

          {/* Indicador de Espera com Contador de 10 minutos */}
          <div className="flex flex-col gap-2 bg-amber-50/80 border border-amber-200/80 py-3 px-4 rounded-2xl mb-4">
            <div className="flex items-center justify-center gap-2 text-xs text-amber-950 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
              <span>Aguardando oponente entrar na sala...</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-amber-800">
              <Clock size={13} className="text-amber-600" />
              <span>A sala fechará por inatividade em: <span className="font-mono text-amber-900 font-extrabold">{formatWaitingTimer(waitingSecondsLeft)}</span></span>
            </div>
          </div>

          {/* Botão Cancelar e Fechar Sala */}
          {onAbandonWaiting && (
            <button
              onClick={() => {
                sounds.playClick();
                onAbandonWaiting();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-extrabold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer shadow-sm active:translate-y-0.5"
            >
              <LogOut size={15} />
              <span>Cancelar e Fechar Sala</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-6 px-4">
      {/* Container Principal */}
      <div className="relative max-w-lg w-full">
        {/* Leque Tátil de Mini-Cartas de Jogo (Opção 1: Board Game Físico Teaser) */}
        <div className="relative flex items-end justify-center -mb-5 px-6 pointer-events-auto select-none z-0 group">
          {/* Mini-Carta 1 (Esquerda): O Personagem Secreto */}
          <div
            className="relative w-20 h-28 sm:w-24 sm:h-32 rounded-2xl bg-gradient-to-b from-indigo-50 via-white to-indigo-100/90 border-2 border-indigo-200/90 shadow-md transform origin-bottom-right -rotate-8 -translate-x-3 translate-y-1 transition-all duration-300 ease-out group-hover:-rotate-14 group-hover:-translate-x-6 group-hover:-translate-y-2 group-hover:shadow-xl hover:!z-30 hover:!scale-110 hover:!-translate-y-4 cursor-pointer p-2 flex flex-col justify-between overflow-hidden"
            title="O clássico personagem misterioso"
          >
            {/* Índice superior */}
            <div className="flex items-center justify-between text-indigo-400 font-mono font-black text-[10px] leading-none select-none">
              <span>?</span>
              <span className="text-[8px] opacity-60">1v1</span>
            </div>

            {/* Ilustração Central: Silhueta Minimalista do Personagem Secreto */}
            <div className="flex flex-col items-center justify-center my-auto">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-indigo-100 border border-indigo-200/80 flex items-center justify-center relative shadow-inner">
                <svg viewBox="0 0 40 40" className="w-7 h-7 text-indigo-500 fill-current opacity-85">
                  <path d="M20 7 C14 7 12 11 12 14 C12 17 14 19 16 20 C11 22 8 26 8 32 L32 32 C32 26 29 22 24 20 C26 19 28 17 28 14 C28 11 26 7 20 7 Z" />
                </svg>
                <span className="absolute text-[11px] font-black text-indigo-700 -top-1 -right-1 bg-white rounded-full w-4 h-4 flex items-center justify-center shadow-xs border border-indigo-200">
                  ?
                </span>
              </div>
            </div>

            {/* Rodapé da carta */}
            <div className="text-center">
              <span className="block text-[8px] sm:text-[9px] font-black text-indigo-600 tracking-wider uppercase">
                Segredo
              </span>
            </div>
          </div>

          {/* Mini-Carta 2 (Centro - Dourada): A Lupa Oficial do Jogo */}
          <div
            className="relative z-10 w-22 h-30 sm:w-26 sm:h-34 rounded-2xl bg-gradient-to-b from-amber-50 via-white to-amber-100/90 border-2 border-amber-300 shadow-lg transform origin-bottom scale-105 translate-y-0 transition-all duration-300 ease-out group-hover:-translate-y-4 group-hover:scale-110 group-hover:shadow-2xl hover:!z-30 hover:!scale-115 hover:!-translate-y-6 cursor-pointer p-2 flex flex-col justify-between overflow-hidden"
            title="A Lupa Oficial do Tá na Cara!"
          >
            {/* Brilho sutil dourado no topo */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200" />

            {/* Índice superior */}
            <div className="flex items-center justify-between text-amber-500 font-black text-[10px] leading-none select-none">
              <span>★</span>
              <span className="text-[8px] tracking-widest text-amber-600 font-extrabold">OFICIAL</span>
            </div>

            {/* Ilustração Central: Ícone da Lupa Oficial */}
            <div className="flex flex-col items-center justify-center my-auto">
              <img
                src="/logo-icon.svg"
                alt="Tá na Cara!"
                className="w-11 h-11 sm:w-13 sm:h-13 object-contain drop-shadow-sm transition-transform group-hover:scale-110 pointer-events-none"
              />
            </div>

            {/* Rodapé da carta */}
            <div className="text-center">
              <span className="block text-[8px] sm:text-[9px] font-black text-amber-900 tracking-wider uppercase">
                Tá na Cara!
              </span>
            </div>
          </div>

          {/* Mini-Carta 3 (Direita): O Verso Oficial do Baralho */}
          <div
            className="relative w-20 h-28 sm:w-24 sm:h-32 rounded-2xl bg-gradient-to-b from-emerald-50 via-white to-teal-100/80 border-2 border-emerald-200/90 shadow-md transform origin-bottom-left rotate-8 translate-x-3 translate-y-1 transition-all duration-300 ease-out group-hover:rotate-14 group-hover:translate-x-6 group-hover:-translate-y-2 group-hover:shadow-xl hover:!z-30 hover:!scale-110 hover:!-translate-y-4 cursor-pointer p-2 flex flex-col justify-between overflow-hidden"
            title="O verso tátil das cartas do baralho"
          >
            {/* Índice superior */}
            <div className="flex items-center justify-between text-emerald-500 font-mono font-black text-[10px] leading-none select-none">
              <span className="text-[8px] opacity-60">15</span>
              <span>✦</span>
            </div>

            {/* Padronagem Geométrica do Verso (Estilo Carta de Tabuleiro) */}
            <div className="flex items-center justify-center my-auto">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-100/70 border border-emerald-200 flex items-center justify-center relative p-1 shadow-inner">
                <svg viewBox="0 0 32 32" className="w-full h-full text-emerald-600/70 stroke-current" fill="none">
                  <rect x="2" y="2" width="28" height="28" rx="4" strokeWidth="1" strokeDasharray="2 2" />
                  <path d="M16 4 L28 16 L16 28 L4 16 Z" strokeWidth="1.2" />
                  <circle cx="16" cy="16" r="3" fill="currentColor" />
                </svg>
              </div>
            </div>

            {/* Rodapé da carta */}
            <div className="text-center">
              <span className="block text-[8px] sm:text-[9px] font-black text-emerald-700 tracking-wider uppercase">
                Baralho
              </span>
            </div>
          </div>
        </div>

        {/* Card Principal */}
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl relative z-10 animate-in fade-in duration-200">
          {/* Barra Superior do Card (Status do Usuário Integrado) */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5 text-xs font-semibold">
              {currentUser ? (
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    {currentUser.avatarUrl ? (
                      <img
                        src={currentUser.avatarUrl}
                        alt={currentUser.username}
                        className="w-8 h-8 rounded-xl object-cover ring-2 ring-indigo-500/40 shadow-sm"
                      />
                    ) : (
                      <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                        <UserIcon size={15} />
                      </span>
                    )}
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" title="Online" />
                  </div>
                  <div>
                    <span className="text-slate-700 block leading-tight text-xs font-semibold">
                      Olá, <strong className="text-slate-900 font-extrabold">{currentUser.username}</strong>
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                      {currentUser.provider && currentUser.provider !== 'email' ? (
                        <span className="text-indigo-600 font-bold uppercase">via {currentUser.provider}</span>
                      ) : (
                        <span>Conta Ativa</span>
                      )}
                      <span>• Pronto para jogar</span>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                  <span>Jogando como visitante</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {currentUser ? (
                <button
                  onClick={onLogout}
                  className="text-xs text-slate-400 hover:text-rose-600 font-semibold transition-colors px-2.5 py-1.5 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-100 cursor-pointer flex items-center gap-1"
                  title="Sair da conta"
                >
                  <LogOut size={13} />
                  <span>Sair</span>
                </button>
              ) : (
                <button
                  onClick={onOpenLogin}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200 cursor-pointer active:scale-95"
                >
                  <LogIn size={13} />
                  <span>Entrar / Cadastrar</span>
                </button>
              )}
            </div>
          </div>

          {/* Apresentação do Jogo e Identidade Visual (Hero Centerpiece) */}
          <div className="text-center my-4 flex flex-col items-center">
            <div className="relative group inline-block mb-1">
              <img
                src="/logo-icon.svg"
                alt="Tá na Cara!"
                className="h-16 w-16 sm:h-20 sm:w-20 object-contain drop-shadow-sm transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3 cursor-pointer"
              />
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Tá na Cara!
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 whitespace-nowrap">
              O clássico jogo de adivinhação, feito para jogar a dois em tempo real
            </p>
          </div>

          {/* Alerta de Erro */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2.5 shadow-sm animate-shake">
              <AlertCircle size={18} className="shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Abas Alternadoras: Criar Sala vs Entrar com Código */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl mb-5 border border-slate-200/80">
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setActiveTab('create');
              }}
              className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'create'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Play size={14} className={activeTab === 'create' ? 'text-emerald-600' : ''} />
              <span>Criar Nova Sala</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setActiveTab('join');
              }}
              className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'join'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <KeyRound size={14} className={activeTab === 'join' ? 'text-sky-600' : ''} />
              <span>Entrar com Código</span>
            </button>
          </div>

          {/* Campo Nome do Jogador */}
          <div className="mb-4">
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
              Seu Nome ou Apelido:
            </label>
            <input
              type="text"
              placeholder="Ex: Miguel, Bia, etc."
              value={name}
              maxLength={20}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-200 text-slate-900 placeholder-slate-400 text-sm font-semibold rounded-2xl px-4 py-3 focus:outline-none focus:bg-white focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all"
            />
          </div>

          {/* Conteúdo da Aba 1: CRIAR LOBBY */}
          {activeTab === 'create' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 text-xs text-slate-600 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles size={16} />
                </div>
                <span className="leading-relaxed">
                  Configure as regras na próxima etapa, convide quem você quiser e descubra quem tem o melhor palpite!
                </span>
              </div>

              {/* PONTO 3: Dois botões - Criar Lobby e Buscar Lobbies */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleProceedToCreateLobby}
                  disabled={!name.trim()}
                  className="w-full flex items-center justify-center gap-2 py-4 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-black text-sm uppercase tracking-wider shadow-[0_4px_0_#059669] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
                >
                  <PlusCircle size={18} />
                  <span>Criar Lobby</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    onOpenPublicLobbies();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-4 px-4 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-black text-sm uppercase tracking-wider shadow-[0_4px_0_#0284c7] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
                >
                  <Gamepad2 size={18} />
                  <span>Buscar Lobbies</span>
                </button>
              </div>
            </div>
          )}

          {/* Conteúdo da Aba 2: ENTRAR COM CÓDIGO */}
          {activeTab === 'join' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Código da Sala (6 números):
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="Ex: 489201"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinWithCode()}
                  className="w-full bg-slate-50 border-2 border-slate-200 text-slate-900 font-mono font-black placeholder-slate-400 text-lg tracking-[0.25em] text-center rounded-2xl px-4 py-3 focus:outline-none focus:bg-white focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all"
                />
              </div>

              <button
                onClick={handleJoinWithCode}
                disabled={!name.trim() || !inputCode.trim() || isConnecting}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-extrabold text-sm shadow-[0_4px_0_#0284c7] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
              >
                {isConnecting ? <Loader2 size={18} className="animate-spin" /> : <Users size={18} />}
                <span>{isConnecting ? 'Conectando...' : 'Entrar na Sala'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mini-guia: Como Jogar em 3 Passos (Estilo Contexto / Notion) */}
      <div className="max-w-xl w-full mt-8">
        <div className="text-center mb-3">
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1.5">
            <HelpCircle size={14} />
            Como Jogar em 3 Passos
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-3.5 text-center shadow-sm">
            <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-black text-xs inline-flex items-center justify-center mb-2">
              1
            </span>
            <h4 className="text-xs font-extrabold text-slate-900 mb-0.5">Escolha o Segredo</h4>
            <p className="text-[11px] text-slate-500 leading-snug">
              Cada jogador escolhe seu personagem secreto que o outro terá que adivinhar.
            </p>
          </div>

          <div className="bg-white border-2 border-slate-200 rounded-2xl p-3.5 text-center shadow-sm">
            <span className="w-7 h-7 rounded-full bg-sky-100 text-sky-800 font-black text-xs inline-flex items-center justify-center mb-2">
              2
            </span>
            <h4 className="text-xs font-extrabold text-slate-900 mb-0.5">Pergunte Sim ou Não</h4>
            <p className="text-[11px] text-slate-500 leading-snug">
              "Usa óculos?", "Tem barba?". Abaixe as cartas que não batem com a resposta.
            </p>
          </div>

          <div className="bg-white border-2 border-slate-200 rounded-2xl p-3.5 text-center shadow-sm">
            <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs inline-flex items-center justify-center mb-2">
              3
            </span>
            <h4 className="text-xs font-extrabold text-slate-900 mb-0.5">Dê o Palpite</h4>
            <p className="text-[11px] text-slate-500 leading-snug">
              Quando souber quem é, dê o palpite final de vitória antes do seu adversário!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};