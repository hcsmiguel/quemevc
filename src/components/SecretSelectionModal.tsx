import { useState, type FC } from 'react';
import type { Character } from '../types/game';
import { Avatar } from './Avatar';
import { Dices, ShieldCheck, Check } from 'lucide-react';
import { sounds } from '../utils/sound';

interface SecretSelectionModalProps {
  cards: Character[];
  opponentName: string;
  opponentReady: boolean;
  onConfirmSelection: (character: Character) => void;
}

export const SecretSelectionModal: FC<SecretSelectionModalProps> = ({
  cards,
  opponentName,
  opponentReady,
  onConfirmSelection,
}) => {
  const [selectedChar, setSelectedChar] = useState<Character | null>(null);
  const [isReady, setIsReady] = useState(false);

  const handleSelect = (char: Character) => {
    if (isReady) return;
    sounds.playClick();
    setSelectedChar(char);
  };

  const handleRandom = () => {
    if (isReady || cards.length === 0) return;
    sounds.playClick();
    const randomChar = cards[Math.floor(Math.random() * cards.length)];
    setSelectedChar(randomChar);
  };

  const handleConfirm = () => {
    if (!selectedChar || isReady) return;
    sounds.playAnswer(true);
    setIsReady(true);
    onConfirmSelection(selectedChar);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border-2 border-slate-200 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 mb-4 gap-2">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-sm shadow-tactile-sm">
                🎴
              </span>
              Escolha seu Personagem Secreto
            </h2>
            <p className="text-xs text-slate-500">
              Este é o personagem que <strong className="text-sky-700">{opponentName}</strong> terá que adivinhar!
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Status de {opponentName}:</span>
            {opponentReady ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 font-bold">
                <Check size={13} /> Escolheu!
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200 animate-pulse font-medium">
                Escolhendo...
              </span>
            )}
          </div>
        </div>

        {/* Grade de Personagens */}
        <div className={`flex-1 p-3.5 mb-4 rounded-2xl bg-slate-50/60 border border-slate-100 ${cards.length <= 16 ? 'overflow-visible' : 'overflow-y-auto overflow-x-hidden'}`}>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
            {cards.map((char) => {
              const isSelected = selectedChar?.id === char.id;
              return (
                <div
                  key={char.id}
                  onClick={() => handleSelect(char)}
                  className={`relative p-2 rounded-2xl flex flex-col items-center cursor-pointer transition-all border-2 ${
                    isSelected
                      ? 'bg-sky-50 border-sky-500 ring-4 ring-sky-300 shadow-md -translate-y-0.5'
                      : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 shadow-sm'
                  } ${isReady ? 'pointer-events-none opacity-60' : ''}`}
                >
                  <Avatar character={char} size={64} className="mb-1" />
                  <span className="text-xs font-bold text-slate-800 truncate w-full text-center">{char.name}</span>
                  {isSelected && (
                    <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-md ring-2 ring-white">
                      ✓
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Barra de Ação Inferior */}
        <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={handleRandom}
            disabled={isReady}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-extrabold text-xs uppercase tracking-wider border border-slate-200 transition-all cursor-pointer"
          >
            <Dices size={16} className="text-amber-600" />
            Sortear Aleatório
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {selectedChar && (
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <Avatar character={selectedChar} size={34} />
                <span className="text-xs font-black text-slate-800">{selectedChar.name}</span>
              </div>
            )}

            <button
              onClick={handleConfirm}
              disabled={!selectedChar || isReady}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-extrabold text-sm uppercase tracking-wider transition-all shadow-[0_3px_0_#059669] active:translate-y-0.5 cursor-pointer ${
                isReady
                  ? 'bg-emerald-600 text-white cursor-default'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none'
              }`}
            >
              {isReady ? (
                <>
                  <ShieldCheck size={18} />
                  Aguardando {opponentName}...
                </>
              ) : (
                <>
                  <Check size={18} />
                  Confirmar Escolha
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
