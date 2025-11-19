import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import { KitchenTicket as KitchenTicketOrder, SelectedProductExtraOption } from '../types';
import { useAuth } from '../contexts/AuthContext';
import OrderTimer from '../components/OrderTimer';
import { getOrderUrgencyStyles, getOrderUrgencyToneClasses } from '../utils/orderUrgency';
import { createIngredientNameMap, mapIngredientIdsToNames, type IngredientNameMap } from '../utils/ingredientNames';
import { PlusCircle } from 'lucide-react';

const computeNameSizeClass = (label: string) => {
    const trimmedLength = label.trim().length;

    if (trimmedLength <= 10) {
        return 'text-[clamp(1.755rem,3.9vw,2.275rem)]';
    }

    if (trimmedLength <= 16) {
        return 'text-[clamp(1.625rem,3.77vw,2.08rem)]';
    }

    if (trimmedLength <= 24) {
        return 'text-[clamp(1.495rem,3.51vw,1.885rem)]';
    }

    return 'text-[clamp(1.365rem,3.25vw,1.69rem)]';
};

const normalizeSelectedExtrasKey = (extras?: SelectedProductExtraOption[]) => {
    if (!extras || extras.length === 0) {
        return 'no_extras';
    }

    return extras
        .map(extra => `${extra.extraName}:::${extra.optionName}:::${extra.price}`)
        .sort()
        .join('|');
};

