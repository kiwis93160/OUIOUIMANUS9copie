import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import { KitchenTicket as KitchenTicketOrder } from '../types';
import { useAuth } from '../contexts/AuthContext';
import OrderTimer from '../components/OrderTimer';
import { getOrderUrgencyStyles, getOrderUrgencyToneClasses } from '../utils/orderUrgency';

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

const KitchenTicketCard: React.FC<{ order: KitchenTicketOrder; onReady: (orderId: string, ticketTimestamp?: number) => void; canMarkReady: boolean }> = ({ order, onReady, canMarkReady }) => {

    const timerStart = order.date_envoi_cuisine || Date.now();
    const urgencyStyles = getOrderUrgencyStyles(timerStart);
    const urgencyTone = getOrderUrgencyToneClasses(timerStart);
    const groupedItems = useMemo(() => {
        type GroupedItem = {
            key: string;
            nom_produit: string;
            quantite: number;
            commentaire?: string;
        };

        const items: GroupedItem[] = [];
        const groupIndex = new Map<string, number>();

        order.items.forEach((item) => {
            const trimmedComment = item.commentaire?.trim();
            const commentKey = trimmedComment || 'no_comment';
            const baseKey = `${item.produitRef}::${commentKey}`;

            if (trimmedComment) {
                items.push({
                    key: `${baseKey}::${item.id}`,
                    nom_produit: item.nom_produit,
                    quantite: item.quantite,
                    commentaire: trimmedComment,
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
        <div className={`relative flex h-full flex-col overflow-hidden rounded-2xl ${urgencyTone.cardBorder} text-gray-900 transition-colors duration-300 ${urgencyStyles.background}`}>
            <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${urgencyStyles.accent}`} />
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
                                        const note = item.commentaire?.trim();
                                        return (
                                            <li key={item.key} className="flex items-stretch rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 shadow-sm overflow-hidden min-h-[3.5rem]">
                                                <div className="flex flex-1 items-center justify-between gap-3 pr-3">
                                                    <div className="flex flex-1 items-center">
                                                        <span className={`flex self-stretch w-12 shrink-0 items-center justify-center text-xl font-bold text-white shadow-md ${urgencyTone.quantityBackground} rounded-l-lg`}>
                                                            {item.quantite}
                                                        </span>
                                                        <span className="font-semibold text-gray-900 text-[clamp(1.1rem,2.1vw,1.3rem)] leading-snug break-words text-balance whitespace-normal [hyphens:auto] px-3 py-3">
                                                            {item.nom_produit}
                                                        </span>
                                                    </div>
                                                </div>
                                                {note && (
                                                    <p className="mt-2 rounded-md border border-dashed border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium italic text-blue-800 ml-14 mr-3">
                                                        {note}
                                                    </p>
                                                )}
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
                        <KitchenTicketCard key={order.ticketKey} order={order} onReady={handleMarkAsReady} canMarkReady={canMarkReady} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Cuisine;
