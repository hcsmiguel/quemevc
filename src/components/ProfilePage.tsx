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
  Trash2,
  Share2,
  Edit3,
  Play,
  Plus,
  ArrowLeft,
  Check,
  RotateCcw,
  Globe,
  Shield,
} from 'lucide-react';
import { sounds } from '../utils/sound';
import { network } from '../services/network';
import { ImageCropperModal } from './ImageCropperModal';
import { AccountLimitModal } from './AccountLimitModal';
import { Button } from './ui/Button';
import { Tabs } from './ui/Tabs';
import { Input } from './ui/Input';

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

  // Reconectar à Partida em Andamento
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

        const expiresAt = session.expiresAt || (session.disconnectedAt ? session.disconnectedAt + 180000 : Date.now() + 180000);
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

  // Modal de aviso de limites da conta
  const [limitModalType, setLimitModalType] = useState<'deck' | 'face' | null>(null);

  // Modal de Trocar Senha
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Modal de Confirmação para Apagar Conta
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Feedback de Cópia de Link de Baralho
  const [copiedDeckId, setCopiedDeckId] = useState<string | null>(null);

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      setPasswordError('A nova senha precisa ter pelo menos 6 caracteres.');
      sounds.playWrong();
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setPasswordError('As senhas digitadas não coincidem.');
      sounds.playWrong();
      return;
    }

    setIsSavingPassword(true);
    setPasswordError(null);
    try {
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
      setPasswordError(err?.message || 'Falha de conexão ao trocar senha.');
      sounds.playWrong();
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    sounds.playClick();
    try {
      await auth.deleteAccount(currentUser.id);
      sounds.playWrong();
      auth.logout();
      onBackToLobby();
    } catch (err: any) {
      alert(err?.message || 'Não foi possível apagar a conta neste momento.');
    } finally {
      setIsDeletingAccount(false);
      setDeleteConfirmOpen(false);
    }
  };

  const handleToggleDeckPublic = async (deck: SavedDeck) => {
    sounds.playClick();
    const nextState = !deck.is_public;
    try {
      await auth.toggleDeckPublic(deck.id, currentUser.id, nextState);
      setSavedDecks((prev) =>
        prev.map((d) => (d.id === deck.id ? { ...d, is_public: nextState } : d))
      );
    } catch {
      sounds.playWrong();
    }
  };

  const handleToggleFacePublic = async (face: SavedFace) => {
    sounds.playClick();
    const nextState = !face.is_public;
    try {
      await auth.toggleFacePublic(face.id, currentUser.id, nextState);
      setSavedFaces((prev) =>
        prev.map((f) => (f.id === face.id ? { ...f, is_public: nextState } : f))
      );
    } catch {
      sounds.playWrong();
    }
  };

  const handleCreateDeckClick = () => {
    sounds.playClick();
    if (savedDecks.length >= 10) {
      sounds.playWrong();
      setLimitModalType('deck');
      return;
    }
    onCreateNewDeck();
  };

  const handleAddFaceClick = () => {
    sounds.playClick();
    if (savedFaces.length >= 100) {
      sounds.playWrong();
      setLimitModalType('face');
      return;
    }
    setIsAddingFace(true);
  };

  useEffect(() => {
    loadUserData();
  }, [currentUser]);

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
    <div className="max-w-4xl mx-auto w-full py-6 sm:py-10 px-4 text-left animate-in fade-in duration-150">
      {/* Botão de Retorno */}
      <div className="mb-6">
        <button
          onClick={onBackToLobby}
          className="inline-flex items-center gap-1.5 text-xs text-[#6F655C] hover:text-[#2B2420] transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Voltar ao menu principal</span>
        </button>
      </div>

      {/* Banner de Reconexão para Partida em Andamento */}
      {reconnectSession && reconnectSecondsLeft > 0 && (
        <div className="bg-[#2B2420] text-white rounded-[8px] p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-[#2B2420]">
          <div className="flex items-center gap-3">
            <RotateCcw size={16} className="text-[#B4532F] animate-spin-slow shrink-0" />
            <div className="text-xs">
              <span className="font-semibold block text-white">
                Partida em andamento na Sala #{reconnectSession.roomCode}
              </span>
              <span className="text-[#A39A90]">
                Contra {reconnectSession.opponentName || 'Oponente'}. Tempo restante: {reconnectSecondsLeft}s
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                sounds.playClick();
                if (onReconnectMatch) onReconnectMatch(reconnectSession);
              }}
            >
              Reconectar
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="text-white border-white/40 hover:bg-white/10"
              onClick={handleDismissReconnect}
            >
              Desistir
            </Button>
          </div>
        </div>
      )}

      {/* Cabeçalho do Perfil: Direto na Mesa de Jogo (Sem cartões empilhados) */}
      <div className="border-b border-[#E2DACD] pb-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {currentUser.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.username}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-[8px] object-cover border border-[#E2DACD] shadow-2xs shrink-0"
              />
            ) : (
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[8px] bg-[#E2DACD]/50 border border-[#E2DACD] text-[#2B2420] font-serif font-bold text-2xl flex items-center justify-center shrink-0">
                {currentUser.username.charAt(0).toUpperCase()}
              </div>
            )}

            <div>
              <div className="flex items-baseline gap-2 flex-wrap">
                <h1 className="font-serif text-2xl sm:text-3xl font-normal text-[#2B2420] leading-tight">
                  {currentUser.username}
                </h1>
                {currentUser.is_admin && (
                  <span className="text-[11px] font-bold text-[#B4532F] bg-[#FDF5F2] border border-[#F3D7CD] px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Shield size={11} />
                    Administrador
                  </span>
                )}
                {currentUser.provider && currentUser.provider !== 'email' && (
                  <span className="text-xs text-[#6F655C] font-sans">
                    via {currentUser.provider}
                  </span>
                )}
              </div>

              {/* Estatísticas em UMA ÚNICA LINHA com números em Fraunces (Requisito 2 / Screen 6) */}
              <div className="text-xs sm:text-sm text-[#6F655C] font-sans mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span>
                  <strong className="font-serif text-base sm:text-lg font-normal text-[#2B2420]">{stats?.totalMatches || 0}</strong> partidas
                </span>
                <span>·</span>
                <span>
                  <strong className="font-serif text-base sm:text-lg font-normal text-[#2E7D32]">{stats?.wins || 0}</strong> vitórias
                </span>
                <span>·</span>
                <span>
                  <strong className="font-serif text-base sm:text-lg font-normal text-[#8C2E2A]">{stats?.losses || 0}</strong> derrotas
                </span>
                <span>·</span>
                <span>
                  <strong className="font-serif text-base sm:text-lg font-normal text-[#B4532F]">{stats?.winRate || 0}%</strong> de aproveitamento
                </span>
              </div>
            </div>
          </div>

          {/* Ações em links de texto discretos */}
          <div className="flex items-center gap-3 text-xs pt-1 sm:pt-0">
            {currentUser.is_admin && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    window.history.pushState(null, '', '/painel-admin');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-[#B4532F] hover:bg-[#9C4323] text-white font-bold transition-colors cursor-pointer shadow-2xs"
                >
                  <Shield size={12} />
                  <span>Painel Admin</span>
                </button>
                <span className="text-[#E2DACD]">·</span>
              </>
            )}
            <button
              type="button"
              onClick={() => setPasswordModalOpen(true)}
              className="text-[#6F655C] hover:text-[#2B2420] underline transition-colors cursor-pointer"
            >
              Trocar senha
            </button>
            <span className="text-[#E2DACD]">·</span>
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                auth.logout();
                onBackToLobby();
              }}
              className="text-[#6F655C] hover:text-[#2B2420] underline transition-colors cursor-pointer"
            >
              Sair
            </button>
            <span className="text-[#E2DACD]">·</span>
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(true)}
              className="text-[#A39A90] hover:text-[#8C2E2A] underline transition-colors cursor-pointer"
            >
              Apagar conta
            </button>
          </div>
        </div>
      </div>

      {/* Navegação por Abas em Texto com Sublinhado Ativo (Sem corte mobile "Baral...") */}
      <div className="mb-6">
        <Tabs
          tabs={[
            { id: 'decks', label: 'Baralhos', count: savedDecks.length },
            { id: 'faces', label: 'Caras', count: savedFaces.length },
            { id: 'stats', label: 'Histórico' },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* Aba 1: BARALHOS SALVOS */}
      {activeTab === 'decks' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs text-[#6F655C]">
              {savedDecks.length} {savedDecks.length === 1 ? 'baralho salvo' : 'baralhos salvos'} (limite de 10)
            </span>
            <Button
              size="sm"
              variant="primary"
              onClick={handleCreateDeckClick}
            >
              <Plus size={13} className="mr-1" />
              <span>Criar baralho</span>
            </Button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-[#6F655C]">
              Carregando seus baralhos...
            </div>
          ) : savedDecks.length === 0 ? (
            <div className="py-12 text-center border border-[#E2DACD] rounded-[8px] bg-[#FBF8F3] p-6">
              <h3 className="font-serif text-lg text-[#2B2420] mb-1">Nenhum baralho salvo ainda</h3>
              <p className="text-xs text-[#6F655C] max-w-sm mx-auto mb-4">
                Monte baralhos com 15, 30, 60 ou 90 cartas usando fotos de quem você quiser.
              </p>
              <Button size="sm" onClick={handleCreateDeckClick}>
                Começar primeiro baralho
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {savedDecks.map((deck) => (
                <div
                  key={deck.id}
                  className="p-4 rounded-[8px] border border-[#E2DACD] bg-[#FBF8F3] hover:border-[#2B2420] transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <h3 className="font-serif text-lg text-[#2B2420] font-normal truncate">
                          {deck.name}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-[#6F655C] mt-0.5">
                          <span>{deck.card_count} cartas</span>
                          <span>·</span>
                          <button
                            type="button"
                            onClick={() => handleToggleDeckPublic(deck)}
                            className="inline-flex items-center gap-1 text-[#6F655C] hover:text-[#2B2420] underline cursor-pointer"
                          >
                            <Globe size={11} />
                            <span>{deck.is_public ? 'Público na comunidade' : 'Privado'}</span>
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteDeck(deck.id)}
                        title="Excluir baralho"
                        className="p-1 text-[#A39A90] hover:text-[#8C2E2A] cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Faixa de Fotos das Cartas */}
                    <div className="flex items-center -space-x-1.5 my-3 overflow-hidden py-0.5">
                      {deck.cards.slice(0, 6).map((c, i) => (
                        <div
                          key={c.id || i}
                          className="w-9 h-9 rounded-[4px] border border-white overflow-hidden bg-white shrink-0 shadow-2xs"
                        >
                          {c.imageUrl ? (
                            <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-serif text-[#2B2420] bg-[#E2DACD]/40">
                              {c.name.charAt(0)}
                            </div>
                          )}
                        </div>
                      ))}
                      {deck.cards.length > 6 && (
                        <div className="w-9 h-9 rounded-[4px] border border-white bg-[#E2DACD]/50 text-[#2B2420] flex items-center justify-center text-xs font-mono font-medium shrink-0">
                          +{deck.cards.length - 6}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ações Editoriais */}
                  <div className="pt-3 border-t border-[#E2DACD]/70 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => onPlayDeck(deck)}
                      className="font-medium text-[#B4532F] hover:text-[#984323] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Play size={12} className="fill-[#B4532F]" />
                      <span>Jogar</span>
                    </button>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => onEditDeck(deck)}
                        className="text-[#6F655C] hover:text-[#2B2420] underline cursor-pointer flex items-center gap-1"
                      >
                        <Edit3 size={12} />
                        <span>Editar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleShareDeck(deck)}
                        className="text-[#6F655C] hover:text-[#2B2420] underline cursor-pointer flex items-center gap-1"
                      >
                        {copiedDeckId === deck.id ? <Check size={12} className="text-[#2E7D32]" /> : <Share2 size={12} />}
                        <span>{copiedDeckId === deck.id ? 'Copiado!' : 'Compartilhar'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Aba 2: BANCO DE CARAS */}
      {activeTab === 'faces' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs text-[#6F655C]">
              {savedFaces.length} {savedFaces.length === 1 ? 'cara salva' : 'caras salvas'} (limite de 100)
            </span>
            <Button
              size="sm"
              variant="primary"
              onClick={handleAddFaceClick}
            >
              <Plus size={13} className="mr-1" />
              <span>Adicionar cara</span>
            </Button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-[#6F655C]">
              Carregando suas caras...
            </div>
          ) : savedFaces.length === 0 ? (
            <div className="py-12 text-center border border-[#E2DACD] rounded-[8px] bg-[#FBF8F3] p-6">
              <h3 className="font-serif text-lg text-[#2B2420] mb-1">Nenhuma cara salva ainda</h3>
              <p className="text-xs text-[#6F655C] max-w-sm mx-auto mb-4">
                Cadastre e recorte fotos de pessoas ou personagens para reutilizar ao montar baralhos.
              </p>
              <Button size="sm" onClick={handleAddFaceClick}>
                Cadastrar primeira cara
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {savedFaces.map((face) => (
                <div
                  key={face.id}
                  className="p-2.5 rounded-[8px] border border-[#E2DACD] bg-[#FBF8F3] hover:border-[#2B2420] transition-colors flex flex-col items-center text-center group select-none"
                >
                  <div className="w-full aspect-square rounded-[6px] overflow-hidden bg-white border border-[#E2DACD]/80 mb-2">
                    <img
                      src={face.image_url}
                      alt={face.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <span className="font-sans font-medium text-xs text-[#2B2420] truncate w-full px-1 mb-1.5">
                    {face.name}
                  </span>

                  <div className="flex items-center justify-between w-full pt-1.5 border-t border-[#E2DACD]/60 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleToggleFacePublic(face)}
                      className="text-[#6F655C] hover:text-[#2B2420] underline text-[10px] cursor-pointer"
                    >
                      {face.is_public ? 'Público' : 'Privado'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteFace(face.id)}
                      title="Excluir"
                      className="text-[#A39A90] hover:text-[#8C2E2A] cursor-pointer p-0.5"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Aba 3: HISTÓRICO */}
      {activeTab === 'stats' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <span className="text-xs text-[#6F655C] block pb-2">
            Registro das últimas partidas disputadas
          </span>

          {!stats || stats.lastMatches.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#6F655C] italic border border-[#E2DACD] rounded-[8px] bg-[#FBF8F3]">
              Nenhuma partida registrada ainda. Jogue uma rodada para ver seu histórico aqui.
            </div>
          ) : (
            <div className="divide-y divide-[#E2DACD] border border-[#E2DACD] rounded-[8px] bg-[#FBF8F3]">
              {stats.lastMatches.map((m, idx) => (
                <div
                  key={m.id || idx}
                  className="p-3.5 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-medium text-sm text-[#2B2420]">
                      vs {m.opponent_name}
                    </span>
                    <span className="text-[#6F655C] block text-[11px] mt-0.5">
                      {m.deck_mode === 'custom'
                        ? `Baralho personalizado (${m.card_count} cartas)`
                        : 'Modo clássico (15 cartas)'}
                    </span>
                  </div>

                  <span
                    className={`font-sans font-semibold text-xs px-2.5 py-0.5 rounded-[4px] uppercase tracking-wider ${
                      m.result === 'win'
                        ? 'bg-[#E8F5E9] text-[#2E7D32]'
                        : 'bg-[#F8EBEA] text-[#8C2E2A]'
                    }`}
                  >
                    {m.result === 'win' ? 'Vitória' : 'Derrota'}
                  </span>
                </div>
              ))}
            </div>
          )}
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

      {/* Modal de Troca de Senha */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#2B2420]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FBF8F3] border border-[#E2DACD] rounded-[10px] max-w-sm w-full p-6 shadow-xl animate-in zoom-in-95 text-left">
            <h3 className="font-serif text-xl font-normal text-[#2B2420] mb-1">
              Alterar senha
            </h3>
            <p className="text-xs text-[#6F655C] mb-4">
              Digite e confirme sua nova senha de acesso:
            </p>

            {passwordError && (
              <div className="mb-3 p-2 rounded-[4px] bg-[#F8EBEA] border border-[#ECC7C5] text-xs text-[#8C2E2A]">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="mb-3 p-2 rounded-[4px] bg-[#E8F5E9] border border-[#A5D6A7] text-xs text-[#2E7D32]">
                Senha alterada com sucesso!
              </div>
            )}

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-medium text-[#6F655C] mb-1">
                  Nova Senha (mínimo 6 dígitos)
                </label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#6F655C] mb-1">
                  Confirmar Nova Senha
                </label>
                <Input
                  type="password"
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="md"
                className="flex-1"
                onClick={() => setPasswordModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="md"
                className="flex-1"
                disabled={isSavingPassword || passwordSuccess}
                onClick={handleUpdatePassword}
              >
                {isSavingPassword ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Apagar Conta */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-[#2B2420]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FBF8F3] border border-[#E2DACD] rounded-[10px] max-w-sm w-full p-6 shadow-xl text-left animate-in zoom-in-95">
            <h3 className="font-serif text-xl font-normal text-[#8C2E2A] mb-1">
              Apagar sua conta?
            </h3>
            <p className="text-xs text-[#6F655C] mb-6 leading-relaxed">
              Esta ação é permanente e não pode ser desfeita. Todos os seus baralhos, caras salvas e estatísticas serão apagados.
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="md"
                className="flex-1"
                onClick={() => setDeleteConfirmOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                size="md"
                className="flex-1"
                disabled={isDeletingAccount}
                onClick={handleDeleteAccount}
              >
                {isDeletingAccount ? 'Apagando...' : 'Sim, apagar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Limites da Conta */}
      <AccountLimitModal
        isOpen={limitModalType !== null}
        type={limitModalType || 'deck'}
        onClose={() => setLimitModalType(null)}
      />
    </div>
  );
};
