import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { Category, Order, Product, Sale } from '../types';
import {
    Download,
    FilterX,
    ChevronDown,
    ChevronRight,
    User,
    ShoppingBag,
    TrendingUp,
    PiggyBank,
    Package,
    Layers,
    BarChart3,
} from 'lucide-react';
import { formatCurrencyCOP } from '../utils/formatIntegerAmount';

const decimalFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });
const integerFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

const formatDecimal = (value: number): string => decimalFormatter.format(Number.isFinite(value) ? value : 0);
const formatInteger = (value: number): string => integerFormatter.format(Number.isFinite(value) ? Math.round(value) : 0);

type Filters = {
    startDate: string;
    endDate: string;
    paymentMethod: 'all' | 'efectivo' | 'transferencia' | 'tarjeta';
    orderType: 'all' | Order['type'];
    categoryId: string;
    productId: string;
};

type OrderAggregate = {
    revenue: number;
    profit: number;
    quantity: number;
    paymentMethod?: Order['payment_method'];
    items: {
        productId: string;
        productName: string;
        categoryName: string;
        quantity: number;
        revenue: number;
        profit: number;
    }[];
};

const paymentMethodLabels: Record<Filters['paymentMethod'] | Order['payment_method'] | 'unknown', string> = {
    all: 'Toutes',
    efectivo: 'Efectivo',
    transferencia: 'Transferencia',
    tarjeta: 'Tarjeta',
    unknown: 'Non spécifié',
};

const orderTypeLabels: Record<Order['type'], string> = {
    sur_place: 'En el local',
    a_emporter: 'Para llevar',
    pedir_en_linea: 'Pedido en línea',
};

