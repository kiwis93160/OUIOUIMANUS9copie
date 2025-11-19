import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Product, Category } from '../../types';
import { formatCurrencyCOP } from '../../utils/formatIntegerAmount';

export interface ProductGridProps {
    filteredProducts: Product[];
    quantities: Record<string, number>;
    onAdd: (product: Product) => void;
    activeCategoryId: string;
    categories: Category[];
    onSelectCategory: (categoryId: string) => void;
    handleProductPointerDown: (
        product: Product,
    ) => (event: React.PointerEvent<HTMLDivElement>) => void;
    handleProductKeyDown: (
        product: Product,
    ) => (event: React.KeyboardEvent<HTMLDivElement>) => void;
    productStockStatuses: ProductStockStatusMap;
}

export type ProductStockIssueStatus = 'low' | 'out';

export interface ProductStockIssue {
    id: string;
    name: string;
    currentStock: number;
    minimumStock: number;
    status: ProductStockIssueStatus;
}

export interface ProductStockStatus {
    hasLowStock: boolean;
    hasOutOfStock: boolean;
    affectedIngredients: ProductStockIssue[];
}

export type ProductStockStatusMap = Partial<Record<string, ProductStockStatus>>;

const ProductGridComponent: React.FC<ProductGridProps> = ({
    filteredProducts,
    quantities,
    onAdd,
    activeCategoryId,
    categories,
    onSelectCategory,
    handleProductPointerDown,
    handleProductKeyDown,
    productStockStatuses,
}) => {
    const [activeStockProductId, setActiveStockProductId] = useState<string | null>(null);

    const closeStockPopover = useCallback(() => {
        setActiveStockProductId(null);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (target?.closest('[data-stock-popover="true"]')) {
                return;
            }
            closeStockPopover();
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [closeStockPopover]);

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closeStockPopover();
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [closeStockPopover]);

    useEffect(() => {
        if (activeStockProductId && !filteredProducts.some(product => product.id === activeStockProductId)) {
            setActiveStockProductId(null);
        }
    }, [activeStockProductId, filteredProducts]);

    const stockIndicatorAriaLabel = useMemo(() => ({
        low: 'Afficher les ingrédients en stock critique',
        out: 'Afficher les ingrédients en rupture de stock',
    }), []);

    return (
        <div className="flex flex-1 flex-col overflow-hidden">
            <div className="border-b border-gray-200/30 p-2">
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    <button
                        onClick={() => onSelectCategory('all')}
                        className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition ${
                            activeCategoryId === 'all'
                                ? 'bg-brand-primary text-brand-secondary shadow'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                    >
                        Tous
                    </button>
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => onSelectCategory(cat.id)}
                            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition ${
                                activeCategoryId === cat.id
                                    ? 'bg-brand-primary text-brand-secondary shadow'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                            {cat.nom}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredProducts.map((product) => {
                        const stockStatus = productStockStatuses[product.id];
                        const hasStockIssue = Boolean(stockStatus?.affectedIngredients?.length);
                        const quantityInCart = quantities[product.id] || 0;
                        const isSelected = quantityInCart > 0;
                        const handleProductClick = () => onAdd(product);
                        const handlePointerDown = handleProductPointerDown(product);
                        const handleKeyDown = handleProductKeyDown(product);
                        const iconColorClasses = stockStatus?.hasOutOfStock
                            ? isSelected
                                ? 'bg-white/20 text-red-200 border-red-200 focus-visible:ring-red-200/80'
                                : 'bg-red-50 text-red-600 border border-red-200 focus-visible:ring-red-400'
                            : isSelected
                                ? 'bg-white/20 text-amber-100 border-amber-200 focus-visible:ring-amber-100/60'
                                : 'bg-amber-50 text-amber-600 border border-amber-200 focus-visible:ring-amber-400';
                        const stockIconAriaLabel = stockStatus?.hasOutOfStock
                            ? stockIndicatorAriaLabel.out
                            : stockIndicatorAriaLabel.low;

                        return (
                            <div
                                key={product.id}
                                onClick={handleProductClick}
                                onPointerDown={handlePointerDown}
                                onKeyDown={handleKeyDown}
                                role="button"
                                tabIndex={0}
                                className={`relative flex cursor-pointer flex-col items-center rounded-xl p-2 text-center transition-all focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-gray-900 ${
                                    isSelected
                                        ? 'bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 text-white shadow-xl shadow-orange-500/30'
                                        : 'border border-gray-200 bg-white text-black hover:shadow-lg'
                                } ${hasStockIssue && !isSelected ? 'border-2 border-amber-500' : ''}`}
                            >
                                {quantityInCart > 0 && (
                                    <div className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-accent text-xs font-bold text-white">
                                        {quantityInCart}
                                    </div>
                                )}
                                {hasStockIssue && stockStatus && (
                                    <div className="absolute right-1.5 top-1.5 flex flex-col items-end" data-stock-popover="true">
                                        <button
                                            type="button"
                                            className={`flex items-center justify-center rounded-full border p-1.5 text-base shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${iconColorClasses}`}
                                            aria-label={`${stockIconAriaLabel} pour ${product.nom_produit}`}
                                            aria-haspopup="dialog"
                                            aria-expanded={activeStockProductId === product.id}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                event.preventDefault();
                                                setActiveStockProductId(prev => (prev === product.id ? null : product.id));
                                            }}
                                        >
                                            <AlertTriangle size={32} strokeWidth={2.2} />
                                        </button>
                                        {activeStockProductId === product.id && (
                                            <div
                                                className="z-20 mt-2 w-64 max-w-[calc(100vw-3rem)] rounded-2xl border border-gray-200 bg-white p-3 text-left shadow-2xl sm:w-72"
                                                role="dialog"
                                                aria-label={`Ingrédients à surveiller pour ${product.nom_produit}`}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="text-sm font-semibold text-gray-900">Ingrédients à surveiller</p>
                                                    <button
                                                        type="button"
                                                        className="text-gray-500 transition hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            event.preventDefault();
                                                            closeStockPopover();
                                                        }}
                                                        aria-label="Fermer les détails de stock"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                                <ul className="mt-2 space-y-2 text-sm text-gray-700">
                                                    {stockStatus.affectedIngredients.map(ingredient => (
                                                        <li
                                                            key={`${product.id}-${ingredient.id}`}
                                                            className="flex items-start justify-between gap-2 rounded-xl bg-gray-50 p-2"
                                                        >
                                                            <div className="min-w-0">
                                                                <p className="font-semibold text-gray-900" title={ingredient.name}>
                                                                    {ingredient.name}
                                                                </p>
                                                                <p className="text-xs text-gray-600">
                                                                    Stock : {ingredient.currentStock} / Min : {ingredient.minimumStock}
                                                                </p>
                                                            </div>
                                                            <span
                                                                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                                                                    ingredient.status === 'out'
                                                                        ? 'bg-red-100 text-red-700'
                                                                        : 'bg-amber-100 text-amber-700'
                                                                }`}
                                                            >
                                                                {ingredient.status === 'out' ? 'Rupture' : 'Critique'}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <img
                                    src={product.image}
                                    alt={product.nom_produit}
                                    className="mb-1.5 aspect-square w-full rounded-md object-cover"
                                />
                                <p
                                    className={`text-[clamp(0.85rem,1.6vw,0.95rem)] font-semibold leading-tight ${isSelected ? 'text-white' : 'text-black'} text-balance text-center break-words whitespace-normal [hyphens:auto]`}
                                    style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                                >
                                    {product.nom_produit}
                                </p>
                                <p
                                    className={`mt-0.5 w-full text-[0.7rem] ${isSelected ? 'text-white/90' : 'text-black/70'} text-center leading-tight`}
                                    style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                                >
                                    {product.description}
                                </p>
                                <p className={`mt-1.5 font-bold text-sm ${isSelected ? 'text-white' : 'text-black'}`}>
                                    {formatCurrencyCOP(product.prix_vente)}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default memo(ProductGridComponent);
