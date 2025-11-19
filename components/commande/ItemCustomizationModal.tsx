import React, { useEffect, useMemo, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import Modal from '../Modal';
import type { Product, SelectedProductExtraOption } from '../../types';
import { formatCurrencyCOP } from '../../utils/formatIntegerAmount';
import { getDisplayableProductExtras, mapSelectedExtrasFromState } from '../../utils/productExtras';

export interface ItemCustomizationResult {
    quantity: number;
    comment: string;
    selectedExtras: SelectedProductExtraOption[];
    excludedIngredientIds: string[];
}

export interface ItemCustomizationModalProps {
    isOpen: boolean;
    product: Product | null;
    onClose: () => void;
    onSave: (result: ItemCustomizationResult) => void;
}

const ItemCustomizationModal: React.FC<ItemCustomizationModalProps> = ({
    isOpen,
    product,
    onClose,
    onSave,
}) => {
    const [quantity, setQuantity] = useState(1);
    const [comment, setComment] = useState('');
    const [selectedExtrasState, setSelectedExtrasState] = useState<Record<string, string[]>>({});
    const [excludedIngredientIds, setExcludedIngredientIds] = useState<string[]>([]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        setQuantity(1);
        setComment('');
        setSelectedExtrasState({});
        setExcludedIngredientIds([]);
    }, [isOpen, product?.id]);

    const displayExtras = useMemo(() => (
        product
            ? getDisplayableProductExtras(product)
            : []
    ), [product]);

    if (!product) {
        return null;
    }

    const buildSelectedExtras = (): SelectedProductExtraOption[] => {
        if (!product) {
            return [];
        }

        return mapSelectedExtrasFromState(product, selectedExtrasState);
    };

    const selectedExtras = buildSelectedExtras();
    const extrasTotal = selectedExtras.reduce((sum, extra) => sum + extra.price, 0);
    const unitPrice = product.prix_vente + extrasTotal;

    const handleDecrease = () => {
        setQuantity(prev => Math.max(1, prev - 1));
    };

    const handleIncrease = () => {
        setQuantity(prev => prev + 1);
    };

    const handleSave = () => {
        onSave({
            quantity,
            comment,
            selectedExtras,
            excludedIngredientIds,
        });
    };

    const toggleExcludedIngredient = (ingredientId: string) => {
        setExcludedIngredientIds(prev =>
            prev.includes(ingredientId)
                ? prev.filter(id => id !== ingredientId)
                : [...prev, ingredientId],
        );
    };

    const toggleExtraOption = (extraName: string, optionName: string) => {
        setSelectedExtrasState(prev => {
            const current = new Set(prev[extraName] ?? []);
            if (current.has(optionName)) {
                current.delete(optionName);
            } else {
                current.add(optionName);
            }

            const next = { ...prev };
            if (current.size > 0) {
                next[extraName] = Array.from(current);
            } else {
                delete next[extraName];
            }
            return next;
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={product.nom_produit}>
            <div className="space-y-4">
                <img
                    src={product.image}
                    alt={product.nom_produit}
                    className="w-full h-48 object-cover rounded-lg"
                />
                {product.description && (
                    <p className="text-gray-200 text-sm">{product.description}</p>
                )}
                {displayExtras.length > 0 && (
                    <div className="space-y-3 rounded-xl border border-gray-700/60 bg-gray-900/40 p-4">
                        <p className="text-sm font-semibold text-gray-100">Extras del producto</p>
                        {displayExtras.map(extra => (
                            <div key={extra.name} className="space-y-2">
                                <p className="text-xs uppercase tracking-wide text-gray-400">{extra.name}</p>
                                <div className="space-y-2">
                                    {extra.options.map(option => {
                                        const isRemovalExtra = Boolean(extra.isIngredientRemovalExtra);
                                        const isSelected = isRemovalExtra
                                            ? Boolean(option.ingredient_id && excludedIngredientIds.includes(option.ingredient_id))
                                            : (selectedExtrasState[extra.name] ?? []).includes(option.name);
                                        return (
                                            <label
                                                key={option.name}
                                                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
                                                    isSelected
                                                        ? 'border-brand-primary bg-brand-primary/10 text-white'
                                                        : 'border-gray-700 text-gray-200'
                                                }`}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        className="accent-brand-primary"
                                                        checked={isSelected}
                                                        disabled={isRemovalExtra && !option.ingredient_id}
                                                        onChange={() => {
                                                            if (isRemovalExtra && option.ingredient_id) {
                                                                toggleExcludedIngredient(option.ingredient_id);
                                                            } else {
                                                                toggleExtraOption(extra.name, option.name);
                                                            }
                                                        }}
                                                    />
                                                    {option.name}
                                                </span>
                                                {option.price > 0 && (
                                                    <span className="text-xs font-semibold text-brand-primary">
                                                        + {formatCurrencyCOP(option.price)}
                                                    </span>
                                                )}
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                        {selectedExtras.length > 0 && (
                            <div className="rounded-lg bg-black/30 p-3 text-sm text-gray-200">
                                <p className="font-semibold">Extras seleccionados</p>
                                <ul className="mt-2 space-y-1 text-xs text-gray-300">
                                    {selectedExtras.map((extra, index) => (
                                        <li key={`${extra.extraName}-${extra.optionName}-${index}`}>
                                            {extra.extraName}: {extra.optionName} (+{formatCurrencyCOP(extra.price)})
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
                <div>
                    <label className="block text-sm font-medium text-gray-200">Comentario</label>
                    <textarea
                        value={comment}
                        onChange={(event) => setComment(event.target.value)}
                        rows={2}
                        className="mt-1 block w-full rounded-md border border-gray-600 bg-gray-900/60 py-2 px-3 text-sm text-gray-100 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        placeholder="Alergias, instrucciones específicas..."
                    />
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleDecrease}
                            className="p-2 rounded-full bg-gray-800 text-gray-100 hover:bg-gray-700"
                            aria-label="Disminuir la cantidad"
                        >
                            <Minus size={18} />
                        </button>
                        <span className="w-8 text-center text-lg font-bold text-gray-100">{quantity}</span>
                        <button
                            type="button"
                            onClick={handleIncrease}
                            className="p-2 rounded-full bg-gray-800 text-gray-100 hover:bg-gray-700"
                            aria-label="Aumentar la cantidad"
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="rounded-lg bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 py-2 px-6 font-semibold text-white shadow-md transition-all duration-300 hover:from-orange-600 hover:via-orange-700 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-orange-400/70 focus:ring-offset-2"
                    >
                        Agregar ({formatCurrencyCOP(unitPrice * quantity)})
                    </button>
                </div>
                <p className="text-xs text-gray-400">
                    Precio unitario: {formatCurrencyCOP(unitPrice)}
                </p>
            </div>
        </Modal>
    );
};

export default ItemCustomizationModal;
