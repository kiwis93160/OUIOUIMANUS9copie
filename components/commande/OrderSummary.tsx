import React from 'react';
import { Check, DollarSign, MessageSquare, MinusCircle, PlusCircle, Send } from 'lucide-react';
import type { Order, OrderItem } from '../../types';
import { formatCurrencyCOP } from '../../utils/formatIntegerAmount';
import { mapIngredientIdsToNames, type IngredientNameMap } from '../../utils/ingredientNames';
import { formatTableLabelForOrder } from '../../utils/tableName';

const isFreeShippingType = (type?: string | null) => (type ?? '').toLowerCase() === 'free_shipping';

export type CategorizedOrderItems = {
    pending: { item: OrderItem; index: number }[];
    sent: { item: OrderItem; index: number }[];
};

export interface OrderSummaryProps {
    categorizedItems: CategorizedOrderItems;
    order: Order; // Ajout de l'objet Order complet
    total: number;
    onQuantityChange: (itemIndex: number, change: number) => void;
    onCommentChange: (itemIndex: number, newComment: string) => void;
    onPersistComment: (itemIndex: number) => void;
    onStartEditingComment: (itemId: string) => void;
    onSendToKitchen: () => void | Promise<void>;
    onServeOrder: () => void | Promise<void>;
    onOpenPayment: () => void;
    isSending: boolean;
    hasPending: boolean;
    orderStatus: Order["estado_cocina"];
    editingCommentId: string | null;
    className?: string;
    ingredientNameMap?: IngredientNameMap;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({
    categorizedItems,
    order,
    total,
    onQuantityChange,
    onCommentChange,
    onPersistComment,
    onStartEditingComment,
    onSendToKitchen,
    onServeOrder,
    onOpenPayment,
    isSending,
    hasPending,
    orderStatus,
    editingCommentId,
    className,
    ingredientNameMap,
}) => {
    const totalItemsCount = categorizedItems.pending.length + categorizedItems.sent.length;
    const renderExcludedIngredients = (item: OrderItem) => {
        const excludedLabels = mapIngredientIdsToNames(item.excluded_ingredients, ingredientNameMap);
        if (excludedLabels.length === 0) {
            return null;
        }

        return (
            <p className="mt-2 rounded-md bg-white/80 p-2 text-xs font-semibold text-red-600">
                🚫 Sin: {excludedLabels.join(', ')}
            </p>
        );
    };

    const renderExtras = (item: OrderItem, keyPrefix: string) => {
        if (!item.selected_extras || item.selected_extras.length === 0) {
            return null;
        }

        return (
            <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 space-y-1">
                {item.selected_extras.map((extra, extraIndex) => (
                    <div key={`${item.id}-${keyPrefix}-${extraIndex}`} className="flex items-center gap-2">
                        <span className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                            <PlusCircle size={12} />
                        </span>
                        <span className="font-semibold text-emerald-700">{extra.extraName}:</span>
                        <span className="text-emerald-800">{extra.optionName}</span>
                    </div>
                ))}
            </div>
        );
    };

    const tableLabel = formatTableLabelForOrder(order.table_nom);

    return (
        <div className={`ui-card flex flex-col ${className ?? ''}`}>
            <div className="p-4 border-b">
                <h2 className="text-2xl font-semibold text-brand-secondary">
                    Pedido
                    {tableLabel && (
                        <span className="ml-2 text-lg font-semibold lowercase text-brand-secondary/80">
                            {tableLabel}
                        </span>
                    )}
                </h2>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {totalItemsCount === 0 ? (
                    <p className="text-gray-500">El pedido está vacío.</p>
                ) : (
                    <>
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h3 className="text-lg font-semibold text-brand-secondary">Artículos por enviar</h3>
                                <span className="text-sm text-gray-500">{categorizedItems.pending.length}</span>
                            </div>
                            {categorizedItems.pending.length === 0 ? (
                                <p className="text-sm text-gray-500">No hay artículos pendientes.</p>
                            ) : (
                                categorizedItems.pending.map(({ item, index }) => (
                                    <div key={item.id} className="p-3 rounded-lg bg-yellow-100">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div className="flex flex-1 items-center gap-3">
                                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-yellow-500 text-base font-bold text-white shadow-md">
                                                    {item.quantite}
                                                </span>
                                                <p className="font-bold text-gray-900 text-[clamp(0.95rem,1.9vw,1.2rem)] leading-snug break-words text-balance whitespace-normal [hyphens:auto]">
                                                    {item.nom_produit}
                                                </p>
                                            </div>
                                            <p className="font-bold text-gray-900 whitespace-nowrap">
                                                {formatCurrencyCOP(item.quantite * item.prix_unitaire)}
                                            </p>
                                        </div>
                                        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                                            <p className="text-sm text-gray-700">
                                                {formatCurrencyCOP(item.prix_unitaire)} /u
                                            </p>
                                            <div className="flex items-center gap-2 text-gray-800">
                                                <button onClick={() => onQuantityChange(index, -1)} className="rounded-full p-1 transition hover:bg-yellow-200">
                                                    <MinusCircle size={20} />
                                                </button>
                                                <span className="font-bold w-6 text-center">{item.quantite}</span>
                                                <button onClick={() => onQuantityChange(index, 1)} className="rounded-full p-1 transition hover:bg-yellow-200">
                                                    <PlusCircle size={20} />
                                                </button>
                                            </div>
                                        </div>
                                        {editingCommentId === item.id || item.commentaire ? (
                                            <input
                                                type="text"
                                                placeholder="Agregar un comentario..."
                                                value={item.commentaire ?? ''}
                                                onChange={(event) => onCommentChange(index, event.target.value)}
                                                onBlur={() => onPersistComment(index)}
                                                autoFocus={editingCommentId === item.id}
                                                className="mt-2 ui-input text-sm"
                                            />
                                        ) : (
                                            <button
                                                onClick={() => onStartEditingComment(item.id)}
                                                className="mt-2 text-xs text-blue-600 hover:underline flex items-center gap-1"
                                            >
                                                <MessageSquare size={12} /> Agregar un comentario
                                            </button>
                                        )}
                                        {renderExtras(item, 'extra')}
                                        {renderExcludedIngredients(item)}
                                    </div>
                                ))
                            )}
                        </div>

                        {categorizedItems.sent.length > 0 && (
                            <div className="space-y-3 border-t border-gray-700 pt-6">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <h3 className="text-lg font-semibold text-brand-secondary">Enviados a cocina</h3>
                                    <span className="text-sm text-gray-500">{categorizedItems.sent.length}</span>
                                </div>
                                {categorizedItems.sent.map(({ item }) => (
                                    <div key={item.id} className="p-3 rounded-lg bg-green-100">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div className="flex flex-1 items-center gap-3">
                                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-600 text-base font-bold text-white shadow-md">
                                                    {item.quantite}
                                                </span>
                                                <p className="font-bold text-gray-900 text-[clamp(0.95rem,1.9vw,1.2rem)] leading-snug break-words text-balance whitespace-normal [hyphens:auto]">
                                                    {item.nom_produit}
                                                </p>
                                            </div>
                                            <p className="font-bold text-gray-900 whitespace-nowrap">
                                                {formatCurrencyCOP(item.quantite * item.prix_unitaire)}
                                            </p>
                                        </div>
                                        <p className="text-sm text-gray-700 mt-2">
                                            {formatCurrencyCOP(item.prix_unitaire)} /u
                                        </p>
                                        {renderExtras(item, 'sent-extra')}
                                        {renderExcludedIngredients(item)}
                                        {item.commentaire && (
                                            <p className="mt-2 text-sm italic text-gray-600 pl-2">"{item.commentaire}"</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
            <div className="space-y-4 border-t p-4">
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-gray-700">
                        <span>Subtotal</span>
                        <span>{formatCurrencyCOP(order.subtotal ?? 0)}</span>
                    </div>
                    {order.total_discount && order.total_discount > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-2 text-green-600">
                            <span>Descuento total</span>
                            <span>- {formatCurrencyCOP(order.total_discount)}</span>
                        </div>
                    )}
                    {order.shipping_cost !== undefined && order.shipping_cost > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-2 text-gray-700">
                            <span>Costo de envío</span>
                            <span>{formatCurrencyCOP(order.shipping_cost)}</span>
                        </div>
                    )}
                    {order.shipping_cost === 0 && order.applied_promotions?.some(p => isFreeShippingType(p.type)) && (
                        <div className="flex flex-wrap items-center justify-between gap-2 text-green-600">
                            <span>Envío gratis</span>
                            <span>{formatCurrencyCOP(0)}</span>
                        </div>
                    )}
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-2xl font-semibold text-brand-secondary">
                        <span>Total</span>
                        <span>{formatCurrencyCOP(total)}</span>
                    </div>
                </div>

                {orderStatus === 'listo' && (
                    <button onClick={onServeOrder} className="w-full ui-btn-info justify-center py-3">
                        <Check size={20} />
                        <span>Entregada</span>
                    </button>
                )}

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <button
                        onClick={onSendToKitchen}
                        disabled={isSending || !hasPending}
                        className="ui-btn-accent flex-1 justify-center py-3 disabled:opacity-60"
                    >
                        <Send size={20} />
                        <span>{isSending ? 'Sincronizando...' : 'Enviar a cocina'}</span>
                    </button>
                    <button
                        onClick={onOpenPayment}
                        disabled={orderStatus !== 'servido'}
                        className="ui-btn-success flex-1 justify-center py-3 disabled:opacity-60"
                    >
                        <DollarSign size={20} />
                        <span>Cobrar</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderSummary;
