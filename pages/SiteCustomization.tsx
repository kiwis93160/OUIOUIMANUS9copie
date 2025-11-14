import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Copy, Loader2, Upload, X } from 'lucide-react';
import Modal from '../components/Modal';
import SitePreviewCanvas, { resolveZoneFromElement } from '../components/SitePreviewCanvas';
import useSiteContent from '../hooks/useSiteContent';
import RichTextEditor from '../components/RichTextEditor';
import {
  CustomizationAsset,
  CustomizationAssetType,
  EditableElementKey,
  EditableZoneKey,
  ElementStyle,
  Product,
  RichTextValue,
  SectionStyle,
  SiteContent,
  STYLE_EDITABLE_ELEMENT_KEYS,
  INSTAGRAM_REVIEW_IDS,
} from '../types';
import { api } from '../services/api';
import { normalizeCloudinaryImageUrl, uploadCustomizationAsset } from '../services/cloudinary';
import { sanitizeFontFamilyName } from '../utils/fonts';

const FONT_FAMILY_SUGGESTIONS = [
  'Inter',
  'Poppins',
  'Roboto',
  'Montserrat',
  'Playfair Display',
  'Lora',
  'Open Sans',
  'Georgia, serif',
  'Arial, sans-serif',
] as const;

const FONT_SIZE_SUGGESTIONS = [
  '14px',
  '16px',
  '18px',
  '20px',
  '24px',
  'clamp(1rem, 2vw, 1.5rem)',
] as const;

const COLOR_SUGGESTIONS = [
  '#0f172a',
  '#111827',
  '#f8fafc',
  '#ffffff',
  '#e2e8f0',
  '#f97316',
  'transparent',
  'currentColor',
] as const;

const DEFAULT_COLOR_PICKER_VALUE = '#ffffff';

const isHexColor = (value: string): boolean => /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());

const TEXT_ELEMENT_KEYS = new Set<EditableElementKey>(STYLE_EDITABLE_ELEMENT_KEYS);

const BACKGROUND_ELEMENT_KEYS = new Set<EditableElementKey>([
  'navigation.style.background',
  'hero.style.background',
  'about.style.background',
  'menu.style.background',
  'instagramReviews.style.background',
  'findUs.style.background',
  'footer.style.background',
]);

const IMAGE_ELEMENT_KEYS = new Set<EditableElementKey>([
  'hero.backgroundImage',
  'about.image',
  'menu.image',
  'instagramReviews.image',
  'navigation.brandLogo',
  'navigation.staffLogo',
]);

const BASE_ELEMENT_LABELS: Partial<Record<EditableElementKey, string>> = {
  'navigation.brand': 'Nom de la marque',
  'navigation.brandLogo': 'Logo principal',
  'navigation.staffLogo': "Logo d'accès équipe",
  'navigation.links.home': 'Lien Accueil',
  'navigation.links.about': 'Lien À propos',
  'navigation.links.menu': 'Lien Menu',
  'navigation.links.contact': 'Lien Contact',
  'navigation.links.loginCta': "Bouton d'accès staff",
  'navigation.style.background': 'Fond de la navigation',
  'hero.title': 'Titre du hero',
  'hero.subtitle': 'Sous-titre du hero',
  'hero.ctaLabel': 'Bouton principal du hero',
  'hero.historyTitle': "Titre de l'historique",
  'hero.reorderCtaLabel': 'Bouton de réassort',
  'hero.backgroundImage': 'Image du hero',
  'hero.style.background': 'Fond du hero',
  'about.title': 'Titre À propos',
  'about.description': 'Texte À propos',
  'about.image': 'Image À propos',
  'about.style.background': 'Fond À propos',
  'menu.title': 'Titre du menu',
  'menu.ctaLabel': 'Bouton du menu',
  'menu.loadingLabel': 'Texte de chargement du menu',
  'menu.image': 'Image du menu',
  'menu.style.background': 'Fond du menu',
  'instagramReviews.title': 'Titre Avis Instagram',
  'instagramReviews.subtitle': 'Sous-titre Avis Instagram',
  'instagramReviews.image': 'Image centrale Avis Instagram',
  'instagramReviews.style.background': 'Fond Avis Instagram',
  'findUs.title': 'Titre Encuéntranos',
  'findUs.addressLabel': "Libellé de l'adresse (Encuéntranos)",
  'findUs.address': 'Adresse (Encuéntranos)',
  'findUs.cityLabel': "Libellé de contact",
  'findUs.city': 'Contact (Encuéntranos)',
  'findUs.hoursLabel': 'Libellé des horaires',
  'findUs.hours': 'Horaires',
  'findUs.mapLabel': 'Libellé du lien carte',
  'findUs.mapUrl': 'Lien personnalisé de la carte',
  'findUs.style.background': 'Fond Encuéntranos',
  'footer.text': 'Texte du pied de page',
  'footer.style.background': 'Fond du pied de page',
};

const ELEMENT_LABELS: Partial<Record<EditableElementKey, string>> = {
  ...BASE_ELEMENT_LABELS,
};

type DraftUpdater = (current: SiteContent) => SiteContent;

type CustomizationFieldType = 'text' | 'image' | 'background';

interface CustomizationFieldBase {
  id: string;
  label: string;
  description?: string;
  element: EditableElementKey;
  type: CustomizationFieldType;
}

interface TextCustomizationField extends CustomizationFieldBase {
  type: 'text';
  multiline?: boolean;
  allowRichText?: boolean;
  placeholder?: string;
  showStyleOptions?: boolean;
}

interface ImageCustomizationField extends CustomizationFieldBase {
  type: 'image';
  placeholder?: string;
}

interface BackgroundCustomizationField extends CustomizationFieldBase {
  type: 'background';
}

type CustomizationField =
  | TextCustomizationField
  | ImageCustomizationField
  | BackgroundCustomizationField;

interface CustomizationGroup {
  id: string;
  title: string;
  description?: string;
  fields: CustomizationField[];
}

interface CustomizationSection {
  id: string;
  title: string;
  description?: string;
  groups: CustomizationGroup[];
}

