import type { Ingredient } from '../types';

export type IngredientNameMap = Record<string, string>;

export const createIngredientNameMap = (ingredients: Ingredient[]): IngredientNameMap => (
    ingredients.reduce<IngredientNameMap>((acc, ingredient) => {
        if (ingredient.id && ingredient.nom) {
            acc[ingredient.id] = ingredient.nom;
        }
        return acc;
    }, {})
);

export const mapIngredientIdsToNames = (
    ingredientIds?: string[],
    nameMap?: IngredientNameMap,
): string[] => {
    if (!ingredientIds || ingredientIds.length === 0) {
        return [];
    }

    if (!nameMap) {
        return [...ingredientIds];
    }

    return ingredientIds
        .map((id) => {
            const resolvedLabel = nameMap[id];
            return resolvedLabel ?? id;
        })
        .filter((label): label is string => Boolean(label));
};
