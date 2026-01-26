import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useCountdown } from '../../hooks/useCountdown';

interface CountdownTimerProps {
  endDate: string | Date | number;
  startDate?: string | Date | number;
  onExpire?: () => void;
}

export default function CountdownTimer({ endDate, startDate, onExpire }: CountdownTimerProps) {
  const { t } = useTranslation();
  const hasExpiredRef = useRef(false);
  const normalizedStartDate =
    startDate instanceof Date ? startDate.getTime() : startDate ?? undefined;
  const normalizedEndDate = endDate instanceof Date ? endDate.getTime() : endDate;
  const { days, hours, minutes, seconds, status } = useCountdown({
    startAt: normalizedStartDate,
    endAt: normalizedEndDate,
  });

  useEffect(() => {
    if (status === 'ended' && onExpire && !hasExpiredRef.current) {
      hasExpiredRef.current = true;
      onExpire();
    }
    if (status !== 'ended') {
      hasExpiredRef.current = false;
    }
  }, [status, onExpire]);

  if (status === 'ended') {
    return (
      <div className="bg-charcoal text-ivory px-3 py-2 rounded-lg text-center font-semibold text-sm">
        {t('auction.expired')}
      </div>
    );
  }

  const formatNumber = (num: number) => String(num).padStart(2, '0');

  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs text-taupe font-medium">
        {status === 'scheduled' ? t('auction.startsIn') : t('auction.endsIn')}
      </div>
      <div
        className="bg-gradient-to-r from-charcoal to-charcoal/90 text-gold px-3 py-2 rounded-lg font-mono font-bold text-center tracking-wider"
        dir="ltr"
      >
        {days > 0 ? (
          <span className="text-sm">
            {days}d {formatNumber(hours)}:{formatNumber(minutes)}:{formatNumber(seconds)}
          </span>
        ) : (
          <span className="text-base">
            {formatNumber(hours)}:{formatNumber(minutes)}:{formatNumber(seconds)}
          </span>
        )}
      </div>
    </div>
  );
}
