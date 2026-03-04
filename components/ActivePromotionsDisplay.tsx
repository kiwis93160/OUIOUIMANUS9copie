import React, { useEffect, useState } from 'react';
import { fetchActivePromotions } from '../services/promotionsApi';
import { Promotion } from '../types/promotions';
import { Tag, Gift, TruckIcon, Clock, Percent } from 'lucide-react';

const PROMO_GRADIENT_FROM = '#f59e0b';
const PROMO_GRADIENT_TO = '#f97316';
const PROMO_LINEAR_GRADIENT = `linear-gradient(135deg, ${PROMO_GRADIENT_FROM}, ${PROMO_GRADIENT_TO})`;

interface ActivePromotionsDisplayProps {
  compact?: boolean;
}

const ActivePromotionsDisplay: React.FC<ActivePromotionsDisplayProps> = ({ compact = false }) => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPromotions = async () => {
      try {
        const activePromos = await fetchActivePromotions();
        setPromotions(activePromos);
      } catch (error) {
        console.error('Error loading promotions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPromotions();
  }, []);

  // Filter out promo code promotions (codes secrets)
  const visiblePromotions = promotions.filter(promo => {
    if (promo.type === 'promo_code') return false;
    
    return true;
  });

  if (loading || visiblePromotions.length === 0) return null;

  const getPromotionIcon = (promo: Promotion) => {
    if (promo.type === 'free_shipping') return <TruckIcon size={16} />;
    if (promo.type === 'percentage') return <Percent size={16} />;
    if (promo.conditions?.time_range) return <Clock size={16} />;
    if (promo.type === 'buy_x_get_y') return <Gift size={16} />;
    return <Tag size={16} />;
  };

  const getPromotionDescription = (promo: Promotion) => {
    const discount = promo.discount;
    const conditions = promo.conditions;

    let description = promo.description || promo.name;
    
    // Add conditions info
    if (conditions?.min_order_amount) {
      description += ` (Mínimo: ${conditions.min_order_amount.toLocaleString()})`;
    }

    if (conditions?.time_range) {
      description += ` (${conditions.time_range.start_time} - ${conditions.time_range.end_time})`;
    }

    if (promo.type === 'promo_code' && discount?.promo_code) {
      description += ` (Código: ${discount.promo_code})`;
    }

    return description;
  };

  return (
    <div className={compact ? 'mb-2 space-y-1.5' : 'mb-3 space-y-2.5'}>
      <div className={compact ? 'flex items-center gap-2 text-xs font-semibold text-white drop-shadow-sm' : 'flex items-center gap-2 text-sm font-semibold text-white drop-shadow-sm'}>
        <div className={compact ? 'flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm' : 'flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm'}>
          <Gift size={compact ? 14 : 16} className="text-black" />
        </div>
        <span className={compact ? 'text-sm leading-tight' : 'text-base leading-tight'}>Promociones Activas</span>
      </div>

      <div className={compact ? 'space-y-1.5' : 'space-y-2.5'}>
        {visiblePromotions.map((promo) => {
          const accentColor = promo.visuals?.badge_bg_color || PROMO_GRADIENT_TO;
          const bannerImage = promo.visuals?.banner_image;
          const bannerText = promo.visuals?.banner_text;
          const description = getPromotionDescription(promo);

          if (bannerImage) {
            return (
              <div
                key={promo.id}
                className="relative overflow-hidden rounded-xl shadow-lg"
              >
                <img
                  src={bannerImage}
                  alt={promo.name}
                  className={compact ? 'h-20 w-full object-cover' : 'h-28 w-full object-cover'}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/35 to-transparent" />
                <div className="absolute inset-0 flex items-end">
                  <div className={compact ? 'flex w-full items-stretch p-2.5 text-white' : 'flex w-full items-stretch p-3.5 text-white'}>
                    <div
                      className={compact ? 'flex flex-shrink-0 items-center justify-center rounded-l-xl bg-white px-2.5 py-2 text-[length:14px] shadow-sm' : 'flex flex-shrink-0 items-center justify-center rounded-l-xl bg-white px-3 py-2.5 text-[length:16px] shadow-sm'}
                      style={{ color: accentColor }}
                    >
                      {getPromotionIcon(promo)}
                    </div>
                    <div className={compact ? 'space-y-0.5 rounded-r-xl bg-black/10 px-2.5 py-2 backdrop-blur-[1px]' : 'space-y-0.5 rounded-r-xl bg-black/10 px-3.5 py-2.5 backdrop-blur-[1px]'}>
                      <p className={compact ? 'text-sm font-bold drop-shadow-sm leading-tight' : 'text-base font-bold drop-shadow-sm leading-tight'}>{promo.name}</p>
                      {(bannerText || description) && (
                        <p className={compact ? 'text-xs text-white/90 drop-shadow-sm line-clamp-1 leading-tight' : 'text-sm text-white/90 drop-shadow-sm line-clamp-2 leading-tight'}>
                          {bannerText || description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={promo.id}
              className="relative overflow-hidden rounded-xl shadow-lg"
              style={{ backgroundImage: PROMO_LINEAR_GRADIENT }}
            >
              <div className="absolute inset-0 opacity-80" style={{ backgroundImage: PROMO_LINEAR_GRADIENT }} />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.18),rgba(255,255,255,0))] opacity-60" />
              <div className={compact ? 'relative flex items-stretch pr-3' : 'relative flex items-stretch pr-5'}>
                <div
                  className={compact ? 'flex flex-shrink-0 items-center justify-center rounded-l-xl bg-white px-2.5 py-2 text-[length:14px] shadow-sm' : 'flex flex-shrink-0 items-center justify-center rounded-l-xl bg-white px-3 py-3 text-[length:16px] shadow-sm'}
                  style={{ color: accentColor }}
                  aria-hidden
                >
                  {getPromotionIcon(promo)}
                </div>
                <div className={compact ? 'flex min-w-0 flex-1 flex-col items-center gap-0 rounded-r-xl bg-white/0 pl-2.5 pr-0 pt-0 pb-0 sm:flex-row sm:items-center sm:justify-between' : 'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-r-xl bg-white/0 pl-3 pr-0 pt-0 pb-0 sm:flex-row sm:items-center sm:justify-between'}>
                  <p className={compact ? 'mb-0 truncate text-xs font-semibold leading-tight text-white sm:text-sm' : 'mb-0 truncate text-sm font-semibold leading-tight text-white sm:text-base'}>{promo.name}</p>
                  {description && (
                    <p className={compact ? 'mb-0 truncate text-[11px] text-white/90 sm:text-xs sm:text-right' : 'mb-0 truncate text-xs text-white/90 sm:text-sm sm:text-right'}>{description}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActivePromotionsDisplay;
