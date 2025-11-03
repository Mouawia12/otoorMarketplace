import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface CountdownTimerProps {
  endDate: string | Date;
  onExpire?: () => void;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function calculateTimeLeft(endDate: string | Date): TimeLeft {
  const end = new Date(endDate).getTime();
  const now = new Date().getTime();
  const difference = end - now;

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    expired: false,
  };
}

export default function CountdownTimer({ endDate, onExpire }: CountdownTimerProps) {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft(endDate));

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(endDate);
      setTimeLeft(newTimeLeft);

      if (newTimeLeft.expired && onExpire) {
        onExpire();
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endDate, onExpire]);

  if (timeLeft.expired) {
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
        {t('auction.endsIn')}
      </div>
      <div
        className="bg-gradient-to-r from-charcoal to-charcoal/90 text-gold px-3 py-2 rounded-lg font-mono font-bold text-center tracking-wider"
        dir="ltr"
      >
        {timeLeft.days > 0 ? (
          <span className="text-sm">
            {timeLeft.days}d {formatNumber(timeLeft.hours)}:{formatNumber(timeLeft.minutes)}:{formatNumber(timeLeft.seconds)}
          </span>
        ) : (
          <span className="text-base">
            {formatNumber(timeLeft.hours)}:{formatNumber(timeLeft.minutes)}:{formatNumber(timeLeft.seconds)}
          </span>
        )}
      </div>
    </div>
  );
}
