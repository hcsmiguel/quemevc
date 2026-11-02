import { useState, type FC } from 'react';
import type { Character } from '../types/game';
import { CHARACTERS } from '../utils/characters';
import { Avatar } from './Avatar';
import { Sparkles, Dices, ShieldCheck, Check } from 'lucide-react';
import { sounds } from '../utils/sound';

interface SecretSelectionModalProps {
  opponentName: string;
  opponentReady: boolean;
  onConfirmSelection: (character: Character) => void;
}

export const SecretSelectionModal: FC<SecretSelectionModalProps> = ({
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
    if (isReady) return;
    sounds.playClick();
    const randomChar = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
    setSelectedChar(randomChar);
  };

  const handleConfirm = () => {
    if (!selectedChar || isReady) return;
    sounds.playAnswer(true);
    setIsReady(true);
    onConfirmSelection(selectedChar);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-indigo-500/70 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 mb-4 gap-2">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Sparkles className="text-amber-400" size={22} />
              Escolha seu Personagem Secreto
            </h2>
            <p className="text-xs text-slate-400">
              Este é o personagem que <span className="text-indigo-400 font-bold">{opponentName}</span> terá que adivinhar!
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Status de {opponentName}:</span>
            {opponentReady ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1 font-bold">
                <Check size={13} /> Escolheu!
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 animate-pulse">
                Escolhendo...
              </span>
            )}
          </div>
        </div>

        {/* Grade de Personagens */}
        <div className="flex-1 overflow-y-auto pr-1 mb-4">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
            {CHARACTERS.map((char) => {
              const isSelected = selectedChar?.id === char.id;
              return (
                <div
                  key={char.id}
                  onClick={() => handleSelect(char)}
                  className={`relative p-2 rounded-2xl flex flex-col items-center cursor-pointer transition-all border-2 ${
                    isSelected
                      ? 'bg-indigo-900/60 border-amber-400 scale-105 shadow-lg shadow-amber-500/20'
                      : 'bg-slate-800/80 hover:bg-slate-750 border-slate-700/80 hover:border-indigo-400/60'
                  } ${isReady ? 'pointer-events-none opacity-60' : ''}`}
                >
                  <Avatar character={char} size={64} className="mb-1" />
                  <span className="text-xs font-bold text-slate-200">{char.name}</span>
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-xs">
                      ✓
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Barra de Ação Inferior */}
        <div className="border-t border-slate-800 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={handleRandom}
            disabled={isReady}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 font-bold text-xs uppercase tracking-wider transition-all"
          >
            <Dices size={16} />
            Sortear Aleatório
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {selectedChar && (
              <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
                <Avatar character={selectedChar} size={34} />
                <span className="text-xs font-black text-white">{selectedChar.name}</span>
              </div>
            )}

            <button
              onClick={handleConfirm}
              disabled={!selectedChar || isReady}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-black text-sm uppercase tracking-wide transition-all shadow-lg ${
                isReady
                  ? 'bg-emerald-600 text-white cursor-default'
                  : 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white shadow-indigo-500/30 active:scale-95 disabled:bg-slate-800 disabled:text-slate-600'
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
