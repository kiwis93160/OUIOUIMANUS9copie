import React from 'react';
import { Product } from '../types';
import { formatCurrencyCOP } from '../utils/formatIntegerAmount';
import PromotionBadge from './promotions/PromotionBadge';
import useProductPromotions from '../hooks/useProductPromotions';

interface ProductCardWithPromotionProps {
  product: Product;
  onClick: () => void;
  className?: string;
  immersiveMobile?: boolean;
  fontVariantIndex?: number;
}

const PRODUCT_CARD_FONT_VARIANTS = [
  {
    label: 'Variación 1',
    titleFamily: '"DM Serif Display", "Playfair Display", serif',
    bodyFamily: '"Inter", "Nunito Sans", sans-serif',
    priceFamily: '"Inter", "Nunito Sans", sans-serif',
    titleTransform: 'none' as const,
    titleLetterSpacing: '0.01em',
  },
  {
    label: 'Variación 2',
    titleFamily: '"Playfair Display", "Cormorant Garamond", serif',
    bodyFamily: '"Source Sans 3", "Inter", sans-serif',
    priceFamily: '"Source Sans 3", "Inter", sans-serif',
    titleTransform: 'none' as const,
    titleLetterSpacing: '0.02em',
  },
  {
    label: 'Variación 3',
    titleFamily: '"Bebas Neue", "Montserrat", sans-serif',
    bodyFamily: '"Manrope", "Inter", sans-serif',
    priceFamily: '"Manrope", "Inter", sans-serif',
    titleTransform: 'uppercase' as const,
    titleLetterSpacing: '0.05em',
  },
  {
    label: 'Variación 4',
    titleFamily: '"Cormorant Garamond", "DM Serif Display", serif',
    bodyFamily: '"Lato", "Source Sans 3", sans-serif',
    priceFamily: '"Lato", "Source Sans 3", sans-serif',
    titleTransform: 'none' as const,
    titleLetterSpacing: '0.03em',
  },
  {
    label: 'Variación 5',
    titleFamily: '"Fraunces", "DM Serif Display", serif',
    bodyFamily: '"Quicksand", "Nunito Sans", sans-serif',
    priceFamily: '"Quicksand", "Nunito Sans", sans-serif',
    titleTransform: 'none' as const,
    titleLetterSpacing: '0.015em',
  },
] as const;

/**
 * Composant de carte produit avec badge promotionnel
 */
const ProductCardWithPromotion: React.FC<ProductCardWithPromotionProps> = ({
  product,
  onClick,
  className = '',
  immersiveMobile = false,
  fontVariantIndex = 0,
}) => {
  // Récupérer toutes les promotions applicables au produit
  const { promotions, loading } = useProductPromotions(product);
  const hasPromotionBadges = !loading && promotions.length > 0 && product.estado === 'disponible';
  const fontVariant = PRODUCT_CARD_FONT_VARIANTS[((fontVariantIndex % PRODUCT_CARD_FONT_VARIANTS.length) + PRODUCT_CARD_FONT_VARIANTS.length) % PRODUCT_CARD_FONT_VARIANTS.length];

  return (
    <div
      onClick={() => product.estado === 'disponible' && onClick()}
      className={`relative flex h-full flex-col items-center text-center transition-shadow ${
        immersiveMobile
          ? 'rounded-none border-0 bg-transparent p-0 shadow-none backdrop-blur-none'
          : 'rounded-2xl border border-white/60 bg-white/70 p-4 shadow-lg backdrop-blur-md'
      } ${product.estado === 'disponible' ? 'cursor-pointer hover:shadow-xl' : 'opacity-60'} ${
        hasPromotionBadges ? (immersiveMobile ? 'pt-12' : 'pt-16') : ''
      } ${className}`}
    >
      <div
        className={`absolute left-3 z-10 inline-flex rounded-full border border-white/70 bg-black/55 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm ${immersiveMobile ? 'top-4' : 'top-3'}`}
      >
        {fontVariant.label}
      </div>

      {/* Afficher tous les badges promotionnels si des promotions sont applicables */}
      {hasPromotionBadges && (
        <div className="absolute right-3 top-3 z-10 flex max-w-[calc(100%-1.25rem)] flex-wrap justify-end gap-1">
          {promotions.map((promotion, index) => (
            <PromotionBadge key={promotion.id || index} promotion={promotion} />
          ))}
        </div>
      )}

      {/* Image du produit */}
      <img
        src={product.image}
        alt={product.nom_produit}
        className={`w-full object-cover ${immersiveMobile ? 'h-[57dvh] min-h-[45dvh] max-h-[61dvh] rounded-none mb-0' : 'mb-2 aspect-[4/3] rounded-xl sm:aspect-square'}`}
      />

      {/* Nom du produit */}
      <div className={`flex w-full flex-1 min-h-0 flex-col items-center ${immersiveMobile ? 'bg-[#d5bdd0] px-4 py-2' : ''}`}>
        <div className="flex w-full items-baseline justify-between gap-2">
          <p
            className={`flex-1 text-left font-extrabold text-gray-900 break-words text-balance whitespace-normal [hyphens:auto] ${immersiveMobile ? 'text-[clamp(1.5rem,6vw,1.9rem)] leading-tight' : 'text-[clamp(0.78rem,1.7vw,0.95rem)] leading-snug'}`}
            style={{
              fontFamily: fontVariant.titleFamily,
              textTransform: fontVariant.titleTransform,
              letterSpacing: fontVariant.titleLetterSpacing,
            }}
          >
            {product.nom_produit}
          </p>
          <p
            className={`shrink-0 whitespace-nowrap text-right font-bold text-gray-800 ${immersiveMobile ? 'text-[clamp(1.55rem,6vw,2rem)]' : 'text-[clamp(0.88rem,1.6vw,1.04rem)]'}`}
            style={{ fontFamily: fontVariant.priceFamily, letterSpacing: '0.02em' }}
          >
            {formatCurrencyCOP(product.prix_vente)}
          </p>
        </div>

        {/* Description */}
        <p
          className={`mt-1 px-1 text-left text-gray-600 ${immersiveMobile ? 'text-[clamp(1.15rem,4.7vw,1.45rem)] leading-snug line-clamp-2' : 'text-sm max-h-10 overflow-hidden line-clamp-2'}`}
          style={{ fontFamily: fontVariant.bodyFamily, letterSpacing: '0.01em' }}
        >
          {product.description}
        </p>

        <div className={`mt-auto w-full ${immersiveMobile ? 'pt-3' : 'pt-2'}`}>
          {/* Statut */}
          {product.estado !== 'disponible' && <span className="text-xs font-bold text-red-500">Agotado</span>}
          {product.estado === 'disponible' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className={`w-full rounded-lg bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 font-bold text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:from-orange-600 hover:via-orange-700 hover:to-red-700 ${immersiveMobile ? 'py-2.5 text-[clamp(1.6rem,6vw,2rem)] leading-none' : 'py-2'}`}
              style={{ fontFamily: fontVariant.bodyFamily, letterSpacing: '0.04em' }}
            >
              Agregar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCardWithPromotion;
