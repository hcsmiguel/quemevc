import { useState, useRef, useEffect, type FC } from 'react';
import type { Character, CardStatus } from '../types/game';
import { Avatar } from './Avatar';
import { HelpCircle, EyeOff, RotateCcw, X } from 'lucide-react';
import { sounds } from '../utils/sound';

interface CardProps {
  character: Character;
  status: CardStatus;
  onSetStatus: (id: string, newStatus: CardStatus) => void;
  onTargetSelect?: (char: Character) => void;
  disabled?: boolean;
}

export const Card: FC<CardProps> = ({
  character,
  status,
  onSetStatus,
  disabled = false,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleCardClick = () => {
    if (disabled) return;
    sounds.playClick();
    setMenuOpen((prev) => !prev);
  };

  const handleSelectOption = (newStatus: CardStatus) => {
    setMenuOpen(false);
    if (newStatus === 'discard') sounds.playFlip(true);
    else if (newStatus === 'normal') sounds.playFlip(false);
    else sounds.playClick();
    onSetStatus(character.id, newStatus);
  };

  const isDiscarded = status === 'discard';
  const isSuspect = status === 'suspect';

  return (
    <div
      ref={cardRef}
      className={`relative select-none transition-all duration-300 transform-style-3d perspective-1000 ${
        disabled ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
      }`}
      style={{ minHeight: '145px' }}
    >
      {/* Corpo da Cartela */}
      <div
        onClick={handleCardClick}
        className={`w-full h-full rounded-2xl p-2 flex flex-col items-center justify-between border-2 transition-all duration-300 ${
          isDiscarded
            ? 'bg-slate-100 border-slate-200 scale-[0.92] opacity-40 translate-y-1'
            : isSuspect
            ? 'bg-amber-50 border-amber-400 shadow-[0_3px_0_#f59e0b]'
            : 'bg-white border-slate-200 hover:border-sky-400 hover:scale-[1.03] shadow-[0_3px_0_#cbd5e1]'
        }`}
      >
        {/* Cabeçalho da Cartela */}
        <div className="w-full flex items-center justify-between mb-1 px-1">
          <span
            className={`text-xs font-bold tracking-wide truncate max-w-[85px] ${
              isSuspect ? 'text-amber-900' : 'text-slate-800'
            }`}
          >
            {character.name}
          </span>

          {/* Indicador de Status */}
          {isDiscarded && (
            <span className="bg-rose-100 text-rose-700 p-0.5 rounded-full border border-rose-300">
              <EyeOff size={11} />
            </span>
          )}
          {isSuspect && (
            <span className="bg-amber-200 text-amber-900 p-0.5 rounded-full border border-amber-400 font-extrabold text-[10px] px-1">
              ?
            </span>
          )}
          {!isDiscarded && !isSuspect && (
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          )}
        </div>

        {/* Avatar Central com Efeitos */}
        <div className="relative my-0.5">
          <Avatar
            character={character}
            size={74}
            className={`transition-all duration-300 ${
              isDiscarded ? 'grayscale' : isSuspect ? 'grayscale-[50%] brightness-95' : ''
            }`}
          />

          {/* Efeito Suspeito: Interrogação Vermelha Translúcida */}
          {isSuspect && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-amber-600/70 font-black text-6xl drop-shadow select-none">
                ?
              </span>
            </div>
          )}

          {/* Efeito Descarte: Overlay de Eliminado */}
          {isDiscarded && (
            <div className="absolute inset-0 bg-slate-900/40 rounded-2xl flex items-center justify-center">
              <span className="bg-rose-600 text-white font-extrabold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow">
                Descarte
              </span>
            </div>
          )}
        </div>

        {/* Rodapé da Cartela */}
        <div className="w-full flex items-center justify-center gap-1 mt-1 text-[10px] text-slate-400 font-medium">
          {character.traits?.glasses && <span title="Usa óculos">👓</span>}
          {character.traits?.hat && <span title="Usa chapéu/boné">🧢</span>}
          {character.traits?.beard && <span title="Tem barba">🧔</span>}
          {character.traits?.earrings && <span title="Usa brinco">💍</span>}
        </div>
      </div>

      {/* Menu Contextual ao Clicar (Suspeito, Descarte, Restaurar) */}
      {menuOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-50 -top-2 left-1/2 -translate-x-1/2 -translate-y-full w-44 bg-white border-2 border-slate-200 rounded-2xl p-2 shadow-2xl animate-in zoom-in-95 flex flex-col gap-1.5"
        >
          <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <span>{character.name}</span>
            <button onClick={() => setMenuOpen(false)} className="text-slate-400 hover:text-slate-700">
              <X size={12} />
            </button>
          </div>

          {/* Opção 1: 'Suspeito' */}
          <button
            onClick={() => handleSelectOption(isSuspect ? 'normal' : 'suspect')}
            className={`flex items-center gap-2 w-full p-2 rounded-xl text-xs font-bold transition-colors ${
              isSuspect
                ? 'bg-amber-200 text-amber-900 border border-amber-300 font-black'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-900'
            }`}
          >
            <HelpCircle size={14} className="shrink-0 text-amber-600" />
            <span>{isSuspect ? 'Desmarcar Suspeito' : 'Marcar Suspeito'}</span>
          </button>

          {/* Opção 2: 'Descarte' */}
          <button
            onClick={() => handleSelectOption(isDiscarded ? 'normal' : 'discard')}
            className={`flex items-center gap-2 w-full p-2 rounded-xl text-xs font-bold transition-colors ${
              isDiscarded
                ? 'bg-rose-200 text-rose-900 border border-rose-300 font-black'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-800'
            }`}
          >
            <EyeOff size={14} className="shrink-0 text-rose-600" />
            <span>{isDiscarded ? 'Restaurar Carta' : 'Descartar / Virar'}</span>
          </button>

          {/* Opção 3: 'Restaurar' (se não estiver normal) */}
          {status !== 'normal' && (
            <button
              onClick={() => handleSelectOption('normal')}
              className="flex items-center justify-center gap-1.5 w-full p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold border-t border-slate-100 mt-0.5 transition-colors"
            >
              <RotateCcw size={12} className="shrink-0" />
              <span>Voltar ao Normal</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
