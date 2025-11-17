

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { uploadProductImage, resolveProductImageUrl } from '../services/cloudinary';
import { Product, Category, Ingredient, RecipeItem, ProductExtra } from '../types';
import Modal from '../components/Modal';
import { PlusCircle, Edit, Trash2, Search, Settings, GripVertical, CheckCircle, Clock, XCircle, Upload, HelpCircle } from 'lucide-react';
import { formatCurrencyCOP, formatIntegerAmount } from '../utils/formatIntegerAmount';
import { convertPriceToUsageUnit, getUsageUnitLabel } from '../utils/ingredientUnits';

const BEST_SELLER_RANKS = [1, 2, 3, 4, 5, 6];

const getStatusInfo = (status: Product['estado']) => {
    switch (status) {
        case 'disponible':
            return { text: 'Disponible', color: 'bg-green-100 text-green-800', Icon: CheckCircle };
        case 'agotado_temporal':
            return { text: 'Rupture (Temp.)', color: 'bg-yellow-100 text-yellow-800', Icon: Clock };
        case 'agotado_indefinido':
            return { text: 'Indisponible', color: 'bg-red-100 text-red-800', Icon: XCircle };
        default:
            return { text: 'Inconnu', color: 'bg-gray-100 text-gray-800', Icon: HelpCircle };
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
            setError("Impossible de charger les données des produits.");
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
            const message = error instanceof Error ? error.message : "Une erreur inconnue s'est produite.";
            alert(`Échec de la mise à jour du statut du produit : ${message}`);
        }
    }

    if (loading) return <p className="text-gray-800">Chargement des produits...</p>;
    if (error) return <p className="text-red-500">{error}</p>;

    return (
        <div className="space-y-6">
            <div className="mt-6 ui-card p-4 flex flex-col lg:flex-row justify-between items-center gap-4">
                <div className="flex flex-col md:flex-row gap-4 w-full">
                    <div className="relative flex-grow md:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Rechercher un produit..."
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
                        <option value="all">Toutes les catégories</option>
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
                            Ajouter Produit
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
                        <p className="text-xs text-black">{category?.nom || 'Sans catégorie'}</p>
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
                                <p className="px-4 pt-2 pb-1 text-xs text-gray-500">Changer statut :</p>
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
                                aria-label="Modifier le produit"
                            >
                                <Edit size={18} />
                            </button>
                            <button
                                type="button"
                                onClick={onDelete}
                                className="p-2 rounded-full hover:bg-gray-100 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/40"
                                aria-label="Supprimer le produit"
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
};

const convertExtrasToFormState = (extras?: ProductExtra[] | null): ProductExtraFormState[] => {
    if (!extras) return [];
    return extras.map(extra => ({
        name: extra.name,
        options: extra.options.map(option => ({
            name: option.name,
            price: option.price.toString(),
        })),
    }));
};

