import { useState, type FC } from 'react';
import { sounds } from '../utils/sound';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface PasswordPromptModalProps {
  roomCode: string;
  isOpen: boolean;
  onConfirm: (password: string) => void;
  onClose: () => void;
  isLoading?: boolean;
  errorMessage?: string | null;
}

export const PasswordPromptModal: FC<PasswordPromptModalProps> = ({
  roomCode,
  isOpen,
  onConfirm,
  onClose,
  isLoading = false,
  errorMessage = null,
}) => {
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!password.trim()) return;
    sounds.playClick();
    onConfirm(password.trim());
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#2B2420]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FBF8F3] border border-[#E2DACD] rounded-[10px] max-w-sm w-full p-6 shadow-xl animate-in zoom-in-95 text-center">
        <h3 className="font-serif text-2xl font-normal text-[#2B2420] mb-1">
          Sala protegida
        </h3>
        <p className="text-xs text-[#6F655C] font-sans mb-5 leading-relaxed">
          A sala <strong className="font-mono text-[#2B2420]">#{roomCode}</strong> requer senha para entrar:
        </p>

        {errorMessage && (
          <div className="mb-4 p-2.5 rounded-[4px] bg-[#F8EBEA] border border-[#ECC7C5] text-xs text-[#8C2E2A] text-left">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mb-2">
          <div>
            <label className="block text-xs font-medium text-[#6F655C] mb-1.5 text-left">
              Senha da sala
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite a senha"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="flex-1"
              disabled={isLoading}
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="flex-1"
              disabled={!password.trim() || isLoading}
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
