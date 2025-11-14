import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Tag, Percent, Package, Info, ExternalLink } from 'lucide-react';
import { Promotion, PromotionUsage } from '../../types';
import { getAccessibleTextColor } from '../../utils/color';
import { fetchPromotionUsages } from '../../services/promotionsApi';

interface PromotionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  promotion: Promotion;
}

const typeLabels: Record<string, string> = {
  percentage: 'Porcentaje',
  fixed_amount: 'Monto fijo',
  promo_code: 'Código promocional',
  buy_x_get_y: '2x1 / Compra X y recibe Y',
  free_product: 'Producto gratis',
  free_shipping: 'Envío gratis',
  combo: 'Combo',
  threshold: 'Umbral',
  happy_hour: 'Happy hour'
};

const statusLabels: Record<string, string> = {
  active: 'Activa',
  inactive: 'Inactiva',
  scheduled: 'Programada',
  expired: 'Expirada'
};

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-black',
  inactive: 'bg-gray-100 text-black',
  scheduled: 'bg-blue-100 text-black',
  expired: 'bg-red-100 text-black'
};

const PromotionDetailsModal: React.FC<PromotionDetailsModalProps> = ({ isOpen, onClose, promotion }) => {
  const [usages, setUsages] = useState<PromotionUsage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'usages'>('details');

  useEffect(() => {
    if (isOpen && promotion) {
      loadUsages();
    }
  }, [isOpen, promotion]);

  const loadUsages = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPromotionUsages(promotion.id);
      setUsages(data);
    } catch (err) {
      setError('Error al cargar los usos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const badgeBackgroundColor = promotion.visuals?.badge_bg_color || '#F9A826';
  const badgeTextColor = getAccessibleTextColor(badgeBackgroundColor);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm">
      <div className="flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-black shadow-2xl">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-6 py-5 text-black sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold leading-snug sm:text-2xl">Detalles de la promoción</h2>
          <button
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-transparent text-black transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            aria-label="Cerrar los detalles de la promoción"
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-6">
          <button
            className={`rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary ${
              activeTab === 'details'
                ? 'border border-brand-primary bg-brand-primary/10 text-black shadow'
                : 'border border-transparent text-black hover:bg-slate-100'
            }`}
            onClick={() => setActiveTab('details')}
          >
            Detalles
          </button>
          <button
            className={`rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary ${
              activeTab === 'usages'
                ? 'border border-brand-primary bg-brand-primary/10 text-black shadow'
                : 'border border-transparent text-black hover:bg-slate-100'
            }`}
            onClick={() => setActiveTab('usages')}
          >
            Usos ({promotion.usage_count})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-white px-4 py-6 sm:px-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-black">{promotion.name}</h3>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusColors[promotion.status]}`}>
                        {statusLabels[promotion.status]}
                      </span>
                      <span className="text-sm font-medium text-black">{typeLabels[promotion.type]}</span>
                    </div>
                  </div>
                  <div className="rounded-full border border-slate-200 bg-white/80 px-4 py-1.5 text-sm font-semibold text-black shadow-sm">
                    Prioridad: {promotion.priority}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm">
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-black">
                    <Info size={16} />
                    Información general
                  </h4>
                  <dl className="space-y-2 text-sm text-black">
                    <div className="flex items-center justify-between">
                      <dt className="font-medium">ID</dt>
                      <dd className="rounded bg-white/80 px-2 py-0.5 font-mono text-black shadow-sm">{promotion.id}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="font-medium">Creada el</dt>
                      <dd>{formatDate(promotion.created_at)}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="font-medium">Actualizada</dt>
                      <dd>{formatDate(promotion.updated_at)}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="font-medium">Usos</dt>
                      <dd>{promotion.usage_count}</dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm">
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-black">
                    <Percent size={16} />
                    Descuento
                  </h4>
                  <dl className="space-y-2 text-sm text-black">
                    <div className="flex items-center justify-between">
                      <dt className="font-medium">Tipo</dt>
                      <dd>{promotion.discount.type === 'percentage' ? 'Porcentaje' : 'Monto fijo'}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="font-medium">Valor</dt>
                      <dd className="font-semibold text-black">
                        {promotion.discount.value}
                        {promotion.discount.type === 'percentage' ? '%' : '€'}
                      </dd>
                    </div>
                    {promotion.discount.max_discount_amount && (
                      <div className="flex items-center justify-between">
                        <dt className="font-medium">Máximo</dt>
                        <dd>{promotion.discount.max_discount_amount}€</dd>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <dt className="font-medium">Aplicación</dt>
                      <dd>
                        {promotion.discount.applies_to === 'total' && 'Total del pedido'}
                        {promotion.discount.applies_to === 'products' && 'Productos específicos'}
                        {promotion.discount.applies_to === 'shipping' && 'Costo de envío'}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-black">
                  <Calendar size={16} />
                  Condiciones
                </h4>
                <dl className="grid grid-cols-1 gap-3 text-sm text-black md:grid-cols-2">
                  {promotion.conditions.promo_code && (
                    <div className="flex items-center justify-between">
                      <dt className="font-medium">Código promocional</dt>
                      <dd className="rounded bg-white/80 px-2 py-0.5 font-mono text-black shadow-sm">
                        {promotion.conditions.promo_code}
                      </dd>
                    </div>
                  )}

                  {promotion.conditions.min_order_amount && (
                    <div className="flex items-center justify-between">
                      <dt className="font-medium">Monto mínimo</dt>
                      <dd>{promotion.conditions.min_order_amount}€</dd>
                    </div>
                  )}

                  {promotion.conditions.max_order_amount && (
                    <div className="flex items-center justify-between">
                      <dt className="font-medium">Monto máximo</dt>
                      <dd>{promotion.conditions.max_order_amount}€</dd>
                    </div>
                  )}

                  {promotion.conditions.start_date && (
                    <div className="flex items-center justify-between">
                      <dt className="font-medium">Fecha de inicio</dt>
                      <dd>{formatDate(promotion.conditions.start_date)}</dd>
                    </div>
                  )}

                  {promotion.conditions.end_date && (
                    <div className="flex items-center justify-between">
                      <dt className="font-medium">Fecha de finalización</dt>
                      <dd>{formatDate(promotion.conditions.end_date)}</dd>
                    </div>
                  )}

                  {promotion.conditions.days_of_week && promotion.conditions.days_of_week.length > 0 && (
                    <div className="flex items-center justify-between">
                      <dt className="font-medium">Días</dt>
                      <dd>{promotion.conditions.days_of_week.map(day => ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][day]).join(', ')}</dd>
                    </div>
                  )}

                  {promotion.conditions.hours_of_day && (
                    <div className="flex items-center justify-between">
                      <dt className="font-medium">Horarios</dt>
                      <dd>
                        {promotion.conditions.hours_of_day.start} - {promotion.conditions.hours_of_day.end}
                      </dd>
                    </div>
                  )}

                  {promotion.conditions.max_uses_total && (
                    <div className="flex items-center justify-between">
                      <dt className="font-medium">Usos máximos</dt>
                      <dd>{promotion.conditions.max_uses_total}</dd>
                    </div>
                  )}

                  {promotion.conditions.max_uses_per_customer && (
                    <div className="flex items-center justify-between">
                      <dt className="font-medium">Máx. por cliente</dt>
                      <dd>{promotion.conditions.max_uses_per_customer}</dd>
                    </div>
                  )}

                  {promotion.conditions.first_order_only && (
                    <div className="flex items-center justify-between">
                      <dt className="font-medium">Primer pedido</dt>
                      <dd>Sí</dd>
                    </div>
                  )}

                  {promotion.type === 'buy_x_get_y' && (
                    <>
                      <div className="flex items-center justify-between">
                        <dt className="font-medium">Compra</dt>
                        <dd>{promotion.conditions.buy_quantity}</dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="font-medium">Recibe</dt>
                        <dd>{promotion.conditions.get_quantity}</dd>
                      </div>
                    </>
                  )}
                </dl>
              </div>

              {promotion.visuals && Object.keys(promotion.visuals).length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm">
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-black">
                    <Tag size={16} />
                    Elementos visuales
                  </h4>
                  <div className="grid grid-cols-1 gap-4 text-sm text-black md:grid-cols-2">
                    {promotion.visuals.badge_text && (
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Badge</span>
                        <span
                          className="rounded-full px-3 py-1 text-xs font-semibold"
                          style={{
                            backgroundColor: badgeBackgroundColor,
                            color: badgeTextColor,
                          }}
                        >
                          {promotion.visuals.badge_text}
                        </span>
                      </div>
                    )}

                    {promotion.visuals.banner_text && (
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Texto del banner</span>
                        <span className="text-right text-black">{promotion.visuals.banner_text}</span>
                      </div>
                    )}

                    {promotion.visuals.banner_cta && (
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Botón</span>
                        <span className="text-right text-black">{promotion.visuals.banner_cta}</span>
                      </div>
                    )}
                  </div>

                  {promotion.visuals.banner_image && (
                    <div className="mt-4">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-black">Imagen del banner</span>
                      <img
                        src={promotion.visuals.banner_image}
                        alt="Banner promocional"
                        className="w-full max-h-40 rounded-xl object-cover shadow-sm"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'usages' && (
            <div className="space-y-4">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm font-medium text-black shadow-sm">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 py-10 text-black shadow-sm">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-primary"></div>
                  <span>Cargando...</span>
                </div>
              ) : usages.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 py-10 text-center text-sm font-medium text-black shadow-sm">
                  No hay usos registrados para esta promoción
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
                  <table className="w-full divide-y divide-slate-200 text-sm text-black">
                    <thead className="bg-slate-50/90 text-xs font-semibold uppercase tracking-wide text-black">
                      <tr>
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-left">Pedido</th>
                        <th className="px-4 py-3 text-left">Client</th>
                        <th className="px-4 py-3 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {usages.map((usage) => (
                        <tr key={usage.id} className="bg-white/80 transition hover:bg-brand-accent-soft">
                          <td className="px-4 py-3 font-medium text-black">{formatDate(usage.applied_at)}</td>
                          <td className="px-4 py-3">
                            <a
                              href="#"
                              className="inline-flex items-center gap-2 text-black transition hover:underline"
                              onClick={(e) => {
                                e.preventDefault();
                              }}
                            >
                              {usage.order_id.substring(0, 8)}...
                              <ExternalLink size={14} />
                            </a>
                          </td>
                          <td className="px-4 py-3">
                            {usage.customer_phone || '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-black">
                            {usage.discount_amount.toFixed(2)}€
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-200 bg-slate-50/80 p-6">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromotionDetailsModal;
