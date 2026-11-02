import { useState, useEffect, type FC } from 'react';
import type { Character, DifficultyCount } from '../types/game';
import { STANDARD_60_CHARACTERS } from '../utils/characters';
import { Avatar } from './Avatar';
import { ImageCropperModal } from './ImageCropperModal';
import { auth, type AppUser, type SavedDeck, type SavedFace } from '../services/auth';
import {
  Plus,
  Trash2,
  Check,
  Wand2,
  ArrowLeft,
  BookmarkCheck,
  Smile,
  Shuffle,
  X,
  Edit2,
  Camera,
} from 'lucide-react';
import { sounds } from '../utils/sound';

interface CustomDeckBuilderProps {
  targetCount: DifficultyCount;
  roomCode?: string;
  currentUser: AppUser | null;
  initialDeck?: SavedDeck | null;
  onFinishDeck: (cards: Character[], deckName?: string) => void;
  onCancel: () => void;
}

export const CustomDeckBuilder: FC<CustomDeckBuilderProps> = ({
  targetCount,
  roomCode = 'temp',
  currentUser,
  initialDeck = null,
  onFinishDeck,
  onCancel,
}) => {
  const [cards, setCards] = useState<Character[]>(() => initialDeck ? [...initialDeck.cards] : []);
  const [deckName, setDeckName] = useState(() => initialDeck?.name || '');
  const [saveToProfile, setSaveToProfile] = useState(true);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [isSavingDeck, setIsSavingDeck] = useState(false);

  // Caras salvas no perfil do usuário
  const [savedFaces, setSavedFaces] = useState<SavedFace[]>([]);
  const [isFacePickerOpen, setIsFacePickerOpen] = useState(false);

  // Edição de nome de carta existente
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingCardName, setEditingCardName] = useState('');
  const [replacingCardId, setReplacingCardId] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      auth.getUserSavedFaces(currentUser.id).then(setSavedFaces);
    }
  }, [currentUser]);

  const handleSaveCroppedCharacter = (newChar: Character) => {
    if (replacingCardId) {
      setCards((prev) =>
        prev.map((c) =>
          c.id === replacingCardId
            ? { ...c, imageUrl: newChar.imageUrl, name: newChar.name || c.name }
            : c
        )
      );
      setReplacingCardId(null);
    } else {
      setCards((prev) => [...prev, newChar]);
    }
  };

  const handleRemoveCard = (id: string) => {
    sounds.playClick();
    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAddSavedFace = (face: SavedFace) => {
    if (cards.length >= targetCount) return;
    sounds.playClick();
    const newChar: Character = {
      id: 'custom_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: face.name,
      imageUrl: face.image_url,
    };
    setCards((prev) => [...prev, newChar]);
  };

  const handleAddAllSavedFaces = () => {
    sounds.playWin();
    const existingNames = new Set(cards.map((c) => c.name));
    const toAdd: Character[] = [];
    for (const f of savedFaces) {
      if (!existingNames.has(f.name) && cards.length + toAdd.length < targetCount) {
        toAdd.push({
          id: 'custom_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          name: f.name,
          imageUrl: f.image_url,
        });
      }
    }
    setCards((prev) => [...prev, ...toAdd]);
    setIsFacePickerOpen(false);
  };

  // PONTO 3.c: Preenchimento Parcialmente Aleatório
  const handleAutoFillRemaining = () => {
    sounds.playClick();
    const remainingNeeded = targetCount - cards.length;
    if (remainingNeeded <= 0) return;

    const existingNames = new Set(cards.map((c) => c.name));
    const available = STANDARD_60_CHARACTERS.filter((c) => !existingNames.has(c.name));
    const added = available.slice(0, remainingNeeded);

    setCards((prev) => [...prev, ...added]);
  };

  // PONTO 3.c: Preenchimento Integralmente Aleatório
  const handleFillCompletelyRandom = () => {
    sounds.playWin();
    // Embaralha os 90 personagens padrão e pega targetCount
    const shuffled = [...STANDARD_60_CHARACTERS].sort(() => 0.5 - Math.random());
    setCards(shuffled.slice(0, targetCount));
  };

  const handleStartRenameCard = (char: Character) => {
    setEditingCardId(char.id);
    setEditingCardName(char.name);
  };

  const handleSaveRenameCard = () => {
    if (!editingCardId) return;
    setCards((prev) =>
      prev.map((c) => (c.id === editingCardId ? { ...c, name: editingCardName.trim() || c.name } : c))
    );
    setEditingCardId(null);
  };

  const handleConfirm = async () => {
    if (cards.length < targetCount) return;
    sounds.playWin();
    setIsSavingDeck(true);

    const finalDeckName = deckName.trim() || `Baralho ${targetCount} Caras`;

    // Se estiver editando um baralho existente (Ponto 3.e)
    if (initialDeck && currentUser) {
      try {
        await auth.updateSavedDeck(
          initialDeck.id,
          currentUser.id,
          finalDeckName,
          targetCount,
          cards.slice(0, targetCount)
        );
      } catch (err) {
        console.warn('Erro ao atualizar baralho existente:', err);
      }
    } else if (saveToProfile && currentUser) {
      // PONTO 2.b: Salvar novo baralho no perfil
      try {
        await auth.saveDeck(currentUser.id, finalDeckName, targetCount, cards.slice(0, targetCount));
      } catch (err) {
        console.warn('Erro ao salvar baralho no perfil:', err);
      }
    }

    setIsSavingDeck(false);
    onFinishDeck(cards.slice(0, targetCount), finalDeckName);
  };

  const isComplete = cards.length >= targetCount;

  return (
    <div className="min-h-[85vh] max-w-5xl mx-auto w-full p-4 flex flex-col gap-4 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-sm shadow-tactile-sm">
                🎨
              </span>
              <span>{initialDeck ? 'Editar Baralho Personalizado' : 'Criar Baralho de Caras'}</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Personalize com fotos de amigos ou use personagens cadastrados no seu perfil!
            </p>
          </div>
        </div>

        {/* Contador de Progresso */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Progresso:</span>
            <span className={`text-lg font-black ${isComplete ? 'text-emerald-600' : 'text-amber-600'}`}>
              {cards.length} / {targetCount} Caras
            </span>
          </div>

          <button
            onClick={handleConfirm}
            disabled={!isComplete || isSavingDeck}
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none text-white font-extrabold text-sm shadow-[0_4px_0_#059669] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
          >
            <Check size={16} />
            <span>
              {isSavingDeck
                ? 'Salvando...'
                : initialDeck
                ? 'Salvar Alterações'
                : 'Iniciar Partida'}
            </span>
          </button>
        </div>
      </div>

      {/* Opções de Salvar e Nome do Baralho */}
      <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm text-xs">
        <div className="w-full sm:w-1/2">
          <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
            Nome do Baralho:
          </label>
          <input
            type="text"
            placeholder="Ex: Família, Amigos da Faculdade, Famosos..."
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            className="w-full bg-slate-50 border-2 border-slate-200 text-slate-900 placeholder-slate-400 text-sm font-semibold rounded-2xl px-4 py-2.5 focus:outline-none focus:bg-white focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all"
          />
        </div>

        {currentUser && !initialDeck ? (
          <label className="flex items-center gap-2.5 cursor-pointer text-slate-700 font-bold select-none pt-1 sm:pt-4 bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-100 transition-colors">
            <input
              type="checkbox"
              checked={saveToProfile}
              onChange={(e) => setSaveToProfile(e.target.checked)}
              className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 accent-sky-600 cursor-pointer"
            />
            <BookmarkCheck size={18} className="text-amber-600" />
            <span className="text-xs">Salvar este baralho no meu perfil</span>
          </label>
        ) : null}
      </div>

      {/* Barra de Ações Rápidas (Minhas Caras / Aleatório) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white p-3.5 rounded-2xl border-2 border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          {currentUser && savedFaces.length > 0 && (
            <button
              onClick={() => setIsFacePickerOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-extrabold text-xs transition-colors cursor-pointer shadow-tactile-sm active:translate-y-0.5"
            >
              <Smile size={15} className="text-amber-700" />
              <span>Minhas Caras Salvas ({savedFaces.length})</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleFillCompletelyRandom}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition-colors cursor-pointer active:translate-y-0.5"
            title="Preencher todo o baralho aleatoriamente"
          >
            <Shuffle size={14} className="text-slate-500" />
            <span>Preencher 100% Aleatório</span>
          </button>

          {!isComplete && (
            <button
              onClick={handleAutoFillRemaining}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 font-extrabold text-xs border border-purple-300 transition-colors cursor-pointer shadow-tactile-sm active:translate-y-0.5"
              title="Preencher apenas as cartas que faltam"
            >
              <Wand2 size={14} className="text-purple-700" />
              <span>Completar Restante ({Math.max(0, targetCount - cards.length)})</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid de Caras Adicionadas */}
      <div className="flex-1 bg-white/85 backdrop-blur-sm border-2 border-slate-200 rounded-3xl p-4 sm:p-6 shadow-sm overflow-y-auto min-h-[350px]">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3.5">
          {/* Botão Adicionar Nova Foto */}
          <button
            onClick={() => {
              sounds.playClick();
              setIsCropperOpen(true);
            }}
            disabled={isComplete}
            className="border-2 border-dashed border-sky-300 hover:border-sky-500 disabled:opacity-40 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all bg-sky-50/50 hover:bg-sky-50 group min-h-[160px] cursor-pointer shadow-sm"
          >
            <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 group-hover:scale-110 flex items-center justify-center mb-2 transition-transform shadow-tactile-sm">
              <Plus size={26} />
            </div>
            <span className="text-xs font-extrabold text-slate-900">Adicionar Foto</span>
            <span className="text-[11px] text-slate-500 mt-0.5 font-medium">Upload ou Ctrl+V</span>
          </button>

          {/* Lista de Caras no Baralho */}
          {cards.map((char, index) => (
            <div
              key={char.id || index}
              className="relative group bg-white border-2 border-slate-200 rounded-2xl p-2.5 flex flex-col items-center justify-between shadow-sm hover:border-sky-400 hover:shadow-md transition-all min-h-[160px]"
            >
              <Avatar character={char} size={76} className="my-1 ring-1 ring-slate-100" />

              {/* Nome ou Campo de Edição de Nome */}
              {editingCardId === char.id ? (
                <div className="flex items-center gap-1 w-full mt-1">
                  <input
                    type="text"
                    value={editingCardName}
                    onChange={(e) => setEditingCardName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveRenameCard()}
                    className="w-full bg-slate-50 text-slate-900 text-[11px] font-bold rounded-lg px-2 py-1 border-2 border-sky-400 focus:outline-none"
                    autoFocus
                  />
                  <button onClick={handleSaveRenameCard} className="text-emerald-600 hover:text-emerald-700 p-1">
                    <Check size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-1 w-full px-1">
                  <span className="text-xs font-bold text-slate-800 truncate text-center">
                    {char.name}
                  </span>
                  <button
                    onClick={() => handleStartRenameCard(char)}
                    title="Editar nome"
                    className="text-slate-400 hover:text-sky-600 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 cursor-pointer"
                  >
                    <Edit2 size={12} />
                  </button>
                </div>
              )}

              <span className="text-[10px] text-slate-400 font-semibold mt-1">#{index + 1}</span>

              {/* Botão Substituir Foto */}
              <button
                onClick={() => {
                  setReplacingCardId(char.id);
                  setIsCropperOpen(true);
                }}
                title="Substituir foto desta cara"
                className="absolute top-1.5 left-1.5 p-1.5 bg-slate-100 hover:bg-sky-50 text-slate-500 hover:text-sky-700 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity border border-slate-200 cursor-pointer shadow-sm"
              >
                <Camera size={13} />
              </button>

              {/* Botão Remover Carta */}
              <button
                onClick={() => handleRemoveCard(char.id)}
                title="Remover"
                className="absolute top-1.5 right-1.5 p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity border border-rose-200 cursor-pointer shadow-sm"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Modal / Gaveta de Seleção de Caras Salvas no Perfil (Ponto 3.c) */}
      {isFacePickerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Smile size={20} className="text-amber-600" />
                <h3 className="text-base font-extrabold text-slate-900">Caras Salvas no Seu Perfil</h3>
              </div>
              <button
                onClick={() => setIsFacePickerOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-3">
              Clique em qualquer cara para adicioná-la a este baralho:
            </p>

            <div className="flex-1 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 gap-2.5 p-1">
              {savedFaces.map((face) => {
                const alreadyAdded = cards.some((c) => c.name === face.name);
                return (
                  <button
                    key={face.id}
                    onClick={() => handleAddSavedFace(face)}
                    disabled={alreadyAdded || isComplete}
                    className={`p-2 rounded-2xl border-2 flex flex-col items-center justify-center text-center transition-all ${
                      alreadyAdded
                        ? 'opacity-40 border-slate-200 bg-slate-50 cursor-not-allowed'
                        : 'border-slate-200 hover:border-amber-400 bg-white hover:bg-amber-50/40 shadow-sm cursor-pointer'
                    }`}
                  >
                    <div className="w-14 h-14 rounded-xl overflow-hidden mb-1 bg-slate-100 border border-slate-200">
                      <img src={face.image_url} alt={face.name} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-800 truncate w-full px-1">
                      {face.name}
                    </span>
                    {alreadyAdded && (
                      <span className="text-[9px] text-emerald-600 font-bold">Adicionada</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 mt-3">
              <button
                onClick={handleAddAllSavedFaces}
                disabled={isComplete}
                className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-extrabold text-xs shadow-tactile-sm transition-all active:translate-y-0.5 cursor-pointer"
              >
                Adicionar Todas ao Baralho
              </button>
              <button
                onClick={() => setIsFacePickerOpen(false)}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-colors cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Recorte e Upload */}
      {isCropperOpen && (
        <ImageCropperModal
          onSaveCharacter={handleSaveCroppedCharacter}
          onClose={() => {
            setIsCropperOpen(false);
            setReplacingCardId(null);
          }}
          initialIndex={replacingCardId ? undefined : cards.length + 1}
          roomCode={roomCode}
        />
      )}
    </div>
  );
};
