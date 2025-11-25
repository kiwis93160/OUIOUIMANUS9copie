import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, LayoutDashboard } from 'lucide-react';
import { Product, Category } from '../../types';
import { formatCurrencyCOP } from '../../utils/formatIntegerAmount';

export interface ProductGridProps {
    filteredProducts: Product[];
    quantities: Record<string, number>;
    onAdd: (product: Product) => void;
    onQuickAdd: (product: Product) => void;
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
    onNavigateToPlan: () => void;
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
    onNavigateToPlan,
    onQuickAdd,
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
            <div className="border-b border-gray-200/30 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-1">
                        <button
                            onClick={() => onSelectCategory('all')}
                            className={`shrink-0 rounded-full px-5 py-2 text-sm font-bold whitespace-nowrap transition-all ${
                                activeCategoryId === 'all'
                                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg scale-105 border-2 border-orange-600'
                                    : 'bg-white text-gray-800 shadow-md hover:bg-gray-100 border-2 border-gray-300'
                            }`}
                        >
                            Tous
                        </button>
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => onSelectCategory(cat.id)}
                                className={`shrink-0 rounded-full px-5 py-2 text-sm font-bold whitespace-nowrap transition-all ${
                                    activeCategoryId === cat.id
                                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg scale-105 border-2 border-orange-600'
                                        : 'bg-white text-gray-800 shadow-md hover:bg-gray-100 border-2 border-gray-300'
                                }`}
                            >
                                {cat.nom}
                            </button>
                        ))}
                    </div>
                    <div className="flex w-full justify-end sm:w-auto">
                        <button
                            type="button"
                            onClick={onNavigateToPlan}
                            className="inline-flex items-center gap-2 rounded-full border border-brand-primary bg-white px-4 py-2 text-sm font-semibold text-brand-primary shadow-sm transition hover:bg-brand-primary hover:text-brand-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                            title="Plan de salle"
                        >
                            <LayoutDashboard size={16} />
                            <span>Plan de salle</span>
                        </button>
                    </div>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredProducts.map((product) => {
                        const stockStatus = productStockStatuses[product.id];
                        const hasStockIssue = Boolean(stockStatus?.affectedIngredients?.length);
                        const quantityInCart = quantities[product.id] || 0;
                        const isSelected = quantityInCart > 0;
                        const isAvailable = product.estado === 'disponible';
                        const handleProductClick = () => {
                            if (!isAvailable) {
                                return;
                            }
                            onAdd(product);
                        };
                        const handlePointerDown = handleProductPointerDown(product);
                        const handleKeyDown = handleProductKeyDown(product);
                        const iconColorClasses = stockStatus?.hasOutOfStock
                            ? 'bg-red-50 text-red-600 border border-red-200 focus-visible:ring-red-400'
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
                                className={`relative flex cursor-pointer flex-col items-center rounded-2xl p-4 text-center transition-all focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-gray-900 border border-white/60 bg-white/90 shadow-lg backdrop-blur-md hover:shadow-xl ${
                                    isSelected ? 'ring-2 ring-orange-400 shadow-orange-300/60 scale-[1.01]' : ''
                                } ${hasStockIssue ? 'border-amber-300' : ''}`}
                            >
                                {quantityInCart > 0 && (
                                    <div className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 text-xs font-bold text-white shadow-md">
                                        {quantityInCart}
                                    </div>
                                )}
                                {hasStockIssue && stockStatus && (
                                    <div
                                        className="absolute left-1.5 right-1.5 top-1.5 flex flex-col items-end"
                                        data-stock-popover="true"
                                    >
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
                                                className="z-20 mt-2 w-full max-w-full rounded-xl border border-amber-200 bg-white/95 text-left text-sm shadow-xl backdrop-blur"
                                                role="dialog"
                                                aria-label={`Ingrédients à surveiller pour ${product.nom_produit}`}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    event.preventDefault();
                                                    closeStockPopover();
                                                }}
                                            >
                                                <div className="max-h-48 divide-y divide-gray-100 overflow-y-auto">
                                                    {stockStatus.affectedIngredients.map(ingredient => (
                                                        <div
                                                            key={`${product.id}-${ingredient.id}`}
                                                            className="flex items-center justify-between gap-3 px-3 py-2"
                                                        >
                                                            <span className="truncate font-medium text-gray-900" title={ingredient.name}>
                                                                {ingredient.name}
                                                            </span>
                                                            <span
                                                                className={`shrink-0 font-semibold ${
                                                                    ingredient.status === 'out'
                                                                        ? 'text-red-600'
                                                                        : 'text-amber-600'
                                                                }`}
                                                            >
                                                                {ingredient.currentStock} / {ingredient.minimumStock}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <img
                                    src={product.image}
                                    alt={product.nom_produit}
                                    className="mb-4 aspect-[4/3] w-full rounded-xl object-cover shadow-sm"
                                />
                                <p
                                    className="text-[clamp(1rem,2vw,1.2rem)] font-extrabold leading-snug text-gray-900 text-balance text-center break-words whitespace-normal [hyphens:auto]"
                                    style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                                >
                                    {product.nom_produit}
                                </p>
                                <p
                                    className="mt-2 w-full text-sm text-gray-600 text-center leading-tight px-1 line-clamp-2"
                                >
                                    {product.description}
                                </p>
                                <p className="mt-2 font-bold text-lg text-gray-800">
                                    {formatCurrencyCOP(product.prix_vente)}
                                </p>
                                <div className="mt-3 w-full">
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            if (!isAvailable) {
                                                return;
                                            }
                                            onQuickAdd(product);
                                        }}
                                        disabled={!isAvailable}
                                        className="w-full rounded-lg bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 py-2 font-bold text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:from-orange-600 hover:via-orange-700 hover:to-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        Agregar
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default memo(ProductGridComponent);
