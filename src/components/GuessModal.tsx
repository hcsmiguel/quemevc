import { useState, type FC } from 'react';
import type { Character } from '../types/game';
import { Avatar } from './Avatar';
import { Trophy, X, AlertTriangle } from 'lucide-react';
import { sounds } from '../utils/sound';

interface GuessModalProps {
  cards: Character[];
  opponentName: string;
  onConfirmGuess: (character: Character) => void;
  onClose: () => void;
}

export const GuessModal: FC<GuessModalProps> = ({
  cards,
  opponentName,
  onConfirmGuess,
  onClose,
}) => {
  const [selectedChar, setSelectedChar] = useState<Character | null>(null);

  const handleSelect = (char: Character) => {
    sounds.playClick();
    setSelectedChar(char);
  };

  const handleConfirm = () => {
    if (!selectedChar) return;
    onConfirmGuess(selectedChar);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border-2 border-slate-200 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-tactile-sm">
              <Trophy size={22} className="text-amber-700" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Dar Palpite Final</h2>
              <p className="text-xs text-slate-500">
                Quem é o personagem secreto de <strong className="text-rose-600 font-extrabold">{opponentName}</strong>?
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Confirmação do Personagem Escolhido */}
        {selectedChar ? (
          <div className="my-auto py-6 flex flex-col items-center text-center">
            <div className="relative mb-3">
              <Avatar character={selectedChar} size={110} className="ring-4 ring-amber-400 shadow-xl" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-1">{selectedChar.name}</h3>
            
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 my-5 max-w-md flex items-start gap-3 text-left">
              <AlertTriangle size={22} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-950 leading-relaxed font-medium">
                Atenção: Se você <strong className="text-emerald-700 font-bold">acertar</strong>, você vence o jogo imediatamente!
                Se você <strong className="text-rose-700 font-bold">errar</strong>, seu palpite será revelado e você perderá a vez.
              </div>
            </div>

            <div className="flex items-center gap-4 w-full max-w-sm mt-2">
              <button
                onClick={() => setSelectedChar(null)}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs uppercase tracking-wider border border-slate-200 transition-all cursor-pointer"
              >
                Escolher Outro
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-[0_3px_0_#d97706] transition-all active:translate-y-0.5 cursor-pointer"
              >
                Confirmar Chute!
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-3 rounded-2xl bg-slate-50/60 border border-slate-100">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
              {cards.map((char) => (
                <div
                  key={char.id}
                  onClick={() => handleSelect(char)}
                  className="bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-amber-500 hover:ring-2 hover:ring-amber-200 rounded-2xl p-2 flex flex-col items-center cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0 shadow-sm"
                >
                  <Avatar character={char} size={58} className="mb-1" />
                  <span className="text-xs font-bold text-slate-800 truncate w-full text-center">{char.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
