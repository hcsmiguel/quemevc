import { useState, type FC, type FormEvent } from 'react';
import { auth, type AppUser } from '../services/auth';
import { User, Lock, LogIn, UserPlus, X, AlertCircle } from 'lucide-react';
import { sounds } from '../utils/sound';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AppUser) => void;
}

export const LoginModal: FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      let user: AppUser;
      if (isRegister) {
        user = await auth.register(username, password);
      } else {
        user = await auth.login(username, password);
      }
      sounds.playWin();
      onLoginSuccess(user);
      onClose();
    } catch (err: any) {
      sounds.playWrong();
      setErrorMsg(err.message || 'Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border-2 border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center shadow-tactile-sm">
              {isRegister ? <UserPlus size={18} /> : <LogIn size={18} />}
            </div>
            <h3 className="text-base font-extrabold text-slate-900">
              {isRegister ? 'Criar Conta' : 'Entrar no Jogo'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Abas Entrar / Criar Conta */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-4 border border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 rounded-lg transition-all ${
              !isRegister ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 rounded-lg transition-all ${
              isRegister ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Cadastrar
          </button>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 mb-4 flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
              Nome de Usuário:
            </label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Seu usuário"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-slate-50 border-2 border-slate-200 text-slate-900 placeholder-slate-400 text-xs font-semibold rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
              Senha:
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="password"
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-slate-50 border-2 border-slate-200 text-slate-900 placeholder-slate-400 text-xs font-semibold rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider shadow-[0_3px_0_#0284c7] transition-all active:translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? 'Carregando...' : isRegister ? 'Criar Minha Conta' : 'Entrar no Jogo'}
          </button>
        </form>
      </div>
    </div>
  );
};
