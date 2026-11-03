import { useState, useEffect, type FC } from 'react';
import {
  ArrowLeft,
  MessageSquareQuote,
  Headphones,
  LayoutGrid,
  Palette,
  Globe,
  Lock,
  KeyRound,
  Check,
  Layers,
  Wand2,
  Play,
  Loader2,
} from 'lucide-react';
import type { DifficultyCount, GameMode, RoomConfig } from '../types/game';
import { auth, type AppUser, type SavedDeck } from '../services/auth';
import { sounds } from '../utils/sound';

interface CreateLobbyPageProps {
  playerName: string;
  currentUser: AppUser | null;
  onBackToHome: () => void;
  onOpenLogin: () => void;
  onOpenProfile: () => void;
  onCreateRoom: (config: RoomConfig) => void;
  onOpenDeckBuilder: (targetCount: DifficultyCount, isSecret?: boolean, password?: string, isCallMode?: boolean) => void;
  isConnecting: boolean;
}

export const CreateLobbyPage: FC<CreateLobbyPageProps> = ({
  currentUser,
  onBackToHome,
  onOpenLogin,
  onOpenProfile,
  onCreateRoom,
  onOpenDeckBuilder,
  isConnecting,
}) => {
  const [mode, setMode] = useState<GameMode>('standard');
  const [isCallMode, setIsCallMode] = useState<boolean>(false);
  const [customDifficulty, setCustomDifficulty] = useState<DifficultyCount>(30);
  const [selectedSavedDeckId, setSelectedSavedDeckId] = useState<string | null>(null);
  const [isSecretRoom, setIsSecretRoom] = useState<boolean>(false);
  const [secretPassword, setSecretPassword] = useState<string>('');
  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>([]);
  const [communityDecks, setCommunityDecks] = useState<SavedDeck[]>([]);
  const [deckSourceTab, setDeckSourceTab] = useState<'my' | 'community'>('my');

  useEffect(() => {
    if (currentUser?.id) {
      auth.getUserSavedDecks(currentUser.id).then(setSavedDecks);
    } else {
      setSavedDecks([]);
    }
    auth.getPublicDecks().then(setCommunityDecks);
  }, [currentUser]);

  // Se o usuário deslogar, reverte para modo padrão
  useEffect(() => {
    if (!currentUser && mode === 'custom') {
      setMode('standard');
    }
  }, [currentUser, mode]);

  const allAvailableDecks = [...savedDecks, ...communityDecks];
  const selectedSavedDeck = allAvailableDecks.find((d) => d.id === selectedSavedDeckId);

  const handleSubmit = () => {
    if (isSecretRoom && !secretPassword.trim()) {
      sounds.playWrong();
      return;
    }

    sounds.playClick();

    if (mode === 'custom') {
      if (!currentUser) {
        sounds.playWrong();
        onOpenLogin();
        return;
      }

      if (selectedSavedDeck) {
        onCreateRoom({
          mode: 'custom',
          cardCount: selectedSavedDeck.card_count as DifficultyCount,
          deckName: selectedSavedDeck.name,
          customCards: selectedSavedDeck.cards,
          isSecret: isSecretRoom,
          password: isSecretRoom ? secretPassword.trim() : undefined,
          isCallMode,
        });
        return;
      }

      onOpenDeckBuilder(
        customDifficulty,
        isSecretRoom,
        isSecretRoom ? secretPassword.trim() : undefined,
        isCallMode
      );
      return;
    }

    onCreateRoom({
      mode: 'standard',
      cardCount: 15,
      isSecret: isSecretRoom,
      password: isSecretRoom ? secretPassword.trim() : undefined,
      isCallMode,
    });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 animate-in fade-in duration-200">
      {/* Botão Voltar */}
      <div className="flex items-center justify-between mb-5">
        <button
          type="button"
          onClick={() => {
            sounds.playClick();
            onBackToHome();
          }}
          className="flex items-center gap-1.5 text-xs font-black text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 px-3.5 py-2 rounded-xl shadow-sm transition-all cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Voltar ao Menu</span>
        </button>
      </div>

      {/* Cartão Principal */}
      <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-7">
        {/* Cabeçalho */}
        <div className="border-b border-slate-100 pb-5">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Configurar Novo Lobby
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Defina o estilo de jogo, baralho e a privacidade da sua partida
          </p>
        </div>

        {/* 1. SEÇÃO: MODO DE JOGO & MODO CALL */}
        <div className="space-y-3">
          <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
            1. Comunicação da Partida:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
            {/* Opção A: Perguntas pelo Site */}
            <div
              onClick={() => {
                sounds.playClick();
                setIsCallMode(false);
              }}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                !isCallMode
                  ? 'bg-sky-50/80 border-sky-500 ring-2 ring-sky-200 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    !isCallMode ? 'bg-sky-500 text-white shadow-tactile-sm' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <MessageSquareQuote size={20} />
                </div>
                <div>
                  <span className="font-black text-sm text-slate-900 block">Perguntas pelo Jogo</span>
                  <span className="text-[10px] text-sky-700 font-extrabold uppercase tracking-wider">
                    Modo Tradicional
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                As perguntas são digitadas ou escolhidas no site. O oponente clica em SIM ou NÃO na tela.
              </p>
            </div>

            {/* Opção B: Modo Call (Por Voz / Presencial) */}
            <div
              onClick={() => {
                sounds.playClick();
                setIsCallMode(true);
              }}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between relative ${
                isCallMode
                  ? 'bg-purple-50/80 border-purple-500 ring-2 ring-purple-200 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-purple-600 text-white text-[9px] font-black uppercase tracking-wider shadow-sm z-10 pointer-events-none">
                Recomendado em Call
              </span>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isCallMode ? 'bg-purple-600 text-white shadow-tactile-sm' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Headphones size={20} />
                </div>
                <div>
                  <span className="font-black text-sm text-slate-900 block">Modo Call</span>
                  <span className="text-[10px] text-purple-700 font-extrabold uppercase tracking-wider">
                    Voz ou Presencial
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Para quem está no Discord, WhatsApp ou jogando lado a lado. Perguntem em voz alta e usem o site para organizar turnos e descarte!
              </p>
            </div>
          </div>
        </div>

        {/* 2. SEÇÃO: MODO DO BARALHO */}
        <div className="space-y-3">
          <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
            2. Escolha o Modo do Baralho:
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setMode('standard');
                setSelectedSavedDeckId(null);
              }}
              className={`py-3.5 px-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                mode === 'standard'
                  ? 'bg-sky-50 border-sky-400 text-sky-900 font-extrabold shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <LayoutGrid size={22} className={mode === 'standard' ? 'text-sky-600' : 'text-slate-400'} />
              <span className="text-xs font-bold">Modo Padrão</span>
              <span className="text-[10px] text-slate-400 font-medium">15 Caras clássicas</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                if (!currentUser) {
                  onOpenLogin();
                  return;
                }
                setMode('custom');
              }}
              className={`py-3.5 px-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${
                mode === 'custom'
                  ? 'bg-purple-50 border-purple-500 text-purple-900 font-extrabold shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {!currentUser && (
                <div className="absolute top-2 right-2 p-1 rounded-full bg-slate-100 text-slate-400">
                  <Lock size={12} />
                </div>
              )}
              <Palette size={22} className={mode === 'custom' ? 'text-purple-600' : 'text-slate-400'} />
              <span className="text-xs font-bold">Personalizado</span>
              <span className="text-[10px] text-slate-400 font-medium">
                {currentUser ? 'Suas próprias fotos' : 'Requer Login'}
              </span>
            </button>
          </div>

          {/* Seletor de Baralhos Salvos vs Novo Baralho (Quando Personalizado) */}
          {mode === 'custom' && (
            <div className="space-y-4 pt-1 animate-in fade-in">
              {(savedDecks.length > 0 || communityDecks.length > 0) && (
                <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-3.5 shadow-sm">
                  <div className="flex items-center justify-between mb-2.5">
                    {/* Abas: Seus Baralhos vs Comunidade */}
                    <div className="flex items-center gap-1 bg-purple-100/70 p-0.5 rounded-xl text-[11px] font-black">
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          setDeckSourceTab('my');
                        }}
                        className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                          deckSourceTab === 'my'
                            ? 'bg-white text-purple-900 shadow-xs'
                            : 'text-purple-700 hover:text-purple-900'
                        }`}
                      >
                        <Layers size={12} />
                        <span>Seus Baralhos ({savedDecks.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          setDeckSourceTab('community');
                        }}
                        className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                          deckSourceTab === 'community'
                            ? 'bg-white text-purple-900 shadow-xs'
                            : 'text-purple-700 hover:text-purple-900'
                        }`}
                      >
                        <Globe size={12} />
                        <span>Comunidade ({communityDecks.length})</span>
                      </button>
                    </div>

                    {deckSourceTab === 'my' && (
                      <button
                        type="button"
                        onClick={onOpenProfile}
                        className="text-[10px] font-extrabold text-purple-700 hover:text-purple-900 underline cursor-pointer"
                      >
                        Gerenciar
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {(deckSourceTab === 'my' ? savedDecks : communityDecks).length === 0 ? (
                      <div className="py-6 text-center text-xs text-purple-700 font-medium">
                        {deckSourceTab === 'my'
                          ? 'Você ainda não salvou baralhos no seu perfil.'
                          : 'Nenhum baralho público disponível no momento.'}
                      </div>
                    ) : (
                      (deckSourceTab === 'my' ? savedDecks : communityDecks).map((deck) => {
                        const isSelected = selectedSavedDeckId === deck.id;
                        return (
                          <div
                            key={deck.id}
                            onClick={() => {
                              sounds.playClick();
                              setSelectedSavedDeckId((prev) => (prev === deck.id ? null : deck.id));
                            }}
                            className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-purple-100/90 border-purple-500 shadow-sm ring-2 ring-purple-300'
                                : 'bg-white border-purple-100 hover:border-purple-300 hover:bg-purple-50/40'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate mr-2">
                              <div
                                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                                  isSelected ? 'bg-purple-600 text-white' : 'border-2 border-slate-300 bg-white'
                                }`}
                              >
                                {isSelected && <Check size={12} strokeWidth={3} />}
                              </div>
                              <div className="truncate">
                                <span className="font-extrabold text-xs text-slate-800 block truncate">
                                  {deck.name}
                                </span>
                                <span className="text-[10px] text-purple-600 font-bold">
                                  {deck.card_count} Caras • por {deck.author_name?.trim() ? deck.author_name : (deckSourceTab === 'my' ? (currentUser?.username || 'Você') : 'Jogador da Comunidade')}
                                </span>
                              </div>
                            </div>

                            {isSelected ? (
                              <span className="shrink-0 px-2 py-0.5 rounded-lg bg-purple-600 text-white text-[10px] font-black uppercase tracking-wider">
                                Selecionado
                              </span>
                            ) : (
                              <span className="shrink-0 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-bold">
                                Selecionar
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Opções de 30, 60 e 90 Caras para montar um novo */}
              <div>
                <label className="block text-xs font-extrabold text-purple-900 uppercase tracking-wider mb-1.5">
                  {(savedDecks.length > 0 || communityDecks.length > 0) ? 'Ou monte um baralho novo com:' : 'Quantidade de Caras Personalizadas:'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([30, 60, 90] as const).map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => {
                        sounds.playClick();
                        setSelectedSavedDeckId(null);
                        setCustomDifficulty(count);
                      }}
                      className={`py-3 px-2 rounded-2xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer ${
                        !selectedSavedDeckId && customDifficulty === count
                          ? 'bg-purple-600 border-purple-700 text-white font-black shadow-tactile-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 font-bold'
                      }`}
                    >
                      <span className="text-base font-black">{count}</span>
                      <span
                        className={`text-[10px] font-bold ${
                          !selectedSavedDeckId && customDifficulty === count ? 'text-purple-200' : 'text-slate-500'
                        }`}
                      >
                        Caras
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. SEÇÃO: VISIBILIDADE DA SALA */}
        <div className="space-y-3 bg-slate-50 border border-slate-200 p-4 rounded-2xl">
          <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
            3. Privacidade da Sala:
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setIsSecretRoom(false);
              }}
              className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                !isSecretRoom
                  ? 'bg-white border-emerald-500 text-emerald-800 shadow-sm font-black'
                  : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
              }`}
            >
              <Globe size={15} className={!isSecretRoom ? 'text-emerald-600' : 'text-slate-400'} />
              <span>Sala Pública</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setIsSecretRoom(true);
              }}
              className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isSecretRoom
                  ? 'bg-white border-amber-500 text-amber-900 shadow-sm font-black'
                  : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
              }`}
            >
              <Lock size={15} className={isSecretRoom ? 'text-amber-600' : 'text-slate-400'} />
              <span>Sala Secreta</span>
            </button>
          </div>

          {isSecretRoom && (
            <div className="pt-1 animate-in fade-in">
              <label className="block text-[11px] font-extrabold text-amber-900 mb-1">
                Defina uma Senha Numérica:
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="Ex: 1234"
                  value={secretPassword}
                  onChange={(e) => setSecretPassword(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full bg-white border-2 border-amber-300 text-slate-900 font-sans font-black tracking-widest text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
                />
                <KeyRound size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500" />
              </div>
              <span className="text-[10px] text-amber-700 block mt-1">
                🔒 Requerida para que outros jogadores possam entrar.
              </span>
            </div>
          )}
        </div>

        {/* Botão de Ação Final */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isConnecting || (isSecretRoom && !secretPassword.trim())}
            className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-black text-sm uppercase tracking-wider shadow-[0_4px_0_#059669] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
          >
            {isConnecting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : mode === 'custom' && !selectedSavedDeckId ? (
              <Wand2 size={18} />
            ) : (
              <Play size={18} />
            )}
            <span>
              {mode === 'custom'
                ? selectedSavedDeck
                  ? `Criar e Abrir Lobby (${selectedSavedDeck.name})`
                  : `Montar Baralho (${customDifficulty} Caras) ➔`
                : 'Criar e Abrir Lobby'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
