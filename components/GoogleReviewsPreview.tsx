import React from 'react';
import { ExternalLink, Star, StarHalf } from 'lucide-react';
import type { GoogleReviewSummary } from '../constants/googleReviews';

interface GoogleReviewsPreviewProps {
  summary: GoogleReviewSummary;
  className?: string;
  headerStyle?: React.CSSProperties;
  bodyTextStyle?: React.CSSProperties;
}

const baseClassName =
  'flex flex-col gap-4 rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.55)] backdrop-blur';

const getStarElements = (rating: number) => {
  const stars: React.ReactNode[] = [];
  const totalStars = 5;
  const rawFullStars = Math.floor(rating);
  const remainder = rating - rawFullStars;
  const hasHalfStar = remainder >= 0.25 && remainder < 0.75;
  const roundedFullStars = remainder >= 0.75 ? Math.min(totalStars, rawFullStars + 1) : rawFullStars;
  const safeFullStars = Math.min(totalStars, roundedFullStars);
  const halfStarCount = hasHalfStar && safeFullStars < totalStars ? 1 : 0;
  const emptyStars = Math.max(totalStars - safeFullStars - halfStarCount, 0);

  for (let i = 0; i < safeFullStars; i += 1) {
    stars.push(
      <Star
        key={`full-${i}`}
        className="h-5 w-5 text-amber-400"
        strokeWidth={1.5}
        fill="currentColor"
        aria-hidden="true"
      />,
    );
  }

  if (halfStarCount === 1) {
    stars.push(
      <StarHalf
        key="half"
        className="h-5 w-5 text-amber-400"
        strokeWidth={1.5}
        fill="currentColor"
        aria-hidden="true"
      />,
    );
  }

  for (let i = 0; i < emptyStars; i += 1) {
    stars.push(
      <Star
        key={`empty-${i}`}
        className="h-5 w-5 text-amber-200"
        strokeWidth={1.2}
        aria-hidden="true"
      />,
    );
  }

  return stars;
};

const formatReviewCount = (count: number) =>
  new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(count);

const formatLastUpdated = (value?: string) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'long',
  }).format(parsed);
};

const GoogleReviewsPreview: React.FC<GoogleReviewsPreviewProps> = ({
  summary,
  className,
  headerStyle,
  bodyTextStyle,
}) => {
  const { rating, reviewCount, reviewSnippet, reviewerName, url, placeName, lastUpdated } = summary;
  const formattedRating = rating.toFixed(1);
  const lastUpdatedLabel = formatLastUpdated(lastUpdated);
  const combinedClassName = className ? `${baseClassName} ${className}` : baseClassName;

  return (
    <section className={combinedClassName} aria-label={`Opiniones recientes de Google para ${placeName}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-gray-900" style={headerStyle}>
            Opiniones de Google
          </h3>
          <p className="text-sm text-gray-500" style={bodyTextStyle}>
            {placeName}
          </p>
        </div>
        <div className="flex flex-col items-start sm:items-end">
          <span
            className="text-3xl font-bold text-orange-500"
            aria-label={`Calificación de ${formattedRating} sobre 5`}
          >
            {formattedRating}
          </span>
          <div className="mt-1 flex items-center gap-1" aria-hidden="true">
            {getStarElements(rating)}
          </div>
          <p className="text-sm text-gray-500" style={bodyTextStyle}>
            Basado en {formatReviewCount(reviewCount)} opiniones
          </p>
        </div>
      </div>

      <blockquote
        className="rounded-2xl bg-orange-50 p-4 text-sm text-gray-700"
        style={bodyTextStyle}
      >
        <p className="italic">“{reviewSnippet}”</p>
        <footer className="mt-3 text-xs font-semibold text-gray-600">— {reviewerName}</footer>
      </blockquote>

      <div className="flex flex-col gap-2 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
        {lastUpdatedLabel ? <span style={bodyTextStyle}>Actualizado: {lastUpdatedLabel}</span> : null}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 font-semibold text-orange-500 transition hover:text-orange-600"
          style={bodyTextStyle}
        >
          Ver opiniones en Google
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
};

export default GoogleReviewsPreview;
