import { useState, useEffect, useRef } from 'react';
import { getDeckByDifficulty, STANDARD_60_CHARACTERS } from './utils/characters';
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
import { auth, type AppUser } from './services/auth';
import { sounds } from './utils/sound';
import { Card } from './components/Card';
import { SecretCardBadge } from './components/SecretCardBadge';
import { QuestionControl } from './components/QuestionControl';
import { QuestionAnswerModal } from './components/QuestionAnswerModal';
import { GuessModal } from './components/GuessModal';
import { GameOverModal } from './components/GameOverModal';
import { SecretSelectionModal } from './components/SecretSelectionModal';
import { Lobby } from './components/Lobby';
import { QuickChat } from './components/QuickChat';
import { LoginModal } from './components/LoginModal';
import { UserDashboardModal } from './components/UserDashboardModal';
import { CustomDeckBuilder } from './components/CustomDeckBuilder';
import { RightSidebar } from './components/RightSidebar';
import { Footer } from './components/Footer';
import { LegalModal, type LegalTab } from './components/LegalModal';
import { Volume2, VolumeX, Users, User as UserIcon, LogOut, AlertTriangle, Trophy } from 'lucide-react';
import type { SavedDeck } from './services/auth';

export function App() {
  // Autenticação
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => auth.getCurrentUser());
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [userDashboardOpen, setUserDashboardOpen] = useState(false);

  // Escutar login/logout e mudanças de sessão (OAuth Google e Discord)
  useEffect(() => {
    const unsubscribe = auth.onAuthChange((user) => {
      setCurrentUser(user);
      if (user?.username) {
        setPlayerName(user.username);
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

  // Fases e Configuração do Jogo
  const [phase, setPhase] = useState<GamePhase>('LOBBY');
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
  const [activeDeck, setActiveDeck] = useState<Character[]>(() => STANDARD_60_CHARACTERS.slice(0, 15));
  const [isBuildingDeck, setIsBuildingDeck] = useState(false);
  const [deckTargetCount, setDeckTargetCount] = useState<DifficultyCount>(30);

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

  const hasStartedGameRef = useRef<boolean>(false);

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

  // PONTO 1: Botão Voltar do Navegador (popstate)
  useEffect(() => {
    window.history.replaceState({ phase: 'LOBBY' }, '', window.location.href);
  }, []);

  useEffect(() => {
    if (phase !== 'LOBBY') {
      window.history.pushState({ phase }, '', window.location.href);
    }
  }, [phase]);

  useEffect(() => {
    const handlePopState = () => {
      if (phase === 'CHOOSING_SECRET') {
        setWaitingForPlayer(false);
        setPhase('LOBBY');
      } else if (phase === 'PLAYING') {
        setShowAbandonModal(true);
        window.history.pushState({ phase: 'PLAYING' }, '', window.location.href);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [phase]);

  // PONTO 2 & ERRO 1: F5 / Atualizar Página (Restaurar Sessão e Turno com Pergunta Ativa)
  useEffect(() => {
    const restoreSession = async () => {
      const saved = localStorage.getItem('cara_active_session');
      if (!saved) return;
      try {
        const session = JSON.parse(saved);
        if (!session.roomCode) return;

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
          
          // Restaurar turno e pergunta ativa (ERRO 1 RESOLVIDO)
          const activeTurn = room.current_turn || session.currentTurnPlayerId || '';
          setCurrentTurnPlayerId(activeTurn);
          const activeQuestion = room.current_question || session.currentQuestion || null;
          setCurrentQuestion(activeQuestion);
          if (session.questionHistory) setQuestionHistory(session.questionHistory);

          setPhase(session.phase || 'PLAYING');
        } else {
          localStorage.removeItem('cara_active_session');
        }
      } catch (err) {
        console.warn('Erro ao restaurar sessão anterior:', err);
        localStorage.removeItem('cara_active_session');
      }
    };
    restoreSession();
  }, []);

  // Salvar sessão ativa para persistência em F5
  useEffect(() => {
    if (phase !== 'LOBBY' && roomCode) {
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
      };
      localStorage.setItem('cara_active_session', JSON.stringify(sessionData));
    } else if (phase === 'LOBBY' && !waitingForPlayer) {
      localStorage.removeItem('cara_active_session');
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
    waitingForPlayer,
  ]);

  // 1. Criar ou Entrar na Sala
  const handleJoinRoom = async (
    code: string,
    name: string,
    host: boolean,
    config: RoomConfig
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
    hasStartedGameRef.current = false;

    try {
      if (host) {
        setRoomConfig(config);
        const deck = getDeckByDifficulty(config.cardCount, config.customCards);
        setActiveDeck(deck);
        await network.createRoom(code, name, config);
        setIsConnecting(false);
        setWaitingForPlayer(true);
      } else {
        const room = await network.joinRoom(code, name);
        setIsConnecting(false);
        setOpponentName(room.host_name);
        setOpponentId(room.host_id);
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
      setErrorMessage(err.message || 'Erro ao conectar à sala.');
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
          setWaitingForPlayer(false);
          setPhase((curr) => (curr === 'LOBBY' ? 'CHOOSING_SECRET' : curr));
          break;
        }

        // PROBLEMA 1 RESOLVIDO: Quando oponente escolheu o segredo
        case 'CHOSE_SECRET': {
          setOpponentReady(true);
          // Se sou o Host e já escolhi meu segredo, realizo o sorteio 50/50
          if (isHost && mySecretRef.current) {
            startMatchLottery();
          }
          break;
        }

        // PROBLEMA 1 RESOLVIDO: Convidado recebe o resultado do sorteio feito pelo Host
        case 'START_GAME': {
          hasStartedGameRef.current = true;
          setCurrentTurnPlayerId(msg.payload.startingPlayerId);
          setPhase('PLAYING');
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
          break;
        }

        case 'PASS_TURN': {
          setCurrentTurnPlayerId(network.playerId);
          setCurrentQuestion(null);
          break;
        }

        // ERRO 2 RESOLVIDO: Tratar quando o oponente faz um palpite
        case 'MAKE_GUESS': {
          const guessedId = msg.payload.characterId;
          const mySecret = mySecretRef.current;
          if (mySecret) {
            if (mySecret.id === guessedId) {
              // 1. O oponente acertou! Enviar resultado vitorioso para ele
              network.send('GUESS_RESULT', {
                correct: true,
                winnerId: msg.senderId,
                winnerName: msg.senderName,
                secretCharacter: mySecret,
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
            if (!winnerIsMe && msg.payload.secretCharacter) {
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

        case 'REMATCH': {
          resetForRematch();
          break;
        }

        // Oponente abandonou a partida
        case 'ABANDON_GAME': {
          sounds.playWrong();
          alert(`${msg.senderName} abandonou a partida. Retornando ao menu principal.`);
          handleExitToLobby();
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

  // PROBLEMA 1 RESOLVIDO: Sorteio 50/50 conduzido EXCLUSIVAMENTE pelo Host
  const startMatchLottery = async () => {
    if (!isHost || hasStartedGameRef.current) return;
    hasStartedGameRef.current = true;

    // Sorteio justo de 50/50 entre Host e Convidado
    const startingPlayerId = Math.random() < 0.5 ? network.playerId : opponentId;
    network.send('START_GAME', { startingPlayerId });
    setCurrentTurnPlayerId(startingPlayerId);
    setPhase('PLAYING');
    await network.syncRoomState({ status: 'playing', current_turn: startingPlayerId });
  };

  const handleConfirmSecret = (char: Character) => {
    setMySecretCharacter(char);
    mySecretRef.current = char;
    network.send('CHOSE_SECRET', { ready: true });

    // Se sou o Host e o oponente já estiver pronto, sorteio agora!
    if (isHost && opponentReady) {
      startMatchLottery();
    }
  };

  const handleSetCardStatus = (charId: string, newStatus: CardStatus) => {
    setCardStatuses((prev) => {
      const prevStatus = prev[charId] || 'normal';
      if (prevStatus === newStatus) return prev;

      setUndoStack((old) => [
        ...old,
        {
          type: 'status_change',
          previousStates: { [charId]: prevStatus },
          newStates: { [charId]: newStatus },
          description: `Alterou carta para ${newStatus}`,
        },
      ]);

      return {
        ...prev,
        [charId]: newStatus,
      };
    });
  };

  const handleTargetSelect = (char: Character) => {
    setTargetCharacter(char);

    setCardStatuses((prev) => {
      const previousStates: Record<string, CardStatus> = { ...prev };
      const newStates: Record<string, CardStatus> = {};

      activeDeck.forEach((c) => {
        if (c.id === char.id) {
          newStates[c.id] = 'target';
        } else {
          newStates[c.id] = 'discard';
        }
      });

      setUndoStack((old) => [
        ...old,
        {
          type: 'status_change',
          previousStates,
          newStates,
          description: `Selecionou ${char.name} como alvo final`,
        },
      ]);

      return newStates;
    });
  };

  const handleCancelTarget = () => {
    handleUndo();
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
    network.send('ANSWER_QUESTION', { answer: ans });
    setCurrentQuestion(answeredQ);
    setQuestionHistory((prev) =>
      prev.map((q, idx) => (idx === 0 ? answeredQ : q))
    );
    setQuestionToAnswer(null);
    network.syncRoomState({ current_question: answeredQ });
  };

  // Finalizar Turno passa a vez e limpa a pergunta ativa
  const handlePassTurn = () => {
    sounds.playClick();
    network.send('PASS_TURN', {});
    setCurrentTurnPlayerId(opponentId);
    setCurrentQuestion(null);
    network.syncRoomState({ current_turn: opponentId, current_question: null });
  };

  const handleConfirmGuess = (guessedChar: Character) => {
    setGuessModalOpen(false);
    setTargetCharacter(null);
    network.send('MAKE_GUESS', {
      characterId: guessedChar.id,
      characterName: guessedChar.name,
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

  const handleRequestRematch = () => {
    network.send('REMATCH', {});
    resetForRematch();
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
    setPhase('LOBBY');
    setWaitingForPlayer(false);
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

  // PONTO 2.b: Iniciar partida diretamente com um baralho personalizado salvo
  const handlePlaySavedDeck = (savedDeck: SavedDeck) => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newCode = `CARA-${randomSuffix}`;
    handleJoinRoom(newCode, playerName || currentUser?.username || 'Host', true, {
      mode: 'custom',
      cardCount: savedDeck.card_count as DifficultyCount,
      deckName: savedDeck.name,
      customCards: savedDeck.cards,
    });
  };

  const handleSendChat = (text: string) => {
    network.send('CHAT', { text });
    setChatMessages((prev) => [
      ...prev.slice(-15),
      { sender: playerName, text, id: 'm_' + Date.now() },
    ]);
  };

  const isMyTurn = currentTurnPlayerId === network.playerId;

  return (
    <div className="min-h-screen text-slate-800 flex flex-col selection:bg-sky-200 selection:text-sky-900 font-sans relative">
      {/* Wallpaper de Fundo Personalizado (Padrão Doodle Responsivo) */}
      <div
        className="fixed inset-0 pointer-events-none -z-10 bg-repeat bg-[length:540px_auto] opacity-90 transition-opacity"
        style={{
          backgroundImage: "url('/wallpaper.jpg')",
          backgroundColor: '#F0F4F8',
        }}
      />

      {/* Barra Superior */}
      <header className="border-b border-slate-200/90 bg-white/85 backdrop-blur-md sticky top-0 z-30 transition-colors">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              onClick={phase === 'LOBBY' ? undefined : () => setShowAbandonModal(true)}
              className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2 cursor-pointer select-none"
            >
              <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-sm shadow-tactile-sm">
                🎭
              </span>
              <span>Cara a Cara</span>
            </span>
            {roomCode && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-mono text-amber-900 font-extrabold">
                Sala: {roomCode} ({activeDeck.length} Caras)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {currentUser ? (
              <button
                onClick={() => setUserDashboardOpen(true)}
                className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm transition-all hover:border-indigo-400 group cursor-pointer"
                title="Ver estatísticas, vitórias/derrotas e baralhos salvos"
              >
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.username}
                    className="w-5 h-5 rounded-full object-cover ring-1 ring-indigo-500 shadow-sm"
                  />
                ) : (
                  <UserIcon size={14} className="text-amber-600" />
                )}
                <span>{currentUser.username}</span>
                <span className="text-[10px] bg-indigo-50 text-indigo-600 font-extrabold px-1.5 py-0.5 rounded-md border border-indigo-100 group-hover:bg-indigo-100 transition-colors flex items-center gap-1">
                  <Trophy size={10} />
                  Perfil
                </span>
              </button>
            ) : (
              <button
                onClick={() => setLoginModalOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200 cursor-pointer"
              >
                <UserIcon size={14} className="text-slate-500" />
                <span>Entrar</span>
              </button>
            )}

            {phase === 'PLAYING' && (
              <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold">
                <Users size={14} className="text-sky-600" />
                <span className="text-slate-700">{playerName}</span>
                <span className="text-slate-400">vs</span>
                <span className="text-rose-600 font-extrabold">{opponentName}</span>
              </div>
            )}

            <button
              onClick={toggleSound}
              title={soundEnabled ? 'Silenciar Sons' : 'Ativar Sons'}
              className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 shadow-sm transition-all cursor-pointer"
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>

            {/* PONTO 1: Botão no Canto Superior Direito para Voltar ao Menu Principal */}
            {phase !== 'LOBBY' && (
              <button
                onClick={() => setShowAbandonModal(true)}
                title="Voltar ao Menu Principal"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-extrabold uppercase tracking-wider transition-all active:scale-95 shadow-sm cursor-pointer"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Menu Principal</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 flex flex-col">
        {wrongGuessAlert && (
          <div className="mb-4 bg-rose-50 border-2 border-rose-300 rounded-2xl p-3.5 text-center text-sm font-extrabold text-rose-800 shadow-sm animate-bounce">
            ⚠️ {wrongGuessAlert}
          </div>
        )}

        {/* 1. LOBBY */}
        {phase === 'LOBBY' && !isBuildingDeck && (
          <Lobby
            onJoinRoom={handleJoinRoom}
            onOpenDeckBuilder={(count) => {
              setDeckTargetCount(count);
              setIsBuildingDeck(true);
            }}
            onOpenLogin={() => setLoginModalOpen(true)}
            onOpenDashboard={() => setUserDashboardOpen(true)}
            onSelectSavedDeck={handlePlaySavedDeck}
            currentUser={currentUser}
            onLogout={() => {
              auth.logout();
              setCurrentUser(null);
            }}
            isConnecting={isConnecting}
            waitingForPlayer={waitingForPlayer}
            roomCode={roomCode}
            errorMessage={errorMessage}
          />
        )}

        {/* 1.1 CONSTRUTOR DE BARALHO PERSONALIZADO */}
        {phase === 'LOBBY' && isBuildingDeck && (
          <CustomDeckBuilder
            targetCount={deckTargetCount}
            roomCode={roomCode || 'temp'}
            currentUser={currentUser}
            onFinishDeck={(customCards, customDeckName) => {
              setIsBuildingDeck(false);
              const randomSuffix = Math.floor(1000 + Math.random() * 9000);
              const newCode = `CARA-${randomSuffix}`;
              handleJoinRoom(newCode, playerName || currentUser?.username || 'Host', true, {
                mode: 'custom',
                cardCount: deckTargetCount,
                deckName: customDeckName,
                customCards,
              });
            }}
            onCancel={() => setIsBuildingDeck(false)}
          />
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

        {/* 3. TABULEIRO EM JOGO */}
        {phase === 'PLAYING' && (
          <div className="flex-1 flex flex-col lg:flex-row gap-4 items-start">
            <div className="flex-1 w-full flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-5">
                  {mySecretCharacter && (
                    <SecretCardBadge character={mySecretCharacter} />
                  )}
                </div>

                <div className="md:col-span-7 flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-3 text-xs font-bold text-slate-700 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                    <span>Dica:</span>
                    <span className="text-slate-500 font-medium">
                      Clique em qualquer cara para marcar <strong>'É o cara!'</strong>, <strong>'Suspeito'</strong> ou <strong>'Descarte'</strong>.
                    </span>
                  </div>
                </div>
              </div>

              {/* Painel de Perguntas Personalizadas (Erro 1 resolvido: não permite perguntar 2x) */}
              <QuestionControl
                isMyTurn={isMyTurn}
                opponentName={opponentName}
                currentQuestion={currentQuestion}
                onAskQuestion={handleAskQuestion}
                onPassTurn={handlePassTurn}
                onOpenGuessModal={() => setGuessModalOpen(true)}
              />

              <div className="bg-slate-100/70 border-2 border-slate-200 rounded-3xl p-3 sm:p-5 shadow-sm">
                <div
                  className={`grid gap-2.5 sm:gap-3 ${
                    activeDeck.length <= 15
                      ? 'grid-cols-3 sm:grid-cols-5'
                      : activeDeck.length <= 30
                      ? 'grid-cols-3 sm:grid-cols-5 md:grid-cols-6'
                      : activeDeck.length <= 45
                      ? 'grid-cols-3 sm:grid-cols-6 md:grid-cols-9'
                      : 'grid-cols-4 sm:grid-cols-6 md:grid-cols-10'
                  }`}
                >
                  {activeDeck.map((char) => (
                    <Card
                      key={char.id}
                      character={char}
                      status={cardStatuses[char.id] || 'normal'}
                      onSetStatus={handleSetCardStatus}
                      onTargetSelect={handleTargetSelect}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Barra Lateral Direita */}
            <RightSidebar
              onUndo={handleUndo}
              canUndo={undoStack.length > 0}
              targetCharacter={targetCharacter}
              onConfirmTargetGuess={handleConfirmGuess}
              onCancelTarget={handleCancelTarget}
              cardStatuses={cardStatuses}
              totalCards={activeDeck.length}
              questionHistory={questionHistory}
              opponentName={opponentName}
            />
          </div>
        )}

        {/* Modal de Resposta: EXCLUSIVAMENTE SIM ou NÃO */}
        {questionToAnswer && mySecretCharacter && (
          <QuestionAnswerModal
            question={questionToAnswer}
            mySecretCharacter={mySecretCharacter}
            onAnswer={handleAnswerQuestion}
          />
        )}

        {/* Modal de Palpite Final */}
        {guessModalOpen && (
          <GuessModal
            cards={activeDeck}
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
            onRematch={handleRequestRematch}
            onExit={handleExitToLobby}
          />
        )}

        {/* Modal de Confirmação de Abandonar Partida (PONTO 1.a) */}
        {showAbandonModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border-2 border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center animate-in zoom-in-95">
              <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-rose-200 shadow-tactile-sm">
                <AlertTriangle size={28} />
              </div>

              <h3 className="text-lg font-black text-slate-900 mb-1">
                Abandonar Partida?
              </h3>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                Você deseja realmente abandonar a partida atual e voltar ao menu principal?
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowAbandonModal(false)}
                  className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs uppercase tracking-wider transition-all"
                >
                  Continuar Jogando
                </button>
                <button
                  onClick={handleConfirmAbandon}
                  className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-tactile-sm transition-all active:translate-y-0.5"
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

        {/* Modal de Dashboard do Usuário Logado (Ponto 2.a & 2.b) */}
        {currentUser && (
          <UserDashboardModal
            isOpen={userDashboardOpen}
            onClose={() => setUserDashboardOpen(false)}
            currentUser={currentUser}
            onSelectSavedDeck={(savedDeck) => {
              setUserDashboardOpen(false);
              handlePlaySavedDeck(savedDeck);
            }}
          />
        )}
      </main>

      {/* Chat Rápido */}
      {phase === 'PLAYING' && (
        <QuickChat
          onSendMessage={handleSendChat}
          recentMessages={chatMessages}
        />
      )}

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
