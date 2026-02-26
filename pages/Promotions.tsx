import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Eye, 
  EyeOff, 
  Calendar, 
  Clock, 
  Tag, 
  Percent, 
  Package, 
  Search,
  ChevronDown,
  ChevronUp,
  Filter,
  RefreshCw
} from 'lucide-react';
import { Promotion, PromotionStatus, PromotionType } from '../types';
import { fetchPromotions, updatePromotionStatus, deletePromotion } from '../services/promotionsApi';
import PromotionModal from '../components/promotions/PromotionModal';
import PromotionDetailsModal from '../components/promotions/PromotionDetailsModal';
import ConfirmationModal from '../components/ConfirmationModal';

const statusLabels: Record<PromotionStatus, string> = {
  active: 'Activa',
  inactive: 'Inactiva',
  scheduled: 'Programada',
  expired: 'Expirada'
};

const statusColors: Record<PromotionStatus, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  scheduled: 'bg-blue-100 text-blue-800',
  expired: 'bg-red-100 text-red-800'
};

const typeLabels: Record<PromotionType, string> = {
  percentage: 'Porcentaje',
  fixed_amount: 'Monto fijo',
  promo_code: 'Código promocional',
  buy_x_get_y: '2x1 / Compra X, obtén Y',
  free_product: 'Producto gratis',
  free_shipping: 'Envío gratis',
  combo: 'Combo',
  threshold: 'Umbral',
  happy_hour: 'Happy hour'
};

const typeIcons: Record<PromotionType, React.ReactNode> = {
  percentage: <Percent size={16} />,
  fixed_amount: <Tag size={16} />,
  promo_code: <Tag size={16} />,
  buy_x_get_y: <Package size={16} />,
  free_product: <Package size={16} />,
  free_shipping: <Package size={16} />,
  combo: <Package size={16} />,
  threshold: <ChevronUp size={16} />,
  happy_hour: <Clock size={16} />
};

