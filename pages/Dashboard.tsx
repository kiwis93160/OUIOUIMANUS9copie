import React, { useCallback, useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
    DollarSign,
    Users,
    Armchair,
    AlertTriangle,
    Soup,
    Shield,
    TrendingUp,
    Percent,
    ShoppingBag,
    CalendarDays,
    UserCheck,
    Receipt,
} from 'lucide-react';
import { api, getBusinessDayStart } from '../services/api';
import { DashboardStats, SalesDataPoint, DashboardPeriod } from '../types';
import Modal from '../components/Modal';
import RoleManager from '../components/role-manager';
import { formatCurrencyCOP, formatIntegerAmount } from '../utils/formatIntegerAmount';

const decimalFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1, minimumFractionDigits: 0 });
const formatDecimal = (value: number): string => decimalFormatter.format(Number.isFinite(value) ? value : 0);

const computePercentChange = (current: number, previous: number | null | undefined): number | null => {
    if (previous === null || previous === undefined) {
        return null;
    }
    if (previous === 0) {
        if (current === 0) {
            return 0;
        }
        return 100;
    }
    return ((current - previous) / Math.abs(previous)) * 100;
};

const MainStatCard: React.FC<{
    title: string;
    value: string;
    icon: React.ReactNode;
    helper?: string;
    comparison?: number | null;
    previousValue?: string | null;
}> = ({ title, value, icon, helper, comparison, previousValue }) => {
    const numericComparison = typeof comparison === 'number' ? comparison : null;
    const hasComparison = numericComparison !== null;
    const comparisonSign = hasComparison && numericComparison !== 0 ? (numericComparison > 0 ? '+' : '−') : '';
    const comparisonValue = hasComparison ? formatDecimal(Math.abs(numericComparison)) : null;
    const comparisonClass = !hasComparison
        ? 'text-gray-500'
        : numericComparison < 0
            ? 'text-red-600'
            : 'text-emerald-600';
    const showPreviousSection = previousValue !== undefined && previousValue !== null;

    return (
        <div className="ui-card flex min-w-0 flex-col gap-4 p-5">
            <div className="flex items-start gap-3">
                <div className="rounded-xl bg-brand-primary/10 p-3 text-brand-primary">
                    {icon}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
                    <p className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">{value}</p>
                    {showPreviousSection ? (
                    <p className="mt-2 text-sm text-gray-600">
                            Periodo anterior: <span className="font-semibold text-gray-800">{previousValue}</span>
                            {comparisonValue ? (
                                <span className={`ml-2 font-semibold ${comparisonClass}`}>
                                    {comparisonSign}
                                    {comparisonValue}%
                                </span>
                            ) : null}
                        </p>
                    ) : (
                        <p className={`mt-1 text-sm font-semibold ${comparisonClass}`}>
                            {comparisonValue ? `${comparisonSign}${comparisonValue}%` : 'N/D'}
                            <span className="ml-1 text-xs font-medium text-gray-500 sm:text-sm">vs. periodo anterior</span>
                        </p>
                    )}
                </div>
            </div>
            {!showPreviousSection && helper ? <p className="text-sm text-gray-500">{helper}</p> : null}
        </div>
    );
};

const OpStatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    iconWrapperClassName?: string;
    onClick?: () => void;
}> = ({ title, value, icon, iconWrapperClassName, onClick }) => (
    <div className={`ui-card p-4 flex items-center space-x-3 min-w-0 ${onClick ? 'cursor-pointer hover:bg-gray-50' : ''}`} onClick={onClick}>
        <div className={iconWrapperClassName ?? 'p-3 bg-gray-100 text-gray-600 rounded-lg'}>
            {icon}
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500">{title}</p>
            <p className="text-lg sm:text-xl xl:text-2xl font-bold text-gray-800 break-words leading-tight">{value}</p>
        </div>
    </div>
);

type StockAlertVariant = 'neutral' | 'warning' | 'critical';

const StockAlertIndicator: React.FC<{ variant: StockAlertVariant }> = ({ variant }) => {
    const variantClass =
        variant === 'critical'
            ? 'bg-red-500 text-white border-red-600'
            : variant === 'warning'
                ? 'bg-yellow-500 text-white border-yellow-600'
                : 'bg-gray-100 text-gray-400 border-gray-200';

    return (
        <div className={`rounded-full border-2 shadow-inner shadow-black/10 p-2 ${variantClass}`} title="Inventario bajo">
            <AlertTriangle size={28} />
        </div>
    );
};


const PERIOD_CONFIG: Record<DashboardPeriod, { label: string; days: number }> = {
    week: { label: 'Últimos 7 días', days: 7 },
    month: { label: 'Últimos 30 días', days: 30 },
};