const KitchenTicketCard: React.FC<{ order: KitchenTicketOrder; onReady: (orderId: string, ticketTimestamp?: number) => void; canMarkReady: boolean; ingredientNameMap?: IngredientNameMap }> = ({ order, onReady, canMarkReady, ingredientNameMap }) => {

    const timerStart = order.date_envoi_cuisine || Date.now();
    const urgencyStyles = getOrderUrgencyStyles(timerStart);
    const urgencyTone = getOrderUrgencyToneClasses(timerStart);
    const toneBorderStyle = useMemo<React.CSSProperties>(() => ({ borderColor: urgencyTone.toneHex }), [urgencyTone.toneHex]);
    const toneFillStyle = useMemo<React.CSSProperties>(() => ({ backgroundColor: urgencyTone.toneHex }), [urgencyTone.toneHex]);
    const groupedItems = useMemo(() => {
        type GroupedItem = {
            key: string;
            nom_produit: string;
            quantite: number;
            commentaire?: string;
            selectedExtras?: SelectedProductExtraOption[];
            excludedIngredientIds?: string[];
        };

        const items: GroupedItem[] = [];
        const groupIndex = new Map<string, number>();

        order.items.forEach((item) => {
            const trimmedComment = item.commentaire?.trim();
            const commentKey = trimmedComment || 'no_comment';
            const extrasKey = normalizeSelectedExtrasKey(item.selected_extras);
            const excludedKey = item.excluded_ingredients && item.excluded_ingredients.length > 0
                ? [...item.excluded_ingredients].sort().join('|')
                : 'no_excluded';
            const baseKey = `${item.produitRef}::${commentKey}::${extrasKey}::${excludedKey}`;

            if (trimmedComment) {
                items.push({
                    key: `${baseKey}::${item.id}`,
                    nom_produit: item.nom_produit,
                    quantite: item.quantite,
                    commentaire: trimmedComment,
                    selectedExtras: item.selected_extras,
                    excludedIngredientIds: item.excluded_ingredients,
                });
                return;
            }

            const existingIndex = groupIndex.get(baseKey);

            if (existingIndex !== undefined) {
                items[existingIndex].quantite += item.quantite;
                return;
            }

            groupIndex.set(baseKey, items.length);
            items.push({
                key: baseKey,
                nom_produit: item.nom_produit,
                quantite: item.quantite,
                selectedExtras: item.selected_extras,
                excludedIngredientIds: item.excluded_ingredients,
            });
        });

        return items;
    }, [order.items]);

    const totalProducts = useMemo(
        () => order.items.reduce((total, item) => total + item.quantite, 0),
        [order.items],
    );

    const sentAt = new Date(order.date_envoi_cuisine || Date.now());
    const sentAtFormatted = sentAt.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });
    const displayName = order.table_nom || `Para llevar #${order.id.slice(-4)}`;
    const nameClass = computeNameSizeClass(displayName);

    const { borderClasses, quantityBackgroundClass } = (() => {
        switch (urgencyStyles.level) {
            case 'critical':
                return {
                    borderClasses: 'border-4 border-status-danger-hover',
                    quantityBackgroundClass: 'bg-status-danger-hover',
                };
            case 'warning':
                return {
                    borderClasses: 'border-4 border-yellow-500',
                    quantityBackgroundClass: 'bg-yellow-500',
                };
            default:
                return {
                    borderClasses: 'border-4 border-brand-dark',
                    quantityBackgroundClass: 'bg-brand-dark',
                };
        }
    })();

    return (
        <div className={`relative flex h-full flex-col overflow-hidden rounded-2xl ${urgencyTone.cardBorder} text-gray-900 transition-colors duration-300 ${urgencyStyles.background}`} style={toneBorderStyle}>
            <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${urgencyTone.timerBackground}`} style={toneFillStyle} />
            <header className="border-b border-gray-200 px-5 pt-3 pb-2">
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                    <div className="min-w-0 space-y-0.5">
                        <h4 className="truncate text-base font-semibold leading-tight text-gray-900 sm:text-lg md:text-xl">{displayName}</h4>
                        <p className="text-xs text-gray-500">
                            Pedido a las {sentAtFormatted}
                        </p>
                    </div>
                    <div className="flex flex-col items-start gap-1 sm:items-end">
                        <div className="flex w-full justify-start sm:justify-end">
                            <OrderTimer startTime={timerStart} className=" text-sm sm:text-base" />
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-hidden px-5 pt-2 pb-4">
                <div className="flex h-full flex-col gap-1">
                    <section className="flex flex-col overflow-hidden gap-1">
                        <h5 className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Artículos</h5>
                        <div className="flex-1 overflow-y-auto pr-1">
                            {groupedItems.length > 0 ? (
                                <ul className="space-y-0.5">
                                    {groupedItems.map((item) => {
                                        const excludedIngredientLabels = mapIngredientIdsToNames(
                                            item.excludedIngredientIds,
                                            ingredientNameMap,
                                        );
                                        const note = item.commentaire?.trim();
                                        return (
                                            <li key={item.key} className="flex items-stretch rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 shadow-sm overflow-hidden min-h-[3.5rem]">
                                                <div className="flex flex-1 flex-col gap-1 py-2 pr-3">
                                                    <div className="flex items-center">
                                                        <span className={`flex self-stretch w-12 shrink-0 items-center justify-center text-xl font-bold text-white shadow-md ${urgencyTone.quantityBackground} rounded-l-lg`} style={toneFillStyle}>
                                                            {item.quantite}
                                                        </span>
                                                        <span className="font-semibold text-gray-900 text-[clamp(1.1rem,2.1vw,1.3rem)] leading-snug break-words text-balance whitespace-normal [hyphens:auto] px-3">
                                                            {item.nom_produit}
                                                        </span>
                                                    </div>
                                                    {item.selectedExtras && item.selectedExtras.length > 0 && (
                                                        <div className="ml-12 mt-1 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 space-y-1">
                                                            {item.selectedExtras.map((extra, index) => (
                                                                <div key={`${item.key}-extra-${index}`} className="flex items-center gap-2">
                                                                    <span className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                                                                        <PlusCircle size={12} />
                                                                    </span>
                                                                    <span className="font-semibold text-emerald-700">{extra.extraName}:</span>
                                                                    <span className="text-emerald-800">{extra.optionName}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {excludedIngredientLabels.length > 0 && (
                                                        <p className="ml-12 mt-1 rounded-md border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                                                            🚫 Sin: {excludedIngredientLabels.join(', ')}
                                                        </p>
                                                    )}
                                                    {note && (
                                                        <p className="ml-12 rounded-md border border-dashed border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium italic text-blue-800">
                                                            {note}
                                                        </p>
                                                    )}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500 shadow-sm">
                                    Este pedido aún no tiene artículos registrados.
                                </p>
                            )}
                        </div>
                    </section>
                </div>
            </div>

            {canMarkReady && (
                <footer className="border-t border-gray-200 px-5 pb-5 pt-4">
                    <button
                        onClick={() => onReady(order.id, order.date_envoi_cuisine)}
                        className="w-full ui-btn ui-btn-success uppercase"
                        type="button"
                    >
                        Listo
                    </button>
                </footer>
            )}
        </div>
    );
};


const Cuisine: React.FC = () => {
    // FIX: Define state for orders and loading within the component.
    // The errors "Cannot find name 'loading'" and "Cannot find name 'setLoading'"
    // suggest these state definitions were missing or out of scope.
    const [orders, setOrders] = useState<KitchenTicketOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [ingredientNameMap, setIngredientNameMap] = useState<IngredientNameMap>({});
    const { role } = useAuth();

    const canMarkReady = role?.permissions['/cocina'] === 'editor';

    // FIX: Define fetchOrders using useCallback within the component scope.
    // The error "Cannot find name 'fetchOrders'" suggests this function
    // was missing or defined outside the component's scope.
    const fetchOrders = useCallback(async () => {
        try {
            const data = await api.getKitchenOrders();
            setOrders(data);
        // FIX: The caught exception variable in a catch block defines its scope.
        // The error "Cannot find name 'error'" suggests a mismatch, for example,
        // `catch (e)` but then using `error`. Using `catch (error)` makes the `error`
        // variable available within the block.
        } catch (error) {
            console.error("Failed to fetch kitchen orders", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 5000); // Refresh every 5 seconds
        const unsubscribe = api.notifications.subscribe('orders_updated', fetchOrders);
        return () => {
            clearInterval(interval);
            unsubscribe();
        };
    }, [fetchOrders]);

    useEffect(() => {
        let isMounted = true;
        const loadIngredients = async () => {
            try {
                const data = await api.getIngredients();
                if (isMounted) {
                    setIngredientNameMap(createIngredientNameMap(data));
                }
            } catch (error) {
                console.error("Failed to fetch ingredients", error);
            }
        };

        loadIngredients();
        return () => {
            isMounted = false;
        };
    }, []);

    const handleMarkAsReady = async (orderId: string, ticketTimestamp?: number) => {
        try {
            await api.markOrderAsReady(orderId, ticketTimestamp);
            fetchOrders(); // Refresh immediately
        } catch (error) {
            console.error("Failed to mark order as ready", error);
        }
    };

    // FIX: Use the 'loading' state variable that is defined within the component.
    if (loading) return <div className="text-gray-700">Cargando pedidos de cocina...</div>;

    return (
        <div className="flex h-full flex-col">
            {orders.length === 0 ? (
                <div className="mt-6 flex flex-1 items-center justify-center text-2xl text-gray-500">No hay pedidos en preparación.</div>
            ) : (
                <div className="mt-6 grid flex-1 grid-cols-1 justify-center gap-4 sm:[grid-template-columns:repeat(auto-fit,minmax(24rem,max-content))] sm:justify-start">
                    {orders.map(order => (
                        <KitchenTicketCard key={order.ticketKey} order={order} onReady={handleMarkAsReady} canMarkReady={canMarkReady} ingredientNameMap={ingredientNameMap} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Cuisine;
