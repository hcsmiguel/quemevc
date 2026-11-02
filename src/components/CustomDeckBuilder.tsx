import { useState, type FC } from 'react';
import type { Character, DifficultyCount } from '../types/game';
import { STANDARD_60_CHARACTERS } from '../utils/characters';
import { Avatar } from './Avatar';
import { ImageCropperModal } from './ImageCropperModal';
import { Plus, Trash2, Sparkles, Check, Wand2, ArrowLeft } from 'lucide-react';
import { sounds } from '../utils/sound';

interface CustomDeckBuilderProps {
  targetCount: DifficultyCount;
  onFinishDeck: (cards: Character[]) => void;
  onCancel: () => void;
}

export const CustomDeckBuilder: FC<CustomDeckBuilderProps> = ({
  targetCount,
  onFinishDeck,
  onCancel,
}) => {
  const [cards, setCards] = useState<Character[]>([]);
  const [isCropperOpen, setIsCropperOpen] = useState(false);

  const handleAddCard = (newChar: Character) => {
    setCards((prev) => [...prev, newChar]);
  };

  const handleRemoveCard = (id: string) => {
    sounds.playClick();
    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAutoFillRemaining = () => {
    sounds.playClick();
    const remainingNeeded = targetCount - cards.length;
    if (remainingNeeded <= 0) return;

    const existingNames = new Set(cards.map((c) => c.name));
    const available = STANDARD_60_CHARACTERS.filter((c) => !existingNames.has(c.name));
    const added = available.slice(0, remainingNeeded);

    setCards((prev) => [...prev, ...added]);
  };

  const handleConfirm = () => {
    if (cards.length < targetCount) return;
    sounds.playWin();
    onFinishDeck(cards.slice(0, targetCount));
  };

  const isComplete = cards.length >= targetCount;

  return (
    <div className="min-h-[85vh] max-w-5xl mx-auto w-full p-4 flex flex-col gap-4 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Sparkles className="text-amber-400" size={20} />
              Criar Baralho de Caras Personalizadas
            </h2>
            <p className="text-xs text-slate-400">
              Adicione fotos de amigos, familiares ou celebridades para jogar!
            </p>
          </div>
        </div>

        {/* Contador de Progresso */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-slate-400 block font-bold">Progresso:</span>
            <span className={`text-lg font-black ${isComplete ? 'text-emerald-400' : 'text-amber-400'}`}>
              {cards.length} / {targetCount} Caras
            </span>
          </div>

          <button
            onClick={handleConfirm}
            disabled={!isComplete}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
          >
            <Check size={16} />
            Iniciar Jogo
          </button>
        </div>
      </div>

      {/* Grid de Caras Adicionadas */}
      <div className="flex-1 bg-slate-900/40 border border-slate-800/80 rounded-3xl p-4 sm:p-6 shadow-2xl overflow-y-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3.5">
          {/* Botão Adicionar Nova Cara */}
          <button
            onClick={() => {
              sounds.playClick();
              setIsCropperOpen(true);
            }}
            disabled={isComplete}
            className="border-2 border-dashed border-indigo-500/60 hover:border-indigo-400 disabled:opacity-40 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all bg-indigo-950/20 hover:bg-indigo-950/40 group min-h-[160px]"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-600/30 text-indigo-400 group-hover:scale-110 flex items-center justify-center mb-2 transition-transform">
              <Plus size={26} />
            </div>
            <span className="text-xs font-bold text-slate-200">Adicionar Foto</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Upload ou Ctrl+V</span>
          </button>

          {/* Lista de Caras adicionadas */}
          {cards.map((char, index) => (
            <div
              key={char.id}
              className="relative group bg-slate-800/90 border border-slate-700/80 rounded-2xl p-2.5 flex flex-col items-center justify-between shadow-md hover:border-indigo-400 transition-all"
            >
              <Avatar character={char} size={78} className="my-1" />
              <span className="text-xs font-bold text-slate-200 truncate w-full text-center mt-1">
                {char.name}
              </span>
              <span className="text-[10px] text-slate-500 font-semibold">#{index + 1}</span>

              {/* Botão Remover */}
              <button
                onClick={() => handleRemoveCard(char.id)}
                title="Remover"
                className="absolute top-1.5 right-1.5 p-1.5 bg-red-950/80 hover:bg-red-900 text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity border border-red-800"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Rodapé com Ajuda e Preenchimento Automático */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800 text-xs text-slate-400">
        <div>
          Faltam <strong>{Math.max(0, targetCount - cards.length)}</strong> caras para completar o modo{' '}
          <span className="text-indigo-400 font-bold">{targetCount} Caras</span>.
        </div>

        {!isComplete && (
          <button
            onClick={handleAutoFillRemaining}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold border border-slate-700 transition-colors"
          >
            <Wand2 size={15} />
            Completar restante com caras prontas
          </button>
        )}
      </div>

      {/* Modal de Recorte e Upload */}
      {isCropperOpen && (
        <ImageCropperModal
          onSaveCharacter={handleAddCard}
          onClose={() => setIsCropperOpen(false)}
          initialIndex={cards.length + 1}
        />
      )}
    </div>
  );
};
