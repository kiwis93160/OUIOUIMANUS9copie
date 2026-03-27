import { Category, Product } from '../types';

const normalizeCategoryName = (value: string): string =>
    value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

const matchesAnyToken = (normalizedName: string, tokens: string[]): boolean =>
    tokens.some(token => normalizedName.includes(token));

const getCategoryPriority = (categoryName: string): number => {
    const normalizedName = normalizeCategoryName(categoryName);

    if (matchesAnyToken(normalizedName, ['entrada', 'entradas'])) {
        return 0;
    }

    if (matchesAnyToken(normalizedName, [' oui', 'oui ', 'los oui', 'les oui', 'ouis']) || normalizedName === 'oui') {
        return 1;
    }

    if (matchesAnyToken(normalizedName, ['postre', 'postres', 'dessert', 'desserts'])) {
        return 2;
    }

    if (matchesAnyToken(normalizedName, ['bebida', 'bebidas', 'drink', 'drinks', 'boisson'])) {
        return 3;
    }

    return 4;
};

const compareByName = (nameA: string, nameB: string): number =>
    nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });

export const sortCategoriesForMenu = (categories: Category[]): Category[] =>
    [...categories].sort((categoryA, categoryB) => {
        const priorityA = getCategoryPriority(categoryA.nom);
        const priorityB = getCategoryPriority(categoryB.nom);

        if (priorityA !== priorityB) {
            return priorityA - priorityB;
        }

        return compareByName(categoryA.nom, categoryB.nom);
    });

export const sortProductsForMenu = (products: Product[], categories: Category[]): Product[] => {
    const categoryPriorityById = new Map(
        categories.map(category => [category.id, getCategoryPriority(category.nom)] as const),
    );

    return [...products].sort((productA, productB) => {
        const priorityA = categoryPriorityById.get(productA.categoria_id) ?? 4;
        const priorityB = categoryPriorityById.get(productB.categoria_id) ?? 4;

        if (priorityA !== priorityB) {
            return priorityA - priorityB;
        }

        return compareByName(productA.nom_produit, productB.nom_produit);
    });
};
