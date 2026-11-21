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
    <div className="max-w-2xl w-full mx-auto px-4 py-6 sm:py-8 animate-in fade-in duration-200">
      {/* Botão Voltar */}
      <div className="flex items-center justify-between mb-5">
        <button
          type="button"
          onClick={() => {
            sounds.playClick();
            onBackToHome();
          }}
          className="flex items-center gap-1.5 text-xs font-bold text-[#776156] hover:text-[#382C26] bg-white border border-[#E8E0D8] hover:border-[#D4C7BC] px-3.5 py-2 rounded-xl transition-all cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Voltar ao Menu</span>
        </button>
      </div>

      {/* Cartão Principal */}
      <div className="bg-white border border-[#E8E0D8] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        {/* Cabeçalho */}
        <div className="border-b border-[#E8E0D8] pb-5">
          <h2 className="text-xl sm:text-2xl font-bold text-[#382C26] tracking-tight">
            Configurar Nova Partida
          </h2>
          <p className="text-xs sm:text-sm text-[#8C786E] mt-1">
            Escolha o formato da rodada, baralho e visibilidade da sala
          </p>
        </div>

        {/* 1. SEÇÃO: MODO DE JOGO & MODO CALL */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-[#382C26] uppercase tracking-wider">
            1. Formato de Comunicação:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Opção A: Perguntas pelo Site */}
            <div
              onClick={() => {
                sounds.playClick();
                setIsCallMode(false);
              }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                !isCallMode
                  ? 'bg-[#FFE8E0]/40 border-[#C25E3E] shadow-xs'
                  : 'bg-[#FAF6F0] border-[#E8E0D8] hover:border-[#D4C7BC]'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    !isCallMode ? 'bg-[#C25E3E] text-white' : 'bg-white border border-[#E8E0D8] text-[#776156]'
                  }`}
                >
                  <MessageSquareQuote size={20} />
                </div>
                <div>
                  <span className="font-bold text-sm text-[#382C26] block">Perguntas no Jogo</span>
                  <span className="text-[10px] text-[#C25E3E] font-bold uppercase tracking-wider">
                    Modo Tradicional
                  </span>
                </div>
              </div>
              <p className="text-xs text-[#8C786E] leading-relaxed">
                As perguntas são feitas pelo chat e o oponente responde com SIM ou NÃO no tabuleiro.
              </p>
            </div>

            {/* Opção B: Modo Call (Por Voz / Presencial) */}
            <div
              onClick={() => {
                sounds.playClick();
                setIsCallMode(true);
              }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative ${
                isCallMode
                  ? 'bg-[#FFE8E0]/40 border-[#C25E3E] shadow-xs'
                  : 'bg-[#FAF6F0] border-[#E8E0D8] hover:border-[#D4C7BC]'
              }`}
            >
              <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-[#382C26] text-white text-[9px] font-bold uppercase tracking-wider shadow-xs z-10 pointer-events-none">
                Em chamada de voz
              </span>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isCallMode ? 'bg-[#C25E3E] text-white' : 'bg-white border border-[#E8E0D8] text-[#776156]'
                  }`}
                >
                  <Headphones size={20} />
                </div>
                <div>
                  <span className="font-bold text-sm text-[#382C26] block">Modo Call</span>
                  <span className="text-[10px] text-[#776156] font-bold uppercase tracking-wider">
                    Discord / WhatsApp
                  </span>
                </div>
              </div>
              <p className="text-xs text-[#8C786E] leading-relaxed">
                Para quem está conversando por áudio. Conversem em voz alta e usem o site para virar cartas e dar palpites!
              </p>
            </div>
          </div>
        </div>

        {/* 2. SEÇÃO: MODO DO BARALHO */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-[#382C26] uppercase tracking-wider">
            2. Escolha o Baralho:
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setMode('standard');
                setSelectedSavedDeckId(null);
              }}
              className={`py-3.5 px-4 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                mode === 'standard'
                  ? 'bg-[#FFE8E0]/40 border-[#C25E3E] text-[#382C26] font-bold shadow-xs'
                  : 'bg-[#FAF6F0] border-[#E8E0D8] text-[#776156] hover:border-[#D4C7BC]'
              }`}
            >
              <LayoutGrid size={22} className={mode === 'standard' ? 'text-[#C25E3E]' : 'text-[#8C786E]'} />
              <span className="text-xs font-bold">Modo Clássico</span>
              <span className="text-[10px] text-[#8C786E]">15 Cartas clássicas</span>
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
              className={`py-3.5 px-4 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${
                mode === 'custom'
                  ? 'bg-[#FFE8E0]/40 border-[#C25E3E] text-[#382C26] font-bold shadow-xs'
                  : 'bg-[#FAF6F0] border-[#E8E0D8] text-[#776156] hover:border-[#D4C7BC]'
              }`}
            >
              {!currentUser && (
                <div className="absolute top-2 right-2 p-1 rounded-full bg-white text-[#8C786E] border border-[#E8E0D8]">
                  <Lock size={12} />
                </div>
              )}
              <Palette size={22} className={mode === 'custom' ? 'text-[#C25E3E]' : 'text-[#8C786E]'} />
              <span className="text-xs font-bold">Personalizado</span>
              <span className="text-[10px] text-[#8C786E]">
                {currentUser ? 'Suas próprias fotos' : 'Requer Login'}
              </span>
            </button>
          </div>

          {/* Seletor de Baralhos Salvos vs Novo Baralho (Quando Personalizado) */}
          {mode === 'custom' && (
            <div className="space-y-4 pt-1 animate-in fade-in">
              {(savedDecks.length > 0 || communityDecks.length > 0) && (
                <div className="bg-[#FAF6F0] border border-[#E8E0D8] rounded-2xl p-3.5">
                  <div className="flex items-center justify-between mb-2.5">
                    {/* Abas: Seus Baralhos vs Comunidade */}
                    <div className="flex items-center gap-1 bg-white p-0.5 rounded-xl border border-[#E8E0D8] text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          setDeckSourceTab('my');
                        }}
                        className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                          deckSourceTab === 'my'
                            ? 'bg-[#FFE8E0] text-[#C25E3E]'
                            : 'text-[#776156] hover:text-[#382C26]'
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
                            ? 'bg-[#FFE8E0] text-[#C25E3E]'
                            : 'text-[#776156] hover:text-[#382C26]'
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
                        className="text-[11px] font-bold text-[#C25E3E] hover:text-[#A94E31] underline cursor-pointer"
                      >
                        Gerenciar
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {(deckSourceTab === 'my' ? savedDecks : communityDecks).length === 0 ? (
                      <div className="py-6 text-center text-xs text-[#8C786E]">
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
                                ? 'bg-[#FFE8E0]/60 border-[#C25E3E] shadow-xs'
                                : 'bg-white border-[#E8E0D8] hover:border-[#D4C7BC]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate mr-2">
                              <div
                                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                                  isSelected ? 'bg-[#C25E3E] text-white' : 'border border-[#D4C7BC] bg-white'
                                }`}
                              >
                                {isSelected && <Check size={12} strokeWidth={3} />}
                              </div>
                              <div className="truncate">
                                <span className="font-bold text-xs text-[#382C26] block truncate">
                                  {deck.name}
                                </span>
                                <span className="text-[10px] text-[#8C786E]">
                                  {deck.card_count} Caras • por {deck.author_name?.trim() ? deck.author_name : (deckSourceTab === 'my' ? (currentUser?.username || 'Você') : 'Jogador da Comunidade')}
                                </span>
                              </div>
                            </div>

                            {isSelected ? (
                              <span className="shrink-0 px-2 py-0.5 rounded-lg bg-[#C25E3E] text-white text-[10px] font-bold uppercase tracking-wider">
                                Selecionado
                              </span>
                            ) : (
                              <span className="shrink-0 px-2 py-0.5 rounded-lg bg-[#FAF6F0] text-[#776156] text-[10px] font-semibold">
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
                <label className="block text-xs font-bold text-[#382C26] uppercase tracking-wider mb-1.5">
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
                      className={`py-3 px-2 rounded-2xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                        !selectedSavedDeckId && customDifficulty === count
                          ? 'bg-[#C25E3E] border-[#A94E31] text-white font-bold'
                          : 'bg-[#FAF6F0] border-[#E8E0D8] text-[#776156] hover:border-[#D4C7BC] font-semibold'
                      }`}
                    >
                      <span className="text-base font-bold">{count}</span>
                      <span
                        className={`text-[10px] ${
                          !selectedSavedDeckId && customDifficulty === count ? 'text-white/80' : 'text-[#8C786E]'
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
        <div className="space-y-3 bg-[#FAF6F0] border border-[#E8E0D8] p-4 rounded-2xl">
          <label className="block text-xs font-bold text-[#382C26] uppercase tracking-wider">
            3. Visibilidade da Sala:
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
                  ? 'bg-white border-[#2E7D32] text-[#2E7D32] shadow-xs'
                  : 'bg-white/60 border-[#E8E0D8] text-[#776156] hover:bg-white'
              }`}
            >
              <Globe size={15} className={!isSecretRoom ? 'text-[#2E7D32]' : 'text-[#8C786E]'} />
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
                  ? 'bg-white border-[#C25E3E] text-[#C25E3E] shadow-xs'
                  : 'bg-white/60 border-[#E8E0D8] text-[#776156] hover:bg-white'
              }`}
            >
              <Lock size={15} className={isSecretRoom ? 'text-[#C25E3E]' : 'text-[#8C786E]'} />
              <span>Sala com Senha</span>
            </button>
          </div>

          {isSecretRoom && (
            <div className="pt-1 animate-in fade-in">
              <label className="block text-[11px] font-bold text-[#776156] mb-1">
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
                  className="w-full bg-white border border-[#E8E0D8] text-[#382C26] font-sans font-bold tracking-widest text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-[#C25E3E]"
                />
                <KeyRound size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#776156]" />
              </div>
              <span className="text-[10px] text-[#8C786E] block mt-1">
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
            className="w-full flex items-center justify-center gap-2 py-3.5 sm:py-4 px-6 rounded-xl bg-[#C25E3E] hover:bg-[#A94E31] active:bg-[#944228] disabled:opacity-50 text-white font-bold text-sm uppercase tracking-wider transition-all cursor-pointer shadow-none"
          >
            {isConnecting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : mode === 'custom' && !selectedSavedDeckId ? (
              <Wand2 size={18} />
            ) : (
              <Play size={18} className="fill-white" />
            )}
            <span>
              {mode === 'custom'
                ? selectedSavedDeck
                  ? `Criar Partida (${selectedSavedDeck.name})`
                  : `Montar Baralho (${customDifficulty} Caras) ➔`
                : 'Criar Partida'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
