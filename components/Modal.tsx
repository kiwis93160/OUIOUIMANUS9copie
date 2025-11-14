
import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'half';
  anchor?: DOMRect | DOMRectReadOnly | null;
  boundary?: DOMRect | DOMRectReadOnly | null;
}

const VIEWPORT_MARGIN = 16;

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  anchor = null,
  boundary = null,
}) => {
  const sizeClasses = {
    xs: 'max-w-xs',
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    half: '', // Custom handling for half size
  };

  const headingId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      if (!containerRef.current) {
        return;
      }
      const rect = containerRef.current.getBoundingClientRect();
      const { innerWidth, innerHeight } = window;

      const bounds = boundary
        ? {
            top: Math.max(boundary.top + VIEWPORT_MARGIN, VIEWPORT_MARGIN),
            left: Math.max(boundary.left + VIEWPORT_MARGIN, VIEWPORT_MARGIN),
            right: Math.min(boundary.right - VIEWPORT_MARGIN, innerWidth - VIEWPORT_MARGIN),
            bottom: Math.min(boundary.bottom - VIEWPORT_MARGIN, innerHeight - VIEWPORT_MARGIN),
          }
        : {
            top: VIEWPORT_MARGIN,
            left: VIEWPORT_MARGIN,
            right: innerWidth - VIEWPORT_MARGIN,
            bottom: innerHeight - VIEWPORT_MARGIN,
          };

      const availableWidth = Math.max(bounds.right - bounds.left, 0);
      const availableHeight = Math.max(bounds.bottom - bounds.top, 0);

      const centerX = innerWidth / 2;
      const centerY = innerHeight / 2;

      let left = centerX - rect.width / 2;

      if (rect.width > availableWidth) {
        left = bounds.left;
      } else {
        left = Math.max(bounds.left, Math.min(left, bounds.right - rect.width));
      }

      let top = centerY - rect.height / 2;
      if (rect.height > availableHeight) {
        top = bounds.top;
      } else {
        top = Math.max(bounds.top, Math.min(top, bounds.bottom - rect.height));
      }

      setPosition({ top, left });
    };

    let frame = window.requestAnimationFrame(updatePosition);
    const handleResize = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updatePosition);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [anchor, boundary, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : null;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : null;

  const viewportMaxWidth =
    viewportWidth !== null ? Math.max(viewportWidth - VIEWPORT_MARGIN * 2, 200) : null;
  const viewportMaxHeight =
    viewportHeight !== null ? Math.max(viewportHeight - VIEWPORT_MARGIN * 2, 200) : null;

  const boundaryMaxWidth =
    boundary !== null ? Math.max(boundary.width - VIEWPORT_MARGIN * 2, 200) : null;
  const boundaryMaxHeight =
    boundary !== null ? Math.max(boundary.height - VIEWPORT_MARGIN * 2, 200) : null;

  const maxWidthValue =
    boundaryMaxWidth !== null && viewportMaxWidth !== null
      ? Math.min(boundaryMaxWidth, viewportMaxWidth)
      : boundaryMaxWidth ?? viewportMaxWidth;
  const maxHeightValue =
    boundaryMaxHeight !== null && viewportMaxHeight !== null
      ? Math.min(boundaryMaxHeight, viewportMaxHeight)
      : boundaryMaxHeight ?? viewportMaxHeight;

  const preferredWidth =
    boundary && typeof maxWidthValue === 'number'
      ? Math.min(Math.max(boundary.width * 0.6, 320), maxWidthValue)
      : boundary
        ? Math.max(boundary.width * 0.6, 320)
        : null;

  const baseStyle: React.CSSProperties = {
    position: 'fixed',
    maxHeight:
      typeof maxHeightValue === 'number'
        ? `${Math.max(maxHeightValue, 200)}px`
        : `calc(100vh - ${VIEWPORT_MARGIN * 2}px)`,
  };

  if (size === 'half') {
    // For 'half' size: 50% on large screens (≥1024px), viewport-minus-margins on smaller
    baseStyle.width = 'calc(100vw - 32px)';
    baseStyle.maxWidth = 'calc(100vw - 32px)';
    baseStyle.minWidth = '320px';
    // Use media query via CSS class for responsiveness (applied via className below)
  } else if (preferredWidth !== null) {
    baseStyle.width = `${preferredWidth}px`;
    baseStyle.maxWidth = `${preferredWidth}px`;
  } else {
    baseStyle.maxWidth =
      typeof maxWidthValue === 'number'
        ? `${Math.max(maxWidthValue, 260)}px`
        : `calc(100vw - ${VIEWPORT_MARGIN * 2}px)`;
  }

  const resolvedPosition: React.CSSProperties = position
    ? { top: position.top, left: position.left }
    : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className={`fixed flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ${
          anchor && boundary ? 'w-full max-w-none' : size === 'half' ? 'w-full lg:!w-[50vw] lg:!max-w-[50vw]' : sizeClasses[size]
        } sm:max-h-[90vh] focus:outline-none`}
        style={{
          ...baseStyle,
          ...resolvedPosition,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 sm:px-6">
          <h3
            id={headingId}
            className="text-[clamp(1.05rem,2.2vw,1.4rem)] font-semibold leading-snug text-slate-900 break-words text-balance whitespace-normal [hyphens:auto]"
          >
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
            aria-label="Cerrar la ventana modal"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
