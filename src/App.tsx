import { useState, useEffect, useRef, useCallback } from 'react';
import { getDeckByDifficulty } from './utils/characters';
import type {
  Character,
  GamePhase,
  Question,
  NetworkMessage,
  RoomConfig,
  DifficultyCount,
  CardStatus,
  UndoAction,
} from './types/game';
import { network } from './services/network';
import { supabase } from './services/supabase';
import { auth, type AppUser } from './services/auth';
import { sounds } from './utils/sound';
import { QuestionAnswerModal } from './components/QuestionAnswerModal';
import { GuessModal } from './components/GuessModal';
import { GameOverModal } from './components/GameOverModal';
import { SecretSelectionModal } from './components/SecretSelectionModal';
import { Lobby } from './components/Lobby';
import { QuickChat } from './components/QuickChat';
import { LoginModal } from './components/LoginModal';
import { ProfilePage } from './components/ProfilePage';
import { ImportSharedDeckModal } from './components/ImportSharedDeckModal';
import { CustomDeckBuilder } from './components/CustomDeckBuilder';
import { PublicLobbiesPage } from './components/PublicLobbiesPage';
import { CommunityExplorerPage } from './components/CommunityExplorerPage';
import { DeckDetailsPage } from './components/DeckDetailsPage';
import {
  applyDeckToDraft,
  isChoiceMode,
} from './services/configDraft';
import { OpponentLeftModal } from './components/OpponentLeftModal';
import { PasswordPromptModal } from './components/PasswordPromptModal';
import { Footer } from './components/Footer';
import { LegalModal, type LegalTab } from './components/LegalModal';
import { Volume2, VolumeX, User as UserIcon, LogOut, AlertTriangle, RotateCcw, Clock, Shield } from 'lucide-react';
import type { SavedDeck } from './services/auth';
import { MatchDesignSandbox } from './components/redesign/MatchDesignSandbox';
import { MatchDesignB } from './components/redesign/MatchDesignB';
import { AdminLayout } from './components/admin/AdminLayout';

