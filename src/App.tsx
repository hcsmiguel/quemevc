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
import { supabase } from './services/supabase';
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
import { ProfilePage } from './components/ProfilePage';
import { ImportSharedDeckModal } from './components/ImportSharedDeckModal';
import { CustomDeckBuilder } from './components/CustomDeckBuilder';
import { PublicLobbiesPage } from './components/PublicLobbiesPage';
import { CreateLobbyPage } from './components/CreateLobbyPage';
import { OpponentLeftModal } from './components/OpponentLeftModal';
import { PasswordPromptModal } from './components/PasswordPromptModal';
import { RightSidebar } from './components/RightSidebar';
import { Footer } from './components/Footer';
import { LegalModal, type LegalTab } from './components/LegalModal';
import { Volume2, VolumeX, Users, User as UserIcon, LogOut, AlertTriangle, Trophy, Clock } from 'lucide-react';
import type { SavedDeck } from './services/auth';

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
        setPhase((prev) => (prev === 'PROFILE' ? 'LOBBY' : prev));
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
  const [deckIsSecret, setDeckIsSecret] = useState(false);
  const [deckPassword, setDeckPassword] = useState('');
  const [deckIsCallMode, setDeckIsCallMode] = useState(false);

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

  // PONTO 3: Temporizador para cada turno (60 segundos)
  const TURN_DURATION_SECONDS = 60;
  const [turnStartTime, setTurnStartTime] = useState<number>(Date.now());
  const turnStartTimeRef = useRef<number>(Date.now());
  turnStartTimeRef.current = turnStartTime;
  const [turnTimeLeft, setTurnTimeLeft] = useState<number>(TURN_DURATION_SECONDS);

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
      if (phase === 'PROFILE') {
        setPhase('LOBBY');
      } else if (phase === 'CHOOSING_SECRET') {
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
              setCurrentQuestion(msg.payload.currentQuestion);
            }
            setPhase((curr) => (curr === 'CHOOSING_SECRET' ? 'PLAYING' : curr));
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

  // PONTO 3: Temporizador para cada turno (60s)
  useEffect(() => {
    if (phase !== 'PLAYING') return;

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
  }, [phase, currentTurnPlayerId]);

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

    if (phase === 'PROFILE' || phase === 'PUBLIC_LOBBIES' || phase === 'CREATE_LOBBY') {
      setPhase('LOBBY');
      return;
    }

    if (phase === 'GAME_OVER') {
      handleExitToLobby();
      return;
    }

    setPhase('LOBBY');
    setWaitingForPlayer(false);
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

  // PONTO 2.b: Iniciar partida diretamente com um baralho personalizado salvo (Código de 6 números)
  const handlePlaySavedDeck = async (savedDeck: SavedDeck) => {
    setPhase('LOBBY');
    setIsBuildingDeck(false);
    const newCode = await network.generateUniqueRoomCode();
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col selection:bg-sky-200 selection:text-sky-900 font-sans relative">
      {/* Wallpaper de Fundo Personalizado (Padrão Doodle Suave e Sutil) */}
      <div
        className="fixed inset-0 pointer-events-none -z-10 bg-repeat bg-[length:540px_auto] opacity-25 transition-opacity"
        style={{
          backgroundImage: "url('/wallpaper.jpg')",
        }}
      />

      {/* Barra Superior */}
      <header className="border-b border-slate-200/90 bg-white/85 backdrop-blur-md sticky top-0 z-30 transition-colors">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              onClick={handleNavigateToMainMenu}
              className="flex items-center cursor-pointer select-none"
              title="Clique para voltar ao menu principal"
            >
              <img
                src="/logo-horizontal.svg"
                alt="Tá na Cara!"
                className="h-9 sm:h-10 w-auto object-contain hover:opacity-90 transition-opacity"
              />
            </span>
            {roomCode && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-mono text-amber-900 font-extrabold">
                Sala: {roomCode} ({activeDeck.length} Caras)
              </span>
            )}
            {phase === 'PLAYING' && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-black border transition-all ${
                turnTimeLeft <= 10
                  ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                  : isMyTurn
                  ? 'bg-sky-50 text-sky-800 border-sky-200'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}>
                <Clock size={13} className={turnTimeLeft <= 10 ? 'text-rose-600 animate-spin' : isMyTurn ? 'text-sky-600' : 'text-slate-500'} />
                <span>
                  {isMyTurn ? 'Sua Vez' : `Vez de ${opponentName}`}: {String(Math.floor(turnTimeLeft / 60)).padStart(2, '0')}:{String(turnTimeLeft % 60).padStart(2, '0')}
                </span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {currentUser ? (
              <button
                onClick={() => setPhase('PROFILE')}
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
            {phase !== 'PROFILE' && (phase !== 'LOBBY' || waitingForPlayer || isBuildingDeck) && (
              <button
                onClick={handleNavigateToMainMenu}
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
            onOpenCreateLobby={(pName) => {
              setPlayerName(pName);
              setPhase('CREATE_LOBBY');
            }}
            onOpenLogin={() => setLoginModalOpen(true)}
            onOpenProfile={() => setPhase('PROFILE')}
            onOpenPublicLobbies={() => setPhase('PUBLIC_LOBBIES')}
            onAbandonWaiting={handleExitToLobby}
            currentUser={currentUser}
            onLogout={() => {
              auth.logout();
              setCurrentUser(null);
              setPhase('LOBBY');
            }}
            isConnecting={isConnecting}
            waitingForPlayer={waitingForPlayer}
            roomCode={roomCode}
            errorMessage={errorMessage}
          />
        )}

        {/* 1.0 CONFIGURAÇÃO DO LOBBY (Ponto 3: Página exclusiva com Modo Call, tipos de sala, baralhos) */}
        {phase === 'CREATE_LOBBY' && !isBuildingDeck && (
          <CreateLobbyPage
            playerName={playerName || currentUser?.username || 'Host'}
            currentUser={currentUser}
            onBackToHome={() => setPhase('LOBBY')}
            onOpenLogin={() => setLoginModalOpen(true)}
            onOpenProfile={() => setPhase('PROFILE')}
            onCreateRoom={async (config) => {
              const newCode = await network.generateUniqueRoomCode();
              handleJoinRoom(newCode, playerName || currentUser?.username || 'Host', true, config);
            }}
            onOpenDeckBuilder={(count, isSecret, password, isCallMode) => {
              setEditingDeck(null);
              setDeckTargetCount(count);
              setDeckIsSecret(Boolean(isSecret));
              setDeckPassword(password || '');
              setDeckIsCallMode(Boolean(isCallMode));
              setIsBuildingDeck(true);
            }}
            isConnecting={isConnecting}
          />
        )}

        {/* 1.1 CONSTRUTOR DE BARALHO PERSONALIZADO */}
        {isBuildingDeck && (
          <CustomDeckBuilder
            targetCount={deckTargetCount}
            roomCode={roomCode || 'temp'}
            currentUser={currentUser}
            initialDeck={editingDeck}
            onFinishDeck={async (customCards, customDeckName) => {
              setIsBuildingDeck(false);
              if (editingDeck) {
                await auth.updateSavedDeck(
                  editingDeck.id,
                  editingDeck.user_id || currentUser?.id || 'guest',
                  customDeckName || editingDeck.name || 'Baralho Personalizado',
                  customCards.length,
                  customCards
                );
                setEditingDeck(null);
                setPhase('PROFILE');
                return;
              }
              const newCode = await network.generateUniqueRoomCode();
              handleJoinRoom(newCode, playerName || currentUser?.username || 'Host', true, {
                mode: 'custom',
                cardCount: deckTargetCount,
                deckName: customDeckName,
                customCards,
                isSecret: deckIsSecret,
                password: deckPassword || undefined,
                isCallMode: deckIsCallMode,
              });
            }}
            onCancel={() => {
              setIsBuildingDeck(false);
              if (editingDeck) {
                setEditingDeck(null);
                setPhase('PROFILE');
              }
            }}
          />
        )}

        {/* 1.2 PÁGINA EXCLUSIVA DE PERFIL */}
        {phase === 'PROFILE' && currentUser && !isBuildingDeck && (
          <ProfilePage
            currentUser={currentUser}
            onBackToLobby={() => setPhase('LOBBY')}
            onPlayDeck={(deck) => handlePlaySavedDeck(deck)}
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
          />
        )}

        {/* 1.3 LOBBIES PÚBLICOS (Ponto 4.a) */}
        {phase === 'PUBLIC_LOBBIES' && !isBuildingDeck && (
          <PublicLobbiesPage
            onBackToLobby={() => setPhase('LOBBY')}
            onJoinLobby={(code) => {
              handleJoinRoom(code, playerName || currentUser?.username || 'Convidado', false, {
                mode: 'standard',
                cardCount: 15,
              });
            }}
            onCreateRoomDirectly={() => setPhase('LOBBY')}
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
                timeLeft={turnTimeLeft}
                totalTime={TURN_DURATION_SECONDS}
                isCallMode={roomConfig.isCallMode}
                onAskQuestion={handleAskQuestion}
                onPassTurn={handlePassTurn}
                onOpenGuessModal={() => setGuessModalOpen(true)}
              />

              <div className="bg-slate-100/70 border-2 border-slate-200 rounded-3xl p-3 sm:p-5 shadow-sm">
                <div
                  className={`grid gap-2 sm:gap-2.5 ${
                    activeDeck.length <= 15
                      ? 'grid-cols-3 sm:grid-cols-5'
                      : activeDeck.length <= 30
                      ? 'grid-cols-3 sm:grid-cols-5 md:grid-cols-6'
                      : activeDeck.length <= 60
                      ? 'grid-cols-4 sm:grid-cols-6 md:grid-cols-10'
                      : 'grid-cols-4 sm:grid-cols-6 md:grid-cols-9 lg:grid-cols-10'
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
