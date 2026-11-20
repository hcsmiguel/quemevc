import { useState, type FC } from 'react';
import { Flag, X, Check, Loader2, AlertTriangle } from 'lucide-react';
import { auth, type AppUser } from '../services/auth';
import { sounds } from '../utils/sound';

export interface ReportItemTarget {
  type: 'deck' | 'face';
  id: string;
  name: string;
  authorName?: string;
}

interface ReportModalProps {
  isOpen: boolean;
  item: ReportItemTarget | null;
  currentUser: AppUser | null;
  onClose: () => void;
}

const REPORT_REASONS = [
  'Conteúdo ofensivo, discriminatório ou impróprio',
  'Foto de pessoa sem consentimento ou difamação',
  'Violação de direitos autorais ou imagem protegida',
  'Spam, propaganda ou conteúdo sem sentido',
  'Outro motivo',
];

export const ReportModal: FC<ReportModalProps> = ({
  isOpen,
  item,
  currentUser,
  onClose,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen || !item) return null;

  const handleClose = () => {
    setSelectedReason(REPORT_REASONS[0]);
    setDetails('');
    setSubmitted(false);
    setSubmitting(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason) return;

    sounds.playClick();
    setSubmitting(true);

    try {
      await auth.submitReport({
        contentType: item.type,
        contentId: item.id,
        contentName: item.name,
        authorName: item.authorName,
        reportedBy: currentUser?.username || 'Anônimo',
        reason: selectedReason,
        details: details.trim() || undefined,
      });
      sounds.playWin();
      setSubmitted(true);
    } catch (err) {
      console.warn('Erro ao enviar denúncia:', err);
      // Fallback gracioso
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#382C26]/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-[#E8E0D8] rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-xl animate-in zoom-in-95 relative text-left">
        {/* Botão Fechar */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 text-[#8C786E] hover:text-[#382C26] rounded-xl hover:bg-[#FAF6F0] transition-colors"
        >
          <X size={18} />
        </button>

        {submitted ? (
          <div className="py-6 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-[#FFE8E0] text-[#C25E3E] flex items-center justify-center mb-3 border border-[#FFB59A]/40 shadow-xs">
              <Check size={24} />
            </div>
            <h3 className="text-base font-bold text-[#382C26] mb-1">
              Denúncia Enviada
            </h3>
            <p className="text-xs text-[#8C786E] mb-5 leading-relaxed">
              Obrigado por ajudar a manter a comunidade do <strong>Tá na Cara!</strong> segura e divertida para todos.
            </p>
            <button
              onClick={handleClose}
              className="py-2 px-5 rounded-xl bg-[#382C26] hover:bg-[#2A211C] text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-none"
            >
              Concluir
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="flex items-center gap-2.5 mb-3.5 pr-6">
              <div className="w-9 h-9 rounded-xl bg-[#FFE8E0] text-[#C25E3E] flex items-center justify-center border border-[#FFB59A]/40 shadow-xs shrink-0">
                <Flag size={18} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[#382C26] truncate">
                  Denunciar {item.type === 'deck' ? 'Baralho' : 'Personagem'}
                </h3>
                <p className="text-[11px] text-[#8C786E] truncate">
                  "{item.name}" {item.authorName && `por @${item.authorName}`}
                </p>
              </div>
            </div>

            {/* Aviso informativo */}
            <div className="mb-4 p-3 bg-[#FAF6F0] border border-[#E8E0D8] rounded-2xl flex items-start gap-2.5">
              <AlertTriangle size={15} className="text-[#C25E3E] shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#776156] leading-relaxed">
                Ajude-nos a identificar conteúdos inadequados ou que violem os termos de uso do jogo.
              </p>
            </div>

            {/* Seleção do Motivo */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-[#776156] uppercase tracking-wider mb-2">
                Qual o motivo da denúncia?
              </label>
              <div className="space-y-1.5">
                {REPORT_REASONS.map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer text-xs font-medium ${
                      selectedReason === reason
                        ? 'border-[#C25E3E] bg-[#FFE8E0]/40 text-[#382C26]'
                        : 'border-[#E8E0D8] hover:border-[#D4C7BC] text-[#776156] bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="report_reason"
                      value={reason}
                      checked={selectedReason === reason}
                      onChange={() => setSelectedReason(reason)}
                      className="accent-[#C25E3E] cursor-pointer"
                    />
                    <span className="leading-snug">{reason}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Detalhes opcionais */}
            <div className="mb-5">
              <label className="block text-[11px] font-bold text-[#776156] mb-1">
                Detalhes adicionais (opcional):
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value.slice(0, 250))}
                rows={2}
                placeholder="Descreva brevemente o problema, se achar relevante..."
                className="w-full text-xs bg-[#FAF6F0] border border-[#E8E0D8] rounded-xl p-2.5 focus:outline-none focus:bg-white focus:border-[#C25E3E] transition-colors resize-none placeholder-[#8C786E] text-[#382C26]"
              />
              <div className="text-[10px] text-[#8C786E] text-right mt-0.5">
                {details.length}/250
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="w-1/3 py-2.5 px-3 rounded-xl border border-[#E8E0D8] hover:border-[#D4C7BC] text-[#776156] font-bold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="w-2/3 py-2.5 px-3 rounded-xl bg-[#C25E3E] hover:bg-[#A94E31] text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-none"
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Flag size={14} />
                    <span>Enviar Denúncia</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
