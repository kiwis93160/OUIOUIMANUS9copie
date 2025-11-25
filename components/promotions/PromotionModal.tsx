import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { 
  Promotion, 
  PromotionType, 
  PromotionStatus,
  PromotionConditions,
  PromotionDiscount,
  PromotionVisuals
} from '../../types';
import { createPromotion, updatePromotion } from '../../services/promotionsApi';
import { normalizeCloudinaryImageUrl, uploadCustomizationAsset } from '../../services/cloudinary';

interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  promotion?: Promotion;
}

const typeOptions: { value: PromotionType; label: string }[] = [
  { value: 'percentage', label: 'Pourcentage' },
  { value: 'fixed_amount', label: 'Montant fixe' },
  { value: 'promo_code', label: 'Code promo' },
  { value: 'buy_x_get_y', label: '2x1 / Achetez X, obtenez Y' },
  { value: 'free_product', label: 'Produit gratuit' },
  { value: 'free_shipping', label: 'Livraison gratuite' },
  { value: 'combo', label: 'Combo' },
  { value: 'threshold', label: 'Palier' },
  { value: 'happy_hour', label: 'Happy hour' }
];

const statusOptions: { value: PromotionStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'scheduled', label: 'Programmée' },
  { value: 'expired', label: 'Expirée' }
];

