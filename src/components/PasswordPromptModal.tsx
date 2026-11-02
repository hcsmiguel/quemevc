import { useState, type FC } from 'react';
import { Lock, KeyRound, AlertCircle, Loader2 } from 'lucide-react';
import { sounds } from '../utils/sound';

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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border-2 border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95">
        <div className="w-14 h-14 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-tactile-sm">
          <Lock size={28} />
        </div>

        <h3 className="text-lg font-black text-slate-900 text-center mb-1">
          Sala Secreta Protegida
        </h3>
        <p className="text-xs text-slate-500 text-center mb-5 leading-relaxed">
          A sala <strong className="font-mono text-slate-800">#{roomCode}</strong> é secreta e requer uma senha numérica para entrar:
        </p>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2 font-bold animate-shake">
            <AlertCircle size={16} className="shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mb-5">
          <div>
            <label className="block text-[11px] font-extrabold text-slate-700 uppercase mb-1.5 text-center">
              Digite a Senha Numérica:
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Ex: 1234"
                autoFocus
                className="w-full bg-slate-50 border-2 border-slate-200 text-slate-900 font-mono font-black placeholder-slate-400 text-lg tracking-[0.25em] text-center rounded-2xl px-4 py-2.5 focus:outline-none focus:bg-white focus:border-amber-400 focus:ring-4 focus:ring-amber-100 transition-all"
              />
              <KeyRound
                size={16}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!password.trim() || isLoading}
              className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-extrabold text-xs shadow-tactile-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : null}
              <span>Entrar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
