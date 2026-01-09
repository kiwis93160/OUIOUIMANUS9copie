import React from 'react';
import { Product } from '../types';
import { formatCurrencyCOP } from '../utils/formatIntegerAmount';
import PromotionBadge from './promotions/PromotionBadge';
import useProductPromotions from '../hooks/useProductPromotions';

interface ProductCardWithPromotionProps {
  product: Product;
  onClick: () => void;
}

/**
 * Composant de carte produit avec badge promotionnel
 */
const ProductCardWithPromotion: React.FC<ProductCardWithPromotionProps> = ({ product, onClick }) => {
  // Récupérer toutes les promotions applicables au produit
  const { promotions, loading } = useProductPromotions(product);

  return (
    <div
      onClick={() => product.estado === 'disponible' && onClick()}
      className={`relative rounded-2xl border border-white/60 bg-white/70 backdrop-blur-md p-4 flex h-full flex-col items-center text-center transition-shadow shadow-lg ${
        product.estado === 'disponible' ? 'cursor-pointer hover:shadow-xl' : 'opacity-60'
      }`}
    >
      {/* Afficher tous les badges promotionnels si des promotions sont applicables */}
      {!loading && promotions.length > 0 && product.estado === 'disponible' && (
        <div className="absolute top-2 right-2 flex flex-wrap gap-1 max-w-[calc(100%-1rem)] justify-end z-10">
          {promotions.map((promotion, index) => (
            <PromotionBadge key={promotion.id || index} promotion={promotion} />
          ))}
        </div>
      )}
      
      {/* Image du produit */}
      <img 
        src={product.image} 
        alt={product.nom_produit} 
        className="w-full h-44 object-cover rounded-xl mb-2 aspect-4/3" 
      />
      
      {/* Nom du produit */}
      <div className="flex w-full flex-1 flex-col items-center">
        <div className="flex w-full items-start justify-between gap-2">
          <p
            className="flex-1 text-left font-extrabold text-gray-900 leading-snug text-[clamp(1rem,2.2vw,1.2rem)] break-words text-balance whitespace-normal [hyphens:auto] tracking-tight"
          >
            {product.nom_produit}
          </p>
          <p className="text-right font-bold text-lg text-gray-800">
            {formatCurrencyCOP(product.prix_vente)}
          </p>
        </div>

        {/* Description */}
        <p className="text-sm text-left text-gray-600 mt-1 px-1 max-h-10 overflow-hidden line-clamp-2">
          {product.description}
        </p>

        <div className="mt-auto w-full pt-2">
          {/* Statut */}
          {product.estado !== 'disponible' && (
            <span className="text-xs text-red-500 font-bold">Agotado</span>
          )}
          {product.estado === 'disponible' && (
            <button
              onClick={(e) => { e.stopPropagation(); onClick(); }}
              className="w-full rounded-lg bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 py-2 font-bold text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:from-orange-600 hover:via-orange-700 hover:to-red-700"
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
