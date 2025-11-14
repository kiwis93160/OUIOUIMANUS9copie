import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { formatMillisecondsToMinutesSeconds } from '../utils/time';
import { getOrderUrgencyToneClasses } from '../utils/orderUrgency';

interface OrderTimerProps {
  startTime: number;
  className?: string;
  variant?: 'default' | 'chip';
  accentClassName?: string;
  label?: string;
}

const OrderTimer: React.FC<OrderTimerProps> = ({
  startTime,
  className = '',
  variant = 'default',
  accentClassName,
  label,
}) => {
  const [elapsed, setElapsed] = useState(Date.now() - startTime);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const timerString = formatMillisecondsToMinutesSeconds(elapsed);
  const accessibleLabel = label ? `${label.trim()} ${timerString}` : `Tiempo transcurrido ${timerString}`;
  const toneClasses = getOrderUrgencyToneClasses(startTime);

  const containerClasses = [
    variant === 'chip'
      ? `inline-flex items-center gap-3 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-white shadow-lg shadow-slate-900/10 ring-1 ring-inset ring-white/30 ${accentClassName ?? 'bg-brand-primary'}`
      : `flex items-center gap-2 px-3 py-1.5 rounded-full text-lg font-bold ${accentClassName ?? toneClasses.timer}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={containerClasses}
      role="timer"
      aria-live="polite"
      aria-label={accessibleLabel}
      title={accessibleLabel}
    >
      {variant === 'default' && <Clock size={20} className="shrink-0" />}
      {variant === 'chip' && label ? (
        <>
          <span className="text-white/70">{label}</span>
          <span className="text-lg font-semibold tracking-normal text-white">{timerString}</span>
        </>
      ) : (
        <span className="text-lg font-semibold tracking-normal text-white">{timerString}</span>
      )}
    </div>
  );
};

export default OrderTimer;
