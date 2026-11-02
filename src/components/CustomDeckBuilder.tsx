import { useState, type FC } from 'react';
import type { Character, DifficultyCount } from '../types/game';
import { STANDARD_60_CHARACTERS } from '../utils/characters';
import { Avatar } from './Avatar';
import { ImageCropperModal } from './ImageCropperModal';
import { Plus, Trash2, Check, Wand2, ArrowLeft } from 'lucide-react';
import { sounds } from '../utils/sound';

interface CustomDeckBuilderProps {
  targetCount: DifficultyCount;
  roomCode?: string;
  onFinishDeck: (cards: Character[]) => void;
  onCancel: () => void;
}

export const CustomDeckBuilder: FC<CustomDeckBuilderProps> = ({
  targetCount,
  roomCode = 'temp',
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
      <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center text-sm shadow-tactile-sm">
                🎨
              </span>
              Criar Baralho de Caras Personalizadas
            </h2>
            <p className="text-xs text-slate-500">
              Adicione fotos de amigos, familiares ou quem você quiser para jogar!
            </p>
          </div>
        </div>

        {/* Contador de Progresso */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-slate-500 block font-bold">Progresso:</span>
            <span className={`text-lg font-black ${isComplete ? 'text-emerald-700' : 'text-amber-700'}`}>
              {cards.length} / {targetCount} Caras
            </span>
          </div>

          <button
            onClick={handleConfirm}
            disabled={!isComplete}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-extrabold text-xs uppercase tracking-wider shadow-[0_3px_0_#059669] active:translate-y-0.5 transition-all cursor-pointer"
          >
            <Check size={16} />
            Iniciar Jogo
          </button>
        </div>
      </div>

      {/* Grid de Caras Adicionadas */}
      <div className="flex-1 bg-slate-100/70 border-2 border-slate-200 rounded-3xl p-4 sm:p-6 shadow-sm overflow-y-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3.5">
          {/* Botão Adicionar Nova Cara */}
          <button
            onClick={() => {
              sounds.playClick();
              setIsCropperOpen(true);
            }}
            disabled={isComplete}
            className="border-2 border-dashed border-sky-300 hover:border-sky-400 disabled:opacity-40 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all bg-sky-50/50 hover:bg-sky-50 group min-h-[160px] cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 group-hover:scale-110 flex items-center justify-center mb-2 transition-transform shadow-tactile-sm">
              <Plus size={26} />
            </div>
            <span className="text-xs font-bold text-slate-800">Adicionar Foto</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Upload ou Ctrl+V</span>
          </button>

          {/* Lista de Caras adicionadas */}
          {cards.map((char, index) => (
            <div
              key={char.id}
              className="relative group bg-white border-2 border-slate-200 rounded-2xl p-2.5 flex flex-col items-center justify-between shadow-sm hover:border-sky-400 transition-all"
            >
              <Avatar character={char} size={78} className="my-1" />
              <span className="text-xs font-bold text-slate-800 truncate w-full text-center mt-1">
                {char.name}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">#{index + 1}</span>

              {/* Botão Remover */}
              <button
                onClick={() => handleRemoveCard(char.id)}
                title="Remover"
                className="absolute top-1.5 right-1.5 p-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity border border-rose-300 cursor-pointer"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Rodapé com Ajuda e Preenchimento Automático */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 shadow-sm">
        <div>
          Faltam <strong>{Math.max(0, targetCount - cards.length)}</strong> caras para completar o modo{' '}
          <span className="text-sky-700 font-bold">{targetCount} Caras</span>.
        </div>

        {!isComplete && (
          <button
            onClick={handleAutoFillRemaining}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-extrabold border border-amber-300 transition-colors cursor-pointer"
          >
            <Wand2 size={15} className="text-amber-700" />
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
          roomCode={roomCode}
        />
      )}
    </div>
  );
};