const resolvePeriodBounds = (period: DashboardPeriod) => {
    const { days } = PERIOD_CONFIG[period];
    const end = new Date(getBusinessDayStart());
    end.setDate(end.getDate() + 1);
    const start = new Date(end);
    start.setDate(start.getDate() - days);
    return { start, end };
};

const Dashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [salesByProduct, setSalesByProduct] = useState<SalesDataPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [pieChartMode, setPieChartMode] = useState<'category' | 'product'>('category');
    const [isLowStockModalOpen, setLowStockModalOpen] = useState(false);
    const [isRoleManagerOpen, setRoleManagerOpen] = useState(false);
    const [period, setPeriod] = useState<DashboardPeriod>('week');

    const fetchAllStats = useCallback(async () => {
        const { start, end } = resolvePeriodBounds(period);
        const startIso = start.toISOString();
        const endIso = end.toISOString();
        setLoading(true);
        try {
            const [statsData, productSalesData] = await Promise.all([
                api.getDashboardStats(period),
                api.getSalesByProduct({ start: startIso, end: endIso })
            ]);
            setStats(statsData);
            setSalesByProduct(productSalesData);
        } catch (error) {
            console.error("No se pudieron obtener las estadísticas del panel", error);
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => {
        fetchAllStats();
    }, [fetchAllStats]);

    useEffect(() => {
        const unsubscribe = api.notifications.subscribe('orders_updated', () => {
            fetchAllStats();
        });

        return () => {
            unsubscribe();
        };
    }, [fetchAllStats]);

    if (loading) return <div className="text-gray-800">Cargando datos del panel...</div>;
    if (!stats) return <div className="text-red-500">No fue posible cargar los datos.</div>;

    const normalizeStockValue = (value: number | string | null | undefined) => {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : 0;
        }
        return 0;
    };

    const outOfStockIngredients = stats.ingredientsStockBas.filter(ing => normalizeStockValue(ing.stock_actuel) <= 0);
    const lowStockIngredients = stats.ingredientsStockBas.filter(ing => {
        const current = normalizeStockValue(ing.stock_actuel);
        const minimum = normalizeStockValue(ing.stock_minimum);
        return current > 0 && current < minimum;
    });

    const stockAlertVariant: StockAlertVariant = outOfStockIngredients.length > 0
        ? 'critical'
        : lowStockIngredients.length > 0
            ? 'warning'
            : 'neutral';

    const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4560', '#775DD0'];
    const pieData = pieChartMode === 'category' ? stats.ventesParCategorie : salesByProduct;
    const hasPieData = pieData.length > 0;

    const periodConfig = PERIOD_CONFIG[period];
    const previousRevenueTotal = stats.ventesPeriodePrecedente;
    const revenueTrend = computePercentChange(stats.ventesPeriode, stats.ventesPeriodePrecedente);
    const profitMargin = stats.ventesPeriode > 0 ? (stats.beneficePeriode / stats.ventesPeriode) * 100 : null;
    const previousProfitMargin = stats.ventesPeriodePrecedente > 0
        ? (stats.beneficePeriodePrecedente / stats.ventesPeriodePrecedente) * 100
        : null;
    const ordersCount = stats.commandesPeriode;
    const averageDailyRevenue = periodConfig.days > 0 ? stats.ventesPeriode / periodConfig.days : 0;
    const revenuePerClient = stats.clientsPeriode > 0 ? stats.ventesPeriode / stats.clientsPeriode : 0;
    const averageOrdersPerDay = periodConfig.days > 0 ? ordersCount / periodConfig.days : 0;
    const averageClientsPerDay = periodConfig.days > 0 ? stats.clientsPeriode / periodConfig.days : 0;
    const panierMoyenPrecedent = stats.commandesPeriodePrecedente > 0
        ? stats.ventesPeriodePrecedente / stats.commandesPeriodePrecedente
        : 0;
    const revenuePerClientPrecedent = stats.clientsPeriodePrecedente > 0
        ? stats.ventesPeriodePrecedente / stats.clientsPeriodePrecedente
        : 0;
    const averageDailyRevenuePrecedent = periodConfig.days > 0 ? stats.ventesPeriodePrecedente / periodConfig.days : 0;
    const beneficeTrend = computePercentChange(stats.beneficePeriode, stats.beneficePeriodePrecedente);
    const profitMarginTrend = profitMargin !== null ? computePercentChange(profitMargin, previousProfitMargin ?? null) : null;
    const ordersTrend = computePercentChange(ordersCount, stats.commandesPeriodePrecedente);
    const panierTrend = computePercentChange(stats.panierMoyen, panierMoyenPrecedent);
    const revenuePerClientTrend = computePercentChange(revenuePerClient, revenuePerClientPrecedent);
    const clientsTrend = computePercentChange(stats.clientsPeriode, stats.clientsPeriodePrecedente);
    const averageDailyRevenueTrend = computePercentChange(averageDailyRevenue, averageDailyRevenuePrecedent);
    const topExtraIngredients = stats.extraIngredientsUsage.slice(0, 5);
    const topRemovedIngredients = stats.removedIngredients.slice(0, 5);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="inline-flex rounded-lg bg-gray-100 p-1 text-sm font-semibold text-gray-600">
                    {Object.entries(PERIOD_CONFIG).map(([key, option]) => {
                        const value = key as DashboardPeriod;
                        const isActive = period === value;
                        return (
                            <button
                                key={value}
                                onClick={() => setPeriod(value)}
                                className={`px-3 py-1.5 rounded-md transition-colors ${isActive ? 'bg-white text-gray-900 shadow' : 'hover:text-gray-900'}`}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>
                <button
                    onClick={() => setRoleManagerOpen(true)}
                    className="ui-btn-primary"
                >
                    <Shield className="mr-2 h-4 w-4" />
                    Gestión de roles
                </button>
            </div>

            {/* Bloc 1 : Indicateurs financiers */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
                <MainStatCard
                    title={`Ingresos (${stats.periodLabel})`}
                    value={formatCurrencyCOP(stats.ventesPeriode)}
                    icon={<DollarSign size={24} />}
                    comparison={revenueTrend}
                    previousValue={formatCurrencyCOP(previousRevenueTotal)}
                />
                <MainStatCard
                    title="Beneficio neto"
                    value={formatCurrencyCOP(stats.beneficePeriode)}
                    icon={<TrendingUp size={24} />}
                    comparison={beneficeTrend}
                    previousValue={formatCurrencyCOP(stats.beneficePeriodePrecedente)}
                />
                <MainStatCard
                    title="Margen de beneficio"
                    value={profitMargin !== null ? `${formatDecimal(profitMargin)}%` : '0%'}
                    icon={<Percent size={24} />}
                    comparison={previousProfitMargin !== null ? profitMarginTrend : null}
                    previousValue={previousProfitMargin !== null ? `${formatDecimal(previousProfitMargin)}%` : 'No disponible'}
                />
                <MainStatCard
                    title="Pedidos procesados"
                    value={formatIntegerAmount(ordersCount)}
                    icon={<ShoppingBag size={24} />}
                    comparison={ordersTrend}
                    helper={`≈ ${formatDecimal(averageOrdersPerDay)} pedidos / día`}
                />
            </div>

            {/* Bloc 2 : Clients et panier */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
                <MainStatCard
                    title="Ticket promedio"
                    value={formatCurrencyCOP(stats.panierMoyen)}
                    icon={<Receipt size={24} />}
                    comparison={panierTrend}
                    helper={
                        ordersCount > 0
                            ? `Basado en ${formatIntegerAmount(ordersCount)} pedidos`
                            : 'Ningún pedido en el periodo'
                    }
                />
                <MainStatCard
                    title="Ingresos por cliente"
                    value={formatCurrencyCOP(revenuePerClient)}
                    icon={<UserCheck size={24} />}
                    comparison={revenuePerClientTrend}
                    helper={
                        stats.clientsPeriode > 0
                            ? `${formatIntegerAmount(stats.clientsPeriode)} clientes atendidos`
                            : 'Ningún cliente en el periodo'
                    }
                />
                <MainStatCard
                    title={`Clientes (${stats.periodLabel})`}
                    value={formatIntegerAmount(stats.clientsPeriode)}
                    icon={<Users size={24} />}
                    comparison={clientsTrend}
                    helper={`≈ ${formatDecimal(averageClientsPerDay)} clientes / día`}
                />
                <MainStatCard
                    title="Ingresos diarios promedio"
                    value={formatCurrencyCOP(averageDailyRevenue)}
                    icon={<CalendarDays size={24} />}
                    comparison={averageDailyRevenueTrend}
                    helper={`Total del periodo: ${formatCurrencyCOP(stats.ventesPeriode)}`}
                />
            </div>

            {/* Bloc 3 : Statut opérationnel */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <OpStatCard title="Mesas ocupadas" value={stats.tablesOccupees} icon={<Armchair size={24}/>} />
                <OpStatCard title="Clientes actuales" value={stats.clientsActuels} icon={<Users size={24}/>} />
                <OpStatCard title="En cocina" value={stats.commandesEnCuisine} icon={<Soup size={24}/>} />
                <OpStatCard
                    title="Ingredientes bajos"
                    value={stats.ingredientsStockBas.length}
                    icon={<StockAlertIndicator variant={stockAlertVariant} />}
                    iconWrapperClassName="rounded-lg bg-transparent p-0"
                    onClick={() => setLowStockModalOpen(true)}
                />
            </div>

            {/* Bloc 4 : Évolution des ventes */}
            <div className="ui-card p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Ventas durante {stats.periodLabel}</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.ventesPeriodeSeries}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="ventes" fill="#8884d8" name={`${stats.periodLabel}`} />
                        <Bar dataKey="ventesPeriodePrecedente" fill="#d8d6f5" name="Periodo anterior" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Bloc 5 : Répartition des ventes */}
            <div className="ui-card p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Distribución de ventas ({stats.periodLabel})</h3>
                    <div className="flex p-1 bg-gray-200 rounded-lg">
                        <button onClick={() => setPieChartMode('category')} className={`px-3 py-1 text-sm font-semibold rounded-md ${pieChartMode === 'category' ? 'bg-white shadow' : ''}`}>Por categoría</button>
                        <button onClick={() => setPieChartMode('product')} className={`px-3 py-1 text-sm font-semibold rounded-md ${pieChartMode === 'product' ? 'bg-white shadow' : ''}`}>Por producto</button>
                    </div>
                </div>
                {hasPieData ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                                {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(value: number) => formatCurrencyCOP(value)} />
                            <Legend/>
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div style={{ height: 300 }} className="flex items-center justify-center text-gray-500">
                        No hay datos para el periodo seleccionado.
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="ui-card p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Ingredientes agregados como extra</h3>
                    {topExtraIngredients.length > 0 ? (
                        <ul className="space-y-2 text-sm text-gray-700">
                            {topExtraIngredients.map(extra => (
                                <li key={extra.ingredientId} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2">
                                    <div>
                                        <p className="font-semibold text-gray-900">{extra.ingredientName}</p>
                                        <p className="text-xs text-gray-500">{extra.occurrences} selección(es)</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-brand-primary">{extra.totalQuantity.toFixed(2)} {extra.unit ?? ''}</p>
                                        <p className="text-xs text-gray-500">Cantidad total añadida</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-gray-600">Aún no se han agregado ingredientes extra en este periodo.</p>
                    )}
                </div>

                <div className="ui-card p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Ingredientes pedidos sin</h3>
                    {topRemovedIngredients.length > 0 ? (
                        <ul className="space-y-2 text-sm text-gray-700">
                            {topRemovedIngredients.map(ingredient => (
                                <li key={ingredient.ingredientId} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2">
                                    <div>
                                        <p className="font-semibold text-gray-900">{ingredient.ingredientName}</p>
                                        <p className="text-xs text-gray-500">{ingredient.occurrences} pedido(s) sin este ingrediente</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-gray-600">No se registraron ingredientes removidos en el periodo.</p>
                    )}
                </div>
            </div>

            <Modal isOpen={isLowStockModalOpen} onClose={() => setLowStockModalOpen(false)} title="Ingredientes con inventario bajo">
                {stats.ingredientsStockBas.length > 0 ? (
                    <div className="space-y-4">
                        {outOfStockIngredients.length > 0 && (
                            <div>
                                <p className="text-sm font-semibold text-red-700 mb-2">Agotados</p>
                                <ul className="space-y-2">
                                    {outOfStockIngredients.map(ing => (
                                        <li key={ing.id} className="flex justify-between items-center bg-red-50 p-3 rounded-lg">
                                            <span className="font-semibold text-red-800">{ing.nom}</span>
                                            <span className="font-bold text-red-600">{ing.stock_actuel} / {ing.stock_minimum} {ing.unite}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {lowStockIngredients.length > 0 && (
                            <div>
                                <p className="text-sm font-semibold text-yellow-700 mb-2">Debajo del mínimo</p>
                                <ul className="space-y-2">
                                    {lowStockIngredients.map(ing => (
                                        <li key={ing.id} className="flex justify-between items-center bg-yellow-50 p-3 rounded-lg">
                                            <span className="font-semibold text-yellow-800">{ing.nom}</span>
                                            <span className="font-bold text-yellow-700">{ing.stock_actuel} / {ing.stock_minimum} {ing.unite}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-gray-600 text-center">No hay ingredientes con inventario bajo por el momento.</p>
                )}
            </Modal>

            <RoleManager isOpen={isRoleManagerOpen} onClose={() => setRoleManagerOpen(false)} />
        </div>
    );
};

export default Dashboard;
