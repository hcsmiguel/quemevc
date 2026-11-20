import { useState, type FC, type FormEvent } from 'react';
import { auth, type AppUser } from '../services/auth';
import { X, AlertCircle } from 'lucide-react';
import { sounds } from '../utils/sound';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

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

  const handleOAuthLogin = async (provider: 'google' | 'discord') => {
    setErrorMsg(null);
    sounds.playClick();
    try {
      if (provider === 'google') {
        await auth.loginWithGoogle();
      } else {
        await auth.loginWithDiscord();
      }
    } catch (err: any) {
      sounds.playWrong();
      setErrorMsg(err.message || `Falha ao conectar com ${provider}.`);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-[#2B2420]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FBF8F3] border border-[#E2DACD] rounded-[10px] max-w-sm w-full p-6 shadow-xl animate-in zoom-in-95 text-left">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E2DACD] pb-3 mb-4">
          <h3 className="font-serif text-xl font-normal text-[#2B2420]">
            {isRegister ? 'Criar conta' : 'Entrar no jogo'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-[#6F655C] hover:text-[#2B2420] cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-[4px] bg-[#F8EBEA] border border-[#ECC7C5] text-xs text-[#8C2E2A] mb-4 flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0 text-[#8C2E2A]" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Botões de Login Social */}
        <div className="space-y-2 mb-4">
          <button
            type="button"
            onClick={() => handleOAuthLogin('discord')}
            className="w-full py-2.5 px-4 rounded-[6px] bg-[#5865F2] hover:bg-[#4752C4] text-white font-sans font-medium text-xs flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            <span>Continuar com Discord</span>
          </button>

          <button
            type="button"
            onClick={() => handleOAuthLogin('google')}
            className="w-full py-2 px-4 rounded-[6px] bg-white hover:bg-[#F2ECE1] text-[#2B2420] font-sans font-medium text-xs flex items-center justify-center gap-2.5 transition-colors border border-[#E2DACD] cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continuar com Google</span>
          </button>
        </div>

        {/* Divisor */}
        <div className="relative flex items-center justify-center my-4">
          <div className="border-t border-[#E2DACD] w-full" />
          <span className="bg-[#FBF8F3] px-2 text-[10px] text-[#A39A90] font-sans absolute">
            ou usuário e senha
          </span>
        </div>

        {/* Alternância Entrar / Criar Conta */}
        <div className="flex border-b border-[#E2DACD] mb-4 text-xs">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setErrorMsg(null);
            }}
            className={`flex-1 pb-2 font-sans transition-colors cursor-pointer text-center relative ${
              !isRegister ? 'text-[#2B2420] font-semibold' : 'text-[#6F655C]'
            }`}
          >
            <span>Entrar</span>
            {!isRegister && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2B2420]" />}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setErrorMsg(null);
            }}
            className={`flex-1 pb-2 font-sans transition-colors cursor-pointer text-center relative ${
              isRegister ? 'text-[#2B2420] font-semibold' : 'text-[#6F655C]'
            }`}
          >
            <span>Cadastrar</span>
            {isRegister && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2B2420]" />}
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[#6F655C] mb-1">
              Nome de Usuário
            </label>
            <Input
              type="text"
              placeholder="Seu usuário"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6F655C] mb-1">
              Senha
            </label>
            <Input
              type="password"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            size="md"
            variant="primary"
            disabled={loading}
            className="w-full mt-2"
          >
            {loading ? 'Carregando...' : isRegister ? 'Criar conta' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  );
};