export function App() {
  // Autenticação
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => auth.getCurrentUser());
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // Edição de baralho e importação de baralho compartilhado
  const [editingDeck, setEditingDeck] = useState<SavedDeck | null>(null);
  const [importDeckId, setImportDeckId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('import_deck');
  });

  // Escutar login/logout e mudanças de sessão (OAuth Google e Discord)
  useEffect(() => {
    const unsubscribe = auth.onAuthChange((user) => {
      setCurrentUser(user);
      if (user?.username) {
        setPlayerName(user.username);
      } else {
        setPhase((prev) => (prev === 'PROFILE' || prev === 'ADMIN_PANEL' ? 'LOBBY' : prev));
      }
    });
    return () => unsubscribe();
  }, []);

  // Modal Legal (Privacidade e Termos)
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<LegalTab>('privacy');

  const handleOpenPrivacy = () => {
    setLegalModalTab('privacy');
    setLegalModalOpen(true);
  };

  const handleOpenTerms = () => {
    setLegalModalTab('terms');
    setLegalModalOpen(true);
  };

  // Fases e Configuração do Jogo (com suporte a rotas dinâmicas /perfil, /lobbies, /comunidade, /partida-design/*)
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname.toLowerCase());

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname.toLowerCase());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [phase, setPhase] = useState<GamePhase>(() => {
    const path = window.location.pathname.toLowerCase();
    if (path === '/perfil') return 'PROFILE';
    if (path === '/criar-lobby') {
      window.history.replaceState({}, document.title, '/');
      return 'LOBBY';
    }
    if (path === '/lobbies') return 'PUBLIC_LOBBIES';
    if (path === '/comunidade' || path.startsWith('/comunidade/baralho/')) return 'COMMUNITY';
    if (path === '/painel-admin') return 'ADMIN_PANEL';
    return 'LOBBY';
  });
  const [roomCode, setRoomCode] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [opponentName, setOpponentName] = useState<string>('Oponente');
  const [opponentId, setOpponentId] = useState<string>('');
  const [isHost, setIsHost] = useState<boolean>(false);
  const [waitingForPlayer, setWaitingForPlayer] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Modal de Confirmação para Abandonar Partida
  const [showAbandonModal, setShowAbandonModal] = useState(false);

  // Baralho e Construtor
  const [roomConfig, setRoomConfig] = useState<RoomConfig>({
    mode: 'standard',
    cardCount: 15,
  });
  const [activeDeck, setActiveDeck] = useState<Character[]>(() => getDeckByDifficulty(30));
  const [isBuildingDeck, setIsBuildingDeck] = useState(false);
  const [deckTargetCount, setDeckTargetCount] = useState<DifficultyCount>(30);
  const [isConfiguringRoom, setIsConfiguringRoom] = useState(false);

  // Modal quando oponente abandona (Ponto 2)
  const [opponentLeftData, setOpponentLeftData] = useState<{
    isOpen: boolean;
    opponentName: string;
  }>({
    isOpen: false,
    opponentName: '',
  });

  // Revanche (Ponto 2.a)
  const [rematchRequestedByMe, setRematchRequestedByMe] = useState(false);
  const [rematchRequestedByOpponent, setRematchRequestedByOpponent] = useState(false);
  const rematchRequestedByMeRef = useRef(false);
  rematchRequestedByMeRef.current = rematchRequestedByMe;
  const rematchRequestedByOpponentRef = useRef(false);
  rematchRequestedByOpponentRef.current = rematchRequestedByOpponent;

  // Modal para Digitar Senha da Sala Secreta (Ponto 4.a)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordModalCode, setPasswordModalCode] = useState('');
  const [passwordModalError, setPasswordModalError] = useState<string | null>(null);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);

  // Estados do Tabuleiro e Ações (Requisitos E e F)
  const [cardStatuses, setCardStatuses] = useState<Record<string, CardStatus>>({});
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [targetCharacter, setTargetCharacter] = useState<Character | null>(null);

  // Personagens Secretos
  const [mySecretCharacter, setMySecretCharacter] = useState<Character | null>(null);
  const [opponentSecretCharacter, setOpponentSecretCharacter] = useState<Character | null>(null);
  const [opponentReady, setOpponentReady] = useState<boolean>(false);

  // Turno e Perguntas (Erro 1: persistência estrita)
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState<string>('');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionToAnswer, setQuestionToAnswer] = useState<Question | null>(null);
  const [questionHistory, setQuestionHistory] = useState<Question[]>([]);
  const [guessModalOpen, setGuessModalOpen] = useState<boolean>(false);
  const [wrongGuessAlert, setWrongGuessAlert] = useState<string | null>(null);

  // Fim de Jogo
  const [gameOverResult, setGameOverResult] = useState<{
    isWinner: boolean;
    winnerName: string;
  } | null>(null);

  // Chat Rápido
  const [chatMessages, setChatMessages] = useState<{ sender: string; text: string; id: string }[]>([]);

  // Clique na Carta: Deitar ou Levantar diretamente (mesma dinâmica da página inicial)
  const handleCardClick = useCallback((char: Character) => {
    sounds.playClick();
    setCardStatuses((prev) => {
      const isCurrentlyDown = prev[char.id] === 'discard';
      const newStatus: CardStatus = isCurrentlyDown ? 'normal' : 'discard';
      setUndoStack((old) => [
        ...old,
        {
          type: 'status_change',
          previousStates: { [char.id]: prev[char.id] || 'normal' },
          newStates: { [char.id]: newStatus },
          description: isCurrentlyDown ? `Levantou ${char.name}` : `Deitou ${char.name}`,
        },
      ]);
      return {
        ...prev,
        [char.id]: newStatus,
      };
    });
  }, []);

  // Referências para evitar fechamentos obsoletos em listeners de eventos
  const mySecretRef = useRef<Character | null>(null);
  mySecretRef.current = mySecretCharacter;

  const currentUserRef = useRef<AppUser | null>(currentUser);
  currentUserRef.current = currentUser;

  const opponentNameRef = useRef<string>(opponentName);
  opponentNameRef.current = opponentName;

  const roomConfigRef = useRef<RoomConfig>(roomConfig);
  roomConfigRef.current = roomConfig;

  const activeDeckRef = useRef<Character[]>(activeDeck);
  activeDeckRef.current = activeDeck;

  const opponentIdRef = useRef<string>(opponentId);
  opponentIdRef.current = opponentId;

  const opponentReadyRef = useRef<boolean>(opponentReady);
  opponentReadyRef.current = opponentReady;

  const hasStartedGameRef = useRef<boolean>(false);

  const phaseRef = useRef<GamePhase>(phase);
  phaseRef.current = phase;

  const currentTurnPlayerIdRef = useRef<string>(currentTurnPlayerId);
  currentTurnPlayerIdRef.current = currentTurnPlayerId;

  const currentQuestionRef = useRef<Question | null>(currentQuestion);
  currentQuestionRef.current = currentQuestion;

  // Reconexão ativa com contagem regressiva
  const [reconnectSession, setReconnectSession] = useState<any>(null);
  const [reconnectSecondsLeft, setReconnectSecondsLeft] = useState<number>(0);

  // PONTO 3: Temporizador para cada turno (60 segundos)
  const TURN_DURATION_SECONDS = 60;
  const [turnStartTime, setTurnStartTime] = useState<number>(Date.now());
  const turnStartTimeRef = useRef<number>(Date.now());
  turnStartTimeRef.current = turnStartTime;
  const [turnTimeLeft, setTurnTimeLeft] = useState<number>(TURN_DURATION_SECONDS);

  // PONTO 1.b: Sincronização fluida do Timer no Cabeçalho ao rolar a tela
  const [isQuestionControlVisible, setIsQuestionControlVisible] = useState(true);
  const questionControlAnchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase !== 'PLAYING') {
      setIsQuestionControlVisible(true);
      return;
    }

    const target = questionControlAnchorRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsQuestionControlVisible(entry.isIntersecting);
      },
      {
        root: null,
        threshold: 0.05,
      }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [phase]);

  const toggleSound = () => {
    sounds.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
  };

  // Inicializar statuses das cartas apenas quando deck mudar e não houver status salvo
  useEffect(() => {
    setCardStatuses((prev) => {
      const next: Record<string, CardStatus> = { ...prev };
      activeDeck.forEach((c) => {
        if (!next[c.id]) next[c.id] = 'normal';
      });
      return next;
    });
  }, [activeDeck]);

  // PONTO 1: URLs Dinâmicas e Sincronização com as Rotas do Site
  const getPathForPhase = (p: GamePhase): string => {
    switch (p) {
      case 'PROFILE':
        return '/perfil';
      case 'PUBLIC_LOBBIES':
        return '/lobbies';
      case 'COMMUNITY':
        if (currentPath.startsWith('/comunidade/baralho/')) {
          return currentPath;
        }
        return '/comunidade';
      case 'ADMIN_PANEL':
        return '/painel-admin';
      case 'CREATE_LOBBY':
      default:
        return '/';
    }
  };

  // Atualizar URL na barra de endereços dinamicamente quando a fase mudar
  useEffect(() => {
    const targetPath = getPathForPhase(phase);
    const browserPath = window.location.pathname;

    const url = new URL(window.location.href);
    if (!importDeckId) {
      url.searchParams.delete('import_deck');
    }

    // Navegação entre rotas diferentes: limpar query params que não pertencem à rota destino
    let newSearch = '';
    if (browserPath === targetPath) {
      newSearch = url.search ? url.search : '';
    } else {
      if (targetPath === '/perfil') {
        const allowed = ['aba', 'filtro', 'ordem', 'q'];
        const p = new URLSearchParams();
        allowed.forEach((key) => {
          const val = url.searchParams.get(key);
          if (val) p.set(key, val);
        });
        newSearch = p.toString() ? `?${p.toString()}` : '';
      } else if (targetPath === '/comunidade') {
        const allowed = ['aba', 'origem', 'filtro', 'ordem', 'q'];
        const p = new URLSearchParams();
        allowed.forEach((key) => {
          const val = url.searchParams.get(key);
          if (val) p.set(key, val);
        });
        newSearch = p.toString() ? `?${p.toString()}` : '';
      } else {
        newSearch = '';
      }
    }

    const newUrl = `${targetPath}${newSearch}`;

    if (browserPath !== targetPath || (!importDeckId && window.location.search.includes('import_deck'))) {
      if (waitingForPlayer && targetPath === '/') {
        window.history.replaceState({ phase, path: targetPath }, '', newUrl);
      } else {
        window.history.pushState({ phase, path: targetPath }, '', newUrl);
      }
      setCurrentPath(targetPath);
    }
  }, [phase, importDeckId, waitingForPlayer, currentPath]);

  // Se o modal de importação for fechado, limpar ?import_deck da URL para evitar que F5 reabra o modal
  useEffect(() => {
    if (!importDeckId && window.location.search.includes('import_deck')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('import_deck');
      const newUrl = url.pathname + (url.search ? url.search : '');
      window.history.replaceState({ phase }, '', newUrl);
    }
  }, [importDeckId, phase]);

  // Se tentar acessar /perfil diretamente sem login, abrir modal de login
  useEffect(() => {
    if (phase === 'PROFILE' && !currentUser) {
      setLoginModalOpen(true);
    }
  }, [phase, currentUser]);

  // Tratar botão Voltar / Avançar do Navegador (popstate)
  useEffect(() => {
    const handlePopState = () => {
      if (phase === 'PLAYING') {
        setShowAbandonModal(true);
        window.history.pushState({ phase: 'PLAYING' }, '', window.location.href);
        return;
      }

      if (waitingForPlayer) {
        handleExitToLobby();
        return;
      }

      const path = window.location.pathname.toLowerCase();
      setCurrentPath(path);

      if (path === '/perfil') {
        if (currentUser) {
          setPhase('PROFILE');
        } else {
          setPhase('LOBBY');
          setLoginModalOpen(true);
        }
      } else if (path === '/criar-lobby') {
        window.history.replaceState({}, document.title, '/');
        setPhase('LOBBY');
      } else if (path === '/lobbies') {
        setPhase('PUBLIC_LOBBIES');
      } else if (path === '/comunidade' || path.startsWith('/comunidade/baralho/')) {
        setPhase('COMMUNITY');
      } else if (path === '/painel-admin') {
        setPhase('ADMIN_PANEL');
      } else {
        setPhase('LOBBY');
        setWaitingForPlayer(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [phase, currentUser, waitingForPlayer]);

  // Ação centralizada para reconectar à partida
  const handleReconnectMatch = async (session: any) => {
    if (!session || !session.roomCode) return;
    try {
      setIsConnecting(true);
      await network.clearPlayerDisconnected(session.roomCode);

      const room = await network.reconnectRoom(
        session.roomCode,
        session.playerName,
        session.isHost
      );

      if (room && room.status !== 'finished') {
        setRoomCode(session.roomCode);
        setPlayerName(session.playerName);
        setOpponentName(session.opponentName || 'Oponente');
        setOpponentId(session.opponentId || '');
        setIsHost(session.isHost);
        if (session.activeDeck?.length) setActiveDeck(session.activeDeck);
        if (session.cardStatuses) setCardStatuses(session.cardStatuses);
        if (session.mySecretCharacter) setMySecretCharacter(session.mySecretCharacter);
        if (session.opponentSecretCharacter) setOpponentSecretCharacter(session.opponentSecretCharacter);

        const activeTurn = room.current_turn || session.currentTurnPlayerId || '';
        setCurrentTurnPlayerId(activeTurn);
        const activeQuestion = room.current_question || session.currentQuestion || null;
        setCurrentQuestion(activeQuestion);
        if (session.questionHistory) setQuestionHistory(session.questionHistory);

        if (
          activeQuestion &&
          (activeQuestion.answer === null || activeQuestion.answer === undefined) &&
          activeTurn !== network.playerId &&
          !session.config?.isCallMode
        ) {
          setQuestionToAnswer(activeQuestion);
        }

        setPhase(session.phase || 'PLAYING');
        setReconnectSession(null);
        setReconnectSecondsLeft(0);
        sounds.playWin();
      } else {
        localStorage.removeItem('cara_reconnect_session');
        localStorage.removeItem('cara_active_session');
    localStorage.removeItem('cara_reconnect_session');
    setReconnectSession(null);
    setReconnectSecondsLeft(0);
        setReconnectSession(null);
        setReconnectSecondsLeft(0);
        sounds.playWrong();
      }
    } catch (err) {
      console.warn('Erro ao reconectar à partida:', err);
      sounds.playWrong();
    } finally {
      setIsConnecting(false);
    }
  };

  // Abandonar partida salva e limpar dados
  const handleDismissReconnect = () => {
    sounds.playClick();
    if (reconnectSession?.roomCode) {
      network.finishRoom(reconnectSession.roomCode);
    }
    localStorage.removeItem('cara_active_session');
    localStorage.removeItem('cara_reconnect_session');
    setReconnectSession(null);
    setReconnectSecondsLeft(0);
    localStorage.removeItem('cara_reconnect_session');
    setReconnectSession(null);
    setReconnectSecondsLeft(0);
  };

  // Monitorar partida em andamento para reconexão (botão no cabeçalho e card no lobby)
  useEffect(() => {
    const checkActiveSession = () => {
      if (phase === 'PLAYING' || phase === 'CHOOSING_SECRET') {
        setReconnectSession(null);
        setReconnectSecondsLeft(0);
        return;
      }

      const raw = localStorage.getItem('cara_active_session') || localStorage.getItem('cara_reconnect_session');
      if (!raw) {
        setReconnectSession(null);
        setReconnectSecondsLeft(0);
        return;
      }

      try {
        const session = JSON.parse(raw);
        if (!session.roomCode || session.phase === 'LOBBY' || session.phase === 'GAME_OVER') {
          setReconnectSession(null);
          setReconnectSecondsLeft(0);
          return;
        }

        const expiresAt = session.expiresAt || (session.disconnectedAt ? session.disconnectedAt + 180000 : Date.now() + 180000);
        const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));

        if (remaining > 0) {
          setReconnectSession({ ...session, expiresAt });
          setReconnectSecondsLeft(remaining);
        } else {
          localStorage.removeItem('cara_active_session');
    localStorage.removeItem('cara_reconnect_session');
    setReconnectSession(null);
    setReconnectSecondsLeft(0);
          localStorage.removeItem('cara_reconnect_session');
          setReconnectSession(null);
          setReconnectSecondsLeft(0);
          if (session.roomCode) {
            network.finishRoom(session.roomCode);
          }
        }
      } catch {
        setReconnectSession(null);
        setReconnectSecondsLeft(0);
      }
    };

    checkActiveSession();
    const interval = window.setInterval(checkActiveSession, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // F5 / Restaurar Sessão Automática ao Abrir a Página
  useEffect(() => {
    const restoreSession = async () => {
      const params = new URLSearchParams(window.location.search);
      const urlSala = params.get('sala') || params.get('room');

      const raw = localStorage.getItem('cara_active_session') || localStorage.getItem('cara_reconnect_session');
      if (!raw) return;
      try {
        const session = JSON.parse(raw);
        if (!session.roomCode || session.phase === 'LOBBY' || session.phase === 'GAME_OVER') return;

        // Se o usuário abriu um link de sala diferente da salva, não tenta auto-reconectar a antiga
        if (urlSala && urlSala.toUpperCase() !== session.roomCode.toUpperCase()) {
          return;
        }

        const expiresAt = session.expiresAt || (session.disconnectedAt ? session.disconnectedAt + 180000 : Date.now() + 180000);
        if (Date.now() > expiresAt) {
          localStorage.removeItem('cara_active_session');
    localStorage.removeItem('cara_reconnect_session');
    setReconnectSession(null);
    setReconnectSecondsLeft(0);
          localStorage.removeItem('cara_reconnect_session');
          return;
        }

        await handleReconnectMatch(session);
      } catch (err) {
        console.warn('Erro ao restaurar sessão anterior:', err);
      }
    };
    restoreSession();
  }, []);

  // Salvar sessão ativa durante partida (persistência em F5 e fechamento acidental)
  useEffect(() => {
    if ((phase === 'PLAYING' || phase === 'CHOOSING_SECRET') && roomCode) {
      const sessionData = {
        roomCode,
        playerName,
        opponentName,
        opponentId,
        isHost,
        phase,
        mySecretCharacter,
        opponentSecretCharacter,
        activeDeck,
        cardStatuses,
        currentTurnPlayerId,
        currentQuestion,
        questionHistory,
        expiresAt: Date.now() + 180000,
      };
      localStorage.setItem('cara_active_session', JSON.stringify(sessionData));
      localStorage.setItem('cara_reconnect_session', JSON.stringify(sessionData));
    }
  }, [
    phase,
    roomCode,
    playerName,
    opponentName,
    opponentId,
    isHost,
    mySecretCharacter,
    opponentSecretCharacter,
    activeDeck,
    cardStatuses,
    currentTurnPlayerId,
    currentQuestion,
    questionHistory,
  ]);

  // Tolerância de reconexão de 3 minutos ao fechar a janela, com religação instantânea em focus/pageshow/online
  useEffect(() => {
    const handleBeforeUnload = () => {
      if ((phase === 'PLAYING' || phase === 'CHOOSING_SECRET') && roomCode) {
        const sessionData = {
          roomCode,
          playerName,
          opponentName,
          opponentId,
          isHost,
          phase,
          mySecretCharacter,
          opponentSecretCharacter,
          activeDeck,
          cardStatuses,
          currentTurnPlayerId,
          currentQuestion,
          questionHistory,
          disconnectedAt: Date.now(),
          expiresAt: Date.now() + 180000,
        };
        localStorage.setItem('cara_active_session', JSON.stringify(sessionData));
        localStorage.setItem('cara_reconnect_session', JSON.stringify(sessionData));
        network.markPlayerDisconnected(roomCode, network.playerId);
      }
    };

    const handleReactivate = () => {
      if (roomCode && (phase === 'PLAYING' || phase === 'CHOOSING_SECRET')) {
        network.clearPlayerDisconnected(roomCode);
        network.ensureConnected(roomCode);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleReactivate();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pageshow', handleReactivate);
    window.addEventListener('focus', handleReactivate);
    window.addEventListener('online', handleReactivate);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pageshow', handleReactivate);
      window.removeEventListener('focus', handleReactivate);
      window.removeEventListener('online', handleReactivate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    phase,
    roomCode,
    playerName,
    opponentName,
    opponentId,
    isHost,
    mySecretCharacter,
    opponentSecretCharacter,
    activeDeck,
    cardStatuses,
    currentTurnPlayerId,
    currentQuestion,
    questionHistory,
  ]);

  // 1. Criar ou Entrar na Sala
  const handleJoinRoom = async (
    code: string,
    name: string,
    host: boolean,
    config: RoomConfig,
    password?: string
  ) => {
    setIsConnecting(true);
    setErrorMessage(null);
    setPlayerName(name);
    setRoomCode(code);
    setIsHost(host);

    // PROBLEMA 2 RESOLVIDO: Limpar completamente o histórico ao entrar/criar sala
    setQuestionHistory([]);
    setChatMessages([]);
    setCurrentQuestion(null);
    setQuestionToAnswer(null);
    setUndoStack([]);
    setCardStatuses({});
    setTargetCharacter(null);
    setMySecretCharacter(null);
    setOpponentSecretCharacter(null);
    setOpponentReady(false);
    setGameOverResult(null);
    setWrongGuessAlert(null);
    setRematchRequestedByMe(false);
    setRematchRequestedByOpponent(false);
    hasStartedGameRef.current = false;

    try {
      if (host) {
        setRoomConfig(config);
        const deck = getDeckByDifficulty(config.cardCount, config.customCards);
        setActiveDeck(deck);
        await network.createRoom(code, name, config);
        setIsConnecting(false);
        setWaitingForPlayer(true);
        setPhase('LOBBY');
        setIsBuildingDeck(false);
      } else {
        const room = await network.joinRoom(code, name, password);
        setPasswordModalOpen(false);
        setPasswordModalCode('');
        setPasswordModalError(null);
        setIsConnecting(false);

        // Se a entrada na sala foi detectada como uma reconexão legítima
        if ((room as any).isReconnect) {
          const raw = localStorage.getItem('cara_active_session') || localStorage.getItem('cara_reconnect_session');
          let savedSession: any = null;
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              if (parsed.roomCode && parsed.roomCode.toUpperCase() === code.toUpperCase()) {
                savedSession = parsed;
              }
            } catch {
              // ignore
            }
          }

          if (savedSession) {
            await handleReconnectMatch(savedSession);
            return;
          }

          // Se reconectou sem dados salvos locais no navegador (ex: abriu em outro navegador/app)
          const isReturningHost = !!(room as any).reconnectingAsHost;
          setIsHost(isReturningHost);
          setOpponentName(isReturningHost ? (room.guest_name || 'Oponente') : room.host_name);
          setOpponentId(isReturningHost ? (room.guest_id || '') : room.host_id);
          opponentIdRef.current = isReturningHost ? (room.guest_id || '') : room.host_id;
          network.opponentId = isReturningHost ? (room.guest_id || '') : room.host_id;

          if (room.config) {
            setRoomConfig(room.config);
            const syncedDeck = getDeckByDifficulty(room.config.cardCount, room.config.customCards);
            setActiveDeck(syncedDeck);
          }

          const activeTurn = room.current_turn || '';
          setCurrentTurnPlayerId(activeTurn);
          const activeQuestion = room.current_question || null;
          setCurrentQuestion(activeQuestion);

          setWaitingForPlayer(false);
          setPhase(room.status === 'choosing' ? 'CHOOSING_SECRET' : 'PLAYING');
          network.send('REQUEST_STATE_SYNC', { playerId: network.playerId });
          sounds.playWin();
          return;
        }

        setOpponentName(room.host_name);
        setOpponentId(room.host_id);
        opponentIdRef.current = room.host_id;
        network.opponentId = room.host_id;
        if (room.config) {
          setRoomConfig(room.config);
          const syncedDeck = getDeckByDifficulty(room.config.cardCount, room.config.customCards);
          setActiveDeck(syncedDeck);
        }
        setWaitingForPlayer(false);
        setPhase('CHOOSING_SECRET');
      }
    } catch (err: any) {
      setIsConnecting(false);
      if (err.requiresPassword) {
        setPasswordModalCode(code);
        setPasswordModalOpen(true);
        setPasswordModalError(null);
        return;
      }
      if (passwordModalOpen) {
        setPasswordModalError(err.message || 'Senha incorreta.');
      } else {
        setErrorMessage(err.message || 'Erro ao conectar à sala.');
      }
      sounds.playWrong();
    }
  };

  // 2. Ouvinte de Mensagens da Rede (CORREÇÃO DE ERRO 1 E ERRO 2)
  useEffect(() => {
    const unsubscribe = network.onMessage((msg: NetworkMessage) => {
      if (msg.senderId === network.playerId && msg.type !== 'GUESS_RESULT') {
        return;
      }

      switch (msg.type) {
        case 'JOIN': {
          setOpponentName(msg.senderName);
          setOpponentId(msg.senderId);
          opponentIdRef.current = msg.senderId;
          network.opponentId = msg.senderId;
          setWaitingForPlayer(false);
          setPhase((curr) => (curr === 'LOBBY' ? 'CHOOSING_SECRET' : curr));
          break;
        }

        case 'RECONNECT': {
          sounds.playClick();
          if (msg.senderName) {
            setOpponentName(msg.senderName);
          }
          if (msg.senderId) {
            setOpponentId(msg.senderId);
            opponentIdRef.current = msg.senderId;
            network.opponentId = msg.senderId;
          }
          // Sincronizar estado da partida com o jogador que voltou
          if (phaseRef.current === 'PLAYING') {
            network.send('SYNC_GAME_STATE', {
              currentTurnPlayerId: currentTurnPlayerIdRef.current,
              currentQuestion: currentQuestionRef.current,
            });
          }
          break;
        }

        case 'REQUEST_STATE_SYNC': {
          if (phaseRef.current === 'PLAYING') {
            network.send('SYNC_GAME_STATE', {
              currentTurnPlayerId: currentTurnPlayerIdRef.current,
              currentQuestion: currentQuestionRef.current,
            });
          }
          break;
        }

        // PROBLEMA 1 RESOLVIDO: Quando oponente escolheu o segredo
        case 'CHOSE_SECRET': {
          setOpponentReady(true);
          opponentReadyRef.current = true;
          // Se sou o Host e já escolhi meu segredo, realizo o sorteio 50/50
          if (isHost && mySecretRef.current) {
            startMatchLottery();
          }
          break;
        }

        // PROBLEMA 1 RESOLVIDO: Convidado recebe o resultado do sorteio feito pelo Host
        case 'START_GAME': {
          hasStartedGameRef.current = true;
          if (msg.payload?.startingPlayerId) {
            setCurrentTurnPlayerId(msg.payload.startingPlayerId);
          }
          const tStart = msg.payload?.turnStartTime || Date.now();
          setTurnStartTime(tStart);
          turnStartTimeRef.current = tStart;
          setTurnTimeLeft(TURN_DURATION_SECONDS);
          setPhase('PLAYING');
          break;
        }

        case 'SYNC_GAME_STATE': {
          if (msg.payload?.currentTurnPlayerId) {
            hasStartedGameRef.current = true;
            setCurrentTurnPlayerId(msg.payload.currentTurnPlayerId);
            if (msg.payload?.currentQuestion !== undefined) {
              const q = msg.payload.currentQuestion;
              setCurrentQuestion(q);
              if (
                q &&
                (q.answer === null || q.answer === undefined) &&
                msg.payload.currentTurnPlayerId !== network.playerId &&
                !roomConfigRef.current?.isCallMode
              ) {
                setQuestionToAnswer((prev) => (prev?.id === q.id ? prev : q));
              } else if (q && q.answer !== null && q.answer !== undefined) {
                setQuestionToAnswer(null);
              }
            }
            setPhase((curr) => (curr === 'CHOOSING_SECRET' && mySecretRef.current ? 'PLAYING' : curr));
          }
          break;
        }

        case 'ASK_QUESTION': {
          sounds.playQuestion();
          const q: Question = {
            id: 'q_' + Date.now(),
            senderId: msg.senderId,
            senderName: msg.senderName,
            text: msg.payload.text,
            traitKey: msg.payload.traitKey,
            traitValue: msg.payload.traitValue,
            answer: null,
            timestamp: Date.now(),
          };
          setCurrentQuestion(q);
          setQuestionToAnswer(q);
          setQuestionHistory((prev) => [q, ...prev]);
          break;
        }

        case 'ANSWER_QUESTION': {
          sounds.playAnswer(msg.payload.answer);
          setCurrentQuestion((prev) =>
            prev ? { ...prev, answer: msg.payload.answer } : null
          );
          setQuestionHistory((prev) =>
            prev.map((q, idx) => (idx === 0 ? { ...q, answer: msg.payload.answer } : q))
          );
          const tStart = msg.payload?.turnStartTime || Date.now();
          setTurnStartTime(tStart);
          turnStartTimeRef.current = tStart;
          setTurnTimeLeft(TURN_DURATION_SECONDS);
          break;
        }

        case 'PASS_TURN': {
          setCurrentTurnPlayerId(network.playerId);
          setCurrentQuestion(null);
          const tStart = msg.payload?.turnStartTime || Date.now();
          setTurnStartTime(tStart);
          turnStartTimeRef.current = tStart;
          setTurnTimeLeft(TURN_DURATION_SECONDS);
          break;
        }

        // ERRO 2 RESOLVIDO: Tratar quando o oponente faz um palpite
        case 'MAKE_GUESS': {
          const guessedId = msg.payload.characterId;
          const guesserSecret = msg.payload.guesserSecretCharacter;
          const mySecret = mySecretRef.current;
          if (mySecret) {
            if (mySecret.id === guessedId) {
              // 1. O oponente acertou! Guarda o personagem secreto do oponente
              if (guesserSecret) {
                setOpponentSecretCharacter(guesserSecret);
              }

              network.send('GUESS_RESULT', {
                correct: true,
                winnerId: msg.senderId,
                winnerName: msg.senderName,
                secretCharacter: mySecret,
                guesserSecretCharacter: guesserSecret,
              });

              // 2. Atualizar no Supabase que a partida acabou
              network.syncRoomState({ status: 'finished' });

              // 3. Imediatamente acionar derrota para quem perdeu! (Sem continuar jogando sozinho)
              setGameOverResult({
                isWinner: false,
                winnerName: msg.senderName,
              });
              setPhase('GAME_OVER');

              // PONTO 2.a: Gravar derrota no histórico do usuário logado
              if (currentUserRef.current) {
                auth.recordMatch({
                  user_id: currentUserRef.current.id,
                  opponent_name: msg.senderName,
                  result: 'loss',
                  deck_mode: roomConfigRef.current.mode,
                  card_count: activeDeckRef.current.length,
                });
              }
            } else {
              // Oponente errou o palpite
              network.send('GUESS_RESULT', {
                correct: false,
                guesserId: msg.senderId,
                guesserName: msg.senderName,
                guessedName: msg.payload.characterName,
              });
            }
          }
          break;
        }

        // Resultado do Palpite Final recebido pelo vencedor ou quando errou
        case 'GUESS_RESULT': {
          if (msg.payload.correct) {
            const winnerIsMe = msg.payload.winnerId === network.playerId;
            setGameOverResult({
              isWinner: winnerIsMe,
              winnerName: msg.payload.winnerName,
            });
            if (msg.payload.secretCharacter) {
              setOpponentSecretCharacter(msg.payload.secretCharacter);
            }
            setPhase('GAME_OVER');

            // PONTO 2.a: Gravar resultado no histórico do usuário logado
            if (currentUserRef.current) {
              auth.recordMatch({
                user_id: currentUserRef.current.id,
                opponent_name: opponentNameRef.current,
                result: winnerIsMe ? 'win' : 'loss',
                deck_mode: roomConfigRef.current.mode,
                card_count: activeDeckRef.current.length,
              });
            }
          } else {
            sounds.playWrong();
            setWrongGuessAlert(
              `${msg.payload.guesserName} deu um palpite em "${msg.payload.guessedName}" e ERROU!`
            );
            setTimeout(() => setWrongGuessAlert(null), 5000);

            if (msg.payload.guesserId === network.playerId) {
              handlePassTurn();
            }
          }
          break;
        }

        // PONTO 2.a: Sincronização de Revanche mútua
        case 'REMATCH':
        case 'REQUEST_REMATCH': {
          sounds.playClick();
          setRematchRequestedByOpponent(true);
          if (rematchRequestedByMeRef.current) {
            network.send('START_REMATCH', {});
            startRematch();
          }
          break;
        }

        case 'START_REMATCH': {
          startRematch();
          break;
        }

        // Oponente abandonou a partida (Ponto 2: modal minimalista em vez de alert de navegador)
        case 'ABANDON_GAME': {
          sounds.playWrong();
          setOpponentLeftData({
            isOpen: true,
            opponentName: msg.senderName || opponentName || 'Seu oponente',
          });
          break;
        }

        case 'CHAT': {
          setChatMessages((prev) => [
            ...prev.slice(-15),
            { sender: msg.senderName, text: msg.payload.text, id: 'm_' + Date.now() },
          ]);
          break;
        }
      }
    });

    return () => unsubscribe();
  }, [isHost, playerName]);

  // PROBLEMA 1 & 2 RESOLVIDO: Sorteio 50/50 conduzido EXCLUSIVAMENTE pelo Host com IDs válidos garantidos
  const startMatchLottery = async () => {
    if (!isHost || hasStartedGameRef.current) return;

    let targetOppId = opponentIdRef.current || opponentId || network.opponentId;
    if (!targetOppId && network.roomCode) {
      const { data: r } = await supabase
        .from('game_rooms')
        .select('guest_id')
        .eq('room_code', network.roomCode)
        .maybeSingle();
      if (r?.guest_id && r.guest_id !== network.playerId) {
        targetOppId = r.guest_id;
        opponentIdRef.current = targetOppId;
        setOpponentId(targetOppId);
      }
    }

    if (!targetOppId) {
      console.warn('Adversário ainda não identificado para o sorteio do 1º turno.');
      return;
    }

    hasStartedGameRef.current = true;

    // Sorteio justo de 50/50 entre Host e Convidado (garante que nenhum ID seja vazio)
    const startingPlayerId = Math.random() < 0.5 ? network.playerId : targetOppId;
    const tStart = Date.now();
    setTurnStartTime(tStart);
    turnStartTimeRef.current = tStart;
    setTurnTimeLeft(TURN_DURATION_SECONDS);
    setCurrentTurnPlayerId(startingPlayerId);
    setPhase('PLAYING');

    network.send('START_GAME', { startingPlayerId, turnStartTime: tStart });
    await network.syncRoomState({
      status: 'playing',
      current_turn: startingPlayerId,
    });
  };

  const handleConfirmSecret = (char: Character) => {
    setMySecretCharacter(char);
    mySecretRef.current = char;
    network.send('CHOSE_SECRET', { ready: true });

    // Se sou o Host e o oponente já estiver pronto, sorteio agora!
    if (isHost && (opponentReady || opponentReadyRef.current)) {
      startMatchLottery();
    }
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;

    const lastAction = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));

    setCardStatuses((prev) => ({
      ...prev,
      ...lastAction.previousStates,
    }));

    if (targetCharacter && lastAction.newStates[targetCharacter.id] === 'target') {
      setTargetCharacter(null);
    }
  };

  // ERRO 1: Ao enviar pergunta, sincroniza imediatamente no banco e bloqueia novas perguntas
  const handleAskQuestion = (text: string, traitKey?: any, traitValue?: any) => {
    const q: Question = {
      id: 'q_' + Date.now(),
      senderId: network.playerId,
      senderName: playerName,
      text,
      traitKey,
      traitValue,
      answer: null,
      timestamp: Date.now(),
    };
    setCurrentQuestion(q);
    setQuestionHistory((prev) => [q, ...prev]);
    network.send('ASK_QUESTION', { text, traitKey, traitValue });
    network.syncRoomState({ current_question: q });
  };

  const handleAnswerQuestion = (ans: boolean) => {
    if (!questionToAnswer) return;
    const answeredQ = { ...questionToAnswer, answer: ans };
    const tStart = Date.now();
    network.send('ANSWER_QUESTION', { answer: ans, turnStartTime: tStart });
    setCurrentQuestion(answeredQ);
    setQuestionHistory((prev) =>
      prev.map((q, idx) => (idx === 0 ? answeredQ : q))
    );
    setQuestionToAnswer(null);
    setTurnStartTime(tStart);
    turnStartTimeRef.current = tStart;
    setTurnTimeLeft(TURN_DURATION_SECONDS);
    network.syncRoomState({ current_question: answeredQ });
  };

  // Finalizar Turno passa a vez e limpa a pergunta ativa
  const handlePassTurn = () => {
    sounds.playClick();
    const nextPlayer = opponentIdRef.current || opponentId;
    const tStart = Date.now();
    network.send('PASS_TURN', { turnStartTime: tStart });
    setCurrentTurnPlayerId(nextPlayer);
    setCurrentQuestion(null);
    setTurnStartTime(tStart);
    turnStartTimeRef.current = tStart;
    setTurnTimeLeft(TURN_DURATION_SECONDS);
    network.syncRoomState({ current_turn: nextPlayer, current_question: null });
  };

  const handleConfirmGuess = (guessedChar: Character) => {
    // PONTO 7: Só pode chutar durante o seu próprio turno
    if (!isMyTurn) {
      sounds.playWrong();
      return;
    }
    setGuessModalOpen(false);
    setTargetCharacter(null);
    network.send('MAKE_GUESS', {
      characterId: guessedChar.id,
      characterName: guessedChar.name,
      guesserSecretCharacter: mySecretRef.current,
    });
  };

  const resetForRematch = () => {
    const initialStatuses: Record<string, CardStatus> = {};
    activeDeck.forEach((c) => {
      initialStatuses[c.id] = 'normal';
    });
    setCardStatuses(initialStatuses);
    // PROBLEMA 2 RESOLVIDO: Limpar completamente histórico e chat em nova partida
    setQuestionHistory([]);
    setChatMessages([]);
    setUndoStack([]);
    setTargetCharacter(null);
    setMySecretCharacter(null);
    setOpponentSecretCharacter(null);
    setOpponentReady(false);
    setCurrentQuestion(null);
    setQuestionToAnswer(null);
    setGameOverResult(null);
    setWrongGuessAlert(null);
    hasStartedGameRef.current = false;
    setPhase('CHOOSING_SECRET');
  };

  const startRematch = () => {
    sounds.playWin();
    setRematchRequestedByMe(false);
    setRematchRequestedByOpponent(false);
    resetForRematch();
    const targetOpp = opponentIdRef.current || opponentId || network.opponentId;
    const firstTurn = (targetOpp && Math.random() < 0.5) ? network.playerId : (targetOpp || network.playerId);
    setCurrentTurnPlayerId(firstTurn);
    network.syncRoomState({
      status: 'choosing',
      current_turn: firstTurn,
      current_question: null,
    });
  };

  // PONTO 3: Temporizador para cada turno (60s) - Apenas para jogos tradicionais com pergunta (não no Modo Call)
  useEffect(() => {
    if (phase !== 'PLAYING') return;
    if (roomConfig.isCallMode) return;

    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - turnStartTimeRef.current) / 1000);
      const remaining = Math.max(0, TURN_DURATION_SECONDS - elapsed);
      setTurnTimeLeft(remaining);

      // Sinal sonoro de aviso nos últimos 10 segundos para quem está no turno
      if (remaining === 10 && currentTurnPlayerId === network.playerId) {
        sounds.playClick();
      }

      // Se o tempo esgotar
      if (remaining === 0) {
        if (currentTurnPlayerId === network.playerId) {
          // Sou eu: tempo esgotado, passa a vez automaticamente!
          sounds.playWrong();
          handlePassTurn();
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, currentTurnPlayerId, roomConfig.isCallMode]);

  // Recuperação de integridade: Garante que nunca fique com o turno vazio
  useEffect(() => {
    if (phase === 'PLAYING') {
      const myId = network.playerId;
      const oppId = opponentIdRef.current || opponentId;
      if (!currentTurnPlayerId || (currentTurnPlayerId !== myId && oppId && currentTurnPlayerId !== oppId)) {
        if (isHost) {
          const startingId = myId;
          const tStart = Date.now();
          setCurrentTurnPlayerId(startingId);
          setTurnStartTime(tStart);
          turnStartTimeRef.current = tStart;
          setTurnTimeLeft(TURN_DURATION_SECONDS);
          network.send('START_GAME', { startingPlayerId: startingId, turnStartTime: tStart });
          network.syncRoomState({ current_turn: startingId });
        }
      }
    }
  }, [phase, currentTurnPlayerId, isHost, opponentId]);

  const handleRequestRematch = () => {
    sounds.playClick();
    setRematchRequestedByMe(true);
    if (rematchRequestedByOpponentRef.current) {
      network.send('START_REMATCH', {});
      startRematch();
    } else {
      network.send('REQUEST_REMATCH', {});
    }
  };

  // Navegação Global para o Menu Principal (Logo e Botão Superior)
  const handleNavigateToMainMenu = () => {
    if (phase === 'PLAYING' || phase === 'CHOOSING_SECRET') {
      setShowAbandonModal(true);
      return;
    }

    if (waitingForPlayer) {
      handleExitToLobby();
      return;
    }

    if (isBuildingDeck) {
      setIsBuildingDeck(false);
      setEditingDeck(null);
      setPhase('LOBBY');
      return;
    }

    if (phase === 'PROFILE' || phase === 'PUBLIC_LOBBIES' || phase === 'CREATE_LOBBY' || phase === 'COMMUNITY' || phase === 'ADMIN_PANEL') {
      setPhase('LOBBY');
      return;
    }

    if (phase === 'GAME_OVER') {
      handleExitToLobby();
      return;
    }

    setPhase('LOBBY');
    setWaitingForPlayer(false);
    setIsConfiguringRoom(false);
    setRoomCode('');
  };

  // PONTO 1: Abandonar partida e voltar ao menu principal
  const handleConfirmAbandon = async () => {
    setShowAbandonModal(false);
    network.send('ABANDON_GAME', {});
    await handleExitToLobby();
  };

  const handleExitToLobby = async () => {
    if (roomCode) {
      await network.cleanupStorageAndRoom(roomCode);
    }
    localStorage.removeItem('cara_active_session');
    localStorage.removeItem('cara_reconnect_session');
    setReconnectSession(null);
    setReconnectSecondsLeft(0);
    setPhase('LOBBY');
    setWaitingForPlayer(false);
    setIsConfiguringRoom(false);
    setRoomCode('');
    // PROBLEMA 2 RESOLVIDO: Limpar histórico ao voltar ao Lobby
    setQuestionHistory([]);
    setChatMessages([]);
    setUndoStack([]);
    setCardStatuses({});
    setCurrentQuestion(null);
    setQuestionToAnswer(null);
    setMySecretCharacter(null);
    setOpponentSecretCharacter(null);
    setOpponentReady(false);
    setGameOverResult(null);
    setWrongGuessAlert(null);
    hasStartedGameRef.current = false;
  };

  // REGRA CENTRAL: "Jogar" ou "Usar este baralho" NUNCA cria sala nem inicia partida diretamente.
  // Sempre redireciona para a tela "Configurar Partida" com o baralho pré-selecionado no rascunho.
  const handlePlaySavedDeck = async (savedDeck: SavedDeck) => {
    setIsBuildingDeck(false);

    // Se já estiver com uma sala de espera aberta como anfitrião, aplica o baralho à sala atual e retorna
    if (waitingForPlayer && roomCode && isHost) {
      const { draft } = applyDeckToDraft(savedDeck);
      const updatedConfig: RoomConfig = {
        ...roomConfig,
        mode: 'custom',
        cardCount: draft.cardCount,
        deckName: draft.deckName,
        customCards: draft.customCards,
      };
      setRoomConfig(updatedConfig);
      const syncedDeck = getDeckByDifficulty(updatedConfig.cardCount, updatedConfig.customCards);
      setActiveDeck(syncedDeck);
      setPhase('LOBBY');
      window.history.pushState(null, '', '/');
      setCurrentPath('/');
      sounds.playClick();
      network.syncRoomState({
        config: updatedConfig,
      }).catch((err) => console.error('Erro ao sincronizar baralho:', err));
      return;
    }

    // Aplica o baralho ao rascunho com verificação de compatibilidade de quantidade
    const isChoice = isChoiceMode();
    const { draft } = applyDeckToDraft(savedDeck, { isChoiceMode: isChoice });

    const updatedConfig: RoomConfig = {
      ...roomConfig,
      mode: 'custom',
      cardCount: draft.cardCount,
      deckName: draft.deckName,
      customCards: draft.customCards,
      isCallMode: draft.isCallMode,
    };
    setRoomConfig(updatedConfig);
    const syncedDeck = getDeckByDifficulty(draft.cardCount, draft.customCards);
    setActiveDeck(syncedDeck);
    setIsConfiguringRoom(true);
    setPhase('LOBBY');
    window.history.pushState(null, '', '/');
    setCurrentPath('/');
    sounds.playClick();
  };

  const handleSendChat = (text: string) => {
    network.send('CHAT', { text });
    setChatMessages((prev) => [
      ...prev.slice(-15),
      { sender: playerName, text, id: 'm_' + Date.now() },
    ]);
  };

  const isMyTurn = currentTurnPlayerId === network.playerId;

  // Renderizar SandBox de Redesign da Partida (/partida-design/*)
  if (currentPath.startsWith('/partida-design')) {
    return (
      <MatchDesignSandbox
        onExitSandbox={() => {
          window.history.pushState(null, '', '/');
          setCurrentPath('/');
          setPhase('LOBBY');
        }}
      />
    );
  }

  // Renderizar Painel de Administrador (/painel-admin) - Estritamente Restrito a Administradores
  if (currentPath === '/painel-admin' || phase === 'ADMIN_PANEL') {
    return (
      <AdminLayout
        currentUser={currentUser}
        onBackToGame={() => {
          window.history.pushState(null, '', '/');
          setCurrentPath('/');
          setPhase('LOBBY');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F2EA] text-[#2B2420] flex flex-col selection:bg-[#E2DACD] selection:text-[#2B2420] font-sans relative">
      {/* Wallpaper de Fundo Personalizado (Padrão Doodle Suave e Sutil - Contraste Reduzido em 35%) */}
      <div
        className="fixed inset-0 pointer-events-none -z-10 bg-repeat bg-[length:540px_auto] opacity-[0.08] transition-opacity"
        style={{
          backgroundImage: "url('/wallpaper.jpg')",
        }}
      />

      {/* Barra Superior */}
      <header className="border-b border-[#E2DACD] bg-[#F6F2EA]/95 backdrop-blur-md sticky top-0 z-30 transition-colors">
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span
              onClick={handleNavigateToMainMenu}
              className="flex items-center cursor-pointer select-none shrink-0"
              title="Clique para voltar ao menu principal"
            >
              <img
                src="/logo-icon.svg"
                alt="Tá na Cara!"
                className="h-8 w-8 object-contain sm:hidden"
              />
              <img
                src="/logo-horizontal.svg"
                alt="Tá na Cara!"
                className="hidden sm:block h-8 sm:h-9 w-auto object-contain hover:opacity-90 transition-opacity"
              />
            </span>
            {/* Botão de Reconectar no Canto Superior Esquerdo ao lado do Logo / Tag */}
            {reconnectSession && reconnectSecondsLeft > 0 && phase !== 'PLAYING' && phase !== 'CHOOSING_SECRET' && (
              <button
                onClick={() => handleReconnectMatch(reconnectSession)}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-black text-[11px] sm:text-xs shadow-tactile transition-all active:scale-95 animate-pulse cursor-pointer shrink-0"
                title="Clique para voltar para sua partida em andamento"
              >
                <RotateCcw size={13} className="animate-spin-slow shrink-0" />
                <span className="hidden xs:inline">Reconectar</span>
                <span>#{reconnectSession.roomCode}</span>
                <span className="bg-black/25 text-white text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold tabular-nums">
                  {Math.floor(reconnectSecondsLeft / 60)}:{String(reconnectSecondsLeft % 60).padStart(2, '0')}
                </span>
              </button>
            )}

            {roomCode && (phase === 'PLAYING' || phase === 'CHOOSING_SECRET') && (
              <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-xs font-sans font-black tracking-tight text-amber-900 shadow-sm">
                <span>Sala:</span>
                <span className="font-extrabold">{roomCode}</span>
                <span className="text-[11px] font-bold text-amber-700">({activeDeck.length} Caras)</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Header da partida com ícones ao lado dos nomes e timer dinâmico no scroll */}
            {phase === 'PLAYING' && (
              <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-100/90 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-slate-200 text-xs font-bold shadow-sm max-w-[125px] sm:max-w-none shrink min-w-0">
                  {/* Jogador Atual */}
                  <div className="flex items-center gap-1 min-w-0">
                    {currentUser?.avatarUrl ? (
                      <img
                        src={currentUser.avatarUrl}
                        alt={playerName}
                        className="w-4 h-4 sm:w-5 sm:h-5 rounded-full object-cover ring-1 ring-sky-500 shadow-sm shrink-0"
                      />
                    ) : (
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-[9px] font-black border border-sky-300 shrink-0">
                        <UserIcon size={10} />
                      </div>
                    )}
                    <span className="text-slate-800 font-extrabold truncate max-w-[36px] sm:max-w-[90px]">{playerName}</span>
                  </div>

                  <span className="text-slate-400 text-[9px] sm:text-[10px] font-black uppercase tracking-wider shrink-0">vs</span>

                  {/* Oponente */}
                  <div className="flex items-center gap-1 min-w-0">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-[9px] font-black border border-rose-300 shrink-0">
                      <UserIcon size={10} />
                    </div>
                    <span className="text-rose-600 font-black truncate max-w-[36px] sm:max-w-[90px]">{opponentName}</span>
                  </div>
                </div>

                {/* PONTO 1.b: Timer Fluido que aparece no cabeçalho quando o painel de turno sai da visão (apenas fora do Modo Call) */}
                {!roomConfig.isCallMode && (() => {
                  const isUrgent = turnTimeLeft <= 10;
                  const minutes = Math.floor(turnTimeLeft / 60);
                  const seconds = turnTimeLeft % 60;
                  const formattedHeaderTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                  return (
                    <div
                      onClick={() => {
                        questionControlAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      title="Tempo restante deste turno (clique para rolar até o controle)"
                      className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl border text-xs font-sans font-black tabular-nums tracking-tight transition-all duration-300 ease-out cursor-pointer select-none shrink-0 shadow-sm ${
                        !isQuestionControlVisible
                          ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                          : 'opacity-0 -translate-y-2 scale-90 pointer-events-none max-w-0 px-0 overflow-hidden border-0 m-0'
                      } ${
                        isUrgent
                          ? 'bg-rose-100 text-rose-700 border-rose-300 animate-pulse ring-2 ring-rose-200'
                          : !isMyTurn
                          ? 'bg-slate-100 text-slate-700 border-slate-200'
                          : 'bg-sky-50 text-sky-800 border-sky-200'
                      }`}
                    >
                      <Clock size={13} className={isUrgent ? 'text-rose-600 animate-spin' : !isMyTurn ? 'text-slate-500' : 'text-sky-600'} />
                      <span className="font-black tracking-tight">{formattedHeaderTime}</span>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Ocultar botão de perfil/login quando estiver na tela de jogo */}
            {phase !== 'PLAYING' && phase !== 'CHOOSING_SECRET' && (
              currentUser ? (
                <>
                  {currentUser.is_admin && (
                    <button
                      onClick={() => {
                        window.history.pushState(null, '', '/painel-admin');
                        setCurrentPath('/painel-admin');
                        setPhase('ADMIN_PANEL');
                      }}
                      className="flex items-center gap-1.5 text-xs font-sans text-[#6F655C] hover:text-[#2B2420] transition-colors cursor-pointer px-2 py-1.5"
                      title="Acessar Painel de Gestão (Admin)"
                    >
                      <Shield size={14} className="sm:hidden text-[#6F655C]" />
                      <span className="hidden sm:inline">Painel Admin</span>
                    </button>
                  )}
                  <button
                    onClick={() => setPhase('PROFILE')}
                    className="flex items-center gap-2 text-xs font-medium text-[#2B2420] bg-[#FBF8F3] hover:bg-[#F2ECE1] px-3 py-1.5 rounded-[6px] border border-[#E2DACD] transition-colors cursor-pointer shrink-0 min-h-[38px]"
                    title="Ver perfil e baralhos"
                  >
                    {currentUser.avatarUrl ? (
                      <img
                        src={currentUser.avatarUrl}
                        alt={currentUser.username}
                        className="w-5 h-5 rounded-[4px] object-cover border border-[#E2DACD] shrink-0"
                      />
                    ) : (
                      <UserIcon size={14} className="text-[#6F655C] shrink-0" />
                    )}
                    <span className="hidden sm:inline max-w-[90px] truncate">{currentUser.username}</span>
                    <span className="text-[11px] text-[#6F655C]">Perfil</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setLoginModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#FBF8F3] hover:bg-[#F2ECE1] text-[#2B2420] text-xs font-medium transition-colors border border-[#E2DACD] cursor-pointer shrink-0 min-h-[38px]"
                >
                  <UserIcon size={14} className="text-[#6F655C] shrink-0" />
                  <span>Entrar</span>
                </button>
              )
            )}

            {/* Botão de Som: Ícone puro, 44x44px touch target, aria-label descritivo */}
            <button
              onClick={toggleSound}
              aria-label={soundEnabled ? 'Silenciar efeitos sonoros' : 'Ativar efeitos sonoros'}
              title={soundEnabled ? 'Silenciar Sons' : 'Ativar Sons'}
              className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-[6px] bg-[#FBF8F3] hover:bg-[#F2ECE1] text-[#6F655C] hover:text-[#2B2420] border border-[#E2DACD] transition-colors cursor-pointer shrink-0"
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            {/* Botão no Canto Superior Direito para Voltar ao Menu Principal */}
            {phase !== 'PROFILE' && phase !== 'COMMUNITY' && (phase !== 'LOBBY' || waitingForPlayer || isBuildingDeck) && (
              <button
                onClick={handleNavigateToMainMenu}
                title="Voltar ao Menu Principal"
                className="flex items-center justify-center gap-1 px-3 py-2 rounded-[6px] bg-transparent hover:bg-[#F8EBEA] border border-[#ECC7C5] text-[#8C2E2A] text-xs font-medium transition-colors cursor-pointer shrink-0 min-h-[38px]"
              >
                <LogOut size={13} />
                <span className="hidden sm:inline">Menu</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Conteúdo Principal (Container Alinhado com o Header) */}
      <main className={`flex-1 w-full mx-auto px-2 sm:px-4 md:px-6 py-2 sm:py-4 flex flex-col ${phase === 'PLAYING' ? 'max-w-[1360px]' : 'max-w-6xl'}`}>
        {wrongGuessAlert && (
          <div className="mb-4 bg-rose-50 border-2 border-rose-300 rounded-2xl p-3.5 text-center text-sm font-extrabold text-rose-800 shadow-sm animate-bounce">
            ⚠️ {wrongGuessAlert}
          </div>
        )}

        {/* 1. LOBBY */}
        <div className={(phase === 'LOBBY' || phase === 'CREATE_LOBBY') && !isBuildingDeck ? 'block' : 'hidden'}>
          <Lobby
            onJoinRoom={handleJoinRoom}
            onOpenCreateLobby={(pName) => {
              setPlayerName(pName);
            }}
            onOpenDeckBuilder={(count) => {
              setEditingDeck(null);
              setDeckTargetCount(count || 15);
              setIsBuildingDeck(true);
            }}
            onOpenLogin={() => setLoginModalOpen(true)}
            onOpenProfile={() => setPhase('PROFILE')}
            onOpenPublicLobbies={() => setPhase('PUBLIC_LOBBIES')}
            onOpenCommunity={() => setPhase('COMMUNITY')}
            onAbandonWaiting={handleExitToLobby}
            currentUser={currentUser}
            onLogout={() => {
              if (roomCode) {
                network.cleanupStorageAndRoom(roomCode);
              }
              auth.logout();
              setCurrentUser(null);
              setPhase('LOBBY');
              setWaitingForPlayer(false);
            }}
            isConnecting={isConnecting}
            waitingForPlayer={waitingForPlayer}
            roomCode={roomCode}
            errorMessage={errorMessage}
            reconnectSession={reconnectSession}
            reconnectSecondsLeft={reconnectSecondsLeft}
            onReconnectMatch={handleReconnectMatch}
            onDismissReconnect={handleDismissReconnect}
            roomConfig={roomConfig}
            onUpdateConfig={(newConfig) => {
              setRoomConfig(newConfig);
              const syncedDeck = getDeckByDifficulty(newConfig.cardCount, newConfig.customCards);
              setActiveDeck(syncedDeck);
              network.syncRoomState({ config: newConfig });
            }}
            isConfiguringRoom={isConfiguringRoom}
            onStartConfiguringRoom={() => setIsConfiguringRoom(true)}
            onCancelConfiguringRoom={() => setIsConfiguringRoom(false)}
          />
        </div>

        {/* 1.1 CONSTRUTOR DE BARALHO PERSONALIZADO */}
        {isBuildingDeck && (
          <CustomDeckBuilder
            targetCount={deckTargetCount}
            roomCode={roomCode || 'temp'}
            currentUser={currentUser}
            initialDeck={editingDeck}
            isFromProfile={phase === 'PROFILE'}
            onFinishDeck={async (customCards, customDeckName) => {
              setIsBuildingDeck(false);
              if (phase === 'PROFILE' || editingDeck) {
                if (editingDeck) {
                  await auth.updateSavedDeck(
                    editingDeck.id,
                    editingDeck.user_id || currentUser?.id || 'guest',
                    customDeckName || editingDeck.name || 'Baralho Personalizado',
                    customCards.length,
                    customCards
                  );
                } else if (currentUser) {
                  await auth.saveDeck(
                    currentUser.id,
                    customDeckName || 'Baralho Personalizado',
                    customCards.length,
                    customCards
                  );
                }
                setEditingDeck(null);
                setPhase('PROFILE');
                return;
              }

              // Se estava em sala de espera aberta como anfitrião, aplica o baralho diretamente e retorna à sala
              if (waitingForPlayer && roomCode && isHost) {
                const updatedConfig: RoomConfig = {
                  ...roomConfig,
                  mode: 'custom',
                  cardCount: deckTargetCount,
                  deckName: customDeckName || 'Baralho Personalizado',
                  customCards,
                };
                setRoomConfig(updatedConfig);
                const syncedDeck = getDeckByDifficulty(updatedConfig.cardCount, customCards);
                setActiveDeck(syncedDeck);
                setIsBuildingDeck(false);
                setPhase('LOBBY');
                sounds.playWin();
                network.syncRoomState({ config: updatedConfig }).catch((err) => console.error(err));
                return;
              }

              // Seleciona o baralho recém-criado e volta para a tela de Configurar Partida
              const updatedConfig: RoomConfig = {
                ...roomConfig,
                mode: 'custom',
                cardCount: deckTargetCount,
                deckName: customDeckName || 'Baralho Personalizado',
                customCards,
              };
              setRoomConfig(updatedConfig);
              const syncedDeck = getDeckByDifficulty(deckTargetCount, customCards);
              setActiveDeck(syncedDeck);
              setIsConfiguringRoom(true);
              setPhase('LOBBY');
              sounds.playClick();
            }}
            onCancel={() => {
              setIsBuildingDeck(false);
              if (editingDeck || phase === 'PROFILE') {
                setEditingDeck(null);
                setPhase('PROFILE');
              } else {
                setIsConfiguringRoom(true);
                setPhase('LOBBY');
              }
            }}
          />
        )}

        {/* 1.2 PÁGINA EXCLUSIVA DE PERFIL */}
        {phase === 'PROFILE' && currentUser && !isBuildingDeck && (
          <ProfilePage
            currentUser={currentUser}
            onBackToLobby={() => {
              window.history.pushState(null, '', '/');
              setCurrentPath('/');
              setPhase('LOBBY');
            }}
            onPlayDeck={(deck) => handlePlaySavedDeck(deck)}
            onViewDeck={(deck) => {
              const newUrl = `/comunidade/baralho/${deck.id}`;
              window.history.pushState(null, '', newUrl);
              setCurrentPath(newUrl);
              setPhase('COMMUNITY');
            }}
            onEditDeck={(deck) => {
              setEditingDeck(deck);
              setDeckTargetCount(deck.card_count as DifficultyCount);
              setIsBuildingDeck(true);
            }}
            onCreateNewDeck={() => {
              setEditingDeck(null);
              setDeckTargetCount(30);
              setIsBuildingDeck(true);
            }}
            onReconnectMatch={handleReconnectMatch}
          />
        )}

        {/* 1.3 LOBBIES PÚBLICOS (Ponto 4.a) */}
        {phase === 'PUBLIC_LOBBIES' && !isBuildingDeck && (
          <PublicLobbiesPage
            onBackToLobby={() => {
              window.history.pushState(null, '', '/');
              setCurrentPath('/');
              setPhase('LOBBY');
            }}
            onJoinLobby={(code) => {
              handleJoinRoom(code, playerName || currentUser?.username || 'Convidado', false, {
                mode: 'standard',
                cardCount: 15,
              });
            }}
            onCreateRoomDirectly={() => {
              window.history.pushState(null, '', '/');
              setCurrentPath('/');
              setPhase('LOBBY');
            }}
          />
        )}

        {/* 1.4 EXPLORAR COMUNIDADE E PÁGINA DO BARALHO */}
        {phase === 'COMMUNITY' && !isBuildingDeck && (
          currentPath.startsWith('/comunidade/baralho/') ? (
            <div className="animate-in fade-in duration-150 flex-1 flex flex-col">
              <DeckDetailsPage
                deckId={currentPath.replace('/comunidade/baralho/', '').split('?')[0]}
                currentUser={currentUser}
                onBack={() => {
                  if (window.history.length > 1) {
                    window.history.back();
                  } else {
                    window.history.pushState(null, '', '/comunidade');
                    setCurrentPath('/comunidade');
                  }
                }}
                onNavigateToDeck={(nextId) => {
                  const newUrl = `/comunidade/baralho/${nextId}`;
                  window.history.pushState(null, '', newUrl);
                  setCurrentPath(newUrl);
                }}
                onUseDeckInConfiguration={(deck) => {
                  handlePlaySavedDeck(deck);
                }}
                onPlayDeck={(deck) => {
                  handlePlaySavedDeck(deck);
                }}
                onEditDeck={(deck) => {
                  setEditingDeck(deck);
                  setDeckTargetCount(deck.card_count as DifficultyCount);
                  setIsBuildingDeck(true);
                }}
                onOpenLogin={() => setLoginModalOpen(true)}
                onGoToCommunity={() => {
                  window.history.pushState(null, '', '/comunidade');
                  setCurrentPath('/comunidade');
                }}
              />
            </div>
          ) : (
            <div className="animate-in fade-in duration-150 flex-1 flex flex-col">
              <CommunityExplorerPage
                currentUser={currentUser}
                isConfiguring={isConfiguringRoom}
                onBackToHome={() => {
                  window.history.pushState(null, '', '/');
                  setCurrentPath('/');
                  setPhase('LOBBY');
                }}
                onOpenLogin={() => setLoginModalOpen(true)}
                onPlayDeck={(deck) => {
                  handlePlaySavedDeck(deck);
                }}
                onViewDeck={(deck) => {
                  const newUrl = `/comunidade/baralho/${deck.id}`;
                  window.history.pushState(null, '', newUrl);
                  setCurrentPath(newUrl);
                }}
                onGoToProfile={() => {
                  window.history.pushState(null, '', '/perfil');
                  setCurrentPath('/perfil');
                  setPhase('PROFILE');
                }}
              />
            </div>
          )
        )}

        {/* 2. ESCOLHA DO PERSONAGEM SECRETO */}
        {phase === 'CHOOSING_SECRET' && (
          <SecretSelectionModal
            cards={activeDeck}
            opponentName={opponentName}
            opponentReady={opponentReady}
            onConfirmSelection={handleConfirmSecret}
          />
        )}

        {/* 3. TABULEIRO EM JOGO (NOVO DESIGN - PROPOSTA B / ESTILO TERMO & CONTEXTO) */}
        {phase === 'PLAYING' && (
          <div className="w-full flex flex-col items-center animate-in fade-in duration-200">
            <MatchDesignB
              deck={activeDeck}
              cardStatuses={cardStatuses}
              secretCharacter={mySecretCharacter || undefined}
              questionHistory={questionHistory}
              currentQuestion={currentQuestion}
              isMyTurn={isMyTurn}
              timeLeft={turnTimeLeft}
              totalTime={TURN_DURATION_SECONDS}
              opponentName={opponentName}
              playerName={playerName}
              roomCode={roomCode}
              undoDisabled={undoStack.length === 0}
              isCallMode={roomConfig.isCallMode}
              onCardClick={handleCardClick}
              onUndo={() => {
                if (undoStack.length === 0) return;
                sounds.playClick();
                handleUndo();
              }}
              onAskQuestion={handleAskQuestion}
              onPassTurn={handlePassTurn}
              onOpenGuessModal={() => {
                if (isMyTurn) {
                  setGuessModalOpen(true);
                } else {
                  sounds.playWrong();
                }
              }}
            />

            {/* Chat Rápido DENTRO da Área do Jogo */}
            <QuickChat
              onSendMessage={handleSendChat}
              recentMessages={chatMessages}
              currentUserName={playerName}
            />
          </div>
        )}

        {/* Modal de Resposta: EXCLUSIVAMENTE SIM ou NÃO (oculto no Modo Call) */}
        {questionToAnswer && mySecretCharacter && !roomConfig.isCallMode && (
          <QuestionAnswerModal
            question={questionToAnswer}
            mySecretCharacter={mySecretCharacter}
            onAnswer={handleAnswerQuestion}
          />
        )}

        {/* Modal quando Oponente Abandona a Partida (Ponto 2: minimalista, sem alert) */}
        <OpponentLeftModal
          isOpen={opponentLeftData.isOpen}
          opponentName={opponentLeftData.opponentName}
          onConfirm={() => {
            setOpponentLeftData({ isOpen: false, opponentName: '' });
            handleExitToLobby();
          }}
        />

        {/* Modal de Palpite Final */}
        {guessModalOpen && (
          <GuessModal
            cards={activeDeck}
            cardStatuses={cardStatuses}
            opponentName={opponentName}
            onConfirmGuess={handleConfirmGuess}
            onClose={() => setGuessModalOpen(false)}
          />
        )}

        {/* Modal de Fim de Jogo: Vencedor e Perdedor simultâneos (ERRO 2 RESOLVIDO) */}
        {phase === 'GAME_OVER' && gameOverResult && mySecretCharacter && (
          <GameOverModal
            isWinner={gameOverResult.isWinner}
            winnerName={gameOverResult.winnerName}
            mySecretCharacter={mySecretCharacter}
            opponentSecretCharacter={
              opponentSecretCharacter || mySecretCharacter
            }
            opponentName={opponentName}
            rematchRequestedByMe={rematchRequestedByMe}
            rematchRequestedByOpponent={rematchRequestedByOpponent}
            onRematch={handleRequestRematch}
            onExit={handleExitToLobby}
          />
        )}

        {/* Modal de Confirmação de Abandonar Partida (PONTO 1.a) */}
        {showAbandonModal && (
          <div className="fixed inset-0 z-50 bg-[#382C26]/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-[#E8E0D8] rounded-3xl max-w-sm w-full p-6 shadow-xl text-center animate-in zoom-in-95">
              <div className="w-14 h-14 bg-[#FFE8E0] text-[#C25E3E] rounded-2xl flex items-center justify-center mx-auto mb-3 border border-[#FFB59A]/40 shadow-xs">
                <AlertTriangle size={26} />
              </div>

              <h3 className="text-lg font-bold text-[#382C26] mb-1">
                Abandonar Partida?
              </h3>
              <p className="text-xs text-[#8C786E] mb-6 leading-relaxed">
                Você deseja realmente abandonar a partida atual e voltar ao menu principal?
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowAbandonModal(false)}
                  className="py-2.5 px-4 rounded-xl bg-[#FAF6F0] hover:bg-[#E8E0D8] text-[#776156] font-bold text-xs uppercase tracking-wider transition-all border border-[#E8E0D8] cursor-pointer"
                >
                  Continuar Jogando
                </button>
                <button
                  onClick={handleConfirmAbandon}
                  className="py-2.5 px-4 rounded-xl bg-[#C25E3E] hover:bg-[#A94E31] text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-none"
                >
                  Sim, Abandonar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Login / Cadastro */}
        <LoginModal
          isOpen={loginModalOpen}
          onClose={() => setLoginModalOpen(false)}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            setPlayerName(user.username);
          }}
        />

        {/* Modal de Importação de Baralho Compartilhado via URL (?import_deck=UUID) */}
        {importDeckId && (
          <ImportSharedDeckModal
            deckId={importDeckId}
            currentUser={currentUser}
            onOpenLogin={() => setLoginModalOpen(true)}
            onPlayDeck={(deck) => {
              setImportDeckId(null);
              handlePlaySavedDeck(deck);
            }}
            onClose={() => setImportDeckId(null)}
            onGoToProfile={() => setPhase('PROFILE')}
          />
        )}

        {/* Modal para Digitar Senha da Sala Secreta (Ponto 4.a) */}
        <PasswordPromptModal
          isOpen={passwordModalOpen}
          roomCode={passwordModalCode}
          isLoading={isVerifyingPassword}
          errorMessage={passwordModalError}
          onConfirm={(password) => {
            setIsVerifyingPassword(true);
            handleJoinRoom(
              passwordModalCode,
              playerName || currentUser?.username || 'Convidado',
              false,
              { mode: 'standard', cardCount: 15 },
              password
            ).finally(() => setIsVerifyingPassword(false));
          }}
          onClose={() => {
            setPasswordModalOpen(false);
            setPasswordModalCode('');
            setPasswordModalError(null);
          }}
        />
      </main>

      {/* Rodapé (Footer) com Política de Privacidade e Termos */}
      <Footer
        onOpenPrivacy={handleOpenPrivacy}
        onOpenTerms={handleOpenTerms}
      />

      {/* Modal Legal de Privacidade e Termos de Uso */}
      <LegalModal
        isOpen={legalModalOpen}
        initialTab={legalModalTab}
        onClose={() => setLegalModalOpen(false)}
      />
    </div>
  );
}

export default App;
