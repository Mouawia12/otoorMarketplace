import { useTranslation } from 'react-i18next';
import { useCountdown } from '../../hooks/useCountdown';

interface CountdownProps {
  startAt?: string | number;
  endAt: string | number;
  className?: string;
  compact?: boolean;
}

export default function Countdown({ startAt, endAt, className = '', compact = false }: CountdownProps) {
  const { t } = useTranslation();
  const { days, hours, minutes, seconds, status } = useCountdown({ startAt, endAt });

  if (status === 'ended') {
    return (
      <div className={`text-taupe ${className}`}>
        {t('auction.ended')}
      </div>
    );
  }

  const formatTime = (value: number) => value.toString().padStart(2, '0');

  if (compact) {
    if (status === 'scheduled') {
      return (
        <div className={`font-mono ${className}`}>
          {days > 0 && `${days}d `}
          {formatTime(hours)}:{formatTime(minutes)}:{formatTime(seconds)}
        </div>
      );
    }
    
    return (
      <div className={`font-mono ${className}`}>
        {days > 0 && `${days}d `}
        {formatTime(hours)}:{formatTime(minutes)}:{formatTime(seconds)}
      </div>
    );
  }

  return (
    <div className={className}>
      {status === 'scheduled' && (
        <p className="text-sm text-taupe mb-2">{t('auction.startsIn')}</p>
      )}
      <div className="flex gap-2 font-mono text-lg">
        {days > 0 && (
          <>
            <div className="text-center">
              <div className="font-bold">{formatTime(days)}</div>
              <div className="text-xs text-taupe">{t('auction.days')}</div>
            </div>
            <div className="font-bold">:</div>
          </>
        )}
        <div className="text-center">
          <div className="font-bold">{formatTime(hours)}</div>
          <div className="text-xs text-taupe">{t('auction.hours')}</div>
        </div>
        <div className="font-bold">:</div>
        <div className="text-center">
          <div className="font-bold">{formatTime(minutes)}</div>
          <div className="text-xs text-taupe">{t('auction.mins')}</div>
        </div>
        <div className="font-bold">:</div>
        <div className="text-center">
          <div className="font-bold">{formatTime(seconds)}</div>
          <div className="text-xs text-taupe">{t('auction.secs')}</div>
        </div>
      </div>
    </div>
  );
}
