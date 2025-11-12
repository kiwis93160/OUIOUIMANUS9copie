import React, { useEffect, useState } from 'react';
import { fetchActivePromotions } from '../services/promotionsApi';
import { Promotion } from '../types/promotions';
import { Tag, Gift, TruckIcon, Clock, Percent } from 'lucide-react';

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

  const lightenColor = (color: string, amount = 0.35) => {
    const hex = color.replace('#', '');
    if (hex.length !== 6 && hex.length !== 3) {
      return color;
    }

    const normalizedHex = hex.length === 3
      ? hex.split('').map((char) => char + char).join('')
      : hex;

    const channels = [
      parseInt(normalizedHex.slice(0, 2), 16),
      parseInt(normalizedHex.slice(2, 4), 16),
      parseInt(normalizedHex.slice(4, 6), 16),
    ];

    const adjustChannel = (channel: number) =>
      Math.min(255, Math.round(channel + (255 - channel) * amount));

    const toHex = (channel: number) => channel.toString(16).padStart(2, '0');

    const [r, g, b] = channels.map(adjustChannel);
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
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
    <div className="mb-4 space-y-2">
      <h3 className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-2 text-sm font-semibold text-gray-900/90 backdrop-blur-md drop-shadow-md">
        <Gift size={20} />
        Promociones Activas
      </h3>
      <div className="space-y-2">
        {visiblePromotions.map((promo) => {
          const bgColor = promo.visuals?.badge_bg_color || '#4CAF50';
          const bannerImage = promo.visuals?.banner_image;
          const bannerText = promo.visuals?.banner_text;
          
          // Si une bannière d'image est disponible, l'afficher en grand
          if (bannerImage) {
            return (
              <div
                key={promo.id}
                className="relative overflow-hidden rounded-lg shadow-md transition-transform hover:scale-[1.02]"
              >
                <img
                  src={bannerImage}
                  alt={promo.name}
                  className="w-full h-32 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                  <div className="text-white">
                    <p className="font-bold text-lg drop-shadow-md">{promo.name}</p>
                    {bannerText && (
                      <p className="text-sm drop-shadow-md">{bannerText}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          }
          
          // Sinon, afficher le format compact habituel
          const gradientMidColor = lightenColor(bgColor, 0.5);
          const gradientEndColor = lightenColor(bgColor, 0.8);

          return (
            <div
              key={promo.id}
              className="flex items-center rounded-lg shadow-md transition-transform hover:scale-[1.01] overflow-hidden border-l-4"
              style={{
                borderLeftColor: bgColor,
                background: `linear-gradient(to right, ${bgColor} 0%, ${gradientMidColor} 55%, ${gradientEndColor} 100%)`,
              }}
            >
              <div
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center"
                style={{
                  backgroundColor: bgColor,
                  color: '#FFFFFF',
                }}
              >
                {getPromotionIcon(promo)}
              </div>
              <div className="flex-1 px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <p className="font-bold text-white text-sm drop-shadow-sm">{promo.name}</p>
                <p className="text-xs text-gray-700 truncate sm:ml-2">{getPromotionDescription(promo)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActivePromotionsDisplay;