const Promotions: React.FC = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PromotionStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<PromotionType | 'all'>('all');
  const [sortField, setSortField] = useState<'name' | 'priority' | 'period' | 'usage_count'>('priority');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const loadPromotions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPromotions();
      setPromotions(data);
    } catch (err) {
      setError('Error al cargar las promociones');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPromotions();
  }, []);

  const handleCreatePromotion = () => {
    setSelectedPromotion(null);
    setIsCreateModalOpen(true);
  };

  const handleEditPromotion = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    setIsEditModalOpen(true);
  };

  const handleViewPromotion = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    setIsDetailsModalOpen(true);
  };

  const handleDeletePromotion = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    setIsDeleteModalOpen(true);
  };

  const handleToggleStatus = async (promotion: Promotion) => {
    try {
      const newStatus = promotion.status === 'active' ? 'inactive' : 'active';
      const updatedPromotion = await updatePromotionStatus(promotion.id, newStatus);
      setPromotions(promotions.map(p =>
        p.id === promotion.id ? updatedPromotion : p
      ));
    } catch (err) {
      setError('Error al actualizar el estado');
      console.error(err);
    }
  };

  const confirmDelete = async () => {
    if (!selectedPromotion) return;
    
    try {
      await deletePromotion(selectedPromotion.id);
      setPromotions(promotions.filter(p => p.id !== selectedPromotion.id));
      setIsDeleteModalOpen(false);
    } catch (err) {
      setError('Error al eliminar la promoción');
      console.error(err);
    }
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredPromotions = promotions
    .filter(promotion => {
      const matchesSearch = promotion.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || promotion.status === statusFilter;
      const matchesType = typeFilter === 'all' || promotion.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'priority':
          comparison = a.priority - b.priority;
          break;
        case 'period': {
          const getStart = (p: Promotion) => new Date(p.conditions.start_date ?? p.created_at).getTime();
          comparison = getStart(a) - getStart(b);
          break;
        }
        case 'usage_count':
          comparison = a.usage_count - b.usage_count;
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  const renderSortIcon = (field: typeof sortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatPeriod = (promotion: Promotion) => {
    const { start_date, end_date } = promotion.conditions;

    if (!start_date && !end_date) {
      return 'Sin fechas definidas';
    }

    const start = start_date ? formatDate(start_date) : 'Inicio abierto';
    const end = end_date ? formatDate(end_date) : 'Sin fecha fin';

    return `${start} → ${end}`;
  };

  return (
    <div className="promotions-page space-y-6 p-6">
      <div className="mt-6 ui-card p-4 flex flex-col lg:flex-row justify-between items-center gap-4">
        <div className="flex flex-col md:flex-row gap-4 w-full">
          <div className="relative flex-grow md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar una promoción..."
              className="ui-input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="ui-select md:w-48"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PromotionStatus | 'all')}
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activas</option>
            <option value="inactive">Inactivas</option>
            <option value="scheduled">Programadas</option>
            <option value="expired">Expiradas</option>
          </select>
          <select
            className="ui-select md:w-52"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as PromotionType | 'all')}
          >
            <option value="all">Todos los tipos</option>
            <option value="percentage">Porcentaje</option>
            <option value="fixed_amount">Monto fijo</option>
            <option value="promo_code">Código promocional</option>
            <option value="buy_x_get_y">2x1 / Compra X, obtén Y</option>
            <option value="free_product">Producto gratis</option>
            <option value="free_shipping">Envío gratis</option>
            <option value="combo">Combo</option>
            <option value="threshold">Umbral</option>
            <option value="happy_hour">Happy hour</option>
          </select>
        </div>
        <div className="flex gap-2 w-full lg:w-auto">
          <button onClick={loadPromotions} className="flex-1 lg:flex-initial ui-btn-secondary">
            <RefreshCw size={18} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
          <button onClick={handleCreatePromotion} className="flex-1 lg:flex-initial ui-btn-primary">
            <Plus size={20} />
            Nueva promoción
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6">
        <div className="responsive-table promotions-table-wrapper">
          <table className="w-full text-sm sm:text-base promotions-table">
            <thead className="hidden md:table-header-group">
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-gray-500">
                  <button 
                    className="flex items-center gap-1 font-semibold text-gray-700"
                    onClick={() => handleSort('name')}
                  >
                    Nombre {renderSortIcon('name')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-gray-500">Tipo</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-gray-500">Estado</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-gray-500">
                  <button
                    className="flex items-center gap-1 font-semibold text-gray-700"
                    onClick={() => handleSort('priority')}
                  >
                    Prioridad {renderSortIcon('priority')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-gray-500">
                  <button
                    className="flex items-center gap-1 font-semibold text-gray-700"
                    onClick={() => handleSort('period')}
                  >
                    Periodo {renderSortIcon('period')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-gray-500">
                  <button
                    className="flex items-center gap-1 font-semibold text-gray-700"
                    onClick={() => handleSort('usage_count')}
                  >
                    Usos {renderSortIcon('usage_count')}
                  </button>
                </th>
                <th className="px-4 py-3 text-right text-xs uppercase tracking-wide text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
                      <span className="ml-2">Cargando...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredPromotions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No se encontraron promociones
                  </td>
                </tr>
              ) : (
                filteredPromotions.map((promotion, index) => (
                  <tr
                    key={promotion.id}
                    className={`block md:table-row border border-gray-200 md:border-x-0 md:border-t-0 rounded-lg md:rounded-none mb-3 md:mb-0 p-3 md:p-0 transition-colors ${index % 2 === 1 ? 'bg-slate-50/60 md:bg-slate-50/40' : 'bg-white'} hover:bg-gray-50 md:hover:bg-gray-50/80`}
                  >
                    <td className="px-0 md:px-4 py-2 md:py-4 align-top">
                      <div className="md:hidden text-xs uppercase tracking-wide text-gray-500 mb-1">Nombre</div>
                      <div className="font-semibold text-gray-900">{promotion.name}</div>
                      {promotion.type === 'promo_code' && promotion.conditions.promo_code && (
                        <div className="text-sm text-gray-500 mt-1">
                          Code: <span className="font-mono bg-gray-100 px-1 rounded">{promotion.conditions.promo_code}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-0 md:px-4 py-2 md:py-4 align-top">
                      <div className="md:hidden text-xs uppercase tracking-wide text-gray-500 mb-1">Tipo</div>
                      <div className="flex items-center gap-1.5">
                        {typeIcons[promotion.type]}
                        <span>{typeLabels[promotion.type]}</span>
                      </div>
                    </td>
                    <td className="px-0 md:px-4 py-2 md:py-4 align-top">
                      <div className="md:hidden text-xs uppercase tracking-wide text-gray-500 mb-1">Estado</div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[promotion.status]}`}>
                        {statusLabels[promotion.status]}
                      </span>
                    </td>
                    <td className="px-0 md:px-4 py-2 md:py-4 align-top">
                      <div className="md:hidden text-xs uppercase tracking-wide text-gray-500 mb-1">Prioridad</div>
                      <span className="font-medium text-gray-800">{promotion.priority}</span>
                    </td>
                    <td className="px-0 md:px-4 py-2 md:py-4 align-top">
                      <div className="md:hidden text-xs uppercase tracking-wide text-gray-500 mb-1">Periodo</div>
                      <div className="text-sm text-gray-700">
                        <div className="font-medium">{formatPeriod(promotion)}</div>
                        <div className="text-xs text-gray-500">Creada el {formatDate(promotion.created_at)}</div>
                      </div>
                    </td>
                    <td className="px-0 md:px-4 py-2 md:py-4 align-top">
                      <div className="md:hidden text-xs uppercase tracking-wide text-gray-500 mb-1">Usos</div>
                      <span className="font-medium">{promotion.usage_count}</span>
                    </td>
                    <td className="px-0 md:px-4 pt-3 pb-1 md:py-4 text-left md:text-right align-top">
                      <div className="md:hidden text-xs uppercase tracking-wide text-gray-500 mb-2">Acciones</div>
                      <div className="flex justify-start md:justify-end gap-2.5 md:gap-3 lg:gap-4">
                        <button
                          onClick={() => handleToggleStatus(promotion)}
                          className={`h-10 min-w-[76px] px-3.5 rounded-full border text-sm font-semibold tracking-wide transition-colors md:h-11 md:min-w-[92px] md:px-4 lg:h-12 lg:min-w-[104px] lg:px-5 lg:text-base ${promotion.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'}`}
                          title={promotion.status === 'active' ? 'Desactivar' : 'Activar'}
                        >
                          {promotion.status === 'active' ? 'ON' : 'OFF'}
                        </button>
                        <button
                          onClick={() => handleViewPromotion(promotion)}
                          className="p-3 rounded-md hover:bg-gray-100 border border-transparent hover:border-gray-200 md:p-3.5 lg:p-4"
                          title="Ver detalles"
                        >
                          <Eye className="h-5 w-5 md:h-[22px] md:w-[22px] lg:h-6 lg:w-6" />
                        </button>
                        <button
                          onClick={() => handleEditPromotion(promotion)}
                          className="p-3 rounded-md hover:bg-gray-100 border border-transparent hover:border-gray-200 md:p-3.5 lg:p-4"
                          title="Editar"
                        >
                          <Edit className="h-5 w-5 md:h-[22px] md:w-[22px] lg:h-6 lg:w-6" />
                        </button>
                        <button
                          onClick={() => handleDeletePromotion(promotion)}
                          className="p-3 rounded-md hover:bg-red-50 border border-transparent hover:border-red-100 text-red-500 md:p-3.5 lg:p-4"
                          title="Eliminar"
                        >
                          <Trash2 className="h-5 w-5 md:h-[22px] md:w-[22px] lg:h-6 lg:w-6" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {isCreateModalOpen && (
        <PromotionModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSave={() => {
            setIsCreateModalOpen(false);
            loadPromotions();
          }}
        />
      )}

      {isEditModalOpen && selectedPromotion && (
        <PromotionModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={() => {
            setIsEditModalOpen(false);
            loadPromotions();
          }}
          promotion={selectedPromotion}
        />
      )}

      {isDetailsModalOpen && selectedPromotion && (
        <PromotionDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          promotion={selectedPromotion}
        />
      )}

      {isDeleteModalOpen && selectedPromotion && (
        <ConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={confirmDelete}
          title="Eliminar promoción"
          message={`¿Seguro que quieres eliminar la promoción "${selectedPromotion.name}"? Esta acción es irreversible.`}
          confirmLabel="Eliminar"
          cancelLabel="Cancelar"
          confirmButtonClass="bg-red-600 hover:bg-red-700"
        />
      )}
    </div>
  );
};

export default Promotions;
