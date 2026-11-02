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
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end">
      {!isOpen && recentMessages.length > 0 && (
        <div className="mb-2 space-y-1.5 max-w-xs">
          {recentMessages.slice(-2).map((m) => (
            <div
              key={m.id}
              className="bg-slate-900/90 border border-slate-700 text-white text-xs px-3 py-1.5 rounded-2xl shadow-lg backdrop-blur-md animate-in slide-in-from-bottom-2"
            >
              <strong className="text-amber-400 font-bold">{m.sender}: </strong>
              {m.text}
            </div>
          ))}
        </div>
      )}

      {isOpen && (
        <div className="bg-slate-900 border-2 border-indigo-500/70 rounded-3xl w-80 shadow-2xl p-4 mb-2 flex flex-col gap-3 backdrop-blur-xl animate-in zoom-in-95">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-black text-indigo-300 uppercase tracking-wider">
              Chat Rápido
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="h-36 overflow-y-auto space-y-2 pr-1 text-xs">
            {recentMessages.length === 0 ? (
              <span className="text-slate-500 italic block text-center py-8">
                Envie um emoji ou provocação!
              </span>
            ) : (
              recentMessages.map((m) => (
                <div key={m.id} className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/60">
                  <span className="font-bold text-amber-400 mr-1">{m.sender}:</span>
                  <span className="text-slate-200">{m.text}</span>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSend(emoji)}
                className="hover:scale-125 transition-transform text-lg px-1"
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
              className="flex-1 bg-slate-950 border border-slate-700 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-400"
            />
            <button
              onClick={() => handleSend(text)}
              disabled={!text.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white p-2 rounded-xl"
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
        className="bg-indigo-600 hover:bg-indigo-500 text-white p-3.5 rounded-full shadow-lg shadow-indigo-600/40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center relative"
      >
        <MessageCircle size={22} />
        {recentMessages.length > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 animate-pulse border-2 border-slate-900" />
        )}
      </button>
    </div>
  );
};
