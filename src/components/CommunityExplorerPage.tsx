import { useState, useEffect, type FC } from 'react';
import { auth, type AppUser, type SavedDeck, type SavedFace } from '../services/auth';
import {
  Globe2,
  Search,
  Layers,
  Smile,
  Play,
  Share2,
  Check,
  BookmarkPlus,
  ArrowLeft,
  Loader2,
  User,
} from 'lucide-react';
import { sounds } from '../utils/sound';
import { AccountLimitModal } from './AccountLimitModal';

interface CommunityExplorerPageProps {
  currentUser: AppUser | null;
  onBackToHome: () => void;
  onOpenLogin: () => void;
  onPlayDeck: (deck: SavedDeck) => void;
  onGoToProfile: () => void;
}

export const CommunityExplorerPage: FC<CommunityExplorerPageProps> = ({
  currentUser,
  onBackToHome,
  onOpenLogin,
  onPlayDeck,
  onGoToProfile,
}) => {
  const [activeTab, setActiveTab] = useState<'decks' | 'faces'>('decks');
  const [searchQuery, setSearchQuery] = useState('');
  const [publicDecks, setPublicDecks] = useState<SavedDeck[]>([]);
  const [publicFaces, setPublicFaces] = useState<SavedFace[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de feedback de cópia e salvamento
  const [copiedDeckId, setCopiedDeckId] = useState<string | null>(null);
  const [savedDeckId, setSavedDeckId] = useState<string | null>(null);
  const [savedFaceId, setSavedFaceId] = useState<string | null>(null);

  // Modal de limites
  const [limitModalType, setLimitModalType] = useState<'deck' | 'face' | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        if (activeTab === 'decks') {
          const decks = await auth.getPublicDecks(searchQuery);
          if (isMounted) setPublicDecks(decks);
        } else {
          const faces = await auth.getPublicFaces(searchQuery);
          if (isMounted) setPublicFaces(faces);
        }
      } catch (err) {
        console.error('Erro ao carregar dados da comunidade:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const timer = setTimeout(fetchData, 250);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [activeTab, searchQuery]);

  const handleShareDeck = (deck: SavedDeck) => {
    sounds.playClick();
    const shareUrl = `${window.location.origin}/?import_deck=${deck.id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedDeckId(deck.id);
    setTimeout(() => setCopiedDeckId(null), 3000);
  };

  const handleSaveDeckToProfile = async (deck: SavedDeck) => {
    if (!currentUser) {
      sounds.playWrong();
      onOpenLogin();
      return;
    }

    sounds.playClick();
    try {
      const userDecks = await auth.getUserSavedDecks(currentUser.id);
      if (userDecks.length >= 10) {
        sounds.playWrong();
        setLimitModalType('deck');
        return;
      }

      await auth.saveDeck(
        currentUser.id,
        deck.name,
        deck.card_count,
        deck.cards,
        false,
        currentUser.username
      );

      sounds.playWin();
      setSavedDeckId(deck.id);
      setTimeout(() => setSavedDeckId(null), 3500);
    } catch {
      sounds.playWrong();
    }
  };

  const handleSaveFaceToProfile = async (face: SavedFace) => {
    if (!currentUser) {
      sounds.playWrong();
      onOpenLogin();
      return;
    }

    sounds.playClick();
    try {
      const userFaces = await auth.getUserSavedFaces(currentUser.id);
      if (userFaces.length >= 200) {
        sounds.playWrong();
        setLimitModalType('face');
        return;
      }

      await auth.saveFace(
        currentUser.id,
        face.name,
        face.image_url,
        false,
        currentUser.username
      );

      sounds.playWin();
      setSavedFaceId(face.id);
      setTimeout(() => setSavedFaceId(null), 3500);
    } catch {
      sounds.playWrong();
    }
  };

  return (
    <div className="max-w-6xl mx-auto w-full py-4 sm:py-6 px-3 sm:px-4 animate-in fade-in duration-200">
      {/* Botão Voltar */}
      <div className="mb-4">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-700 font-extrabold text-[11px] sm:text-xs shadow-sm hover:border-slate-300 transition-all cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Voltar ao Menu Principal</span>
        </button>
      </div>

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-purple-50 via-sky-50 to-amber-50 border-2 border-purple-200 rounded-3xl p-5 sm:p-7 shadow-sm mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black shadow-tactile-sm shrink-0">
            <Globe2 size={26} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-900">
                Hub Aberto
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              Explorar Comunidade
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">
              Baralhos e personagens criados por jogadores da comunidade prontos para jogar!
            </p>
          </div>
        </div>

        {currentUser && (
          <button
            onClick={onGoToProfile}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-[0_2px_0_#581c87] transition-all cursor-pointer shrink-0"
          >
            <User size={14} />
            <span>Meu Perfil</span>
          </button>
        )}
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        {/* Abas: Baralhos vs Caras */}
        <div className="grid grid-cols-2 p-1 bg-slate-200/70 rounded-xl sm:rounded-2xl border border-slate-200 text-xs font-bold gap-1 sm:inline-flex sm:w-auto">
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setActiveTab('decks');
            }}
            className={`py-2 px-4 rounded-lg sm:rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'decks'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers size={14} className={activeTab === 'decks' ? 'text-indigo-600' : ''} />
            <span>Baralhos da Comunidade</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setActiveTab('faces');
            }}
            className={`py-2 px-4 rounded-lg sm:rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'faces'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smile size={14} className={activeTab === 'faces' ? 'text-amber-600' : ''} />
            <span>Banco de Caras</span>
          </button>
        </div>

        {/* Campo de Pesquisa */}
        <div className="relative flex-1 sm:max-w-xs">
          <input
            type="text"
            placeholder={activeTab === 'decks' ? 'Buscar baralhos por nome...' : 'Buscar personagens...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border-2 border-slate-200 text-slate-900 placeholder-slate-400 text-xs font-semibold rounded-xl sm:rounded-2xl pl-9 pr-8 py-2.5 focus:outline-none focus:border-purple-400 transition-all shadow-sm"
          />
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Conteúdo: Baralhos da Comunidade */}
      {activeTab === 'decks' && (
        <div>
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-2">
              <Loader2 size={26} className="animate-spin text-purple-600" />
              <span className="text-xs font-extrabold text-slate-500">Carregando baralhos da comunidade...</span>
            </div>
          ) : publicDecks.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-3 shadow-tactile-sm">
                <Layers size={26} />
              </div>
              <h3 className="text-base font-black text-slate-900 mb-1">
                {searchQuery ? 'Nenhum baralho encontrado' : 'Nenhum baralho público ainda'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {searchQuery
                  ? 'Tente pesquisar por outro termo ou limpe a busca para ver todos.'
                  : 'Crie seu baralho no perfil e ative a opção "Público para Comunidade" para ser o primeiro!'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {publicDecks.map((deck) => (
                <div
                  key={deck.id}
                  className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-sm hover:shadow-md hover:border-purple-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <h3 className="font-black text-base text-slate-900 leading-tight truncate">
                          {deck.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                            {deck.card_count} Caras
                          </span>
                          {deck.author_name && (
                            <span className="text-[10px] font-bold text-slate-400 truncate">
                              por <strong>{deck.author_name}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleShareDeck(deck)}
                        title="Copiar link deste baralho"
                        className={`p-2 rounded-xl transition-colors cursor-pointer shrink-0 ${
                          copiedDeckId === deck.id
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 hover:bg-purple-50 text-slate-500 hover:text-purple-700'
                        }`}
                      >
                        {copiedDeckId === deck.id ? <Check size={14} /> : <Share2 size={14} />}
                      </button>
                    </div>

                    {/* Preview das Caras */}
                    <div className="flex items-center -space-x-2 my-4 overflow-hidden py-1">
                      {deck.cards.slice(0, 6).map((c, i) => (
                        <div
                          key={c.id || i}
                          className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl border-2 border-white shadow-sm overflow-hidden bg-slate-100 shrink-0"
                        >
                          {c.imageUrl ? (
                            <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold bg-amber-200 text-amber-900">
                              {c.name.charAt(0)}
                            </div>
                          )}
                        </div>
                      ))}
                      {deck.cards.length > 6 && (
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl border-2 border-white shadow-sm bg-slate-200 flex items-center justify-center text-xs font-black text-slate-700 shrink-0">
                          +{deck.cards.length - 6}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => onPlayDeck(deck)}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs shadow-tactile-sm transition-all active:translate-y-0.5 cursor-pointer"
                    >
                      <Play size={14} />
                      <span>Jogar com este Baralho</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSaveDeckToProfile(deck)}
                      disabled={savedDeckId === deck.id}
                      className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-extrabold text-xs transition-colors cursor-pointer border ${
                        savedDeckId === deck.id
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          : 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700'
                      }`}
                    >
                      {savedDeckId === deck.id ? (
                        <>
                          <Check size={13} className="text-emerald-600" />
                          <span>Salvo no seu Perfil!</span>
                        </>
                      ) : (
                        <>
                          <BookmarkPlus size={13} />
                          <span>Salvar no Meu Perfil</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Conteúdo: Banco de Caras da Comunidade */}
      {activeTab === 'faces' && (
        <div>
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-2">
              <Loader2 size={26} className="animate-spin text-amber-600" />
              <span className="text-xs font-extrabold text-slate-500">Carregando caras da comunidade...</span>
            </div>
          ) : publicFaces.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3 shadow-tactile-sm">
                <Smile size={26} />
              </div>
              <h3 className="text-base font-black text-slate-900 mb-1">
                {searchQuery ? 'Nenhuma cara encontrada' : 'Nenhuma cara pública ainda'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {searchQuery
                  ? 'Tente buscar pelo nome de outro personagem ou limpe a busca.'
                  : 'Cadastre e recorte caras no seu perfil marcando como públicas para compartilhar com todos!'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4 md:gap-5">
              {publicFaces.map((face) => (
                <div
                  key={face.id}
                  className="bg-white border-2 border-slate-200 rounded-3xl p-3 shadow-sm hover:border-amber-400 hover:shadow-md transition-all flex flex-col items-center text-center group"
                >
                  <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-2xl overflow-hidden mb-2 bg-slate-100 border border-slate-200 shadow-inner">
                    <img
                      src={face.image_url}
                      alt={face.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>

                  <span className="font-black text-xs sm:text-sm text-slate-900 truncate w-full px-1 mb-1">
                    {face.name}
                  </span>

                  {face.author_name && (
                    <span className="text-[10px] text-slate-400 font-bold mb-2 truncate w-full">
                      por {face.author_name}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => handleSaveFaceToProfile(face)}
                    disabled={savedFaceId === face.id}
                    className={`w-full flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl font-extrabold text-[11px] transition-all cursor-pointer border ${
                      savedFaceId === face.id
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-900'
                    }`}
                  >
                    {savedFaceId === face.id ? (
                      <>
                        <Check size={12} className="text-emerald-600" />
                        <span>Salva!</span>
                      </>
                    ) : (
                      <>
                        <BookmarkPlus size={12} />
                        <span>Salvar</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de Limites Atingidos */}
      <AccountLimitModal
        isOpen={limitModalType !== null}
        type={limitModalType || 'deck'}
        onClose={() => setLimitModalType(null)}
        onGoToProfile={onGoToProfile}
      />
    </div>
  );
};
