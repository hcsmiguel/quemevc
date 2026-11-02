import type { FC } from 'react';
import type { Character, CardStatus } from '../types/game';
import { Avatar } from './Avatar';
import { HelpCircle, EyeOff, RotateCcw, X } from 'lucide-react';
import { sounds } from '../utils/sound';

interface CardActionModalProps {
  character: Character | null;
  status: CardStatus;
  onSetStatus: (characterId: string, newStatus: CardStatus) => void;
  onClose: () => void;
}

export const CardActionModal: FC<CardActionModalProps> = ({
  character,
  status,
  onSetStatus,
  onClose,
}) => {
  if (!character) return null;

  const isSuspect = status === 'suspect';
  const isDiscarded = status === 'discard';

  const handleToggleSuspect = () => {
    const nextStatus: CardStatus = isSuspect ? 'normal' : 'suspect';
    sounds.playClick();
    onSetStatus(character.id, nextStatus);
    onClose();
  };

  const handleToggleDiscard = () => {
    const nextStatus: CardStatus = isDiscarded ? 'normal' : 'discard';
    sounds.playFlip(!isDiscarded);
    onSetStatus(character.id, nextStatus);
    onClose();
  };

  const handleResetToNormal = () => {
    sounds.playFlip(false);
    onSetStatus(character.id, 'normal');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl border-t-2 sm:border-2 border-slate-200 p-5 sm:p-6 shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        style={{ touchAction: 'manipulation' }}
      >
        {/* Barra superior de puxar no celular */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto sm:hidden -mt-1 mb-1" />

        {/* Cabeçalho do Personagem */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar
                character={character}
                size={58}
                className={`ring-2 ${
                  isDiscarded
                    ? 'ring-rose-400 grayscale'
                    : isSuspect
                    ? 'ring-amber-400'
                    : 'ring-sky-400'
                }`}
              />
              {isDiscarded && (
                <div className="absolute inset-0 bg-rose-950/40 rounded-2xl flex items-center justify-center">
                  <EyeOff size={20} className="text-white drop-shadow" />
                </div>
              )}
              {isSuspect && (
                <div className="absolute -top-1.5 -right-1.5 bg-amber-400 text-amber-950 font-black text-xs w-6 h-6 rounded-full flex items-center justify-center shadow-md ring-2 ring-white">
                  ?
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight leading-tight">
                {character.name}
              </h3>
              <div className="flex items-center gap-1.5 mt-1">
                {isDiscarded ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                    <EyeOff size={11} /> Descartado / Virado
                  </span>
                ) : isSuspect ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                    <HelpCircle size={11} /> Marcado como Suspeito
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Ativo no Tabuleiro
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Botões Principais Requisitados: "Suspeito" e "Descarte" */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Botão Suspeito */}
          <button
            type="button"
            onClick={handleToggleSuspect}
            className={`flex flex-col items-center justify-center gap-1.5 py-3.5 px-3 rounded-2xl font-black text-sm uppercase tracking-wider transition-all border-2 active:scale-95 shadow-sm cursor-pointer ${
              isSuspect
                ? 'bg-amber-100 text-amber-950 border-amber-400 ring-2 ring-amber-300 shadow-amber-100'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSuspect ? 'bg-amber-400 text-amber-950' : 'bg-amber-200 text-amber-800'}`}>
              <HelpCircle size={22} />
            </div>
            <span>Suspeito</span>
            <span className="text-[10px] font-bold text-amber-700 lowercase">
              {isSuspect ? '(desmarcar ?)' : '(marcar ?)'}
            </span>
          </button>

          {/* Botão Descarte */}
          <button
            type="button"
            onClick={handleToggleDiscard}
            className={`flex flex-col items-center justify-center gap-1.5 py-3.5 px-3 rounded-2xl font-black text-sm uppercase tracking-wider transition-all border-2 active:scale-95 shadow-sm cursor-pointer ${
              isDiscarded
                ? 'bg-rose-100 text-rose-950 border-rose-400 ring-2 ring-rose-300 shadow-rose-100'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-900 border-rose-200'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDiscarded ? 'bg-rose-500 text-white' : 'bg-rose-200 text-rose-800'}`}>
              <EyeOff size={22} />
            </div>
            <span>Descarte</span>
            <span className="text-[10px] font-bold text-rose-700 lowercase">
              {isDiscarded ? '(desvirar)' : '(virar carta)'}
            </span>
          </button>
        </div>

        {/* Botão Restaurar ao Normal se o card tiver qualquer marcação */}
        {(isSuspect || isDiscarded) && (
          <button
            type="button"
            onClick={handleResetToNormal}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs uppercase tracking-wider border border-slate-200 transition-colors cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>Voltar ao Normal</span>
          </button>
        )}

        {/* Botão Fechar */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl text-slate-500 hover:text-slate-800 font-extrabold text-xs uppercase tracking-wider transition-colors cursor-pointer"
        >
          Fechar
        </button>
      </div>
    </div>
  );
};
