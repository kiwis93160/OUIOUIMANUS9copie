import React, { useEffect, useState } from 'react';
import { fetchActivePromotions } from '../services/promotionsApi';
import { Promotion } from '../types/promotions';
import { Tag, Gift, TruckIcon, Clock, Percent } from 'lucide-react';

const PROMO_GRADIENT_FROM = '#f59e0b';
const PROMO_GRADIENT_TO = '#f97316';
const PROMO_LINEAR_GRADIENT = `linear-gradient(135deg, ${PROMO_GRADIENT_FROM}, ${PROMO_GRADIENT_TO})`;

const ActivePromotionsDisplay: React.FC = () => {
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
    <div className="mb-3 space-y-2.5">
      <div className="flex items-center gap-2 text-sm font-semibold text-white drop-shadow-sm">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm">
          <Gift size={16} className="text-black" />
        </div>
        <span className="text-base leading-tight">Promociones Activas</span>
      </div>

      <div className="space-y-2.5">
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
                  className="h-28 w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/35 to-transparent" />
                <div className="absolute inset-0 flex items-end p-3.5">
                  <div className="flex items-start gap-2.5 text-white">
                    <div
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white text-[length:16px] shadow-sm"
                      style={{ color: accentColor }}
                    >
                      {getPromotionIcon(promo)}
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-base font-bold drop-shadow-sm leading-tight">{promo.name}</p>
                      {(bannerText || description) && (
                        <p className="text-sm text-white/90 drop-shadow-sm line-clamp-2 leading-tight">
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
              <div className="relative flex items-center gap-2.5 p-0">
                <div
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white text-[length:16px] shadow-sm"
                  style={{ color: accentColor }}
                  aria-hidden
                >
                  {getPromotionIcon(promo)}
                </div>
                <div className="flex flex-1 flex-col gap-0.5 min-w-0 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold leading-tight text-white sm:text-base truncate">{promo.name}</p>
                  {description && (
                    <p className="text-xs text-white/90 sm:text-sm truncate sm:text-right">{description}</p>
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
