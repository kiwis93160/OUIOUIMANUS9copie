import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import { Order, OrderItem, WeeklySchedule } from '../types';
import { Clock, Eye, User, MapPin, Phone } from 'lucide-react';
import Modal from '../components/Modal';
import OrderTimer from '../components/OrderTimer';
import { getOrderUrgencyStyles, getOrderUrgencyToneClasses } from '../utils/orderUrgency';
import { formatCurrencyCOP } from '../utils/formatIntegerAmount';
import useSiteContent, { DEFAULT_SITE_CONTENT } from '../hooks/useSiteContent';
import useOnlineOrderingSchedules from '../hooks/useOnlineOrderingSchedules';
import { isWithinWeeklySchedule } from '../utils/weeklyScheduleUtils';


const TakeawayCard: React.FC<{ order: Order, onValidate?: (orderId: string) => void, onDeliver?: (orderId: string) => void, isProcessing?: boolean }> = ({ order, onValidate, onDeliver, isProcessing }) => {
    const [isReceiptVisible, setIsReceiptVisible] = useState(false);

    const displayName = order.table_nom || `Pedido #${order.id.slice(-6)}`;
    const timerStart = order.date_envoi_cuisine || order.date_creation;
    const urgencyStyles = getOrderUrgencyStyles(timerStart);
    const urgencyTone = getOrderUrgencyToneClasses(timerStart);
    const urgencyLabelMap: Record<typeof urgencyStyles.level, string> = {
        normal: 'Normal',
        warning: 'En seguimiento',
        critical: 'Crítico',
    };
    const hasAppliedPromotions = (order.applied_promotions?.length ?? 0) > 0;
    const showPromotionDetails = hasAppliedPromotions;
    const toneBorderStyle = useMemo<React.CSSProperties>(() => ({ borderColor: urgencyTone.toneHex }), [urgencyTone.toneHex]);
    const toneFillStyle = useMemo<React.CSSProperties>(() => ({ backgroundColor: urgencyTone.toneHex }), [urgencyTone.toneHex]);

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
        <div className="relative">
            <div className={`relative flex h-full flex-col overflow-hidden rounded-2xl ${urgencyTone.cardBorder} text-gray-900 transition-colors duration-300 ${urgencyStyles.background}`} style={toneBorderStyle}>
                <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${urgencyTone.timerBackground}`} style={toneFillStyle} />
                <header className="border-b border-gray-200 px-5 pt-3 pb-2">
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                        <div className="min-w-0 space-y-0.5">
                            <h4 className="truncate text-base font-semibold leading-tight text-gray-900 sm:text-lg md:text-xl">{displayName}</h4>
                            <p className="text-xs text-gray-500">
                                Pedido enviado {new Date(timerStart).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
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
                        {order.clientInfo && (
                            <section className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-900 shadow-sm">
                                {order.clientInfo.nom && (
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-gray-900">
                                            <User size={16} className={urgencyStyles.icon} />
                                            <span className="font-medium">{order.clientInfo.nom}</span>
                                        </div>
                                        {order.clientInfo.telephone && (
                                            <div className="ml-6 flex items-center gap-2 text-xs text-gray-600">
                                                <Phone size={14} className="text-gray-500" />
                                                <span>{order.clientInfo.telephone}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {order.clientInfo.adresse && (
                                    <div className="flex items-start gap-2 text-gray-700">
                                        <MapPin size={16} className={`mt-0.5 text-gray-500 ${urgencyStyles.icon}`} />
                                        <span className="text-sm text-gray-700">{order.clientInfo.adresse}</span>
                                    </div>
                                )}
                            </section>
                        )}

                        <section className="flex flex-col overflow-hidden gap-1">
                            <h5 className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Artículos</h5>
                            <div className="flex-1 overflow-y-auto pr-1">
                                {order.items.length > 0 ? (
                                    <ul className="space-y-0.5">
                                        {order.items.map((item: OrderItem) => {
                                            const note = item.commentaire?.trim();
                                            return (
                                                <li key={item.id} className="flex items-stretch rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 shadow-sm overflow-hidden min-h-[3.5rem]">
                                                    <div className="flex flex-1 items-center justify-between gap-3 pr-3">
                                                        <div className="flex flex-1 items-center">
                                                            <span className={`flex self-stretch w-12 shrink-0 items-center justify-center text-xl font-bold text-white shadow-md ${urgencyTone.quantityBackground} rounded-l-lg`} style={toneFillStyle}>
                                                                {item.quantite}
                                                            </span>
                                                            <span className="font-semibold text-gray-900 text-[clamp(1.1rem,2.1vw,1.3rem)] leading-snug break-words text-balance whitespace-normal [hyphens:auto] px-3 py-3">
                                                                {item.nom_produit}
                                                            </span>
                                                        </div>
                                                        <span className="whitespace-nowrap text-sm font-semibold text-gray-900 sm:text-base">{formatCurrencyCOP(item.prix_unitaire * item.quantite)}</span>
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

                        {showPromotionDetails && (
                            <section className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 shadow-sm">
                                {hasAppliedPromotions && (
                                    <ul className="space-y-0.5" aria-label="Promotions">
                                        {order.applied_promotions!.map(promotion => {
                                            const promoCode = typeof promotion.config === 'object' && promotion.config !== null
                                                ? (promotion.config as Record<string, unknown>).promo_code
                                                : undefined;

                                            return (
                                                <li
                                                    key={`${promotion.promotion_id}-${promotion.name}`}
                                                    className="rounded-md border border-emerald-200 bg-white/70 px-3 py-2 text-emerald-900 shadow-sm"
                                                >
                                                    <div className="flex items-center justify-between gap-3">
                                                        <p className="font-medium leading-tight">
                                                            {promotion.name}{promoCode ? ` (Code: ${promoCode})` : ''}
                                                        </p>
                                                        <p className="text-sm font-semibold text-emerald-700 whitespace-nowrap">
                                                            -{formatCurrencyCOP(promotion.discount_amount || 0)}
                                                        </p>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </section>
                        )}

                        <div className="mt-auto flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-semibold text-gray-900 shadow-sm">
                            <span>Total</span>
                            <span className="text-lg sm:text-xl text-gray-900">{formatCurrencyCOP(order.total)}</span>
                        </div>
                    </div>
                </div>

                <footer className="border-t border-gray-200 px-5 pb-5 pt-4">
                    {(onValidate || onDeliver) && (
                        <div className="space-y-2">
                            <button
                                onClick={() => setIsReceiptVisible(true)}
                                className="w-full ui-btn ui-btn-secondary"
                                type="button"
                            >
                                <Eye size={16} className={urgencyStyles.icon} /> {order.receipt_url ? 'Ver comprobante' : 'Comprobante no disponible'}
                            </button>
                            {onValidate && order.statut === 'pendiente_validacion' && (
                                <button
                                    onClick={() => onValidate(order.id)}
                                    disabled={isProcessing}
                                    className="w-full ui-btn ui-btn-info uppercase"
                                    type="button"
                                >
                                    {isProcessing ? 'Validando...' : 'Validar'}
                                </button>
                            )}
                            {onDeliver && order.estado_cocina === 'listo' && (
                                <button
                                    onClick={() => onDeliver(order.id)}
                                    disabled={isProcessing}
                                    className="w-full ui-btn ui-btn-success uppercase"
                                    type="button"
                                >
                                    {isProcessing ? 'Procesando...' : 'Entregar'}
                                </button>
                            )}
                        </div>
                    )}
                </footer>
            </div>
            {isReceiptVisible && (
                <div className="absolute inset-0 z-50 flex items-start justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setIsReceiptVisible(false)} />
                    <div className="relative w-full h-full bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 bg-gray-50">
                            <h3 className="text-sm font-semibold text-gray-900">Comprobante de pago</h3>
                            <button
                                onClick={() => setIsReceiptVisible(false)}
                                className="text-gray-500 hover:text-gray-700 transition"
                                type="button"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-4">
                            {order.receipt_url ? (
                                <img src={order.receipt_url} alt="Comprobante" className="w-full h-auto rounded-md" />
                            ) : (
                                <p className="text-center text-gray-500">No se proporcionó comprobante.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


const ParaLlevar: React.FC = () => {
    const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
    const [readyOrders, setReadyOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
    const { content: siteContent, loading: siteContentLoading, updateContent } = useSiteContent();
    const { schedule: weeklySchedule, updateSchedule, loading: scheduleLoading } = useOnlineOrderingSchedules();
    const [savingSchedule, setSavingSchedule] = useState(false);
    const [scheduleFeedback, setScheduleFeedback] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);
    const [now, setNow] = useState(() => new Date());
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        const updateNow = () => setNow(new Date());
        updateNow();
        const interval = window.setInterval(updateNow, 60000);
        return () => window.clearInterval(interval);
    }, []);

    const daysOfWeek: Array<{ key: keyof WeeklySchedule; label: string }> = [
        { key: 'monday', label: 'Lundi' },
        { key: 'tuesday', label: 'Mardi' },
        { key: 'wednesday', label: 'Mercredi' },
        { key: 'thursday', label: 'Jeudi' },
        { key: 'friday', label: 'Vendredi' },
        { key: 'saturday', label: 'Samedi' },
        { key: 'sunday', label: 'Dimanche' },
    ];

    const [editingSchedule, setEditingSchedule] = useState<WeeklySchedule | null>(null);
    const [editingSupportPhone, setEditingSupportPhone] = useState('');
    const [editingWhatsappPhone, setEditingWhatsappPhone] = useState('');

    useEffect(() => {
        if (weeklySchedule && !editingSchedule) {
            setEditingSchedule(weeklySchedule);
        }
    }, [weeklySchedule, editingSchedule]);

    useEffect(() => {
        if (!siteContent) {
            setEditingSupportPhone(DEFAULT_SITE_CONTENT.onlineOrdering.supportPhoneNumber);
            setEditingWhatsappPhone(DEFAULT_SITE_CONTENT.onlineOrdering.confirmationWhatsappNumber);
            return;
        }

        setEditingSupportPhone(siteContent.onlineOrdering.supportPhoneNumber ?? '');
        setEditingWhatsappPhone(siteContent.onlineOrdering.confirmationWhatsappNumber ?? '');
    }, [siteContent]);

    const resolvedContent = siteContent ?? DEFAULT_SITE_CONTENT;
    const supportPhoneNumber = resolvedContent.onlineOrdering.supportPhoneNumber?.trim();
    const whatsappResumeNumber = resolvedContent.onlineOrdering.confirmationWhatsappNumber?.trim();

    const isCurrentlyOnline = useMemo(() => {
        return isWithinWeeklySchedule(weeklySchedule, now);
    }, [weeklySchedule, now]);

    const todaySchedule = useMemo(() => {
        if (!weeklySchedule) return null;
        const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
        const dayKey = dayMap[now.getDay()];
        return weeklySchedule[dayKey];
    }, [now, weeklySchedule]);

    const scheduleStatusLabel = useMemo(() => {
        if (siteContentLoading || scheduleLoading) {
            return 'Cargando horarios...';
        }

        if (!todaySchedule) {
            return 'Hoy: Horarios no configurados';
        }

        if (todaySchedule.closed) {
            return 'Hoy: Cerrado';
        }

        const startTime = todaySchedule.startTime?.trim();
        const endTime = todaySchedule.endTime?.trim();

        if (!startTime || !endTime) {
            return 'Hoy: Horarios no disponibles';
        }

        return `Hoy: ${startTime} - ${endTime}`;
    }, [scheduleLoading, siteContentLoading, todaySchedule]);

    const handleScheduleSubmit = useCallback(async () => {
        if (!editingSchedule) {
            return;
        }

        setSavingSchedule(true);
        setScheduleFeedback(null);
        try {
            const trimmedSupport = editingSupportPhone.trim();
            const trimmedWhatsapp = editingWhatsappPhone.trim();
            const nextContent = {
                ...resolvedContent,
                onlineOrdering: {
                    ...resolvedContent.onlineOrdering,
                    supportPhoneNumber: trimmedSupport,
                    confirmationWhatsappNumber: trimmedWhatsapp,
                },
            };

            await Promise.all([
                updateSchedule(editingSchedule),
                updateContent(nextContent),
            ]);
            setScheduleFeedback({ message: 'Horarios y números actualizados con éxito.', tone: 'success' });
            setIsScheduleModalOpen(false);
        } catch (error) {
            console.error('Failed to update online ordering schedule', error);
            const message = error instanceof Error ? error.message : 'No fue posible actualizar la configuración.';
            setScheduleFeedback({ message, tone: 'error' });
        } finally {
            setSavingSchedule(false);
        }
    }, [editingSchedule, editingSupportPhone, editingWhatsappPhone, resolvedContent, updateContent, updateSchedule]);

    const fetchOrders = useCallback(async () => {
        // Don't set loading to true on refetches for a smoother experience
        try {
            const { pending, ready } = await api.getTakeawayOrders();
            setPendingOrders(pending.sort((a,b) => a.date_creation - b.date_creation));
            setReadyOrders(ready.sort((a,b) => (a.date_listo_cuisine || 0) - (b.date_listo_cuisine || 0)));
        } catch (error) {
            console.error("Failed to fetch takeaway orders", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setLoading(true);
        fetchOrders();
        const interval = setInterval(fetchOrders, 10000); // Poll for new orders
        const unsubscribe = api.notifications.subscribe('orders_updated', fetchOrders);
        return () => {
            clearInterval(interval);
            unsubscribe();
        };
    }, [fetchOrders]);
    
    const handleValidate = async (orderId: string) => {
        if (processingOrderId) return; // Prevent multiple actions at once
        setProcessingOrderId(orderId);
        try {
            await api.validateTakeawayOrder(orderId);
            await fetchOrders(); // Refresh immediately after action
        } catch (error: any) {
            console.error("Failed to validate order:", error);
            alert(`No se pudo validar el pedido: ${error.message}`);
        } finally {
            setProcessingOrderId(null);
        }
    };
    
    const handleDeliver = async (orderId: string) => {
        if (processingOrderId) return; // Prevent multiple actions at once
        setProcessingOrderId(orderId);
        try {
            await api.markTakeawayAsDelivered(orderId);
            await fetchOrders(); // Refresh immediately after action
        } catch (error) {
            console.error("Failed to mark order as delivered:", error);
            alert('Ocurrió un error al finalizar el pedido.');
        } finally {
            setProcessingOrderId(null);
        }
    };

    if (loading) return <div className="text-gray-700">Cargando pedidos para llevar...</div>;

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                            <Clock size={22} />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-gray-900">Disponibilidad de pedidos en línea</h2>
                            <p className="text-sm text-gray-500">
                                {scheduleStatusLabel}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                                isCurrentlyOnline
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-amber-100 text-amber-700'
                            }`}
                        >
                            <span className={`h-2 w-2 rounded-full ${isCurrentlyOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            {isCurrentlyOnline ? 'Abierto' : 'Cerrado'}
                        </span>
                        <button
                            onClick={() => setIsScheduleModalOpen(true)}
                            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                            type="button"
                        >
                            Configurer
                        </button>
                    </div>
                </div>
                {scheduleFeedback && (
                    <p
                        className={`mt-4 text-sm font-medium ${
                            scheduleFeedback.tone === 'success' ? 'text-emerald-600' : 'text-red-600'
                        }`}
                    >
                        {scheduleFeedback.message}
                    </p>
                )}
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Número mostrado en el tracker</p>
                        <p className="mt-1 text-lg font-semibold text-gray-900">
                            {supportPhoneNumber ? supportPhoneNumber : 'Sin configurar'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Este número aparece en el seguimiento del cliente para contactar al restaurante.</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Número para resúmenes de WhatsApp</p>
                        <p className="mt-1 text-lg font-semibold text-gray-900">
                            {whatsappResumeNumber ? whatsappResumeNumber : 'Sin configurar'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Se usa para enviar automáticamente el resumen cuando el cliente confirma.</p>
                    </div>
                </div>
            </div>
            
            <Modal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)} title="Configuración de horarios" size="xs">
                <div className="space-y-1.5">
                    {daysOfWeek.map(({ key, label }) => (
                        <div key={key} className="rounded border border-gray-200 bg-gray-50 p-1.5">
                            <div className="flex items-center justify-between gap-2 mb-1">
                                <h3 className="text-xs font-semibold text-gray-900">{label}</h3>
                                <label className="flex items-center gap-1">
                                    <input
                                        type="checkbox"
                                        checked={editingSchedule?.[key]?.closed ?? false}
                                        onChange={(e) => editingSchedule && setEditingSchedule({
                                            ...editingSchedule,
                                            [key]: { ...editingSchedule[key], closed: e.target.checked }
                                        })}
                                        className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-1 focus:ring-blue-500"
                                    />
                                    <span className="text-[10px] text-gray-700">Cerrado</span>
                                </label>
                            </div>
                            {editingSchedule && !editingSchedule[key].closed && (
                                <div className="flex gap-1.5">
                                    <label className="flex flex-col gap-0.5 flex-1">
                                        <span className="text-[9px] font-medium text-gray-600">Apertura</span>
                                        <input
                                            type="time"
                                            value={editingSchedule[key].startTime}
                                            onChange={(e) => setEditingSchedule({
                                                ...editingSchedule,
                                                [key]: { ...editingSchedule[key], startTime: e.target.value }
                                            })}
                                            className="w-full rounded border border-gray-300 bg-white px-1.5 py-0.5 text-[11px] text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                                        />
                                    </label>
                                    <label className="flex flex-col gap-0.5 flex-1">
                                        <span className="text-[9px] font-medium text-gray-600">Cierre</span>
                                        <input
                                            type="time"
                                            value={editingSchedule[key].endTime}
                                            onChange={(e) => setEditingSchedule({
                                                ...editingSchedule,
                                                [key]: { ...editingSchedule[key], endTime: e.target.value }
                                            })}
                                            className="w-full rounded border border-gray-300 bg-white px-1.5 py-0.5 text-[11px] text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                                        />
                                    </label>
                                </div>
                            )}
                        </div>
                    ))}
                    <div className="space-y-3 rounded border border-gray-200 bg-white/60 p-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Datos de contacto</h4>
                        <label className="flex flex-col gap-1">
                            <span className="text-[11px] font-medium text-gray-600">Número mostrado en el tracker</span>
                            <input
                                type="tel"
                                value={editingSupportPhone}
                                onChange={(e) => setEditingSupportPhone(e.target.value)}
                                className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                                placeholder="Ej.: +57 323 809 0562"
                            />
                            <span className="text-[10px] text-gray-500">Visible para el cliente en el seguimiento del pedido.</span>
                        </label>
                        <label className="flex flex-col gap-1">
                            <span className="text-[11px] font-medium text-gray-600">Número para resúmenes de WhatsApp</span>
                            <input
                                type="tel"
                                value={editingWhatsappPhone}
                                onChange={(e) => setEditingWhatsappPhone(e.target.value)}
                                className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                                placeholder="Ej.: 573238090562"
                            />
                            <span className="text-[10px] text-gray-500">Se utiliza cuando el cliente envía su resumen de pedido.</span>
                        </label>
                    </div>
                    <div className="flex justify-end gap-1.5 pt-2 border-t border-gray-200">
                        <button
                            onClick={() => setIsScheduleModalOpen(false)}
                            className="rounded border border-gray-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                            type="button"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleScheduleSubmit}
                            disabled={savingSchedule}
                            className="rounded bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                            type="button"
                        >
                            {savingSchedule ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </div>
            </Modal>
            
            <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2">
                {/* Column for validation */}
                <div className="bg-gray-100 p-4 rounded-xl">
                    <h2 className="text-lg sm:text-xl font-bold mb-4 text-center text-blue-700">Pendientes de validación ({pendingOrders.length})</h2>
                    <div className="space-y-4">
                        {pendingOrders.length > 0 ? pendingOrders.map(order => (
                            <TakeawayCard key={order.id} order={order} onValidate={handleValidate} isProcessing={processingOrderId === order.id} />
                        )) : <p className="text-center text-gray-500 py-8">No hay pedidos para validar.</p>}
                    </div>
                </div>

                {/* Column for ready orders */}
                <div className="bg-gray-100 p-4 rounded-xl">
                    <h2 className="text-lg sm:text-xl font-bold mb-4 text-center text-green-700">Pedidos listos ({readyOrders.length})</h2>
                    <div className="space-y-4">
                        {readyOrders.length > 0 ? readyOrders.map(order => (
                            <TakeawayCard key={order.id} order={order} onDeliver={handleDeliver} isProcessing={processingOrderId === order.id} />
                        )) : <p className="text-center text-gray-500 py-8">No hay pedidos listos.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ParaLlevar;