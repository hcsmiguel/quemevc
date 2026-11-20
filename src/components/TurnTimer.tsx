import { useEffect, useRef, type FC } from 'react';
import { Clock } from 'lucide-react';

interface TurnTimerProps {
  timeLeft: number;
  totalTime?: number;
  isOpponent?: boolean;
  className?: string;
}

export const TurnTimer: FC<TurnTimerProps> = ({
  timeLeft,
  totalTime = 60,
  isOpponent = false,
  className = '',
}) => {
  const isUrgent = timeLeft <= 10 && timeLeft > 0;
  const isExpired = timeLeft === 0;

  // Formato: "0:33"
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes}:${String(seconds).padStart(2, '0')}`;

  const pct = Math.min(100, Math.max(0, (timeLeft / totalTime) * 100));

  // Acessibilidade
  const announcedMilestonesRef = useRef<{ [key: number]: boolean }>({});
  useEffect(() => {
    if (timeLeft > 35) {
      announcedMilestonesRef.current = {};
    }
  }, [timeLeft]);

  let liveAnnouncement = '';
  if (timeLeft === 30 && !announcedMilestonesRef.current[30]) {
    liveAnnouncement = 'Restam 30 segundos';
    announcedMilestonesRef.current[30] = true;
  } else if (timeLeft === 10 && !announcedMilestonesRef.current[10]) {
    liveAnnouncement = 'Atenção: restam 10 segundos';
    announcedMilestonesRef.current[10] = true;
  } else if (timeLeft === 0 && !announcedMilestonesRef.current[0]) {
    liveAnnouncement = 'Tempo esgotado';
    announcedMilestonesRef.current[0] = true;
  }

  return (
    <div
      className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] border text-xs font-sans tracking-tight transition-colors shrink-0 ${
        isUrgent || isExpired
          ? 'bg-[#F8EBEA] text-[#8C2E2A] border-[#ECC7C5]'
          : isOpponent
          ? 'bg-[#F6F2EA] text-[#6F655C] border-[#E2DACD]'
          : 'bg-[#F6F2EA] text-[#2B2420] border-[#E2DACD]'
      } ${className}`}
      title={isUrgent ? 'Tempo quase esgotado!' : 'Tempo restante'}
    >
      {liveAnnouncement && (
        <span className="sr-only" aria-live="polite">
          {liveAnnouncement}
        </span>
      )}

      <Clock
        size={12}
        className={`shrink-0 ${
          isUrgent ? 'text-[#8C2E2A]' : isOpponent ? 'text-[#6F655C]' : 'text-[#B4532F]'
        }`}
      />

      <span
        className={`tabular-nums font-mono ${
          isUrgent ? 'font-bold text-[#8C2E2A]' : 'font-medium'
        }`}
      >
        {formattedTime}
      </span>

      {/* Barra fina de progresso integrada */}
      <div className="w-10 sm:w-12 h-1 bg-[#E2DACD] rounded-full overflow-hidden ml-0.5">
        <div
          className={`h-full transition-[width] duration-300 ease-linear motion-reduce:transition-none ${
            isUrgent ? 'bg-[#8C2E2A]' : isOpponent ? 'bg-[#6F655C]' : 'bg-[#B4532F]'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};
