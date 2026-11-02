import { useState, type FC } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { sounds } from '../utils/sound';

interface QuickChatProps {
  onSendMessage: (text: string) => void;
  recentMessages: { sender: string; text: string; id: string }[];
}

const QUICK_REACTIONS = ['😂', '❤️', '👀', '🔥', '🤔', '😱'];

export const QuickChat: FC<QuickChatProps> = ({ onSendMessage, recentMessages }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');

  const handleSend = (msgText: string) => {
    if (!msgText.trim()) return;
    sounds.playClick();
    onSendMessage(msgText.trim());
    setText('');
  };

  return (
    <div className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-40 flex flex-col items-end">
      {!isOpen && recentMessages.length > 0 && (
        <div className="mb-2 space-y-1.5 max-w-xs">
          {recentMessages.slice(-2).map((m) => (
            <div
              key={m.id}
              className="bg-white border-2 border-slate-200 text-slate-800 text-xs px-3 py-1.5 rounded-2xl shadow-md animate-in slide-in-from-bottom-2"
            >
              <strong className="text-sky-700 font-extrabold">{m.sender}: </strong>
              {m.text}
            </div>
          ))}
        </div>
      )}

      {isOpen && (
        <div className="bg-white border-2 border-slate-200 rounded-3xl w-80 shadow-2xl p-4 mb-2 flex flex-col gap-3 animate-in zoom-in-95">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Chat Rápido
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="h-36 overflow-y-auto space-y-2 pr-1 text-xs">
            {recentMessages.length === 0 ? (
              <span className="text-slate-400 italic block text-center py-8 text-[11px]">
                Envie um emoji ou provocação amigável!
              </span>
            ) : (
              recentMessages.map((m) => (
                <div key={m.id} className="bg-slate-50 p-2 rounded-xl border border-slate-200 text-slate-800">
                  <span className="font-bold text-sky-700 mr-1">{m.sender}:</span>
                  <span className="text-slate-700 font-medium">{m.text}</span>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSend(emoji)}
                className="hover:scale-125 transition-transform text-lg px-1 cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>

          <div className="flex gap-1.5">
            <input
              type="text"
              placeholder="Digite uma mensagem..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend(text)}
              className="flex-1 bg-slate-50 border-2 border-slate-200 text-xs font-semibold text-slate-900 placeholder-slate-400 rounded-xl px-3 py-2 focus:outline-none focus:bg-white focus:border-sky-400 transition-all"
            />
            <button
              onClick={() => handleSend(text)}
              disabled={!text.trim()}
              className="bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white p-2.5 rounded-xl shadow-tactile-sm active:translate-y-0.5 transition-all cursor-pointer"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => {
          sounds.playClick();
          setIsOpen(!isOpen);
        }}
        className="bg-slate-900/90 hover:bg-slate-800 text-white p-2.5 sm:p-3.5 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center relative cursor-pointer backdrop-blur-sm border border-slate-700/50"
      >
        <MessageCircle size={20} className="sm:w-[22px] sm:h-[22px]" />
        {recentMessages.length > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 animate-pulse border-2 border-white" />
        )}
      </button>
    </div>
  );
};
