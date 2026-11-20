import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/admin';
import { auth, type SavedDeck, type SavedFace } from '../../services/auth';
import type { Character } from '../../types/game';
import { Button } from '../ui/Button';
import { ImageCropperModal } from '../ImageCropperModal';
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  Check,
  AlertCircle,
  Search,
  ArrowLeft,
  Camera,
} from 'lucide-react';
import { sounds } from '../../utils/sound';

export const AdminOfficialDecks: React.FC = () => {
  const [decks, setDecks] = useState<SavedDeck[]>([]);
  const [loading, setLoading] = useState(true);

  // Modo de edição / criação
  const [isEditing, setIsEditing] = useState(false);
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
  const [deckName, setDeckName] = useState('');
  const [deckDescription, setDeckDescription] = useState('');
  const [cards, setCards] = useState<Character[]>([]);
  const [_isDraft, setIsDraft] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Auxiliares de cartas
  const [communityFaces, setCommunityFaces] = useState<SavedFace[]>([]);
  const [isFacePickerOpen, setIsFacePickerOpen] = useState(false);
  const [faceSearch, setFaceSearch] = useState('');
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingCardName, setEditingCardName] = useState('');
  const [replacingCardId, setReplacingCardId] = useState<string | null>(null);

  const loadOfficialDecks = async () => {
    setLoading(true);
    const data = await adminService.getOfficialDecks();
    setDecks(data);
    setLoading(false);
  };

  useEffect(() => {
    loadOfficialDecks();
    auth.getPublicFaces().then(setCommunityFaces);
  }, []);

  const handleStartNewDeck = () => {
    sounds.playClick();
    setEditingDeckId(null);
    setDeckName('');
    setDeckDescription('');
    setCards([]);
    setIsDraft(true);
    setValidationError(null);
    setIsEditing(true);
  };

  const handleStartEditDeck = (deck: SavedDeck) => {
    sounds.playClick();
    setEditingDeckId(deck.id);
    setDeckName(deck.name);
    setDeckDescription((deck as any).description || '');
    setCards([...deck.cards]);
    setIsDraft(Boolean((deck as any).is_draft));
    setValidationError(null);
    setIsEditing(true);
  };

  const handleDeleteDeck = async (deck: SavedDeck) => {
    if (!window.confirm(`Tem certeza que deseja excluir o baralho oficial "${deck.name}"?`)) {
      return;
    }
    sounds.playClick();
    await adminService.deleteOfficialDeck(deck.id, deck.name);
    loadOfficialDecks();
  };

  // Gerenciamento de cartas no editor
  const handleToggleFace = (face: SavedFace) => {
    if (replacingCardId) {
      sounds.playClick();
      setCards((prev) =>
        prev.map((c) =>
          c.id === replacingCardId
            ? { ...c, name: face.name.slice(0, 20), imageUrl: face.image_url }
            : c
        )
      );
      setReplacingCardId(null);
      setIsFacePickerOpen(false);
      return;
    }

    const isAdded = cards.some(
      (c) =>
        c.name.trim().toLowerCase() === face.name.trim().toLowerCase() ||
        (c.imageUrl && c.imageUrl === face.image_url)
    );

    if (isAdded) {
      sounds.playClick();
      setCards((prev) =>
        prev.filter(
          (c) =>
            c.name.trim().toLowerCase() !== face.name.trim().toLowerCase() &&
            (!c.imageUrl || c.imageUrl !== face.image_url)
        )
      );
      return;
    }

    sounds.playClick();
    const newChar: Character = {
      id: 'official_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: face.name.slice(0, 20),
      imageUrl: face.image_url,
    };
    setCards((prev) => [...prev, newChar]);
  };

  const handleSaveCroppedCharacter = (newChar: Character) => {
    const sanitized: Character = {
      ...newChar,
      name: newChar.name.slice(0, 20),
    };
    if (replacingCardId) {
      setCards((prev) =>
        prev.map((c) =>
          c.id === replacingCardId
            ? { ...c, imageUrl: sanitized.imageUrl, name: sanitized.name || c.name }
            : c
        )
      );
      setReplacingCardId(null);
    } else {
      setCards((prev) => [...prev, sanitized]);
    }
    setIsCropperOpen(false);
  };

  const handleRemoveCard = (id: string) => {
    sounds.playClick();
    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  // Validação para salvar
  const validateDeck = (targetDraft: boolean): string | null => {
    if (!deckName.trim()) {
      return 'Informe o nome do baralho oficial.';
    }
    if (deckName.length > 35) {
      return 'O nome do baralho pode ter no máximo 35 caracteres.';
    }

    // Se for rascunho, permite salvar mesmo com poucas cartas
    if (targetDraft) {
      return null;
    }

    // Validações rigorosas para publicação
    if (cards.length < 15) {
      return `O baralho precisa de no mínimo 15 cartas completas para ser publicado (atualmente possui ${cards.length}). Ele suporta 15, 30, 60 ou 90 cartas.`;
    }

    // Verificar se todas as cartas têm nome e imagem
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      if (!c.name || !c.name.trim()) {
        return `A carta #${i + 1} não possui um nome válido.`;
      }
      if (!c.imageUrl) {
        return `A carta "${c.name}" não possui imagem.`;
      }
    }

    // Verificar duplicidade de nomes
    const seenNames = new Set<string>();
    for (const c of cards) {
      const lower = c.name.trim().toLowerCase();
      if (seenNames.has(lower)) {
        return `Há cartas duplicadas com o nome "${c.name}". Cada carta deve ter um nome único.`;
      }
      seenNames.add(lower);
    }

    return null;
  };

  const handleSaveDeck = async (asDraft: boolean) => {
    setValidationError(null);
    const errorMsg = validateDeck(asDraft);
    if (errorMsg) {
      sounds.playWrong();
      setValidationError(errorMsg);
      return;
    }

    sounds.playClick();
    setIsSaving(true);

    const saved = await adminService.saveOfficialDeck({
      id: editingDeckId || undefined,
      name: deckName.trim(),
      description: deckDescription.trim(),
      card_count: cards.length,
      cards,
      is_draft: asDraft,
      is_public: !asDraft,
    });

    setIsSaving(false);

    if (saved) {
      sounds.playWin();
      setIsEditing(false);
      loadOfficialDecks();
    } else {
      sounds.playWrong();
      setValidationError('Ocorreu um erro ao salvar o baralho oficial no Supabase.');
    }
  };

  const getSupportedSizesText = (count: number) => {
    const supported: number[] = [];
    if (count >= 15) supported.push(15);
    if (count >= 30) supported.push(30);
    if (count >= 60) supported.push(60);
    if (count >= 90) supported.push(90);

    if (supported.length === 0) {
      return 'Nenhum tamanho suportado ainda (mínimo de 15 cartas)';
    }
    return `Suporta partidas de ${supported.join(', ')} cartas`;
  };

  // ==========================================
  // RENDER: EDITOR DE BARALHO OFICIAL
  // ==========================================
  if (isEditing) {
    return (
      <div className="space-y-6 animate-in fade-in duration-150">
        {/* Cabeçalho do Editor */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E2DACD]">
          <button
            onClick={() => setIsEditing(false)}
            className="flex items-center gap-1.5 text-xs text-[#6F655C] hover:text-[#2B2420] cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Voltar aos Baralhos Oficiais</span>
          </button>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              disabled={isSaving}
              onClick={() => handleSaveDeck(true)}
            >
              Salvar como Rascunho
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={isSaving}
              onClick={() => handleSaveDeck(false)}
            >
              {isSaving ? 'Salvando...' : 'Publicar Baralho Oficial'}
            </Button>
          </div>
        </div>

        {/* Mensagem de Erro de Validação */}
        {validationError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-rose-600" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Campos Básicos */}
        <div className="bg-white border border-[#E2DACD] rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#6F655C] uppercase tracking-wider mb-1.5">
              Nome do Baralho Oficial (máximo 35 caracteres)
            </label>
            <input
              type="text"
              maxLength={35}
              value={deckName}
              onChange={(e) => setDeckName(e.target.value.slice(0, 35))}
              placeholder="Ex: Turma do Tabuleiro, Históricos, Memes Brasileiros..."
              className="w-full text-lg font-serif text-[#2B2420] border border-[#E2DACD] rounded-xl px-4 py-2.5 focus:border-[#B4532F] outline-none"
            />
            <span className="text-[11px] font-mono text-[#A39A90] mt-1 block">
              {deckName.length}/35 caracteres
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#6F655C] uppercase tracking-wider mb-1.5">
              Descrição Curta (para a home e comunidade)
            </label>
            <textarea
              maxLength={160}
              rows={2}
              value={deckDescription}
              onChange={(e) => setDeckDescription(e.target.value.slice(0, 160))}
              placeholder="Breve resumo para os jogadores entenderem a proposta do baralho..."
              className="w-full text-xs font-sans text-[#2B2420] border border-[#E2DACD] rounded-xl p-3 focus:border-[#B4532F] outline-none resize-none"
            />
            <span className="text-[11px] font-mono text-[#A39A90] mt-0.5 block">
              {deckDescription.length}/160 caracteres
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#FBF8F3] border border-[#E2DACD] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <span className="font-bold text-[#2B2420]">
                Total de Cartas: {cards.length}
              </span>
              <span className="text-[#6F655C] block sm:inline sm:ml-2">
                · {getSupportedSizesText(cards.length)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-[#6F655C]">Autor:</span>
              <span className="text-xs font-bold text-[#B4532F]">Tá na Cara!</span>
            </div>
          </div>
        </div>

        {/* Barra de Ações Rápidas de Cartas */}
        <div className="flex items-center justify-between gap-3 pb-2">
          <h3 className="font-serif text-base text-[#2B2420]">
            Cartas do Baralho ({cards.length})
          </h3>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                sounds.playClick();
                setIsFacePickerOpen(true);
              }}
            >
              <Search size={14} />
              <span>Adicionar da Comunidade</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                sounds.playClick();
                setReplacingCardId(null);
                setIsCropperOpen(true);
              }}
            >
              <Plus size={14} />
              <span>Subir Foto Nova</span>
            </Button>
          </div>
        </div>

        {/* Grid de Cartas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {cards.map((char, idx) => (
            <div
              key={char.id || idx}
              className="p-2 rounded-xl border border-[#E2DACD] bg-white flex flex-col items-center text-center relative group min-h-[150px] justify-between shadow-2xs"
            >
              <div className="w-full aspect-square rounded-lg overflow-hidden bg-[#F6F2EA] mb-1.5 relative border border-[#E2DACD]/60">
                <img
                  src={char.imageUrl}
                  alt={char.name}
                  className="w-full h-full object-cover"
                />

                {/* Trocar foto */}
                <button
                  type="button"
                  onClick={() => {
                    setReplacingCardId(char.id);
                    setIsCropperOpen(true);
                  }}
                  title="Substituir foto"
                  className="absolute top-1 left-1 p-1 bg-white/90 hover:bg-white rounded text-[#6F655C] hover:text-[#2B2420] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                >
                  <Camera size={11} />
                </button>

                {/* Remover */}
                <button
                  type="button"
                  onClick={() => handleRemoveCard(char.id)}
                  title="Remover carta"
                  className="absolute top-1 right-1 p-1 bg-white/90 hover:bg-rose-50 rounded text-[#6F655C] hover:text-rose-700 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                >
                  <Trash2 size={11} />
                </button>
              </div>

              {/* Nome da carta (max 20 caracteres) */}
              {editingCardId === char.id ? (
                <div className="w-full p-1 bg-white rounded border border-[#2B2420]">
                  <input
                    type="text"
                    maxLength={20}
                    value={editingCardName}
                    onChange={(e) => setEditingCardName(e.target.value.slice(0, 20))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setCards((prev) =>
                          prev.map((c) =>
                            c.id === char.id ? { ...c, name: editingCardName.trim().slice(0, 20) || c.name } : c
                          )
                        );
                        setEditingCardId(null);
                      }
                    }}
                    autoFocus
                    className="w-full text-xs font-sans border-0 outline-none p-0 text-[#2B2420]"
                  />
                  <button
                    onClick={() => {
                      setCards((prev) =>
                        prev.map((c) =>
                          c.id === char.id ? { ...c, name: editingCardName.trim().slice(0, 20) || c.name } : c
                        )
                      );
                      setEditingCardId(null);
                    }}
                    className="text-[10px] font-bold text-[#B4532F] mt-1 block w-full text-right"
                  >
                    OK
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCardId(char.id);
                    setEditingCardName(char.name);
                  }}
                  title="Clique para editar o nome"
                  className="w-full text-xs font-sans font-bold text-[#2B2420] truncate hover:text-[#B4532F] text-center"
                >
                  {char.name}
                </button>
              )}
            </div>
          ))}

          {/* Adicionar Carta */}
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setIsFacePickerOpen(true);
            }}
            className="p-3 rounded-xl border border-dashed border-[#E2DACD] hover:border-[#2B2420] bg-[#FBF8F3] hover:bg-white transition-colors flex flex-col items-center justify-center text-center min-h-[150px] cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-white border border-[#E2DACD] flex items-center justify-center text-[#B4532F] mb-1.5 group-hover:scale-105 transition-transform">
              <Plus size={16} />
            </div>
            <span className="text-xs font-sans font-medium text-[#2B2420]">
              Adicionar carta
            </span>
          </button>
        </div>

        {/* Modal de Busca de Caras da Comunidade */}
        {isFacePickerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2B2420]/40 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-[#FBF8F3] border border-[#E2DACD] rounded-2xl max-w-2xl w-full p-5 max-h-[85vh] flex flex-col shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2DACD]">
                <h4 className="font-serif text-base text-[#2B2420]">
                  Escolher Caras da Comunidade
                </h4>
                <button
                  onClick={() => {
                    setIsFacePickerOpen(false);
                    setReplacingCardId(null);
                  }}
                  className="text-xs text-[#6F655C] hover:text-[#2B2420]"
                >
                  Fechar
                </button>
              </div>

              <div className="my-3">
                <input
                  type="text"
                  placeholder="Buscar personagem por nome..."
                  value={faceSearch}
                  onChange={(e) => setFaceSearch(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-[#E2DACD] bg-white outline-none focus:border-[#B4532F]"
                />
              </div>

              <div className="flex-1 overflow-y-auto grid grid-cols-3 sm:grid-cols-5 gap-2.5 p-1">
                {communityFaces
                  .filter((f) => f.name.toLowerCase().includes(faceSearch.toLowerCase().trim()))
                  .map((face) => {
                    const isAdded = cards.some((c) => c.imageUrl === face.image_url);
                    return (
                      <div
                        key={face.id}
                        onClick={() => handleToggleFace(face)}
                        className={`p-1.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center ${
                          isAdded
                            ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200'
                            : 'bg-white border-[#E2DACD] hover:border-[#2B2420]'
                        }`}
                      >
                        <div className="w-full aspect-square rounded-lg overflow-hidden bg-white mb-1 relative border border-[#E2DACD]/60">
                          <img src={face.image_url} alt={face.name} className="w-full h-full object-cover" />
                          {isAdded && (
                            <div className="absolute inset-0 bg-emerald-600/20 flex items-center justify-center">
                              <Check size={16} className="text-emerald-700" />
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] font-sans font-bold text-[#2B2420] truncate w-full">
                          {face.name}
                        </span>
                      </div>
                    );
                  })}
              </div>

              <div className="pt-3 border-t border-[#E2DACD] mt-3 text-right">
                <Button size="sm" onClick={() => setIsFacePickerOpen(false)}>
                  Concluir ({cards.length} cartas no baralho)
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Recorte de Imagem */}
        {isCropperOpen && (
          <ImageCropperModal
            roomCode="admin"
            onSaveCharacter={handleSaveCroppedCharacter}
            onClose={() => {
              setIsCropperOpen(false);
              setReplacingCardId(null);
            }}
          />
        )}
      </div>
    );
  }

  // ==========================================
  // RENDER: LISTAGEM DE BARALHOS OFICIAIS
  // ==========================================
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Topo com Título e Ação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2DACD]">
        <div>
          <h2 className="font-serif text-2xl text-[#2B2420]">
            Baralhos Oficiais do Jogo
          </h2>
          <p className="text-xs text-[#6F655C] mt-0.5">
            Coleções oficiais mantidas pelo Tá na Cara!, com autor padronizado e controle de rascunhos.
          </p>
        </div>

        <Button size="sm" variant="primary" onClick={handleStartNewDeck}>
          <Plus size={14} />
          <span>Criar Baralho Oficial</span>
        </Button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-[#6F655C]">
          Carregando baralhos oficiais...
        </div>
      ) : decks.length === 0 ? (
        <div className="bg-white border border-[#E2DACD] rounded-2xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#F6F2EA] text-[#B4532F] flex items-center justify-center mx-auto">
            <Layers size={22} />
          </div>
          <h3 className="font-serif text-base text-[#2B2420]">
            Nenhum baralho oficial cadastrado ainda
          </h3>
          <p className="text-xs text-[#6F655C] max-w-sm mx-auto">
            Crie seu primeiro baralho oficial com 15 a 90 cartas para disponibilizar aos jogadores.
          </p>
          <Button size="sm" variant="primary" onClick={handleStartNewDeck}>
            <Plus size={14} />
            <span>Criar Baralho Oficial Agora</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map((deck) => {
            const isDraftDeck = Boolean((deck as any).is_draft);
            const isFeatured = Boolean((deck as any).is_featured);

            return (
              <div
                key={deck.id}
                className="bg-white border border-[#E2DACD] rounded-2xl p-5 hover:border-[#2B2420]/40 transition-all flex flex-col justify-between shadow-xs group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                        isDraftDeck
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      {isDraftDeck ? 'Rascunho' : 'Publicado'}
                    </span>

                    {isFeatured && (
                      <span className="text-[10px] font-bold text-[#B4532F] bg-[#FDF5F2] border border-[#F3D7CD] px-2 py-0.5 rounded-md">
                        ★ Destaque Home
                      </span>
                    )}
                  </div>

                  <h3 className="font-serif text-lg text-[#2B2420] group-hover:text-[#B4532F] transition-colors mb-1 truncate">
                    {deck.name}
                  </h3>

                  {(deck as any).description && (
                    <p className="text-xs text-[#6F655C] line-clamp-2 leading-relaxed mb-3">
                      {(deck as any).description}
                    </p>
                  )}

                  <div className="text-[11px] text-[#6F655C] space-y-0.5 my-3 pt-3 border-t border-[#E2DACD]/60">
                    <div>Cartas: <strong className="text-[#2B2420]">{deck.card_count || deck.cards.length} cartas</strong></div>
                    <div>Autor: <strong className="text-[#B4532F]">Tá na Cara!</strong></div>
                    <div>{getSupportedSizesText(deck.card_count || deck.cards.length)}</div>
                  </div>

                  {/* Prévia das primeiras 4 fotos */}
                  <div className="flex items-center -space-x-1.5 mb-4">
                    {deck.cards.slice(0, 5).map((card, idx) => (
                      <img
                        key={card.id || idx}
                        src={card.imageUrl}
                        alt={card.name}
                        className="w-7 h-7 rounded-full border border-white object-cover shadow-2xs"
                      />
                    ))}
                    {deck.cards.length > 5 && (
                      <span className="w-7 h-7 rounded-full bg-[#F6F2EA] border border-white text-[10px] font-bold text-[#6F655C] flex items-center justify-center">
                        +{deck.cards.length - 5}
                      </span>
                    )}
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#E2DACD]">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => handleStartEditDeck(deck)}
                  >
                    <Edit2 size={12} />
                    <span>Editar</span>
                  </Button>

                  <button
                    type="button"
                    onClick={() => handleDeleteDeck(deck)}
                    title="Excluir baralho"
                    className="w-8 h-8 rounded-lg border border-[#E2DACD] hover:bg-rose-50 hover:border-rose-200 text-[#6F655C] hover:text-rose-700 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
