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
        details: details.trim(),
      });

      setSubmitted(true);
      sounds.playWin();
      setTimeout(() => {
        handleClose();
      }, 2500);
    } catch {
      sounds.playWrong();
      setSubmitting(false);
    }
  };

  const isDeck = item.type === 'deck';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white border-2 border-slate-200 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative animate-in zoom-in-95">
        {/* Botão fechar */}
        <button
          onClick={handleClose}
          disabled={submitting}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {submitted ? (
          <div className="text-center py-6 flex flex-col items-center animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 shadow-tactile-sm">
              <Check size={28} />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-1.5">
              Denúncia Enviada!
            </h3>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              Obrigado pela sua colaboração! Nossa equipe irá revisar o conteúdo para garantir um ambiente seguro e divertido para todos.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Header com ícone sutil de Flag */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
                <Flag size={20} />
              </div>
              <div className="min-w-0 pr-6">
                <h3 className="text-base font-black text-slate-900 leading-tight">
                  Denunciar Conteúdo
                </h3>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  {isDeck ? 'Baralho' : 'Personagem'}: <strong className="text-slate-700">{item.name}</strong>
                  {item.authorName && (
                    <span> (por {item.authorName})</span>
                  )}
                </p>
              </div>
            </div>

            {/* Aviso informativo */}
            <div className="mb-4 p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-start gap-2.5">
              <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Ajude-nos a identificar conteúdos inadequados, que violem termos de uso ou contenham material ofensivo.
              </p>
            </div>

            {/* Seleção do Motivo */}
            <div className="mb-4">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                Qual o motivo da denúncia?
              </label>
              <div className="space-y-1.5">
                {REPORT_REASONS.map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border-2 transition-all cursor-pointer text-xs font-semibold ${
                      selectedReason === reason
                        ? 'border-rose-400 bg-rose-50/60 text-rose-950 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="report_reason"
                      value={reason}
                      checked={selectedReason === reason}
                      onChange={() => setSelectedReason(reason)}
                      className="accent-rose-600 cursor-pointer"
                    />
                    <span className="leading-snug">{reason}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Detalhes opcionais */}
            <div className="mb-5">
              <label className="block text-[11px] font-black text-slate-600 mb-1">
                Detalhes adicionais (opcional):
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value.slice(0, 250))}
                rows={2}
                placeholder="Descreva brevemente o problema, se achar relevante..."
                className="w-full text-xs bg-slate-50 border-2 border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-rose-400 transition-colors resize-none placeholder-slate-400 text-slate-800"
              />
              <div className="text-[10px] text-slate-400 text-right mt-0.5">
                {details.length}/250
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="w-1/3 py-2.5 px-3 rounded-xl border-2 border-slate-200 hover:border-slate-300 text-slate-600 font-extrabold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="w-2/3 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-tactile-sm transition-all active:translate-y-0.5 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
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
