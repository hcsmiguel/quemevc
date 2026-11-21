import { useState, useRef, useEffect, type FC, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Checkbox } from '../ui/Checkbox';

interface CreateDeckModalProps {
  isOpen: boolean;
  cardCount: number;
  privateCardsCount?: number;
  onClose: () => void;
  onConfirm: (name: string, isPublic: boolean) => Promise<void>;
}

export const CreateDeckModal: FC<CreateDeckModalProps> = ({
  isOpen,
  cardCount,
  privateCardsCount = 0,
  onClose,
  onConfirm,
}) => {
  const [deckName, setDeckName] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showVisibilityWarning, setShowVisibilityWarning] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setDeckName('');
      setIsPublic(true);
      setError(null);
      setSubmitting(false);
      setShowVisibilityWarning(false);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Fechar com Escape e prender foco
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanName = deckName.trim();
    if (!cleanName) {
      setError('Dê um nome para o seu baralho.');
      inputRef.current?.focus();
      return;
    }

    // Consistência de Visibilidade: se baralho for público e houver caras privadas
    if (isPublic && privateCardsCount > 0 && !showVisibilityWarning) {
      setShowVisibilityWarning(true);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(cleanName, isPublic);
    } catch (err: any) {
      setError(err?.message || 'Erro ao criar baralho. Tente novamente.');
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-deck-modal-title"
      className="fixed inset-0 z-50 bg-[#2B2420]/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        ref={modalRef}
        className="bg-[#FBF8F3] border border-[#E2DACD] rounded-[12px] max-w-sm w-full p-5 sm:p-6 shadow-xl relative text-left"
      >
        {/* Fechar */}
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          aria-label="Fechar modal"
          className="absolute top-4 right-4 p-1.5 text-[#6F655C] hover:text-[#2B2420] rounded-[6px] transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>

        {showVisibilityWarning ? (
          <div>
            <h3
              id="create-deck-modal-title"
              className="font-serif text-xl text-[#2B2420] font-normal mb-2 leading-snug"
            >
              Consistência de visibilidade
            </h3>
            <p className="text-xs font-sans text-[#6F655C] mb-5 leading-relaxed">
              Este baralho tem {privateCardsCount} {privateCardsCount === 1 ? 'cara privada' : 'caras privadas'}. Para torná-lo público na comunidade, elas também serão tornadas públicas.
            </p>
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-3 border-t border-[#E2DACD]/60">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={submitting}
                onClick={async () => {
                  setSubmitting(true);
                  try {
                    setIsPublic(false);
                    await onConfirm(deckName.trim(), false);
                  } catch (err: any) {
                    setError(err?.message || 'Erro ao criar baralho.');
                    setSubmitting(false);
                    setShowVisibilityWarning(false);
                  }
                }}
              >
                Manter baralho privado
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={submitting}
                onClick={async () => {
                  setSubmitting(true);
                  try {
                    await onConfirm(deckName.trim(), true);
                  } catch (err: any) {
                    setError(err?.message || 'Erro ao criar baralho.');
                    setSubmitting(false);
                    setShowVisibilityWarning(false);
                  }
                }}
              >
                Tornar públicas e publicar
              </Button>
            </div>
          </div>
        ) : (
          <>
            <h3
              id="create-deck-modal-title"
              className="font-serif text-xl text-[#2B2420] font-normal mb-1 leading-snug"
            >
              Criar baralho
            </h3>
            <p className="text-xs font-sans text-[#6F655C] mb-4">
              {cardCount} cartas selecionadas prontas para a mesa
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nome do Baralho */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="deck-name-input"
                    className="text-xs font-sans text-[#2B2420] font-medium"
                  >
                    Nome do baralho
                  </label>
                  {isFocused && (
                    <span className="text-[11px] font-mono text-[#6F655C]">
                      {deckName.length}/35
                    </span>
                  )}
                </div>
                <Input
                  ref={inputRef}
                  id="deck-name-input"
                  type="text"
                  maxLength={35}
                  placeholder="Ex.: Filmes Clássicos, Ídolos do Rock..."
                  value={deckName}
                  onChange={(e) => {
                    setDeckName(e.target.value);
                    if (error) setError(null);
                  }}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  disabled={submitting}
                  error={Boolean(error)}
                  autoComplete="off"
                />
                {error && <p className="text-xs text-[#8C2E2A] mt-1">{error}</p>}
              </div>

              {/* Checkbox Público na Comunidade */}
              <div className="pt-1">
                <Checkbox
                  id="deck-public-checkbox"
                  label="Público na comunidade"
                  description="Outros jogadores poderão ver e jogar com este baralho"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  disabled={submitting}
                />
              </div>

              {/* Ações */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#E2DACD]/60">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="text-xs font-sans text-[#6F655C] hover:text-[#2B2420] underline cursor-pointer py-2 px-1 transition-colors"
                >
                  Cancelar
                </button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={submitting}
                >
                  {submitting ? 'Salvando...' : 'Salvar baralho'}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
