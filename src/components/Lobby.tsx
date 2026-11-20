import { useState, useEffect, type FC } from 'react';
import {
  Copy,
  Check,
  RotateCcw,
  X,
  Compass,
  Plus,
  Eye,
  EyeOff,
  Share2,
} from 'lucide-react';
import { sounds } from '../utils/sound';
import { network } from '../services/network';
import type { DifficultyCount, RoomConfig, Character } from '../types/game';
import { auth, type AppUser, type SavedDeck } from '../services/auth';
import { MOCK_90_CHARACTERS } from './redesign/mockData';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { SegmentedControl } from './ui/SegmentedControl';
import { Radio } from './ui/Radio';
import { Checkbox } from './ui/Checkbox';
import { HeroGamePreview } from './HeroGamePreview';

interface LobbyProps {
  onJoinRoom: (roomCode: string, playerName: string, isHost: boolean, config: RoomConfig, password?: string) => void;
  onOpenCreateLobby: (playerName: string) => void;
  onOpenDeckBuilder?: (targetCount: DifficultyCount, isSecret?: boolean, password?: string) => void;
  onOpenLogin: () => void;
  onOpenProfile: () => void;
  onOpenPublicLobbies: () => void;
  onOpenCommunity: () => void;
  onSelectSavedDeck?: (deck: SavedDeck) => void;
  onAbandonWaiting?: () => void;
  currentUser: AppUser | null;
  onLogout: () => void;
  isConnecting: boolean;
  waitingForPlayer: boolean;
  roomCode: string;
  errorMessage?: string | null;
  reconnectSession?: any | null;
  reconnectSecondsLeft?: number;
  onReconnectMatch?: (session: any) => void;
  onDismissReconnect?: () => void;
  roomConfig?: RoomConfig;
  onUpdateConfig?: (newConfig: RoomConfig) => void;
  isConfiguringRoom?: boolean;
  onStartConfiguringRoom?: () => void;
  onCancelConfiguringRoom?: () => void;
}

const FUN_NICKNAMES = [
  'Detetive Pipoca',
  'Detetive Farofa',
  'Detetive Sherlock',
  'Detetive Raposa',
  'Detetive Curioso',
  'Detetive Malandro',
  'Detetive Coxinha',
  'Detetive Tapioca',
  'Detetive Pão de Queijo',
];

const getRandomNickname = () => {
  return FUN_NICKNAMES[Math.floor(Math.random() * FUN_NICKNAMES.length)];
};

