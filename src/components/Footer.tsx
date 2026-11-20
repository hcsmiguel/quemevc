import type { FC } from 'react';

interface FooterProps {
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
}

export const Footer: FC<FooterProps> = ({ onOpenPrivacy, onOpenTerms }) => {
  return (
    <footer className="w-full border-t border-[#E2DACD] bg-[#F6F2EA]/90 mt-auto py-6 px-4 text-xs text-[#6F655C] transition-colors">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        {/* Identificação e Lema */}
        <div>
          <span className="font-serif text-sm text-[#2B2420] block">
            Tá na Cara! Mas de quem?!
          </span>
          <p className="text-[11px] text-[#6F655C]">
            O clássico jogo de adivinhação, feito para jogar a dois em tempo real
          </p>
        </div>

        {/* Links Legais */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
          <button
            onClick={onOpenPrivacy}
            className="hover:text-[#2B2420] underline transition-colors cursor-pointer"
          >
            Política de Privacidade
          </button>

          <span className="text-[#E2DACD]">·</span>

          <button
            onClick={onOpenTerms}
            className="hover:text-[#2B2420] underline transition-colors cursor-pointer"
          >
            Termos e Condições
          </button>
        </div>

        {/* Créditos */}
        <div className="text-[11px] text-[#6F655C]">
          <span>
            Feito por <strong className="font-medium text-[#2B2420]">Miguel Carvalho</strong>
          </span>
        </div>
      </div>
    </footer>
  );
};
