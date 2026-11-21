import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/admin';
import type { SavedDeck } from '../../services/auth';
import { Button } from '../ui/Button';
import { sounds } from '../../utils/sound';

export const AdminFeaturedDecks: React.FC = () => {
  const [featuredDecks, setFeaturedDecks] = useState<SavedDeck[]>([]);
  const [eligibleDecks, setEligibleDecks] = useState<SavedDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [featured, eligible] = await Promise.all([
        adminService.getFeaturedDecks(),
        adminService.getEligibleDecksForFeatured(),
      ]);
      setFeaturedDecks(featured);
      setEligibleDecks(eligible);
    } catch (err) {
      console.warn('Erro ao carregar destaques da home:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    sounds.playClick();
    setFeaturedDecks((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index >= featuredDecks.length - 1) return;
    sounds.playClick();
    setFeaturedDecks((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const handleRemoveFeatured = (deckId: string) => {
    sounds.playClick();
    setFeaturedDecks((prev) => prev.filter((d) => d.id !== deckId));
  };

  const handleAddFeatured = (deck: SavedDeck) => {
    sounds.playClick();
    if (featuredDecks.some((d) => d.id === deck.id)) return;
    setFeaturedDecks((prev) => [...prev, deck]);
    setIsAddModalOpen(false);
  };

  const handleSaveOrder = async () => {
    sounds.playClick();
    setIsSaving(true);
    setSaveSuccess(false);

    const idsInOrder = featuredDecks.map((d) => d.id);
    const success = await adminService.setFeaturedDecks(idsInOrder);
    setIsSaving(false);

    if (success) {
      sounds.playWin();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      loadData();
    } else {
      sounds.playWrong();
    }
  };

  const nonFeaturedEligible = eligibleDecks.filter(
    (deck) => !featuredDecks.some((fd) => fd.id === deck.id)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Topo com Título e Ação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2DACD]">
        <div>
          <h2 className="font-serif text-2xl text-[#2B2420]">
            Destaques da Página Inicial (Home)
          </h2>
          <p className="text-xs text-[#6F655C] mt-0.5">
            Defina quais baralhos oficiais do Tá na Cara! aparecem na Home e em qual ordem.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              sounds.playClick();
              setIsAddModalOpen(true);
            }}
          >
            Adicionar Baralho Oficial
          </Button>

          <Button
            size="sm"
            variant="primary"
            disabled={isSaving}
            onClick={handleSaveOrder}
          >
            {isSaving ? 'Salvando...' : 'Salvar Ordem na Home'}
          </Button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
          Ordem dos baralhos em destaque atualizada com sucesso na Home!
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-xs text-[#6F655C]">
          Carregando destaques...
        </div>
      ) : featuredDecks.length === 0 ? (
        <div className="bg-white border border-[#E2DACD] rounded-2xl p-10 text-center space-y-3">
          <h3 className="font-serif text-base text-[#2B2420]">
            Nenhum baralho oficial fixado na Home
          </h3>
          <p className="text-xs text-[#6F655C] max-w-sm mx-auto">
            Selecione quais baralhos oficiais publicados devem aparecer na primeira dobra para os jogadores.
          </p>
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsAddModalOpen(true)}
          >
            Selecionar Baralhos Oficiais
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-[#6F655C]">
            Ordem de exibição na Home (da esquerda para a direita):
          </p>

          <div className="space-y-2">
            {featuredDecks.map((deck, idx) => (
              <div
                key={deck.id}
                className="bg-white border border-[#E2DACD] rounded-xl p-4 flex items-center justify-between gap-4 shadow-2xs hover:border-[#2B2420]/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 h-6 rounded-md bg-[#F6F2EA] border border-[#E2DACD] text-xs font-mono font-bold text-[#6F655C] flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>

                  <div className="flex items-center -space-x-1.5 shrink-0">
                    {deck.cards.slice(0, 3).map((c, i) => (
                      <img
                        key={c.id || i}
                        src={c.imageUrl}
                        alt={c.name}
                        className="w-7 h-7 rounded-full border border-white object-cover"
                      />
                    ))}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-serif text-sm text-[#2B2420] truncate">
                        {deck.name}
                      </h4>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#B4532F] bg-[#FDF5F2] border border-[#F3D7CD] px-1.5 py-0.2 rounded">
                        Oficial
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6F655C] truncate">
                      {deck.card_count || deck.cards.length} cartas · Autor: Tá na Cara!
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 text-xs font-medium">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMoveUp(idx)}
                    className="px-2.5 py-1 rounded border border-[#E2DACD] bg-[#FBF8F3] hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed text-[#2B2420] transition-colors cursor-pointer"
                  >
                    Subir ↑
                  </button>

                  <button
                    type="button"
                    disabled={idx === featuredDecks.length - 1}
                    onClick={() => handleMoveDown(idx)}
                    className="px-2.5 py-1 rounded border border-[#E2DACD] bg-[#FBF8F3] hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed text-[#2B2420] transition-colors cursor-pointer"
                  >
                    Descer ↓
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemoveFeatured(deck.id)}
                    className="px-2.5 py-1 rounded border border-[#E2DACD] hover:bg-rose-50 hover:border-rose-200 text-[#6F655C] hover:text-rose-700 transition-colors cursor-pointer ml-1"
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal para Adicionar Baralho Oficial aos Destaques */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2B2420]/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#FBF8F3] border border-[#E2DACD] rounded-2xl max-w-xl w-full p-6 max-h-[80vh] flex flex-col shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2DACD]">
              <h3 className="font-serif text-lg text-[#2B2420]">
                Selecionar Baralho Oficial para a Home
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-xs text-[#6F655C] hover:text-[#2B2420]"
              >
                Fechar
              </button>
            </div>

            <p className="text-xs text-[#6F655C] my-3">
              Somente baralhos oficiais do Tá na Cara! que estejam publicados podem ser exibidos na página inicial.
            </p>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {nonFeaturedEligible.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#6F655C]">
                  Nenhum baralho oficial publicado disponível. Publique um baralho oficial primeiro no menu "Baralhos Oficiais".
                </div>
              ) : (
                nonFeaturedEligible.map((deck) => (
                  <div
                    key={deck.id}
                    className="bg-white border border-[#E2DACD] rounded-xl p-3 flex items-center justify-between gap-3 hover:border-[#2B2420]/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-serif text-sm text-[#2B2420] truncate">
                          {deck.name}
                        </h4>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#B4532F] bg-[#FDF5F2] border border-[#F3D7CD] px-1.5 py-0.2 rounded">
                          Oficial
                        </span>
                      </div>
                      <p className="text-[11px] text-[#6F655C]">
                        {deck.card_count || deck.cards.length} cartas
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleAddFeatured(deck)}
                    >
                      Destacar na Home
                    </Button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-[#E2DACD] mt-3 text-right">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setIsAddModalOpen(false)}
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
