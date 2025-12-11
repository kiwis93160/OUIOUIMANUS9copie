import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, Category, OrderItem, Order, SelectedProductExtraOption, Ingredient } from '../types';

// Type pour les informations client

import { api } from '../services/api';
import { formatCurrencyCOP } from '../utils/formatIntegerAmount';
import { uploadPaymentReceipt } from '../services/cloudinary';
import { ShoppingCart, ArrowLeft, Clock, Minus, Plus, PlusCircle } from 'lucide-react';
import { storeActiveCustomerOrder, ONE_DAY_IN_MS } from '../services/customerOrderStorage';
import ProductCardWithPromotion from '../components/ProductCardWithPromotion';
import ActivePromotionsDisplay from '../components/ActivePromotionsDisplay';
import { fetchActivePromotions, applyPromotionsToOrder, fetchPromotionByCode } from '../services/promotionsApi';
import useSiteContent from '../hooks/useSiteContent';
import { formatScheduleWindow, isWithinSchedule, minutesUntilNextChange } from '../utils/timeWindow';
import { isWithinWeeklySchedule, formatWeeklySchedule } from '../utils/weeklyScheduleUtils';
import useOnlineOrderingSchedules from '../hooks/useOnlineOrderingSchedules';
import { DEFAULT_SITE_CONTENT } from '../utils/siteContent';
import OrderConfirmationModal from '../components/OrderConfirmationModal';
import CustomerOrderTracker from '../components/CustomerOrderTracker';
import {
    getDisplayableProductExtras,
    mapExcludedIngredientIdsToNames,
    mapSelectedExtrasFromState,
} from '../utils/productExtras';
import { createIngredientNameMap, mapIngredientIdsToNames } from '../utils/ingredientNames';

const DOMICILIO_FEE = 8000;
const DOMICILIO_ITEM_NAME = 'Domicilio';
const PENDING_CART_ITEM_KEY = 'customer-cart-pending-item';

const isDeliveryFeeItem = (item: OrderItem) => item.nom_produit === DOMICILIO_ITEM_NAME;

const createDeliveryFeeItem = (isFree: boolean = false): OrderItem => ({
    id: `delivery-${Date.now()}`,
    produitRef: 'delivery-fee',
    nom_produit: DOMICILIO_ITEM_NAME,
    prix_unitaire: isFree ? 0 : DOMICILIO_FEE,
    quantite: 1,
    excluded_ingredients: [],
    commentaire: '',
    estado: 'en_attente',
    selected_extras: [],
});

const isFreeShippingType = (type?: string | null) => (type ?? '').toLowerCase() === 'free_shipping';

const DEFAULT_CATEGORY_NAME = 'Otros';

interface SelectedProductState {
    product: Product;
    commentaire?: string;
    quantite?: number;
    excluded_ingredients?: string[];
    selected_extras?: SelectedProductExtraOption[];
}

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedProduct: SelectedProductState | null;
    onAddToCart: (item: OrderItem) => void;
}

interface CartCategoryGroup {
    name: string;
    items: OrderItem[];
}

const buildSelectionStateFromExtras = (extras?: SelectedProductExtraOption[]) => {
    if (!extras || extras.length === 0) {
        return {} as Record<string, string[]>;
    }

    return extras.reduce<Record<string, string[]>>((acc, extra) => {
        const current = acc[extra.extraName] ?? [];
        acc[extra.extraName] = [...current, extra.optionName];
        return acc;
    }, {});
};

const buildExtrasFromSelectionState = (
    product: Product,
    selection: Record<string, string[]>,
): SelectedProductExtraOption[] => mapSelectedExtrasFromState(product, selection);

const normalizeComment = (value?: string | null) => (value ?? '').trim();

const haveSameExcludedIngredients = (
    a: string[] | undefined,
    b: string[] | undefined,
) => {
    const normalizedA = [...(a ?? [])].sort();
    const normalizedB = [...(b ?? [])].sort();

    if (normalizedA.length !== normalizedB.length) {
        return false;
    }

    return normalizedA.every((value, index) => value === normalizedB[index]);
};

const normalizeSelectedExtras = (extras?: SelectedProductExtraOption[]) => {
    if (!extras || extras.length === 0) {
        return [] as string[];
    }

    return extras
        .map(extra => `${extra.extraName}:::${extra.optionName}:::${extra.price}:::${extra.ingredient_id ?? ''}`)
        .sort();
};

const haveSameSelectedExtras = (
    a?: SelectedProductExtraOption[],
    b?: SelectedProductExtraOption[],
) => {
    const normalizedA = normalizeSelectedExtras(a);
    const normalizedB = normalizeSelectedExtras(b);

    if (normalizedA.length !== normalizedB.length) {
        return false;
    }

    return normalizedA.every((value, index) => value === normalizedB[index]);
};

const calculateExtrasTotal = (extras?: SelectedProductExtraOption[]) => {
    if (!extras || extras.length === 0) {
        return 0;
    }

    return extras.reduce((sum, extra) => sum + extra.price, 0);
};

