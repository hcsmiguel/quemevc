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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white border-2 border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center animate-in zoom-in-95 flex flex-col items-center">
        {/* Ícone */}
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3.5 shadow-tactile-sm ${
            isDeck ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
          }`}
        >
          {isDeck ? <Layers size={28} /> : <Smile size={28} />}
        </div>

        {/* Tag de Alerta */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-black uppercase tracking-wider mb-2">
          <AlertCircle size={13} />
          <span>Limite da Conta Atingido</span>
        </div>

        {/* Título */}
        <h3 className="text-base sm:text-lg font-black text-slate-900 mb-2 leading-tight">
          {isDeck ? 'Máximo de 10 Baralhos Salvos' : 'Máximo de 200 Caras Salvas'}
        </h3>

        {/* Descrição */}
        <p className="text-xs text-slate-500 leading-relaxed mb-6">
          {isDeck
            ? 'Você já possui o limite de 10 baralhos salvos no seu perfil. Para criar ou salvar um novo baralho, você precisa excluir ou editar algum baralho antigo.'
            : 'Você já possui o limite de 200 caras salvas no seu perfil. Para cadastrar novas caras, exclua as fotos que não utiliza mais.'}
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
              className="w-full py-3 px-4 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-[0_3px_0_#4338ca] transition-all active:translate-y-0.5 cursor-pointer"
            >
              Gerenciar no Meu Perfil
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl text-slate-500 hover:text-slate-800 font-extrabold text-xs transition-colors cursor-pointer"
          >
            Entendi, Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
