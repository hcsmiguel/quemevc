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
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-amber-500/70 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Trophy size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Dar Palpite Final</h2>
              <p className="text-xs text-slate-400">
                Quem é o personagem secreto de <span className="text-amber-400 font-bold">{opponentName}</span>?
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Confirmação do Personagem Escolhido */}
        {selectedChar ? (
          <div className="my-auto py-6 flex flex-col items-center text-center">
            <div className="relative mb-3">
              <Avatar character={selectedChar} size={110} className="ring-4 ring-amber-400 shadow-2xl" />
            </div>
            <h3 className="text-2xl font-black text-white mb-1">{selectedChar.name}</h3>
            
            <div className="bg-amber-950/60 border border-amber-800/80 rounded-2xl p-4 my-5 max-w-md flex items-start gap-3 text-left">
              <AlertTriangle size={22} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200/90 leading-relaxed">
                Atenção: Se você <strong className="text-white">acertar</strong>, você vence o jogo imediatamente!
                Se você <strong className="text-white">errar</strong>, seu palpite será anunciado e você perderá a vez.
              </div>
            </div>

            <div className="flex items-center gap-4 w-full max-w-sm mt-2">
              <button
                onClick={() => setSelectedChar(null)}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-all"
              >
                Escolher Outro
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/30 transition-all active:scale-95"
              >
                Confirmar Chute!
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
              {cards.map((char) => (
                <div
                  key={char.id}
                  onClick={() => handleSelect(char)}
                  className="bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:border-amber-400 rounded-xl p-2 flex flex-col items-center cursor-pointer transition-all hover:scale-105 active:scale-95"
                >
                  <Avatar character={char} size={58} className="mb-1" />
                  <span className="text-xs font-bold text-slate-200 truncate w-full text-center">{char.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