const createAssetId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `asset-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const guessAssetType = (file: File): CustomizationAssetType => {
  const { type, name } = file;
  if (type.startsWith('image/')) {
    return 'image';
  }
  if (type.startsWith('video/')) {
    return 'video';
  }
  if (type.startsWith('audio/')) {
    return 'audio';
  }
  if (type.includes('font')) {
    return 'font';
  }
  const extension = name.split('.').pop()?.toLowerCase();
  if (extension && ['ttf', 'otf', 'woff', 'woff2'].includes(extension)) {
    return 'font';
  }
  return 'raw';
};

const cloneSiteContent = (content: SiteContent): SiteContent => {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(content);
  }
  return JSON.parse(JSON.stringify(content)) as SiteContent;
};

const setNestedValue = (content: SiteContent, key: EditableElementKey, value: string | null): void => {
  const segments = key.split('.');
  const last = segments.pop();
  if (!last) {
    return;
  }

  let cursor: unknown = content;
  segments.forEach(segment => {
    if (cursor && typeof cursor === 'object') {
      const target = (cursor as Record<string, unknown>)[segment];
      if (target && typeof target === 'object') {
        (cursor as Record<string, unknown>)[segment] = Array.isArray(target)
          ? [...target]
          : { ...target };
      } else {
        (cursor as Record<string, unknown>)[segment] = {};
      }
      cursor = (cursor as Record<string, unknown>)[segment];
    }
  });

  if (cursor && typeof cursor === 'object') {
    (cursor as Record<string, unknown>)[last] = value;
  }
};

const applyElementStyleOverrides = (
  content: SiteContent,
  element: EditableElementKey,
  overrides: Partial<ElementStyle>,
): void => {
  const sanitized: ElementStyle = {};

  if (overrides.fontFamily && overrides.fontFamily.trim().length > 0) {
    sanitized.fontFamily = overrides.fontFamily.trim();
  }
  if (overrides.fontSize && overrides.fontSize.trim().length > 0) {
    sanitized.fontSize = overrides.fontSize.trim();
  }
  if (overrides.textColor && overrides.textColor.trim().length > 0) {
    sanitized.textColor = overrides.textColor.trim();
  }
  if (overrides.backgroundColor && overrides.backgroundColor.trim().length > 0) {
    sanitized.backgroundColor = overrides.backgroundColor.trim();
  }
  if (overrides.fontWeight && overrides.fontWeight.trim().length > 0) {
    sanitized.fontWeight = overrides.fontWeight.trim();
  }
  if (overrides.fontStyle && overrides.fontStyle.trim().length > 0) {
    sanitized.fontStyle = overrides.fontStyle.trim();
  }
  if (overrides.textShadow && overrides.textShadow.trim().length > 0) {
    sanitized.textShadow = overrides.textShadow.trim();
  }
  if (overrides.textAlign && overrides.textAlign.trim().length > 0) {
    sanitized.textAlign = overrides.textAlign.trim();
  }

  const nextStyles = { ...content.elementStyles };
  if (Object.keys(sanitized).length === 0) {
    delete nextStyles[element];
  } else {
    nextStyles[element] = sanitized;
  }
  content.elementStyles = nextStyles;
};

const applyElementRichText = (
  content: SiteContent,
  element: EditableElementKey,
  value: RichTextValue | null,
): void => {
  const next = { ...content.elementRichText };
  if (value && value.html.trim().length > 0) {
    next[element] = value;
  } else {
    delete next[element];
  }
  content.elementRichText = next;
};

const applySectionBackground = (
  content: SiteContent,
  element: EditableElementKey,
  background: SectionStyle['background'],
): void => {
  const zone = resolveZoneFromElement(element);
  const zoneContent = { ...content[zone] } as typeof content[EditableZoneKey];
  const style = { ...zoneContent.style, background: { ...background } };
  zoneContent.style = style;
  (content as Record<EditableZoneKey, typeof zoneContent>)[zone] = zoneContent;
};

const appendAsset = (content: SiteContent, asset: CustomizationAsset): void => {
  const library = content.assets?.library ?? [];
  const existingIndex = library.findIndex(item => item.url === asset.url || item.id === asset.id);
  const nextLibrary = existingIndex >= 0
    ? library.map((item, index) => (index === existingIndex ? asset : item))
    : [...library, asset];
  content.assets = { ...content.assets, library: nextLibrary };
};

const getPlainTextValue = (content: SiteContent, key: EditableElementKey): string => {
  const segments = key.split('.');
  let cursor: unknown = content;
  for (const segment of segments) {
    if (!cursor || typeof cursor !== 'object') {
      return '';
    }
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return typeof cursor === 'string' ? cursor : '';
};

const getImageValue = (content: SiteContent, key: EditableElementKey): string | null => {
  const value = getPlainTextValue(content, key);
  return value.trim().length > 0 ? value : null;
};

const getElementStyle = (content: SiteContent, key: EditableElementKey): ElementStyle =>
  content.elementStyles[key] ?? {};

const getElementRichTextValue = (content: SiteContent, key: EditableElementKey): RichTextValue | null =>
  content.elementRichText[key] ?? null;

const getSectionBackground = (content: SiteContent, key: EditableElementKey): SectionStyle['background'] => {
  const zone = resolveZoneFromElement(key);
  return content[zone].style.background;
};

const createAssetFromFile = (file: File, url: string): CustomizationAsset => {
  const baseName = file.name.replace(/\.[^/.]+$/, '').trim() || 'media';
  const type = guessAssetType(file);
  const name = type === 'font' ? sanitizeFontFamilyName(baseName) : baseName;
  return {
    id: createAssetId(),
    name,
    url,
    format: file.type || 'application/octet-stream',
    bytes: file.size,
    type,
    createdAt: new Date().toISOString(),
  };
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) {
    return '0 o';
  }
  const units = ['o', 'Ko', 'Mo', 'Go'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};

const CUSTOMIZATION_SECTIONS: CustomizationSection[] = [
  {
    id: 'navigation',
    title: 'Navigation',
    description: 'Logos, liens principaux et fond du menu supérieur.',
    groups: [
      {
        id: 'navigation-main',
        title: 'Contenu principal',
        fields: [
          { id: 'navigation-brand', type: 'text', element: 'navigation.brand', label: 'Nom de la marque' },
          {
            id: 'navigation-home',
            type: 'text',
            element: 'navigation.links.home',
            label: 'Libellé du lien Accueil',
          },
          {
            id: 'navigation-about',
            type: 'text',
            element: 'navigation.links.about',
            label: 'Libellé du lien À propos',
          },
          {
            id: 'navigation-menu',
            type: 'text',
            element: 'navigation.links.menu',
            label: 'Libellé du lien Menu',
          },
          {
            id: 'navigation-contact',
            type: 'text',
            element: 'navigation.links.contact',
            label: 'Libellé du lien Contact',
          },
          {
            id: 'navigation-login',
            type: 'text',
            element: 'navigation.links.loginCta',
            label: "Texte du bouton d'accès staff",
          },
        ],
      },
      {
        id: 'navigation-branding',
        title: 'Identité visuelle',
        fields: [
          {
            id: 'navigation-brand-logo',
            type: 'image',
            element: 'navigation.brandLogo',
            label: 'Logo principal',
            description: 'PNG ou SVG recommandé pour un rendu net sur tous les écrans.',
          },
          {
            id: 'navigation-staff-logo',
            type: 'image',
            element: 'navigation.staffLogo',
            label: "Logo d'accès équipe",
            description: "S'affiche pour le bouton d'accès staff si disponible.",
          },
        ],
      },
      {
        id: 'navigation-background',
        title: 'Fond et mise en forme',
        fields: [
          {
            id: 'navigation-style-background',
            type: 'background',
            element: 'navigation.style.background',
            label: 'Fond du bandeau',
          },
        ],
      },
    ],
  },
  {
    id: 'hero',
    title: 'Section Hero',
    description: 'Grand bandeau d’ouverture avec accroche et image de fond.',
    groups: [
      {
        id: 'hero-content',
        title: 'Contenu',
        fields: [
          {
            id: 'hero-title',
            type: 'text',
            element: 'hero.title',
            label: 'Titre principal',
            allowRichText: true,
            showStyleOptions: true,
            multiline: true,
          },
          {
            id: 'hero-subtitle',
            type: 'text',
            element: 'hero.subtitle',
            label: 'Sous-titre',
            allowRichText: true,
            showStyleOptions: true,
            multiline: true,
          },
          {
            id: 'hero-cta',
            type: 'text',
            element: 'hero.ctaLabel',
            label: 'Bouton principal',
          },
          {
            id: 'hero-history',
            type: 'text',
            element: 'hero.historyTitle',
            label: "Titre du bloc historique",
            multiline: true,
          },
          {
            id: 'hero-reorder',
            type: 'text',
            element: 'hero.reorderCtaLabel',
            label: 'Bouton de réassort',
          },
        ],
      },
      {
        id: 'hero-visuals',
        title: 'Visuels et ambiance',
        fields: [
          {
            id: 'hero-background-image',
            type: 'image',
            element: 'hero.backgroundImage',
            label: 'Image de fond',
            description: 'Utilisez des images haute résolution. Optimisation Cloudinary recommandée.',
          },
          {
            id: 'hero-background-style',
            type: 'background',
            element: 'hero.style.background',
            label: 'Couleurs et ambiance',
          },
        ],
      },
    ],
  },
  {
    id: 'about',
    title: 'Section À propos',
    description: 'Présentation de votre histoire et visuels associés.',
    groups: [
      {
        id: 'about-content',
        title: 'Contenu',
        fields: [
          {
            id: 'about-title',
            type: 'text',
            element: 'about.title',
            label: 'Titre',
            showStyleOptions: true,
          },
          {
            id: 'about-description',
            type: 'text',
            element: 'about.description',
            label: 'Texte descriptif',
            allowRichText: true,
            multiline: true,
            showStyleOptions: true,
          },
        ],
      },
      {
        id: 'about-visuals',
        title: 'Visuels',
        fields: [
          {
            id: 'about-image',
            type: 'image',
            element: 'about.image',
            label: 'Image principale',
            description: 'Photo illustrative de votre établissement ou de vos produits.',
          },
          {
            id: 'about-background',
            type: 'background',
            element: 'about.style.background',
            label: 'Fond de section',
          },
        ],
      },
    ],
  },
  {
    id: 'menu',
    title: 'Section Menu',
    description: 'Mettre en avant vos plats signatures et CTA vers la commande.',
    groups: [
      {
        id: 'menu-content',
        title: 'Contenu',
        fields: [
          { id: 'menu-title', type: 'text', element: 'menu.title', label: 'Titre du menu', showStyleOptions: true },
          { id: 'menu-cta', type: 'text', element: 'menu.ctaLabel', label: 'Texte du bouton', showStyleOptions: true },
          {
            id: 'menu-loading',
            type: 'text',
            element: 'menu.loadingLabel',
            label: 'Message de chargement',
            multiline: true,
          },
        ],
      },
      {
        id: 'menu-visuals',
        title: 'Visuels',
        fields: [
          {
            id: 'menu-image',
            type: 'image',
            element: 'menu.image',
            label: 'Image d’illustration',
          },
          {
            id: 'menu-background',
            type: 'background',
            element: 'menu.style.background',
            label: 'Fond de section',
          },
        ],
      },
    ],
  },
  {
    id: 'instagram',
    title: 'Section Avis Instagram',
    description: 'Personnalisez le carrousel social, ses textes et ses visuels.',
    groups: [
      {
        id: 'instagram-header',
        title: 'En-tête de section',
        fields: [
          {
            id: 'instagram-title',
            type: 'text',
            element: 'instagramReviews.title',
            label: 'Titre de la section',
            showStyleOptions: true,
          },
          {
            id: 'instagram-subtitle',
            type: 'text',
            element: 'instagramReviews.subtitle',
            label: 'Sous-titre',
            allowRichText: true,
            multiline: true,
          },
          {
            id: 'instagram-image',
            type: 'image',
            element: 'instagramReviews.image',
            label: 'Image centrale',
            description: 'Illustration affichée à droite du carrousel.',
          },
          {
            id: 'instagram-background',
            type: 'background',
            element: 'instagramReviews.style.background',
            label: 'Fond de section',
          },
        ],
      },
      ...INSTAGRAM_REVIEW_IDS.map((reviewId, index) => ({
        id: `instagram-review-${reviewId}`,
        title: `Carte témoignage ${index + 1}`,
        description:
          "Personnalisez le contenu de la carte et les médias associés (avatar, visuel de post, mise en avant).",
        fields: [
          {
            id: `instagram-review-${reviewId}-name`,
            type: 'text',
            element: `instagramReviews.reviews.${reviewId}.name` as EditableElementKey,
            label: 'Nom',
          },
          {
            id: `instagram-review-${reviewId}-handle`,
            type: 'text',
            element: `instagramReviews.reviews.${reviewId}.handle` as EditableElementKey,
            label: 'Handle Instagram',
          },
          {
            id: `instagram-review-${reviewId}-timeAgo`,
            type: 'text',
            element: `instagramReviews.reviews.${reviewId}.timeAgo` as EditableElementKey,
            label: 'Durée depuis la publication',
          },
          {
            id: `instagram-review-${reviewId}-message`,
            type: 'text',
            element: `instagramReviews.reviews.${reviewId}.message` as EditableElementKey,
            label: 'Message principal',
            multiline: true,
            allowRichText: true,
          },
          {
            id: `instagram-review-${reviewId}-highlight`,
            type: 'text',
            element: `instagramReviews.reviews.${reviewId}.highlight` as EditableElementKey,
            label: 'Message mis en avant',
            multiline: true,
          },
          {
            id: `instagram-review-${reviewId}-highlight-caption`,
            type: 'text',
            element: `instagramReviews.reviews.${reviewId}.highlightCaption` as EditableElementKey,
            label: 'Description du highlight',
            multiline: true,
          },
          {
            id: `instagram-review-${reviewId}-badge`,
            type: 'text',
            element: `instagramReviews.reviews.${reviewId}.badgeLabel` as EditableElementKey,
            label: 'Badge',
          },
          {
            id: `instagram-review-${reviewId}-location`,
            type: 'text',
            element: `instagramReviews.reviews.${reviewId}.location` as EditableElementKey,
            label: 'Localisation',
          },
          {
            id: `instagram-review-${reviewId}-avatar`,
            type: 'image',
            element: `instagramReviews.reviews.${reviewId}.avatarUrl` as EditableElementKey,
            label: 'Avatar',
          },
          {
            id: `instagram-review-${reviewId}-highlight-image`,
            type: 'image',
            element: `instagramReviews.reviews.${reviewId}.highlightImageUrl` as EditableElementKey,
            label: 'Image highlight',
          },
          {
            id: `instagram-review-${reviewId}-post-image`,
            type: 'image',
            element: `instagramReviews.reviews.${reviewId}.postImageUrl` as EditableElementKey,
            label: 'Image du post',
          },
          {
            id: `instagram-review-${reviewId}-post-alt`,
            type: 'text',
            element: `instagramReviews.reviews.${reviewId}.postImageAlt` as EditableElementKey,
            label: "Texte alternatif de l'image du post",
          },
        ],
      })),
    ],
  },
  {
    id: 'find-us',
    title: 'Section Encuéntranos',
    description: 'Coordonnées, horaires et informations de contact.',
    groups: [
      {
        id: 'find-us-content',
        title: 'Contenu',
        fields: [
          { id: 'find-us-title', type: 'text', element: 'findUs.title', label: 'Titre', showStyleOptions: true },
          {
            id: 'find-us-address-label',
            type: 'text',
            element: 'findUs.addressLabel',
            label: "Libellé de l'adresse",
          },
          { id: 'find-us-address', type: 'text', element: 'findUs.address', label: 'Adresse complète', multiline: true },
          {
            id: 'find-us-city-label',
            type: 'text',
            element: 'findUs.cityLabel',
            label: 'Libellé de contact',
          },
          { id: 'find-us-city', type: 'text', element: 'findUs.city', label: 'Contact (mail ou téléphone)' },
          {
            id: 'find-us-hours-label',
            type: 'text',
            element: 'findUs.hoursLabel',
            label: 'Libellé des horaires',
          },
          { id: 'find-us-hours', type: 'text', element: 'findUs.hours', label: 'Horaires détaillés', multiline: true },
          {
            id: 'find-us-map-label',
            type: 'text',
            element: 'findUs.mapLabel',
            label: 'Libellé du lien carte',
          },
          {
            id: 'find-us-map-url',
            type: 'text',
            element: 'findUs.mapUrl',
            label: 'Lien personnalisé de la carte',
            description: 'Indiquez une URL Google Maps ou tout lien d\'itinéraire à afficher.',
            placeholder: 'https://maps.google.com/...',
          },
        ],
      },
      {
        id: 'find-us-background',
        title: 'Fond',
        fields: [
          {
            id: 'find-us-style-background',
            type: 'background',
            element: 'findUs.style.background',
            label: 'Personnalisation du fond',
          },
        ],
      },
    ],
  },
  {
    id: 'footer',
    title: 'Pied de page',
    description: 'Dernière section visible de la page d’accueil.',
    groups: [
      {
        id: 'footer-content',
        title: 'Contenu',
        fields: [
          {
            id: 'footer-text',
            type: 'text',
            element: 'footer.text',
            label: 'Texte du pied de page',
            multiline: true,
            allowRichText: true,
            showStyleOptions: true,
          },
        ],
      },
      {
        id: 'footer-background',
        title: 'Fond',
        fields: [
          {
            id: 'footer-style-background',
            type: 'background',
            element: 'footer.style.background',
            label: 'Couleur ou image de fond',
          },
        ],
      },
    ],
  },
];

type ApplyUpdater = (updater: DraftUpdater) => void;

type AssetAppender = (asset: CustomizationAsset) => void;

type FieldMeta = {
  section: CustomizationSection;
  group: CustomizationGroup;
  field: CustomizationField;
};
type RectSnapshot = {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

interface FloatingEditorState {
  element: EditableElementKey;
  anchor: RectSnapshot | null;
  boundary: RectSnapshot | null;
}

const snapshotRect = (rect: DOMRect | DOMRectReadOnly | null): RectSnapshot | null => {
  if (!rect) {
    return null;
  }
  return {
    top: rect.top,
    left: rect.left,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
};

interface FloatingEditorPanelProps {
  title: string;
  description?: string;
  anchor: RectSnapshot | null;
  boundary: RectSnapshot | null;
  onClose: () => void;
  children: React.ReactNode;
}

const FloatingEditorPanel: React.FC<FloatingEditorPanelProps> = ({
  title,
  description,
  anchor,
  boundary,
  onClose,
  children,
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [placement, setPlacement] = useState<'above' | 'below'>('above');

  const updatePosition = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const node = panelRef.current;
    if (!node) {
      return;
    }
    const panelRect = node.getBoundingClientRect();
    const fallbackBoundary: RectSnapshot =
      boundary ?? {
        top: 16,
        left: 16,
        right: window.innerWidth - 16,
        bottom: window.innerHeight - 16,
        width: Math.max(window.innerWidth - 32, panelRect.width),
        height: Math.max(window.innerHeight - 32, panelRect.height),
      };
    const fallbackTarget: RectSnapshot =
      anchor ?? {
        top: fallbackBoundary.top + fallbackBoundary.height / 2,
        bottom: fallbackBoundary.top + fallbackBoundary.height / 2,
        left: fallbackBoundary.left + fallbackBoundary.width / 2,
        right: fallbackBoundary.left + fallbackBoundary.width / 2,
        width: 0,
        height: 0,
      };

    const centerX = fallbackTarget.left + fallbackTarget.width / 2;
    const minLeft = fallbackBoundary.left + 8;
    const maxLeft = fallbackBoundary.right - panelRect.width - 8;
    const safeMaxLeft = maxLeft < minLeft ? minLeft : maxLeft;
    const nextLeft = Math.min(Math.max(centerX - panelRect.width / 2, minLeft), safeMaxLeft);

    let nextTop = fallbackTarget.top - panelRect.height - 12;
    let nextPlacement: 'above' | 'below' = 'above';
    const minTop = fallbackBoundary.top + 8;
    if (nextTop < minTop) {
      nextTop = fallbackTarget.bottom + 12;
      nextPlacement = 'below';
      if (nextTop + panelRect.height > fallbackBoundary.bottom - 8) {
        nextTop = fallbackBoundary.bottom - panelRect.height - 8;
      }
    }

    setPlacement(nextPlacement);
    setPosition({
      top: Math.max(minTop, nextTop),
      left: nextLeft,
    });
  }, [anchor, boundary]);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    updatePosition();
  }, [updatePosition, children]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const handle = () => updatePosition();
    window.addEventListener('resize', handle);
    window.addEventListener('scroll', handle, true);
    return () => {
      window.removeEventListener('resize', handle);
      window.removeEventListener('scroll', handle, true);
    };
  }, [updatePosition]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
    return () => undefined;
  }, [onClose]);

  return (
    <div className="floating-editor fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/10" onClick={onClose} />
      <div
        ref={panelRef}
        className="pointer-events-auto w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
        style={{ position: 'fixed', top: position.top, left: position.left }}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">
              Édition {placement === 'above' ? 'au-dessus' : 'au-dessous'} de l’élément
            </p>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
          </div>
          <button
            type="button"
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            onClick={onClose}
            aria-label="Fermer l’éditeur"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">{children}</div>
      </div>
    </div>
  );
};

interface TextFieldEditorContentProps {
  element: EditableElementKey;
  draft: SiteContent;
  onApply: ApplyUpdater;
  fontOptions: readonly string[];
  onAssetAdded: AssetAppender;
  multiline?: boolean;
  allowRichText?: boolean;
  showStyleOptions?: boolean;
  placeholder?: string;
}

const TextFieldEditorContent: React.FC<TextFieldEditorContentProps> = ({
  element,
  draft,
  onApply,
  fontOptions,
  onAssetAdded,
  multiline = false,
  allowRichText = true,
  showStyleOptions = false,
  placeholder,
}) => {
  const initialPlain = getPlainTextValue(draft, element);
  const initialRichText = getElementRichTextValue(draft, element);
  const elementStyle = getElementStyle(draft, element);

  const [plainText, setPlainText] = useState<string>(initialPlain);
  const [richText, setRichText] = useState<RichTextValue | null>(initialRichText);
  const [isRichTextOpen, setIsRichTextOpen] = useState<boolean>(Boolean(initialRichText));
  const [fontFamily, setFontFamily] = useState<string>(elementStyle.fontFamily ?? '');
  const [fontSize, setFontSize] = useState<string>(elementStyle.fontSize ?? '');
  const [textColor, setTextColor] = useState<string>(elementStyle.textColor ?? '');
  const [backgroundColor, setBackgroundColor] = useState<string>(elementStyle.backgroundColor ?? '');
  const [fontWeight, setFontWeight] = useState<string>(elementStyle.fontWeight ?? '');
  const [fontStyleValue, setFontStyleValue] = useState<string>(elementStyle.fontStyle ?? '');
  const [textShadow, setTextShadow] = useState<string>(elementStyle.textShadow ?? '');
  const [textAlign, setTextAlign] = useState<string>(elementStyle.textAlign ?? '');
  const [fontUploadError, setFontUploadError] = useState<string | null>(null);
  const [uploadingFont, setUploadingFont] = useState<boolean>(false);

  useEffect(() => {
    setPlainText(initialPlain);
    setRichText(initialRichText);
    setIsRichTextOpen(Boolean(initialRichText));
    setFontFamily(elementStyle.fontFamily ?? '');
    setFontSize(elementStyle.fontSize ?? '');
    setTextColor(elementStyle.textColor ?? '');
    setBackgroundColor(elementStyle.backgroundColor ?? '');
    setFontWeight(elementStyle.fontWeight ?? '');
    setFontStyleValue(elementStyle.fontStyle ?? '');
    setTextShadow(elementStyle.textShadow ?? '');
    setTextAlign(elementStyle.textAlign ?? '');
  }, [
    initialPlain,
    initialRichText,
    elementStyle.fontFamily,
    elementStyle.fontSize,
    elementStyle.textColor,
    elementStyle.backgroundColor,
    elementStyle.fontWeight,
    elementStyle.fontStyle,
    elementStyle.textShadow,
    elementStyle.textAlign,
  ]);

  const handleApply = useCallback(() => {
    const sanitized = plainText;
    onApply(current => {
      setNestedValue(current, element, sanitized);
      applyElementRichText(current, element, isRichTextOpen ? richText : null);
      if (showStyleOptions) {
        applyElementStyleOverrides(current, element, {
          fontFamily,
          fontSize,
          textColor,
          backgroundColor,
          fontWeight,
          fontStyle: fontStyleValue,
          textShadow,
          textAlign,
        });
      }
      return current;
    });
  }, [
    backgroundColor,
    element,
    fontFamily,
    fontSize,
    fontStyleValue,
    fontWeight,
    isRichTextOpen,
    onApply,
    plainText,
    richText,
    showStyleOptions,
    textAlign,
    textColor,
    textShadow,
  ]);

  const handleResetStyle = useCallback(() => {
    setFontFamily('');
    setFontSize('');
    setTextColor('');
    setBackgroundColor('');
    setFontWeight('');
    setFontStyleValue('');
    setTextShadow('');
    setTextAlign('');
    onApply(current => {
      applyElementStyleOverrides(current, element, {});
      return current;
    });
  }, [element, onApply]);

  const handleToggleRichText = () => {
    if (isRichTextOpen) {
      setIsRichTextOpen(false);
      setRichText(null);
      onApply(current => {
        applyElementRichText(current, element, null);
        return current;
      });
    } else {
      setIsRichTextOpen(true);
    }
  };

  const handleFontUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setFontUploadError(null);
    setUploadingFont(true);
    try {
      const url = await uploadCustomizationAsset(file, { tags: [guessAssetType(file)] });
      const asset = createAssetFromFile(file, url);
      onAssetAdded(asset);
      setFontFamily(asset.name);
    } catch (err) {
      setFontUploadError(
        err instanceof Error ? err.message : 'Impossible de téléverser la police. Réessayez plus tard.',
      );
    } finally {
      setUploadingFont(false);
      event.target.value = '';
    }
  };

  const trimmedWeight = fontWeight.trim().toLowerCase();
  const trimmedFontStyle = fontStyleValue.trim().toLowerCase();
  const isBoldActive = trimmedWeight.length > 0 && trimmedWeight !== 'normal';
  const isItalicActive = trimmedFontStyle === 'italic';

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor={`${element}-input`}>
          Contenu
        </label>
        {multiline ? (
          <textarea
            id={`${element}-input`}
            className="ui-textarea w-full"
            rows={4}
            value={plainText}
            placeholder={placeholder}
            onChange={event => setPlainText(event.target.value)}
          />
        ) : (
          <input
            id={`${element}-input`}
            className="ui-input w-full"
            value={plainText}
            placeholder={placeholder}
            onChange={event => setPlainText(event.target.value)}
          />
        )}
      </div>

      {allowRichText && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-700">Mise en forme avancée</p>
              <p className="text-xs text-slate-500">
                Activez l’éditeur riche pour ajouter du gras, de l’italique et des liens.
              </p>
            </div>
            <button
              type="button"
              className="ui-btn-secondary whitespace-nowrap"
              onClick={handleToggleRichText}
            >
              {isRichTextOpen ? 'Désactiver' : 'Activer'}
            </button>
          </div>
          {isRichTextOpen && (
            <RichTextEditor
              id={`${element}-rich`}
              value={richText}
              fallback={plainText}
              onChange={value => {
                setRichText(value);
                if (value) {
                  setPlainText(value.plainText);
                }
              }}
              className="rounded-xl border border-slate-200 bg-white"
              placeholder="Saisissez votre texte..."
            />
          )}
        </div>
      )}

      {showStyleOptions && (
        <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-700">Style du texte</p>
            <button type="button" className="text-sm font-medium text-brand-primary" onClick={handleResetStyle}>
              Réinitialiser
            </button>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Styles rapides
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`ui-btn-secondary flex items-center gap-2 text-sm ${
                  isBoldActive ? 'border-brand-primary text-brand-primary' : ''
                }`}
                onClick={() => setFontWeight(isBoldActive ? '' : '700')}
                aria-pressed={isBoldActive}
              >
                <span className="font-semibold">Gras</span>
              </button>
              <button
                type="button"
                className={`ui-btn-secondary flex items-center gap-2 text-sm ${
                  isItalicActive ? 'border-brand-primary text-brand-primary' : ''
                }`}
                onClick={() => setFontStyleValue(isItalicActive ? '' : 'italic')}
                aria-pressed={isItalicActive}
              >
                <span className="italic">Italique</span>
              </button>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Police
              </label>
              <input
                className="ui-input w-full"
                value={fontFamily}
                onChange={event => setFontFamily(event.target.value)}
                list={`${element}-font-options`}
                placeholder="Ex: Poppins"
              />
              <datalist id={`${element}-font-options`}>
                {fontOptions.map(option => (
                  <option key={option} value={option} />
                ))}
              </datalist>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <label className="ui-btn-secondary relative cursor-pointer text-xs">
                  <input
                    type="file"
                    accept=".woff,.woff2,.ttf,.otf"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    onChange={handleFontUpload}
                    disabled={uploadingFont}
                  />
                  <Upload className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                  Importer une police
                </label>
                {uploadingFont && (
                  <Loader2 className="h-4 w-4 animate-spin text-brand-primary" aria-hidden="true" />
                )}
                {fontUploadError && <span className="text-xs text-amber-600">{fontUploadError}</span>}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Taille du texte
              </label>
              <input
                className="ui-input w-full"
                value={fontSize}
                onChange={event => setFontSize(event.target.value)}
                list={`${element}-size-options`}
                placeholder="Ex: 18px"
              />
              <datalist id={`${element}-size-options`}>
                {FONT_SIZE_SUGGESTIONS.map(size => (
                  <option key={size} value={size} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Couleur du texte
              </label>
              <input
                className="ui-input w-full"
                value={textColor}
                onChange={event => setTextColor(event.target.value)}
                placeholder="Ex: #0f172a"
              />
              <div className="flex flex-wrap gap-2">
                {COLOR_SUGGESTIONS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className="h-8 w-8 rounded-full border border-slate-200"
                    style={{ backgroundColor: color }}
                    onClick={() => setTextColor(color)}
                  >
                    <span className="sr-only">{color}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Fond du texte
              </label>
              <input
                className="ui-input w-full"
                value={backgroundColor}
                onChange={event => setBackgroundColor(event.target.value)}
                placeholder="Ex: transparent"
              />
              <div className="flex flex-wrap gap-2">
                {COLOR_SUGGESTIONS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className="h-8 w-8 rounded-full border border-slate-200"
                    style={{ backgroundColor: color }}
                    onClick={() => setBackgroundColor(color)}
                  >
                    <span className="sr-only">{color}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Alignement
              </label>
              <select
                className="ui-input w-full"
                value={textAlign}
                onChange={event => setTextAlign(event.target.value)}
              >
                <option value="">Hérité de la section</option>
                <option value="left">Aligné à gauche</option>
                <option value="center">Centré</option>
                <option value="right">Aligné à droite</option>
                <option value="justify">Justifié</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Ombre du texte
              </label>
              <input
                className="ui-input w-full"
                value={textShadow}
                onChange={event => setTextShadow(event.target.value)}
                placeholder="0px 2px 4px rgba(0,0,0,0.25)"
              />
              <p className="text-xs text-slate-500">
                Utilisez la notation CSS pour appliquer une ombre personnalisée.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" className="ui-btn-secondary" onClick={() => {
          setPlainText(initialPlain);
          setRichText(initialRichText);
          setIsRichTextOpen(Boolean(initialRichText));
          setFontFamily(elementStyle.fontFamily ?? '');
          setFontSize(elementStyle.fontSize ?? '');
          setTextColor(elementStyle.textColor ?? '');
          setBackgroundColor(elementStyle.backgroundColor ?? '');
          setFontWeight(elementStyle.fontWeight ?? '');
          setFontStyleValue(elementStyle.fontStyle ?? '');
          setTextShadow(elementStyle.textShadow ?? '');
          setTextAlign(elementStyle.textAlign ?? '');
        }}>
          Réinitialiser les modifications
        </button>
        <button type="button" className="ui-btn-primary" onClick={handleApply}>
          Appliquer
        </button>
      </div>
    </div>
  );
};

interface ImageFieldEditorContentProps {
  element: EditableElementKey;
  draft: SiteContent;
  onApply: ApplyUpdater;
  onAssetAdded: AssetAppender;
  placeholder?: string;
}

const ImageFieldEditorContent: React.FC<ImageFieldEditorContentProps> = ({
  element,
  draft,
  onApply,
  onAssetAdded,
  placeholder,
}) => {
  const initialImage = getImageValue(draft, element) ?? '';
  const [imageUrl, setImageUrl] = useState<string>(initialImage);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  useEffect(() => {
    setImageUrl(initialImage);
  }, [initialImage]);

  const handleApply = () => {
    const trimmed = imageUrl.trim();
    const normalized = normalizeCloudinaryImageUrl(trimmed) ?? (trimmed.length > 0 ? trimmed : null);

    onApply(current => {
      setNestedValue(current, element, normalized);
      return current;
    });
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const url = await uploadCustomizationAsset(file, { tags: [guessAssetType(file)] });
      const asset = createAssetFromFile(file, url);
      onAssetAdded(asset);
      setImageUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Téléversement impossible. Vérifiez votre connexion.");
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const previewUrl = imageUrl.trim();

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor={`${element}-image`}>
          URL de l'image ou du média
        </label>
        <input
          id={`${element}-image`}
          className="ui-input w-full"
          value={imageUrl}
          placeholder={placeholder ?? 'https://'}
          onChange={event => setImageUrl(event.target.value)}
        />
        <p className="text-xs text-slate-500">
          Collez une URL Cloudinary ou téléversez un fichier pour l’ajouter automatiquement.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="ui-btn-secondary relative cursor-pointer">
          <input
            type="file"
            accept="image/*,video/*,audio/*,.ttf,.otf,.woff,.woff2"
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={handleUpload}
            disabled={uploading}
          />
          <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
          Importer un média
        </label>
        {uploading && <Loader2 className="h-4 w-4 animate-spin text-brand-primary" aria-hidden="true" />}
        <button
          type="button"
          className="text-sm font-medium text-brand-primary hover:text-brand-primary/80"
          onClick={() => setImageUrl('')}
        >
          Supprimer le média
        </button>
      </div>
      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          <AlertTriangle className="mt-0.5 h-4 w-4" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}
      {previewUrl && (
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <img src={previewUrl} alt="Aperçu" className="h-48 w-full object-cover" />
        </div>
      )}
      <div className="flex justify-end">
        <button type="button" className="ui-btn-primary" onClick={handleApply}>
          Appliquer
        </button>
      </div>
    </div>
  );
};

interface BackgroundFieldEditorContentProps {
  element: EditableElementKey;
  draft: SiteContent;
  onApply: ApplyUpdater;
  onAssetAdded: AssetAppender;
}

const BackgroundFieldEditorContent: React.FC<BackgroundFieldEditorContentProps> = ({
  element,
  draft,
  onApply,
  onAssetAdded,
}) => {
  const background = getSectionBackground(draft, element);
  const [backgroundType, setBackgroundType] = useState<SectionStyle['background']['type']>(background.type);
  const [color, setColor] = useState<string>(background.color);
  const [imageUrl, setImageUrl] = useState<string>(background.image ?? '');
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  const colorPickerValue = isHexColor(color) ? color : DEFAULT_COLOR_PICKER_VALUE;

  const handleColorPickerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextColor = event.target.value;
    setColor(nextColor);
    setBackgroundType('color');
  };

  const handleColorInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextColor = event.target.value;
    setColor(nextColor);
    if (nextColor.trim().length > 0) {
      setBackgroundType('color');
    }
  };

  useEffect(() => {
    setBackgroundType(background.type);
    setColor(background.color);
    setImageUrl(background.image ?? '');
  }, [background.type, background.color, background.image]);

  const handleApply = () => {
    const trimmedColor = color.trim() || 'transparent';
    const trimmedImage = imageUrl.trim();
    const normalizedImage = normalizeCloudinaryImageUrl(trimmedImage) ?? (trimmedImage.length > 0 ? trimmedImage : null);

    const imageToUse = backgroundType === 'image' && normalizedImage ? normalizedImage : null;

    onApply(current => {
      applySectionBackground(current, element, {
        type: imageToUse ? 'image' : 'color',
        color: trimmedColor,
        image: imageToUse,
      });
      return current;
    });

    if (!imageToUse) {
      setBackgroundType('color');
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const url = await uploadCustomizationAsset(file, { tags: [guessAssetType(file)] });
      const asset = createAssetFromFile(file, url);
      onAssetAdded(asset);
      setImageUrl(url);
      setBackgroundType('image');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Téléversement impossible.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-3">
        <button
          type="button"
          className={`ui-btn-secondary flex-1 ${backgroundType === 'color' ? 'ring-2 ring-brand-primary' : ''}`}
          onClick={() => setBackgroundType('color')}
        >
          Couleur
        </button>
        <button
          type="button"
          className={`ui-btn-secondary flex-1 ${backgroundType === 'image' ? 'ring-2 ring-brand-primary' : ''}`}
          onClick={() => setBackgroundType('image')}
        >
          Image
        </button>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium text-slate-700" htmlFor={`${element}-background-color`}>
          Couleur
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="color"
            className="h-10 w-16 cursor-pointer rounded-md border border-slate-200 bg-white"
            value={colorPickerValue}
            onChange={handleColorPickerChange}
            aria-label="Sélectionner une couleur"
          />
          <input
            id={`${element}-background-color`}
            className="ui-input flex-1 min-w-[12rem]"
            value={color}
            onChange={handleColorInputChange}
            placeholder="#ffffff ou transparent"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {COLOR_SUGGESTIONS.map(colorValue => (
            <button
              key={colorValue}
              type="button"
              className="h-8 w-8 rounded-full border border-slate-200"
              style={{ backgroundColor: colorValue }}
              onClick={() => {
                setColor(colorValue);
                setBackgroundType('color');
              }}
            >
              <span className="sr-only">{colorValue}</span>
            </button>
          ))}
        </div>
      </div>

      {backgroundType === 'image' && (
        <div className="space-y-3">
          <label className="text-sm font-medium text-slate-700" htmlFor={`${element}-background-image`}>
            Image de fond
          </label>
          <input
            id={`${element}-background-image`}
            className="ui-input w-full"
            value={imageUrl}
            onChange={event => setImageUrl(event.target.value)}
            placeholder="https://"
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="ui-btn-secondary relative cursor-pointer">
              <input
                type="file"
                accept="image/*,video/*"
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={handleUpload}
                disabled={uploading}
              />
              <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
              Importer une image
            </label>
            {uploading && <Loader2 className="h-4 w-4 animate-spin text-brand-primary" aria-hidden="true" />}
            <button
              type="button"
              className="text-sm font-medium text-brand-primary hover:text-brand-primary/80"
              onClick={() => {
                setImageUrl('');
                setBackgroundType('color');
              }}
            >
              Supprimer l'image
            </button>
          </div>
          {error && (
            <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              <AlertTriangle className="mt-0.5 h-4 w-4" aria-hidden="true" />
              <p>{error}</p>
            </div>
          )}
          {imageUrl.trim() && (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <img src={imageUrl} alt="Aperçu du fond" className="h-40 w-full object-cover" />
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <button type="button" className="ui-btn-primary" onClick={handleApply}>
          Appliquer
        </button>
      </div>
    </div>
  );
};

interface MediaLibrarySectionProps {
  assets: CustomizationAsset[];
  onUpload: (file: File) => Promise<void>;
}

const MediaLibrarySection: React.FC<MediaLibrarySectionProps> = ({ assets, onUpload }) => {
  const [copySuccessId, setCopySuccessId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleCopy = async (asset: CustomizationAsset) => {
    try {
      await navigator.clipboard.writeText(asset.url);
      setCopySuccessId(asset.id);
      setTimeout(() => setCopySuccessId(null), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setError(null);
    setUploading(true);
    try {
      await onUpload(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Téléversement impossible.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const fonts = assets.filter(asset => asset.type === 'font');
  const images = assets.filter(asset => asset.type === 'image');
  const others = assets.filter(asset => asset.type !== 'image' && asset.type !== 'font');

  return (
    <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Bibliothèque de médias</h2>
          <p className="text-sm text-slate-500">
            Centralisez toutes vos ressources pour la personnalisation (polices, images, vidéos, audio).
          </p>
        </div>
        <label className="ui-btn-primary relative cursor-pointer">
          <input
            type="file"
            accept="image/*,video/*,audio/*,.ttf,.otf,.woff,.woff2"
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={handleUpload}
            disabled={uploading}
          />
          <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
          Ajouter un média
        </label>
      </header>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          <div>
            <p>{error}</p>
          </div>
        </div>
      )}

      {uploading && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Téléversement en cours…
        </div>
      )}

      <div className="space-y-6">
        <MediaLibraryList title="Polices" assets={fonts} onCopy={handleCopy} copySuccessId={copySuccessId} />
        <MediaLibraryList title="Images" assets={images} onCopy={handleCopy} copySuccessId={copySuccessId} />
        <MediaLibraryList title="Autres médias" assets={others} onCopy={handleCopy} copySuccessId={copySuccessId} />
      </div>
    </section>
  );
};

interface MediaLibraryListProps {
  title: string;
  assets: CustomizationAsset[];
  onCopy: (asset: CustomizationAsset) => void;
  copySuccessId: string | null;
}

const MediaLibraryList: React.FC<MediaLibraryListProps> = ({ title, assets, onCopy, copySuccessId }) => {
  if (assets.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        <p className="mt-2 text-sm text-slate-500">Aucun média pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {assets.map(asset => (
          <article
            key={asset.id}
            className="rounded-2xl border border-slate-200 p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{asset.name}</p>
                <p className="text-xs text-slate-500">
                  {asset.format.split('/').pop() ?? asset.format} • {formatBytes(asset.bytes)}
                </p>
              </div>
              <button
                type="button"
                className={`ui-btn-secondary flex items-center gap-2 text-xs ${copySuccessId === asset.id ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : ''}`}
                onClick={() => onCopy(asset)}
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
                {copySuccessId === asset.id ? 'Copié !' : 'Copier l’URL'}
              </button>
            </div>
            <p className="mt-3 break-all text-xs text-slate-500">{asset.url}</p>
          </article>
        ))}
      </div>
    </div>
  );
};

const SiteCustomization: React.FC = () => {
  const { content, loading, error, updateContent } = useSiteContent();
  const [draft, setDraft] = useState<SiteContent | null>(() =>
    content ? cloneSiteContent(content) : null,
  );
  const [activeZone, setActiveZone] = useState<EditableZoneKey | null>(null);
  const [floatingEditor, setFloatingEditor] = useState<FloatingEditorState | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [bestSellerProducts, setBestSellerProducts] = useState<Product[]>([]);
  const [bestSellerLoading, setBestSellerLoading] = useState<boolean>(false);
  const [bestSellerError, setBestSellerError] = useState<string | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState<boolean>(false);

  useLayoutEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const className = 'customization-mode';
    document.body.classList.add(className);
    return () => {
      document.body.classList.remove(className);
    };
  }, []);

  useEffect(() => {
    if (content) {
      setDraft(cloneSiteContent(content));
    }
  }, [content]);

  useEffect(() => {
    let mounted = true;
    const fetchBestSellers = async () => {
      setBestSellerLoading(true);
      setBestSellerError(null);
      try {
        const products = await api.getBestSellerProducts();
        if (mounted) {
          setBestSellerProducts(products);
        }
      } catch (err) {
        if (mounted) {
          setBestSellerError(
            err instanceof Error
              ? err.message
              : 'Impossible de charger les produits mis en avant.',
          );
        }
      } finally {
        if (mounted) {
          setBestSellerLoading(false);
        }
      }
    };

    void fetchBestSellers();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!saveSuccess) {
      return;
    }
    const timeout = setTimeout(() => setSaveSuccess(null), 4000);
    return () => clearTimeout(timeout);
  }, [saveSuccess]);

  const applyDraftUpdate = useCallback<ApplyUpdater>(
    updater => {
      setDraft(prev => {
        if (!prev) {
          return prev;
        }
        const clone = cloneSiteContent(prev);
        return updater(clone);
      });
    },
    [],
  );

  const appendAssetToDraft = useCallback<AssetAppender>(asset => {
    setDraft(prev => {
      if (!prev) {
        return prev;
      }
      const clone = cloneSiteContent(prev);
      appendAsset(clone, asset);
      return clone;
    });
  }, []);

  const fieldMetaByElement = useMemo(() => {
    const map = new Map<EditableElementKey, FieldMeta>();
    CUSTOMIZATION_SECTIONS.forEach(section => {
      section.groups.forEach(group => {
        group.fields.forEach(field => {
          map.set(field.element, { section, group, field });
        });
      });
    });
    return map;
  }, []);

  const handlePreviewEdit = useCallback(
    (
      element: EditableElementKey,
      meta: {
        zone: EditableZoneKey;
        anchor: DOMRect | DOMRectReadOnly | null;
        boundary: DOMRect | DOMRectReadOnly | null;
      },
    ) => {
      setActiveZone(meta.zone);
      setFloatingEditor({
        element,
        anchor: snapshotRect(meta.anchor),
        boundary: snapshotRect(meta.boundary),
      });
    },
    [],
  );

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      if (!draft) {
        throw new Error('Le brouillon est indisponible.');
      }
      const updated = await updateContent(draft);
      setDraft(updated);
      setSaveSuccess('Modifications enregistrées avec succès.');
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Une erreur est survenue lors de la sauvegarde.',
      );
    } finally {
      setSaving(false);
    }
  };

  const fontOptions = useMemo(() => {
    const base = Array.from(FONT_FAMILY_SUGGESTIONS);
    if (!draft) {
      return base;
    }
    const library = draft.assets?.library ?? [];
    const custom = library
      .filter(asset => asset.type === 'font')
      .map(asset => sanitizeFontFamilyName(asset.name));
    return Array.from(new Set([...base, ...custom]));
  }, [draft]);

  const renderFieldEditor = useCallback(
    (field: CustomizationField) => {
      if (!draft) {
        return null;
      }
      if (field.type === 'text') {
        return (
          <TextFieldEditorContent
            element={field.element}
            draft={draft}
            onApply={applyDraftUpdate}
            fontOptions={fontOptions}
            onAssetAdded={appendAssetToDraft}
            multiline={field.multiline}
            allowRichText={field.allowRichText}
            showStyleOptions={field.showStyleOptions ?? TEXT_ELEMENT_KEYS.has(field.element)}
            placeholder={field.placeholder}
          />
        );
      }
      if (field.type === 'image') {
        return (
          <ImageFieldEditorContent
            element={field.element}
            draft={draft}
            onApply={applyDraftUpdate}
            onAssetAdded={appendAssetToDraft}
            placeholder={field.placeholder}
          />
        );
      }
      return (
        <BackgroundFieldEditorContent
          element={field.element}
          draft={draft}
          onApply={applyDraftUpdate}
          onAssetAdded={appendAssetToDraft}
        />
      );
    },
    [appendAssetToDraft, applyDraftUpdate, draft, fontOptions],
  );

  const activeFieldMeta = floatingEditor
    ? fieldMetaByElement.get(floatingEditor.element) ?? null
    : null;
  const inlineEditorContent = activeFieldMeta ? renderFieldEditor(activeFieldMeta.field) : null;

  const closeFloatingEditor = useCallback(() => {
    setFloatingEditor(null);
    setActiveZone(null);
  }, []);

  const handleLibraryUpload = useCallback(
    async (file: File) => {
      const url = await uploadCustomizationAsset(file, { tags: [guessAssetType(file)] });
      const asset = createAssetFromFile(file, url);
      appendAssetToDraft(asset);
    },
    [appendAssetToDraft],
  );

  if (loading) {
    return (
      <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-brand-primary" aria-hidden="true" />
        <p className="text-sm text-slate-500">Chargement du contenu du site…</p>
      </div>
    );
  }

  if (!content || !draft) {
    return (
      <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-3">
        <AlertTriangle className="h-6 w-6 text-amber-500" aria-hidden="true" />
        <p className="text-sm text-slate-500">Le contenu du site est en cours d'initialisation…</p>
      </div>
    );
  }

  const assets = draft.assets?.library ?? [];

  return (
    <div className="site-customization space-y-8 px-4 sm:px-6 lg:px-0">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Site public</h1>
          <p className="text-sm text-slate-500">
            Ajustez le contenu, les couleurs et les médias de votre page d’accueil en temps réel.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {saveSuccess && (
            <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {saveSuccess}
            </div>
          )}
          {saveError && (
            <div className="flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm text-amber-700">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              {saveError}
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsLibraryOpen(true)}
            className="ui-btn-secondary"
          >
            Bibliothèque de médias
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="ui-btn-primary"
            disabled={saving}
          >
            {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </button>
        </div>
      </header>

      {error && (
        <div className="flex items-start gap-3 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          <div>
            <p>{error}</p>
            <p className="mt-1">Les valeurs affichées correspondent à la configuration par défaut.</p>
          </div>
        </div>
      )}

      <section className="space-y-6">
        <div className="rounded-[2.75rem] border border-slate-200 bg-white p-4 shadow-inner sm:p-6 lg:p-8">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Prévisualisation interactive</h2>
              <p className="text-sm text-slate-500">
                Survolez la page et cliquez sur le crayon de n’importe quel élément pour ouvrir son éditeur flottant.
              </p>
            </div>
            <div className="rounded-full bg-slate-100 px-4 py-1 text-xs font-medium uppercase tracking-wide text-slate-500">
              Édition localisée
            </div>
          </div>
          <SitePreviewCanvas
            content={draft}
            bestSellerProducts={bestSellerProducts}
            onEdit={(element, meta) => handlePreviewEdit(element, meta)}
            activeZone={activeZone}
          />
        </div>

        {bestSellerError && (
          <div className="flex items-start gap-3 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            <p>{bestSellerError}</p>
          </div>
        )}

        {bestSellerLoading && (
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Chargement des produits populaires…
          </div>
        )}
      </section>

      {floatingEditor && activeFieldMeta && inlineEditorContent && (
        <FloatingEditorPanel
          title={activeFieldMeta.field.label}
          description={activeFieldMeta.field.description}
          anchor={floatingEditor.anchor}
          boundary={floatingEditor.boundary}
          onClose={closeFloatingEditor}
        >
          {inlineEditorContent}
        </FloatingEditorPanel>
      )}

      <Modal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        title="Bibliothèque de médias"
        size="xl"
      >
        <MediaLibrarySection assets={assets} onUpload={handleLibraryUpload} />
      </Modal>
    </div>
  );
};

export default SiteCustomization;

