import type { FC } from 'react';
import { Shield, FileText, Heart } from 'lucide-react';

interface FooterProps {
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
}

export const Footer: FC<FooterProps> = ({ onOpenPrivacy, onOpenTerms }) => {
  return (
    <footer className="w-full border-t border-slate-200/80 bg-white/70 backdrop-blur-sm mt-auto py-6 px-4 text-xs text-slate-500 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Identificação e Lema */}
        <div className="flex items-center gap-2.5 text-center sm:text-left">
          <img
            src="/logo-icon.svg"
            alt="Tá na Cara!"
            className="w-8 h-8 object-contain"
          />
          <div>
            <div className="font-extrabold text-slate-800 tracking-tight flex items-center gap-1.5">
              <span>Tá na Cara!</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                100% Livre
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Jogo de adivinhação para 2 jogadores em tempo real • Sem anúncios
            </p>
          </div>
        </div>

        {/* Links Legais e de Ajuda */}
        <div className="flex flex-wrap items-center justify-center gap-3 font-semibold text-slate-600">
          <button
            onClick={onOpenPrivacy}
            className="flex items-center gap-1.5 hover:text-slate-900 transition-colors py-1 px-2 rounded-lg hover:bg-slate-100"
          >
            <Shield size={13} className="text-emerald-600" />
            <span>Política de Privacidade</span>
          </button>

          <span className="text-slate-300">•</span>

          <button
            onClick={onOpenTerms}
            className="flex items-center gap-1.5 hover:text-slate-900 transition-colors py-1 px-2 rounded-lg hover:bg-slate-100"
          >
            <FileText size={13} className="text-sky-600" />
            <span>Termos e Condições</span>
          </button>
        </div>

        {/* Status de Conexão e Amor */}
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-slate-600">WebSockets TLS Online</span>
          </div>
          <span className="hidden md:inline-flex items-center gap-1 text-slate-400">
            Feito com <Heart size={12} className="text-rose-500 fill-rose-500" />
          </span>
        </div>
      </div>
    </footer>
  );
};