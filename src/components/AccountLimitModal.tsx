import type { FC } from 'react';
import { Button } from './ui/Button';

interface AccountLimitModalProps {
  isOpen: boolean;
  type: 'deck' | 'face';
  onClose: () => void;
  onGoToProfile?: () => void;
}

export const AccountLimitModal: FC<AccountLimitModalProps> = ({
  isOpen,
  type,
  onClose,
  onGoToProfile,
}) => {
  if (!isOpen) return null;

  const isDeck = type === 'deck';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-limit-title"
      className="fixed inset-0 z-50 bg-[#2B2420]/45 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div className="bg-[#FBF8F3] border border-[#E2DACD] rounded-[12px] max-w-sm w-full p-5 sm:p-6 shadow-xl text-center relative flex flex-col items-center">
        {/* Título */}
        <h3 id="account-limit-title" className="font-serif text-lg text-[#2B2420] font-normal mb-2 leading-snug">
          {isDeck ? 'Limite de 10 baralhos atingido' : 'Limite de 360 cartas atingido'}
        </h3>

        {/* Descrição */}
        <p className="text-xs font-sans text-[#6F655C] leading-relaxed mb-6">
          {isDeck
            ? 'Você já possui o limite de 10 baralhos salvos no seu perfil. Para criar ou salvar um novo baralho, é necessário excluir algum baralho antigo.'
            : 'Você já possui o limite de 360 cartas salvas no seu perfil. Para cadastrar ou salvar novas cartas, exclua as que não utiliza mais.'}
        </p>

        {/* Botões */}
        <div className="w-full flex items-center justify-end gap-3 pt-2 border-t border-[#E2DACD]/60">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-sans text-[#6F655C] hover:text-[#2B2420] underline cursor-pointer py-1.5"
          >
            Fechar
          </button>
          {onGoToProfile && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                onClose();
                onGoToProfile();
              }}
            >
              Gerenciar no perfil
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
