import { useState, useEffect, type FC } from 'react';
import {
  auth,
  type AppUser,
  type UserStats,
  type SavedDeck,
  type SavedFace,
} from '../services/auth';
import type { Character } from '../types/game';
import {
  Trophy,
  Swords,
  Layers,
  Trash2,
  Share2,
  Edit3,
  Play,
  Plus,
  ArrowLeft,
  Check,
  Smile,
  KeyRound,
  LogOut,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { sounds } from '../utils/sound';
import { network } from '../services/network';
import { ImageCropperModal } from './ImageCropperModal';

interface ProfilePageProps {
  currentUser: AppUser;
  onBackToLobby: () => void;
  onPlayDeck: (deck: SavedDeck) => void;
  onEditDeck: (deck: SavedDeck) => void;
  onCreateNewDeck: () => void;
  onReconnectMatch?: (session: any) => void;
}

export const ProfilePage: FC<ProfilePageProps> = ({
  currentUser,
  onBackToLobby,
  onPlayDeck,
  onEditDeck,
  onCreateNewDeck,
  onReconnectMatch,
}) => {
  const [activeTab, setActiveTab] = useState<'decks' | 'faces' | 'stats'>('decks');
  const [stats, setStats] = useState<UserStats | null>(null);
  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>([]);
  const [savedFaces, setSavedFaces] = useState<SavedFace[]>([]);
  const [loading, setLoading] = useState(true);

  // PONTO 1.c: Reconectar à Partida em Andamento (Opção de 1 minuto no Perfil)
  const [reconnectSession, setReconnectSession] = useState<any>(null);
  const [reconnectSecondsLeft, setReconnectSecondsLeft] = useState<number>(0);

  useEffect(() => {
    const checkSession = () => {
      try {
        const raw = localStorage.getItem('cara_reconnect_session') || localStorage.getItem('cara_active_session');
        if (!raw) {
          setReconnectSession(null);
          return;
        }
        const session = JSON.parse(raw);
        if (!session.roomCode || session.phase === 'LOBBY') {
          setReconnectSession(null);
          return;
        }

        const expiresAt = session.expiresAt || (session.disconnectedAt ? session.disconnectedAt + 60000 : Date.now() + 60000);
        const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));

        if (remaining > 0) {
          setReconnectSession({ ...session, expiresAt });
          setReconnectSecondsLeft(remaining);
        } else {
          localStorage.removeItem('cara_reconnect_session');
          setReconnectSession(null);
          if (session.roomCode) {
            network.finishRoom(session.roomCode);
          }
        }
      } catch {
        setReconnectSession(null);
      }
    };

    checkSession();
    const timer = setInterval(() => {
      setReconnectSecondsLeft((prev) => {
        if (prev <= 1) {
          checkSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleDismissReconnect = () => {
    sounds.playClick();
    if (reconnectSession?.roomCode) {
      network.finishRoom(reconnectSession.roomCode);
    }
    localStorage.removeItem('cara_reconnect_session');
    localStorage.removeItem('cara_active_session');
    setReconnectSession(null);
  };

  // Modal para adicionar nova cara avulsa no perfil
  const [isAddingFace, setIsAddingFace] = useState(false);

  // Feedback de link copiado por ID do baralho
  const [copiedDeckId, setCopiedDeckId] = useState<string | null>(null);

  // Gerenciamento de Perfil (Ponto 3.a)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleUpdatePassword = async () => {
    setPasswordError(null);
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('A senha deve conter no mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setPasswordError('As senhas não coincidem. Verifique a digitação.');
      return;
    }
    try {
      setIsSavingPassword(true);
      await auth.updatePassword(newPassword);
      sounds.playWin();
      setPasswordSuccess(true);
      setTimeout(() => {
        setPasswordModalOpen(false);
        setPasswordSuccess(false);
        setNewPassword('');
        setNewPasswordConfirm('');
      }, 1800);
    } catch (err: any) {
      setPasswordError(err.message || 'Falha ao alterar senha.');
      sounds.playWrong();
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setIsDeletingAccount(true);
      await auth.deleteAccount(currentUser.id);
      sounds.playClick();
      onBackToLobby();
    } catch (err: any) {
      alert('Erro ao apagar conta: ' + err.message);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [currentUser.id]);

  const loadUserData = async () => {
    setLoading(true);
    const [userStats, userDecks, userFaces] = await Promise.all([
      auth.getUserStats(currentUser.id),
      auth.getUserSavedDecks(currentUser.id),
      auth.getUserSavedFaces(currentUser.id),
    ]);
    setStats(userStats);
    setSavedDecks(userDecks);
    setSavedFaces(userFaces);
    setLoading(false);
  };

  const handleDeleteDeck = async (deckId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este baralho?')) return;
    sounds.playClick();
    await auth.deleteSavedDeck(deckId, currentUser.id);
    setSavedDecks((prev) => prev.filter((d) => d.id !== deckId));
  };

  const handleShareDeck = (deck: SavedDeck) => {
    sounds.playClick();
    const shareUrl = `${window.location.origin}/?import_deck=${deck.id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedDeckId(deck.id);
    setTimeout(() => setCopiedDeckId(null), 3000);
  };

  const handleSaveCroppedFace = async (newChar: Character) => {
    sounds.playWin();
    setIsAddingFace(false);
    if (newChar.imageUrl) {
      const face = await auth.saveFace(currentUser.id, newChar.name, newChar.imageUrl);
      setSavedFaces((prev) => [face, ...prev]);
    }
  };

  const handleDeleteFace = async (faceId: string) => {
    sounds.playClick();
    await auth.deleteSavedFace(faceId, currentUser.id);
    setSavedFaces((prev) => prev.filter((f) => f.id !== faceId));
  };

  return (
    <div className="max-w-6xl mx-auto w-full py-4 sm:py-6 px-3 sm:px-4 animate-in fade-in duration-200">
      {/* Botão de Retorno */}
      <div className="mb-3 sm:mb-4">
        <button
          onClick={onBackToLobby}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-700 font-extrabold text-[11px] sm:text-xs shadow-sm hover:border-slate-300 transition-all cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Voltar ao Menu Principal</span>
        </button>
      </div>

      {/* PONTO 1.c: Banner de Reconexão para Partida em Andamento (Opção de 1 minuto) */}
      {reconnectSession && reconnectSecondsLeft > 0 && (
        <div className="bg-gradient-to-r from-purple-50 via-sky-50 to-amber-50 border-2 border-purple-300 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-md mb-4 sm:mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black shadow-tactile-sm shrink-0">
              <RotateCcw size={22} className="animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black text-purple-900 uppercase tracking-wider">
                  Partida em Andamento
                </span>
                <span className="text-[10px] sm:text-[11px] bg-purple-100 text-purple-800 font-extrabold px-2 py-0.5 rounded-full border border-purple-200 shrink-0">
                  Sala #{reconnectSession.roomCode}
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-0.5 truncate">
                Partida contra <strong className="text-purple-700">{reconnectSession.opponentName || 'Oponente'}</strong>. Tempo para reconectar: <span className="font-mono font-black text-rose-600 tabular-nums">{reconnectSecondsLeft}s</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                sounds.playClick();
                if (onReconnectMatch) {
                  onReconnectMatch(reconnectSession);
                }
              }}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-[0_2px_0_#6b21a8] transition-all cursor-pointer active:translate-y-0.5"
            >
              <RotateCcw size={14} />
              <span>Reconectar à Partida</span>
            </button>
            <button
              onClick={handleDismissReconnect}
              className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 font-bold text-xs transition-colors cursor-pointer"
              title="Desistir da partida"
            >
              Desistir
            </button>
          </div>
        </div>
      )}

      {/* Banner de Identificação do Usuário */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-md mb-4 sm:mb-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 sm:gap-6 relative z-10">
          <div className="flex flex-col sm:flex-row items-center gap-3.5 sm:gap-4 text-center sm:text-left">
            {currentUser.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.username}
                className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl object-cover ring-3 ring-indigo-500/20 shadow-md shrink-0"
              />
            ) : (
              <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-indigo-600 flex items-center justify-center text-white font-black text-2xl sm:text-3xl shadow-md shrink-0">
                {currentUser.username.charAt(0).toUpperCase()}
              </div>
            )}

            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-0.5">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {currentUser.username}
                </h1>
                {currentUser.provider && currentUser.provider !== 'email' && (
                  <span className="text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 uppercase">
                    via {currentUser.provider}
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                Gerencie seu perfil, baralhos e caras
              </p>

              {/* Opções Sutis de Gerência de Perfil (Ponto 3.a) */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2 mt-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(true)}
                  className="flex items-center gap-1 text-[10px] sm:text-[11px] font-extrabold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl border border-slate-200 shadow-sm transition-all cursor-pointer"
                >
                  <KeyRound size={11} className="text-slate-500" />
                  <span>Trocar Senha</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    auth.logout();
                    onBackToLobby();
                  }}
                  className="flex items-center gap-1 text-[10px] sm:text-[11px] font-extrabold text-slate-600 hover:text-rose-700 bg-slate-100 hover:bg-rose-50 px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl border border-slate-200 hover:border-rose-200 shadow-sm transition-all cursor-pointer"
                >
                  <LogOut size={11} className="text-slate-500" />
                  <span>Sair</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-slate-400 hover:text-rose-600 px-1.5 py-1 transition-colors cursor-pointer"
                  title="Apagar minha conta"
                >
                  <Trash2 size={11} />
                  <span>Apagar</span>
                </button>
              </div>
            </div>
          </div>

          {/* Resumo Rápido das Estatísticas */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full sm:w-auto mt-2 sm:mt-0">
            <div className="bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl p-2 sm:p-3 text-center min-w-0 sm:min-w-[72px]">
              <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold block">Partidas</span>
              <span className="text-base sm:text-lg font-black text-slate-900">{stats?.totalMatches || 0}</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl sm:rounded-2xl p-2 sm:p-3 text-center min-w-0 sm:min-w-[72px]">
              <span className="text-[9px] sm:text-[10px] text-emerald-600 font-bold block">Vitórias</span>
              <span className="text-base sm:text-lg font-black text-emerald-700">{stats?.wins || 0}</span>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-xl sm:rounded-2xl p-2 sm:p-3 text-center min-w-0 sm:min-w-[72px]">
              <span className="text-[9px] sm:text-[10px] text-rose-600 font-bold block">Derrotas</span>
              <span className="text-base sm:text-lg font-black text-rose-700">{stats?.losses || 0}</span>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl sm:rounded-2xl p-2 sm:p-3 text-center min-w-0 sm:min-w-[72px]">
              <span className="text-[9px] sm:text-[10px] text-amber-700 font-bold block">Winrate</span>
              <span className="text-base sm:text-lg font-black text-amber-800">{stats?.winRate || 0}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navegação por Abas Exclusivas */}
      <div className="grid grid-cols-3 sm:inline-flex w-full sm:w-auto bg-slate-200/70 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl mb-4 sm:mb-6 border border-slate-200 text-xs font-bold gap-1 sm:gap-1.5">
        <button
          onClick={() => setActiveTab('decks')}
          className={`px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'decks'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers size={14} className="text-indigo-600 shrink-0" />
          <span className="text-[11px] sm:text-xs truncate">Baralhos</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-extrabold ${
            activeTab === 'decks'
              ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
              : 'bg-slate-300/60 text-slate-700'
          }`}>
            ({savedDecks.length})
          </span>
        </button>

        <button
          onClick={() => setActiveTab('faces')}
          className={`px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'faces'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Smile size={14} className="text-amber-600 shrink-0" />
          <span className="text-[11px] sm:text-xs truncate">Caras</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-extrabold ${
            activeTab === 'faces'
              ? 'bg-amber-50 text-amber-800 border border-amber-200'
              : 'bg-slate-300/60 text-slate-700'
          }`}>
            ({savedFaces.length})
          </span>
        </button>

        <button
          onClick={() => setActiveTab('stats')}
          className={`px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'stats'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Trophy size={14} className="text-sky-600 shrink-0" />
          <span className="text-[11px] sm:text-xs truncate">Histórico</span>
        </button>
      </div>

      {/* Conteúdo da Aba 1: MEUS BARALHOS */}
      {activeTab === 'decks' && (
        <div className="space-y-3 sm:space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">Baralhos Salvos</h2>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Seus baralhos personalizados salvos para jogar, editar ou compartilhar
              </p>
            </div>
            <button
              onClick={onCreateNewDeck}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] sm:text-xs shadow-tactile-sm transition-all active:translate-y-0.5 cursor-pointer"
            >
              <Plus size={15} />
              <span>Criar Novo Baralho</span>
            </button>
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400 font-bold animate-pulse">
              Carregando seus baralhos...
            </div>
          ) : savedDecks.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                <Layers size={28} />
              </div>
              <h3 className="text-base font-black text-slate-800 mb-1">Nenhum baralho salvo ainda</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5 leading-relaxed">
                Você pode criar baralhos personalizados com 30, 60 ou 90 cartas usando fotos de seus amigos, familiares ou celebridades!
              </p>
              <button
                onClick={onCreateNewDeck}
                className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-tactile-sm transition-all"
              >
                Começar Meu Primeiro Baralho
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedDecks.map((deck) => (
                <div
                  key={deck.id}
                  className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-sm hover:shadow-md hover:border-indigo-400 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="font-black text-base text-slate-900 leading-tight">
                          {deck.name}
                        </h3>
                        <span className="inline-block mt-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                          {deck.card_count} Caras
                        </span>
                      </div>

                      <button
                        onClick={() => handleDeleteDeck(deck.id)}
                        title="Excluir baralho"
                        className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Mini-preview das Caras do Baralho (Ampliado no Computador) */}
                    <div className="flex items-center -space-x-2 my-4 overflow-hidden py-1">
                      {deck.cards.slice(0, 6).map((c, i) => (
                        <div
                          key={c.id || i}
                          className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl border-2 border-white shadow-sm overflow-hidden bg-slate-100 shrink-0"
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
                        <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl border-2 border-white shadow-sm bg-slate-200 flex items-center justify-center text-xs font-black text-slate-700 shrink-0">
                          +{deck.cards.length - 6}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ações: Jogar, Editar e Compartilhar */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => onPlayDeck(deck)}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs shadow-tactile-sm transition-all active:translate-y-0.5 cursor-pointer"
                    >
                      <Play size={14} />
                      <span>Jogar com este Baralho</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => onEditDeck(deck)}
                        className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-colors cursor-pointer"
                      >
                        <Edit3 size={13} />
                        <span>Editar</span>
                      </button>

                      <button
                        onClick={() => handleShareDeck(deck)}
                        className={`flex items-center justify-center gap-1 py-2 px-3 rounded-xl font-extrabold text-xs transition-colors cursor-pointer ${
                          copiedDeckId === deck.id
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        {copiedDeckId === deck.id ? (
                          <>
                            <Check size={13} className="text-emerald-600" />
                            <span>Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Share2 size={13} />
                            <span>Compartilhar</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Conteúdo da Aba 2: MINHAS CARAS */}
      {activeTab === 'faces' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">Banco de Caras Salvas</h2>
              <p className="text-xs text-slate-500">
                Cadastre fotos de pessoas para selecionar facilmente ao montar qualquer baralho
              </p>
            </div>
            <button
              onClick={() => setIsAddingFace(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-tactile-sm transition-all active:translate-y-0.5 cursor-pointer"
            >
              <Plus size={16} />
              <span>Adicionar Nova Cara</span>
            </button>
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400 font-bold animate-pulse">
              Carregando suas caras...
            </div>
          ) : savedFaces.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
                <Smile size={28} />
              </div>
              <h3 className="text-base font-black text-slate-800 mb-1">Nenhuma cara salva ainda</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5 leading-relaxed">
                Você pode cadastrar e recortar fotos de amigos, parentes ou personagens aqui. Elas ficarão salvas no seu perfil para você usar na montagem de qualquer baralho!
              </p>
              <button
                onClick={() => setIsAddingFace(true)}
                className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-tactile-sm transition-all cursor-pointer"
              >
                Cadastrar Minha Primeira Cara
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4 md:gap-5">
              {savedFaces.map((face) => (
                <div
                  key={face.id}
                  className="bg-white border-2 border-slate-200 rounded-3xl p-3 shadow-sm hover:border-amber-400 hover:shadow-md transition-all flex flex-col items-center text-center group relative"
                >
                  <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-2xl overflow-hidden mb-2 bg-slate-100 border border-slate-200 shadow-inner">
                    <img
                      src={face.image_url}
                      alt={face.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <span className="font-black text-xs sm:text-sm text-slate-900 truncate w-full px-1 mb-1.5">
                    {face.name}
                  </span>
                  <button
                    onClick={() => handleDeleteFace(face.id)}
                    title="Excluir cara"
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Conteúdo da Aba 3: ESTATÍSTICAS & HISTÓRICO */}
      {activeTab === 'stats' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div>
            <h2 className="text-lg font-black text-slate-900">Histórico de Oponentes</h2>
            <p className="text-xs text-slate-500">
              Registro independente e permanente das suas últimas partidas disputadas
            </p>
          </div>

          <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-wider mb-4">
              <Swords size={16} className="text-indigo-600" />
              <span>Últimas Partidas Disputadas</span>
            </div>

            {stats?.lastMatches.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400 italic">
                Nenhuma partida registrada ainda. Jogue uma rodada para ver seu histórico gravado aqui!
              </div>
            ) : (
              <div className="space-y-2.5">
                {stats?.lastMatches.map((m, idx) => (
                  <div
                    key={m.id || idx}
                    className="p-3 rounded-2xl border flex items-center justify-between text-xs transition-colors bg-slate-50 border-slate-200 hover:bg-slate-100/80"
                  >
                    <div>
                      <div className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                        <span className="text-slate-400 font-medium">vs</span>
                        <span>{m.opponent_name}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                        {m.deck_mode === 'custom'
                          ? `Modo Personalizado (${m.card_count} Caras)`
                          : 'Modo Padrão (15 Caras)'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span
                        className={`font-black text-xs px-3 py-1 rounded-xl uppercase tracking-wider shadow-sm border ${
                          m.result === 'win'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}
                      >
                        {m.result === 'win' ? 'Vitória' : 'Derrota'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Recorte para Adicionar Cara no Perfil */}
      {isAddingFace && (
        <ImageCropperModal
          roomCode="profile"
          onSaveCharacter={handleSaveCroppedFace}
          onClose={() => setIsAddingFace(false)}
        />
      )}

      {/* Modal de Troca de Senha (Ponto 3.a) */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-tactile-sm">
              <KeyRound size={24} />
            </div>

            <h3 className="text-lg font-black text-slate-900 text-center mb-1">
              Alterar Senha
            </h3>
            <p className="text-xs text-slate-500 text-center mb-5">
              Digite e confirme sua nova senha de acesso:
            </p>

            {passwordError && (
              <div className="mb-4 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-bold text-center">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="mb-4 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold text-center">
                ✅ Senha alterada com sucesso!
              </div>
            )}

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase mb-1">
                  Nova Senha (mínimo 6 dígitos):
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border-2 border-slate-200 text-slate-900 text-sm font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase mb-1">
                  Confirmar Nova Senha:
                </label>
                <input
                  type="password"
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border-2 border-slate-200 text-slate-900 text-sm font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setPasswordModalOpen(false)}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleUpdatePassword}
                disabled={isSavingPassword || passwordSuccess}
                className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-tactile-sm transition-all cursor-pointer"
              >
                {isSavingPassword ? 'Salvando...' : 'Salvar Senha'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Apagar Conta (Ponto 3.a) */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-rose-300 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center animate-in zoom-in-95">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-tactile-sm">
              <AlertTriangle size={28} />
            </div>

            <h3 className="text-lg font-black text-slate-900 mb-1">
              Apagar Sua Conta?
            </h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Esta ação é <strong>irreversível</strong>. Todos os seus baralhos personalizados, caras salvas e estatísticas de vitórias e derrotas serão excluídos permanentemente.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider shadow-tactile-sm transition-all cursor-pointer"
              >
                {isDeletingAccount ? 'Apagando...' : 'Sim, Apagar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