export const Lobby: FC<LobbyProps> = ({
  onJoinRoom,
  onOpenDeckBuilder,
  onOpenLogin: _onOpenLogin,
  onOpenPublicLobbies: _onOpenPublicLobbies,
  onOpenCommunity,
  onAbandonWaiting,
  currentUser,
  isConnecting,
  waitingForPlayer,
  roomCode,
  errorMessage,
  reconnectSession,
  reconnectSecondsLeft = 0,
  onReconnectMatch,
  onDismissReconnect,
  roomConfig,
  isConfiguringRoom: propIsConfiguringRoom,
  onStartConfiguringRoom,
  onCancelConfiguringRoom,
}) => {
  // Apelido do jogador
  const [name, setName] = useState<string>(() => {
    return currentUser?.username || localStorage.getItem('cara_player_name') || getRandomNickname();
  });

  // Códigos e Gaveta de Entrada
  const [inputCode, setInputCode] = useState('');
  const [showCodeDrawer, setShowCodeDrawer] = useState(false);

  // Link de Convidado direto da URL (?sala=XXXX)
  const [guestRoomCode, setGuestRoomCode] = useState<string | null>(null);
  const [guestRequiresPassword, setGuestRequiresPassword] = useState(false);
  const [guestPassword, setGuestPassword] = useState('');
  const [showGuestPassword, setShowGuestPassword] = useState(false);
  const [guestPasswordError, setGuestPasswordError] = useState<string | null>(null);

  // Feedbacks de Cópia
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Configuração prévia de sala
  const [localIsConfiguring, setLocalIsConfiguring] = useState(false);
  const isConfiguring = propIsConfiguringRoom !== undefined ? propIsConfiguringRoom : localIsConfiguring;

  const [hostDeckName, setHostDeckName] = useState(() => (roomConfig?.deckName && roomConfig.deckName !== 'Turma do Clássico') ? roomConfig.deckName : 'Aleatório #1');
  const [hostCardCount, setHostCardCount] = useState<DifficultyCount>(() => (roomConfig?.cardCount as DifficultyCount) || 30);
  const [hostCustomCards, setHostCustomCards] = useState<Character[]>(() => {
    if (roomConfig?.customCards && roomConfig.customCards.length > 0) {
      return roomConfig.customCards;
    }
    return MOCK_90_CHARACTERS.slice(0, 30);
  });
  const [hostIsCallMode, setHostIsCallMode] = useState(() => Boolean(roomConfig?.isCallMode));
  const [hostHasPassword, setHostHasPassword] = useState(false);
  const [hostPassword, setHostPassword] = useState('');
  const [showHostPassword, setShowHostPassword] = useState(false);
  const [hostPasswordError, setHostPasswordError] = useState<string | null>(null);

  // Menu de troca de baralho dentro de Configurar Partida
  const [showDeckPicker, setShowDeckPicker] = useState(false);
  const [mySavedDecks, setMySavedDecks] = useState<SavedDeck[]>([]);

  // Sincronizar regras caso sejam alteradas externamente (ex.: selecionado na comunidade)
  useEffect(() => {
    if (roomConfig) {
      if (roomConfig.deckName && roomConfig.deckName !== 'Turma do Clássico') {
        setHostDeckName(roomConfig.deckName);
      }
      if (roomConfig.cardCount) {
        setHostCardCount(roomConfig.cardCount as DifficultyCount);
      }
      if (roomConfig.customCards && roomConfig.customCards.length > 0) {
        setHostCustomCards(roomConfig.customCards);
      }
      if (roomConfig.isCallMode !== undefined) {
        setHostIsCallMode(Boolean(roomConfig.isCallMode));
      }
    }
  }, [roomConfig]);

  // Carregar baralhos do usuário ao abrir o seletor
  useEffect(() => {
    if (currentUser?.id && showDeckPicker) {
      auth.getUserSavedDecks(currentUser.id).then(setMySavedDecks).catch(() => {});
    }
  }, [currentUser, showDeckPicker]);

  // Sincronizar nome de usuário
  useEffect(() => {
    if (currentUser?.username) {
      setName(currentUser.username);
    }
  }, [currentUser]);

  // Detectar convite direto na URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlRoom = urlParams.get('sala') || urlParams.get('room');
    if (urlRoom && urlRoom.trim().length >= 4) {
      setGuestRoomCode(urlRoom.trim().toUpperCase());
    }
    if (urlParams.get('protegida') === '1' || urlParams.get('senha') === '1') {
      setGuestRequiresPassword(true);
    }
  }, []);

  const handleStartConfiguring = () => {
    sounds.playClick();
    if (onStartConfiguringRoom) {
      onStartConfiguringRoom();
    } else {
      setLocalIsConfiguring(true);
    }
    if (!hostDeckName || hostDeckName === 'Turma do Clássico') {
      setHostDeckName('Aleatório #1');
      setHostCustomCards(MOCK_90_CHARACTERS.slice(0, hostCardCount));
    }
  };

  const handleCancelConfiguring = () => {
    sounds.playClick();
    if (onCancelConfiguringRoom) {
      onCancelConfiguringRoom();
    } else {
      setLocalIsConfiguring(false);
    }
    setShowDeckPicker(false);
  };

  const handleCreateAndLaunchRoom = async () => {
    if (hostHasPassword && hostPassword.trim().length < 4) {
      setHostPasswordError('A senha precisa ter pelo menos 4 caracteres.');
      sounds.playWrong();
      return;
    }

    sounds.playClick();
    const playerName = name.trim() || getRandomNickname();
    localStorage.setItem('cara_player_name', playerName);

    const isSecret = hostHasPassword && hostPassword.trim().length >= 4;
    const pwd = isSecret ? hostPassword.trim() : undefined;
    const finalCards = hostCustomCards && hostCustomCards.length > 0 
      ? hostCustomCards.slice(0, hostCardCount) 
      : MOCK_90_CHARACTERS.slice(0, hostCardCount);
    const finalDeckName = hostDeckName || 'Aleatório #1';

    try {
      const code = await network.generateUniqueRoomCode();
      if (onCancelConfiguringRoom) onCancelConfiguringRoom();
      setLocalIsConfiguring(false);
      onJoinRoom(code, playerName, true, {
        mode: 'custom',
        cardCount: hostCardCount,
        deckName: finalDeckName,
        customCards: finalCards,
        isCallMode: hostIsCallMode,
        password: pwd,
        isSecret,
      });
    } catch {
      const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
      if (onCancelConfiguringRoom) onCancelConfiguringRoom();
      setLocalIsConfiguring(false);
      onJoinRoom(randomCode, playerName, true, {
        mode: 'custom',
        cardCount: hostCardCount,
        deckName: finalDeckName,
        customCards: finalCards,
        isCallMode: hostIsCallMode,
        password: pwd,
        isSecret,
      });
    }
  };

  const handleJoinWithCode = (codeToJoin?: string, passwordInput?: string) => {
    const targetCode = (codeToJoin || inputCode).trim().toUpperCase();
    if (!targetCode) return;

    sounds.playClick();
    const playerName = name.trim() || getRandomNickname();
    localStorage.setItem('cara_player_name', playerName);

    onJoinRoom(
      targetCode,
      playerName,
      false,
      {
        mode: 'custom',
        cardCount: 30,
      },
      passwordInput
    );
  };

  const isRoomPasswordProtected = hostHasPassword && hostPassword.trim().length >= 4;
  const waitingInviteUrl = `${window.location.origin}${window.location.pathname}?sala=${roomCode}${
    isRoomPasswordProtected ? '&protegida=1' : ''
  }`;

  const copyRoomCode = async () => {
    sounds.playClick();
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2400);
    } catch {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2400);
    }
  };

  const copyInviteLink = async () => {
    sounds.playClick();
    try {
      await navigator.clipboard.writeText(waitingInviteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2400);
    } catch {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2400);
    }
  };

  const handleShareWhatsApp = () => {
    sounds.playClick();
    const msgText = isRoomPasswordProtected
      ? `Bora jogar Tá na Cara! A sala #${roomCode} tem senha. Entra aí: ${waitingInviteUrl}`
      : `Bora jogar Tá na Cara! Entra aí: ${waitingInviteUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msgText)}`, '_blank');
  };

  const handleCopyDiscord = () => {
    sounds.playClick();
    const discordText = isRoomPasswordProtected
      ? `**Tá na Cara!** Bora jogar uma partida agora? Entra aí na sala **#${roomCode}** (com senha): ${waitingInviteUrl}`
      : `**Tá na Cara!** Bora jogar uma partida agora? Entra aí na sala **#${roomCode}**: ${waitingInviteUrl}`;
    navigator.clipboard.writeText(discordText);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2400);
  };

  // =========================================================================
  // CENÁRIO A: ENTRADA DO CONVIDADO VIA LINK (?sala=XXXX)
  // =========================================================================
  if (guestRoomCode && !waitingForPlayer) {
    return (
      <div className="w-full max-w-[460px] mx-auto py-12 px-4 text-left animate-in fade-in duration-150">
        <h2 className="font-serif text-3xl font-normal text-[#2B2420] mb-2">
          Entrar na partida
        </h2>
        <p className="text-sm text-[#6F655C] font-sans mb-6">
          Seu amigo te convidou para descobrir o personagem misterioso na sala <strong className="font-mono text-[#2B2420]">#{guestRoomCode}</strong>.
        </p>

        <div className="space-y-4 mb-6">
          <div>
            <label className="text-xs font-medium text-[#6F655C] uppercase tracking-wider block mb-1.5">
              Seu apelido
            </label>
            <Input
              value={name}
              maxLength={22}
              onChange={(e) => setName(e.target.value)}
              placeholder="Digite seu nome ou apelido"
            />
          </div>

          {guestRequiresPassword && (
            <div>
              <label className="text-xs font-medium text-[#6F655C] uppercase tracking-wider block mb-1.5">
                Senha da sala
              </label>
              <div className="relative">
                <Input
                  type={showGuestPassword ? 'text' : 'password'}
                  value={guestPassword}
                  maxLength={30}
                  onChange={(e) => {
                    setGuestPassword(e.target.value);
                    setGuestPasswordError(null);
                  }}
                  placeholder="Senha definida pelo anfitrião"
                  error={Boolean(guestPasswordError)}
                />
                <button
                  type="button"
                  onClick={() => setShowGuestPassword(!showGuestPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A39A90] hover:text-[#2B2420] cursor-pointer"
                >
                  {showGuestPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {guestPasswordError && (
                <p className="text-xs text-[#8C2E2A] mt-1">{guestPasswordError}</p>
              )}
            </div>
          )}
        </div>

        <Button
          size="lg"
          className="w-full mb-3"
          disabled={!name.trim() || isConnecting}
          onClick={() => {
            if (guestRequiresPassword && guestPassword.trim().length < 4) {
              setGuestPasswordError('Digite a senha da sala (mínimo de 4 caracteres).');
              return;
            }
            handleJoinWithCode(guestRoomCode, guestRequiresPassword ? guestPassword.trim() : undefined);
          }}
        >
          {isConnecting ? 'Entrando...' : 'Entrar na partida'}
        </Button>

        <div className="text-center">
          <Button
            variant="text"
            onClick={() => {
              sounds.playClick();
              setGuestRoomCode(null);
              window.history.replaceState({}, document.title, window.location.pathname);
            }}
          >
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // CENÁRIO B: SCREEN 2 - SALA CRIADA (waitingForPlayer === true)
  // =========================================================================
  if (waitingForPlayer) {
    const dynamicLabel = hostIsCallMode ? 'Por voz ou chamada' : 'Perguntas no jogo';
    const accessLabel = hostHasPassword ? 'Com senha' : 'Sala livre';

    return (
      <div className="w-full max-w-[520px] mx-auto py-10 sm:py-16 px-4 text-center animate-in fade-in duration-150">
        <span className="text-xs font-medium text-[#6F655C] uppercase tracking-wider block mb-1">
          Código da sala
        </span>

        {/* Código grande em Fraunces */}
        <div className="font-serif text-6xl sm:text-7xl font-normal text-[#2B2420] tracking-wide select-all my-4">
          {roomCode}
        </div>

        {/* Resumo editorial em uma linha */}
        <p className="text-sm text-[#6F655C] font-sans mb-8">
          {hostDeckName} · {hostCardCount} cartas · {dynamicLabel} · {accessLabel}
        </p>

        {/* Botões de ação em texto / discretos */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          <button
            type="button"
            onClick={copyRoomCode}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#2B2420] bg-[#FBF8F3] hover:bg-[#F2ECE1] border border-[#E2DACD] rounded-[6px] transition-colors cursor-pointer"
          >
            {copiedCode ? <Check size={13} className="text-[#2E7D32]" /> : <Copy size={13} />}
            <span>{copiedCode ? 'Código copiado!' : 'Copiar código'}</span>
          </button>

          <button
            type="button"
            onClick={copyInviteLink}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#2B2420] bg-[#FBF8F3] hover:bg-[#F2ECE1] border border-[#E2DACD] rounded-[6px] transition-colors cursor-pointer"
          >
            {copiedLink ? <Check size={13} className="text-[#2E7D32]" /> : <Share2 size={13} />}
            <span>{copiedLink ? 'Link copiado!' : 'Copiar link'}</span>
          </button>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#2B2420] bg-[#FBF8F3] hover:bg-[#F2ECE1] border border-[#E2DACD] rounded-[6px] transition-colors cursor-pointer"
          >
            <span>WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handleCopyDiscord}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#2B2420] bg-[#FBF8F3] hover:bg-[#F2ECE1] border border-[#E2DACD] rounded-[6px] transition-colors cursor-pointer"
          >
            <span>Discord</span>
          </button>
        </div>

        {/* Indicador de espera: texto sutil com ponto pulsando */}
        <div className="flex items-center justify-center gap-2 text-sm text-[#6F655C] py-3">
          <span className="w-2 h-2 rounded-full bg-[#B4532F] animate-pulse" />
          <span>Aguardando seu amigo entrar...</span>
        </div>

        {/* Link discreto de cancelamento */}
        {onAbandonWaiting && (
          <div className="mt-6">
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                onAbandonWaiting();
              }}
              className="text-xs text-[#6F655C] hover:text-[#B4532F] underline underline-offset-4 transition-colors cursor-pointer"
            >
              Cancelar sala
            </button>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // CENÁRIO C: SCREEN 1 - CONFIGURAR PARTIDA (isConfiguring === true)
  // =========================================================================
  if (isConfiguring && !waitingForPlayer) {
    return (
      <div className="w-full max-w-[520px] mx-auto py-8 sm:py-12 px-4 text-left animate-in fade-in duration-150">
        {/* Top Link */}
        <div className="mb-4">
          <button
            type="button"
            onClick={handleCancelConfiguring}
            className="inline-flex items-center gap-1 text-xs text-[#6F655C] hover:text-[#2B2420] transition-colors cursor-pointer"
          >
            <span>← Voltar ao menu</span>
          </button>
        </div>

        {/* Título Fraunces */}
        <h2 className="font-serif text-3xl font-normal text-[#2B2420] mb-1">
          Configurar partida
        </h2>
        <p className="text-sm text-[#6F655C] font-sans mb-8">
          Escolha o baralho e as regras. O código só será gerado após confirmar.
        </p>

        <div className="space-y-6">
          {/* 1. Baralho da Partida */}
          <div className="border-b border-[#E2DACD] pb-5">
            <span className="text-xs font-medium text-[#6F655C] uppercase tracking-wider block mb-2">
              Baralho da partida
            </span>

            <div className="flex items-baseline justify-between gap-4">
              <div className="min-w-0">
                <span className="font-serif text-xl text-[#2B2420] font-normal block truncate">
                  {hostDeckName || 'Aleatório #1'}
                </span>
                <span className="text-xs text-[#6F655C] block mt-0.5">
                  {hostCardCount} cartas no jogo
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowDeckPicker(!showDeckPicker)}
                className="text-sm font-semibold text-[#B4532F] hover:text-[#984323] hover:underline underline-offset-4 transition-colors cursor-pointer shrink-0"
              >
                {showDeckPicker ? 'Fechar' : 'Trocar'}
              </button>
            </div>

            {/* Menu expandido de escolha de baralho */}
            {showDeckPicker && (
              <div className="mt-4 pt-4 border-t border-[#E2DACD] space-y-3 animate-in fade-in duration-150">
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      onOpenCommunity();
                    }}
                    className="flex-1 p-3 text-left border border-[#E2DACD] rounded-[6px] bg-[#FBF8F3] hover:bg-white hover:border-[#2B2420] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#2B2420] mb-0.5">
                      <Compass size={14} className="text-[#B4532F]" />
                      <span>Explorar na Comunidade</span>
                    </div>
                    <span className="text-[11px] text-[#6F655C]">Descubra dezenas de baralhos criados por jogadores</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      onOpenDeckBuilder?.(hostCardCount);
                    }}
                    className="flex-1 p-3 text-left border border-[#E2DACD] rounded-[6px] bg-[#FBF8F3] hover:bg-white hover:border-[#2B2420] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#2B2420] mb-0.5">
                      <Plus size={14} className="text-[#B4532F]" />
                      <span>Criar Novo Baralho</span>
                    </div>
                    <span className="text-[11px] text-[#6F655C]">Monte um baralho próprio com fotos e nomes</span>
                  </button>
                </div>

                {/* Baralhos salvos do usuário se houver */}
                {mySavedDecks.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[11px] font-medium text-[#6F655C] uppercase tracking-wider block mb-2">
                      Seus baralhos salvos
                    </span>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {mySavedDecks.map((deck) => (
                        <div
                          key={deck.id}
                          onClick={() => {
                            sounds.playClick();
                            setHostDeckName(deck.name);
                            setHostCardCount((deck.card_count as DifficultyCount) || 30);
                            setHostCustomCards(deck.cards);
                            setShowDeckPicker(false);
                          }}
                          className="p-2.5 rounded-[6px] border border-[#E2DACD] bg-[#FBF8F3] hover:bg-white flex items-center justify-between text-xs cursor-pointer transition-colors"
                        >
                          <span className="font-medium text-[#2B2420] truncate">{deck.name}</span>
                          <span className="text-[#6F655C] shrink-0">{deck.card_count} cartas</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Quantidade de Cartas */}
          <div className="border-b border-[#E2DACD] pb-5">
            <span className="text-xs font-medium text-[#6F655C] uppercase tracking-wider block mb-2.5">
              Quantidade de cartas
            </span>
            <SegmentedControl
              className="w-full"
              options={[
                { value: 15, label: '15 cartas' },
                { value: 30, label: '30 cartas' },
                { value: 60, label: '60 cartas' },
                { value: 90, label: '90 cartas' },
              ]}
              value={hostCardCount}
              onChange={(count) => {
                sounds.playClick();
                setHostCardCount(count as DifficultyCount);
                setHostCustomCards(MOCK_90_CHARACTERS.slice(0, count));
              }}
            />
          </div>

          {/* 3. Dinâmica da Rodada */}
          <div className="border-b border-[#E2DACD] pb-5">
            <span className="text-xs font-medium text-[#6F655C] uppercase tracking-wider block mb-3">
              Dinâmica da rodada
            </span>
            <div className="space-y-3">
              <Radio
                id="mode-game"
                name="dynamics"
                checked={!hostIsCallMode}
                onChange={() => {
                  sounds.playClick();
                  setHostIsCallMode(false);
                }}
                label="Perguntas no jogo"
                description="Com digitação, botões Sim/Não e timer regressivo"
              />
              <Radio
                id="mode-call"
                name="dynamics"
                checked={hostIsCallMode}
                onChange={() => {
                  sounds.playClick();
                  setHostIsCallMode(true);
                }}
                label="Por voz ou chamada"
                description="Falem diretamente por Discord ou ligação, sem timer no jogo"
              />
            </div>
          </div>

          {/* 4. Senha da Sala */}
          <div className="border-b border-[#E2DACD] pb-5">
            <Checkbox
              id="protect-pwd"
              checked={hostHasPassword}
              onChange={(e) => {
                sounds.playClick();
                const checked = e.target.checked;
                setHostHasPassword(checked);
                if (!checked) {
                  setHostPassword('');
                  setHostPasswordError(null);
                }
              }}
              label="Proteger sala com senha"
              description="Exige senha para o seu amigo entrar na partida"
            />

            {hostHasPassword && (
              <div className="mt-3 relative animate-in fade-in duration-150">
                <Input
                  type={showHostPassword ? 'text' : 'password'}
                  value={hostPassword}
                  onChange={(e) => {
                    const val = e.target.value;
                    setHostPassword(val);
                    if (val.trim().length > 0 && val.trim().length < 4) {
                      setHostPasswordError('A senha precisa ter pelo menos 4 caracteres.');
                    } else {
                      setHostPasswordError(null);
                    }
                  }}
                  placeholder="Mínimo de 4 caracteres"
                  maxLength={30}
                  error={Boolean(hostPasswordError)}
                />
                <button
                  type="button"
                  onClick={() => setShowHostPassword(!showHostPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A39A90] hover:text-[#2B2420] cursor-pointer"
                >
                  {showHostPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            )}
            {hostPasswordError && (
              <p className="text-xs text-[#8C2E2A] mt-1">{hostPasswordError}</p>
            )}
          </div>
        </div>

        {/* Botão Primário Único */}
        <div className="pt-6">
          <Button
            size="lg"
            className="w-full mb-3"
            disabled={isConnecting}
            onClick={handleCreateAndLaunchRoom}
          >
            {isConnecting ? 'Criar sala...' : 'Criar sala'}
          </Button>

          <div className="text-center">
            <Button
              variant="text"
              onClick={handleCancelConfiguring}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // CENÁRIO D: SCREEN 5 - HERO / HOME PRINCIPAL (Mesa de Jogo)
  // =========================================================================
  return (
    <div className="w-full flex flex-col items-center">
      {/* Banner de Reconexão Rápida */}
      {reconnectSession && reconnectSecondsLeft > 0 && onReconnectMatch && (
        <div className="w-full max-w-5xl mx-auto px-4 mb-6">
          <div className="bg-[#2B2420] text-white rounded-[8px] p-4 flex flex-col sm:flex-row items-center justify-between gap-3 border border-[#2B2420]">
            <div className="flex items-center gap-3">
              <RotateCcw size={18} className="text-[#B4532F] animate-spin-slow shrink-0" />
              <div className="text-left text-xs">
                <span className="font-semibold block text-white">
                  Partida em andamento na Sala #{reconnectSession.roomCode}
                </span>
                <span className="text-[#A39A90]">
                  Você tem {Math.floor(reconnectSecondsLeft / 60)}:{String(reconnectSecondsLeft % 60).padStart(2, '0')} para reconectar.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="primary"
                onClick={() => onReconnectMatch(reconnectSession)}
              >
                Reconectar
              </Button>
              {onDismissReconnect && (
                <button
                  onClick={onDismissReconnect}
                  className="p-1 text-[#A39A90] hover:text-white cursor-pointer"
                  title="Dispensar"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Alerta de Erro */}
      {errorMessage && (
        <div className="w-full max-w-5xl mx-auto px-4 mb-6">
          <div className="p-3 text-xs font-medium text-[#8C2E2A] bg-[#F8EBEA] border border-[#ECC7C5] rounded-[6px]">
            {errorMessage}
          </div>
        </div>
      )}

      {/* PRIMEIRA DOBRA: HERO COM LEQUE FÍSICO DE CARTAS */}
      <section className="w-full max-w-5xl mx-auto px-4 py-8 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Coluna Esquerda: Tipografia Autoral e Ação Dominante */}
          <div className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left">
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-normal text-[#2B2420] tracking-tight leading-[1.08] mb-4">
              Tá na cara! <span className="italic text-[#B4532F]">Mas de quem?!</span>
            </h1>

            {/* Frase em UMA linha só no desktop sem estourar no mobile (Requisito 1) */}
            <p className="text-sm sm:text-base text-[#6F655C] font-sans mb-8 max-w-xl sm:whitespace-nowrap">
              O clássico jogo de adivinhação, feito para jogar a dois em tempo real.
            </p>

            {/* Ação Primária */}
            <div className="w-full max-w-xs flex flex-col items-center lg:items-start gap-2.5">
              <Button
                size="lg"
                className="w-full"
                onClick={handleStartConfiguring}
              >
                Jogar
              </Button>

              <button
                type="button"
                onClick={() => setShowCodeDrawer(!showCodeDrawer)}
                className="text-xs sm:text-sm text-[#6F655C] hover:text-[#2B2420] underline underline-offset-4 transition-colors cursor-pointer pt-1"
              >
                Tenho um código de sala
              </button>

              {/* Drawer discreto de entrada por código */}
              {showCodeDrawer && (
                <div className="w-full mt-2 p-3 bg-[#FBF8F3] border border-[#E2DACD] rounded-[6px] animate-in fade-in duration-150">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleJoinWithCode();
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="text"
                      autoFocus
                      maxLength={6}
                      placeholder="CÓDIGO (6 DÍGITOS)"
                      value={inputCode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6);
                        setInputCode(val);
                        if (val.length === 6) {
                          handleJoinWithCode(val);
                        }
                      }}
                      className="flex-1 h-9 px-3 bg-white border border-[#E2DACD] rounded-[4px] text-xs font-mono tracking-widest text-[#2B2420] uppercase tabular-nums focus:outline-none focus:border-[#2B2420]"
                    />
                    <Button
                      type="submit"
                      variant="secondary"
                      size="sm"
                      disabled={inputCode.length < 4 || isConnecting}
                    >
                      Entrar
                    </Button>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* Coluna Direita: Prévia Interativa do Jogo com Cartas que se Apagam */}
          <div className="lg:col-span-6 w-full flex items-center justify-center py-4 sm:py-6">
            <HeroGamePreview />
          </div>
        </div>
      </section>

      {/* ABAIXO DA PRIMEIRA DOBRA: BARALHOS EM DESTAQUE (Editorial / Mesa de Jogo) */}
      <section className="w-full max-w-5xl mx-auto px-4 pt-6 pb-16 border-t border-[#E2DACD]">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-6">
          <div>
            <h2 className="font-serif text-2xl font-normal text-[#2B2420]">
              Baralhos em destaque
            </h2>
            <p className="text-xs text-[#6F655C] font-sans">
              Coleções prontas para jogar com seus amigos
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              onOpenCommunity();
            }}
            className="text-xs font-semibold text-[#B4532F] hover:underline underline-offset-4 cursor-pointer self-start sm:self-auto"
          >
            Explorar comunidade →
          </button>
        </div>

        {/* Lista Editorial dos Baralhos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Baralho 1: Personalidades & Memes */}
          <div
            onClick={() => {
              sounds.playClick();
              setHostDeckName('Personalidades & Memes');
              setHostCardCount(30);
              setHostCustomCards(MOCK_90_CHARACTERS.slice(0, 30));
              handleStartConfiguring();
            }}
            className="p-4 rounded-[8px] border border-[#E2DACD] bg-[#FBF8F3] hover:border-[#2B2420] transition-colors cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <span className="text-[10px] font-medium text-[#6F655C] uppercase tracking-wider block mb-1">
                Oficial · 30 cartas
              </span>
              <h3 className="font-serif text-base text-[#2B2420] group-hover:text-[#B4532F] transition-colors mb-1">
                Personalidades & Memes
              </h3>
              <p className="text-xs text-[#6F655C] leading-relaxed">
                Famosos, criadores de conteúdo e figuras da cultura pop.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E2DACD]/80 flex items-center justify-between">
              <div className="flex items-center -space-x-1.5">
                <img src="/standard-faces/Bruno.jpg" alt="Bruno" className="w-7 h-7 rounded-full border border-white object-cover" />
                <img src="/standard-faces/Ana.jpg" alt="Ana" className="w-7 h-7 rounded-full border border-white object-cover" />
                <img src="/standard-faces/Felipe.jpg" alt="Felipe" className="w-7 h-7 rounded-full border border-white object-cover" />
              </div>
              <span className="text-xs font-semibold text-[#B4532F] group-hover:underline">Jogar</span>
            </div>
          </div>

          {/* Baralho 2: Turma Clássica */}
          <div
            onClick={() => {
              sounds.playClick();
              setHostDeckName('Turma do Tabuleiro');
              setHostCardCount(15);
              setHostCustomCards(MOCK_90_CHARACTERS.slice(0, 15));
              handleStartConfiguring();
            }}
            className="p-4 rounded-[8px] border border-[#E2DACD] bg-[#FBF8F3] hover:border-[#2B2420] transition-colors cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <span className="text-[10px] font-medium text-[#6F655C] uppercase tracking-wider block mb-1">
                Clássico · 15 cartas
              </span>
              <h3 className="font-serif text-base text-[#2B2420] group-hover:text-[#B4532F] transition-colors mb-1">
                Turma do Tabuleiro
              </h3>
              <p className="text-xs text-[#6F655C] leading-relaxed">
                Personagens com traços distintos para rodadas rápidas e estratégicas.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E2DACD]/80 flex items-center justify-between">
              <div className="flex items-center -space-x-1.5">
                <img src="/standard-faces/Carla.jpg" alt="Carla" className="w-7 h-7 rounded-full border border-white object-cover" />
                <img src="/standard-faces/Davi.jpg" alt="Davi" className="w-7 h-7 rounded-full border border-white object-cover" />
                <img src="/standard-faces/Hugo.jpg" alt="Hugo" className="w-7 h-7 rounded-full border border-white object-cover" />
              </div>
              <span className="text-xs font-semibold text-[#B4532F] group-hover:underline">Jogar</span>
            </div>
          </div>

          {/* Baralho 3: Crie seu próprio baralho */}
          <div
            onClick={() => {
              sounds.playClick();
              if (onOpenDeckBuilder) {
                onOpenDeckBuilder(30);
              }
            }}
            className="p-4 rounded-[8px] border border-[#E2DACD] border-dashed bg-[#FBF8F3] hover:border-[#2B2420] transition-colors cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <span className="text-[10px] font-medium text-[#6F655C] uppercase tracking-wider block mb-1">
                Personalizado
              </span>
              <h3 className="font-serif text-base text-[#2B2420] group-hover:text-[#B4532F] transition-colors mb-1">
                Criar seu próprio baralho
              </h3>
              <p className="text-xs text-[#6F655C] leading-relaxed">
                Suba fotos dos seus amigos, família ou ídolos favoritos.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E2DACD]/80 flex items-center justify-between">
              <span className="text-xs text-[#6F655C]">Até 90 cartas</span>
              <span className="text-xs font-semibold text-[#B4532F] group-hover:underline">Criar →</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