const ResumeVentes: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
    const [filters, setFilters] = useState<Filters>({
        startDate: '',
        endDate: '',
        paymentMethod: 'all',
        orderType: 'all',
        categoryId: '',
        productId: '',
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [ordersData, salesData, productsData, categoriesData] = await Promise.all([
                api.getFinalizedOrders(),
                api.getSalesHistory(),
                api.getProducts(),
                api.getCategories(),
            ]);

            setOrders([...ordersData].sort((a, b) => b.date_creation - a.date_creation));
            setSales(salesData);
            setProducts(productsData);
            setCategories(categoriesData);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch sales summary', err);
            setError('Impossible de charger les données de ventes. Veuillez réessayer.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const unsubscribe = api.notifications.subscribe('orders_updated', () => {
            fetchData();
        });

        return () => {
            unsubscribe();
        };
    }, [fetchData]);

    const orderMap = useMemo(() => new Map(orders.map(order => [order.id, order])), [orders]);

    const startTimestamp = useMemo(() => {
        if (!filters.startDate) {
            return null;
        }
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        return start.getTime();
    }, [filters.startDate]);

    const endTimestamp = useMemo(() => {
        if (!filters.endDate) {
            return null;
        }
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        return end.getTime();
    }, [filters.endDate]);

    const filteredSales = useMemo(() => {
        return sales.filter((sale) => {
            if (startTimestamp !== null && sale.saleDate < startTimestamp) {
                return false;
            }

            if (endTimestamp !== null && sale.saleDate > endTimestamp) {
                return false;
            }

            if (filters.paymentMethod !== 'all' && sale.paymentMethod !== filters.paymentMethod) {
                return false;
            }

            if (filters.categoryId && sale.categoryId !== filters.categoryId) {
                return false;
            }

            if (filters.productId && sale.productId !== filters.productId) {
                return false;
            }

            const order = orderMap.get(sale.orderId);
            if (!order) {
                return false;
            }

            if (filters.orderType !== 'all' && order.type !== filters.orderType) {
                return false;
            }

            if (filters.paymentMethod !== 'all' && order.payment_method && order.payment_method !== filters.paymentMethod) {
                return false;
            }

            return true;
        });
    }, [sales, startTimestamp, endTimestamp, filters.paymentMethod, filters.categoryId, filters.productId, filters.orderType, orderMap]);

    const orderAggregates = useMemo(() => {
        const aggregates = new Map<string, OrderAggregate>();

        filteredSales.forEach((sale) => {
            const existing = aggregates.get(sale.orderId);
            const revenueIncrement = sale.totalPrice ?? 0;
            const profitIncrement = sale.profit ?? 0;
            const quantityIncrement = sale.quantity ?? 0;

            if (!existing) {
                aggregates.set(sale.orderId, {
                    revenue: revenueIncrement,
                    profit: profitIncrement,
                    quantity: quantityIncrement,
                    paymentMethod: sale.paymentMethod,
                    items: [{
                        productId: sale.productId,
                        productName: sale.productName,
                        categoryName: sale.categoryName,
                        quantity: sale.quantity,
                        revenue: revenueIncrement,
                        profit: profitIncrement,
                    }],
                });
                return;
            }

            existing.revenue += revenueIncrement;
            existing.profit += profitIncrement;
            existing.quantity += quantityIncrement;
            if (!existing.paymentMethod && sale.paymentMethod) {
                existing.paymentMethod = sale.paymentMethod;
            }

            const itemIndex = existing.items.findIndex(item => item.productId === sale.productId);
            if (itemIndex > -1) {
                existing.items[itemIndex] = {
                    ...existing.items[itemIndex],
                    quantity: existing.items[itemIndex].quantity + sale.quantity,
                    revenue: existing.items[itemIndex].revenue + revenueIncrement,
                    profit: existing.items[itemIndex].profit + profitIncrement,
                };
            } else {
                existing.items.push({
                    productId: sale.productId,
                    productName: sale.productName,
                    categoryName: sale.categoryName,
                    quantity: sale.quantity,
                    revenue: revenueIncrement,
                    profit: profitIncrement,
                });
            }
        });

        aggregates.forEach((aggregate) => {
            aggregate.items.sort((a, b) => b.revenue - a.revenue);
        });

        return aggregates;
    }, [filteredSales]);

    const filteredOrders = useMemo(() => {
        return orders
            .filter(order => orderAggregates.has(order.id))
            .sort((a, b) => b.date_creation - a.date_creation);
    }, [orders, orderAggregates]);

    const totals = useMemo(() => {
        const totalRevenue = filteredSales.reduce((sum, sale) => sum + (sale.totalPrice ?? 0), 0);
        const totalCost = filteredSales.reduce((sum, sale) => sum + (sale.totalCost ?? 0), 0);
        const totalProfit = filteredSales.reduce((sum, sale) => sum + (sale.profit ?? 0), 0);
        const totalQuantity = filteredSales.reduce((sum, sale) => sum + (sale.quantity ?? 0), 0);
        const orderCount = filteredOrders.length;

        return {
            totalRevenue,
            totalCost,
            totalProfit,
            totalQuantity,
            orderCount,
            averageOrderValue: orderCount > 0 ? totalRevenue / orderCount : 0,
            averageItemsPerOrder: orderCount > 0 ? totalQuantity / orderCount : 0,
            profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
        };
    }, [filteredSales, filteredOrders]);

    const salesByProduct = useMemo(() => {
        const productMap = new Map<string, {
            productId: string;
            productName: string;
            categoryName: string;
            quantity: number;
            revenue: number;
            profit: number;
        }>();

        filteredSales.forEach((sale) => {
            const key = sale.productId;
            const existing = productMap.get(key);
            if (!existing) {
                productMap.set(key, {
                    productId: sale.productId,
                    productName: sale.productName,
                    categoryName: sale.categoryName,
                    quantity: sale.quantity,
                    revenue: sale.totalPrice ?? 0,
                    profit: sale.profit ?? 0,
                });
                return;
            }

            existing.quantity += sale.quantity;
            existing.revenue += sale.totalPrice ?? 0;
            existing.profit += sale.profit ?? 0;
        });

        return Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue);
    }, [filteredSales]);

    const salesByCategory = useMemo(() => {
        const categoryMap = new Map<string, {
            categoryName: string;
            quantity: number;
            revenue: number;
            profit: number;
        }>();

        filteredSales.forEach((sale) => {
            const key = sale.categoryId || 'unknown';
            const existing = categoryMap.get(key);
            if (!existing) {
                categoryMap.set(key, {
                    categoryName: sale.categoryName || 'Sin categoría',
                    quantity: sale.quantity,
                    revenue: sale.totalPrice ?? 0,
                    profit: sale.profit ?? 0,
                });
                return;
            }

            existing.quantity += sale.quantity;
            existing.revenue += sale.totalPrice ?? 0;
            existing.profit += sale.profit ?? 0;
        });

        return Array.from(categoryMap.values()).sort((a, b) => b.revenue - a.revenue);
    }, [filteredSales]);

    const paymentBreakdown = useMemo(() => {
        const map = new Map<string, { revenue: number; profit: number; orders: Set<string> }>();

        filteredSales.forEach((sale) => {
            const key = sale.paymentMethod ?? 'unknown';
            const existing = map.get(key);
            if (!existing) {
                map.set(key, {
                    revenue: sale.totalPrice ?? 0,
                    profit: sale.profit ?? 0,
                    orders: new Set([sale.orderId]),
                });
                return;
            }

            existing.revenue += sale.totalPrice ?? 0;
            existing.profit += sale.profit ?? 0;
            existing.orders.add(sale.orderId);
        });

        return Array.from(map.entries()).map(([method, data]) => ({
            method,
            label: paymentMethodLabels[method as keyof typeof paymentMethodLabels] ?? paymentMethodLabels.unknown,
            revenue: data.revenue,
            profit: data.profit,
            orders: data.orders.size,
        })).sort((a, b) => b.revenue - a.revenue);
    }, [filteredSales]);

    const categoryOptions = useMemo(() => {
        return [...categories].sort((a, b) => a.nom.localeCompare(b.nom, 'es'));
    }, [categories]);

    const productOptions = useMemo(() => {
        const { categoryId } = filters;
        const filtered = categoryId
            ? products.filter(product => product.categoria_id === categoryId)
            : products;

        return [...filtered].sort((a, b) => a.nom_produit.localeCompare(b.nom_produit, 'es'));
    }, [products, filters.categoryId]);

    const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = event.target;

        setFilters((prev) => {
            if (name === 'categoryId') {
                const nextFilters = { ...prev, categoryId: value, productId: prev.productId };
                if (value && prev.productId) {
                    const selectedProduct = products.find(product => product.id === prev.productId);
                    if (!selectedProduct || selectedProduct.categoria_id !== value) {
                        nextFilters.productId = '';
                    }
                }
                return nextFilters;
            }

            if (name === 'productId') {
                if (!value) {
                    return { ...prev, productId: '' };
                }

                const product = products.find(p => p.id === value);
                return {
                    ...prev,
                    productId: value,
                    categoryId: product ? product.categoria_id : prev.categoryId,
                };
            }

            if (name === 'paymentMethod' && (value === 'all' || value === 'efectivo' || value === 'transferencia' || value === 'tarjeta')) {
                return { ...prev, paymentMethod: value };
            }

            if (name === 'orderType' && (value === 'all' || value === 'sur_place' || value === 'a_emporter' || value === 'pedir_en_linea')) {
                return { ...prev, orderType: value as Filters['orderType'] };
            }

            return { ...prev, [name]: value };
        });
        setExpandedOrderId(null);
    };

    const resetFilters = () => {
        setFilters({
            startDate: '',
            endDate: '',
            paymentMethod: 'all',
            orderType: 'all',
            categoryId: '',
            productId: '',
        });
        setExpandedOrderId(null);
    };

    const exportToCSV = () => {
        if (filteredSales.length === 0) {
            return;
        }

        const headers = [
            'Fecha',
            'Pedido',
            'Tipo',
            'Mesa/Cliente',
            'Producto',
            'Categoría',
            'Cantidad',
            'Precio unitario',
            'Ingresos',
            'Costo',
            'Beneficio',
            'Método de pago',
        ];

        const rows = filteredSales.map((sale) => {
            const order = orderMap.get(sale.orderId);
            const orderTypeLabel = order ? orderTypeLabels[order.type] : 'N/A';
            const customerLabel = order
                ? order.type === 'sur_place'
                    ? (order.table_nom || 'N/A')
                    : (order.client_name || order.client_address || 'N/A')
                : 'N/A';

            return [
                new Date(sale.saleDate).toLocaleString('es-CO'),
                sale.orderId,
                orderTypeLabel,
                `"${customerLabel}"`,
                `"${sale.productName}"`,
                sale.categoryName || 'N/A',
                sale.quantity,
                formatCurrencyCOP(sale.unitPrice ?? 0),
                formatCurrencyCOP(sale.totalPrice ?? 0),
                formatCurrencyCOP(sale.totalCost ?? 0),
                formatCurrencyCOP(sale.profit ?? 0),
                paymentMethodLabels[sale.paymentMethod ?? 'unknown'] ?? paymentMethodLabels.unknown,
            ].join(',');
        });

        const csvString = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `resume_ventes_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return <div className="text-gray-800">Chargement du résumé des ventes...</div>;
    }

    return (
        <div className="space-y-6">
            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            <section className="rounded-xl bg-white p-4 shadow-md">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <h2 className="text-lg font-semibold text-gray-800">Filtres d'analyse</h2>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                        >
                            <FilterX size={16} />
                            Réinitialiser
                        </button>
                        <button
                            type="button"
                            onClick={exportToCSV}
                            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
                        >
                            <Download size={16} />
                            Export CSV
                        </button>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700">Date de début</label>
                        <input
                            type="date"
                            name="startDate"
                            value={filters.startDate}
                            onChange={handleFilterChange}
                            className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-brand-primary focus:outline-none focus:ring-brand-primary"
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700">Date de fin</label>
                        <input
                            type="date"
                            name="endDate"
                            value={filters.endDate}
                            onChange={handleFilterChange}
                            className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-brand-primary focus:outline-none focus:ring-brand-primary"
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700">Type de commande</label>
                        <select
                            name="orderType"
                            value={filters.orderType}
                            onChange={handleFilterChange}
                            className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-brand-primary focus:outline-none focus:ring-brand-primary"
                        >
                            <option value="all">Tous les types</option>
                            <option value="sur_place">En el local</option>
                            <option value="a_emporter">Para llevar</option>
                            <option value="pedir_en_linea">Pedido en línea</option>
                        </select>
                    </div>
                    <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700">Méthode de paiement</label>
                        <select
                            name="paymentMethod"
                            value={filters.paymentMethod}
                            onChange={handleFilterChange}
                            className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-brand-primary focus:outline-none focus:ring-brand-primary"
                        >
                            <option value="all">Toutes</option>
                            <option value="efectivo">Efectivo</option>
                            <option value="transferencia">Transferencia</option>
                            <option value="tarjeta">Tarjeta</option>
                        </select>
                    </div>
                    <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700">Catégorie</label>
                        <select
                            name="categoryId"
                            value={filters.categoryId}
                            onChange={handleFilterChange}
                            className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-brand-primary focus:outline-none focus:ring-brand-primary"
                        >
                            <option value="">Toutes</option>
                            {categoryOptions.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.nom}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700">Produit</label>
                        <select
                            name="productId"
                            value={filters.productId}
                            onChange={handleFilterChange}
                            className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-brand-primary focus:outline-none focus:ring-brand-primary"
                        >
                            <option value="">Tous les produits</option>
                            {productOptions.map((product) => (
                                <option key={product.id} value={product.id}>
                                    {product.nom_produit}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </section>

            <section>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Chiffre d'affaires</p>
                                <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrencyCOP(totals.totalRevenue)}</p>
                            </div>
                            <div className="rounded-full bg-brand-primary/10 p-3 text-brand-primary">
                                <TrendingUp size={20} />
                            </div>
                        </div>
                        <p className="mt-3 text-xs text-gray-500">Basé sur les articles correspondant aux filtres appliqués.</p>
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Bénéfice</p>
                                <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrencyCOP(totals.totalProfit)}</p>
                            </div>
                            <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-600">
                                <PiggyBank size={20} />
                            </div>
                        </div>
                        <p className="mt-3 text-xs text-gray-500">Marge moyenne : {formatDecimal(totals.profitMargin)}%</p>
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Commandes</p>
                                <p className="mt-1 text-2xl font-bold text-gray-900">{formatInteger(totals.orderCount)}</p>
                            </div>
                            <div className="rounded-full bg-indigo-500/10 p-3 text-indigo-600">
                                <Package size={20} />
                            </div>
                        </div>
                        <p className="mt-3 text-xs text-gray-500">Panier moyen : {formatCurrencyCOP(totals.averageOrderValue)}</p>
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Articles vendus</p>
                                <p className="mt-1 text-2xl font-bold text-gray-900">{formatInteger(totals.totalQuantity)}</p>
                            </div>
                            <div className="rounded-full bg-amber-500/10 p-3 text-amber-600">
                                <Layers size={20} />
                            </div>
                        </div>
                        <p className="mt-3 text-xs text-gray-500">Moyenne par commande : {formatDecimal(totals.averageItemsPerOrder)}</p>
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-xl bg-white p-4 shadow-md">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-800">Répartition par méthode de paiement</h3>
                        <BarChart3 size={18} className="text-brand-primary" />
                    </div>
                    <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b text-xs uppercase text-gray-500">
                                <tr>
                                    <th className="p-2">Méthode</th>
                                    <th className="p-2 text-right">Ventes</th>
                                    <th className="p-2 text-right">Bénéfice</th>
                                    <th className="p-2 text-right">Commandes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paymentBreakdown.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-4 text-center text-sm text-gray-500">Aucune donnée pour les filtres sélectionnés.</td>
                                    </tr>
                                ) : (
                                    paymentBreakdown.map((row) => (
                                        <tr key={row.method} className="border-b last:border-b-0">
                                            <td className="p-2 text-sm font-medium text-gray-800">{row.label}</td>
                                            <td className="p-2 text-right text-sm text-gray-700">{formatCurrencyCOP(row.revenue)}</td>
                                            <td className="p-2 text-right text-sm text-gray-700">{formatCurrencyCOP(row.profit)}</td>
                                            <td className="p-2 text-right text-sm text-gray-700">{formatInteger(row.orders)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="rounded-xl bg-white p-4 shadow-md">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-800">Répartition par catégorie</h3>
                        <Layers size={18} className="text-brand-primary" />
                    </div>
                    <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b text-xs uppercase text-gray-500">
                                <tr>
                                    <th className="p-2">Catégorie</th>
                                    <th className="p-2 text-right">Quantité</th>
                                    <th className="p-2 text-right">Ventes</th>
                                    <th className="p-2 text-right">Bénéfice</th>
                                </tr>
                            </thead>
                            <tbody>
                                {salesByCategory.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-4 text-center text-sm text-gray-500">Aucune donnée pour les filtres sélectionnés.</td>
                                    </tr>
                                ) : (
                                    salesByCategory.map((row) => (
                                        <tr key={row.categoryName} className="border-b last:border-b-0">
                                            <td className="p-2 text-sm font-medium text-gray-800">{row.categoryName}</td>
                                            <td className="p-2 text-right text-sm text-gray-700">{formatInteger(row.quantity)}</td>
                                            <td className="p-2 text-right text-sm text-gray-700">{formatCurrencyCOP(row.revenue)}</td>
                                            <td className="p-2 text-right text-sm text-gray-700">{formatCurrencyCOP(row.profit)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <section className="rounded-xl bg-white p-4 shadow-md">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800">Produits les plus performants</h3>
                    <Package size={18} className="text-brand-primary" />
                </div>
                <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b text-xs uppercase text-gray-500">
                            <tr>
                                <th className="p-2">Produit</th>
                                <th className="p-2">Catégorie</th>
                                <th className="p-2 text-right">Quantité</th>
                                <th className="p-2 text-right">Ventes</th>
                                <th className="p-2 text-right">Bénéfice</th>
                            </tr>
                        </thead>
                        <tbody>
                            {salesByProduct.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-4 text-center text-sm text-gray-500">Aucun produit trouvé pour les filtres sélectionnés.</td>
                                </tr>
                            ) : (
                                salesByProduct.map((product) => (
                                    <tr key={product.productId} className="border-b last:border-b-0">
                                        <td className="p-2 text-sm font-medium text-gray-800">{product.productName}</td>
                                        <td className="p-2 text-sm text-gray-700">{product.categoryName || 'Sin categoría'}</td>
                                        <td className="p-2 text-right text-sm text-gray-700">{formatInteger(product.quantity)}</td>
                                        <td className="p-2 text-right text-sm text-gray-700">{formatCurrencyCOP(product.revenue)}</td>
                                        <td className="p-2 text-right text-sm text-gray-700">{formatCurrencyCOP(product.profit)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="rounded-xl bg-white p-4 shadow-md">
                <h3 className="text-lg font-semibold text-gray-800">Détails des commandes</h3>
                <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b text-xs uppercase text-gray-500">
                            <tr>
                                <th className="w-12 p-3"></th>
                                <th className="p-3">Date</th>
                                <th className="p-3">Type</th>
                                <th className="p-3">Table/Client</th>
                                <th className="p-3 text-right">Articles</th>
                                <th className="p-3 text-right">Ventes</th>
                                <th className="p-3 text-right">Bénéfice</th>
                                <th className="p-3">Paiement</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-6 text-center text-sm text-gray-500">Aucune commande ne correspond aux filtres sélectionnés.</td>
                                </tr>
                            ) : (
                                filteredOrders.map((order) => {
                                    const aggregate = orderAggregates.get(order.id);
                                    if (!aggregate) {
                                        return null;
                                    }

                                    const isExpanded = expandedOrderId === order.id;
                                    const typeBadge = order.type === 'sur_place'
                                        ? (
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                                                <User size={12} />
                                                En el local
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800">
                                                <ShoppingBag size={12} />
                                                {orderTypeLabels[order.type]}
                                            </span>
                                        );

                                    const customerLabel = order.type === 'sur_place'
                                        ? (order.table_nom || 'N/A')
                                        : (order.client_name || order.client_address || 'N/A');

                                    const paymentLabel = paymentMethodLabels[(aggregate.paymentMethod ?? order.payment_method ?? 'unknown') as keyof typeof paymentMethodLabels] ?? paymentMethodLabels.unknown;

                                    return (
                                        <React.Fragment key={order.id}>
                                            <tr
                                                onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                                                className="cursor-pointer border-b transition hover:bg-gray-50"
                                            >
                                                <td className="p-3 align-top">
                                                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                </td>
                                                <td className="p-3 text-sm text-gray-700">{new Date(order.date_creation).toLocaleString('es-CO')}</td>
                                                <td className="p-3">{typeBadge}</td>
                                                <td className="p-3 text-sm font-semibold text-gray-900">{customerLabel}</td>
                                                <td className="p-3 text-right text-sm text-gray-700">{formatInteger(aggregate.quantity)}</td>
                                                <td className="p-3 text-right text-sm font-semibold text-gray-900">{formatCurrencyCOP(aggregate.revenue)}</td>
                                                <td className="p-3 text-right text-sm font-semibold text-emerald-600">{formatCurrencyCOP(aggregate.profit)}</td>
                                                <td className="p-3 text-sm text-gray-700">{paymentLabel}</td>
                                            </tr>
                                            {isExpanded && (
                                                <tr className="bg-gray-50">
                                                    <td colSpan={8} className="p-4">
                                                        <div className="rounded-lg border border-gray-200 bg-white p-4">
                                                            <h4 className="text-sm font-semibold text-gray-800">Articles inclus ({aggregate.items.length})</h4>
                                                            <div className="mt-3 overflow-x-auto">
                                                                <table className="w-full text-left">
                                                                    <thead className="border-b text-xs uppercase text-gray-500">
                                                                        <tr>
                                                                            <th className="p-2">Produit</th>
                                                                            <th className="p-2">Catégorie</th>
                                                                            <th className="p-2 text-right">Quantité</th>
                                                                            <th className="p-2 text-right">Ventes</th>
                                                                            <th className="p-2 text-right">Bénéfice</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {aggregate.items.map((item) => (
                                                                            <tr key={item.productId} className="border-b last:border-b-0">
                                                                                <td className="p-2 text-sm font-medium text-gray-800">{item.productName}</td>
                                                                                <td className="p-2 text-sm text-gray-700">{item.categoryName || 'Sin categoría'}</td>
                                                                                <td className="p-2 text-right text-sm text-gray-700">{formatInteger(item.quantity)}</td>
                                                                                <td className="p-2 text-right text-sm text-gray-700">{formatCurrencyCOP(item.revenue)}</td>
                                                                                <td className="p-2 text-right text-sm text-gray-700">{formatCurrencyCOP(item.profit)}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default ResumeVentes;
