import { useState, useEffect, useRef } from 'react';
import { CHARACTERS } from './utils/characters';
import type { Character, GamePhase, Question, NetworkMessage } from './types/game';
import { network } from './services/network';
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
import { Volume2, VolumeX, Users } from 'lucide-react';

export function App() {
  // Estados da Sala e Conexão
  const [phase, setPhase] = useState<GamePhase>('LOBBY');
  const [roomCode, setRoomCode] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [opponentName, setOpponentName] = useState<string>('Oponente');
  const [opponentId, setOpponentId] = useState<string>('');
  const [isHost, setIsHost] = useState<boolean>(false);
  const [waitingForPlayer, setWaitingForPlayer] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Estados do Jogo Local (100% Privados)
  const [mySecretCharacter, setMySecretCharacter] = useState<Character | null>(null);
  const [opponentSecretCharacter, setOpponentSecretCharacter] = useState<Character | null>(null);
  const [opponentReady, setOpponentReady] = useState<boolean>(false);
  const [flippedIds, setFlippedIds] = useState<Set<string>>(new Set());

  // Estados do Turno
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState<string>('');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionToAnswer, setQuestionToAnswer] = useState<Question | null>(null);
  const [guessModalOpen, setGuessModalOpen] = useState<boolean>(false);
  const [wrongGuessAlert, setWrongGuessAlert] = useState<string | null>(null);

  // Fim de Jogo
  const [gameOverResult, setGameOverResult] = useState<{
    isWinner: boolean;
    winnerName: string;
  } | null>(null);

  // Mensagens do Chat
  const [chatMessages, setChatMessages] = useState<{ sender: string; text: string; id: string }[]>([]);

  // Referência para o personagem secreto local
  const mySecretRef = useRef<Character | null>(null);
  mySecretRef.current = mySecretCharacter;

  const toggleSound = () => {
    sounds.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
  };

  const handleJoinRoom = async (code: string, name: string, host: boolean) => {
    setIsConnecting(true);
    setPlayerName(name);
    setRoomCode(code);
    setIsHost(host);

    try {
      await network.connect(code, name);
      setIsConnecting(false);

      if (host) {
        setWaitingForPlayer(true);
      } else {
        network.send('JOIN', { playerId: network.playerId, playerName: name });
      }
    } catch (err) {
      setIsConnecting(false);
      alert('Falha ao conectar à sala. Tente novamente em instantes.');
    }
  };

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
          setPhase('CHOOSING_SECRET');

          if (isHost) {
            network.send('SYNC_LOBBY', { hostName: playerName, hostId: network.playerId });
          }
          break;
        }

        case 'SYNC_LOBBY': {
          setOpponentName(msg.payload.hostName);
          setOpponentId(msg.payload.hostId);
          setWaitingForPlayer(false);
          setPhase('CHOOSING_SECRET');
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
          break;
        }

        case 'ANSWER_QUESTION': {
          sounds.playAnswer(msg.payload.answer);
          setCurrentQuestion((prev) =>
            prev ? { ...prev, answer: msg.payload.answer } : null
          );
          break;
        }

        case 'PASS_TURN': {
          setCurrentTurnPlayerId(network.playerId);
          setCurrentQuestion(null);
          break;
        }

        case 'MAKE_GUESS': {
          const guessedId = msg.payload.characterId;
          const mySecret = mySecretRef.current;
          if (mySecret) {
            if (mySecret.id === guessedId) {
              network.send('GUESS_RESULT', {
                correct: true,
                winnerId: msg.senderId,
                winnerName: msg.senderName,
                secretCharacter: mySecret,
              });
            } else {
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

  const startGame = () => {
    const startingPlayerId = network.playerId;
    network.send('START_GAME', { startingPlayerId });
    setCurrentTurnPlayerId(startingPlayerId);
    setPhase('PLAYING');
  };

  const handleConfirmSecret = (char: Character) => {
    setMySecretCharacter(char);
    network.send('CHOSE_SECRET', { ready: true });

    if (opponentReady) {
      startGame();
    }
  };

  const handleToggleCard = (charId: string) => {
    setFlippedIds((prev) => {
      const next = new Set(prev);
      if (next.has(charId)) {
        next.delete(charId);
      } else {
        next.add(charId);
      }
      return next;
    });
  };

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
    network.send('ASK_QUESTION', { text, traitKey, traitValue });
  };

  const handleAnswerQuestion = (ans: boolean) => {
    if (!questionToAnswer) return;
    network.send('ANSWER_QUESTION', { answer: ans });
    setCurrentQuestion((prev) => (prev ? { ...prev, answer: ans } : null));
    setQuestionToAnswer(null);
  };

  const handlePassTurn = () => {
    sounds.playClick();
    network.send('PASS_TURN', {});
    setCurrentTurnPlayerId(opponentId);
    setCurrentQuestion(null);
  };

  const handleConfirmGuess = (guessedChar: Character) => {
    setGuessModalOpen(false);
    network.send('MAKE_GUESS', {
      characterId: guessedChar.id,
      characterName: guessedChar.name,
    });
  };

  const resetForRematch = () => {
    setFlippedIds(new Set());
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

  const handleSendChat = (text: string) => {
    network.send('CHAT', { text });
    setChatMessages((prev) => [
      ...prev.slice(-15),
      { sender: playerName, text, id: 'm_' + Date.now() },
    ]);
  };

  const isMyTurn = currentTurnPlayerId === network.playerId;
  const remainingCardsCount = CHARACTERS.length - flippedIds.size;

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
                Sala: {roomCode}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
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

        {phase === 'LOBBY' && (
          <Lobby
            onJoinRoom={handleJoinRoom}
            isConnecting={isConnecting}
            waitingForPlayer={waitingForPlayer}
            roomCode={roomCode}
          />
        )}

        {phase === 'CHOOSING_SECRET' && (
          <SecretSelectionModal
            opponentName={opponentName}
            opponentReady={opponentReady}
            onConfirmSelection={handleConfirmSecret}
          />
        )}

        {phase === 'PLAYING' && (
          <div className="flex-1 flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <div className="md:col-span-4">
                {mySecretCharacter && (
                  <SecretCardBadge character={mySecretCharacter} />
                )}
              </div>

              <div className="md:col-span-8 flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded-2xl p-3 text-xs font-bold text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span>Seu Tabuleiro:</span>
                  <span className="text-amber-400 font-extrabold text-sm">
                    {remainingCardsCount} suspeitos ativos
                  </span>
                  <span className="text-slate-500">
                    ({flippedIds.size} eliminados)
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 hidden sm:block">
                  💡 Clique nas cartas para eliminá-las (só você vê o que abaixou)
                </div>
              </div>
            </div>

            <QuestionControl
              isMyTurn={isMyTurn}
              opponentName={opponentName}
              currentQuestion={currentQuestion}
              onAskQuestion={handleAskQuestion}
              onPassTurn={handlePassTurn}
              onOpenGuessModal={() => setGuessModalOpen(true)}
            />

            <div className="flex-1 bg-slate-900/40 border border-slate-800/80 rounded-3xl p-3 sm:p-5 shadow-2xl backdrop-blur-sm">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-3.5">
                {CHARACTERS.map((char) => (
                  <Card
                    key={char.id}
                    character={char}
                    isFlipped={flippedIds.has(char.id)}
                    onToggle={handleToggleCard}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {questionToAnswer && mySecretCharacter && (
          <QuestionAnswerModal
            question={questionToAnswer}
            mySecretCharacter={mySecretCharacter}
            onAnswer={handleAnswerQuestion}
          />
        )}

        {guessModalOpen && (
          <GuessModal
            opponentName={opponentName}
            onConfirmGuess={handleConfirmGuess}
            onClose={() => setGuessModalOpen(false)}
          />
        )}

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
          />
        )}
      </main>

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
