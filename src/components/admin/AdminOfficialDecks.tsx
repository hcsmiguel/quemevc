import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { adminService } from '../../services/admin';
import type { SavedDeck, SavedFace } from '../../services/auth';
import type { Character } from '../../types/game';
import { Button } from '../ui/Button';
import { ActionMenu } from '../community/ActionMenu';
import { OfficialDeckBuilder } from './OfficialDeckBuilder';
import { sounds } from '../../utils/sound';
import { AlertTriangle, Plus, ExternalLink } from 'lucide-react';

export const AdminOfficialDecks: React.FC = () => {
  const [decks, setDecks] = useState<SavedDeck[]>([]);
  const [publicFaces, setPublicFaces] = useState<SavedFace[]>([]);
  const [loading, setLoading] = useState(true);

  // Modo de construtor (novo ou edição)
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState<SavedDeck | null>(null);
  const [brokenCardsForBuilder, setBrokenCardsForBuilder] = useState<Character[]>([]);

  // Carregar baralhos oficiais e catálogo público para checagem de integridade
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [officialDecks, faces] = await Promise.all([
        adminService.getOfficialDecks(),
        adminService.getPublicFacesForCatalog(),
      ]);
      setDecks(officialDecks);
      setPublicFaces(faces);
    } catch (err) {
      console.warn('Erro ao carregar baralhos do Tá na Cara!:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Checagem de integridade de cada baralho
  const integrityMap = useMemo(() => {
    const map = new Map<string, { needsAdjustment: boolean; brokenCards: Character[] }>();
    for (const deck of decks) {
      const status = adminService.checkDeckBrokenCards(deck, publicFaces);
      map.set(deck.id, status);
    }
    return map;
  }, [decks, publicFaces]);

  // Contagem de baralhos que precisam de ajuste
  const brokenDecksCount = useMemo(() => {
    let count = 0;
    integrityMap.forEach((status) => {
      if (status.needsAdjustment) count++;
    });
    return count;
  }, [integrityMap]);

  // Ações
  const handleStartCreate = () => {
    sounds.playClick();
    setEditingDeck(null);
    setBrokenCardsForBuilder([]);
    setIsBuilderOpen(true);
  };

  const handleStartEdit = (deck: SavedDeck) => {
    sounds.playClick();
    setEditingDeck(deck);
    setBrokenCardsForBuilder([]);
    setIsBuilderOpen(true);
  };

  const handleStartRepair = (deck: SavedDeck, broken: Character[]) => {
    sounds.playClick();
    setEditingDeck(deck);
    setBrokenCardsForBuilder(broken);
    setIsBuilderOpen(true);
  };

  const handleToggleFeatured = async (deckId: string, currentFeatured: boolean) => {
    sounds.playClick();
    const nextFeatured = !currentFeatured;
    // Otimista
    setDecks((prev) =>
      prev.map((d) => (d.id === deckId ? { ...d, is_featured: nextFeatured } : d))
    );
    await adminService.toggleDeckFeatured(deckId, nextFeatured);
  };

  const handleDeleteDeck = async (deck: SavedDeck) => {
    if (!window.confirm(`Tem certeza que deseja excluir o baralho "${deck.name}"?`)) {
      return;
    }
    sounds.playClick();
    await adminService.deleteOfficialDeck(deck.id, deck.name);
    loadData();
  };

  // Se o construtor estiver aberto, renderiza o OfficialDeckBuilder
  if (isBuilderOpen) {
    return (
      <OfficialDeckBuilder
        editingDeck={editingDeck}
        initialBrokenCards={brokenCardsForBuilder}
        onBack={() => {
          setIsBuilderOpen(false);
          setEditingDeck(null);
          setBrokenCardsForBuilder([]);
        }}
        onSaved={() => {
          setIsBuilderOpen(false);
          setEditingDeck(null);
          setBrokenCardsForBuilder([]);
          loadData();
        }}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Topo com Título e Ação "+ Novo baralho" */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2DACD]">
        <div>
          <h2 className="font-serif text-2xl text-[#2B2420]">
            Baralhos Tá na Cara!
          </h2>
          <p className="text-xs text-[#6F655C] mt-0.5">
            Coleções mantidas pela equipe do jogo com autoria padronizada como Tá na Cara!.
          </p>
        </div>

        <Button size="sm" variant="primary" onClick={handleStartCreate}>
          <Plus size={14} className="mr-1.5" />
          Novo baralho
        </Button>
      </div>

      {/* Alerta Discreto de Baralhos que Precisam de Ajuste */}
      {brokenDecksCount > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-700 shrink-0" />
            <span>
              <strong>Atenção:</strong> {brokenDecksCount} baralho(s) precisa(m) de ajuste devido a cartas indisponíveis e está(ão) oculto(s) para os jogadores na Comunidade e na Home.
            </span>
          </div>
        </div>
      )}

      {/* Listagem de Baralhos em Linhas (Mesmo padrão visual da Comunidade) */}
      {loading ? (
        <div className="py-12 text-center text-xs text-[#6F655C]">
          Carregando baralhos...
        </div>
      ) : decks.length === 0 ? (
        <div className="bg-white border border-[#E2DACD] rounded-2xl p-10 text-center space-y-3">
          <h3 className="font-serif text-base text-[#2B2420]">
            Nenhum baralho cadastrado ainda
          </h3>
          <p className="text-xs text-[#6F655C] max-w-sm mx-auto">
            Crie seu primeiro baralho com 15, 30, 60 ou 90 cartas para disponibilizar aos jogadores.
          </p>
          <Button size="sm" variant="primary" onClick={handleStartCreate}>
            Criar baralho agora
          </Button>
        </div>
      ) : (
        <div className="space-y-1">
          {decks.map((deck) => {
            const cardList = deck.cards || [];
            const previewCards = cardList.slice(0, 6);
            const remainingCount = cardList.length - 6;
            const integrity = integrityMap.get(deck.id);
            const needsAdjustment = integrity?.needsAdjustment || false;
            const isFeatured = Boolean(deck.is_featured);

            return (
              <div
                key={deck.id}
                className={`py-4 border-b border-[#E2DACD] flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                  needsAdjustment ? 'bg-amber-50/50 px-3 rounded-xl border border-amber-200/70 my-1' : ''
                }`}
              >
                {/* Lado Esquerdo: Nome e Metadados */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3
                      role="button"
                      tabIndex={0}
                      onClick={() => handleStartEdit(deck)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleStartEdit(deck);
                        }
                      }}
                      className="font-serif text-base sm:text-lg text-[#2B2420] hover:text-[#B4532F] transition-colors truncate font-normal leading-snug cursor-pointer select-none outline-none focus-visible:underline"
                    >
                      {deck.name}
                    </h3>

                    {/* Aviso de Baralho que Precisa de Ajuste */}
                    {needsAdjustment && (
                      <span className="text-[11px] font-medium text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-300/60 inline-flex items-center gap-1">
                        <AlertTriangle size={12} className="text-amber-700" />
                        <span>Precisa de ajuste ({integrity?.brokenCards.length} indisponível)</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-sans text-[#6F655C] mt-0.5 truncate">
                    <span>{deck.card_count || cardList.length} cartas · </span>
                    <span>
                      por <strong className="text-[#2B2420] font-medium">Tá na Cara!</strong>
                    </span>
                    {deck.description && (
                      <span className="hidden md:inline text-[#A39A90]"> — {deck.description}</span>
                    )}
                  </p>
                </div>

                {/* Centro / Direita: Miniaturas das Cartas e Ações em Linha */}
                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 flex-wrap">
                  {/* Faixa de Miniaturas */}
                  {cardList.length > 0 && (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        window.open(`/comunidade/baralho/${deck.id}`, '_blank');
                      }}
                      title="Ver página do baralho"
                      className="flex items-center -space-x-1.5 cursor-pointer select-none"
                    >
                      {previewCards.map((card, idx) => (
                        <div
                          key={card.id || idx}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden border-2 border-[#FBF8F3] bg-[#E2DACD] shrink-0 shadow-2xs"
                        >
                          {card.imageUrl ? (
                            <img
                              src={card.imageUrl}
                              alt={card.name}
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-[#E2DACD]" />
                          )}
                        </div>
                      ))}

                      {remainingCount > 0 && (
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-[#FBF8F3] bg-[#F6F2EA] flex items-center justify-center shrink-0 shadow-2xs">
                          <span className="text-[10px] font-sans font-medium text-[#6F655C]">
                            +{remainingCount}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Controle de Destaque na Home */}
                  <label className="flex items-center gap-1.5 text-xs text-[#6F655C] hover:text-[#2B2420] cursor-pointer select-none shrink-0">
                    <input
                      type="checkbox"
                      checked={isFeatured}
                      onChange={() => handleToggleFeatured(deck.id, isFeatured)}
                      className="accent-[#B4532F] rounded cursor-pointer"
                    />
                    <span className="hidden lg:inline">Destaque na Home</span>
                  </label>

                  {/* Ações em Texto */}
                  <div className="flex items-center gap-2 shrink-0 text-xs font-sans">
                    {needsAdjustment ? (
                      <button
                        type="button"
                        onClick={() => handleStartRepair(deck, integrity?.brokenCards || [])}
                        className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium transition-colors cursor-pointer"
                      >
                        Substituir
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStartEdit(deck)}
                        className="text-[#6F655C] hover:text-[#2B2420] underline transition-colors cursor-pointer px-1 py-1"
                      >
                        Editar
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        window.open(`/comunidade/baralho/${deck.id}`, '_blank');
                      }}
                      className="text-[#6F655C] hover:text-[#2B2420] underline transition-colors cursor-pointer px-1 py-1 inline-flex items-center gap-1"
                    >
                      <span>Ver cartas</span>
                      <ExternalLink size={11} />
                    </button>

                    {/* Menu "..." com Excluir */}
                    <ActionMenu
                      items={[
                        {
                          label: 'Excluir baralho',
                          onClick: () => handleDeleteDeck(deck),
                          variant: 'danger',
                        },
                      ]}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