const sanitizeExtras = (extras: ProductExtraFormState[]): ProductExtra[] => {
    return extras
        .map(extra => ({
            name: extra.name.trim(),
            options: extra.options
                .map(option => ({
                    name: option.name.trim(),
                    price: Number.parseFloat(option.price.replace(',', '.')) || 0,
                }))
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
                    ? { ...extra, options: [...extra.options, { name: '', price: '' }] }
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
                const options = extra.options.map((option, optIdx) =>
                    optIdx === optionIndex ? { ...option, [field]: value } : option,
                );
                return { ...extra, options };
            }),
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.recipe.length === 0) {
            alert("Veuillez ajouter au moins un ingrédient à la recette.");
            return;
        }
        if (formData.is_best_seller) {
            if (formData.best_seller_rank == null) {
                alert('Veuillez sélectionner une position de best seller disponible.');
                return;
            }
            const occupant = occupiedPositions.get(formData.best_seller_rank);
            if (occupant && occupant.id !== product?.id) {
                alert(`La position ${formData.best_seller_rank} est déjà occupée par ${occupant.nom_produit}.`);
                return;
            }
        }
        setSubmitting(true);
        try {
            let imageUrl = formData.image?.trim() ?? '';
            if (imageFile) {
                imageUrl = await uploadProductImage(imageFile, formData.nom_produit);
            }

            const sanitizedExtras = sanitizeExtras(formData.extras);
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
            const message = error instanceof Error ? error.message : "Une erreur inconnue s'est produite.";
            alert(`Échec du téléversement de l'image du produit : ${message}`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={mode === 'add' ? 'Ajouter un Produit' : 'Modifier le Produit'} size="lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div className="max-h-[65vh] overflow-y-auto pr-2 space-y-5">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="rounded-xl border border-gray-200 p-4 flex flex-col gap-4">
                            <div>
                                <p className="text-sm font-medium text-gray-700">Image du produit</p>
                                <p className="text-xs text-gray-500">Utilisez une image carrée pour un meilleur rendu.</p>
                            </div>
                            <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-50">
                                <img
                                    src={imageFile ? URL.createObjectURL(imageFile) : resolveProductImageUrl(formData.image)}
                                    alt="Aperçu du produit"
                                    className="h-full w-full object-cover"
                                />
                            </div>
                            <label
                                htmlFor="product-image-upload"
                                className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary text-center"
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <Upload size={16} />
                                    <span>Changer l'image</span>
                                </div>
                                <input
                                    id="product-image-upload"
                                    type="file"
                                    className="sr-only"
                                    onChange={e => setImageFile(e.target.files ? e.target.files[0] : null)}
                                />
                            </label>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Nom</label>
                                <input
                                    type="text"
                                    value={formData.nom_produit}
                                    onChange={e => setFormData({ ...formData, nom_produit: e.target.value })}
                                    required
                                    className="mt-1 ui-input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Prix de vente</label>
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
                                <label className="block text-sm font-medium text-gray-700">Catégorie</label>
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
                            <div className="rounded-xl border border-gray-200 p-4 space-y-3">
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
                                <select
                                    aria-label="Position du best seller"
                                    value={formData.best_seller_rank ?? ''}
                                    onChange={handleBestSellerRankChange}
                                    disabled={!formData.is_best_seller}
                                    className="ui-select"
                                >
                                    <option value="">Sélectionner une position</option>
                                    {BEST_SELLER_RANKS.map(rank => {
                                        const occupant = occupiedPositions.get(rank);
                                        const isCurrentProduct = occupant?.id === product?.id;
                                        const isDisabled = Boolean(occupant && !isCurrentProduct);
                                        const label = occupant
                                            ? isCurrentProduct
                                                ? `${rank} – Position actuelle`
                                                : `${rank} – Occupé par ${occupant.nom_produit}`
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
                                        Sélectionnez une position disponible pour ce best seller.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea
                            rows={3}
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="mt-1 ui-textarea"
                            placeholder="Courte description du produit..."
                        />
                    </div>

                    <div className="rounded-xl border border-gray-200 p-4 space-y-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h4 className="text-base font-semibold text-gray-800">Extras du produit</h4>
                                <p className="text-sm text-gray-500">Ajoutez des options additionnelles facturables.</p>
                            </div>
                            <button type="button" onClick={addExtraGroup} className="ui-btn-secondary py-2 px-3 text-sm">
                                Ajouter un extra
                            </button>
                        </div>
                        {formData.extras.length === 0 ? (
                            <p className="text-sm text-gray-500">Aucun extra n'est défini pour ce produit.</p>
                        ) : (
                            <div className="space-y-3">
                                {formData.extras.map((extra, extraIndex) => (
                                    <div key={extraIndex} className="rounded-lg border border-gray-200 p-3 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={extra.name}
                                                onChange={event => handleExtraNameChange(extraIndex, event.target.value)}
                                                placeholder="Nom de l'extra (ex: Sauces)"
                                                className="ui-input flex-1"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeExtraGroup(extraIndex)}
                                                className="p-2 text-gray-400 hover:text-red-500"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {extra.options.map((option, optionIndex) => (
                                                <div
                                                    key={optionIndex}
                                                    className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]"
                                                >
                                                    <input
                                                        type="text"
                                                        value={option.name}
                                                        onChange={event =>
                                                            handleExtraOptionChange(extraIndex, optionIndex, 'name', event.target.value)
                                                        }
                                                        placeholder="Nom de l'option"
                                                        className="ui-input"
                                                    />
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={option.price}
                                                        onChange={event =>
                                                            handleExtraOptionChange(extraIndex, optionIndex, 'price', event.target.value)
                                                        }
                                                        placeholder="Prix"
                                                        className="ui-input"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeExtraOption(extraIndex, optionIndex)}
                                                        className="p-2 text-gray-400 hover:text-red-500"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => addExtraOption(extraIndex)}
                                            className="text-sm font-medium text-brand-primary hover:underline"
                                        >
                                            Ajouter une option
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <h4 className="text-md font-semibold text-gray-800 border-b pb-2 mb-2">Recette</h4>
                        {formData.recipe.length === 0 && (
                            <div className="text-center p-2 my-2 bg-red-50 border border-red-200 rounded-md">
                                <p className="text-sm text-red-600">Un produit doit contenir au moins un ingrédient.</p>
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
                                        <input type="number" placeholder="Qté" value={item.qte_utilisee} onChange={event => handleRecipeChange(index, 'qte_utilisee', event)} className="ui-input w-24" />
                                        <span className="text-gray-500 text-sm w-12">{usageUnitLabel}</span>
                                        <button type="button" onClick={() => removeRecipeItem(index)} className="p-1 text-red-500 hover:bg-red-100 rounded-full"><Trash2 size={16}/></button>
                                    </div>
                                );
                            })}
                        </div>
                        <button type="button" onClick={addRecipeItem} className="mt-2 text-sm text-blue-600 hover:underline">Ajouter un ingrédient</button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700">
                        <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500">Coût de revient</p>
                            <p className="text-lg font-semibold text-gray-900">{formatCurrencyCOP(recipeCost)}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500">Marge</p>
                            <p className={`text-lg font-semibold ${marginValue >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {formatCurrencyCOP(marginValue)}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500">Marge %</p>
                            <p className={`text-lg font-semibold ${marginPercentage >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {Number.isFinite(marginPercentage) ? formatIntegerAmount(marginPercentage) : '0'}%
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
                    <button type="button" onClick={onClose} className="w-full sm:w-auto ui-btn-secondary py-3">Annuler</button>
                    <button type="submit" disabled={isSubmitting || formData.recipe.length === 0} className="w-full sm:w-auto ui-btn-primary py-3 disabled:opacity-60">{isSubmitting ? 'Sauvegarde...' : 'Sauvegarder'}</button>
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
        <Modal isOpen={isOpen} onClose={onClose} title="Gérer les Catégories">
            <div className="space-y-4">
                <div className="flex gap-2">
                    <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Nom de la nouvelle catégorie" className="ui-input flex-grow" />
                    <button onClick={handleAdd} className="ui-btn-primary px-4">Ajouter</button>
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
                    <button type="button" onClick={onClose} className="w-full ui-btn-secondary py-3">Fermer</button>
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
        <Modal isOpen={isOpen} onClose={onClose} title="Confirmer la Suppression">
            <p className="text-gray-700">Êtes-vous sûr de vouloir supprimer le produit <strong className="text-gray-900">{product.nom_produit}</strong> ? Cette action est irréversible.</p>
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6">
                <button type="button" onClick={onClose} className="w-full sm:w-auto ui-btn-secondary py-3">Annuler</button>
                <button onClick={handleDelete} disabled={isSubmitting} className="w-full sm:w-auto ui-btn-danger py-3">{isSubmitting ? 'Suppression...' : 'Supprimer'}</button>
            </div>
        </Modal>
    );
}

export default Produits;
