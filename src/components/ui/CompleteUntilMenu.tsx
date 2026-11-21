import { useState, useRef, useEffect, type FC } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { getAvailableShortcuts } from '../../constants/deck';

interface CompleteUntilMenuProps {
  currentCount: number;
  onSelectTarget: (target: number) => void;
  disabled?: boolean;
  direction?: 'up' | 'down';
  theme?: 'light' | 'dark';
  className?: string;
}

export const CompleteUntilMenu: FC<CompleteUntilMenuProps> = ({
  currentCount,
  onSelectTarget,
  disabled = false,
  direction = 'up',
  theme = 'light',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const availableShortcuts = getAvailableShortcuts(currentCount);

  // Fechar ao clicar fora
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Se já atingiu 90 cartas ou mais, o menu fica totalmente oculto
  if (availableShortcuts.length === 0) {
    return null;
  }

  const isDark = theme === 'dark';

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Botão Gatilho */}
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`px-3 py-1.5 rounded-[6px] text-xs font-sans font-medium transition-colors cursor-pointer flex items-center gap-1.5 select-none ${
          isDark
            ? 'bg-white/10 hover:bg-white/20 text-white border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed'
            : 'bg-white hover:bg-[#FAF6F0] text-[#2B2420] border border-[#E2DACD] hover:border-[#2B2420]/40 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs'
        }`}
        title="Preencher aleatoriamente até um tamanho específico"
      >
        <span>Completar até</span>
        {direction === 'up' ? (
          <ChevronUp size={13} className={isOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
        ) : (
          <ChevronDown size={13} className={isOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
        )}
      </button>

      {/* Popover / Menu Flutuante */}
      {isOpen && (
        <div
          role="menu"
          aria-label="Opções para completar baralho"
          className={`absolute z-50 min-w-[130px] p-1 rounded-[8px] border shadow-lg animate-in fade-in zoom-in-95 duration-100 ${
            direction === 'up' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } right-0 ${
            isDark
              ? 'bg-[#2B2420] border-white/20 text-white'
              : 'bg-[#FBF8F3] border-[#E2DACD] text-[#2B2420]'
          }`}
        >
          <div className="py-0.5">
            {availableShortcuts.map((target) => (
              <button
                key={target}
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsOpen(false);
                  onSelectTarget(target);
                }}
                className={`w-full text-left px-2.5 py-1.5 text-xs font-sans rounded-[4px] transition-colors cursor-pointer flex items-center justify-between ${
                  isDark
                    ? 'hover:bg-white/15 text-white'
                    : 'hover:bg-[#E2DACD]/50 text-[#2B2420]'
                }`}
              >
                <span>{target} cartas</span>
                <span className={`text-[10px] ${isDark ? 'text-white/60' : 'text-[#6F655C]'}`}>
                  +{target - currentCount}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
