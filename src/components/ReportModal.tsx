import { useState, type FC } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import { auth, type AppUser } from '../services/auth';
import { Button } from './ui/Button';

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
      setSubmitted(true);
    } catch (err) {
      console.warn('Erro ao enviar denúncia:', err);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      className="fixed inset-0 z-50 bg-[#2B2420]/45 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div className="bg-[#FBF8F3] border border-[#E2DACD] rounded-[12px] max-w-sm w-full p-5 sm:p-6 shadow-xl relative text-left">
        {/* Botão Fechar */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Fechar modal"
          className="absolute top-4 right-4 p-1.5 text-[#6F655C] hover:text-[#2B2420] rounded-[6px] transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>

        {submitted ? (
          <div className="py-4 text-center flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-[#2B2420] text-white flex items-center justify-center mb-3">
              <Check size={20} />
            </div>
            <h3 className="font-serif text-lg text-[#2B2420] font-normal mb-1">
              Denúncia enviada
            </h3>
            <p className="text-xs font-sans text-[#6F655C] mb-5 leading-relaxed">
              Obrigado por ajudar a manter a comunidade do Tá na Cara! segura para todos.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleClose}
            >
              Concluir
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="mb-4 pr-6">
              <h3 id="report-modal-title" className="font-serif text-lg text-[#2B2420] font-normal leading-snug">
                Denunciar {item.type === 'deck' ? 'baralho' : 'personagem'}
              </h3>
              <p className="text-xs font-sans text-[#6F655C] truncate mt-0.5">
                "{item.name}" {item.authorName && `· por ${item.authorName}`}
              </p>
            </div>

            {/* Seleção do Motivo */}
            <div className="mb-4">
              <label className="block text-xs font-sans font-medium text-[#2B2420] mb-2">
                Qual o motivo da denúncia?
              </label>
              <div className="space-y-1.5">
                {REPORT_REASONS.map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center gap-2 p-2 rounded-[6px] border transition-colors cursor-pointer text-xs font-sans ${
                      selectedReason === reason
                        ? 'border-[#2B2420] bg-white text-[#2B2420] font-medium'
                        : 'border-[#E2DACD] hover:border-[#6F655C] text-[#6F655C] bg-[#FBF8F3]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="report_reason"
                      value={reason}
                      checked={selectedReason === reason}
                      onChange={() => setSelectedReason(reason)}
                      className="accent-[#2B2420] cursor-pointer"
                    />
                    <span className="leading-snug">{reason}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Detalhes opcionais */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-sans text-[#6F655C]">
                  Detalhes adicionais (opcional):
                </label>
                <span className="text-[10px] font-mono text-[#A39A90]">
                  {details.length}/250
                </span>
              </div>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value.slice(0, 250))}
                rows={2}
                placeholder="Descreva brevemente o problema, se desejar..."
                className="w-full text-xs font-sans bg-white border border-[#E2DACD] focus:border-[#2B2420] rounded-[6px] p-2.5 outline-none transition-colors resize-none placeholder-[#A39A90] text-[#2B2420]"
              />
            </div>

            {/* Ações */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#E2DACD]/60">
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="text-xs font-sans text-[#6F655C] hover:text-[#2B2420] underline cursor-pointer py-1.5"
              >
                Cancelar
              </button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 size={13} className="animate-spin mr-1.5" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <span>Enviar denúncia</span>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
