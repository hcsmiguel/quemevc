import type { FC } from 'react';
import { Button } from '../ui/Button';
import { CompleteUntilMenu } from '../ui/CompleteUntilMenu';
import { getDeckSizeStatus, TAMANHO_MAXIMO_BARALHO } from '../../constants/deck';

interface CommunitySelectionBarProps {
  selectedCount: number;
  onClear: () => void;
  onComplete: (target: number) => void;
  onSelectVisible: () => void;
  onCreateDeck: () => void;
  hasVisibleUnselected?: boolean;
}

export const CommunitySelectionBar: FC<CommunitySelectionBarProps> = ({
  selectedCount,
  onClear,
  onComplete,
  onSelectVisible,
  onCreateDeck,
  hasVisibleUnselected = false,
}) => {
  if (selectedCount === 0) return null;

  const status = getDeckSizeStatus(selectedCount);

  return (
    <div
      role="region"
      aria-label="Barra de montagem de baralho"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#FBF8F3] border-t border-[#E2DACD] shadow-lg transition-transform duration-200 motion-reduce:transition-none pb-[calc(0.6rem+env(safe-area-inset-bottom))]"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Lado Esquerdo: Estado da seleção conforme regra de produto */}
        <div aria-live="polite" className="flex items-center gap-2 min-w-0">
          <span className="text-xs sm:text-sm font-sans text-[#2B2420] truncate font-medium">
            {status.text}
          </span>
        </div>

        {/* Lado Direito: Ações (Selecionar visíveis, Limpar, Completar até, Criar baralho) */}
        <div className="flex items-center justify-end gap-3 sm:gap-4 flex-wrap">
          {hasVisibleUnselected && selectedCount < TAMANHO_MAXIMO_BARALHO && (
            <button
              type="button"
              onClick={onSelectVisible}
              className="text-xs font-sans text-[#6F655C] hover:text-[#2B2420] underline cursor-pointer transition-colors"
              title="Adicionar à seleção as cartas filtradas na tela"
            >
              Selecionar visíveis
            </button>
          )}

          <button
            type="button"
            onClick={onClear}
            className="text-xs font-sans text-[#6F655C] hover:text-[#8C2E2A] underline cursor-pointer transition-colors"
          >
            Limpar
          </button>

          {/* Menu "Completar até": 15 · 30 · 60 · 90 (oculto quando count >= 90) */}
          <CompleteUntilMenu
            currentCount={selectedCount}
            onSelectTarget={onComplete}
            direction="up"
          />

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onCreateDeck}
            disabled={!status.canSave}
            title={
              status.canSave
                ? 'Criar baralho com as cartas selecionadas'
                : 'Selecione de 15 a 90 cartas para habilitar'
            }
          >
            Criar baralho
          </Button>
        </div>
      </div>
    </div>
  );
};
