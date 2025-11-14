import React, { useMemo } from 'react';

const SHAPO_WIDGET_ID = 'e4f400ac5f6fd4edb521';
const SHAPO_WIDGET_BASE_URL = 'https://app.shapo.io/widgets';

const buildWidgetUrl = (): string => {
  if (typeof window === 'undefined') {
    return `${SHAPO_WIDGET_BASE_URL}/${SHAPO_WIDGET_ID}`;
  }

  const currentUrl = window.location.href;
  const encodedUrl = encodeURIComponent(currentUrl);
  return `${SHAPO_WIDGET_BASE_URL}/${SHAPO_WIDGET_ID}?url=${encodedUrl}`;
};

interface ShapoWidgetProps {
  className?: string;
  title?: string;
}

const ShapoWidget: React.FC<ShapoWidgetProps> = ({ className, title = 'Widget Shapo' }) => {
  const widgetSrc = useMemo(buildWidgetUrl, []);
  const resolvedClassName = className && className.length > 0 ? className : 'h-full w-full';

  return (
    <iframe
      key={widgetSrc}
      src={widgetSrc}
      title={title}
      className={resolvedClassName}
      loading="lazy"
      allow="clipboard-read; clipboard-write"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
};

export default ShapoWidget;
