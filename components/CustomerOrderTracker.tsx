import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { Order } from '../types';
import { CheckCircle, ChefHat, FileText, PackageCheck, User, MapPin, Receipt, Phone, Tag, TruckIcon, Percent, Gift } from 'lucide-react';
import { formatCurrencyCOP } from '../utils/formatIntegerAmount';
import {
    clearActiveCustomerOrder,
    getActiveCustomerOrder,
    ONE_DAY_IN_MS,
    storeActiveCustomerOrder,
} from '../services/customerOrderStorage';
import Modal from './Modal';

type TrackerProgressStyle = React.CSSProperties & {
    '--tracker-progress-target': string;
};

const FALLBACK_SUPPORT_PHONE_DIGITS = '573238090562';
const FALLBACK_SUPPORT_PHONE_DISPLAY = '+57 323 809 0562';

const sanitizePhoneDigits = (value: string): string => value.replace(/[^\d]/g, '');

const isFreeShippingType = (type?: string | null) => (type ?? '').toLowerCase() === 'free_shipping';

const saveOrderToHistory = (order: Order) => {
    try {
        const historyJSON = localStorage.getItem('customer-order-history');
        const history: Order[] = historyJSON ? JSON.parse(historyJSON) : [];
        const existingIndex = history.findIndex(h => h.id === order.id);

        if (existingIndex !== -1) {
            history.splice(existingIndex, 1);
        }

        history.unshift(order); // Add to the beginning so most recent stays first

        const trimmedHistory = history.slice(0, 10); // Keep last 10 orders
        localStorage.setItem('customer-order-history', JSON.stringify(trimmedHistory));
    } catch (e) {
        console.error("Failed to save order to history:", e);
    }
};

const CompletionStamp: React.FC<{ className?: string }> = ({ className }) => (
    <div
        className={`pointer-events-none select-none z-[60] drop-shadow-[0_20px_45px_rgba(16,185,129,0.45)] ${className ?? ''}`}
        aria-hidden="true"
    >
        <style>{`
            @keyframes completion-stamp-pop {
                0% {
                    transform: scale(0) rotate(-18deg);
                    opacity: 0;
                }
                55% {
                    transform: scale(1.12) rotate(-8deg);
                }
                100% {
                    transform: scale(1) rotate(-12deg);
                    opacity: 1;
                }
            }
        `}</style>
        <div className="relative h-28 w-28 sm:h-32 sm:w-32 md:h-36 md:w-36 animate-[completion-stamp-pop_0.6s_cubic-bezier(0.34,1.56,0.64,1)_forwards]">
            <div className="absolute inset-0 rounded-full bg-emerald-400/30 blur-xl" />
            <div className="absolute inset-1 rounded-full border-2 border-emerald-300/50" />
            <div className="absolute inset-0 rounded-full border border-white/30 opacity-50 mix-blend-screen" />
            <div className="relative flex h-full w-full items-center justify-center rounded-full border-[6px] border-emerald-400/80 bg-gradient-to-br from-emerald-500/30 via-emerald-500/20 to-teal-400/25 shadow-[0_18px_45px_rgba(16,185,129,0.35)] backdrop-blur">
                <div className="absolute inset-[10%] rounded-full border-2 border-dashed border-emerald-300/70" />
                <div className="absolute inset-[22%] rounded-full border border-emerald-400/40" />
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.45),transparent_55%)] opacity-40" />
                <div className="relative flex flex-col items-center justify-center gap-1 text-center text-emerald-50 drop-shadow-[0_4px_12px_rgba(15,118,110,0.45)]">
                    <span className="text-sm sm:text-base font-black uppercase tracking-[0.32em] text-emerald-100">Pedido</span>
                    <span className="text-xl sm:text-2xl font-black uppercase tracking-[0.28em] text-emerald-50">Listo</span>
                </div>
            </div>
        </div>
    </div>
);

interface CustomerOrderTrackerProps {
  orderId: string;
  onNewOrderClick: () => void;
  variant?: 'page' | 'hero';
  supportPhoneNumber?: string;
}

