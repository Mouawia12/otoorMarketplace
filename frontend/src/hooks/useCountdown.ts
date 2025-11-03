import { useState, useEffect } from 'react';

export type CountdownStatus = 'scheduled' | 'running' | 'ended';

interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  status: CountdownStatus;
  totalSeconds: number;
}

interface UseCountdownProps {
  startAt?: string | number;
  endAt: string | number;
}

export function useCountdown({ startAt, endAt }: UseCountdownProps): CountdownResult {
  const [countdown, setCountdown] = useState<CountdownResult>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    status: 'running',
    totalSeconds: 0
  });

  useEffect(() => {
    const calculateCountdown = () => {
      const now = Date.now();
      const endTime = typeof endAt === 'string' ? new Date(endAt).getTime() : endAt;
      const startTime = startAt ? (typeof startAt === 'string' ? new Date(startAt).getTime() : startAt) : 0;

      let status: CountdownStatus = 'running';
      let diff = 0;

      if (startTime && now < startTime) {
        status = 'scheduled';
        diff = startTime - now;
      } else if (now >= endTime) {
        status = 'ended';
        diff = 0;
      } else {
        status = 'running';
        diff = endTime - now;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / (24 * 3600));
      const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setCountdown({
        days,
        hours,
        minutes,
        seconds,
        status,
        totalSeconds
      });
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);

    return () => clearInterval(interval);
  }, [startAt, endAt]);

  return countdown;
}
