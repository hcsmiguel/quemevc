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
    <div className="fixed inset-0 z-50 bg-[#382C26]/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#E8E0D8] rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E8E0D8] mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FFE8E0] text-[#C25E3E] flex items-center justify-center border border-[#FFB59A]/40 shadow-xs">
              <Share2 size={16} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#382C26]">Baralho Compartilhado</h3>
              <p className="text-[11px] text-[#8C786E]">Um jogador compartilhou este baralho com você!</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-[#FAF6F0] hover:bg-[#E8E0D8] text-[#8C786E] transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-[#8C786E] font-bold flex flex-col items-center gap-2">
            <Loader2 size={24} className="animate-spin text-[#C25E3E]" />
            <span>Carregando baralho compartilhado...</span>
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-xs text-rose-600 font-bold mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#FAF6F0] text-[#776156] rounded-xl font-bold text-xs border border-[#E8E0D8]"
            >
              Fechar
            </button>
          </div>
        ) : deck ? (
          <div className="space-y-4 overflow-y-auto pr-1">
            <div className="bg-[#FAF6F0] border border-[#E8E0D8] rounded-2xl p-4">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-base font-bold text-[#382C26]">{deck.name}</h4>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#FFE8E0] text-[#C25E3E]">
                  {deck.card_count} Caras
                </span>
              </div>
              <p className="text-xs text-[#8C786E] font-medium">
                Contém {deck.cards.length} cartas personalizadas prontas para jogar.
              </p>
            </div>

            {/* Grid de Previews das Cartas */}
            <div>
              <span className="text-[11px] font-bold text-[#8C786E] uppercase tracking-wider block mb-2">
                Cartas deste baralho:
              </span>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-2 bg-[#FAF6F0] rounded-2xl border border-[#E8E0D8]">
                {deck.cards.map((c, i) => (
                  <div key={c.id || i} className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-white border border-[#E8E0D8] shadow-xs mb-1">
                      {c.imageUrl ? (
                        <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-xs bg-[#FFE8E0] text-[#C25E3E]">
                          {c.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-[#382C26] truncate w-full px-0.5">
                      {c.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Aviso de Login se o usuário for visitante */}
            {!currentUser && (
              <div className="p-3 bg-[#FFF8F4] border border-[#FFB59A] rounded-2xl flex items-center justify-between gap-2 text-xs text-[#776156]">
                <span className="text-[11px]">Faça login para salvar este baralho no seu perfil.</span>
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="shrink-0 px-3 py-1.5 bg-[#C25E3E] hover:bg-[#A94E31] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-none"
                >
                  <LogIn size={13} />
                  <span>Entrar / Cadastrar</span>
                </button>
              </div>
            )}

            {/* Sucesso ao Salvar */}
            {savedSuccess && (
              <div className="p-3 rounded-2xl bg-[#E8F5E9] border border-[#A5D6A7] text-[#2E7D32] text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <Check size={18} className="text-[#2E7D32] shrink-0" />
                  <span>{savedSuccess}</span>
                </div>
                {onGoToProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onGoToProfile();
                    }}
                    className="shrink-0 px-3 py-1.5 bg-[#2E7D32] hover:bg-[#1B5E20] text-white rounded-xl text-xs font-bold uppercase transition-all shadow-none cursor-pointer"
                  >
                    Ver no Perfil
                  </button>
                )}
              </div>
            )}

            {/* Ações */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleSaveToProfile(false)}
                disabled={saving}
                className="py-3 px-3 rounded-xl bg-[#FAF6F0] hover:bg-[#E8E0D8] text-[#776156] border border-[#E8E0D8] font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-none text-center"
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
                className="py-3 px-3 rounded-xl bg-[#FFE8E0] hover:bg-[#FFD2C4] text-[#C25E3E] border border-[#FFB59A] font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-none text-center"
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
                className="py-3 px-3 rounded-xl bg-[#C25E3E] hover:bg-[#A94E31] text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center shadow-none"
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
