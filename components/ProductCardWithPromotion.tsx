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
  const lastOpenTimestampRef = React.useRef(0);

  const handleOpenProduct = React.useCallback(() => {
    if (product.estado !== 'disponible') {
      return;
    }

    const now = Date.now();
    if (now - lastOpenTimestampRef.current < 350) {
      return;
    }

    lastOpenTimestampRef.current = now;
    onClick();
  }, [onClick, product.estado]);

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
      onClick={handleOpenProduct}
      className={`relative flex h-full flex-col items-center text-center transition-all duration-300 ${
        immersiveMobile
          ? 'rounded-none border-0 bg-[#d9f1eb] p-0 shadow-none backdrop-blur-none'
          : 'rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-100 via-teal-50 to-cyan-100 p-4 shadow-lg shadow-emerald-200/50 backdrop-blur-md hover:shadow-xl hover:shadow-teal-200/60'
      } ${product.estado === 'disponible' ? 'cursor-pointer' : 'opacity-60'} ${
        hasPromotionBadges ? (immersiveMobile ? 'pt-12' : 'pt-16') : ''
      } ${className}`}
    >
      {/* Afficher tous les badges promotionnels si des promotions sont applicables */}
      {hasPromotionBadges && (
        <div className={`absolute z-10 flex max-w-[calc(100%-1.25rem)] flex-wrap gap-1 ${immersiveMobile ? 'left-3 right-3 top-3 justify-between' : 'right-3 top-3 justify-end'}`}>
          {promotions.map((promotion, index) => (
            <PromotionBadge key={promotion.id || index} promotion={promotion} />
          ))}
        </div>
      )}

      {/* Image du produit */}
      <img
        src={cardImage || product.image}
        alt={product.nom_produit}
        className={`w-full object-cover ${immersiveMobile ? 'mb-0 h-[61dvh] min-h-[50dvh] max-h-[65dvh] rounded-none' : 'mb-3 aspect-[4/3] rounded-xl border border-white/70 shadow-md sm:aspect-square'}`}
        loading={immersiveMobile ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={immersiveMobile ? 'high' : 'auto'}
        sizes={immersiveMobile ? '100vw' : '(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw'}
      />

      {/* Nom du produit */}
      <div
        className={`flex min-h-0 w-full flex-1 flex-col items-center ${
          immersiveMobile
            ? 'bg-[#d9f1eb] px-5 pb-[max(env(safe-area-inset-bottom),0.85rem)] pt-4'
            : 'rounded-2xl bg-white/55 px-3 py-3 backdrop-blur-sm'
        }`}
      >
        <div className="flex w-full items-start justify-between gap-3">
          <p
            className={`flex-1 text-left font-extrabold text-gray-900 break-words text-balance whitespace-normal [hyphens:auto] ${immersiveMobile ? 'text-[clamp(2rem,8.8vw,2.8rem)] leading-[0.98]' : 'text-[clamp(0.78rem,1.7vw,0.95rem)] leading-snug'}`}
            style={{
              fontFamily: fontVariant.titleFamily,
              letterSpacing: fontVariant.titleLetterSpacing,
            }}
          >
            {product.nom_produit}
          </p>
          <p
            className={`shrink-0 whitespace-nowrap text-right font-bold text-emerald-900 ${immersiveMobile ? 'pt-1 text-[clamp(1.75rem,7vw,2.3rem)]' : 'text-[clamp(0.88rem,1.6vw,1.04rem)]'}`}
            style={{ fontFamily: fontVariant.priceFamily, letterSpacing: '0.02em' }}
          >
            {formatCurrencyCOP(product.prix_vente)}
          </p>
        </div>

        {/* Description */}
        <p
          className={`mt-2 px-1 text-left text-gray-700 ${immersiveMobile ? 'text-[clamp(1.06rem,4.2vw,1.3rem)] leading-snug line-clamp-4' : 'text-sm max-h-10 overflow-hidden line-clamp-2'}`}
          style={{ fontFamily: fontVariant.bodyFamily, letterSpacing: '0.01em' }}
        >
          {product.description}
        </p>

        <div className={`mt-auto w-full ${immersiveMobile ? 'pt-4' : 'pt-3'}`}>
          {/* Statut */}
          {product.estado !== 'disponible' && <span className={`${immersiveMobile ? 'text-base' : 'text-xs'} font-bold text-red-500`}>Agotado</span>}
          {product.estado === 'disponible' && (
            <button
              type="button"
              onPointerUp={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleOpenProduct();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleOpenProduct();
              }}
              className={`w-full font-bold text-white shadow-lg transition-all duration-300 hover:scale-[1.02] ${immersiveMobile ? 'rounded-2xl bg-[#97856c] py-3.5 text-[clamp(1.35rem,5.4vw,1.7rem)] uppercase tracking-[0.03em] hover:bg-[#8a7962]' : 'rounded-lg bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 py-2 hover:from-orange-600 hover:via-orange-700 hover:to-red-700'}`}
              style={{ fontFamily: fontVariant.bodyFamily, letterSpacing: '0.04em' }}
            >
              {immersiveMobile ? 'Agregar al carrito' : 'Agregar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCardWithPromotion;
