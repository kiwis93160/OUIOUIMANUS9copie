export type RGB = [number, number, number];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const parseHexColor = (input: string): RGB | null => {
  const hex = input.replace('#', '').trim();

  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return [r, g, b];
  }

  if (hex.length === 4) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return [r, g, b];
  }

  if (hex.length === 6 || hex.length === 8) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return [r, g, b];
  }

  return null;
};

const parseRgbColor = (input: string): RGB | null => {
  const match = input.match(/rgba?\(([^)]+)\)/i);
  if (!match) {
    return null;
  }

  const [r, g, b] = match[1]
    .split(',')
    .slice(0, 3)
    .map(component => clamp(parseFloat(component.trim()), 0, 255));

  if ([r, g, b].some(value => Number.isNaN(value))) {
    return null;
  }

  return [r, g, b];
};

const hslToRgb = (h: number, s: number, l: number): RGB => {
  const hue = ((h % 360) + 360) % 360;
  const saturation = clamp(s, 0, 1);
  const lightness = clamp(l, 0, 1);

  if (saturation === 0) {
    const value = Math.round(lightness * 255);
    return [value, value, value];
  }

  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lightness - chroma / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (hue < 60) {
    r = chroma;
    g = x;
  } else if (hue < 120) {
    r = x;
    g = chroma;
  } else if (hue < 180) {
    g = chroma;
    b = x;
  } else if (hue < 240) {
    g = x;
    b = chroma;
  } else if (hue < 300) {
    r = x;
    b = chroma;
  } else {
    r = chroma;
    b = x;
  }

  const convert = (value: number) => Math.round((value + m) * 255);
  return [convert(r), convert(g), convert(b)];
};

const parseHslColor = (input: string): RGB | null => {
  const match = input.match(/hsla?\(([^)]+)\)/i);
  if (!match) {
    return null;
  }

  const [hue, saturation, lightness] = match[1]
    .split(',')
    .slice(0, 3)
    .map(component => component.trim());

  const h = parseFloat(hue);
  const s = parseFloat(saturation.replace('%', '')) / 100;
  const l = parseFloat(lightness.replace('%', '')) / 100;

  if ([h, s, l].some(value => Number.isNaN(value))) {
    return null;
  }

  return hslToRgb(h, s, l);
};

const parseColor = (input?: string): RGB | null => {
  if (!input) {
    return null;
  }

  const normalized = input.trim();
  if (!normalized) {
    return null;
  }

  if (normalized.startsWith('#')) {
    return parseHexColor(normalized);
  }

  if (normalized.toLowerCase().startsWith('rgb')) {
    return parseRgbColor(normalized);
  }

  if (normalized.toLowerCase().startsWith('hsl')) {
    return parseHslColor(normalized);
  }

  return null;
};

export const getColorLuminance = (color?: string): number | null => {
  const rgb = parseColor(color);
  if (!rgb) {
    return null;
  }

  const [r, g, b] = rgb.map(channel => channel / 255);
  const linear = [r, g, b].map(value => (value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4)));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
};

export const isColorDark = (color?: string, threshold = 0.55): boolean => {
  const luminance = getColorLuminance(color);
  if (luminance === null) {
    return false;
  }
  return luminance < threshold;
};

export const getAccessibleTextColor = (
  backgroundColor?: string,
  { lightColor = '#FFFFFF', darkColor = '#000000', threshold = 0.55 } = {},
): string => {
  const darkBackground = isColorDark(backgroundColor, threshold);
  return darkBackground ? lightColor : darkColor;
};
