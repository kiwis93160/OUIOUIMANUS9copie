

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { uploadProductImage, resolveProductImageUrl } from '../services/cloudinary';
import { Product, Category, Ingredient, RecipeItem, ProductExtra, ProductExtraOption } from '../types';
import Modal from '../components/Modal';
import { PlusCircle, Edit, Trash2, Search, Settings, GripVertical, CheckCircle, Clock, XCircle, Upload, HelpCircle } from 'lucide-react';
import { formatCurrencyCOP, formatIntegerAmount } from '../utils/formatIntegerAmount';
import { convertPriceToUsageUnit, getUsageUnitLabel } from '../utils/ingredientUnits';

const BEST_SELLER_RANKS = [1, 2, 3, 4];

const getStatusInfo = (status: Product['estado']) => {
    switch (status) {
        case 'disponible':
            return { text: 'Disponible', color: 'bg-green-100 text-green-800', Icon: CheckCircle };
        case 'agotado_temporal':
            return { text: 'Agotado (temp.)', color: 'bg-yellow-100 text-yellow-800', Icon: Clock };
        case 'agotado_indefinido':
            return { text: 'No disponible', color: 'bg-red-100 text-red-800', Icon: XCircle };
        default:
            return { text: 'Desconocido', color: 'bg-gray-100 text-gray-800', Icon: HelpCircle };
    }
};

// --- Main Page Component ---
const Produits: React.FC = () => {
    const { role } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');

    const [isProductModalOpen, setProductModalOpen] = useState(false);
    const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);

    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');

    const canEdit = role?.permissions['/produits'] === 'editor';

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [productsData, categoriesData, ingredientsData] = await Promise.all([
                api.getProducts(),
                api.getCategories(),
                api.getIngredients()
            ]);
            setProducts(productsData);
            setCategories(categoriesData);
            setIngredients(ingredientsData);
            setError(null);
        } catch (err) {
            setError("No se pudieron cargar los datos de los productos.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredProducts = useMemo(() =>
        products.filter(p =>
            (p.nom_produit.toLowerCase().includes(searchTerm.toLowerCase())) &&
            (categoryFilter === 'all' || p.categoria_id === categoryFilter)
        ), [products, searchTerm, categoryFilter]);

    const occupiedBestSellerPositions = useMemo(() => {
        const map = new Map<number, Product>();
        products.forEach(prod => {
            if (prod.is_best_seller && prod.best_seller_rank != null) {
                map.set(prod.best_seller_rank, prod);
            }
        });
        return map;
    }, [products]);

    const handleOpenModal = (type: 'product' | 'category' | 'delete', mode: 'add' | 'edit' = 'add', product: Product | null = null) => {
        if (type === 'product') {
            setModalMode(mode);
            setSelectedProduct(product);
            setProductModalOpen(true);
        } else if (type === 'category') {
            setCategoryModalOpen(true);
        } else if (type === 'delete' && product) {
            setSelectedProduct(product);
            setDeleteModalOpen(true);
        }
    };
    
    const handleStatusChange = async (product: Product, newStatus: Product['estado']) => {
        try {
            await api.updateProduct(product.id, { estado: newStatus });
            fetchData();
        } catch (error) {
            console.error("Failed to update status", error);
            const message = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
            alert(`No se pudo actualizar el estado del producto: ${message}`);
        }
    }

    if (loading) return <p className="text-gray-800">Cargando productos...</p>;
    if (error) return <p className="text-red-500">{error}</p>;

    return (
        <div className="space-y-6">
            <div className="mt-6 ui-card p-4 flex flex-col lg:flex-row justify-between items-center gap-4">
                <div className="flex flex-col md:flex-row gap-4 w-full">
                    <div className="relative flex-grow md:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar un producto..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="ui-input pl-10"
                        />
                    </div>
                    <select
                        value={categoryFilter}
                        onChange={e => setCategoryFilter(e.target.value)}
                        className="ui-select md:w-56"
                    >
                        <option value="all">Todas las categorías</option>
                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.nom}</option>)}
                    </select>
                </div>
                {canEdit && (
                    <div className="flex gap-2 w-full lg:w-auto">
                        <button onClick={() => setCategoryModalOpen(true)} className="flex-1 lg:flex-initial ui-btn-secondary">
                            <Settings size={20} />
                        </button>
                        <button onClick={() => handleOpenModal('product', 'add')} className="flex-1 lg:flex-initial ui-btn-primary">
                            <PlusCircle size={20} />
                            Agregar producto
                        </button>
                    </div>
                )}
            </div>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map(p => (
                    <ProductCard 
                        key={p.id} 
                        product={p} 
                        category={categories.find(c => c.id === p.categoria_id)}
                        onEdit={() => handleOpenModal('product', 'edit', p)}
                        onDelete={() => handleOpenModal('delete', 'edit', p)}
                        onStatusChange={handleStatusChange}
                        canEdit={canEdit}
                    />
                ))}
            </div>

            {isProductModalOpen && canEdit && (
                <AddEditProductModal
                    isOpen={isProductModalOpen}
                    onClose={() => setProductModalOpen(false)}
                    onSuccess={fetchData}
                    product={selectedProduct}
                    mode={modalMode}
                    categories={categories}
                    ingredients={ingredients}
                    occupiedPositions={occupiedBestSellerPositions}
                />
            )}
            {isCategoryModalOpen && canEdit && (
                <ManageCategoriesModal
                    isOpen={isCategoryModalOpen}
                    onClose={() => setCategoryModalOpen(false)}
                    onSuccess={fetchData}
                    categories={categories}
                />
            )}
             {isDeleteModalOpen && canEdit && selectedProduct && (
                <DeleteProductModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setDeleteModalOpen(false)}
                    onSuccess={fetchData}
                    product={selectedProduct}
                />
            )}
        </div>
    );
};


