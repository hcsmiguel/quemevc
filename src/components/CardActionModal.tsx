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
      className="fixed inset-0 z-50 bg-[#382C26]/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl border border-[#E8E0D8] p-5 sm:p-6 shadow-xl flex flex-col gap-4 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        style={{ touchAction: 'manipulation' }}
      >
        {/* Barra superior de puxar no celular */}
        <div className="w-12 h-1 bg-[#E8E0D8] rounded-full mx-auto sm:hidden -mt-1 mb-1" />

        {/* Cabeçalho do Personagem */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E8E0D8]">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar
                character={character}
                size={58}
                className={`ring-2 rounded-2xl ${
                  isDiscarded
                    ? 'ring-[#8C786E]/40 grayscale'
                    : isSuspect
                    ? 'ring-[#C25E3E]'
                    : 'ring-[#E8E0D8]'
                }`}
              />
              {isDiscarded && (
                <div className="absolute inset-0 bg-[#382C26]/40 rounded-2xl flex items-center justify-center">
                  <EyeOff size={20} className="text-white drop-shadow" />
                </div>
              )}
              {isSuspect && (
                <div className="absolute -top-1.5 -right-1.5 bg-[#C25E3E] text-white font-bold text-xs w-6 h-6 rounded-full flex items-center justify-center shadow-xs ring-2 ring-white">
                  ?
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-bold text-[#382C26] tracking-tight leading-tight">
                {character.name}
              </h3>
              <div className="flex items-center gap-1.5 mt-1">
                {isDiscarded ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FAF6F0] text-[#8C786E] border border-[#E8E0D8]">
                    <EyeOff size={11} /> Descarte
                  </span>
                ) : isSuspect ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFE8E0] text-[#C25E3E] border border-[#FFB59A]">
                    <HelpCircle size={11} /> Suspeito
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FAF6F0] text-[#776156] border border-[#E8E0D8]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#776156]" /> Ativo
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#8C786E] hover:text-[#382C26] rounded-xl hover:bg-[#FAF6F0] transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Botões Principais: "Suspeito" e "Descarte" */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Botão Suspeito */}
          <button
            type="button"
            onClick={handleToggleSuspect}
            className={`flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all border cursor-pointer ${
              isSuspect
                ? 'bg-[#FFE8E0] text-[#C25E3E] border-[#C25E3E]'
                : 'bg-[#FAF6F0] hover:bg-[#FFE8E0]/40 text-[#776156] border-[#E8E0D8]'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSuspect ? 'bg-[#C25E3E] text-white' : 'bg-white text-[#C25E3E] border border-[#E8E0D8]'}`}>
              <HelpCircle size={20} />
            </div>
            <span>Suspeito</span>
          </button>

          {/* Botão Descarte */}
          <button
            type="button"
            onClick={handleToggleDiscard}
            className={`flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all border cursor-pointer ${
              isDiscarded
                ? 'bg-[#382C26] text-white border-[#382C26]'
                : 'bg-[#FAF6F0] hover:bg-[#E8E0D8] text-[#776156] border-[#E8E0D8]'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDiscarded ? 'bg-white/20 text-white' : 'bg-white text-[#776156] border border-[#E8E0D8]'}`}>
              <EyeOff size={20} />
            </div>
            <span>Descarte</span>
          </button>
        </div>

        {/* Botão Resetar para Normal (apenas se alterado) */}
        {(isSuspect || isDiscarded) && (
          <button
            type="button"
            onClick={handleResetToNormal}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-[#8C786E] hover:text-[#382C26] hover:bg-[#FAF6F0] flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-[#E8E0D8]"
          >
            <RotateCcw size={13} />
            <span>Restaurar para Ativo</span>
          </button>
        )}
      </div>
    </div>
  );
};
