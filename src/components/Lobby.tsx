import { useState, useEffect, type FC } from 'react';
import {
  Users,
  Copy,
  Check,
  Heart,
  Play,
  Palette,
  LayoutGrid,
  LogIn,
  User as UserIcon,
  AlertCircle,
  Loader2,
  KeyRound,
  HelpCircle,
  Trophy,
  Layers,
  Lock,
} from 'lucide-react';
import { sounds } from '../utils/sound';
import type { GameMode, DifficultyCount, RoomConfig } from '../types/game';
import { auth, type AppUser, type SavedDeck } from '../services/auth';
import { network } from '../services/network';
import { STANDARD_60_CHARACTERS } from '../utils/characters';
import { Avatar } from './Avatar';

interface LobbyProps {
  onJoinRoom: (roomCode: string, playerName: string, isHost: boolean, config: RoomConfig) => void;
  onOpenDeckBuilder: (targetCount: DifficultyCount) => void;
  onOpenLogin: () => void;
  onOpenProfile: () => void;
  onSelectSavedDeck: (deck: SavedDeck) => void;
  currentUser: AppUser | null;
  onLogout: () => void;
  isConnecting: boolean;
  waitingForPlayer: boolean;
  roomCode: string;
  errorMessage?: string | null;
}

export const Lobby: FC<LobbyProps> = ({
  onJoinRoom,
  onOpenDeckBuilder,
  onOpenLogin,
  onOpenProfile,
  onSelectSavedDeck,
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
  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>([]);

  // Configurações da Partida
  const [mode, setMode] = useState<GameMode>('standard');
  const [customDifficulty, setCustomDifficulty] = useState<DifficultyCount>(30);

  const activeDifficulty: DifficultyCount = mode === 'standard' ? 15 : customDifficulty;

  // Carregar baralhos salvos do usuário logado (Ponto 2.b)
  useEffect(() => {
    if (currentUser?.id) {
      auth.getUserSavedDecks(currentUser.id).then(setSavedDecks);
    } else {
      setSavedDecks([]);
    }
  }, [currentUser]);

  // Caracteres para o peeker decorativo
  const peekingCharacters = STANDARD_60_CHARACTERS.slice(0, 5);

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

  // Se o usuário deslogar, reverter para o modo padrão
  useEffect(() => {
    if (!currentUser && mode === 'custom') {
      setMode('standard');
    }
  }, [currentUser, mode]);

  const handleCreateRoom = async () => {
    if (!name.trim()) return;
    sounds.playClick();
    localStorage.setItem('cara_player_name', name.trim());

    if (mode === 'custom') {
      if (!currentUser) {
        sounds.playWrong();
        onOpenLogin();
        return;
      }
      onOpenDeckBuilder(customDifficulty);
      return;
    }

    // PONTO 1.a: Código da sala com 6 números
    const newCode = await network.generateUniqueRoomCode();
    onJoinRoom(newCode, name.trim(), true, {
      mode: 'standard',
      cardCount: 15,
    });
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
            <span className="text-3xl font-black tracking-widest text-slate-900 font-mono select-all">
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

          {/* Indicador de Espera */}
          <div className="flex items-center justify-center gap-2.5 text-xs text-slate-500 bg-slate-50 py-2.5 px-4 rounded-xl border border-slate-200">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            <span className="font-medium">Aguardando oponente entrar na sala...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-6 px-4">
      {/* Container Principal */}
      <div className="relative max-w-lg w-full">
        {/* Avatares Espiando Decorativos (Vibe Gartic) */}
        <div className="flex items-end justify-center gap-2 -mb-2 px-6 pointer-events-none select-none z-0">
          {peekingCharacters.map((char, index) => (
            <div
              key={char.id}
              className={`transition-transform duration-300 transform ${
                index % 2 === 0 ? 'translate-y-1 hover:-translate-y-1' : 'translate-y-2'
              }`}
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-white shadow-md bg-white">
                <Avatar character={char} size={48} />
              </div>
            </div>
          ))}
        </div>

        {/* Card Principal */}
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl relative z-10 animate-in fade-in duration-200">
          {/* Barra Superior do Card (Status do Usuário) */}
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
            <div className="flex items-center gap-2.5 text-xs font-semibold">
              {currentUser ? (
                <div className="flex items-center gap-2.5">
                  {currentUser.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.username}
                      className="w-8 h-8 rounded-xl object-cover ring-2 ring-indigo-500/50 shadow-sm"
                    />
                  ) : (
                    <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                      <UserIcon size={15} />
                    </span>
                  )}
                  <div>
                    <span className="text-slate-600 block leading-tight text-xs">
                      Olá, <strong className="text-slate-900">{currentUser.username}</strong>
                    </span>
                    {currentUser.provider && currentUser.provider !== 'email' ? (
                      <span className="text-[10px] font-bold text-indigo-600 uppercase">
                        via {currentUser.provider}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Conta Ativa</span>
                    )}
                  </div>
                </div>
              ) : (
                <span className="text-slate-500 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                  Jogando como visitante
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {currentUser ? (
                <>
                  <button
                    type="button"
                    onClick={onOpenProfile}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all border border-indigo-200 shadow-sm cursor-pointer"
                    title="Ver perfil exclusivo, baralhos salvos e histórico"
                  >
                    <Trophy size={13} className="text-indigo-600" />
                    <span>Meu Perfil</span>
                  </button>
                  <button
                    onClick={onLogout}
                    className="text-xs text-slate-400 hover:text-rose-600 font-semibold transition-colors px-2 py-1.5 rounded-lg hover:bg-rose-50"
                  >
                    Sair
                  </button>
                </>
              ) : (
                <button
                  onClick={onOpenLogin}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200"
                >
                  <LogIn size={13} />
                  <span>Entrar / Cadastrar</span>
                </button>
              )}
            </div>
          </div>

          {/* Ícone de Lupa Solitário e Apresentação do Jogo (Ponto 1) */}
          <div className="text-center mb-6 flex flex-col items-center">
            <img
              src="/logo-icon.svg"
              alt="Tá na Cara!"
              className="h-16 w-16 sm:h-20 sm:w-20 object-contain my-1 drop-shadow-sm hover:scale-105 transition-transform"
            />
            <p className="text-xs text-slate-500 mt-2">
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

          {/* Conteúdo da Aba 1: CRIAR SALA */}
          {activeTab === 'create' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Seleção do Modo do Baralho */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Escolha o Modo do Jogo:
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      setMode('standard');
                    }}
                    className={`p-3 rounded-2xl border-2 text-left transition-all ${
                      mode === 'standard'
                        ? 'bg-sky-50 border-sky-400 text-sky-950 shadow-tactile-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs mb-0.5">
                      <LayoutGrid size={15} className="text-sky-600" />
                      <span>Modo Padrão</span>
                    </div>
                    <span className="text-[11px] text-slate-500 block">
                      15 Caras clássicas
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!currentUser) {
                        sounds.playWrong();
                        onOpenLogin();
                        return;
                      }
                      sounds.playClick();
                      setMode('custom');
                    }}
                    className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      !currentUser
                        ? 'bg-slate-50 border-slate-200 text-slate-400 hover:border-amber-300 hover:bg-amber-50/40'
                        : mode === 'custom'
                        ? 'bg-purple-50 border-purple-400 text-purple-950 shadow-tactile-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <Palette size={15} className={!currentUser ? 'text-slate-400' : 'text-purple-600'} />
                        <span className={!currentUser ? 'text-slate-600' : ''}>Personalizado</span>
                      </div>
                      {!currentUser && (
                        <Lock size={13} className="text-amber-600" />
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 block">
                      {!currentUser ? 'Requer Login' : 'Suas próprias fotos'}
                    </span>
                  </button>
                </div>

                {/* PONTO 2: Mensagem sutil com cadeado quando não logado */}
                {!currentUser && (
                  <div className="mt-2.5 flex items-center gap-2 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-900 font-medium">
                    <Lock size={13} className="text-amber-600 shrink-0" />
                    <span>Faça login para criar salas personalizadas.</span>
                    <button
                      type="button"
                      onClick={onOpenLogin}
                      className="ml-auto font-bold text-amber-700 hover:text-amber-950 underline cursor-pointer"
                    >
                      Entrar
                    </button>
                  </div>
                )}
              </div>

              {/* Opções de Quantidade de Cartas */}
              {mode === 'standard' ? (
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-semibold">Tamanho do Baralho:</span>
                  <span className="px-3 py-1 rounded-xl bg-sky-100 text-sky-800 font-extrabold border border-sky-200">
                    15 Personagens
                  </span>
                </div>
              ) : (
                <div className="space-y-3.5 animate-in fade-in">
                  {/* PONTO 2.b: Baralhos Salvos do Usuário */}
                  {currentUser && savedDecks.length > 0 && (
                    <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-3 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-black text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Layers size={13} className="text-purple-600" />
                          Seus Baralhos Salvos ({savedDecks.length})
                        </span>
                        <button
                          type="button"
                          onClick={onOpenProfile}
                          className="text-[10px] font-extrabold text-purple-700 hover:text-purple-900 underline cursor-pointer"
                        >
                          Gerenciar
                        </button>
                      </div>

                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {savedDecks.map((deck) => (
                          <div
                            key={deck.id}
                            className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-purple-100 shadow-sm hover:border-purple-300 transition-all"
                          >
                            <div className="truncate mr-2">
                              <span className="font-extrabold text-xs text-slate-800 block truncate">
                                {deck.name}
                              </span>
                              <span className="text-[10px] text-purple-600 font-bold">
                                {deck.card_count} Caras Personalizadas
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                sounds.playClick();
                                onSelectSavedDeck(deck);
                              }}
                              className="shrink-0 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black shadow-tactile-sm transition-all active:translate-y-0.5 cursor-pointer"
                            >
                              Jogar com este
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* PONTO 2.a: 3 opções (30, 60 e 90 caras) sem legendas */}
                  <div>
                    <label className="block text-xs font-extrabold text-purple-900 uppercase tracking-wider mb-1.5">
                      {savedDecks.length > 0 ? 'Ou crie um novo baralho com:' : 'Quantidade de Caras Personalizadas:'}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {([30, 60, 90] as const).map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => {
                            sounds.playClick();
                            setCustomDifficulty(count);
                          }}
                          className={`py-3 px-2 rounded-2xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer ${
                            customDifficulty === count
                              ? 'bg-purple-600 border-purple-700 text-white font-black shadow-tactile-sm'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 font-bold'
                          }`}
                        >
                          <span className="text-base font-black">{count}</span>
                          <span className={`text-[10px] font-bold ${customDifficulty === count ? 'text-purple-200' : 'text-slate-500'}`}>
                            Caras
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Botão Principal de Criação (Relevo Tátil 3D) */}
              <button
                onClick={handleCreateRoom}
                disabled={!name.trim() || isConnecting}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-extrabold text-sm shadow-[0_4px_0_#059669] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
              >
                {isConnecting ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
                <span>
                  {mode === 'custom'
                    ? `Montar Baralho (${activeDifficulty} Caras)`
                    : 'Criar Partida (15 Caras)'}
                </span>
              </button>
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