// --- Child Components ---

const ProductCard: React.FC<{ product: Product; category?: Category; onEdit: () => void; onDelete: () => void; onStatusChange: (product: Product, newStatus: Product['estado']) => void; canEdit: boolean; }> = ({ product, category, onEdit, onDelete, onStatusChange, canEdit }) => {
    const { text, color, Icon } = getStatusInfo(product.estado);
    const [statusMenuOpen, setStatusMenuOpen] = useState(false);
    const statusMenuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!statusMenuOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
                setStatusMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [statusMenuOpen]);
    
    const margin = product.prix_vente - (product.cout_revient || 0);
    const marginPercentage = product.prix_vente > 0 ? (margin / product.prix_vente) * 100 : 0;

    return (
        <div className="ui-card flex flex-col">
            <div className="relative overflow-hidden rounded-t-xl">
                <img src={product.image} alt={product.nom_produit} className="w-full h-40 object-cover" />
                {product.is_best_seller && (
                    <span className="absolute top-2 left-2 rounded-full bg-brand-primary/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-md">
                        Best seller{product.best_seller_rank ? ` #${product.best_seller_rank}` : ''}
                    </span>
                )}
            </div>
            <div className="p-4 flex flex-col flex-grow">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-xs text-black">{category?.nom || 'Sin categoría'}</p>
                        <h3 className="font-bold text-[clamp(1.05rem,2.2vw,1.35rem)] leading-snug text-black break-words text-balance whitespace-normal [hyphens:auto]">
                            {product.nom_produit}
                        </h3>
                    </div>
                <p className="text-xl font-extrabold text-black">{formatCurrencyCOP(product.prix_vente)}</p>
                </div>
                 <p className="text-xs text-black mt-1 flex-grow">{product.description}</p>
                
                <div className="flex justify-between items-center mt-4">
                    <div className="relative" ref={statusMenuRef}>
                        <button
                            type="button"
                            onClick={() => canEdit && setStatusMenuOpen(prev => !prev)}
                            className={`px-2 py-1 text-xs font-bold rounded-full flex items-center gap-1 transition-colors ${canEdit ? 'hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary cursor-pointer' : ''} ${color}`}
                            disabled={!canEdit}
                        >
                            <Icon size={14} /> {text}
                        </button>
                        {canEdit && statusMenuOpen && (
                            <div className="absolute left-0 bottom-full mb-2 w-44 bg-white rounded-md shadow-lg z-10 border">
                                <p className="px-4 pt-2 pb-1 text-xs text-gray-500">Cambiar estado:</p>
                                {['disponible', 'agotado_temporal', 'agotado_indefinido'].map(status => (
                                    <button
                                        key={status}
                                        type="button"
                                        onClick={() => {
                                            onStatusChange(product, status as Product['estado']);
                                            setStatusMenuOpen(false);
                                        }}
                                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        {getStatusInfo(status as Product['estado']).text}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {canEdit && (
                        <div className="flex items-center gap-2 text-gray-500">
                            <button
                                type="button"
                                onClick={onEdit}
                                className="p-2 rounded-full hover:bg-gray-100 hover:text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
                                aria-label="Editar el producto"
                            >
                                <Edit size={18} />
                            </button>
                            <button
                                type="button"
                                onClick={onDelete}
                                className="p-2 rounded-full hover:bg-gray-100 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/40"
                                aria-label="Eliminar el producto"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


type ProductExtraOptionFormState = {
    name: string;
    price: string;
    mode: 'custom' | 'ingredient';
    ingredientId?: string;
    ingredientUsage?: string;
};

type ProductExtraFormState = {
    name: string;
    options: ProductExtraOptionFormState[];
};

type ProductFormState = {
    nom_produit: string;
    prix_vente: number;
    categoria_id: string;
    estado: Product['estado'];
    image: string;
    description: string;
    recipe: RecipeItem[];
    is_best_seller: boolean;
    best_seller_rank: number | null;
    extras: ProductExtraFormState[];
    allow_ingredient_removal_extra: boolean;
};

const convertExtrasToFormState = (extras?: ProductExtra[] | null): ProductExtraFormState[] => {
    if (!extras) return [];
    return extras.map(extra => ({
        name: extra.name,
        options: extra.options.map(option => ({
            name: option.name,
            price: option.price.toString(),
            mode: option.type === 'ingredient' || option.ingredient_id ? 'ingredient' : 'custom',
            ingredientId: option.ingredient_id ?? '',
            ingredientUsage: option.ingredient_usage != null ? option.ingredient_usage.toString() : '',
        })),
    }));
};

const sanitizeExtras = (
    extras: ProductExtraFormState[],
    ingredientMap: Map<string, Ingredient>,
): ProductExtra[] => {
    return extras
        .map(extra => ({
            name: extra.name.trim(),
            options: extra.options
                .map(option => {
                    const price = Number.parseFloat(option.price.replace(',', '.')) || 0;
                    const ingredientUsage = Number.parseFloat((option.ingredientUsage ?? '').replace(',', '.'));
                    const normalizedIngredientUsage = Number.isFinite(ingredientUsage) && ingredientUsage > 0
                        ? ingredientUsage
                        : null;
                    if (option.mode === 'ingredient') {
                        const ingredient = option.ingredientId ? ingredientMap.get(option.ingredientId) : undefined;
                        const label = ingredient?.nom?.trim() ?? '';
                        if (!label) {
                            return null;
                        }
                        return {
                            name: label,
                            price,
                            type: 'ingredient' as const,
                            ingredient_id: option.ingredientId ?? null,
                            ingredient_usage: normalizedIngredientUsage,
                        };
                    }

                    const label = option.name.trim();
                    if (!label) {
                        return null;
                    }

                    return {
                        name: label,
                        price,
                        type: 'custom' as const,
                        ingredient_id: null,
                        ingredient_usage: null,
                    };
                })
                .filter((option): option is ProductExtraOption => Boolean(option))
                .filter(option => option.name),
        }))
        .filter(extra => extra.name && extra.options.length > 0);
};

const AddEditProductModal: React.FC<{ isOpen: boolean; onClose: () => void; onSuccess: () => void; product: Product | null; mode: 'add' | 'edit'; categories: Category[]; ingredients: Ingredient[]; occupiedPositions: Map<number, Product>; }> = ({ isOpen, onClose, onSuccess, product, mode, categories, ingredients, occupiedPositions }) => {
    const [formData, setFormData] = useState<ProductFormState>({
        nom_produit: product?.nom_produit || '',
        prix_vente: product?.prix_vente || 0,
        categoria_id: product?.categoria_id || (categories[0]?.id ?? ''),
        estado: product?.estado || 'agotado_indefinido',
        image: product?.image ?? '',
        description: product?.description || '',
        recipe: product?.recipe || [],
        is_best_seller: product?.is_best_seller ?? false,
        best_seller_rank: product?.best_seller_rank ?? null,
        extras: convertExtrasToFormState(product?.extras),
        allow_ingredient_removal_extra: product?.allow_ingredient_removal_extra ?? false,
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isSubmitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        setFormData({
            nom_produit: product?.nom_produit || '',
            prix_vente: product?.prix_vente || 0,
            categoria_id: product?.categoria_id || (categories[0]?.id ?? ''),
            estado: product?.estado || 'agotado_indefinido',
            image: product?.image ?? '',
            description: product?.description || '',
            recipe: product?.recipe || [],
            is_best_seller: product?.is_best_seller ?? false,
            best_seller_rank: product?.best_seller_rank ?? null,
            extras: convertExtrasToFormState(product?.extras),
            allow_ingredient_removal_extra: product?.allow_ingredient_removal_extra ?? false,
        });
        setImageFile(null);
    }, [isOpen, product, categories]);

    const findFirstAvailablePosition = useCallback(() => {
        for (const rank of BEST_SELLER_RANKS) {
            const occupant = occupiedPositions.get(rank);
            if (!occupant || occupant.id === product?.id) {
                return rank;
            }
        }
        return null;
    }, [occupiedPositions, product?.id]);

    const handleBestSellerToggle = useCallback(
        (checked: boolean) => {
            setFormData(prev => {
                if (checked) {
                    const nextRank = prev.best_seller_rank ?? findFirstAvailablePosition();
                    return { ...prev, is_best_seller: true, best_seller_rank: nextRank ?? null };
                }
                return { ...prev, is_best_seller: false, best_seller_rank: null };
            });
        },
        [findFirstAvailablePosition],
    );

    const handleBestSellerRankChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        const value = event.target.value;
        setFormData(prev => ({ ...prev, best_seller_rank: value ? Number(value) : null }));
    }, []);

    const ingredientMap = useMemo(() => new Map(ingredients.map(ing => [ing.id, ing])), [ingredients]);

    const recipeCost = useMemo(() => {
        return formData.recipe.reduce((total, item) => {
            const ingredient = ingredientMap.get(item.ingredient_id);
            if (!ingredient) return total;

            const unitPrice = convertPriceToUsageUnit(ingredient.unite, ingredient.prix_unitaire);

            return total + unitPrice * item.qte_utilisee;
        }, 0);
    }, [formData.recipe, ingredientMap]);

    const marginValue = formData.prix_vente - recipeCost;
    const marginPercentage = formData.prix_vente > 0 ? (marginValue / formData.prix_vente) * 100 : 0;

    const handleRecipeChange = (
        index: number,
        field: keyof RecipeItem,
        event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => {
        const newRecipe = [...formData.recipe];
        if (field === 'qte_utilisee') {
            const { valueAsNumber, value } = event.currentTarget;
            const normalizedValue = Number.isNaN(valueAsNumber) ? Number(value.replace(',', '.')) : valueAsNumber;
            newRecipe[index] = {
                ...newRecipe[index],
                [field]: Number.isNaN(normalizedValue) ? newRecipe[index].qte_utilisee : normalizedValue,
            };
        } else {
            newRecipe[index] = { ...newRecipe[index], [field]: event.currentTarget.value };
        }
        setFormData(prev => ({ ...prev, recipe: newRecipe }));
    };

    const addRecipeItem = () => {
        if (ingredients.length === 0) return;
        setFormData({ ...formData, recipe: [...formData.recipe, { ingredient_id: ingredients[0].id, qte_utilisee: 0 }] });
    };
    
    const removeRecipeItem = (index: number) => {
        const newRecipe = formData.recipe.filter((_, i) => i !== index);
        setFormData({ ...formData, recipe: newRecipe });
    };

    const addExtraGroup = () => {
        setFormData(prev => ({
            ...prev,
            extras: [...prev.extras, { name: '', options: [] }],
        }));
    };

    const removeExtraGroup = (index: number) => {
        setFormData(prev => ({
            ...prev,
            extras: prev.extras.filter((_, idx) => idx !== index),
        }));
    };

    const handleExtraNameChange = (index: number, value: string) => {
        setFormData(prev => ({
            ...prev,
            extras: prev.extras.map((extra, idx) => (idx === index ? { ...extra, name: value } : extra)),
        }));
    };

    const addExtraOption = (extraIndex: number) => {
        setFormData(prev => ({
            ...prev,
            extras: prev.extras.map((extra, idx) =>
                idx === extraIndex
                    ? {
                        ...extra,
                        options: [
                            ...extra.options,
                            { name: '', price: '', mode: 'custom', ingredientId: '', ingredientUsage: '' },
                        ],
                    }
                    : extra,
            ),
        }));
    };

    const removeExtraOption = (extraIndex: number, optionIndex: number) => {
        setFormData(prev => ({
            ...prev,
            extras: prev.extras.map((extra, idx) =>
                idx === extraIndex
                    ? { ...extra, options: extra.options.filter((_, optIdx) => optIdx !== optionIndex) }
                    : extra,
            ),
        }));
    };

    const handleExtraOptionChange = (
        extraIndex: number,
        optionIndex: number,
        field: keyof ProductExtraOptionFormState,
        value: string,
    ) => {
        setFormData(prev => ({
            ...prev,
            extras: prev.extras.map((extra, idx) => {
                if (idx !== extraIndex) return extra;
                const options = extra.options.map((option, optIdx) => {
                    if (optIdx !== optionIndex) {
                        return option;
                    }

                    if (field === 'mode') {
                        const nextMode = value as ProductExtraOptionFormState['mode'];
                        return {
                            ...option,
                            mode: nextMode,
                            ingredientId: nextMode === 'ingredient' ? '' : undefined,
                            ingredientUsage: nextMode === 'ingredient' ? option.ingredientUsage ?? '' : '',
                            name: nextMode === 'ingredient' ? '' : option.name,
                        };
                    }

                    if (field === 'ingredientId') {
                        const ingredientName = value ? ingredientMap.get(value)?.nom ?? '' : '';
                        const recipeUsage = prev.recipe.find(item => item.ingredient_id === value)?.qte_utilisee;
                        return {
                            ...option,
                            ingredientId: value,
                            name: ingredientName || option.name,
                            ingredientUsage:
                                option.ingredientUsage ||
                                (recipeUsage && Number.isFinite(recipeUsage) ? recipeUsage.toString() : option.ingredientUsage),
                        };
                    }

                    if (field === 'ingredientUsage') {
                        return { ...option, ingredientUsage: value };
                    }

                    return { ...option, [field]: value };
                });
                return { ...extra, options };
            }),
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.recipe.length === 0) {
            alert("Por favor añade al menos un ingrediente a la receta.");
            return;
        }
        if (formData.is_best_seller) {
            if (formData.best_seller_rank == null) {
                alert('Selecciona una posición de producto destacado disponible.');
                return;
            }
            const occupant = occupiedPositions.get(formData.best_seller_rank);
            if (occupant && occupant.id !== product?.id) {
                alert(`La posición ${formData.best_seller_rank} ya está ocupada por ${occupant.nom_produit}.`);
                return;
            }
        }
        setSubmitting(true);
        try {
            let imageUrl = formData.image?.trim() ?? '';
            if (imageFile) {
                imageUrl = await uploadProductImage(imageFile, formData.nom_produit);
            }

            const sanitizedExtras = sanitizeExtras(formData.extras, ingredientMap);
            const finalData = {
                ...formData,
                extras: sanitizedExtras,
                image: imageUrl,
                is_best_seller: formData.is_best_seller,
                best_seller_rank: formData.is_best_seller ? formData.best_seller_rank : null,
            } as Omit<Product, 'id'>;

            if (mode === 'edit' && product) {
                await api.updateProduct(product.id, finalData);
            } else {
                await api.addProduct(finalData);
            }
            onSuccess();
            setImageFile(null);
            onClose();
        } catch (error) {
            console.error("Failed to save product", error);
            const message = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
            alert(`No se pudo cargar la imagen del producto: ${message}`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={mode === 'add' ? 'Agregar producto' : 'Modificar producto'} size="half">
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div className="max-h-[65vh] overflow-y-auto pr-2 space-y-5">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:items-stretch">
                        <div className="rounded-2xl border border-brand-border bg-brand-accent/10 p-4 flex flex-col gap-4 h-full">
                            <div>
                                <p className="text-sm font-semibold text-gray-800">Imagen del producto</p>
                                <p className="text-xs text-gray-600">Usa una imagen cuadrada para un mejor resultado.</p>
                            </div>
                            <div className="flex-1">
                                <div className="h-full w-full overflow-hidden rounded-xl bg-white shadow-sm">
                                    <img
                                        src={imageFile ? URL.createObjectURL(imageFile) : resolveProductImageUrl(formData.image)}
                                        alt="Vista previa del producto"
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                            </div>
                            <label
                                htmlFor="product-image-upload"
                                className="cursor-pointer bg-white/70 py-2 px-3 border border-brand-border rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary text-center"
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <Upload size={16} />
                                    <span>Cambiar la imagen</span>
                                </div>
                                <input
                                    id="product-image-upload"
                                    type="file"
                                    className="sr-only"
                                    onChange={e => setImageFile(e.target.files ? e.target.files[0] : null)}
                                />
                            </label>
                        </div>
                        <div className="flex flex-col gap-4 h-full">
                            <div className="rounded-2xl border border-brand-border bg-brand-accent/5 p-4 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Nombre</label>
                                    <input
                                        type="text"
                                        value={formData.nom_produit}
                                        onChange={e => setFormData({ ...formData, nom_produit: e.target.value })}
                                        required
                                        className="mt-1 ui-input"
                                    />
                                </div>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Precio de venta</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.prix_vente}
                                            onChange={event => {
                                                const { valueAsNumber, value } = event.currentTarget;
                                                const normalizedValue = Number.isNaN(valueAsNumber)
                                                    ? Number(value.replace(',', '.'))
                                                    : valueAsNumber;
                                                setFormData(prev => ({
                                                    ...prev,
                                                    prix_vente: Number.isNaN(normalizedValue) ? prev.prix_vente : normalizedValue,
                                                }));
                                            }}
                                            required
                                            className="mt-1 ui-input"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Categoría</label>
                                        <select
                                            value={formData.categoria_id}
                                            onChange={e => setFormData({ ...formData, categoria_id: e.target.value })}
                                            required
                                            className="mt-1 ui-select"
                                        >
                                            {categories.map(c => (
                                                <option key={c.id} value={c.id}>
                                                    {c.nom}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Descripción</label>
                                    <textarea
                                        rows={3}
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="mt-1 ui-textarea"
                                        placeholder="Descripción breve del producto..."
                                    />
                                </div>
                            </div>
                            <div className="rounded-2xl border border-brand-border bg-brand-accent/15 p-4 space-y-4 flex-1">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <input
                                                id="best-seller-toggle"
                                                type="checkbox"
                                                checked={formData.is_best_seller}
                                                onChange={event => handleBestSellerToggle(event.target.checked)}
                                                className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                                            />
                                            <label htmlFor="best-seller-toggle" className="text-sm font-medium text-gray-700">
                                                Best seller
                                            </label>
                                        </div>
                                        {formData.is_best_seller && (
                                            <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-brand-primary">
                                                Destacado
                                            </span>
                                        )}
                                    </div>
                                    <select
                                        aria-label="Posición del producto destacado"
                                        value={formData.best_seller_rank ?? ''}
                                        onChange={handleBestSellerRankChange}
                                        disabled={!formData.is_best_seller}
                                        className="ui-select"
                                    >
                                        <option value="">Selecciona una posición</option>
                                        {BEST_SELLER_RANKS.map(rank => {
                                            const occupant = occupiedPositions.get(rank);
                                            const isCurrentProduct = occupant?.id === product?.id;
                                            const isDisabled = Boolean(occupant && !isCurrentProduct);
                                            const label = occupant
                                                ? isCurrentProduct
                                                    ? `${rank} – Posición actual`
                                                    : `${rank} – Ocupado por ${occupant.nom_produit}`
                                                : `${rank}`;
                                            return (
                                                <option key={rank} value={rank} disabled={isDisabled}>
                                                    {label}
                                                </option>
                                            );
                                        })}
                                    </select>
                                    {formData.is_best_seller && formData.best_seller_rank === null && (
                                        <p className="text-xs text-red-600">
                                            Selecciona una posición disponible para este destacado.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-brand-border bg-brand-accent/5 p-5 space-y-5">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h4 className="text-base font-semibold text-gray-800">Extras del producto</h4>
                                <p className="text-sm text-gray-600">Organiza tus suplementos por grupo para guiar la selección.</p>
                            </div>
                            <button
                                type="button"
                                onClick={addExtraGroup}
                                className="inline-flex items-center gap-1 rounded-full border border-brand-border bg-white/70 px-4 py-2 text-sm font-medium text-brand-primary hover:bg-white"
                            >
                                <span>+ Agregar un extra</span>
                            </button>
                        </div>
                        <div className="rounded-xl border border-dashed border-brand-border/70 bg-white/70 p-4 text-sm text-gray-700 space-y-2">
                            <label className="flex items-center gap-2 font-medium">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                                    checked={formData.allow_ingredient_removal_extra}
                                    onChange={event =>
                                        setFormData(prev => ({
                                            ...prev,
                                            allow_ingredient_removal_extra: event.target.checked,
                                        }))
                                    }
                                />
                                <span>Permitir que los clientes retiren ingredientes</span>
                            </label>
                            <p className="text-xs text-gray-500">
                                Activa un grupo de extras automático que lista los ingredientes de la receta para que los clientes puedan retirarlos sin costo.
                            </p>
                        </div>
                        {formData.extras.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-brand-border bg-white/60 p-4 text-sm text-gray-500">
                                No hay extras definidos para este producto.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {formData.extras.map((extra, extraIndex) => (
                                    <div
                                        key={extraIndex}
                                        className="rounded-2xl border border-brand-border bg-white/80 p-4 shadow-sm space-y-4"
                                    >
                                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                            <div className="flex flex-1 items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={extra.name}
                                                    onChange={event => handleExtraNameChange(extraIndex, event.target.value)}
                                                    placeholder="Nombre del extra (ej.: Salsas)"
                                                    className="ui-input flex-1"
                                                />
                                                <span className="rounded-full bg-brand-accent/10 px-3 py-1 text-xs font-medium text-brand-primary">
                                                    {extra.options.length} opción{extra.options.length > 1 ? 'es' : ''}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeExtraGroup(extraIndex)}
                                                className="inline-flex items-center gap-1 text-sm font-medium text-red-500 hover:text-red-600"
                                            >
                                                <Trash2 size={16} />
                                                Supprimer
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                        <div className="grid grid-cols-1 gap-3 text-xs font-semibold uppercase tracking-wide text-gray-500 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                                            <span>Tipo de opción</span>
                                            <span>Nombre / Ingrediente</span>
                                            <span>Cantidad añadida</span>
                                            <span>Precio adicional</span>
                                            <span className="hidden sm:block text-right">Acción</span>
                                        </div>
                                            {extra.options.map((option, optionIndex) => {
                                                const selectedIngredientUnit =
                                                    option.mode === 'ingredient' && option.ingredientId
                                                        ? ingredientMap.get(option.ingredientId)?.unite
                                                        : undefined;
                                                const extraUsageUnitLabel = selectedIngredientUnit
                                                    ? getUsageUnitLabel(selectedIngredientUnit)
                                                    : '';

                                                return (
                                                    <div
                                                        key={optionIndex}
                                                        className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
                                                    >
                                                        <select
                                                            value={option.mode}
                                                            onChange={event =>
                                                                handleExtraOptionChange(extraIndex, optionIndex, 'mode', event.target.value)
                                                            }
                                                            className="ui-select"
                                                        >
                                                            <option value="custom">Texto libre</option>
                                                            <option value="ingredient">Ingrediente del inventario</option>
                                                        </select>
                                                        {option.mode === 'ingredient' ? (
                                                            <select
                                                                value={option.ingredientId ?? ''}
                                                                onChange={event =>
                                                                    handleExtraOptionChange(
                                                                        extraIndex,
                                                                        optionIndex,
                                                                        'ingredientId',
                                                                        event.target.value,
                                                                    )
                                                                }
                                                                className="ui-select"
                                                            >
                                                                <option value="">Selecciona un ingrediente</option>
                                                                {ingredients.map(ingredient => (
                                                                    <option key={ingredient.id} value={ingredient.id}>
                                                                        {ingredient.nom}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            <input
                                                                type="text"
                                                                value={option.name}
                                                                onChange={event =>
                                                                    handleExtraOptionChange(
                                                                        extraIndex,
                                                                        optionIndex,
                                                                        'name',
                                                                        event.target.value,
                                                                    )
                                                                }
                                                                placeholder="Nombre de la opción"
                                                                className="ui-input"
                                                            />
                                                        )}
                                                        {option.mode === 'ingredient' ? (
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    step="0.01"
                                                                    value={option.ingredientUsage ?? ''}
                                                                    onChange={event =>
                                                                        handleExtraOptionChange(
                                                                            extraIndex,
                                                                            optionIndex,
                                                                            'ingredientUsage',
                                                                            event.target.value,
                                                                        )
                                                                    }
                                                                    placeholder="1"
                                                                    className="ui-input"
                                                                />
                                                                {extraUsageUnitLabel ? (
                                                                    <span className="text-sm text-gray-500 w-12">{extraUsageUnitLabel}</span>
                                                                ) : null}
                                                            </div>
                                                        ) : (
                                                            <div className="self-center text-sm text-gray-400">N/A</div>
                                                        )}
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm text-gray-500">COP</span>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                value={option.price}
                                                                onChange={event =>
                                                                    handleExtraOptionChange(extraIndex, optionIndex, 'price', event.target.value)
                                                                }
                                                                placeholder="0.00"
                                                                className="ui-input"
                                                            />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeExtraOption(extraIndex, optionIndex)}
                                                            className="justify-self-start rounded-full bg-red-50 p-2 text-red-500 hover:bg-red-100"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => addExtraOption(extraIndex)}
                                            className="text-sm font-semibold text-brand-primary hover:underline"
                                        >
                                            + Agregar una opción
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="rounded-2xl border border-brand-border bg-brand-accent/5 p-4">
                        <div className="flex flex-col gap-2">
                            <h4 className="text-md font-semibold text-gray-800">Receta</h4>
                            {formData.recipe.length === 0 && (
                                <div className="text-center p-2 my-2 bg-red-50 border border-red-200 rounded-md">
                                    <p className="text-sm text-red-600">Un producto debe contener al menos un ingrediente.</p>
                                </div>
                            )}
                            <div className="space-y-2">
                                {formData.recipe.map((item, index) => {
                                    const ingredientUnit = ingredients.find(i => i.id === item.ingredient_id)?.unite;
                                    const usageUnitLabel = ingredientUnit ? getUsageUnitLabel(ingredientUnit) : '';

                                    return (
                                        <div key={index} className="flex items-center gap-2">
                                            <GripVertical className="text-gray-400 cursor-move" size={16}/>
                                            <select value={item.ingredient_id} onChange={event => handleRecipeChange(index, 'ingredient_id', event)} className="ui-select flex-grow">
                                                {ingredients.map(i => <option key={i.id} value={i.id}>{i.nom}</option>)}
                                            </select>
                                            <input type="number" placeholder="Cant." value={item.qte_utilisee} onChange={event => handleRecipeChange(index, 'qte_utilisee', event)} className="ui-input w-24" />
                                            <span className="text-gray-500 text-sm w-12">{usageUnitLabel}</span>
                                            <button type="button" onClick={() => removeRecipeItem(index)} className="p-1 text-red-500 hover:bg-red-100 rounded-full"><Trash2 size={16}/></button>
                                        </div>
                                    );
                                })}
                            </div>
                            <button type="button" onClick={addRecipeItem} className="mt-2 text-sm font-semibold text-brand-primary hover:underline">+ Agregar un ingrediente</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-brand-accent/10 border border-brand-border rounded-2xl p-4 text-sm text-gray-700">
                        <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500">Costo de producción</p>
                            <p className="text-lg font-semibold text-gray-900">{formatCurrencyCOP(recipeCost)}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500">Margen</p>
                            <p className={`text-lg font-semibold ${marginValue >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {formatCurrencyCOP(marginValue)}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500">Margen %</p>
                            <p className={`text-lg font-semibold ${marginPercentage >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {Number.isFinite(marginPercentage) ? formatIntegerAmount(marginPercentage) : '0'}%
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
                    <button type="button" onClick={onClose} className="w-full sm:w-auto ui-btn-secondary py-3">Cancelar</button>
                    <button type="submit" disabled={isSubmitting || formData.recipe.length === 0} className="w-full sm:w-auto ui-btn-primary py-3 disabled:opacity-60">{isSubmitting ? 'Guardando...' : 'Guardar'}</button>
                </div>
            </form>
        </Modal>
    );
};

const ManageCategoriesModal: React.FC<{ isOpen: boolean; onClose: () => void; onSuccess: () => void; categories: Category[] }> = ({ isOpen, onClose, onSuccess, categories }) => {
    const [newCategoryName, setNewCategoryName] = useState('');
    const [error, setError] = useState('');

    const handleAdd = async () => {
        if (!newCategoryName.trim()) return;
        try {
            await api.addCategory(newCategoryName);
            setNewCategoryName('');
            onSuccess();
        } catch (err) { console.error(err); }
    };
    
    const handleDelete = async (id: string) => {
        setError('');
        try {
            await api.deleteCategory(id);
            onSuccess();
        } catch (err: any) {
            setError(err.message);
            console.error(err);
        }
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Gestionar categorías">
            <div className="space-y-4">
                <div className="flex gap-2">
                    <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Nombre de la nueva categoría" className="ui-input flex-grow" />
                    <button onClick={handleAdd} className="ui-btn-primary px-4">Agregar</button>
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <ul className="space-y-2 max-h-60 overflow-y-auto">
                    {categories.map(cat => (
                        <li key={cat.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                            <span className="text-gray-800">{cat.nom}</span>
                            <button onClick={() => handleDelete(cat.id)} className="p-1 text-red-500 hover:bg-red-100 rounded-full"><Trash2 size={16}/></button>
                        </li>
                    ))}
                </ul>
                 <div className="pt-4 flex">
                    <button type="button" onClick={onClose} className="w-full ui-btn-secondary py-3">Cerrar</button>
                </div>
            </div>
        </Modal>
    );
};

const DeleteProductModal: React.FC<{ isOpen: boolean; onClose: () => void; onSuccess: () => void; product: Product }> = ({ isOpen, onClose, onSuccess, product }) => {
    const [isSubmitting, setSubmitting] = useState(false);

    const handleDelete = async () => {
        setSubmitting(true);
        try {
            await api.deleteProduct(product.id);
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to delete product", error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Confirmar eliminación">
            <p className="text-gray-700">¿Seguro que quieres eliminar el producto <strong className="text-gray-900">{product.nom_produit}</strong>? Esta acción es irreversible.</p>
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6">
                <button type="button" onClick={onClose} className="w-full sm:w-auto ui-btn-secondary py-3">Cancelar</button>
                <button onClick={handleDelete} disabled={isSubmitting} className="w-full sm:w-auto ui-btn-danger py-3">{isSubmitting ? 'Eliminando...' : 'Eliminar'}</button>
            </div>
        </Modal>
    );
}

export default Produits;
