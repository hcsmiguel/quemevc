import { useState, useEffect, useRef, type FC } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { sounds } from '../utils/sound';
import { calculateChatBalloonDuration } from '../utils/cardDisplay';

interface ChatMessage {
  sender: string;
  text: string;
  id: string;
}

interface QuickChatProps {
  onSendMessage: (text: string) => void;
  recentMessages: ChatMessage[];
  currentUserName?: string;
}

interface ActiveBalloon {
  id: string;
  sender: string;
  text: string;
  isLeaving: boolean;
  durationMs: number;
  remainingMs: number;
}

const QUICK_TEXT_REACTIONS = ['Boa sorte!', 'Quase!', 'Jogou muito!', 'Por pouco!'];

export const QuickChat: FC<QuickChatProps> = ({
  onSendMessage,
  recentMessages,
  currentUserName = 'Você',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeBalloons, setActiveBalloons] = useState<ActiveBalloon[]>([]);
  const [hoveredBalloonId, setHoveredBalloonId] = useState<string | null>(null);

  const prevMessagesLengthRef = useRef(recentMessages.length);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [lastAnnouncement, setLastAnnouncement] = useState('');

  // Ao receber novas mensagens do jogo
  useEffect(() => {
    if (recentMessages.length > prevMessagesLengthRef.current) {
      const newMessages = recentMessages.slice(prevMessagesLengthRef.current);
      prevMessagesLengthRef.current = recentMessages.length;

      // Se o painel estiver fechado, incrementa não lidas
      if (!isOpen) {
        setUnreadCount((prev) => prev + newMessages.length);
      }

      // Anuncia mensagem para leitores de tela
      const latest = newMessages[newMessages.length - 1];
      if (latest) {
        setLastAnnouncement(`${latest.sender}: ${latest.text}`);
      }

      // Adiciona aos balões efêmeros flutuantes
      newMessages.forEach((msg) => {
        const duration = calculateChatBalloonDuration(msg.text);
        setActiveBalloons((prev) => {
          // Mantém no máximo 2 balões visíveis; o mais antigo sai
          const filtered = prev.filter((b) => !b.isLeaving).slice(-1);
          return [
            ...filtered,
            {
              id: msg.id || String(Date.now() + Math.random()),
              sender: msg.sender,
              text: msg.text,
              isLeaving: false,
              durationMs: duration,
              remainingMs: duration,
            },
          ];
        });
      });
    } else {
      prevMessagesLengthRef.current = recentMessages.length;
    }
  }, [recentMessages, isOpen]);

  // Timer para contagem regressiva e desaparecimento dos balões (pausa se em hover/foco)
  useEffect(() => {
    if (activeBalloons.length === 0) return;

    const interval = setInterval(() => {
      setActiveBalloons((prev) =>
        prev
          .map((balloon) => {
            // Se o usuário está com o mouse/foco no balão, pausa a contagem
            if (hoveredBalloonId === balloon.id) return balloon;

            const nextRemaining = balloon.remainingMs - 100;
            if (nextRemaining <= 0) {
              return { ...balloon, isLeaving: true, remainingMs: 0 };
            }
            return { ...balloon, remainingMs: nextRemaining };
          })
          .filter((b) => !b.isLeaving || b.remainingMs > -200) // 200ms para a animação de saída
      );
    }, 100);

    return () => clearInterval(interval);
  }, [activeBalloons.length, hoveredBalloonId]);

  // Rolar automaticamente para o fim do histórico ao abrir
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, recentMessages.length]);

  const handleSend = (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed) return;

    sounds.playClick();
    onSendMessage(trimmed);
    setInputText('');
  };

  const toggleChat = () => {
    sounds.playClick();
    setIsOpen((prev) => {
      const next = !prev;
      if (next) setUnreadCount(0);
      return next;
    });
  };

  return (
    <aside
      aria-label="Chat da partida"
      className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-40 flex flex-col items-end pointer-events-none"
    >
      {/* Anúncio acessível para leitores de tela */}
      <span className="sr-only" aria-live="polite">
        {lastAnnouncement}
      </span>

      {/* Balões Efêmeros Flutuantes (Desaparecem Sozinhos, máx 2 visíveis) */}
      {!isOpen && activeBalloons.length > 0 && (
        <div className="mb-2 space-y-1.5 max-w-[260px] sm:max-w-xs pointer-events-auto">
          {activeBalloons.map((balloon) => {
            const isMe = balloon.sender === currentUserName || balloon.sender === 'Você';

            return (
              <div
                key={balloon.id}
                role="status"
                tabIndex={0}
                onMouseEnter={() => setHoveredBalloonId(balloon.id)}
                onMouseLeave={() => setHoveredBalloonId(null)}
                onFocus={() => setHoveredBalloonId(balloon.id)}
                onBlur={() => setHoveredBalloonId(null)}
                className={`text-xs px-3 py-2 rounded-2xl border shadow-md transition-all duration-200 motion-reduce:transition-none cursor-default select-text focus:outline-none focus:ring-2 focus:ring-[#C25E3E] ${
                  balloon.isLeaving
                    ? 'opacity-0 translate-y-2 scale-95'
                    : 'opacity-100 translate-y-0 scale-100'
                } ${
                  isMe
                    ? 'bg-[#FFE8E0] border-[#FFB59A] text-[#382C26] ml-auto'
                    : 'bg-white border-[#E8E0D8] text-[#382C26]'
                }`}
              >
                <strong className={`font-bold mr-1 ${isMe ? 'text-[#C25E3E]' : 'text-[#382C26]'}`}>
                  {balloon.sender}:
                </strong>
                <span className="break-words font-medium">{balloon.text}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Painel Histórico do Chat Completo */}
      {isOpen && (
        <div className="bg-white border border-[#E8E0D8] rounded-3xl w-72 sm:w-80 shadow-2xl p-3.5 sm:p-4 mb-2 flex flex-col gap-2.5 animate-in zoom-in-95 pointer-events-auto">
          {/* Header do Histórico */}
          <div className="flex items-center justify-between border-b border-[#E8E0D8] pb-2">
            <span className="text-xs font-bold text-[#382C26] uppercase tracking-wider">
              Histórico do Chat
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs text-[#8C786E] hover:text-[#382C26] p-1 rounded-lg hover:bg-[#FAF6F0] transition-colors cursor-pointer"
              aria-label="Fechar chat"
            >
              <X size={16} />
            </button>
          </div>

          {/* Lista de Mensagens do Histórico */}
          <div className="h-44 sm:h-52 overflow-y-auto space-y-2 pr-1 text-xs select-text">
            {recentMessages.length === 0 ? (
              <span className="text-[#8C786E] italic block text-center py-10 text-[11px]">
                Nenhuma mensagem enviada ainda.
              </span>
            ) : (
              recentMessages.map((m) => {
                const isMe = m.sender === currentUserName || m.sender === 'Você';
                return (
                  <div
                    key={m.id}
                    className={`p-2 rounded-xl border text-xs leading-snug ${
                      isMe
                        ? 'bg-[#FFE8E0]/60 border-[#FFB59A]/60 ml-4'
                        : 'bg-[#FAF6F0] border-[#E8E0D8] mr-4'
                    }`}
                  >
                    <span className="font-bold text-[#C25E3E] mr-1">{m.sender}:</span>
                    <span className="text-[#382C26] font-medium break-words">{m.text}</span>
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Frases Rápidas (Zero Emoji) */}
          <div className="flex flex-wrap gap-1 bg-[#FAF6F0] p-1.5 rounded-xl border border-[#E8E0D8]">
            {QUICK_TEXT_REACTIONS.map((phrase) => (
              <button
                key={phrase}
                type="button"
                onClick={() => handleSend(phrase)}
                className="text-[10px] font-bold text-[#776156] hover:text-[#C25E3E] hover:bg-white bg-white/70 px-2 py-0.5 rounded-lg border border-[#E8E0D8]/60 transition-colors cursor-pointer"
              >
                {phrase}
              </button>
            ))}
          </div>

          {/* Campo de Entrada de Mensagem */}
          <div className="flex gap-1.5">
            <input
              type="text"
              placeholder="Mensagem rápida..."
              value={inputText}
              maxLength={60}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend(inputText)}
              className="flex-1 bg-[#FAF6F0] border border-[#E8E0D8] text-[#382C26] placeholder-[#8C786E] text-xs rounded-xl px-3 py-2 focus:outline-none focus:bg-white focus:border-[#C25E3E]"
            />
            <button
              type="button"
              onClick={() => handleSend(inputText)}
              disabled={!inputText.trim()}
              className="bg-[#C25E3E] hover:bg-[#A94E31] disabled:opacity-40 text-white p-2.5 rounded-xl transition-all cursor-pointer shrink-0"
              aria-label="Enviar mensagem"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Botão de Abrir/Fechar Chat (com indicador de mensagens não lidas) */}
      <button
        type="button"
        onClick={toggleChat}
        className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#C25E3E] hover:bg-[#A94E31] text-white flex items-center justify-center shadow-md transition-all cursor-pointer pointer-events-auto focus-visible:ring-2 focus-visible:ring-[#C25E3E] focus-visible:ring-offset-2 outline-none"
        title="Abrir chat da partida"
        aria-label="Abrir chat da partida"
      >
        <MessageCircle size={21} />

        {/* Indicador de Mensagens Não Lidas */}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#382C26] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white tabular-nums shadow-xs animate-in zoom-in-75">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </aside>
  );
};
