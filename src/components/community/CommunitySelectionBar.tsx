import type { FC } from 'react';
import { Button } from '../ui/Button';
import { computeSelectionGoal } from '../../utils/selectionRules';

interface CommunitySelectionBarProps {
  selectedCount: number;
  onClear: () => void;
  onComplete: () => void;
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

  const goal = computeSelectionGoal(selectedCount);

  return (
    <div
      role="region"
      aria-label="Barra de montagem de baralho"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#FBF8F3] border-t border-[#E2DACD] shadow-lg transition-transform duration-200 motion-reduce:transition-none pb-[calc(0.6rem+env(safe-area-inset-bottom))]"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Lado Esquerdo: Contagem e Mensagem de Meta com aria-live */}
        <div aria-live="polite" className="flex items-center gap-2 min-w-0">
          <span className="text-xs sm:text-sm font-sans text-[#2B2420] truncate">
            <strong className="font-semibold">{selectedCount} {selectedCount === 1 ? 'carta selecionada' : 'selecionadas'}</strong>
            <span className="text-[#6F655C]"> · {goal.message}</span>
          </span>
        </div>

        {/* Lado Direito: Ações (Selecionar visíveis, Limpar, Completar, Criar baralho) */}
        <div className="flex items-center justify-end gap-3 sm:gap-4 flex-wrap">
          {hasVisibleUnselected && selectedCount < 90 && (
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

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onComplete}
            disabled={goal.isValidSize || goal.isMaxReached}
            title={
              goal.isValidSize
                ? 'A contagem já é um tamanho válido de baralho'
                : 'Preenche aleatoriamente com cartas do banco até a próxima meta'
            }
          >
            Completar
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onCreateDeck}
            disabled={!goal.isValidSize}
            title={
              goal.isValidSize
                ? 'Criar baralho com as cartas selecionadas'
                : 'Selecione exatamente 15, 30, 60 ou 90 cartas para habilitar'
            }
          >
            Criar baralho
          </Button>
        </div>
      </div>
    </div>
  );
};
