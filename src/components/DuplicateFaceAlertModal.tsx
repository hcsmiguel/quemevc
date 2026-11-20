import type { FC } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui/Button';

interface DuplicateFaceAlertModalProps {
  isOpen: boolean;
  faceName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DuplicateFaceAlertModal: FC<DuplicateFaceAlertModalProps> = ({
  isOpen,
  faceName,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2B2420]/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#FBF8F3] border border-[#E2DACD] rounded-2xl p-6 sm:p-7 max-w-sm w-full shadow-lg text-center animate-in zoom-in-95 duration-150">
        <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto mb-3">
          <AlertTriangle size={22} />
        </div>

        <h3 className="font-serif text-lg text-[#2B2420] mb-2">
          Nome já existente
        </h3>

        <p className="text-xs text-[#6F655C] leading-relaxed mb-6">
          O nome utilizado <strong>"{faceName}"</strong> já existe publicamente, talvez o que você esteja procurando esteja disponível. Deseja continuar?
        </p>

        <div className="grid grid-cols-2 gap-2.5">
          <Button
            variant="secondary"
            size="md"
            onClick={onCancel}
            className="w-full"
          >
            Não
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={onConfirm}
            className="w-full"
          >
            Sim
          </Button>
        </div>
      </div>
    </div>
  );
};
