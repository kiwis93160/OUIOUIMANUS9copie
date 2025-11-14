export type OrderUrgencyLevel = 'normal' | 'warning' | 'critical';

export interface OrderUrgencyStyles {
  level: OrderUrgencyLevel;
  /** Classes applied on the ticket wrapper border. */
  border: string;
  /** Accent colour used for badges or sidebands. */
  accent: string;
  /** Background and text colour for urgency badges. */
  badge: string;
  /** Icon/text colour accent for subtle highlights. */
  icon: string;
  /** Background colour for the card. */
  background: string;
}

export interface OrderUrgencyToneClasses {
  level: OrderUrgencyLevel;
  /** Complete class list for the default timer chip. */
  timer: string;
  /** Border utility that mirrors the timer background colour. */
  cardBorder: string;
  /** Quantity badge background that mirrors the timer background colour. */
  quantityBackground: string;
  /** Raw background class so other components can copy the tone. */
  timerBackground: string;
}

const createToneClasses = ({
  backgroundClass,
  textClass,
  shadowClass = 'shadow-sm',
}: {
  backgroundClass: string;
  textClass: string;
  shadowClass?: string;
}): Omit<OrderUrgencyToneClasses, 'level'> => {
  const borderColourClass = backgroundClass.replace(/^bg-/, 'border-');

  return {
    timer: `${backgroundClass} ${textClass} border ${borderColourClass} ${shadowClass}`.trim(),
    cardBorder: `border-4 ${borderColourClass}`,
    quantityBackground: backgroundClass,
    timerBackground: backgroundClass,
  };
};

const URGENCY_TONE_CLASS_MAP: Record<OrderUrgencyLevel, Omit<OrderUrgencyToneClasses, 'level'>> = {
  critical: createToneClasses({ backgroundClass: 'bg-red-600', textClass: 'text-white' }),
  warning: createToneClasses({ backgroundClass: 'bg-yellow-400', textClass: 'text-gray-900' }),
  normal: createToneClasses({ backgroundClass: 'bg-brand-accent-hover', textClass: 'text-white', shadowClass: 'shadow-none' }),
};

const URGENCY_STYLE_MAP: Record<OrderUrgencyLevel, Omit<OrderUrgencyStyles, 'level'>> = {
  critical: {
    border: 'border-4 border-solid border-red-500',
    accent: 'bg-red-500 urgency-accent-critical',
    badge: 'bg-red-100 text-red-700 ring-1 ring-inset ring-red-300 urgency-badge-critical',
    icon: 'text-red-500 urgency-icon-critical',
    background: 'bg-red-100',
  },
  warning: {
    border: 'border-[3px] border-solid border-yellow-400',
    accent: 'bg-yellow-400 urgency-accent-warning',
    badge: 'bg-yellow-100 text-yellow-800 ring-1 ring-inset ring-yellow-300 urgency-badge-warning',
    icon: 'text-yellow-500 urgency-icon-warning',
    background: 'bg-yellow-100',
  },
  normal: {
    border: 'border-2 border-solid border-brand-accent',
    accent: 'bg-brand-accent urgency-accent-normal',
    badge: 'bg-blue-100 text-blue-700 ring-1 ring-inset ring-blue-200 urgency-badge-normal',
    icon: 'text-brand-accent urgency-icon-normal',
    background: 'bg-blue-100',
  },
};

export const getOrderUrgencyLevel = (startTime?: number): OrderUrgencyLevel => {
  if (!startTime) {
    return 'normal';
  }

  const minutes = (Date.now() - startTime) / 60000;

  if (minutes >= 20) {
    return 'critical';
  }

  if (minutes >= 10) {
    return 'warning';
  }

  return 'normal';
};

export const getOrderUrgencyStyles = (startTime?: number): OrderUrgencyStyles => {
  const level = getOrderUrgencyLevel(startTime);
  const styles = URGENCY_STYLE_MAP[level];

  return {
    level,
    border: styles.border,
    accent: styles.accent,
    badge: styles.badge,
    icon: styles.icon,
    background: styles.background,
  };
};

export const getOrderUrgencyToneClasses = (startTime?: number): OrderUrgencyToneClasses => {
  const level = getOrderUrgencyLevel(startTime);
  const toneClasses = URGENCY_TONE_CLASS_MAP[level];

  return {
    level,
    ...toneClasses,
  };
};

/**
 * @deprecated prefer using {@link getOrderUrgencyStyles} to access both the
 * urgency level and the different sections' classes.
 */
export const getOrderUrgencyClass = (startTime?: number): string =>
  getOrderUrgencyStyles(startTime).border;
