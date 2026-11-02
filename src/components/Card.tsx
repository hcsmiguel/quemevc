import { useState, useRef, useEffect, type FC } from 'react';
import type { Character, CardStatus } from '../types/game';
import { Avatar } from './Avatar';
import { Target, HelpCircle, EyeOff, RotateCcw, X } from 'lucide-react';
import { sounds } from '../utils/sound';

interface CardProps {
  character: Character;
  status: CardStatus;
  onSetStatus: (id: string, newStatus: CardStatus) => void;
  onTargetSelect: (char: Character) => void;
  disabled?: boolean;
}

export const Card: FC<CardProps> = ({
  character,
  status,
  onSetStatus,
  onTargetSelect,
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

    if (newStatus === 'target') {
      sounds.playWin();
      onTargetSelect(character);
    } else {
      if (newStatus === 'discard') sounds.playFlip(true);
      else if (newStatus === 'normal') sounds.playFlip(false);
      else sounds.playClick();
      onSetStatus(character.id, newStatus);
    }
  };

  const isDiscarded = status === 'discard';
  const isSuspect = status === 'suspect';
  const isTarget = status === 'target';

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
        className={`w-full h-full rounded-2xl p-2 flex flex-col items-center justify-between border-2 transition-all duration-300 shadow-md ${
          isDiscarded
            ? 'bg-slate-900/90 border-slate-700/60 scale-[0.92] brightness-50 opacity-35 translate-y-2'
            : isSuspect
            ? 'bg-slate-800/95 border-amber-500/80 shadow-lg shadow-amber-500/10'
            : isTarget
            ? 'bg-indigo-950 border-amber-400 ring-4 ring-amber-400 scale-[1.04] shadow-2xl z-10'
            : 'bg-slate-800 border-slate-600/80 hover:border-indigo-400 hover:scale-[1.03] hover:shadow-xl shadow-slate-950/50'
        }`}
      >
        {/* Cabeçalho da Cartela */}
        <div className="w-full flex items-center justify-between mb-1 px-1">
          <span
            className={`text-xs font-bold tracking-wide truncate max-w-[85px] ${
              isTarget ? 'text-amber-300' : isSuspect ? 'text-amber-400' : 'text-slate-300'
            }`}
          >
            {character.name}
          </span>

          {/* Indicador de Status */}
          {isDiscarded && (
            <span className="bg-red-950 text-red-400 p-0.5 rounded-full border border-red-800">
              <EyeOff size={11} />
            </span>
          )}
          {isSuspect && (
            <span className="bg-amber-950 text-amber-400 p-0.5 rounded-full border border-amber-700 font-extrabold text-[10px] px-1">
              ?
            </span>
          )}
          {isTarget && (
            <span className="bg-amber-500 text-slate-950 p-0.5 rounded-full font-black text-[9px] px-1 shadow">
              🎯 ALVO
            </span>
          )}
          {!isDiscarded && !isSuspect && !isTarget && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
          )}
        </div>

        {/* Avatar Central com Efeitos */}
        <div className="relative my-0.5">
          <Avatar
            character={character}
            size={74}
            className={`transition-all duration-300 ${
              isDiscarded ? 'grayscale' : isSuspect ? 'grayscale-[65%] brightness-90' : ''
            }`}
          />

          {/* Efeito Suspeito: Interrogação Vermelha Translúcida (~30% a 50%) */}
          {isSuspect && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-red-500/60 font-black text-6xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] select-none">
                ?
              </span>
            </div>
          )}

          {/* Efeito Descarte: Overlay de Eliminado */}
          {isDiscarded && (
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px] rounded-2xl flex items-center justify-center">
              <span className="bg-red-500/90 text-white font-extrabold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow">
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

      {/* Menu Contextual ao Clicar (3 Opções + Desfazer) */}
      {menuOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-50 -top-2 left-1/2 -translate-x-1/2 -translate-y-full w-44 bg-slate-900 border-2 border-indigo-500/90 rounded-2xl p-2 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 flex flex-col gap-1.5"
        >
          <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>{character.name}</span>
            <button onClick={() => setMenuOpen(false)} className="text-slate-500 hover:text-white">
              <X size={12} />
            </button>
          </div>

          {/* Opção 1: 'É o cara!' */}
          <button
            onClick={() => handleSelectOption('target')}
            className="flex items-center gap-2 w-full p-2 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-black text-xs transition-colors"
          >
            <Target size={14} className="shrink-0" />
            <span>É o cara!</span>
          </button>

          {/* Opção 2: 'Suspeito' */}
          <button
            onClick={() => handleSelectOption('suspect')}
            className={`flex items-center gap-2 w-full p-2 rounded-xl text-xs font-bold transition-colors ${
              isSuspect
                ? 'bg-amber-950 text-amber-400 border border-amber-700'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            <HelpCircle size={14} className="shrink-0 text-red-400" />
            <span>Suspeito</span>
          </button>

          {/* Opção 3: 'Descarte' */}
          <button
            onClick={() => handleSelectOption('discard')}
            className={`flex items-center gap-2 w-full p-2 rounded-xl text-xs font-bold transition-colors ${
              isDiscarded
                ? 'bg-red-950 text-red-400 border border-red-800'
                : 'bg-slate-800 hover:bg-slate-700 text-red-300'
            }`}
          >
            <EyeOff size={14} className="shrink-0 text-red-400" />
            <span>Descarte</span>
          </button>

          {/* Opção F.a: 'Desfazer' (se não estiver normal) */}
          {status !== 'normal' && (
            <button
              onClick={() => handleSelectOption('normal')}
              className="flex items-center gap-2 w-full p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[11px] font-semibold border-t border-slate-800 mt-0.5 transition-colors"
            >
              <RotateCcw size={12} className="shrink-0" />
              <span>Desfazer</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