const CustomerOrderTracker: React.FC<CustomerOrderTrackerProps> = ({
  orderId,
  onNewOrderClick,
  variant = 'page',
  supportPhoneNumber,
}) => {
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [isReceiptModalOpen, setReceiptModalOpen] = useState(false);
    const [productDescriptions, setProductDescriptions] = useState<Record<string, string>>({});
    const [isReceiptPreviewError, setReceiptPreviewError] = useState(false);

    const receiptUrl = order?.receipt_url ?? '';
    const normalizedSupportPhone = (supportPhoneNumber ?? '').trim();
    const supportDigits = sanitizePhoneDigits(normalizedSupportPhone);
    const resolvedSupportDigits = supportDigits || FALLBACK_SUPPORT_PHONE_DIGITS;
    const resolvedSupportDisplay = normalizedSupportPhone || FALLBACK_SUPPORT_PHONE_DISPLAY;
    const supportWhatsappHref = `https://wa.me/${resolvedSupportDigits}`;
    const sanitizedReceiptUrl = receiptUrl.split('?')[0]?.toLowerCase() ?? '';
    const isReceiptPdf = sanitizedReceiptUrl.endsWith('.pdf');
    const canDisplayReceiptImage = Boolean(receiptUrl) && !isReceiptPdf && !isReceiptPreviewError;

    useEffect(() => {
        setReceiptPreviewError(false);
    }, [receiptUrl]);

    const handleOpenReceiptInNewTab = useCallback(() => {
        if (receiptUrl && typeof window !== 'undefined') {
            window.open(receiptUrl, '_blank', 'noopener,noreferrer');
        }
    }, [receiptUrl]);

    const receiptModalContent = useMemo(() => {
        if (!receiptUrl) {
            return <p>No se proporcionó ningún comprobante.</p>;
        }

        if (canDisplayReceiptImage) {
            return (
                <img
                    src={receiptUrl}
                    alt="Comprobante"
                    className="h-auto w-full rounded-md"
                    onError={() => setReceiptPreviewError(true)}
                />
            );
        }

        if (isReceiptPdf) {
            return (
                <div className="space-y-4">
                    <object
                        data={receiptUrl}
                        type="application/pdf"
                        className="h-[70vh] w-full rounded-xl border border-slate-200"
                    >
                        <p className="p-4 text-sm text-slate-600">
                            No es posible mostrar el PDF. Puedes abrirlo en una nueva pestaña más abajo.
                        </p>
                    </object>
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        <span>Si el PDF no aparece, ábrelo en una nueva pestaña.</span>
                        <button
                            type="button"
                            onClick={handleOpenReceiptInNewTab}
                            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
                        >
                            <Receipt size={16} /> Abrir el documento
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-600">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-inner">
                    <Receipt size={24} className="text-slate-500" />
                </div>
                <div className="space-y-1">
                    <p className="text-base font-semibold text-slate-700">Vista previa no disponible</p>
                    <p className="text-sm text-slate-500">Toca el botón de abajo para ver el comprobante.</p>
                </div>
                <button
                    type="button"
                    onClick={handleOpenReceiptInNewTab}
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
                >
                    <Receipt size={16} /> Abrir el documento
                </button>
            </div>
        );
    }, [receiptUrl, canDisplayReceiptImage, isReceiptPdf, handleOpenReceiptInNewTab, setReceiptPreviewError]);

    const steps = [
        { name: 'Enviado', icon: FileText, description: 'Tu pedido se envió a la cocina', subtext: 'Estamos verificando tu orden' },
        { name: 'Validado', icon: CheckCircle, description: 'Esperando la validacion de tu pedido', subtext: 'Enviando a la cocina' },
        { name: 'En preparacion', icon: ChefHat, description: 'Nuestros chefs están preparando tus platos', subtext: 'Tu pedido estará listo pronto' },
        { name: 'Listo', icon: PackageCheck, description: 'Tu pedido está listo para entrega', subtext: 'Puedes pasar a retirarlo' },
        { name: 'Entregado', icon: TruckIcon, description: 'Tu pedido fue entregado', subtext: '¡Buen provecho!' }
    ];

    const promotionColorSchemes = useMemo(
        () => [
            {
                gradient: 'from-brand-primary to-brand-primary-dark',
                border: 'border-brand-primary/40',
                glow: 'shadow-[0_10px_25px_rgba(249,168,38,0.35)]',
            },
            {
                gradient: 'from-emerald-500 to-emerald-600',
                border: 'border-emerald-200/70',
                glow: 'shadow-[0_10px_25px_rgba(16,185,129,0.35)]',
            },
            {
                gradient: 'from-sky-500 to-indigo-600',
                border: 'border-sky-200/70',
                glow: 'shadow-[0_10px_25px_rgba(56,189,248,0.35)]',
            },
            {
                gradient: 'from-rose-500 to-red-600',
                border: 'border-rose-200/70',
                glow: 'shadow-[0_10px_25px_rgba(244,114,182,0.35)]',
            },
            {
                gradient: 'from-amber-500 to-orange-600',
                border: 'border-amber-200/70',
                glow: 'shadow-[0_10px_25px_rgba(251,191,36,0.35)]',
            },
        ],
        []
    );

    const getCurrentStepIndex = useCallback((order: Order | null): number => {
        if (!order) return -1;

        if (
            order.statut === 'finalisee' ||
            order.estado_cocina === 'servido' ||
            order.estado_cocina === 'entregada'
        ) {
            return 4;
        }

        if (order.estado_cocina === 'listo') {
            return 3;
        }

        if (order.estado_cocina === 'recibido' || order.statut === 'en_cours') {
            return 2;
        }

        if (order.statut === 'pendiente_validacion' || order.estado_cocina === 'no_enviado') {
            return 1;
        }

        return 0;
    }, []);

    const currentStep = useMemo(() => getCurrentStepIndex(order), [order, getCurrentStepIndex]);

    // Fonction pour calculer le temps estimé par étape
    const getEstimatedTime = useCallback((stepIndex: number): string => {
        if (!order) return '';
        
        const itemCount = order.items?.length ?? 0;
        const baseTime = 15; // Temps de base en minutes
        const timePerItem = 3; // Minutes supplémentaires par article
        
        switch (stepIndex) {
            case 0: // Enviado
                return '2-5 min';
            case 1: // Validado
                return '1-3 min';
            case 2: // En preparacion
                const prepTime = baseTime + (itemCount * timePerItem);
                return `${prepTime}-${prepTime + 5} min`;
            case 3: // Listo
                return '¡Listo!';
            case 4: // Entregado
                return 'Completado';
            default:
                return '';
        }
    }, [order]);

    // Fonction pour obtenir l'horodatage d'une étape
    const getStepTimestamp = useCallback((stepIndex: number): string => {
        if (!order) return '';
        
        const formatTime = (timestamp: number | null | undefined): string => {
            if (!timestamp) return '';
            const date = new Date(timestamp);
            return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        };
        
        switch (stepIndex) {
            case 0: // Enviado
                return formatTime(order.created_at);
            case 1: // Validado
                return formatTime(order.date_validado);
            case 2: // En preparacion
                return formatTime(order.date_en_preparacion);
            case 3: // Listo
                return formatTime(order.date_listo_cuisine);
            case 4: // Entregado
                return formatTime(order.date_servido);
            default:
                return '';
        }
    }, [order]);

    // Calcul réel de la position dans la file d'attente
    const [queuePosition, setQueuePosition] = useState<number | null>(null);
    
    useEffect(() => {
        const calculateQueuePosition = async () => {
            if (!order || currentStep >= 3 || order.type_commande !== 'a_emporter') {
                setQueuePosition(null);
                return;
            }
            
            try {
                // Récupérer toutes les commandes "à emporter" non terminées
                const allOrders = await api.getOrders();
                const takeawayOrders = allOrders
                    .filter((o: Order) => o.type_commande === 'a_emporter' && o.statut !== 'servido')
                    .sort((a: Order, b: Order) => (a.created_at || 0) - (b.created_at || 0));
                
                // Trouver la position de la commande actuelle
                const position = takeawayOrders.findIndex((o: Order) => o.id === order.id);
                setQueuePosition(position >= 0 ? position + 1 : null);
            } catch (error) {
                console.error('Erreur lors du calcul de la position dans la file:', error);
                setQueuePosition(null);
            }
        };
        
        calculateQueuePosition();
        // Recalculer toutes les 30 secondes
        const interval = setInterval(calculateQueuePosition, 30000);
        return () => clearInterval(interval);
    }, [order, currentStep]);

    // Récupérer les descriptions des produits depuis la table products
    useEffect(() => {
        const fetchProductDescriptions = async () => {
            if (!order || !order.items || order.items.length === 0) {
                return;
            }
            
            try {
                const productIds = order.items
                    .map(item => item.produitRef)
                    .filter(Boolean);
                
                if (productIds.length === 0) return;
                
                const products = await api.getProducts();
                const descriptionsMap: Record<string, string> = {};
                
                products.forEach((product: any) => {
                    if (productIds.includes(product.id) && product.description) {
                        descriptionsMap[product.id] = product.description;
                    }
                });
                
                setProductDescriptions(descriptionsMap);
            } catch (error) {
                console.error('Erreur lors de la récupération des descriptions des produits:', error);
            }
        };
        
        fetchProductDescriptions();
    }, [order]);

    const heroProgressRef = useRef<HTMLDivElement | null>(null);

    const stepCount = Math.max(steps.length - 1, 1);
    const isOrderCompleted = Boolean(
        order && (
            order.statut === 'finalisee' ||
            order.estado_cocina === 'servido' ||
            order.estado_cocina === 'entregada'
        )
    );
    const normalizedStepIndex = Math.max(0, currentStep);
    const progressPercent = stepCount > 0
        ? Math.min(100, ((isOrderCompleted ? stepCount : normalizedStepIndex) / stepCount) * 100)
        : 100;
    const clampedProgressPercent = Math.max(0, Math.min(100, progressPercent));
    const progressAnimationKey = `${clampedProgressPercent}-${isOrderCompleted ? 'complete' : 'active'}`;
    const progressStyle = useMemo<TrackerProgressStyle>(
        () => ({
            '--tracker-progress-target': `${clampedProgressPercent}%`,
        }),
        [clampedProgressPercent]
    );

    useEffect(() => {
        if (variant !== 'hero') {
            return;
        }

        const node = heroProgressRef.current;
        if (!node) {
            return;
        }

        node.style.setProperty('--tracker-progress-target', `${clampedProgressPercent}%`);
    }, [variant, clampedProgressPercent]);

    useEffect(() => {
        let isMounted = true;
        let interval: ReturnType<typeof setInterval> | null = null;
        let unsubscribe: (() => void) | undefined;
        let isFetching = false;

        const fetchStatus = async () => {
            if (isFetching) {
                return;
            }

            isFetching = true;

            try {
                const orderStatus = await api.getCustomerOrderStatus(orderId);
                if (isMounted) {
                    setOrder(orderStatus);
                    if (
                        orderStatus?.statut === 'finalisee' ||
                        orderStatus?.estado_cocina === 'servido' ||
                        orderStatus?.estado_cocina === 'entregada'
                    ) {
                        if (interval) {
                            clearInterval(interval);
                            interval = null;
                        }
                        saveOrderToHistory(orderStatus);
                        const servedAt = orderStatus.date_servido ?? Date.now();
                        storeActiveCustomerOrder(orderStatus.id, servedAt + ONE_DAY_IN_MS);
                    }
                    if (!orderStatus) {
                        const active = getActiveCustomerOrder();
                        if (active?.orderId === orderId) {
                            clearActiveCustomerOrder();
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to fetch order status", e);
            } finally {
                if (isMounted) {
                    setLoading(prev => (prev ? false : prev));
                }
                isFetching = false;
            }
        };

        setLoading(true);
        setOrder(null);
        fetchStatus();
        interval = setInterval(fetchStatus, 5000);
        unsubscribe = api.notifications.subscribe('orders_updated', fetchStatus);

        return () => {
            isMounted = false;
            if (interval) {
                clearInterval(interval);
            }
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [orderId]);

    const containerClasses = variant === 'page'
        ? "container mx-auto p-4 lg:p-8"
        : "w-full px-4 pt-0 pb-4 sm:pt-1 sm:pb-5 flex justify-center";

    const contentClasses = variant === 'page'
        ? "bg-white/95 p-6 rounded-xl shadow-2xl max-w-2xl mx-auto"
        : "max-w-4xl mx-auto";

    const detailContainerClasses = 'border-t pt-6 mt-6 space-y-4 relative md:w-1/2 md:mx-auto';

    if (loading) {
        return <div className={containerClasses}>Cargando el seguimiento del pedido...</div>;
    }

    if (!order) {
        // If order is not found and variant is hero (on home page), display nothing or a subtle message
        if (variant === 'hero') {
            return null; // Or a subtle message like 'No active order found.'
        }
        // For 'page' variant (on /commande-client), display the original message
        return (
            <div className={containerClasses}>
                <div className={contentClasses}>
                    <h2 className={`text-2xl font-bold mb-4 text-red-600`}>Pedido no encontrado</h2>
                    <p className={`text-gray-600 mb-6`}>No pudimos encontrar tu pedido.</p>
                    <button onClick={onNewOrderClick} className="bg-brand-primary text-brand-secondary font-bold py-3 px-6 rounded-lg hover:bg-yellow-400 transition">
                        Hacer un nuevo pedido
                    </button>
                </div>
            </div>
        );
    }
    
    const originalSubtotal = order.subtotal ?? order.total ?? 0;
    const totalDiscount = order.total_discount ?? 0;
    const subtotalAfterDiscounts = Math.max(originalSubtotal - totalDiscount, 0);
    const hasAppliedPromotions = (order.applied_promotions?.length ?? 0) > 0;
    const isTakeawayOrder = order.type === 'a_emporter';
    const clientName = order.clientInfo?.nom ?? order.client_name ?? '';
    const clientPhone = order.clientInfo?.telephone ?? order.client_phone ?? '';
    const clientAddress = order.clientInfo?.adresse ?? order.client_address ?? '';
    const hasClientDetails = Boolean(clientName || clientPhone || clientAddress);
    const getPromotionIcon = (promo: { type?: string | null }) => {
        if (isFreeShippingType(promo.type)) return <TruckIcon size={16} />;
        if (promo.type === 'percentage') return <Percent size={16} />;
        if (promo.type === 'buy_x_get_y') return <Gift size={16} />;
        return <Tag size={16} />;
    };

    const promotionBanners = hasAppliedPromotions
        ? order.applied_promotions!.map((promotion, index) => {
            const promoConfig = typeof promotion.config === 'object' && promotion.config !== null
                ? (promotion.config as Record<string, unknown>)
                : undefined;
            const promoCode = promoConfig?.promo_code as string | undefined;
            const visuals = promotion.visuals || null;
            const bgColor = visuals?.badge_bg_color || '#4CAF50';
            const discountAmount = promotion.discount_amount || 0;

            return (
                <div
                    key={`${promotion.promotion_id}-${promotion.name}`}
                    className="flex items-center rounded-xl shadow-lg transition-transform hover:scale-[1.01] overflow-hidden py-2"
                    style={{
                        backgroundColor: bgColor,
                    }}
                    aria-label={`Promotion ${promotion.name}`}
                >
                    <div
                        className="flex items-center justify-center w-11 flex-shrink-0"
                        style={{ color: visuals?.badge_color || '#FFFFFF' }}
                    >
                        {getPromotionIcon(promotion)}
                    </div>
                    <div className="flex-1 px-2.5 flex items-center justify-between min-w-0 gap-2 h-full">
                        <p className="font-bold text-white text-sm sm:text-base leading-tight truncate">{promotion.name}</p>
                        <span className="text-sm sm:text-base font-bold text-white whitespace-nowrap shrink-0">
                            -{formatCurrencyCOP(discountAmount)}
                        </span>
                    </div>
                </div>
            );
        })
        : null;

    const promotionsSectionContent = promotionBanners
        ? (
            <div className="space-y-2">
                <p className={`text-sm font-semibold ${variant === 'hero' ? 'text-green-300' : 'text-green-700'}`}>
                    Promotions appliquées
                </p>
                <div className="space-y-3">{promotionBanners}</div>
            </div>
        )
        : null;

    const itemsCount = order.items?.length ?? 0;

    if (variant === 'hero') {
        return (
            <div className={containerClasses}>
                <div className="relative w-full max-w-4xl rounded-3xl border-[6px] border-orange-300/70 bg-brand-primary p-6 text-white shadow-2xl sm:p-8">
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl opacity-70">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_transparent_65%)]" />
                        <div className="absolute -bottom-32 right-0 h-64 w-64 rounded-full bg-gradient-to-br from-white/20 via-amber-200/30 to-orange-300/30 blur-3xl" />
                    </div>
                    <div className="relative z-10 flex flex-col gap-6">
                        {isOrderCompleted && (
                            <CompletionStamp className="absolute -top-16 -right-8 sm:-top-[4.5rem] sm:-right-12 lg:-top-20 lg:-right-16" />
                        )}
                        <div className="flex flex-col items-center gap-2 text-center">
                            <h2 className="text-3xl font-bold text-center text-white sm:text-4xl">
                                Pedido #{order.id.slice(-6)}
                            </h2>
                            {isOrderCompleted ? null : queuePosition !== null && (
                                <div className="inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-amber-500/35 to-orange-500/35 px-5 py-2.5 border border-amber-500/50 backdrop-blur-2xl shadow-inner shadow-amber-500/20">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/30 font-bold text-amber-200">
                                        #{queuePosition}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">
                                            {queuePosition === 1 
                                                ? '🎯 ¡Eres el siguiente!'
                                                : `📋 ${queuePosition - 1} pedido${queuePosition - 1 > 1 ? 's' : ''} delante de ti`}
                                        </p>
                                        <p className="text-xs text-white/70 mt-0.5">
                                            Tu pedido se está preparando
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-5 gap-3 sm:gap-4 overflow-x-auto">
                            {steps.map((step, index) => {
                                const isActive = index === currentStep;
                                const isFinalStep = index === steps.length - 1;
                                const isCompletedStep = index < currentStep || (isFinalStep && isOrderCompleted);
                                const cardClasses = `tracker-step-card rounded-2xl border p-3 sm:p-4 transition-all ${
                                    isCompletedStep
                                        ? 'bg-gradient-to-br from-emerald-400/80 to-emerald-600/80 border-white/35 text-white shadow-lg shadow-emerald-500/25'
                                        : isActive
                                            ? 'bg-gradient-to-br from-amber-400/95 via-orange-500/90 to-red-500/95 border-white/30 text-white shadow-xl shadow-orange-500/25 tracker-step-active'
                                            : 'bg-slate-900/40 border-white/15 text-white/70 backdrop-blur-2xl hover:bg-slate-900/45 hover:border-white/25'
                                } ${isActive ? 'scale-[1.02]' : ''}`;
                                const iconWrapperClasses = `tracker-step-icon-wrapper relative flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-black/25 ${
                                    isCompletedStep || isActive ? 'text-white' : 'text-white/70'
                                }`;

                                return (
                                    <div
                                        key={step.name}
                                        className={cardClasses}
                                        aria-current={isActive ? 'step' : undefined}
                                    >
                                        <div className="flex flex-col items-center text-center gap-2 sm:gap-3">
                                            <div className="flex items-center gap-1.5">
                                                <p
                                                    className={`text-xs sm:text-sm font-semibold tracking-wide ${
                                                        isCompletedStep || isActive ? 'text-white' : 'text-white/70'
                                                    }`}
                                                >
                                                    {step.name}
                                                </p>
                                                {isCompletedStep && (
                                                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-white drop-shadow" />
                                                )}
                                            </div>
                                            <div className={iconWrapperClasses}>
                                                <step.icon className="tracker-step-icon h-10 w-10 sm:h-12 sm:w-12" />
                                            </div>
                                            {isActive ? (
                                                <>
                                                    <p className="text-[11px] sm:text-xs leading-snug text-white/90 font-medium">
                                                        {step.description}
                                                    </p>
                                                    {getEstimatedTime(index) && (
                                                        <div className="mt-2 rounded-full bg-black/35 px-2.5 py-1 backdrop-blur-xl">
                                                            <p className="text-[10px] sm:text-xs font-bold text-white">
                                                                ⏱️ {getEstimatedTime(index)}
                                                            </p>
                                                        </div>
                                                    )}
                                                </>
                                            ) : isCompletedStep ? (
                                                <>
                                                    <p className="text-[11px] sm:text-xs leading-snug text-white/80">
                                                        {step.description}
                                                    </p>
                                                    {getStepTimestamp(index) && (
                                                        <div className="mt-1">
                                                            <p className="text-[10px] sm:text-xs font-medium text-white/70">
                                                                ✓ {getStepTimestamp(index)}
                                                            </p>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <p className="text-[11px] sm:text-xs leading-snug text-white/60">
                                                    {step.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <style>{`
                            .tracker-step-card {
                                position: relative;
                                overflow: hidden;
                                border-radius: 1.25rem;
                            }

                            .tracker-step-card::after {
                                content: '';
                                position: absolute;
                                inset: 0;
                                border-radius: inherit;
                                border: 1px solid rgba(255, 255, 255, 0.18);
                                opacity: 0.35;
                                pointer-events: none;
                            }

                            .tracker-step-active {
                                animation: tracker-step-blink 1.6s ease-in-out infinite;
                            }

                            .tracker-step-active::after {
                                border-color: rgba(255, 255, 255, 0.45);
                                opacity: 0.75;
                            }

                            .tracker-step-icon {
                                transition: transform 0.4s ease;
                            }

                            .tracker-step-active .tracker-step-icon {
                                animation: tracker-step-icon-pulse 1.6s ease-in-out infinite;
                            }

                            @keyframes tracker-step-blink {
                                0%,
                                100% {
                                    transform: translateY(0);
                                    box-shadow: 0 18px 36px rgba(234, 179, 8, 0.35);
                                }
                                50% {
                                    transform: translateY(-2px);
                                    box-shadow: 0 22px 40px rgba(251, 191, 36, 0.45);
                                }
                            }

                            @keyframes tracker-step-icon-pulse {
                                0%,
                                100% {
                                    transform: scale(1);
                                }
                                50% {
                                    transform: scale(1.15);
                                }
                            }

                            .tracker-progress-container {
                                position: relative;
                                height: 10px;
                                border-radius: 9999px;
                                overflow: hidden;
                                background: linear-gradient(90deg, rgba(255, 255, 255, 0.25), rgba(148, 163, 184, 0.18));
                                box-shadow: inset 0 1px 3px rgba(15, 23, 42, 0.35);
                                margin-top: 0.25rem;
                            }

                            .tracker-progress-fill {
                                position: absolute;
                                inset: 0;
                                width: 0;
                                display: flex;
                                align-items: center;
                                justify-content: flex-end;
                                border-radius: inherit;
                                background: linear-gradient(90deg, rgba(249, 168, 38, 0.8), rgba(239, 68, 68, 0.95));
                                animation: tracker-progress-advance 1.2s ease forwards;
                                animation-delay: 0.05s;
                            }

                            .tracker-progress-fill-complete {
                                background: linear-gradient(90deg, rgba(34, 197, 94, 0.85), rgba(56, 189, 248, 0.9));
                            }

                            .tracker-progress-fill-hero {
                                animation: tracker-progress-loop 3s ease-in-out infinite;
                                animation-delay: 0s;
                            }

                            .tracker-progress-fill-hero.tracker-progress-fill-complete {
                                animation: tracker-progress-loop 3s ease-in-out infinite;
                            }

                            .tracker-progress-fill::after {
                                content: '';
                                position: absolute;
                                inset: 0;
                                background: linear-gradient(90deg, rgba(255, 255, 255, 0.25), transparent 55%);
                                mix-blend-mode: screen;
                            }

                            .tracker-progress-glow {
                                position: absolute;
                                right: -14px;
                                top: 50%;
                                width: 28px;
                                height: 28px;
                                transform: translateY(-50%);
                                background: radial-gradient(circle at center, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0));
                                pointer-events: none;
                            }

                            @keyframes tracker-progress-advance {
                                0% {
                                    width: 0;
                                }
                                100% {
                                    width: var(--tracker-progress-target);
                                }
                            }

                            @keyframes tracker-progress-loop {
                                0% {
                                    width: 0;
                                }
                                60% {
                                    width: var(--tracker-progress-target);
                                }
                                75% {
                                    width: var(--tracker-progress-target);
                                }
                                100% {
                                    width: 0;
                                }
                            }
                        `}</style>

                        <div className="tracker-progress-container tracker-progress-hero">
                            <div
                                key={`hero-progress-${progressAnimationKey}`}
                                className={`tracker-progress-fill tracker-progress-fill-hero ${isOrderCompleted ? 'tracker-progress-fill-complete' : ''}`}
                                ref={heroProgressRef}
                                style={progressStyle}
                            >
                                <span className="tracker-progress-glow" />
                            </div>
                        </div>

                        {/* Tampon PEDIDO LISTO rendu au niveau du conteneur principal pour éviter les doublons */}

                        {(hasClientDetails || order.receipt_url) && (
                            <div className="grid gap-4 sm:grid-cols-2 items-stretch">
                                {hasClientDetails && (
                                    <div className="rounded-2xl bg-gradient-to-br from-slate-900/40 via-slate-900/30 to-slate-900/25 p-5 backdrop-blur-2xl border border-white/15 flex h-full flex-col">
                                        <p className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3">Informations client</p>
                                        <div className="space-y-2.5">
                                            {clientName && (
                                                <div className="flex items-center gap-3 text-white/90">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                                                        <User size={16} />
                                                    </div>
                                                    <span className="truncate text-sm font-medium" title={clientName}>{clientName}</span>
                                                </div>
                                            )}
                                            {clientPhone && (
                                                <div className="flex items-center gap-3 text-white/90">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                                                        <Phone size={16} />
                                                    </div>
                                                    <span className="truncate text-sm font-medium" title={clientPhone}>{clientPhone}</span>
                                                </div>
                                            )}
                                            {clientAddress && (
                                                <div className="flex items-center gap-3 text-white/90">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                                                        <MapPin size={16} />
                                                    </div>
                                                    <span className="truncate text-sm font-medium" title={clientAddress}>{clientAddress}</span>
                                                </div>
                                            )}
                                        </div>
                                        {/* Numéro du restaurant cliquable */}
                                        <div className="mt-4 pt-3 border-t border-white/10">
                                            <p className="text-xs font-bold uppercase tracking-wider text-white/50 mb-2">¿Necesitas ayuda?</p>
                                            <a href={supportWhatsappHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-white/90 hover:text-emerald-300 transition-colors group">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 group-hover:bg-emerald-500/40 transition-colors">
                                                    <Phone size={16} className="text-emerald-300" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-white/60">Llama al restaurante</p>
                                                    <p className="text-sm font-bold text-white">{resolvedSupportDisplay}</p>
                                                </div>
                                            </a>
                                        </div>
                                    </div>
                                )}
                                {order.receipt_url && (
                                    <div className="rounded-2xl bg-gradient-to-br from-slate-900/40 via-slate-900/30 to-slate-900/25 p-5 backdrop-blur-2xl border border-white/15 flex h-full flex-col">
                                            <p className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3">Comprobante de pago</p>
                                            <button
                                                type="button"
                                                onClick={() => setReceiptModalOpen(true)}
                                            className="group relative flex h-full w-full flex-1 min-h-[160px] overflow-hidden rounded-xl border border-white/20 bg-black/30 shadow-lg transition-transform hover:-translate-y-0.5 hover:shadow-amber-500/20 focus:outline-none focus:ring-2 focus:ring-white/50"
                                                aria-label="Abrir el comprobante de pago"
                                            >
                                                {canDisplayReceiptImage ? (
                                                    <img
                                                        src={order.receipt_url}
                                                        alt="Vista previa del comprobante"
                                                        className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-105"
                                                        onError={() => setReceiptPreviewError(true)}
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-xl bg-black/40 p-6 text-center text-white/80">
                                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                                                            <Receipt size={26} />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-sm font-semibold">
                                                                {isReceiptPdf ? 'Comprobante en formato PDF' : 'Vista previa no disponible'}
                                                            </p>
                                                            <p className="text-xs text-white/60">Toca para abrir el documento</p>
                                                        </div>
                                                    </div>
                                                )}
                                                {canDisplayReceiptImage && (
                                                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition duration-300 group-hover:opacity-100">
                                                        <div className="flex flex-col items-center gap-2 text-white">
                                                            <Receipt size={24} />
                                                            <span className="text-xs font-semibold">Ver el comprobante</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </button>
                                        </div>
                                )}
                            </div>
                        )}

                        <div className="rounded-2xl border border-white/25 bg-slate-900/35 p-6 backdrop-blur-2xl">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-base font-bold uppercase tracking-wider text-white">Tu pedido</h3>
                                <span className="rounded-full bg-white/20 px-4 py-1.5 text-sm font-bold text-white shadow-sm">{itemsCount} {itemsCount > 1 ? 'artículos' : 'artículo'}</span>
                            </div>
                            <div className="space-y-3">
                                {order.items && order.items.length > 0 ? (
                                    order.items.map(item => {
                                        const isDomicilio = item.nom_produit === 'Domicilio';
                                        const isFreeShipping = isDomicilio && item.prix_unitaire === 0;
                                        const itemDescription = productDescriptions[item.produitRef] || null;
                                        const trimmedComment = typeof item.commentaire === 'string' && item.commentaire.trim().length > 0 ? item.commentaire.trim() : null;

                                        return (
                                            <div
                                                key={item.id}
                                                className="group relative overflow-hidden rounded-2xl border border-white/40 bg-white/95 pl-28 pr-6 py-4 text-slate-900 shadow-xl transition-all hover:-translate-y-0.5 hover:border-amber-300/60 hover:shadow-amber-500/30"
                                            >
                                                <div className="absolute left-0 top-1/2 flex h-20 w-20 -translate-y-1/2 items-center justify-center rounded-r-2xl bg-gradient-to-b from-orange-500 to-rose-500 text-4xl font-black text-white shadow-inner shadow-amber-500/40 sm:h-24 sm:w-24">
                                                    <span className="rounded-lg bg-white/15 px-5 py-2 text-3xl font-bold leading-tight">
                                                        {item.quantite}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                    <div className="min-w-0 flex-1 space-y-2">
                                                        <div className="space-y-1">
                                                            <p className="mb-0 text-base font-semibold leading-tight text-balance text-slate-900 sm:text-lg">
                                                                {item.nom_produit}
                                                            </p>
                                                            {!isFreeShipping && (
                                                                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                                                                    {formatCurrencyCOP(item.prix_unitaire)} /u
                                                                </p>
                                                            )}
                                                        </div>
                                                        {itemDescription && (
                                                            <p className="text-sm leading-snug text-slate-600">{itemDescription}</p>
                                                        )}
                                                        {trimmedComment && (
                                                            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm italic text-amber-700 shadow-inner shadow-amber-200/60">
                                                                « {trimmedComment} »
                                                            </div>
                                                        )}
                                                        {isDomicilio && (
                                                            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                                                                isFreeShipping
                                                                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                                                                    : 'border border-slate-200 bg-slate-50 text-slate-600'
                                                            }`}>
                                                                <TruckIcon size={14} />
                                                                {isFreeShipping ? 'Entrega gratis' : 'Entrega'}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex shrink-0 flex-col items-end gap-2 text-right">
                                                        {isFreeShipping ? (
                                                            <>
                                                                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-700 shadow-inner shadow-emerald-200/40">
                                                                    <Gift size={16} /> Gratuit
                                                                </span>
                                                                <span className="text-xs font-medium text-emerald-600/70 line-through decoration-emerald-400">
                                                                    {formatCurrencyCOP(8000)}
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span className="rounded-full bg-slate-100 px-4 py-1.5 text-lg font-bold text-slate-900 shadow-inner shadow-slate-200">
                                                                {formatCurrencyCOP(item.prix_unitaire * item.quantite)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="text-white/70">No hay artículos registrados para este pedido.</p>
                                )}
                            </div>

                            {promotionBanners && (
                                <div className="mt-6 space-y-3">
                                    <h4 className="text-sm font-bold uppercase tracking-wider text-white/80">Promotions actives</h4>
                                    <div className="space-y-3">{promotionBanners}</div>
                                </div>
                            )}

                            <div className="mt-6 space-y-3 border-t border-white/20 pt-5">
                                {totalDiscount > 0 && (
                                    <div className="flex items-center justify-between text-sm font-semibold text-emerald-300">
                                        <span>Descuentos totales</span>
                                        <span className="text-base font-bold">- {formatCurrencyCOP(totalDiscount)}</span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between text-white">
                                    <span className="text-base font-bold sm:text-lg">Total à payer</span>
                                    <span className="text-2xl font-extrabold sm:text-3xl">{formatCurrencyCOP(order.total)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-center">
                            <button
                                onClick={isOrderCompleted ? onNewOrderClick : undefined}
                                disabled={!isOrderCompleted}
                                className={`inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-base font-bold transition-all ${
                                    isOrderCompleted
                                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/40 hover:scale-[1.02] cursor-pointer'
                                        : 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-60'
                                }`}
                            >
                                Nouvelle commande
                            </button>
                        </div>
                    </div>
                </div>
                <Modal
                    isOpen={isReceiptModalOpen}
                    onClose={() => setReceiptModalOpen(false)}
                    title="Comprobante de pago"
                >
                    {receiptModalContent}
                </Modal>
            </div>
        );
    }

    return (
        <div className={containerClasses}>
            <div className={contentClasses}>
                <h2 className={`text-3xl font-bold text-center mb-2 ${variant === 'hero' ? 'text-white' : 'text-gray-800'}`}>Seguimiento de tu pedido</h2>
                <p className={`text-center font-semibold mb-8 ${variant === 'hero' ? 'text-gray-300' : 'text-gray-500'}`}>Pedido #{order.id.slice(-6)}</p>

                <div className="mb-8">
                    <div className="mb-6 tracker-progress-container tracker-progress-default">
                        <div
                            key={`page-progress-${progressAnimationKey}`}
                            className={`tracker-progress-fill ${isOrderCompleted ? 'tracker-progress-fill-complete' : ''}`}
                            style={progressStyle}
                        >
                            <span className="tracker-progress-glow" />
                        </div>
                    </div>
                    <div
                        className="flex items-start sm:items-center justify-between gap-3 sm:gap-4 px-2 overflow-x-auto"
                    >
                        {steps.map((step, index) => {
                            const isActive = index === currentStep;
                            const isFinalStep = index === steps.length - 1;
                            const isCompleted = index < currentStep || (isFinalStep && isOrderCompleted);

                            return (
                                <div key={step.name} className="flex flex-1 items-center gap-2 sm:gap-4">
                                    <div className="flex flex-col items-center text-center gap-2 sm:gap-3">
                                        <p
                                            className={`text-xs sm:text-sm font-semibold ${
                                                isCompleted || isActive ? 'text-gray-900' : 'text-gray-400'
                                            }`}
                                        >
                                            {step.name}
                                        </p>
                                        <div
                                            className={`relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full border-4 transition-all duration-500 ${
                                                isCompleted
                                                    ? 'bg-green-500 border-green-300'
                                                    : isActive
                                                        ? 'bg-blue-600 border-blue-400 animate-pulse'
                                                        : 'bg-gray-400 border-gray-300'
                                            }`}
                                        >
                                            <step.icon className="h-8 w-8 text-white sm:h-9 sm:w-9" />
                                            {isCompleted && (
                                                <CheckCircle className="absolute -top-2 -right-2 h-5 w-5 text-emerald-100 drop-shadow" />
                                            )}
                                        </div>
                                        <p
                                            className={`text-[11px] sm:text-xs leading-snug ${
                                                isCompleted || isActive ? 'text-gray-600' : 'text-gray-400'
                                            }`}
                                        >
                                            {step.description}
                                        </p>
                                    </div>
                                    {index < steps.length - 1 && (
                                        <div className="flex flex-1 items-center" aria-hidden>
                                            <div
                                                className={`tracker-gauge-wrapper ${
                                                    variant === 'hero' ? 'tracker-gauge-hero' : 'tracker-gauge-default'
                                                } ${isCompleted ? 'tracker-gauge-wrapper-complete' : ''}`}
                                            >
                                                <span
                                                    className={`tracker-gauge-fill ${
                                                        isCompleted
                                                            ? 'tracker-gauge-fill-complete'
                                                            : isActive
                                                                ? 'tracker-gauge-fill-active'
                                                                : 'tracker-gauge-fill-idle'
                                                    }`}
                                                />
                                                {(isActive || isCompleted) && <span className="tracker-gauge-glow" />}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                <style>{`
                    .tracker-progress-container {
                        position: relative;
                        height: 12px;
                        border-radius: 9999px;
                        overflow: hidden;
                        box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.12);
                    }

                    .tracker-progress-default {
                        background: linear-gradient(90deg, rgba(229, 231, 235, 0.55), rgba(209, 213, 219, 0.35));
                    }

                    .tracker-progress-hero {
                        background: linear-gradient(90deg, rgba(255, 255, 255, 0.25), rgba(148, 163, 184, 0.15));
                        box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.25);
                    }

                    .tracker-progress-fill {
                        position: absolute;
                        inset: 0;
                        width: 0;
                        display: flex;
                        align-items: center;
                        justify-content: flex-end;
                        background: linear-gradient(90deg, rgba(249, 168, 38, 0.65), rgba(239, 68, 68, 0.95));
                        border-radius: inherit;
                        animation: tracker-progress-advance 1.2s ease forwards;
                    }

                    .tracker-progress-fill-complete {
                        background: linear-gradient(90deg, rgba(34, 197, 94, 0.75), rgba(56, 189, 248, 0.9));
                    }

                    .tracker-progress-fill::after {
                        content: '';
                        position: absolute;
                        inset: 0;
                        background: linear-gradient(90deg, rgba(255, 255, 255, 0.15), transparent 55%);
                        mix-blend-mode: screen;
                    }

                    .tracker-progress-glow {
                        position: absolute;
                        right: -14px;
                        top: 50%;
                        width: 28px;
                        height: 28px;
                        transform: translateY(-50%);
                        background: radial-gradient(circle at center, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0));
                        pointer-events: none;
                    }

                    @keyframes tracker-progress-advance {
                        0% {
                            width: 0;
                        }
                        100% {
                            width: var(--tracker-progress-target);
                        }
                    }

                    .tracker-gauge-wrapper {
                        position: relative;
                        height: 10px;
                        border-radius: 9999px;
                        overflow: hidden;
                        box-shadow: inset 0 1px 3px rgba(15, 23, 42, 0.12);
                        transition: box-shadow 0.3s ease;
                    }

                    .tracker-gauge-wrapper-complete {
                        box-shadow: inset 0 1px 3px rgba(21, 128, 61, 0.35);
                    }

                    .tracker-gauge-default {
                        background: linear-gradient(90deg, rgba(229, 231, 235, 0.45), rgba(209, 213, 219, 0.25));
                    }

                    .tracker-gauge-hero {
                        background: linear-gradient(90deg, rgba(255, 255, 255, 0.22), rgba(148, 163, 184, 0.12));
                        box-shadow: inset 0 1px 3px rgba(15, 23, 42, 0.4);
                    }

                    .tracker-gauge-fill {
                        position: absolute;
                        inset: 0;
                        transform-origin: left;
                        background-size: 250% 100%;
                        border-radius: inherit;
                    }

                    .tracker-gauge-fill-idle {
                        transform: scaleX(0);
                        background: linear-gradient(90deg, rgba(148, 163, 184, 0.25), rgba(148, 163, 184, 0.15));
                    }

                    .tracker-gauge-fill-active {
                        animation: tracker-gauge-fill-grow 1.2s ease forwards, tracker-gauge-cycle 3.2s linear infinite;
                        background: linear-gradient(90deg, #f97316, #ef4444, #facc15, #f97316);
                    }

                    .tracker-gauge-fill-complete {
                        transform: scaleX(1);
                        animation: tracker-gauge-cycle 4.2s linear infinite;
                        background: linear-gradient(90deg, #22c55e, #0ea5e9, #f97316, #22c55e);
                    }

                    .tracker-gauge-glow {
                        position: absolute;
                        inset: -6px;
                        background: radial-gradient(circle at center, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0));
                        animation: tracker-gauge-glow 1.6s ease-in-out infinite;
                        pointer-events: none;
                    }

                    @keyframes tracker-gauge-fill-grow {
                        0% { transform: scaleX(0); }
                        100% { transform: scaleX(1); }
                    }

                    @keyframes tracker-gauge-cycle {
                        0% { background-position: 0% 50%; }
                        100% { background-position: 200% 50%; }
                    }

                    @keyframes tracker-gauge-glow {
                        0%, 100% { opacity: 0.45; }
                        50% { opacity: 0.85; }
                    }

                    .promo-banner {
                        position: relative;
                        isolation: isolate;
                        animation: promo-banner-blink 2.2s ease-in-out infinite;
                    }

                    .promo-banner::before {
                        content: '';
                        position: absolute;
                        inset: 0;
                        background: linear-gradient(120deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0));
                        opacity: 0.45;
                        pointer-events: none;
                    }

                    .promo-banner > * {
                        position: relative;
                        z-index: 1;
                    }

                    @keyframes promo-banner-blink {
                        0%, 100% {
                            transform: translateY(0) scale(1);
                            filter: brightness(1);
                            opacity: 0.85;
                        }
                        45% {
                            transform: translateY(-2px) scale(1.02);
                            filter: brightness(1.18);
                            opacity: 1;
                        }
                        60% {
                            transform: translateY(0) scale(0.99);
                            filter: brightness(0.92);
                            opacity: 0.55;
                        }
                    }

                `}</style>
                
                <div className={detailContainerClasses}>
                    {/* Tampon PEDIDO LISTO */}
                    {isOrderCompleted && <CompletionStamp className="absolute -top-14 -right-8 sm:-top-[4.25rem] sm:-right-10" />}
                    <h3 className={`mt-10 text-xl font-bold ${variant === 'hero' ? 'text-white' : 'text-gray-800'}`}>Resumen del pedido</h3>

                    {isTakeawayOrder && hasClientDetails && (
                        <div
                            className={`mt-6 rounded-xl border p-4 ${
                                variant === 'hero'
                                    ? 'border-white/40 bg-slate-900/40 backdrop-blur-2xl text-white'
                                    : 'border-gray-200 bg-gray-50 text-gray-700'
                            }`}
                        >
                            <p className={`mb-3 text-sm font-semibold uppercase tracking-wide ${variant === 'hero' ? 'text-gray-100' : 'text-gray-600'}`}>
                                Informations Client
                            </p>
                            <div className="space-y-2 text-sm">
                                {clientName && (
                                    <div className="flex items-center">
                                        <User size={16} className={`mr-2 ${variant === 'hero' ? 'text-white/80' : 'text-gray-500'}`} />
                                        <span className="font-medium whitespace-nowrap truncate" title={clientName}>{clientName}</span>
                                    </div>
                                )}
                                {clientPhone && (
                                    <div className="flex items-center">
                                        <Phone size={16} className={`mr-2 ${variant === 'hero' ? 'text-white/80' : 'text-gray-500'}`} />
                                        <span className="whitespace-nowrap" title={clientPhone}>{clientPhone}</span>
                                    </div>
                                )}
                                {clientAddress && (
                                    <div className="flex items-center">
                                        <MapPin size={16} className={`mr-2 ${variant === 'hero' ? 'text-white/80' : 'text-gray-500'}`} />
                                        <span className="truncate" title={clientAddress}>{clientAddress}</span>
                                    </div>
                                )}
                            </div>
                            {order.receipt_url && (
                                <button
                                    onClick={() => setReceiptModalOpen(true)}
                                    className={`mt-4 inline-flex items-center gap-2 text-sm font-semibold underline-offset-2 hover:underline ${variant === 'hero' ? 'text-white' : 'text-blue-500'}`}
                                >
                                    <Receipt size={16} /> {isReceiptPdf ? 'Abrir el PDF del pago' : 'Ver el comprobante'}
                                </button>
                            )}
                        </div>
                    )}

                    <div className="space-y-2">
                        {order.items && order.items.length > 0 ? (
                            order.items.map(item => {
                                const isDomicilio = item.nom_produit === 'Domicilio';
                                const isFreeShipping = isDomicilio && item.prix_unitaire === 0;
                                const potentialDescription = (item as { description?: string | null }).description;
                                const fallbackDescription = productDescriptions[item.produitRef];
                                const itemDescriptionFromOrder = typeof potentialDescription === 'string' && potentialDescription.trim().length > 0
                                    ? potentialDescription.trim()
                                    : null;
                                const itemDescription = itemDescriptionFromOrder ?? (fallbackDescription ? fallbackDescription.trim() : null);
                                const itemComment = typeof item.commentaire === 'string' && item.commentaire.trim().length > 0
                                    ? item.commentaire.trim()
                                    : null;

                                return (
                                    <div
                                        key={item.id}
                                        className={`group relative overflow-hidden rounded-2xl border px-5 py-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                                            variant === 'hero'
                                                ? 'border-white/20 bg-slate-900/35 text-gray-100 backdrop-blur-2xl'
                                                : 'border-slate-200 bg-white text-slate-600'
                                        }`}
                                    >
                                        <div className="pointer-events-none absolute -right-14 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full bg-amber-400/20 blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-80" />
                                        <div className="pointer-events-none absolute -left-16 -top-10 h-24 w-24 rounded-full bg-white/10 blur-2xl opacity-50" />
                                        <div className="relative flex items-start justify-between gap-4">
                                            <div className="flex flex-1 items-start gap-3">
                                                <div
                                                    className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-2xl font-extrabold text-white shadow-md ${
                                                        variant === 'hero' ? 'ring-2 ring-white/40' : ''
                                                    }`}
                                                >
                                                    {item.quantite}
                                                </div>
                                                <div className="min-w-0 space-y-2">
                                                    <div className="space-y-1">
                                                        <p className={`text-lg font-semibold leading-tight text-balance ${variant === 'hero' ? 'text-white' : 'text-slate-900'}`}>
                                                            {item.nom_produit}
                                                        </p>
                                                        <p className={`text-xs font-medium uppercase tracking-wide ${variant === 'hero' ? 'text-white/60' : 'text-slate-500'}`}>
                                                            {isFreeShipping ? 'Entrega gratis' : `${formatCurrencyCOP(item.prix_unitaire)} /u`}
                                                        </p>
                                                    </div>
                                                    {itemDescription && (
                                                        <p className={`text-sm leading-snug ${variant === 'hero' ? 'text-white/70' : 'text-slate-500'}`}>
                                                            {itemDescription}
                                                        </p>
                                                    )}
                                                    {itemComment && (
                                                        <div className={`rounded-xl border px-3 py-2 text-sm italic shadow-inner ${
                                                            variant === 'hero'
                                                                ? 'border-amber-300/30 bg-black/30 text-amber-100/90'
                                                                : 'border-amber-200 bg-amber-50 text-amber-700'
                                                        }`}>
                                                            « {itemComment} »
                                                        </div>
                                                    )}
                                                    {isDomicilio && (
                                                        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                                                            isFreeShipping
                                                                ? variant === 'hero'
                                                                    ? 'border-emerald-300/40 bg-emerald-500/20 text-emerald-100'
                                                                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                                : variant === 'hero'
                                                                    ? 'border-white/15 bg-black/30 text-white/80'
                                                                    : 'border-slate-200 bg-slate-50 text-slate-600'
                                                        }`}>
                                                            <TruckIcon size={14} />
                                                            {isFreeShipping ? 'Entrega gratis' : 'Entrega'}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                                                {isFreeShipping ? (
                                                    <>
                                                        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${
                                                            variant === 'hero'
                                                                ? 'border border-emerald-300/40 bg-emerald-500/20 text-emerald-100'
                                                                : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                                                        }`}>
                                                            <Gift size={16} /> Gratuit
                                                        </span>
                                                        <span className={`text-xs font-medium line-through ${
                                                            variant === 'hero' ? 'text-emerald-100/70 decoration-emerald-200/70' : 'text-emerald-600/70 decoration-emerald-400'
                                                        }`}>
                                                            {formatCurrencyCOP(8000)}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className={`rounded-full px-4 py-1.5 text-lg font-bold ${
                                                        variant === 'hero' ? 'bg-black/30 text-white shadow-inner shadow-black/30' : 'bg-slate-100 text-slate-900'
                                                    }`}>
                                                        {formatCurrencyCOP(item.prix_unitaire * item.quantite)}
                                                    </span>
                                                )}
                                                {!isFreeShipping ? (
                                                    <span className={`text-xs font-medium ${variant === 'hero' ? 'text-white/50' : 'text-slate-500'}`}>
                                                        Total TTC
                                                    </span>
                                                ) : (
                                                    <span className={`text-xs font-medium ${variant === 'hero' ? 'text-emerald-200/80' : 'text-emerald-600/80'}`}>
                                                        Entrega ahorrada
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className={`${variant === 'hero' ? 'text-gray-300' : 'text-gray-600'}`}>No hay artículos registrados para este pedido.</p>
                        )}
                    </div>

                    {promotionsSectionContent}

                    {totalDiscount > 0 && (
                        <div
                            className={`mt-4 flex items-center justify-between text-sm font-semibold ${
                                variant === 'hero' ? 'text-emerald-200' : 'text-emerald-700'
                            }`}
                        >
                            <span>Descuentos totales</span>
                            <span>-{formatCurrencyCOP(totalDiscount)}</span>
                        </div>
                    )}

                    <div className={`flex justify-between font-bold text-lg border-t pt-2 ${variant === 'hero' ? 'text-white border-gray-500' : 'text-gray-800'}`}>
                        <span>Total</span>
                        <span>{formatCurrencyCOP(order.total)}</span>
                    </div>

                    {!isTakeawayOrder && hasClientDetails && (
                        <div className={`border-t pt-4 space-y-2 ${variant === 'hero' ? 'border-gray-500' : ''}`}>
                            <h3 className={`text-xl font-bold ${variant === 'hero' ? 'text-white' : 'text-gray-800'} mb-2`}>Informations Client</h3>
                            {clientName && (
                                <div className={`flex items-center ${variant === 'hero' ? 'text-gray-200' : 'text-gray-700'}`}>
                                    <User size={16} className="mr-2" />
                                    <span className="whitespace-nowrap truncate" title={clientName}>{clientName}</span>
                                </div>
                            )}
                            {clientPhone && (
                                <div className={`flex items-center ${variant === 'hero' ? 'text-gray-200' : 'text-gray-700'}`}>
                                    <Phone size={16} className="mr-2" />
                                    <span className="whitespace-nowrap" title={clientPhone}>{clientPhone}</span>
                                </div>
                            )}
                            {clientAddress && (
                                <div className={`flex items-center ${variant === 'hero' ? 'text-gray-200' : 'text-gray-700'}`}>
                                    <MapPin size={16} className="mr-2" />
                                    <span className="truncate" title={clientAddress}>{clientAddress}</span>
                                </div>
                            )}
                            {order.receipt_url && (
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">Comprobante de pago:</span>
                                    <button
                                        onClick={() => setReceiptModalOpen(true)}
                                        className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                                            variant === 'hero'
                                                ? 'bg-white/10 text-white/90 hover:bg-white/20'
                                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                        }`}
                                    >
                                        <Receipt size={16} /> {isReceiptPdf ? 'Abrir el PDF' : 'Ver'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="mt-8 text-center space-y-4">
                    {isOrderCompleted && (
                        <div className="flex justify-center">
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/10 text-emerald-400">
                                <CheckCircle size={18} />
                            </span>
                        </div>
                    )}
                    <div className="flex flex-col space-y-4">
                        <p className={`text-sm ${variant === 'hero' ? 'text-gray-300' : 'text-gray-600'}`}>
                            El estado de tu pedido se actualiza automáticamente.
                        </p>
                        <button 
                            onClick={isOrderCompleted ? onNewOrderClick : undefined} 
                            disabled={!isOrderCompleted}
                            className={`font-bold py-3 px-6 rounded-lg transition ${
                                isOrderCompleted 
                                    ? `${variant === 'hero' ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' : 'bg-brand-primary text-brand-secondary hover:bg-brand-primary-dark'} cursor-pointer` 
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
                            }`}
                        >
                            Volver
                        </button>
                    </div>
                </div>
            </div>
            <Modal
                isOpen={isReceiptModalOpen}
                onClose={() => setReceiptModalOpen(false)}
                title="Comprobante de pago"
            >
                {receiptModalContent}
            </Modal>
        </div>
    );
};

export default CustomerOrderTracker;
