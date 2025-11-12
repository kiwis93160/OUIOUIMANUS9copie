import { Ingredient } from '../types';

type IngredientUnit = Ingredient['unite'];

type IngredientBaseUnit = 'kg' | 'L' | 'unite';

const BASE_UNIT_MAP: Record<IngredientUnit, IngredientBaseUnit> = {
  g: 'kg',
  kg: 'kg',
  ml: 'L',
  L: 'L',
  unite: 'unite',
};

export const getIngredientBaseUnit = (unit: IngredientUnit): IngredientBaseUnit => BASE_UNIT_MAP[unit];

const BASE_TO_STORAGE_FACTOR: Record<IngredientUnit, number> = {
  g: 1 / 1000,
  kg: 1,
  ml: 1 / 1000,
  L: 1,
  unite: 1,
};

export const convertPriceFromBaseToStorage = (unit: IngredientUnit, pricePerBaseUnit: number): number => {
  const factor = BASE_TO_STORAGE_FACTOR[unit];
  return pricePerBaseUnit * factor;
};

export const convertPriceFromStorageToBase = (unit: IngredientUnit, storedPrice: number): number => {
  const factor = BASE_TO_STORAGE_FACTOR[unit];
  if (factor === 0) {
    return storedPrice;
  }
  return storedPrice / factor;
};

export const getPriceDisplayUnitLabel = (unit: IngredientUnit): string => {
  const base = getIngredientBaseUnit(unit);
  if (base === 'unite') {
    return "unité";
  }
  return base;
};

export const getPriceDisplayLabel = (unit: IngredientUnit): string => {
  const baseLabel = getPriceDisplayUnitLabel(unit);
  return `Prix par ${baseLabel}`;
};

const USAGE_TO_STOCK_FACTOR: Record<IngredientUnit, number> = {
  g: 1,
  kg: 1 / 1000,
  ml: 1,
  L: 1 / 1000,
  unite: 1,
};

export const convertUsageQuantityToStockUnit = (unit: IngredientUnit, usageQuantity: number): number => {
  const factor = USAGE_TO_STOCK_FACTOR[unit];
  return usageQuantity * factor;
};

export const convertPriceToUsageUnit = (unit: IngredientUnit, storedPrice: number): number => {
  if (unit === 'kg' || unit === 'L') {
    return storedPrice / 1000;
  }
  return storedPrice;
};

export const getUsageUnitLabel = (unit: IngredientUnit): string => {
  if (unit === 'kg') {
    return 'g';
  }
  if (unit === 'L') {
    return 'ml';
  }
  return unit;
};