const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, selectedProduct, onAddToCart }) => {
    const [quantity, setQuantity] = useState(1);
    const [comment, setComment] = useState('');
    const [excludedIngredientIds, setExcludedIngredientIds] = useState<string[]>([]);
    const [selectedExtrasState, setSelectedExtrasState] = useState<Record<string, string[]>>({});

    useEffect(() => {
        if (isOpen) {
            setQuantity(selectedProduct?.quantite || 1);
            setComment(selectedProduct?.commentaire || '');
            setExcludedIngredientIds(selectedProduct?.excluded_ingredients || []);
            setSelectedExtrasState(buildSelectionStateFromExtras(selectedProduct?.selected_extras));
        }
    }, [isOpen, selectedProduct]);

    const product = selectedProduct?.product ?? null;
    const displayExtras = useMemo(() => {
        if (!product) {
            return [];
        }
        return getDisplayableProductExtras(product);
    }, [product]);
    const [standardExtras, removalExtras] = useMemo(() => {
        const extras = displayExtras ?? [];
        return [
            extras.filter(extra => !extra.isIngredientRemovalExtra),
            extras.filter(extra => Boolean(extra.isIngredientRemovalExtra)),
        ];
    }, [displayExtras]);
    const removalLabels = useMemo(() => {
        if (!product) {
            return [];
        }
        return mapExcludedIngredientIdsToNames(product, excludedIngredientIds);
    }, [product, excludedIngredientIds]);

    if (!isOpen || !selectedProduct || !product) return null;

    const selectedExtras = buildExtrasFromSelectionState(product, selectedExtrasState);
    const extrasTotal = calculateExtrasTotal(selectedExtras);
    const unitPrice = product.prix_vente + extrasTotal;

    const handleAddToCart = () => {
        if (!product) {
            return;
        }
        onAddToCart({
            id: `oi${Date.now()}`,
            produitRef: product.id,
            nom_produit: product.nom_produit,
            prix_unitaire: unitPrice,
            quantite: quantity,
            commentaire: comment.trim() || undefined,
            excluded_ingredients: excludedIngredientIds.length > 0 ? excludedIngredientIds : undefined,
            selected_extras: selectedExtras.length > 0 ? selectedExtras : undefined,
            addedAt: Date.now(),
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="text-[clamp(1.1rem,2.3vw,1.5rem)] font-bold leading-snug text-gray-800 break-words text-balance whitespace-normal [hyphens:auto]">
                            {product.nom_produit}
                        </h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    <img src={product.image} alt={product.nom_produit} className="w-full h-48 object-cover rounded-lg mb-4" />

                    <p className="text-gray-600 mb-4">{product.description}</p>

                    <div className="mb-4">
                        <p className="font-bold text-gray-800 mb-2">Precio: {formatCurrencyCOP(product.prix_vente)}</p>
                        
                        <div className="flex items-center mt-2">
                            <button 
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="bg-gray-200 text-gray-700 rounded-l-lg px-3 py-1"
                            >
                                -
                            </button>
                            <span className="bg-gray-100 px-4 py-1">{quantity}</span>
                            <button 
                                onClick={() => setQuantity(quantity + 1)}
                                className="bg-gray-200 text-gray-700 rounded-r-lg px-3 py-1"
                            >
                                +
                            </button>
                        </div>
                    </div>
                    
                    {displayExtras.length > 0 && (
                        <div className="mb-4 space-y-3">
                            {standardExtras.length > 0 && (
                                <div className="space-y-3 rounded-xl border border-orange-100 bg-gradient-to-br from-orange-50 via-rose-50 to-red-50 p-3">
                                    <p className="font-bold text-gray-800">Extras del producto</p>
                                    <div className="space-y-3">
                                        {standardExtras.map(extra => (
                                            <div key={extra.name} className="rounded-lg border border-gray-200 bg-white/70 p-3">
                                                <p className="text-sm font-semibold text-gray-700">{extra.name}</p>
                                                <div className="mt-2 space-y-2">
                                                    {extra.options.map(option => {
                                                        const isSelected = (selectedExtrasState[extra.name] ?? []).includes(option.name);
                                                        return (
                                                            <label
                                                                key={option.name}
                                                                className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm transition ${
                                                                    isSelected
                                                                        ? 'border-brand-primary bg-brand-primary/10 text-gray-900'
                                                                        : 'border-gray-200'
                                                                }`}
                                                            >
                                                                <span className="flex items-center gap-2">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isSelected}
                                                                        onChange={() => toggleExtraOption(extra.name, option.name)}
                                                                        className="accent-brand-primary"
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
                                    </div>
                                    {selectedExtras.length > 0 && (
                                        <div className="rounded-lg bg-white/70 p-3 text-sm text-gray-700 border border-gray-200">
                                            <p className="font-semibold">Extras seleccionados</p>
                                            <ul className="mt-1 space-y-1 text-xs text-gray-600">
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

                            {removalExtras.length > 0 && (
                                <div className="space-y-3 rounded-xl border border-orange-100 bg-gradient-to-br from-orange-50 via-rose-50 to-red-50 p-3">
                                    <p className="font-bold text-gray-800">Ingredientes para quitar</p>
                                    <div className="space-y-3">
                                        {removalExtras.map(extra => (
                                            <div key={extra.name} className="rounded-lg border border-gray-200 bg-white/70 p-3">
                                                <p className="text-sm font-semibold text-gray-700">{extra.name}</p>
                                                <div className="mt-2 space-y-2">
                                                    {extra.options.map(option => {
                                                        const isSelected = Boolean(option.ingredient_id && excludedIngredientIds.includes(option.ingredient_id));
                                                        return (
                                                            <label
                                                                key={option.name}
                                                                className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm transition ${
                                                                    isSelected
                                                                        ? 'border-brand-primary bg-brand-primary/10 text-gray-900'
                                                                        : 'border-gray-200'
                                                                }`}
                                                            >
                                                                <span className="flex items-center gap-2">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isSelected}
                                                                        disabled={!option.ingredient_id}
                                                                        onChange={() => option.ingredient_id && toggleExcludedIngredient(option.ingredient_id)}
                                                                        className="accent-brand-primary"
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
                                    </div>
                                    {removalLabels.length > 0 && (
                                        <div className="rounded-lg bg-white/70 p-3 text-sm text-gray-700 border border-gray-200">
                                            <p className="font-semibold">Sin ingredientes</p>
                                            <p className="text-xs text-gray-600">{removalLabels.join(', ')}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mb-4">
                        <label htmlFor="comment" className="block font-bold text-gray-800 mb-2">Comentarios adicionales:</label>
                        <textarea
                            id="comment"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2 text-gray-700"
                            rows={3}
                            placeholder="Instrucciones especiales, alergias, etc."
                        />
                    </div>
                    
                    <button
                        onClick={handleAddToCart}
                        className="w-full rounded-lg bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 py-3 px-4 font-bold text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:from-orange-600 hover:via-orange-700 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-orange-400/70 focus:ring-offset-2"
                    >
                        Agregar al carrito - {formatCurrencyCOP(unitPrice * quantity)}
                    </button>
                </div>
            </div>
        </div>
    );
};

interface OrderMenuViewProps {
    onOrderSubmitted?: (order: Order) => void;
}

const OrderMenuView: React.FC<OrderMenuViewProps> = ({ onOrderSubmitted }) => {
    const navigate = useNavigate();
    const { content: siteContent } = useSiteContent();
    const { schedule: weeklySchedule } = useOnlineOrderingSchedules();
    const safeContent = siteContent ?? DEFAULT_SITE_CONTENT;
    const orderBackgroundStyle = useMemo(
        () => ({ backgroundColor: '#640032' }),
        [],
    );
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeCategoryId, setActiveCategoryId] = useState('all');
    const [cart, setCart] = useState<OrderItem[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<SelectedProductState | null>(null);
    const [clientName, setClientName] = useState<string>('');
    const [clientPhone, setClientPhone] = useState<string>('');
    const [clientAddress, setClientAddress] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<'transferencia' | 'efectivo'>('transferencia');
    const [paymentProof, setPaymentProof] = useState<File | null>(null);
    const [paymentProofError, setPaymentProofError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);
    const [orderHistory, setOrderHistory] = useState<Order[]>([]);
    const [promoCode, setPromoCode] = useState<string>('');
    const [appliedPromoCode, setAppliedPromoCode] = useState<string>('');
    const [promoCodeError, setPromoCodeError] = useState<string>('');
    const [promoCodeDiscount, setPromoCodeDiscount] = useState<number>(0);
    const [validatingPromoCode, setValidatingPromoCode] = useState<boolean>(false);
    const [isFreeShipping, setIsFreeShipping] = useState<boolean>(false);
    const [now, setNow] = useState(() => new Date());
    const cartUpdateTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        const updateNow = () => setNow(new Date());
        updateNow();
        const interval = window.setInterval(updateNow, 60000);
        return () => window.clearInterval(interval);
    }, []);

    const isOrderingAvailable = isWithinWeeklySchedule(weeklySchedule, now);
    const weeklyScheduleFormatted = useMemo(
        () => formatWeeklySchedule(weeklySchedule, 'es-ES'),
        [weeklySchedule],
    );

    const [freeShippingMinAmount, setFreeShippingMinAmount] = useState<number>(80000);
    const [orderType, setOrderType] = useState<'pedir_en_linea' | 'a_emporter'>('pedir_en_linea');

    useEffect(() => {
        if (paymentMethod === 'efectivo') {
            setPaymentMethod('transferencia');
        }
    }, [paymentMethod]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [productsData, categoriesData, ingredientsData] = await Promise.all([
                    api.getProducts(),
                    api.getCategories(),
                    api.getIngredients(),
                ]);
                setProducts(productsData);
                setCategories(categoriesData);
                setIngredients(ingredientsData);
                
                // Fetch order history from localStorage
                try {
                    const historyJSON = localStorage.getItem('customer-order-history');
                    if (historyJSON) {
                        const history: Order[] = JSON.parse(historyJSON);
                        // Get the last 3 orders
                        setOrderHistory(history.slice(0, 3));
                    }
                } catch (err) {
                    console.error('Error fetching order history:', err);
                }
            } catch (err) {
                console.error('Error fetching data:', err);
                setError('Error al cargar los datos. Por favor, intenta de nuevo más tarde.');
            } finally {
                setLoading(false);
            }
        };
        
        fetchData();
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined' || loading) {
            return;
        }

        const pendingItemRaw = window.localStorage.getItem(PENDING_CART_ITEM_KEY);
        if (!pendingItemRaw) {
            return;
        }

        try {
            const pendingItem = JSON.parse(pendingItemRaw) as { productId: string; quantity?: number };
            const targetProduct = products.find(product => product.id === pendingItem.productId);

            if (!targetProduct) {
                return;
            }

            const quantity = pendingItem.quantity && pendingItem.quantity > 0 ? pendingItem.quantity : 1;

            setCart(prevCart => {
                const existingIndex = prevCart.findIndex(item =>
                    item.produitRef === targetProduct.id
                    && (!item.commentaire || item.commentaire.trim().length === 0)
                    && (!item.excluded_ingredients || item.excluded_ingredients.length === 0)
                    && (!item.selected_extras || item.selected_extras.length === 0)
                );

                if (existingIndex !== -1) {
                    const updatedCart = [...prevCart];
                    const existingItem = updatedCart[existingIndex];
                    updatedCart[existingIndex] = {
                        ...existingItem,
                        quantite: existingItem.quantite + quantity,
                    };
                    return updatedCart;
                }

                return [
                    ...prevCart,
                    {
                        id: `oi${Date.now()}`,
                        produitRef: targetProduct.id,
                        nom_produit: targetProduct.nom_produit,
                        prix_unitaire: targetProduct.prix_vente,
                        quantite: quantity,
                        excluded_ingredients: [],
                        commentaire: '',
                        selected_extras: [],
                        addedAt: Date.now(),
                        estado: 'en_attente',
                    },
                ];
            });
        } catch (error) {
            console.error('Error applying pending cart item', error);
        } finally {
            window.localStorage.removeItem(PENDING_CART_ITEM_KEY);
        }
    }, [loading, products]);

    const filteredProducts = useMemo(() => {
        if (activeCategoryId === 'all') return products;
        return products.filter(p => p.categoria_id === activeCategoryId);
    }, [products, activeCategoryId]);
    const ingredientNameMap = useMemo(() => createIngredientNameMap(ingredients), [ingredients]);
    const categoriesById = useMemo(
        () =>
            categories.reduce<Record<string, Category>>((acc, category) => {
                acc[category.id] = category;
                return acc;
            }, {}),
        [categories],
    );
    const productCategoryMap = useMemo(
        () =>
            products.reduce<Record<string, Category | undefined>>((acc, product) => {
                acc[product.id] = categoriesById[product.categoria_id];
                return acc;
            }, {}),
        [products, categoriesById],
    );
    const sortedCartItems = useMemo(() => {
        return cart
            .map((item, index) => ({ item, index }))
            .sort((a, b) => {
                const timeA = a.item.addedAt ?? 0;
                const timeB = b.item.addedAt ?? 0;
                if (timeA === timeB) {
                    return a.index - b.index;
                }
                return timeA - timeB;
            })
            .map(entry => entry.item);
    }, [cart]);
    const groupedCartItems = useMemo(() => {
        if (sortedCartItems.length === 0) {
            return [] as CartCategoryGroup[];
        }
        const groups: CartCategoryGroup[] = [];
        sortedCartItems.forEach(item => {
            const categoryName = productCategoryMap[item.produitRef]?.nom ?? DEFAULT_CATEGORY_NAME;
            const lastGroup = groups[groups.length - 1];
            if (lastGroup && lastGroup.name === categoryName) {
                lastGroup.items.push(item);
            } else {
                groups.push({ name: categoryName, items: [item] });
            }
        });
        return groups;
    }, [sortedCartItems, productCategoryMap]);

    const [orderTotals, setOrderTotals] = useState({
        subtotal: 0,
        total: 0,
        automaticPromotionsDiscount: 0,
        promoCodeDiscount: 0,
        deliveryFee: 0,
        appliedPromotions: []
    });

    const calculateOrderTotalsAsync = useCallback(async () => {
        const initialSubtotal = cart.reduce((acc, item) => acc + item.quantite * item.prix_unitaire, 0);

        if (cart.length === 0) {
            setOrderTotals({
                subtotal: 0,
                total: 0,
                automaticPromotionsDiscount: 0,
                promoCodeDiscount: 0,
                deliveryFee: 0,
                appliedPromotions: []
            });
            setIsFreeShipping(false);
            return;
        }

        const tempOrder: Order = {
            id: 'temp',
            items: cart,
            subtotal: initialSubtotal,
            total: initialSubtotal,
            total_discount: 0,
            applied_promotions: [],
            promo_code: appliedPromoCode || undefined,
            client_name: clientName,
            client_phone: clientPhone,
                client_address: clientAddress,
            shipping_cost: DOMICILIO_FEE, // Assurez-vous que DOMICILIO_FEE est défini ou récupéré ailleurs
        };

        const updatedOrder = await applyPromotionsToOrder(tempOrder);

        const totalDiscount = updatedOrder.total_discount || 0;
        const currentPromoCodeDiscount = updatedOrder.applied_promotions.find(p => p.config?.promo_code === appliedPromoCode)?.discount_amount || 0;
        const automaticPromotionsDiscount = totalDiscount - currentPromoCodeDiscount;

        let deliveryFee = orderType === 'pedir_en_linea' ? DOMICILIO_FEE : 0;
        const freeShippingPromotionApplied = updatedOrder.applied_promotions.some(p => isFreeShippingType(p.type));
        if (freeShippingPromotionApplied) {
            deliveryFee = 0;
        }
        setIsFreeShipping(freeShippingPromotionApplied);

        // Le total final doit être calculé en utilisant le total de updatedOrder
        // qui a déjà pris en compte toutes les promotions sauf les frais de livraison
        const finalTotal = updatedOrder.total + deliveryFee;

        setOrderTotals({
            subtotal: initialSubtotal,
            total: finalTotal,
            automaticPromotionsDiscount,
            promoCodeDiscount: currentPromoCodeDiscount,
            deliveryFee,
            appliedPromotions: updatedOrder.applied_promotions
        });
    }, [cart, appliedPromoCode, orderType, clientName, clientPhone, clientAddress, paymentMethod, DOMICILIO_FEE]);

    useEffect(() => {
        calculateOrderTotalsAsync();
    }, [calculateOrderTotalsAsync]);

    const { total, subtotal, promoCodeDiscount: currentPromoCodeDiscount, deliveryFee } = orderTotals;

    const handleProductClick = (product: Product) => {
        const existingItem = cart.find(item => item.produitRef === product.id);
        setSelectedProduct({
            product,
            quantite: 1,
            commentaire: existingItem?.commentaire,
            excluded_ingredients: existingItem?.excluded_ingredients,
            selected_extras: existingItem?.selected_extras,
        });
        setModalOpen(true);
    };

    const handleAddToCart = useCallback((item: OrderItem) => {
        const itemWithTimestamp = item.addedAt ? item : { ...item, addedAt: Date.now() };
        setCart(prevCart => {
            const existingIndex = prevCart.findIndex(existing =>
                existing.produitRef === itemWithTimestamp.produitRef
                && normalizeComment(existing.commentaire) === normalizeComment(itemWithTimestamp.commentaire)
                && haveSameExcludedIngredients(existing.excluded_ingredients, itemWithTimestamp.excluded_ingredients)
                && haveSameSelectedExtras(existing.selected_extras, itemWithTimestamp.selected_extras)
            );

            if (existingIndex > -1) {
                const newCart = [...prevCart];
                const existingItem = newCart[existingIndex];
                newCart[existingIndex] = {
                    ...existingItem,
                    quantite: existingItem.quantite + itemWithTimestamp.quantite,
                    commentaire: itemWithTimestamp.commentaire ?? existingItem.commentaire,
                    excluded_ingredients: itemWithTimestamp.excluded_ingredients ?? existingItem.excluded_ingredients,
                };
                return newCart;
            }

            return [...prevCart, itemWithTimestamp];
        });
        setModalOpen(false);
    }, [setCart, setModalOpen]);

    const handleCartItemQuantityChange = useCallback((itemId: string, delta: number) => {
        // Annuler et nettoyer tout timeout existant pour éviter les effets indésirables
        const existingTimeout = cartUpdateTimeouts.current.get(itemId);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
            cartUpdateTimeouts.current.delete(itemId);
        }

        // Mise à jour immédiate de l'UI
        setCart(prevCart => {
            const updatedCart = prevCart.map(item => {
                if (item.id === itemId) {
                    const newQuantity = Math.max(0, item.quantite + delta);
                    return { ...item, quantite: newQuantity };
                }
                return item;
            });

            return updatedCart.filter(item => item.quantite > 0);
        });
    }, [setCart]);

    const handleReorder = useCallback((order: Order) => {
        const baseTimestamp = Date.now();
        const itemsToReorder = order.items
            .filter(item => !isDeliveryFeeItem(item))
            .map((item, index) => ({
                ...item,
                addedAt: baseTimestamp + index,
            }));
        setCart(itemsToReorder);
    }, [setCart]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const reorderId = localStorage.getItem('customer-order-reorder-id');
        if (!reorderId) {
            return;
        }

        try {
            const historyJSON = localStorage.getItem('customer-order-history');
            if (!historyJSON) {
                return;
            }

            const history: Order[] = JSON.parse(historyJSON);
            const orderToReorder = history.find(order => order.id === reorderId);

            if (orderToReorder) {
                handleReorder(orderToReorder);
            }
        } catch (error) {
            console.error('Error applying reorder:', error);
        } finally {
            localStorage.removeItem('customer-order-reorder-id');
        }
    }, [handleReorder]);

    const handleApplyPromoCode = async () => {
        const trimmedCode = promoCode.trim().toUpperCase();
        if (!trimmedCode) return;

        if (appliedPromoCode && appliedPromoCode === trimmedCode) {
            setPromoCodeError('Este código ya está aplicado.');
            return;
        }

        setPromoCode(trimmedCode);
        setPromoCodeError('');
        setValidatingPromoCode(true);

        try {
            const promotion = await fetchPromotionByCode(trimmedCode);

            if (!promotion) {
                setPromoCodeError('Código promocional inválido o expirado.');
                return;
            }

            setAppliedPromoCode(trimmedCode);
        } catch (error) {
            console.error('Error validating promo code:', error);
            setPromoCodeError('No se pudo validar el código. Intenta nuevamente.');
        } finally {
            setValidatingPromoCode(false);
        }
    };

    const handleRemovePromoCode = () => {
        setAppliedPromoCode('');
        setPromoCode('');
        setPromoCodeError('');
    };

    const handleSubmitOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        let receiptUrl = '';
        if (paymentMethod === 'transferencia' && paymentProof) {
            try {
                receiptUrl = await uploadPaymentReceipt(paymentProof);
            } catch (error) {
                console.error('Error uploading receipt:', error);
                setError('Error al subir el comprobante de pago.');
                setSubmitting(false);
                return;
            }
        }

        const itemsToSubmit =
            orderType === 'pedir_en_linea'
                ? [...cart, createDeliveryFeeItem(isFreeShipping)]
                : cart;

        const finalOrder: Order = {
            id: `ord_${Date.now()}`,
            type: orderType,
            items: itemsToSubmit,
            clientInfo: {
                nom: clientName,
                telephone: clientPhone,
                adresse: clientAddress,
            },
            shipping_cost: deliveryFee,
            order_type: orderType,
            statut: 'pendiente_validacion',
            payment_method: paymentMethod,
            receipt_url: receiptUrl,
            subtotal: orderTotals.subtotal,
            total: orderTotals.total,
            total_discount: orderTotals.automaticPromotionsDiscount + orderTotals.promoCodeDiscount,
            promo_code: appliedPromoCode || undefined,
            applied_promotions: orderTotals.appliedPromotions,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        console.log('finalOrder.total avant createOrder:', finalOrder.total);
        console.log('orderTotals:', orderTotals);

        try {
            const submitted = await api.createOrder(finalOrder);
            console.log('submitted.total après createOrder:', submitted.total);
            setSubmittedOrder(submitted);
            setConfirmOpen(true);
            storeActiveCustomerOrder(submitted.id, Date.now() + ONE_DAY_IN_MS);
            onOrderSubmitted?.(submitted);
            
            // Store order in history
            try {
                const historyJSON = localStorage.getItem('customer-order-history');
                const history: Order[] = historyJSON ? JSON.parse(historyJSON) : [];
                const newHistory = [submitted, ...history].slice(0, 10); // Garder les 10 dernières commandes
                localStorage.setItem('customer-order-history', JSON.stringify(newHistory));
                setOrderHistory(newHistory.slice(0, 3));
            } catch (err) {
                console.error('Error updating order history:', err);
            }

        } catch (error) {
            console.error('Error submitting order:', error);
            setError('Error al enviar el pedido. Por favor, intenta de nuevo.');
        } finally {
            setSubmitting(false);
        }
    };

    const isMissingRequiredInfo =
        clientName.trim() === '' ||
        clientPhone.trim() === '' ||
        (orderType === 'pedir_en_linea' && clientAddress.trim() === '') ||
        (paymentMethod === 'transferencia' && !paymentProof);

    const isSubmitDisabled = submitting || cart.length === 0 || isMissingRequiredInfo;
    const shouldShowMissingInfoNotice = !submitting && cart.length > 0 && isMissingRequiredInfo;

    if (!isOrderingAvailable) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-600 via-red-600 to-rose-600">
                <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16 text-center text-white">
                    <div className="w-full rounded-3xl border border-white/20 bg-black/30 p-10 shadow-2xl backdrop-blur-xl">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-white">
                            <Clock size={32} />
                        </div>
                        <h1 className="mt-6 text-3xl font-bold sm:text-4xl">{safeContent.onlineOrdering.closedTitle}</h1>
                        <p className="mt-3 text-lg text-white/85">
                            {safeContent.onlineOrdering.closedSubtitle || 'Por favor consulte nuestros horarios a continuación.'}
                        </p>
                        <div className="mt-6 space-y-3 rounded-2xl bg-black/20 p-6 backdrop-blur-sm">
                            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/90">
                                Horarios de atención:
                            </p>
                            <div className="space-y-2">
                                {weeklyScheduleFormatted.map(({ day, label, schedule }) => (
                                    <div key={day} className="flex items-center text-base">
                                        <span className="font-medium text-white/80 w-24">{label}</span>
                                        <span className="font-semibold text-white">{schedule}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                            <button
                                type="button"
                                onClick={() => navigate('/')}
                                className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-red-600"
                            >
                                Retour à l'accueil
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="order-online-page min-h-screen flex flex-col lg:flex-row" style={orderBackgroundStyle}>
            {/* Main Content */}
            <div className="flex-1 p-4 lg:p-8 space-y-6">
                {/* Active Promotions Display */}
                <div className="px-4 pt-0 pb-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <ActivePromotionsDisplay />
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            className="inline-flex items-center text-sm font-semibold text-brand-primary hover:text-brand-primary/80 transition-colors self-start"
                        >
                            <ArrowLeft size={14} className="mr-1" />
                            Volver
                        </button>
                    </div>
                </div>

                {/* Category Filters */}
                <div className="flex space-x-3 mb-6 overflow-x-auto pb-2">
                    <button
                        onClick={() => setActiveCategoryId('all')}
                        className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${activeCategoryId === 'all' ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg scale-105 border-2 border-orange-600' : 'bg-white text-gray-800 shadow-md hover:bg-gray-100 border-2 border-gray-300'}`}
                    >
                        Todos
                    </button>
                    {categories.map(category => (
                        <button
                            key={category.id}
                            onClick={() => setActiveCategoryId(category.id)}
                            className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${activeCategoryId === category.id ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg scale-105 border-2 border-orange-600' : 'bg-white text-gray-800 shadow-md hover:bg-gray-100 border-2 border-gray-300'}`}
                        >
                            {category.nom}
                        </button>
                    ))}
                </div>

                {/* Product Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {filteredProducts.map(product => product && (
                        <ProductCardWithPromotion
                            key={product.id}
                            product={product}
                            onClick={() => handleProductClick(product)}
                        />
                    ))}
                </div>
            </div>

            {/* Order Summary / Cart */}
            <div className="lg:w-96 flex flex-col">
                <div className="order-cart rounded-3xl p-4 lg:p-6 shadow-xl flex flex-col">
                    {/* Tus ultimos pedidos - Compact version in cart */}
                    {orderHistory.length > 0 && (
                        <div className="mb-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                            <h3 className="text-sm font-bold text-gray-700 mb-1">Tus últimos pedidos</h3>
                            <div className="space-y-0.5">
                                {orderHistory.map(order => {
                                    // Try to get date from multiple possible fields
                                    let orderDate = 'Fecha no disponible';
                                    const dateField = order.created_at || order.date_commande || order.date_servido || order.timestamp;

                                    if (dateField) {
                                        try {
                                            const date = new Date(dateField);
                                            if (!isNaN(date.getTime())) {
                                                orderDate = date.toLocaleDateString('es-ES', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric'
                                                });
                                            }
                                        } catch (e) {
                                            console.error('Error parsing date:', e);
                                        }
                                    }

                                    // If still no date, use current date as fallback
                                    if (orderDate === 'Fecha no disponible') {
                                        orderDate = new Date().toLocaleDateString('es-ES', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric'
                                        });
                                    }

                                    // Count items excluding delivery fee
                                    const itemCount = order.items
                                        ? order.items
                                            .filter(item => !isDeliveryFeeItem(item))
                                            .reduce((acc, item) => acc + item.quantite, 0)
                                        : 0;

                                    return (
                                        <div key={order.id} className="flex justify-between items-center bg-white px-2 py-1 rounded border border-gray-200 hover:border-yellow-500 transition-all">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-gray-800 truncate mb-[5px]">Pedido del {orderDate}</p>
                                                <p className="text-xs text-gray-600 mb-[5px]">
                                                    {itemCount} article{itemCount > 1 ? 's' : ''} • {formatCurrencyCOP(order.total)}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleReorder(order)}
                                                className="ml-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold px-2.5 py-1 rounded text-xs whitespace-nowrap transition-all"
                                            >
                                                Pedir de nuevo
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    <h2 className="text-3xl font-bold text-gray-900 drop-shadow-md mb-4">Mi carrito</h2>

                {cart.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                        <ShoppingCart size={48} className="mb-3" />
                        <p>Tu carrito está vacío.</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-4">
                        {groupedCartItems.map((group, groupIndex) => (
                            <div
                                key={`${group.name}-${groupIndex}`}
                                className={`space-y-2.5 border-t border-orange-100 ${groupIndex === 0 ? 'border-t-0 pt-0' : 'pt-3'}`}
                            >
                                {group.items.map(item => {
                                    const excludedIngredientLabels = mapIngredientIdsToNames(item.excluded_ingredients, ingredientNameMap);
                                    return (
                                        <div
                                            key={item.id}
                                            className="group relative rounded-2xl border border-orange-300/70 bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 px-3 py-3 text-white shadow-xl shadow-orange-200/80"
                                        >
                                            <div className="flex flex-col">
                                                <div className="flex items-start justify-between gap-3">
                                                    <p className="flex-1 text-[clamp(0.95rem,1.9vw,1.2rem)] font-semibold leading-tight text-white break-words text-balance whitespace-normal [hyphens:auto] drop-shadow-sm">
                                                        {item?.nom_produit || 'Artículo'}
                                                    </p>
                                                    <div className="flex items-center gap-1.5 rounded-full border border-orange-200 bg-white/80 px-2.5 py-1 text-sm font-semibold text-gray-900 shadow-sm">
                                                        <button
                                                            onClick={() => handleCartItemQuantityChange(item.id, -1)}
                                                            className="rounded-full p-1 text-orange-600 transition hover:bg-orange-100"
                                                            aria-label="Disminuir cantidad"
                                                        >
                                                            <Minus size={14} />
                                                        </button>
                                                        <span className="min-w-[1.5rem] text-center text-base font-bold text-gray-900">{item.quantite}</span>
                                                        <button
                                                            onClick={() => handleCartItemQuantityChange(item.id, 1)}
                                                            className="rounded-full p-1 text-orange-600 transition hover:bg-orange-100"
                                                            aria-label="Aumentar cantidad"
                                                        >
                                                            <Plus size={14} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {item.commentaire && (
                                                    <p className="mt-2.5 text-sm text-gray-800 bg-white/90 border-l-2 border-orange-200 p-2 rounded shadow-sm">
                                                        💬 {item.commentaire}
                                                    </p>
                                                )}
                                                {item.selected_extras && item.selected_extras.length > 0 && (
                                                    <div className="mt-2.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-800 shadow-inner space-y-1">
                                                        {item.selected_extras.map((extra, extraIndex) => (
                                                            <div key={`${item.id}-cart-extra-${extraIndex}`} className="flex items-center gap-2">
                                                                <span className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                                                                    <PlusCircle size={14} />
                                                                </span>
                                                                <span className="font-semibold text-emerald-700">{extra.extraName}:</span>
                                                                <span className="font-semibold text-emerald-800 flex-1">{extra.optionName}</span>
                                                                <span className="font-semibold text-emerald-700">{formatCurrencyCOP(extra.price)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {excludedIngredientLabels.length > 0 && (
                                                    <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 shadow-inner">
                                                        🚫 Sin: {excludedIngredientLabels.join(', ')}
                                                    </p>
                                                )}

                                                <div className="mt-3 flex justify-end">
                                                    <span className="text-lg font-bold text-white drop-shadow-sm">
                                                        {formatCurrencyCOP(item.prix_unitaire)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                )}


                {cart.length > 0 && orderType === 'pedir_en_linea' && (
                    <div className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0">
                        <p className="font-medium text-gray-800">{DOMICILIO_ITEM_NAME}</p>
                        {isFreeShipping ? (
                            <div className="flex items-center space-x-2">
                                <p className="text-sm text-gray-400 line-through">{formatCurrencyCOP(DOMICILIO_FEE)}</p>
                                <p className="text-sm font-bold text-green-600">GRATIS</p>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-600">{formatCurrencyCOP(DOMICILIO_FEE)}</p>
                        )}
                    </div>
                )}
                <div className="mt-auto pt-4 border-t border-gray-200">
                    {/* Affichage détaillé des promotions appliquées */}
                    {orderTotals.appliedPromotions && orderTotals.appliedPromotions.length > 0 && (
                        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm font-bold text-green-800 mb-2">🎉 Promociones aplicadas:</p>
                            {orderTotals.appliedPromotions.map((promo, index) => {
                                const formattedDiscount = `- ${formatCurrencyCOP(promo.discount_amount)}`;

                                if (orderType === 'a_emporter') {
                                    return (
                                        <div key={index} className="mb-2 text-sm text-green-700">
                                            <p className="font-semibold">{promo.name}</p>
                                            <p className="font-semibold">{formattedDiscount}</p>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={index} className="flex justify-between items-center mb-1 text-sm">
                                        <span className="text-green-700">{promo.name}</span>
                                        <span className="font-semibold text-green-700">{formattedDiscount}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {promoCodeDiscount > 0 && (
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-sm text-green-600">Descuento por código promocional:</p>
                            <p className="text-sm font-bold text-green-600">- {formatCurrencyCOP(promoCodeDiscount)}</p>
                        </div>
                    )}
                    <div className="flex justify-between items-center mb-3">
                        <p className="text-lg font-bold text-gray-800">Gran total:</p>
                        <p className="text-3xl font-bold text-brand-primary">{formatCurrencyCOP(total)}</p>
                    </div>

                    {/* Promo Code Input */}
                    <div className="mt-6">
                        <label htmlFor="promoCode" className="block text-sm font-medium text-gray-700 mb-2">
                            Código de Promoción:
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                id="promoCode"
                                value={promoCode}
                                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                placeholder="Ingresa tu código"
                                className="flex-1 border border-gray-300 rounded-md shadow-sm p-2 uppercase"
                            />

                            <button
                                type="button"
                                onClick={handleApplyPromoCode}
                                disabled={validatingPromoCode || !promoCode.trim() || appliedPromoCode === promoCode}
                                aria-busy={validatingPromoCode}
                                className="rounded-md bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 px-4 py-2 font-bold text-white shadow-sm transition-all duration-300 hover:from-orange-600 hover:via-orange-700 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {validatingPromoCode ? 'Validando…' : 'Confirmar'}
                            </button>
                        </div>
                        {promoCodeError && (
                            <p className="mt-2 text-sm text-red-600">{promoCodeError}</p>
                        )}
                        {appliedPromoCode && (
                            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md flex items-center justify-between">
                                <span className="text-sm text-green-700 font-medium">
                                    ✓ Código "{appliedPromoCode}" aplicado
                                </span>
                                <button
                                    type="button"
                                    onClick={handleRemovePromoCode}
                                    className="text-red-500 hover:text-red-700 text-sm font-medium"
                                >
                                    Eliminar
                                </button>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSubmitOrder} className="space-y-4">
                        {/* Sélecteur de type de commande */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de pedido:</label>
                            <div className="space-y-2">
                                <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition ${orderType === 'pedir_en_linea' ? 'border-brand-primary bg-brand-primary/5' : 'border-gray-300 hover:border-brand-primary/50'}`}>
                                    <input
                                        type="radio"
                                        name="orderType"
                                        value="pedir_en_linea"
                                        checked={orderType === 'pedir_en_linea'}
                                        onChange={() => setOrderType('pedir_en_linea')}
                                        className="form-radio text-brand-primary" 
                                    />
                                    <span className="ml-3 font-medium">🚚 Domicilio (con entrega)</span>
                                </label>
                                <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition ${orderType === 'a_emporter' ? 'border-brand-primary bg-brand-primary/5' : 'border-gray-300 hover:border-brand-primary/50'}`}>
                                    <input
                                        type="radio"
                                        name="orderType"
                                        value="a_emporter"
                                        checked={orderType === 'a_emporter'}
                                        onChange={() => setOrderType('a_emporter')}
                                        className="form-radio text-brand-primary" 
                                    />
                                    <span className="ml-3 font-medium">🏪 Para llevar (recoger en tienda)</span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="clientName" className="block text-sm font-medium text-gray-700">
                                Nombre: <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="clientName"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="clientPhone" className="block text-sm font-medium text-gray-700">
                                Teléfono: <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="tel"
                                id="clientPhone"
                                value={clientPhone}
                                onChange={(e) => setClientPhone(e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                required
                            />
                        </div>

                        {orderType === 'pedir_en_linea' && (
                            <div>
                                <label htmlFor="clientAddress" className="block text-sm font-medium text-gray-700">
                                    Dirección: <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    id="clientAddress"
                                    value={clientAddress}
                                    onChange={(e) => setClientAddress(e.target.value)}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    rows={3}
                                    required
                                ></textarea>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Método de pago:</label>
                            <div className="space-y-2">
                                <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition ${paymentMethod === 'transferencia' ? 'border-brand-primary bg-brand-primary/5' : 'border-gray-300 hover:border-brand-primary/50'}`}>
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value="transferencia"
                                        checked={paymentMethod === 'transferencia'}
                                        onChange={() => setPaymentMethod('transferencia')}
                                        className="form-radio text-brand-primary" 
                                    />
                                    <span className="ml-3 font-medium">💰 Transferencia Bancaria</span>
                                </label>
                                <label
                                    className="flex items-center rounded-lg border-2 border-gray-200 bg-gray-100 p-3 opacity-70 cursor-not-allowed"
                                    aria-disabled="true"
                                >
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value="efectivo"
                                        checked={paymentMethod === 'efectivo'}
                                        onChange={() => {}}
                                        disabled
                                        className="form-radio text-gray-400"
                                    />
                                    <span className="ml-3 font-medium text-gray-500">
                                        <span>💵 Efectivo</span>
                                        <span className="block text-xs font-normal uppercase tracking-wide text-gray-500/80">
                                            No disponible por el momento
                                        </span>
                                    </span>
                                </label>
                            </div>
                        </div>

                        {paymentMethod === 'transferencia' && (
                            <div>
                                <label htmlFor="paymentProof" className="block text-sm font-medium text-gray-700">
                                    Comprobante de pago: <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="file"
                                    id="paymentProof"
                                    onChange={(e) => {
                                        const file = e.target.files ? e.target.files[0] : null;
                                        if (file && !file.type.startsWith('image/')) {
                                            setPaymentProof(null);
                                            setPaymentProofError('Solo se permiten archivos de imagen para el comprobante.');
                                            e.target.value = '';
                                            return;
                                        }
                                        setPaymentProof(file);
                                        setPaymentProofError(null);
                                    }}
                                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    accept="image/*"
                                    required
                                />
                                {paymentProofError && (
                                    <p className="mt-2 text-sm text-red-600">{paymentProofError}</p>
                                )}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitDisabled}
                            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Enviando pedido...' : 'Confirmar Pedido'}
                        </button>
                        {shouldShowMissingInfoNotice && (
                            <p className="mt-2 text-sm text-red-600">
                                Faltan datos obligatorios. Completa los campos marcados con <span className="font-semibold">*</span>.
                            </p>
                        )}
                    </form>
                </div>
            </div>

            {selectedProduct && (
                <ProductModal
                    isOpen={modalOpen}
                    onClose={() => setModalOpen(false)}
                    selectedProduct={selectedProduct}
                    onAddToCart={handleAddToCart}
                />
            )}

            {submittedOrder && (
                <OrderConfirmationModal
                    isOpen={confirmOpen}
                    order={submittedOrder}
                    whatsappNumber={safeContent.onlineOrdering.confirmationWhatsappNumber}
                    onClose={() => {
                        setConfirmOpen(false);
                        setCart([]);
                        setClientName('');
                        setClientPhone('');
                        setClientAddress('');
                        setPaymentMethod('transferencia');
                        setPaymentProof(null);
                        setAppliedPromoCode('');
                        setPromoCodeDiscount(0);
                    }}
                />
            )}
        </div>
    </div>
    );
};

export default OrderMenuView;
