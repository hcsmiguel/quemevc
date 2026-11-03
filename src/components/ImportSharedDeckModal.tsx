import { useState, useEffect, type FC } from 'react';
import { auth, type AppUser, type SavedDeck } from '../services/auth';
import { Share2, Play, BookmarkPlus, X, Check, Loader2, Sparkles, LogIn } from 'lucide-react';
import { sounds } from '../utils/sound';

interface ImportSharedDeckModalProps {
  deckId: string;
  currentUser: AppUser | null;
  onOpenLogin: () => void;
  onPlayDeck: (deck: SavedDeck) => void;
  onClose: () => void;
  onGoToProfile?: () => void;
}

export const ImportSharedDeckModal: FC<ImportSharedDeckModalProps> = ({
  deckId,
  currentUser,
  onOpenLogin,
  onPlayDeck,
  onClose,
  onGoToProfile,
}) => {
  const [deck, setDeck] = useState<SavedDeck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);
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

  const handleSaveToProfile = async (importFaces: boolean) => {
    if (!currentUser) {
      sounds.playWrong();
      onOpenLogin();
      return;
    }
    if (!deck) return;

    sounds.playClick();
    setSaving(true);
    setError(null);
    try {
      // 0. Checar limite de baralhos (máximo 10)
      const userDecks = await auth.getUserSavedDecks(currentUser.id);
      if (userDecks.length >= 10) {
        sounds.playWrong();
        setError('Você já possui 10 baralhos salvos no seu perfil (limite máximo atingido). Exclua um baralho existente para salvar este, ou clique no botão abaixo para Jogar sem salvar.');
        return;
      }

      // 1. Salvar o baralho
      await auth.saveDeck(currentUser.id, deck.name, deck.card_count, deck.cards, false, currentUser.username);

      // 2. Se solicitou importar as caras também para o perfil, checar limite de 200
      let facesSkippedDueToLimit = false;
      if (importFaces) {
        const userFaces = await auth.getUserSavedFaces(currentUser.id);
        let currentFaceCount = userFaces.length;

        for (const card of deck.cards) {
          if (currentFaceCount >= 200) {
            facesSkippedDueToLimit = true;
            break;
          }
          if (card.imageUrl && card.name) {
            try {
              await auth.saveFace(currentUser.id, card.name, card.imageUrl, false, currentUser.username);
              currentFaceCount++;
            } catch (err) {
              console.warn('Erro ao salvar cara avulsa:', err);
            }
          }
        }
      }

      sounds.playWin();
      if (facesSkippedDueToLimit) {
        setSavedSuccess('Baralho salvo! Algumas caras não foram importadas pois você atingiu o limite de 200 caras.');
      } else {
        setSavedSuccess(
          importFaces
            ? 'Baralho e caras salvos com sucesso no seu perfil!'
            : 'Baralho salvo com sucesso no seu perfil!'
        );
      }
      setTimeout(() => setSavedSuccess(null), 4000);
    } catch {
      sounds.playWrong();
      setError('Erro ao salvar baralho no perfil. Tente novamente.');
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

            {/* Aviso de Login se o usuário for visitante */}
            {!currentUser && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-2 text-xs text-amber-950 font-medium">
                <span className="text-[11px]">Faça login para salvar este baralho no seu perfil.</span>
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="shrink-0 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <LogIn size={13} />
                  <span>Entrar / Cadastrar</span>
                </button>
              </div>
            )}

            {/* Sucesso ao Salvar */}
            {savedSuccess && (
              <div className="p-3 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-800 text-xs font-black flex items-center justify-between gap-2 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <Check size={18} className="text-emerald-600 shrink-0" />
                  <span>{savedSuccess}</span>
                </div>
                {onGoToProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onGoToProfile();
                    }}
                    className="shrink-0 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase transition-all shadow-sm cursor-pointer"
                  >
                    Ver no Perfil
                  </button>
                )}
              </div>
            )}

            {/* Ações (Ponto 1: Importar Baralho vs Importar Baralho e Caras) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleSaveToProfile(false)}
                disabled={saving}
                className="py-3 px-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm text-center"
              >
                {saving ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <BookmarkPlus size={15} />
                )}
                <span>Importar Baralho</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveToProfile(true)}
                disabled={saving}
                className="py-3 px-3 rounded-2xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm text-center"
              >
                {saving ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Sparkles size={15} />
                )}
                <span>Importar Baralho e Caras</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onPlayDeck(deck);
                  onClose();
                }}
                className="py-3 px-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs shadow-tactile-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer active:translate-y-0.5 text-center"
              >
                <Play size={15} />
                <span>Jogar Agora</span>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
