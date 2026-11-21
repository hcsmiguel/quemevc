import { useState, useRef, useEffect, useCallback, type FC } from 'react';
import { MoreHorizontal } from 'lucide-react';

export interface ActionMenuItem {
  label: string;
  onClick: () => void;
  variant?: 'danger' | 'default';
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  ariaLabel?: string;
  className?: string;
}

export const ActionMenu: FC<ActionMenuProps> = ({
  items,
  ariaLabel = 'Mais opções',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Detecção de colisão inteligente para posicionamento (preferir para cima, inverter se não houver espaço)
  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuHeight = items.length * 36 + 12; // altura aproximada do menu

    // Espaço disponível acima e abaixo em relação à viewport e limites
    let spaceAbove = rect.top;
    let spaceBelow = window.innerHeight - rect.bottom;

    // Se estiver dentro de um modal ou contêiner com conteúdo acima
    const modalParent = buttonRef.current.closest('[role="dialog"], .modal-container');
    if (modalParent) {
      // Elementos de conteúdo relevante acima do gatilho (como texto do autor, título, etc)
      const contentAbove = modalParent.querySelectorAll('p, h3, h4, .cara-frame');
      if (contentAbove.length > 0) {
        let lowestBottom = 0;
        contentAbove.forEach((el) => {
          const elRect = el.getBoundingClientRect();
          if (elRect.bottom <= rect.top + 6 && elRect.bottom > lowestBottom) {
            lowestBottom = elRect.bottom;
          }
        });
        if (lowestBottom > 0) {
          const clearanceAbove = rect.top - lowestBottom;
          if (clearanceAbove < menuHeight) {
            spaceAbove = clearanceAbove; // Força espaço insuficiente acima para não cobrir o texto
          }
        }
      }
    }

    // Se espaço acima for menor que o menu e houver espaço abaixo, inverte para baixo
    if (spaceAbove < menuHeight && spaceBelow >= menuHeight) {
      setOpenUpward(false);
    } else if (spaceAbove >= menuHeight) {
      setOpenUpward(true);
    } else {
      setOpenUpward(spaceAbove >= spaceBelow);
    }
  }, [items.length]);

  const handleToggle = () => {
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen((prev) => !prev);
  };

  const handleClose = useCallback(() => {
    setIsOpen(false);
    buttonRef.current?.focus();
  }, []);

  // Fechar ao clicar fora e ao redimensionar
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    };

    const handleResizeOrScroll = () => {
      updatePosition();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll, true);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll, true);
    };
  }, [isOpen, handleClose, updatePosition]);

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        className="w-8 h-8 flex items-center justify-center rounded-[6px] text-[#6F655C] hover:text-[#2B2420] hover:bg-[#2B2420]/5 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#2B2420]"
      >
        <MoreHorizontal size={15} />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={ariaLabel}
          className={`absolute right-0 ${
            openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } bg-[#FBF8F3] border border-[#E2DACD] rounded-[6px] shadow-md py-1 min-w-[120px] text-left z-30 animate-in fade-in zoom-in-95 duration-100`}
        >
          {items.map((item, index) => (
            <button
              key={index}
              role="menuitem"
              type="button"
              onClick={() => {
                item.onClick();
                handleClose();
              }}
              className={`w-full px-3 py-1.5 text-xs font-sans text-left cursor-pointer transition-colors outline-none focus-visible:bg-[#F6F2EA] ${
                item.variant === 'danger'
                  ? 'text-[#8C2E2A] hover:bg-[#F8EBEA]'
                  : 'text-[#2B2420] hover:bg-[#F6F2EA]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
