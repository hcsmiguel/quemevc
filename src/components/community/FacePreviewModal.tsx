import { useEffect, useRef, type FC } from 'react';
import { X, Bookmark, Check } from 'lucide-react';
import type { SavedFace } from '../../services/auth';
import { ActionMenu } from './ActionMenu';

interface FacePreviewModalProps {
  face: SavedFace | null;
  isOpen: boolean;
  isSelected?: boolean;
  isSaved?: boolean;
  isSelectionEnabled?: boolean;
  isOwner?: boolean;
  isOfficial?: boolean;
  isPublic?: boolean;
  onClose: () => void;
  onToggleSelect?: () => void;
  onToggleSave?: () => void;
  onTogglePublic?: () => void;
  onDelete?: () => void;
  onRemoveSaved?: () => void;
  onReport?: () => void;
  triggerElement?: HTMLElement | null;
}

export const FacePreviewModal: FC<FacePreviewModalProps> = ({
  face,
  isOpen,
  isSelected = false,
  isSaved = false,
  isSelectionEnabled = true,
  isOwner = false,
  isOfficial = false,
  isPublic = false,
  onClose,
  onToggleSelect,
  onToggleSave,
  onTogglePublic,
  onDelete,
  onRemoveSaved,
  onReport,
  triggerElement,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Escuta tecla Escape e prende o foco
  useEffect(() => {
    if (!isOpen) return;

    const prevActiveElement = triggerElement || (document.activeElement as HTMLElement | null);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const timer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
      prevActiveElement?.focus();
    };
  }, [isOpen, onClose, triggerElement]);

  if (!isOpen || !face) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="face-preview-title"
      className="fixed inset-0 z-50 bg-[#2B2420]/45 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="bg-[#FBF8F3] border border-[#E2DACD] rounded-[12px] max-w-sm w-full p-5 sm:p-6 shadow-xl relative text-center"
      >
        {/* Botão Fechar */}
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Fechar pré-visualização"
          className="absolute top-4 right-4 p-1.5 text-[#6F655C] hover:text-[#2B2420] rounded-[6px] transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>

        {/* Imagem Grande */}
        <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-[12px] overflow-hidden bg-[#FAF6F0] cara-frame mx-auto shadow-sm relative">
          <img
            src={face.image_url}
            alt={face.name}
            className="w-full h-full object-cover cara-img"
          />
        </div>

        {/* Nome do Personagem */}
        <h3
          id="face-preview-title"
          className="font-serif text-xl sm:text-2xl text-[#2B2420] mt-3 font-normal leading-snug"
        >
          {face.name}
        </h3>

        {/* Autor */}
        <p className="text-xs font-sans mt-0.5">
          {face.is_official || face.author_name === 'Tá na Cara!' ? (
            <span className="text-[#2B2420] font-medium">Tá na Cara!</span>
          ) : (
            <span className="text-[#6F655C]">por {face.author_name?.trim() ? face.author_name : 'Comunidade'}</span>
          )}
        </p>

        {/* Ações em Texto */}
        <div className="mt-5 pt-4 border-t border-[#E2DACD] flex items-center justify-between gap-2 text-xs font-sans">
          {/* Alternar Seleção (oculto quando isSelectionEnabled é falso) */}
          {isSelectionEnabled && onToggleSelect ? (
            <button
              type="button"
              onClick={onToggleSelect}
              className={`cursor-pointer transition-colors font-medium flex items-center gap-1.5 ${
                isSelected
                  ? 'text-[#2B2420] underline'
                  : 'text-[#6F655C] hover:text-[#2B2420] underline'
              }`}
            >
              {isSelected ? (
                <>
                  <Check size={13} className="text-[#2B2420]" />
                  <span>Remover da seleção</span>
                </>
              ) : (
                <span>Adicionar à seleção</span>
              )}
            </button>
          ) : (
            <div />
          )}

          {/* Salvar / Salvo (visível apenas para caras que não são minhas) */}
          {!isOwner && onToggleSave ? (
            <button
              type="button"
              onClick={onToggleSave}
              className={`cursor-pointer transition-colors font-medium flex items-center gap-1.5 ${
                isSaved
                  ? 'text-[#2B2420] font-semibold'
                  : 'text-[#6F655C] hover:text-[#2B2420] underline'
              }`}
            >
              <Bookmark
                size={13}
                className={isSaved ? 'text-[#2B2420] fill-[#2B2420]' : 'text-[#6F655C]'}
              />
              <span>{isSaved ? 'Salva' : 'Salvar'}</span>
            </button>
          ) : (
            <div />
          )}

          {/* Menu de Ações (com detecção de colisão que não cobre o texto do autor) */}
          <ActionMenu
            ariaLabel="Opções do personagem"
            items={[
              ...(isOwner
                ? [
                    ...(onTogglePublic
                      ? [
                          {
                            label: isPublic ? 'Tornar privada' : 'Tornar pública',
                            onClick: onTogglePublic,
                          },
                        ]
                      : []),
                    ...(onDelete
                      ? [
                          {
                            label: 'Excluir',
                            onClick: onDelete,
                            variant: 'danger' as const,
                          },
                        ]
                      : []),
                  ]
                : isOfficial
                ? [
                    ...(onRemoveSaved
                      ? [
                          {
                            label: 'Remover dos salvos',
                            onClick: onRemoveSaved,
                          },
                        ]
                      : []),
                  ]
                : [
                    ...(onRemoveSaved && isSaved
                      ? [
                          {
                            label: 'Remover dos salvos',
                            onClick: onRemoveSaved,
                          },
                        ]
                      : []),
                    ...(onReport
                      ? [
                          {
                            label: 'Denunciar',
                            onClick: onReport,
                            variant: 'danger' as const,
                          },
                        ]
                      : []),
                  ]),
            ]}
          />
        </div>
      </div>
    </div>
  );
};
