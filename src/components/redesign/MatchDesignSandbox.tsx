import { useState, useCallback, type FC } from 'react';
import type { Character, CardStatus, Question, UndoAction } from '../../types/game';
import {
  MatchDesignToolbar,
  type RedesignProposal,
  type RedesignTurnState,
} from './MatchDesignToolbar';
import type { AtalhoDeTamanho } from '../../constants/deck';
import { MatchDesignA } from './MatchDesignA';
import { MatchDesignB } from './MatchDesignB';
import { MatchDesignC } from './MatchDesignC';
import { MatchDesignOriginal } from './MatchDesignOriginal';
import { getMockDeck, INITIAL_MOCK_QUESTIONS, MOCK_90_CHARACTERS } from './mockData';
import { GuessModal } from '../GuessModal';
import { sounds } from '../../utils/sound';
import { ArrowLeft } from 'lucide-react';

interface MatchDesignSandboxProps {
  initialProposal?: RedesignProposal;
  onExitSandbox?: () => void;
}

export const MatchDesignSandbox: FC<MatchDesignSandboxProps> = ({
  initialProposal = 'a',
  onExitSandbox,
}) => {
  // Proposta Ativa
  const [proposal, setProposal] = useState<RedesignProposal>(() => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('/partida-design/b')) return 'b';
    if (path.includes('/partida-design/c')) return 'c';
    if (path.includes('/partida-design/original')) return 'original';
    if (path.includes('/partida-design/a')) return 'a';
    return initialProposal;
  });

  // Quantidade de Cartas (15, 30, 60, 90)
  const [cardCount, setCardCount] = useState<AtalhoDeTamanho>(30);

  // Estados de Turno Simulados
  const [turnState, setTurnState] = useState<RedesignTurnState>('my_turn');

  // Deck de Cartas Ativo
  const [deck, setDeck] = useState<Character[]>(() => getMockDeck(30));
  const [cardStatuses, setCardStatuses] = useState<Record<string, CardStatus>>({});
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);

  // Perguntas e Histórico
  const [questionHistory, setQuestionHistory] = useState<Question[]>(INITIAL_MOCK_QUESTIONS);
  const [turnTimeLeft, setTurnTimeLeft] = useState<number>(39);

  // Modal de Palpite
  const [guessModalOpen, setGuessModalOpen] = useState(false);

  // Personagem Secreto (Adriana Lima, como no print)
  const secretCharacter: Character = MOCK_90_CHARACTERS.find((c) => c.name.includes('Adriana')) || deck[0];

  // Sincronizar deck quando o cardCount mudar
  const handleSelectCardCount = (count: 15 | 30 | 60 | 90) => {
    setCardCount(count);
    const newDeck = getMockDeck(count);
    setDeck(newDeck);
    setCardStatuses({});
    setUndoStack([]);
  };

  // Alternar Proposta e atualizar a URL no navegador
  const handleSelectProposal = (newProposal: RedesignProposal) => {
    setProposal(newProposal);
    window.history.pushState(null, '', `/partida-design/${newProposal}`);
  };

  // Clique na Carta (Alterna entre normal e descartada com som)
  const handleCardClick = useCallback((character: Character) => {
    sounds.playFlip();
    const currentStatus = cardStatuses[character.id] || 'normal';
    const nextStatus: CardStatus = currentStatus === 'discard' ? 'normal' : 'discard';

    const previousStates = { ...cardStatuses };
    const newStates = { ...cardStatuses, [character.id]: nextStatus };

    setUndoStack((prev) => [
      ...prev,
      {
        type: 'status_change',
        previousStates,
        newStates,
        description: `Carta ${character.name}`,
      },
    ]);
    setCardStatuses(newStates);
  }, [cardStatuses]);

  // Desfazer Ação
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    sounds.playClick();
    const lastAction = undoStack[undoStack.length - 1];
    setCardStatuses(lastAction.previousStates);
    setUndoStack((prev) => prev.slice(0, -1));
  }, [undoStack]);

  // Formular Pergunta
  const handleAskQuestion = (text: string) => {
    const newQuestion: Question = {
      id: `q_${Date.now()}`,
      senderId: 'user_1',
      senderName: 'carvalho',
      text,
      answer: true,
      timestamp: Date.now(),
    };
    setQuestionHistory((prev) => [newQuestion, ...prev]);
    setTurnState('answered_yes');
  };

  // Passar a Vez
  const handlePassTurn = () => {
    sounds.playClick();
    setTurnState('opponent_turn');
  };

  // Resetar Partida
  const handleReset = () => {
    setCardStatuses({});
    setUndoStack([]);
    setQuestionHistory(INITIAL_MOCK_QUESTIONS);
    setTurnTimeLeft(60);
    setTurnState('my_turn');
  };

  // Mapear propriedades do estado de turno simulado
  const isMyTurn = turnState === 'my_turn' || turnState === 'waiting_reply' || turnState.startsWith('answered');
  const currentQuestion: Question | null =
    turnState === 'waiting_reply'
      ? {
          id: 'q_curr',
          senderId: 'user_1',
          senderName: 'carvalho',
          text: 'O seu personagem usa chapéu ou boné?',
          answer: null,
          timestamp: Date.now(),
        }
      : turnState === 'answered_yes'
      ? {
          id: 'q_curr',
          senderId: 'user_1',
          senderName: 'carvalho',
          text: 'O seu personagem usa chapéu ou boné?',
          answer: true,
          timestamp: Date.now(),
        }
      : turnState === 'answered_no'
      ? {
          id: 'q_curr',
          senderId: 'user_1',
          senderName: 'carvalho',
          text: 'O seu personagem usa chapéu ou boné?',
          answer: false,
          timestamp: Date.now(),
        }
      : null;

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#382C26] flex flex-col pt-16">
      {/* Barra de Controle de SandBox Flutuante no Topo */}
      <MatchDesignToolbar
        currentProposal={proposal}
        cardCount={cardCount}
        turnState={turnState}
        onSelectProposal={handleSelectProposal}
        onSelectCardCount={handleSelectCardCount}
        onSelectTurnState={setTurnState}
        onReset={handleReset}
      />

      {/* Botão de Saída para o Menu Principal */}
      <div className="w-full max-w-[1720px] mx-auto px-4 py-1 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            if (onExitSandbox) {
              onExitSandbox();
            } else {
              window.location.href = '/';
            }
          }}
          className="flex items-center gap-1.5 text-xs font-bold text-[#8C786E] hover:text-[#382C26] transition-colors cursor-pointer py-1 px-2.5 rounded-lg hover:bg-black/5"
        >
          <ArrowLeft size={14} />
          <span>Voltar ao Menu Principal</span>
        </button>

        <div className="text-[11px] font-semibold text-[#8C786E]">
          Testando <strong className="text-[#C25E3E] uppercase font-bold">Proposta {proposal.toUpperCase()}</strong> em <code className="bg-black/5 px-1.5 py-0.5 rounded text-[10px]">localhost:5173</code>
        </div>
      </div>

      {/* Renderização da Proposta Selecionada */}
      <main className="flex-1 w-full pb-8">
        {proposal === 'a' && (
          <MatchDesignA
            deck={deck}
            cardStatuses={cardStatuses}
            secretCharacter={secretCharacter}
            questionHistory={questionHistory}
            currentQuestion={currentQuestion}
            isMyTurn={isMyTurn}
            timeLeft={turnTimeLeft}
            totalTime={60}
            opponentName="Teste"
            playerName="carvalho"
            roomCode="425858"
            undoDisabled={undoStack.length === 0}
            onCardClick={handleCardClick}
            onUndo={handleUndo}
            onAskQuestion={handleAskQuestion}
            onPassTurn={handlePassTurn}
            onOpenGuessModal={() => setGuessModalOpen(true)}
          />
        )}

        {proposal === 'b' && (
          <MatchDesignB
            deck={deck}
            cardStatuses={cardStatuses}
            secretCharacter={secretCharacter}
            questionHistory={questionHistory}
            currentQuestion={currentQuestion}
            isMyTurn={isMyTurn}
            timeLeft={turnTimeLeft}
            totalTime={60}
            opponentName="Teste"
            playerName="carvalho"
            roomCode="425858"
            undoDisabled={undoStack.length === 0}
            onCardClick={handleCardClick}
            onUndo={handleUndo}
            onAskQuestion={handleAskQuestion}
            onPassTurn={handlePassTurn}
            onOpenGuessModal={() => setGuessModalOpen(true)}
          />
        )}

        {proposal === 'c' && (
          <MatchDesignC
            deck={deck}
            cardStatuses={cardStatuses}
            secretCharacter={secretCharacter}
            questionHistory={questionHistory}
            currentQuestion={currentQuestion}
            isMyTurn={isMyTurn}
            timeLeft={turnTimeLeft}
            totalTime={60}
            opponentName="Teste"
            playerName="carvalho"
            roomCode="425858"
            undoDisabled={undoStack.length === 0}
            onCardClick={handleCardClick}
            onUndo={handleUndo}
            onAskQuestion={handleAskQuestion}
            onPassTurn={handlePassTurn}
            onOpenGuessModal={() => setGuessModalOpen(true)}
          />
        )}

        {proposal === 'original' && (
          <MatchDesignOriginal
            deck={deck}
            cardStatuses={cardStatuses}
            secretCharacter={secretCharacter}
            questionHistory={questionHistory}
            currentQuestion={currentQuestion}
            isMyTurn={isMyTurn}
            timeLeft={turnTimeLeft}
            totalTime={60}
            opponentName="Teste"
            undoDisabled={undoStack.length === 0}
            onCardClick={handleCardClick}
            onUndo={handleUndo}
            onAskQuestion={handleAskQuestion}
            onPassTurn={handlePassTurn}
            onOpenGuessModal={() => setGuessModalOpen(true)}
          />
        )}
      </main>

      {/* Modal de Palpite Interativo */}
      {guessModalOpen && (
        <GuessModal
          cards={deck}
          cardStatuses={cardStatuses}
          opponentName="Teste"
          onConfirmGuess={(character) => {
            setGuessModalOpen(false);
            sounds.playWin();
            alert(`Você palpitou que o personagem de Teste é: ${character.name}!`);
          }}
          onClose={() => setGuessModalOpen(false)}
        />
      )}
    </div>
  );
};