const PromotionModal: React.FC<PromotionModalProps> = ({ isOpen, onClose, onSave, promotion }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<PromotionType>('percentage');
  const [status, setStatus] = useState<PromotionStatus>('active');
  const [priority, setPriority] = useState(0);
  const [conditions, setConditions] = useState<PromotionConditions>({});
  const [discount, setDiscount] = useState<PromotionDiscount>({
    type: 'percentage',
    value: 0,
    applies_to: 'total'
  });
  const [visuals, setVisuals] = useState<PromotionVisuals>({});
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'conditions' | 'discount' | 'visuals'>('general');
  const [imageUploading, setImageUploading] = useState(false);

  // Initialiser le formulaire avec les valeurs de la promotion existante
  useEffect(() => {
    if (promotion) {
      setName(promotion.name);
      setType(promotion.type);
      setStatus(promotion.status);
      setPriority(promotion.priority);
      setConditions(promotion.conditions);
      setDiscount(promotion.discount);
      setVisuals(promotion.visuals || {});
    }
  }, [promotion]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation de la valeur de réduction
    if (type !== 'free_shipping' && (!discount.value || discount.value <= 0)) {
      setError('La valeur de la réduction doit être supérieure à 0');
      setLoading(false);
      setActiveTab('discount');
      return;
    }

    // Validation du nom
    if (!name || name.trim() === '') {
      setError('Le nom de la promotion est obligatoire');
      setLoading(false);
      setActiveTab('general');
      return;
    }

    try {
      if (promotion) {
        // Mise à jour d'une promotion existante
        await updatePromotion(promotion.id, {
          name,
          type,
          status,
          priority,
          conditions,
          discount,
          visuals
        });
      } else {
        // Création d'une nouvelle promotion
        await createPromotion({
          name,
          type,
          status,
          priority,
          conditions,
          discount,
          visuals
        });
      }
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploading(true);
    try {
      const url = await uploadCustomizationAsset(file);
      setVisuals({
        ...visuals,
        banner_image: normalizeCloudinaryImageUrl(url)
      });
    } catch (err) {
      setError('Erreur lors du téléchargement de l\'image');
    } finally {
      setImageUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="promotion-modal fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-3 py-6 text-black backdrop-blur-sm">
      <div className="promotion-modal__content flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 text-black shadow-2xl ring-1 ring-slate-100">
        <div className="flex flex-col gap-3 border-b border-slate-200/80 bg-white/90 px-6 py-4 text-black sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold leading-snug sm:text-2xl">
            {promotion ? 'Modifier la promotion' : 'Nouvelle promotion'}
          </h2>
          <button
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-transparent text-black transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            aria-label="Fermer la fenêtre de promotion"
          >
            <X size={22} />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm font-medium text-black shadow-sm">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-b border-slate-200/80 bg-slate-100/70 px-4 py-3 sm:px-6">
          <button
            className={`rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary ${
              activeTab === 'general'
                ? 'border border-brand-primary bg-brand-primary/10 text-black shadow'
                : 'border border-transparent text-black hover:bg-slate-100'
            }`}
            onClick={() => setActiveTab('general')}
          >
            Général
          </button>
          <button
            className={`rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary ${
              activeTab === 'conditions'
                ? 'border border-brand-primary bg-brand-primary/10 text-black shadow'
                : 'border border-transparent text-black hover:bg-slate-100'
            }`}
            onClick={() => setActiveTab('conditions')}
          >
            Conditions
          </button>
          <button
            className={`rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary ${
              activeTab === 'discount'
                ? 'border border-brand-primary bg-brand-primary/10 text-black shadow'
                : 'border border-transparent text-black hover:bg-slate-100'
            }`}
            onClick={() => setActiveTab('discount')}
          >
            Réduction
          </button>
          <button
            className={`rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary ${
              activeTab === 'visuals'
                ? 'border border-brand-primary bg-brand-primary/10 text-black shadow'
                : 'border border-transparent text-black hover:bg-slate-100'
            }`}
            onClick={() => setActiveTab('visuals')}
          >
            Affichage
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 py-6 text-black sm:px-6">
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-lg ring-1 ring-slate-100">
                <div>
                  <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-wide text-black">
                    Nom de la promotion
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="ui-input mt-2"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="type" className="block text-xs font-semibold uppercase tracking-wide text-black">
                      Type de promotion
                    </label>
                    <select
                      id="type"
                      value={type}
                      onChange={(e) => setType(e.target.value as PromotionType)}
                      className="ui-input mt-2"
                      required
                    >
                      {typeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="status" className="block text-xs font-semibold uppercase tracking-wide text-black">
                      Statut
                    </label>
                    <select
                      id="status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as PromotionStatus)}
                      className="ui-input mt-2"
                      required
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="priority" className="block text-xs font-semibold uppercase tracking-wide text-black">
                    Priorité
                  </label>
                  <input
                    type="number"
                    id="priority"
                    value={priority}
                    onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                    className="ui-input mt-2"
                    min="0"
                    max="100"
                  />
                  <p className="mt-2 text-xs text-black">
                    Plus la valeur est élevée, plus la promotion est prioritaire.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'conditions' && (
            <div className="space-y-4">
              <div className="space-y-6 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-lg ring-1 ring-slate-100">
                {type === 'promo_code' && (
                  <div>
                    <label htmlFor="promo_code" className="block text-xs font-semibold uppercase tracking-wide text-black">
                      Code promo
                    </label>
                    <input
                      type="text"
                      id="promo_code"
                      value={conditions.promo_code || ''}
                      onChange={(e) => setConditions({ ...conditions, promo_code: e.target.value })}
                      className="ui-input mt-2"
                      required={type === 'promo_code'}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="min_order_amount" className="block text-xs font-semibold uppercase tracking-wide text-black">
                      Montant minimum de commande
                    </label>
                    <input
                      type="number"
                      id="min_order_amount"
                      value={conditions.min_order_amount || ''}
                      onChange={(e) => setConditions({ ...conditions, min_order_amount: parseFloat(e.target.value) || undefined })}
                      className="ui-input mt-2"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label htmlFor="max_order_amount" className="block text-xs font-semibold uppercase tracking-wide text-black">
                      Montant maximum de commande
                    </label>
                    <input
                      type="number"
                      id="max_order_amount"
                      value={conditions.max_order_amount || ''}
                      onChange={(e) => setConditions({ ...conditions, max_order_amount: parseFloat(e.target.value) || undefined })}
                      className="ui-input mt-2"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="start_date" className="block text-xs font-semibold uppercase tracking-wide text-black">
                      Date de début
                    </label>
                    <input
                      type="datetime-local"
                      id="start_date"
                      value={conditions.start_date ? new Date(conditions.start_date).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setConditions({ ...conditions, start_date: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                      className="ui-input mt-2"
                    />
                  </div>

                  <div>
                    <label htmlFor="end_date" className="block text-xs font-semibold uppercase tracking-wide text-black">
                      Date de fin
                    </label>
                    <input
                      type="datetime-local"
                      id="end_date"
                      value={conditions.end_date ? new Date(conditions.end_date).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setConditions({ ...conditions, end_date: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                      className="ui-input mt-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-black">
                    Jours de la semaine
                  </label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'].map((day, index) => (
                      <label key={index} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-sm text-black shadow-sm">
                        <input
                          type="checkbox"
                          checked={conditions.days_of_week?.includes(index) || false}
                          onChange={(e) => {
                            const days = conditions.days_of_week || [];
                            if (e.target.checked) {
                              setConditions({ ...conditions, days_of_week: [...days, index] });
                            } else {
                              setConditions({ ...conditions, days_of_week: days.filter(d => d !== index) });
                            }
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-black focus:ring-black"
                        />
                        <span>{day}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="hours_start" className="block text-xs font-semibold uppercase tracking-wide text-black">
                      Heure de début
                    </label>
                    <input
                      type="time"
                      id="hours_start"
                      value={conditions.hours_of_day?.start || ''}
                      onChange={(e) => setConditions({
                        ...conditions,
                        hours_of_day: {
                          ...(conditions.hours_of_day || {}),
                          start: e.target.value
                        }
                      })}
                      className="ui-input mt-2"
                    />
                  </div>

                  <div>
                    <label htmlFor="hours_end" className="block text-xs font-semibold uppercase tracking-wide text-black">
                      Heure de fin
                    </label>
                    <input
                      type="time"
                      id="hours_end"
                      value={conditions.hours_of_day?.end || ''}
                      onChange={(e) => setConditions({
                        ...conditions,
                        hours_of_day: {
                          ...(conditions.hours_of_day || {}),
                          end: e.target.value
                        }
                      })}
                      className="ui-input mt-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="max_uses" className="block text-xs font-semibold uppercase tracking-wide text-black">
                      Nombre maximum d'utilisations
                    </label>
                    <input
                      type="number"
                      id="max_uses"
                      value={conditions.max_uses_total || ''}
                      onChange={(e) => setConditions({ ...conditions, max_uses_total: parseInt(e.target.value) || undefined })}
                      className="ui-input mt-2"
                      min="0"
                    />
                  </div>

                  <div>
                    <label htmlFor="max_uses_per_customer" className="block text-xs font-semibold uppercase tracking-wide text-black">
                      Maximum par client
                    </label>
                    <input
                      type="number"
                      id="max_uses_per_customer"
                      value={conditions.max_uses_per_customer || ''}
                      onChange={(e) => setConditions({ ...conditions, max_uses_per_customer: parseInt(e.target.value) || undefined })}
                      className="ui-input mt-2"
                      min="0"
                    />
                  </div>
                </div>

                {type === 'buy_x_get_y' && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label htmlFor="buy_quantity" className="block text-xs font-semibold uppercase tracking-wide text-black">
                        Quantité à acheter
                      </label>
                      <input
                        type="number"
                        id="buy_quantity"
                        value={conditions.buy_quantity || ''}
                        onChange={(e) => setConditions({ ...conditions, buy_quantity: parseInt(e.target.value) || undefined })}
                        className="ui-input mt-2"
                        min="1"
                        required={type === 'buy_x_get_y'}
                      />
                    </div>

                    <div>
                      <label htmlFor="get_quantity" className="block text-xs font-semibold uppercase tracking-wide text-black">
                        Quantité offerte
                      </label>
                      <input
                        type="number"
                        id="get_quantity"
                        value={conditions.get_quantity || ''}
                        onChange={(e) => setConditions({ ...conditions, get_quantity: parseInt(e.target.value) || undefined })}
                        className="ui-input mt-2"
                        min="1"
                        required={type === 'buy_x_get_y'}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
                  <input
                    type="checkbox"
                    id="first_order_only"
                    checked={conditions.first_order_only || false}
                    onChange={(e) => setConditions({ ...conditions, first_order_only: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-black focus:ring-black"
                  />
                  <label htmlFor="first_order_only" className="text-sm font-medium text-black">
                    Uniquement pour la première commande
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'discount' && (
            <div className="space-y-4">
              <div className="space-y-6 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-lg ring-1 ring-slate-100">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="discount_type" className="block text-xs font-semibold uppercase tracking-wide text-black">
                      Type de réduction
                    </label>
                    <select
                      id="discount_type"
                      value={discount.type}
                      onChange={(e) => setDiscount({ ...discount, type: e.target.value as 'percentage' | 'fixed_amount' })}
                      className="ui-input mt-2"
                      required
                    >
                      <option value="percentage">Pourcentage</option>
                      <option value="fixed_amount">Montant fixe</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="discount_value" className="block text-xs font-semibold uppercase tracking-wide text-black">
                      Valeur de la réduction
                    </label>
                    <div className="relative mt-2">
                      <input
                        type="number"
                        id="discount_value"
                        value={discount.value}
                        onChange={(e) => setDiscount({ ...discount, value: parseFloat(e.target.value) || 0 })}
                        className="ui-input pr-10"
                        min="0"
                        step={discount.type === 'percentage' ? '0.01' : '0.01'}
                        required
                      />
                      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-semibold text-black">
                        {discount.type === 'percentage' ? '%' : '€'}
                      </div>
                    </div>
                  </div>
                </div>

                {discount.type === 'percentage' && (
                  <div>
                    <label htmlFor="max_discount_amount" className="block text-xs font-semibold uppercase tracking-wide text-black">
                      Montant maximum de la réduction
                    </label>
                    <div className="relative mt-2">
                      <input
                        type="number"
                        id="max_discount_amount"
                        value={discount.max_discount_amount || ''}
                        onChange={(e) => setDiscount({ ...discount, max_discount_amount: parseFloat(e.target.value) || undefined })}
                        className="ui-input pr-10"
                        min="0"
                        step="0.01"
                      />
                      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-semibold text-black">
                        €
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="applies_to" className="block text-xs font-semibold uppercase tracking-wide text-black">
                    Application de la réduction
                  </label>
                  <select
                    id="applies_to"
                    value={discount.applies_to}
                    onChange={(e) => setDiscount({ ...discount, applies_to: e.target.value as 'total' | 'products' | 'shipping' })}
                    className="ui-input mt-2"
                    required
                  >
                    <option value="total">Total de la commande</option>
                    <option value="products">Produits spécifiques</option>
                    <option value="shipping">Frais de livraison</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'visuals' && (
            <div className="space-y-4">
              <div className="space-y-6 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-lg ring-1 ring-slate-100">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="badge_text" className="block text-xs font-semibold uppercase tracking-wide text-black">
                      Texte du badge
                    </label>
                    <input
                      type="text"
                      id="badge_text"
                      value={visuals.badge_text || ''}
                      onChange={(e) => setVisuals({ ...visuals, badge_text: e.target.value })}
                      className="ui-input mt-2"
                      placeholder="Ex: 2x1, -20%, etc."
                    />
                  </div>

                  <div>
                    <label htmlFor="badge_color" className="block text-xs font-semibold uppercase tracking-wide text-black">
                      Couleur du texte du badge
                    </label>
                    <input
                      type="color"
                      id="badge_color"
                      value={visuals.badge_color || '#FFFFFF'}
                      onChange={(e) => setVisuals({ ...visuals, badge_color: e.target.value })}
                      className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="badge_bg_color" className="block text-xs font-semibold uppercase tracking-wide text-black">
                    Couleur de fond du badge
                  </label>
                  <input
                    type="color"
                    id="badge_bg_color"
                    value={visuals.badge_bg_color || '#F9A826'}
                    onChange={(e) => setVisuals({ ...visuals, badge_bg_color: e.target.value })}
                    className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-white"
                  />
                </div>

                <div>
                  <label htmlFor="badge_bg_image" className="block text-xs font-semibold uppercase tracking-wide text-black">
                    Image de fond du badge (optionnel)
                  </label>
                  <p className="mt-1 text-xs text-black">
                    Si vous uploadez une image, elle remplacera la couleur de fond du badge
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-4">
                    <label className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-black shadow-sm transition hover:bg-slate-100">
                      <input
                        type="file"
                        id="badge_bg_image"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          setImageUploading(true);
                          try {
                            const url = await uploadCustomizationAsset(file, { tags: ['badge-background'] });
                            setVisuals({
                              ...visuals,
                              badge_bg_image: normalizeCloudinaryImageUrl(url)
                            });
                          } catch (err) {
                            setError('Erreur lors du téléchargement de l\'image du badge');
                          } finally {
                            setImageUploading(false);
                          }
                        }}
                        className="sr-only"
                        accept="image/*"
                      />
                      <span>{imageUploading ? 'Téléchargement...' : 'Choisir une image'}</span>
                    </label>
                    {visuals.badge_bg_image && (
                      <div className="relative">
                        <img
                          src={visuals.badge_bg_image}
                          alt="Aperçu de l'image de fond du badge"
                          className="h-16 w-auto rounded-lg object-cover shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setVisuals({ ...visuals, badge_bg_image: undefined })}
                          className="absolute -top-2 -right-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-red-500 bg-white text-black shadow hover:bg-red-100"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="banner_text" className="block text-xs font-semibold uppercase tracking-wide text-black">
                    Texte de la bannière
                  </label>
                  <input
                    type="text"
                    id="banner_text"
                    value={visuals.banner_text || ''}
                    onChange={(e) => setVisuals({ ...visuals, banner_text: e.target.value })}
                    className="ui-input mt-2"
                    placeholder="Ex: Offre spéciale : 20% de réduction sur tous les tacos !"
                  />
                </div>

                <div>
                  <label htmlFor="banner_image" className="block text-xs font-semibold uppercase tracking-wide text-black">
                    Image de la bannière
                  </label>
                  <div className="mt-3 flex flex-wrap items-center gap-4">
                    <label className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-black shadow-sm transition hover:bg-slate-100">
                      <input
                        type="file"
                        id="banner_image"
                        onChange={handleImageUpload}
                        className="sr-only"
                        accept="image/*"
                      />
                      <span>{imageUploading ? 'Téléchargement...' : 'Choisir une image'}</span>
                    </label>
                    {visuals.banner_image && (
                      <div className="relative">
                        <img
                          src={visuals.banner_image}
                          alt="Aperçu de la bannière"
                          className="h-20 w-auto rounded-lg object-cover shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setVisuals({ ...visuals, banner_image: undefined })}
                          className="absolute -top-2 -right-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-red-500 bg-white text-black shadow hover:bg-red-100"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="banner_cta" className="block text-xs font-semibold uppercase tracking-wide text-black">
                    Texte du bouton d'appel à l'action
                  </label>
                  <input
                    type="text"
                    id="banner_cta"
                    value={visuals.banner_cta || ''}
                    onChange={(e) => setVisuals({ ...visuals, banner_cta: e.target.value })}
                    className="ui-input mt-2"
                    placeholder="Ex: En profiter maintenant"
                  />
                </div>
              </div>
            </div>
          )}
        </form>

        <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-white/90 p-6 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
            disabled={loading}
          >
            Annuler
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-primary bg-white px-5 py-2.5 text-sm font-semibold text-black shadow transition hover:bg-brand-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div>
                <span>Enregistrement...</span>
              </>
            ) : (
              <span>Enregistrer</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromotionModal;
