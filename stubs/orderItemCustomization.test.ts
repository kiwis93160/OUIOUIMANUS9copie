import { describe, expect, it } from 'vitest';
import { mergeProductIntoPendingItems } from '../pages/Commande';
import type { OrderItem, Product } from '../types';
import type { ItemCustomizationResult } from '../components/commande/ItemCustomizationModal';

const createProduct = (overrides: Partial<Product> = {}): Product => ({
    id: 'product-1',
    nom_produit: 'Produit 1',
    description: 'Délicieux',
    prix_vente: 500,
    categoria_id: 'cat-1',
    estado: 'disponible',
    image: 'image.jpg',
    recipe: [],
    is_best_seller: false,
    best_seller_rank: null,
    allow_ingredient_removal_extra: false,
    ...overrides,
});

const createItem = (overrides: Partial<OrderItem> = {}): OrderItem => ({
    id: 'item-1',
    produitRef: 'product-1',
    nom_produit: 'Produit 1',
    prix_unitaire: 500,
    quantite: 1,
    excluded_ingredients: [],
    commentaire: '',
    estado: 'en_attente',
    selected_extras: [],
    ...overrides,
});

const createResult = (overrides: Partial<ItemCustomizationResult> = {}): ItemCustomizationResult => ({
    quantity: 1,
    comment: '',
    selectedExtras: [],
    excludedIngredientIds: [],
    ...overrides,
});

describe('mergeProductIntoPendingItems', () => {
    it('increments quantity when the comment is blank', () => {
        const product = createProduct();
        const items = [createItem()];
        const result = mergeProductIntoPendingItems(items, product, createResult({ quantity: 2 }), () => 'generated-1');

        expect(result).toHaveLength(1);
        expect(result[0].quantite).toBe(3);
    });

    it('adds a separate line when a comment is provided', () => {
        const product = createProduct();
        const items = [createItem()];
        const updated = mergeProductIntoPendingItems(
            items,
            product,
            createResult({ quantity: 2, comment: 'Sans oignons' }),
            () => 'generated-2',
        );

        expect(updated).toHaveLength(2);
        expect(updated[1].id).toBe('generated-2');
        expect(updated[1].quantite).toBe(2);
        expect(updated[1].commentaire).toBe('Sans oignons');
        expect(updated[0].quantite).toBe(1);
    });

    it('trims comments before saving them', () => {
        const product = createProduct();
        const items: OrderItem[] = [];
        const updated = mergeProductIntoPendingItems(
            items,
            product,
            createResult({ quantity: 1, comment: '  Extra sauce  ' }),
            () => 'generated-3',
        );

        expect(updated).toHaveLength(1);
        expect(updated[0].commentaire).toBe('Extra sauce');
    });

    it('does not merge items that already have a comment even if the same comment is provided', () => {
        const product = createProduct();
        const items = [createItem({ id: 'item-2', commentaire: 'Sans oignons' })];
        const updated = mergeProductIntoPendingItems(
            items,
            product,
            createResult({ quantity: 1, comment: 'Sans oignons' }),
            () => 'generated-4',
        );

        expect(updated).toHaveLength(2);
        expect(updated[0].id).toBe('item-2');
        expect(updated[1].id).toBe('generated-4');
    });

    it('defaults to a minimum quantity of 1 when an invalid value is provided', () => {
        const product = createProduct();
        const items: OrderItem[] = [];
        const updated = mergeProductIntoPendingItems(
            items,
            product,
            createResult({ quantity: 0 }),
            () => 'generated-5',
        );

        expect(updated).toHaveLength(1);
        expect(updated[0].quantite).toBe(1);
    });

    it('adds the price of selected extras to the unit price', () => {
        const product = createProduct({ prix_vente: 1000 });
        const extraSelection = [{ extraName: 'Salsa', optionName: 'BBQ', price: 250 }];
        const updated = mergeProductIntoPendingItems(
            [],
            product,
            createResult({ selectedExtras: extraSelection }),
            () => 'generated-6',
        );

        expect(updated).toHaveLength(1);
        expect(updated[0].prix_unitaire).toBe(1250);
        expect(updated[0].selected_extras).toEqual(extraSelection);
    });

    it('does not merge items that have different selected extras', () => {
        const product = createProduct();
        const items = [createItem({ selected_extras: [{ extraName: 'Queso', optionName: 'Extra', price: 200 }] })];
        const updated = mergeProductIntoPendingItems(
            items,
            product,
            createResult({ selectedExtras: [{ extraName: 'Queso', optionName: 'Doble', price: 400 }] }),
            () => 'generated-7',
        );

        expect(updated).toHaveLength(2);
    });

    it('stores excluded ingredients when provided', () => {
        const product = createProduct();
        const result = createResult({ excludedIngredientIds: ['ing-1', 'ing-2'] });
        const updated = mergeProductIntoPendingItems([], product, result, () => 'generated-8');

        expect(updated).toHaveLength(1);
        expect(updated[0].excluded_ingredients).toEqual(['ing-1', 'ing-2']);
    });

    it('keeps items separate when excluded ingredients differ', () => {
        const product = createProduct();
        const items = [createItem({ excluded_ingredients: ['ing-1'] })];
        const result = createResult({ excludedIngredientIds: ['ing-2'] });
        const updated = mergeProductIntoPendingItems(items, product, result, () => 'generated-9');

        expect(updated).toHaveLength(2);
    });
});
