import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, LayoutDashboard, X } from 'lucide-react';
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
                    <div className="flex w-full justify-end sm:w-auto">
                        <button
                            type="button"
                            onClick={onNavigateToPlan}
                            className="inline-flex items-center gap-2 rounded-full border border-brand-primary px-4 py-2 text-sm font-semibold text-brand-primary transition hover:bg-brand-primary hover:text-brand-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
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
                                                className="z-20 mt-3 w-[min(20rem,calc(100vw-3rem))] rounded-2xl border border-gray-200 bg-white text-left shadow-2xl sm:w-80"
                                                role="dialog"
                                                aria-label={`Ingrédients à surveiller pour ${product.nom_produit}`}
                                            >
                                                <div className="border-b px-4 py-3">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                                                                Ingrédients à surveiller
                                                            </p>
                                                            <p className="text-sm text-gray-600">
                                                                Vérifiez le stock avant d'ajouter {product.nom_produit}.
                                                            </p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="rounded-full p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
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
                                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                                        <span
                                                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                                                stockStatus.hasOutOfStock
                                                                    ? 'bg-red-100 text-red-700'
                                                                    : 'bg-amber-100 text-amber-700'
                                                            }`}
                                                        >
                                                            <AlertTriangle size={12} />
                                                            {stockStatus.hasOutOfStock ? 'Rupture signalée' : 'Stock critique'}
                                                        </span>
                                                        <span>{stockStatus.affectedIngredients.length} ingrédient(s)</span>
                                                    </div>
                                                </div>
                                                <div className="max-h-64 divide-y divide-gray-100 overflow-y-auto">
                                                    {stockStatus.affectedIngredients.map(ingredient => (
                                                        <div
                                                            key={`${product.id}-${ingredient.id}`}
                                                            className="flex items-start justify-between gap-3 px-4 py-3 text-sm text-gray-700"
                                                        >
                                                            <div className="min-w-0">
                                                                <p className="font-semibold text-gray-900" title={ingredient.name}>
                                                                    {ingredient.name}
                                                                </p>
                                                                <p className="text-xs text-gray-600">
                                                                    Stock :{' '}
                                                                    <span className="font-semibold text-gray-900">{ingredient.currentStock}</span>
                                                                    {' '} / Min :{' '}
                                                                    <span className="font-semibold text-gray-900">{ingredient.minimumStock}</span>
                                                                </p>
                                                            </div>
                                                            <div className="flex flex-col items-end gap-1 text-xs text-gray-500">
                                                                <span
                                                                    className={`rounded-full px-2 py-0.5 font-semibold ${
                                                                        ingredient.status === 'out'
                                                                            ? 'bg-red-100 text-red-700'
                                                                            : 'bg-amber-100 text-amber-700'
                                                                    }`}
                                                                >
                                                                    {ingredient.status === 'out' ? 'Rupture' : 'Critique'}
                                                                </span>
                                                                <span className="text-[11px] uppercase tracking-wide">
                                                                    Manque : {Math.max(ingredient.minimumStock - ingredient.currentStock, 0)}
                                                                </span>
                                                            </div>
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
