import React from 'react';
import { Heart, Tag, Truck } from 'lucide-react';
import { Product } from '../types';
import { formatCurrencyCOP } from '../utils/formatIntegerAmount';
import useProductPromotions from '../hooks/useProductPromotions';
import { buildOptimizedCloudinaryUrl } from '../utils/image';
import { Promotion } from '../types/promotions';

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

const getCompactPromoText = (promotion: Promotion): { title: string; subtitle?: string; isShipping: boolean } => {
  const config = promotion.config;
  const visuals = config.visuals || {};
  const customTitle = visuals.badge_text || promotion.name;
  const customSubtitle = visuals.description || promotion.description || '';

  if (customTitle) {
    return {
      title: customTitle,
      subtitle: customSubtitle || undefined,
      isShipping: config.applies_to === 'shipping',
    };
  }

  if (config.applies_to === 'shipping') {
    return { title: 'Envío gratis', subtitle: customSubtitle || undefined, isShipping: true };
  }

  if (config.discount_type === 'percentage') {
    return { title: `-${config.discount_value}%`, subtitle: customSubtitle || undefined, isShipping: false };
  }

  if (config.discount_type === 'fixed_amount') {
    return { title: `-$${config.discount_value.toLocaleString()}`, subtitle: customSubtitle || undefined, isShipping: false };
  }

  return { title: promotion.name || 'Promoción', subtitle: customSubtitle || undefined, isShipping: false };
};

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
  const mobilePromoItems = promotions.slice(0, 2).map(getCompactPromoText);
  const fontVariant = PRODUCT_CARD_FONT_VARIANTS[((fontVariantIndex % PRODUCT_CARD_FONT_VARIANTS.length) + PRODUCT_CARD_FONT_VARIANTS.length) % PRODUCT_CARD_FONT_VARIANTS.length];

  const cardImage = buildOptimizedCloudinaryUrl(product.image, {
    width: immersiveMobile ? 1200 : 640,
    height: immersiveMobile ? 1400 : 480,
    fit: 'fill',
  });

  return (
    <div
      onClick={handleOpenProduct}
      className={`relative flex h-full min-h-0 flex-col overflow-hidden text-center transition-all duration-300 ${
        immersiveMobile
          ? 'rounded-none border-0 bg-[#3a0b2b] p-0 shadow-none backdrop-blur-none'
          : 'rounded-[2rem] border border-white/15 bg-[#3a0b2b] p-0 shadow-[0_18px_35px_rgba(28,7,22,0.42)] hover:-translate-y-0.5 hover:shadow-[0_24px_40px_rgba(28,7,22,0.5)]'
      } ${product.estado === 'disponible' ? 'cursor-pointer' : 'opacity-60'} ${className}`}
    >
      {!immersiveMobile && (
        <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-[#14060f]/85 via-[#14060f]/25 to-transparent" />
      )}

      <div className={`relative ${immersiveMobile ? 'h-[100svh]' : 'min-h-[clamp(28rem,60vh,34rem)] h-full'}`}>
        <img
          src={cardImage || product.image}
          alt={product.nom_produit}
          className="h-full w-full object-cover opacity-90"
          loading={immersiveMobile ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={immersiveMobile ? 'high' : 'auto'}
          sizes={immersiveMobile ? '100vw' : '(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw'}
        />
        <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-[#11060f]/80 via-[#11060f]/35 to-transparent" />
      </div>

      <div
        className={`absolute inset-0 z-30 flex w-full flex-col overflow-y-auto ${
          immersiveMobile ? 'px-3 pb-[max(env(safe-area-inset-bottom),0.55rem)] pt-[max(env(safe-area-inset-top),0.7rem)]' : 'px-0 pb-0 pt-4'
        }`}
      >
        <div className="flex items-start justify-between gap-2 px-4">
          <div className={`flex flex-wrap gap-2 ${immersiveMobile ? 'max-w-[calc(100%-3.5rem)]' : 'max-w-[calc(100%-3.25rem)]'}`}>
            {hasPromotionBadges ? (
              (immersiveMobile ? mobilePromoItems : promotions.slice(0, 2).map(getCompactPromoText)).map((promo, index) => (
                <div
                  key={`${promo.title}-${index}`}
                  className="inline-flex items-center gap-1 rounded-full bg-[#f7edd9] px-3 py-1 text-[0.73rem] font-black uppercase tracking-[0.03em] text-[#8c4f12]"
                >
                  {promo.isShipping ? <Truck size={13} /> : <Tag size={13} />}
                  <span className="line-clamp-1">{promo.title}</span>
                </div>
              ))
            ) : (
              <span className="inline-flex items-center rounded-full bg-[#f7edd9] px-3 py-1 text-[0.73rem] font-black uppercase tracking-[0.03em] text-[#8c4f12]">
                Más vendido
              </span>
            )}
          </div>
          <div className={`inline-flex items-center justify-center rounded-full bg-black/45 ${immersiveMobile ? 'h-10 w-10' : 'h-9 w-9'}`}>
            <Heart size={immersiveMobile ? 18 : 16} className="fill-white text-white" />
          </div>
        </div>

        <div className={`mt-3 flex flex-col items-center px-4 text-center text-white ${immersiveMobile ? '' : 'mb-auto'}`}>
          <p
            className={`w-full font-extrabold uppercase text-[#f8ebd7] ${immersiveMobile ? 'text-[clamp(2.45rem,11vw,3.1rem)] leading-[0.94]' : 'text-[clamp(2rem,3.35vw,2.65rem)] leading-[0.95]'}`}
            style={{
              fontFamily: fontVariant.titleFamily,
              letterSpacing: fontVariant.titleLetterSpacing,
              textShadow: '0 6px 20px rgba(0,0,0,0.5)',
            }}
          >
            {product.nom_produit}
          </p>
        </div>

        <div className="mt-auto flex flex-col items-center text-center text-white">
          <p
            className={`mt-[10px] mb-[10px] w-full whitespace-nowrap px-4 font-extrabold text-[#fff2df] ${immersiveMobile ? 'text-[clamp(2rem,8vw,2.6rem)]' : 'text-[clamp(1.9rem,3vw,2.3rem)]'}`}
            style={{ fontFamily: fontVariant.priceFamily, letterSpacing: '0.01em' }}
          >
            {formatCurrencyCOP(product.prix_vente)}
          </p>

          <p
            className={`w-full px-4 font-semibold text-[#f6f0e7] ${immersiveMobile ? 'text-[clamp(1rem,4.35vw,1.32rem)] leading-snug' : 'text-[0.95rem] leading-snug'}`}
            style={{ fontFamily: fontVariant.bodyFamily, letterSpacing: '0.01em', textShadow: '0 3px 14px rgba(0,0,0,0.45)' }}
          >
            {product.description}
          </p>

          <div className={`mt-2 w-full`}>
            {product.estado !== 'disponible' && (
              <span className={`font-bold uppercase tracking-[0.05em] text-red-200 ${immersiveMobile ? 'text-base' : 'text-sm'}`}>Agotado</span>
            )}
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
                className={`block w-full font-black uppercase text-white shadow-lg transition-all duration-300 hover:brightness-110 ${
                  immersiveMobile
                    ? 'rounded-none bg-gradient-to-b from-[#ad4a1a] to-[#8a2d0d] py-4 text-[clamp(1.2rem,5.2vw,1.55rem)]'
                    : 'rounded-b-[2rem] bg-gradient-to-b from-[#ad4a1a] to-[#8a2d0d] py-3 text-lg'
                }`}
                style={{ fontFamily: fontVariant.bodyFamily, letterSpacing: '0.04em', textShadow: '0 2px 8px rgba(0,0,0,0.35)' }}
              >
                Agregar al carrito
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCardWithPromotion;
