import React from 'react';
import { Product } from '../types';
import { formatCurrencyCOP } from '../utils/formatIntegerAmount';
import PromotionBadge from './promotions/PromotionBadge';
import useProductPromotions from '../hooks/useProductPromotions';
import { buildOptimizedCloudinaryUrl } from '../utils/image';

interface ProductCardWithPromotionProps {
  product: Product;
  onClick: () => void;
  className?: string;
  immersiveMobile?: boolean;
  fontVariantIndex?: number;
}

const PRODUCT_CARD_FONT_VARIANTS = [
  {
    titleFamily: '"DM Serif Display", "Playfair Display", serif',
    bodyFamily: '"Inter", "Nunito Sans", sans-serif',
    priceFamily: '"Inter", "Nunito Sans", sans-serif',
    titleLetterSpacing: '0.01em',
  },
] as const;

const MENU_CARD_FONT_STYLE = PRODUCT_CARD_FONT_VARIANTS[0];

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

  const cardImage = buildOptimizedCloudinaryUrl(product.image, {
    width: immersiveMobile ? 1200 : 640,
    height: immersiveMobile ? 1400 : 480,
    fit: 'fill',
  });

  return (
    <div
      onClick={() => product.estado === 'disponible' && onClick()}
      className={`relative flex h-full flex-col items-center text-center transition-all duration-300 ${
        immersiveMobile
          ? 'rounded-none border-0 bg-transparent p-0 shadow-none backdrop-blur-none'
          : 'rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-100 via-teal-50 to-cyan-100 p-4 shadow-lg shadow-emerald-200/50 backdrop-blur-md hover:shadow-xl hover:shadow-teal-200/60'
      } ${product.estado === 'disponible' ? 'cursor-pointer' : 'opacity-60'} ${
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
        src={cardImage || product.image}
        alt={product.nom_produit}
        className={`w-full object-cover ${immersiveMobile ? 'h-[57dvh] min-h-[45dvh] max-h-[61dvh] rounded-none mb-0' : 'mb-3 aspect-[4/3] rounded-xl border border-white/70 shadow-md sm:aspect-square'}`}
        loading={immersiveMobile ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={immersiveMobile ? 'high' : 'auto'}
        sizes={immersiveMobile ? '100vw' : '(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw'}
      />

      {/* Nom du produit */}
      <div
        className={`flex min-h-0 w-full flex-1 flex-col items-center ${
          immersiveMobile
            ? 'bg-gradient-to-br from-emerald-100 via-teal-50 to-cyan-100 px-4 py-3'
            : 'rounded-2xl bg-white/55 px-3 py-3 backdrop-blur-sm'
        }`}
      >
        <div className="flex w-full items-baseline justify-between gap-2">
          <p
            className={`flex-1 text-left font-extrabold text-gray-900 break-words text-balance whitespace-normal [hyphens:auto] ${immersiveMobile ? 'text-[clamp(1.5rem,6vw,1.9rem)] leading-tight' : 'text-[clamp(0.78rem,1.7vw,0.95rem)] leading-snug'}`}
            style={{
              fontFamily: MENU_CARD_FONT_STYLE.titleFamily,
              letterSpacing: MENU_CARD_FONT_STYLE.titleLetterSpacing,
            }}
          >
            {product.nom_produit}
          </p>
          <p
            className={`shrink-0 whitespace-nowrap text-right font-bold text-emerald-900 ${immersiveMobile ? 'text-[clamp(1.55rem,6vw,2rem)]' : 'text-[clamp(0.88rem,1.6vw,1.04rem)]'}`}
            style={{ fontFamily: MENU_CARD_FONT_STYLE.priceFamily, letterSpacing: '0.02em' }}
          >
            {formatCurrencyCOP(product.prix_vente)}
          </p>
        </div>

        {/* Description */}
        <p
          className={`mt-1 px-1 text-left text-gray-700 ${immersiveMobile ? 'text-[clamp(1.15rem,4.7vw,1.45rem)] leading-snug line-clamp-2' : 'text-sm max-h-10 overflow-hidden line-clamp-2'}`}
          style={{ fontFamily: MENU_CARD_FONT_STYLE.bodyFamily, letterSpacing: '0.01em' }}
        >
          {product.description}
        </p>

        <div className={`mt-auto w-full ${immersiveMobile ? 'pt-3' : 'pt-3'}`}>
          {/* Statut */}
          {product.estado !== 'disponible' && <span className="text-xs font-bold text-red-500">Agotado</span>}
          {product.estado === 'disponible' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className={`w-full rounded-lg bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 font-bold text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:from-orange-600 hover:via-orange-700 hover:to-red-700 ${immersiveMobile ? 'py-2.5 text-[clamp(1.6rem,6vw,2rem)] leading-none' : 'py-2'}`}
              style={{ fontFamily: MENU_CARD_FONT_STYLE.bodyFamily, letterSpacing: '0.04em' }}
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
