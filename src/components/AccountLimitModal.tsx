import type { FC } from 'react';
import { AlertCircle, Layers, Smile } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 bg-[#382C26]/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-[#E8E0D8] rounded-3xl max-w-sm w-full p-6 shadow-xl text-center animate-in zoom-in-95 flex flex-col items-center">
        {/* Ícone */}
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3.5 bg-[#FFE8E0] text-[#C25E3E] border border-[#FFB59A]/40 shadow-xs">
          {isDeck ? <Layers size={26} /> : <Smile size={26} />}
        </div>

        {/* Tag de Alerta */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFE8E0] border border-[#FFB59A] text-[#C25E3E] text-xs font-bold uppercase tracking-wider mb-2">
          <AlertCircle size={13} />
          <span>Limite da Conta Atingido</span>
        </div>

        {/* Título */}
        <h3 className="text-base sm:text-lg font-bold text-[#382C26] mb-2 leading-tight">
          {isDeck ? 'Máximo de 10 Baralhos Salvos' : 'Máximo de 360 Caras Salvas'}
        </h3>

        {/* Descrição */}
        <p className="text-xs text-[#8C786E] leading-relaxed mb-6">
          {isDeck
            ? 'Você já possui o limite de 10 baralhos salvos no seu perfil. Para criar ou salvar um novo baralho, você precisa excluir ou editar algum baralho antigo.'
            : 'Você já possui o limite de 360 caras salvas no seu perfil. Para cadastrar novas caras, exclua as fotos que não utiliza mais.'}
        </p>

        {/* Botões */}
        <div className="w-full flex flex-col gap-2">
          {onGoToProfile && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onGoToProfile();
              }}
              className="w-full py-3 px-4 rounded-xl bg-[#C25E3E] hover:bg-[#A94E31] text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-none"
            >
              Gerenciar no Meu Perfil
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl text-[#8C786E] hover:text-[#382C26] font-bold text-xs transition-colors cursor-pointer"
          >
            Entendi, Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
