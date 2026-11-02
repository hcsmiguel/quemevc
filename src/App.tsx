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
import { CustomDeckBuilder } from './components/CustomDeckBuilder';
import { RightSidebar } from './components/RightSidebar';
import { Volume2, VolumeX, Users, User as UserIcon, LogOut, AlertTriangle } from 'lucide-react';

export function App() {
  // Autenticação
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => auth.getCurrentUser());
  const [loginModalOpen, setLoginModalOpen] = useState(false);

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
  const [, setRoomConfig] = useState<RoomConfig>({
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

  // Referência para o personagem secreto local
  const mySecretRef = useRef<Character | null>(null);
  mySecretRef.current = mySecretCharacter;

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

        case 'CHOSE_SECRET': {
          setOpponentReady(true);
          if (mySecretRef.current) {
            startGame();
          }
          break;
        }

        case 'START_GAME': {
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

  const startGame = async () => {
    const startingPlayerId = network.playerId;
    network.send('START_GAME', { startingPlayerId });
    setCurrentTurnPlayerId(startingPlayerId);
    setPhase('PLAYING');
    await network.syncRoomState({ status: 'playing', current_turn: startingPlayerId });
  };

  const handleConfirmSecret = (char: Character) => {
    setMySecretCharacter(char);
    network.send('CHOSE_SECRET', { ready: true });

    if (opponentReady) {
      startGame();
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
    setUndoStack([]);
    setTargetCharacter(null);
    setMySecretCharacter(null);
    setOpponentSecretCharacter(null);
    setOpponentReady(false);
    setCurrentQuestion(null);
    setQuestionToAnswer(null);
    setGameOverResult(null);
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
    setCurrentQuestion(null);
    setQuestionToAnswer(null);
    setMySecretCharacter(null);
    setGameOverResult(null);
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
    <div className="min-h-screen bg-[#080d1a] text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Barra Superior */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-black bg-gradient-to-r from-amber-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
              🎭 Cara a Cara
            </span>
            {roomCode && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-mono text-amber-300 font-bold">
                Sala: {roomCode} ({activeDeck.length} Caras)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {currentUser && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-300 bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-700">
                <UserIcon size={13} className="text-amber-400" />
                <span>{currentUser.username}</span>
              </div>
            )}

            {phase === 'PLAYING' && (
              <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1 rounded-xl border border-slate-700 text-xs font-bold">
                <Users size={14} className="text-indigo-400" />
                <span className="text-slate-300">{playerName}</span>
                <span className="text-slate-500">vs</span>
                <span className="text-pink-400">{opponentName}</span>
              </div>
            )}

            <button
              onClick={toggleSound}
              title={soundEnabled ? 'Silenciar Sons' : 'Ativar Sons'}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              {soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
            </button>

            {/* PONTO 1: Botão no Canto Superior Direito para Voltar ao Menu Principal */}
            {phase !== 'LOBBY' && (
              <button
                onClick={() => setShowAbandonModal(true)}
                title="Voltar ao Menu Principal"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-800/80 text-red-200 text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-md shadow-red-950/50"
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
          <div className="mb-4 bg-red-950/90 border-2 border-red-500/80 rounded-2xl p-3.5 text-center text-sm font-black text-red-200 shadow-xl animate-bounce">
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
            onFinishDeck={(customCards) => {
              setIsBuildingDeck(false);
              const randomSuffix = Math.floor(1000 + Math.random() * 9000);
              const newCode = `CARA-${randomSuffix}`;
              handleJoinRoom(newCode, playerName || currentUser?.username || 'Host', true, {
                mode: 'custom',
                cardCount: deckTargetCount,
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

                <div className="md:col-span-7 flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded-2xl p-3 text-xs font-bold text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    <span>Dica:</span>
                    <span className="text-slate-400 font-normal">
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

              <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-3 sm:p-5 shadow-2xl backdrop-blur-sm">
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
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border-2 border-red-500/80 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center animate-in zoom-in-95">
              <div className="w-14 h-14 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-3 border border-red-500/30">
                <AlertTriangle size={30} />
              </div>

              <h3 className="text-lg font-black text-white mb-2">
                Abandonar Partida?
              </h3>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Você deseja realmente abandonar a partida atual e voltar ao menu principal?
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowAbandonModal(false)}
                  className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Não
                </button>
                <button
                  onClick={handleConfirmAbandon}
                  className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-red-600/30 transition-all active:scale-95"
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
      </main>

      {/* Chat Rápido */}
      {phase === 'PLAYING' && (
        <QuickChat
          onSendMessage={handleSendChat}
          recentMessages={chatMessages}
        />
      )}
    </div>
  );
}

export default App;
