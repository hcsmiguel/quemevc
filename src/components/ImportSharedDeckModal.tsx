import { useState, useEffect, type FC } from 'react';
import { auth, type AppUser, type SavedDeck } from '../services/auth';
import { Share2, Play, BookmarkPlus, X, Check, Loader2 } from 'lucide-react';
import { sounds } from '../utils/sound';

interface ImportSharedDeckModalProps {
  deckId: string;
  currentUser: AppUser | null;
  onOpenLogin: () => void;
  onPlayDeck: (deck: SavedDeck) => void;
  onClose: () => void;
}

export const ImportSharedDeckModal: FC<ImportSharedDeckModalProps> = ({
  deckId,
  currentUser,
  onOpenLogin,
  onPlayDeck,
  onClose,
}) => {
  const [deck, setDeck] = useState<SavedDeck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchDeck = async () => {
      setLoading(true);
      setError(null);
      try {
        const found = await auth.getDeckById(deckId);
        if (found) {
          setDeck(found);
        } else {
          setError('O baralho compartilhado não foi encontrado ou foi excluído.');
        }
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar baralho.');
      } finally {
        setLoading(false);
      }
    };
    fetchDeck();
  }, [deckId]);

  const handleSaveToProfile = async () => {
    if (!currentUser) {
      sounds.playWrong();
      onOpenLogin();
      return;
    }
    if (!deck) return;

    sounds.playClick();
    setSaving(true);
    try {
      await auth.saveDeck(currentUser.id, deck.name, deck.card_count, deck.cards);
      sounds.playWin();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch {
      sounds.playWrong();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border-2 border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Share2 size={16} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Baralho Compartilhado</h3>
              <p className="text-[11px] text-slate-500">Um jogador compartilhou este baralho com você!</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 font-bold flex flex-col items-center gap-2">
            <Loader2 size={24} className="animate-spin text-purple-600" />
            <span>Carregando baralho compartilhado...</span>
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-xs text-rose-600 font-bold mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs"
            >
              Fechar
            </button>
          </div>
        ) : deck ? (
          <div className="space-y-4 overflow-y-auto pr-1">
            <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-base font-black text-purple-950">{deck.name}</h4>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-purple-200 text-purple-900">
                  {deck.card_count} Caras
                </span>
              </div>
              <p className="text-xs text-purple-700 font-medium">
                Contém {deck.cards.length} cartas personalizadas prontas para jogar.
              </p>
            </div>

            {/* Grid de Previews das Cartas */}
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Cartas deste baralho:
              </span>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1 bg-slate-50 rounded-2xl border border-slate-200">
                {deck.cards.map((c, i) => (
                  <div key={c.id || i} className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-white border border-slate-200 shadow-sm mb-1">
                      {c.imageUrl ? (
                        <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-xs bg-amber-100 text-amber-800">
                          {c.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-extrabold text-slate-700 truncate w-full px-0.5">
                      {c.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ações */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              <button
                onClick={handleSaveToProfile}
                disabled={saving || savedSuccess}
                className={`py-3 px-4 rounded-2xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                  savedSuccess
                    ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-300'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {savedSuccess ? (
                  <>
                    <Check size={16} className="text-emerald-600" />
                    <span>Salvo no seu Perfil!</span>
                  </>
                ) : (
                  <>
                    <BookmarkPlus size={16} />
                    <span>Salvar no Meu Perfil</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  onPlayDeck(deck);
                  onClose();
                }}
                className="py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs shadow-tactile-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer active:translate-y-0.5"
              >
                <Play size={16} />
                <span>Jogar Agora</span>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
