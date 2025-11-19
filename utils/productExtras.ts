import type {
    Product,
    ProductExtra,
    ProductExtraOption,
    SelectedProductExtraOption,
} from '../types';

const INGREDIENT_REMOVAL_EXTRA_NAME = 'Retirer des ingrédients';

const normalizeIngredientName = (name?: string | null) => name?.trim() ?? '';

const resolveExtraIngredientUsage = (product: Product, ingredientId?: string | null) => {
    if (!ingredientId) {
        return 1;
    }

    const recipeItem = product.recipe?.find(entry => entry.ingredient_id === ingredientId);
    if (recipeItem && Number.isFinite(recipeItem.qte_utilisee) && recipeItem.qte_utilisee > 0) {
        return recipeItem.qte_utilisee;
    }

    return 1;
};

const buildIngredientRemovalOptions = (product: Product): ProductExtraOption[] => {
    if (!product.recipe || product.recipe.length === 0) {
        return [];
    }

    const options: ProductExtraOption[] = [];
    const seenIds = new Set<string>();

    for (const recipeItem of product.recipe) {
        const ingredientId = recipeItem.ingredient_id;
        if (!ingredientId || seenIds.has(ingredientId)) {
            continue;
        }

        const label = normalizeIngredientName(recipeItem.ingredient_name);
        if (!label) {
            continue;
        }

        options.push({
            name: label,
            price: 0,
            ingredient_id: ingredientId,
            type: 'ingredient',
        });
        seenIds.add(ingredientId);
    }

    return options;
};

export const buildIngredientRemovalExtra = (product: Product): ProductExtra | null => {
    if (!product.allow_ingredient_removal_extra) {
        return null;
    }

    const options = buildIngredientRemovalOptions(product);
    if (options.length === 0) {
        return null;
    }

    return {
        name: INGREDIENT_REMOVAL_EXTRA_NAME,
        options,
        isIngredientRemovalExtra: true,
    };
};

export const getDisplayableProductExtras = (product: Product): ProductExtra[] => {
    const baseExtras = product.extras ?? [];
    const removalExtra = buildIngredientRemovalExtra(product);
    return removalExtra ? [...baseExtras, removalExtra] : baseExtras;
};

export const mapSelectedProductExtraOption = (
    product: Product,
    extra: ProductExtra,
    option: ProductExtraOption,
): SelectedProductExtraOption => {
    const isIngredientOption = option.type === 'ingredient' || Boolean(option.ingredient_id);
    return {
        extraName: extra.name,
        optionName: option.name,
        price: option.price,
        ingredient_id: option.ingredient_id,
        ingredient_name: isIngredientOption ? option.name : null,
        ingredient_usage: isIngredientOption ? resolveExtraIngredientUsage(product, option.ingredient_id) : null,
    };
};

export const mapSelectedExtrasFromState = (
    product: Product,
    selection: Record<string, string[]>,
): SelectedProductExtraOption[] => {
    if (!product.extras || product.extras.length === 0) {
        return [];
    }

    return product.extras.flatMap(extra => {
        const selectedNames = selection[extra.name] ?? [];
        return extra.options
            .filter(option => selectedNames.includes(option.name))
            .map(option => mapSelectedProductExtraOption(product, extra, option));
    });
};

export const getRecipeIngredientNameMap = (product: Product): Map<string, string> => {
    const map = new Map<string, string>();
    if (!product.recipe) {
        return map;
    }

    for (const item of product.recipe) {
        const name = normalizeIngredientName(item.ingredient_name);
        if (item.ingredient_id && name && !map.has(item.ingredient_id)) {
            map.set(item.ingredient_id, name);
        }
    }

    return map;
};

export const mapExcludedIngredientIdsToNames = (
    product: Product,
    excludedIds: string[],
): string[] => {
    if (!excludedIds || excludedIds.length === 0) {
        return [];
    }

    const nameMap = getRecipeIngredientNameMap(product);
    return excludedIds
        .map(id => nameMap.get(id) ?? '')
        .filter((name): name is string => Boolean(name));
};
