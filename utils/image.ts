const CLOUDINARY_HOST_SUFFIX = 'cloudinary.com';

const DEFAULT_QUALITY = 'auto:good';

type OptimizationOptions = {
  width?: number;
  height?: number;
  fit?: 'fill' | 'fit' | 'scale' | 'crop' | 'pad';
  quality?: string;
};

const clampDimension = (value?: number) => {
  if (!value || !Number.isFinite(value)) {
    return undefined;
  }

  return Math.max(16, Math.round(value));
};

export const buildOptimizedCloudinaryUrl = (
  sourceUrl?: string | null,
  options: OptimizationOptions = {},
): string => {
  const trimmed = sourceUrl?.trim();
  if (!trimmed) {
    return '';
  }

  try {
    const parsedUrl = new URL(trimmed);
    if (!parsedUrl.hostname.endsWith(CLOUDINARY_HOST_SUFFIX)) {
      return trimmed;
    }

    const marker = '/upload/';
    const uploadIndex = parsedUrl.pathname.indexOf(marker);
    if (uploadIndex === -1) {
      return trimmed;
    }

    const beforeUpload = parsedUrl.pathname.slice(0, uploadIndex + marker.length);
    const afterUpload = parsedUrl.pathname.slice(uploadIndex + marker.length);

    const hasVersionPrefix = /^v\d+\//.test(afterUpload);
    const defaultWidth = clampDimension(options.width ?? 640);
    const defaultHeight = clampDimension(options.height);
    const quality = options.quality?.trim() || DEFAULT_QUALITY;
    const fit = options.fit ?? 'fill';

    const transformations = [
      'f_auto',
      `q_${quality}`,
      defaultWidth ? `w_${defaultWidth}` : '',
      defaultHeight ? `h_${defaultHeight}` : '',
      defaultWidth || defaultHeight ? `c_${fit}` : '',
      'dpr_auto',
    ].filter(Boolean);

    const alreadyHasTransformation = !hasVersionPrefix && afterUpload.includes('/');
    if (alreadyHasTransformation) {
      return trimmed;
    }

    parsedUrl.pathname = `${beforeUpload}${transformations.join(',')}/${afterUpload}`;
    return parsedUrl.toString();
  } catch {
    return trimmed;
  }
};
