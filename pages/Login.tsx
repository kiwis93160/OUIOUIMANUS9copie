import React, { useState, FormEvent, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import { api } from '../services/api';
import { EditableElementKey, EditableZoneKey, Product, Order, SiteContent, SectionStyle } from '../types';
import { Clock, Mail, MapPin, Menu, MessageCircle, X } from 'lucide-react';
import CustomerOrderTracker from '../components/CustomerOrderTracker';
import { clearActiveCustomerOrder, getActiveCustomerOrder } from '../services/customerOrderStorage';
import { formatCurrencyCOP } from '../utils/formatIntegerAmount';
import useSiteContent from '../hooks/useSiteContent';
import useCustomFonts from '../hooks/useCustomFonts';
import {
  createBackgroundStyle,
  createBodyTextStyle,
  createElementBackgroundStyle,
  createElementBodyTextStyle,
  createElementTextStyle,
  createHeroBackgroundStyle,
  createTextStyle,
} from '../utils/siteStyleHelpers';
import { resolveZoneFromElement } from '../components/SitePreviewCanvas';
import { getHomeRedirectPath } from '../utils/navigation';
import { DEFAULT_SITE_CONTENT as UTILS_DEFAULT_SITE_CONTENT } from '../utils/siteContent';
import { withAppendedQueryParam } from '../utils/url';
import { formatScheduleWindow, isWithinSchedule, minutesUntilNextChange } from '../utils/timeWindow';
import { isWithinWeeklySchedule, formatWeeklySchedule } from '../utils/weeklyScheduleUtils';
import useOnlineOrderingSchedules from '../hooks/useOnlineOrderingSchedules';

const DEFAULT_BRAND_LOGO = '/logo-brand.svg';

const createDefaultSectionStyle = (): SectionStyle => ({
  background: {
    type: 'color',
    color: '#ffffff',
    image: null,
  },
  fontFamily: 'inherit',
  fontSize: '16px',
  textColor: '#000000',
});

const DEFAULT_SITE_CONTENT: SiteContent = UTILS_DEFAULT_SITE_CONTENT;

type PinInputProps = {
  pin: string;
  onPinChange: (pin: string) => void;
  pinLength: number;
  describedBy?: string;
  disabled?: boolean;
};

const PinInput = React.forwardRef<HTMLInputElement, PinInputProps>(({ pin, onPinChange, pinLength, describedBy, disabled }, ref) => {
  const handleKeyClick = (key: string) => {
    if (pin.length < pinLength && !disabled) {
      onPinChange(pin + key);
    }
  };

  const handleDelete = () => {
    if (pin.length > 0 && !disabled) {
      onPinChange(pin.slice(0, -1));
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) {
      return;
    }
    const sanitized = event.target.value.replace(/\D/g, '').slice(0, pinLength);
    onPinChange(sanitized);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      handleKeyClick(event.key);
      return;
    }

    if (event.key === 'Backspace') {
      event.preventDefault();
      handleDelete();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      onPinChange('');
    }
  };

  const digitsMessage =
    pin.length === 0
      ? `Aucun chiffre saisi. Vous pouvez entrer ${pinLength} chiffres.`
      : `${pin.length} ${pin.length > 1 ? 'chiffres saisis' : 'chiffre saisi'} sur ${pinLength}.`;

  return (
    <div className="pin-input" aria-label="Clavier numérique sécurisé">
      <input
        ref={ref}
        id="staff-pin-field"
        type="password"
        inputMode="numeric"
        autoComplete="one-time-code"
        className="pin-input__field"
        value={pin}
        onChange={handleInputChange}
        onKeyDown={handleInputKeyDown}
        aria-describedby={describedBy}
        aria-label={`Code PIN à ${pinLength} chiffres`}
        disabled={disabled}
        aria-disabled={disabled}
        aria-busy={disabled}
      />
      <div className="pin-indicator" role="presentation">
        {Array.from({ length: pinLength }).map((_, index) => (
          <div key={index} className="pin-indicator__slot" aria-hidden="true">
            {pin[index] ? '•' : ''}
          </div>
        ))}
      </div>
      <div className="pin-input__live" aria-live="polite">
        {digitsMessage}
      </div>
      <div className="pin-pad">
        {[...Array(9)].map((_, index) => (
          <button
            type="button"
            key={index + 1}
            onClick={() => handleKeyClick(String(index + 1))}
            className="pin-pad__button"
            disabled={disabled}
          >
            {index + 1}
          </button>
        ))}
        <div aria-hidden="true" />
        <button type="button" onClick={() => handleKeyClick('0')} className="pin-pad__button" disabled={disabled}>
          0
        </button>
        <button type="button" onClick={handleDelete} className="pin-pad__button pin-pad__button--muted" disabled={disabled}>
          DEL
        </button>
      </div>
    </div>
  );
});

PinInput.displayName = 'PinInput';

const computeMenuGridClassName = (count: number): string => {
  if (count === 1) return 'menu-grid menu-grid--single';
  if (count === 2) return 'menu-grid menu-grid--double';
  if (count === 3) return 'menu-grid menu-grid--triple';
  if (count >= 6) return 'menu-grid menu-grid--six';
  if (count > 0) return 'menu-grid menu-grid--multi';
  return 'menu-grid';
};

const computeMenuCardClassName = (count: number): string => {
  const baseClass = 'ui-card menu-card';
  if (count === 1) return `${baseClass} menu-card--single`;
  if (count === 2) return `${baseClass} menu-card--double`;
  if (count === 3) return `${baseClass} menu-card--triple`;
  if (count >= 6) return `${baseClass} menu-card--compact`;
  return baseClass;
};


const Login: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const pinInputRef = useRef<HTMLInputElement>(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { content: siteContent, loading: siteContentLoading } = useSiteContent();
  const { schedule: weeklySchedule } = useOnlineOrderingSchedules();
  const [content, setContent] = useState<SiteContent | null>(() => siteContent);
  useEffect(() => {
    if (siteContent) {
      setContent(siteContent);
    }
  }, [siteContent]);

  useEffect(() => {
    const scriptId = 'shapo-embed-js';

    const initializeWidget = () => {
      const shapoGlobal = (window as typeof window & { Shapo?: { widgets?: { init?: () => void } } }).Shapo;
      shapoGlobal?.widgets?.init?.();
    };

    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://cdn.shapo.io/js/embed.js';
      script.defer = true;
      script.addEventListener('load', initializeWidget);
      document.body.appendChild(script);

      return () => {
        script.removeEventListener('load', initializeWidget);
      };
    }

    initializeWidget();
  }, []);
  const safeContent = content ?? DEFAULT_SITE_CONTENT;
  useCustomFonts(safeContent.assets.library);

  const { navigation, hero, about, menu: menuContent, findUs, footer, onlineOrdering } = safeContent;
  const sanitizeLocationCopy = useCallback((value: string | null | undefined) => {
    if (!value) {
      return '';
    }

    return value.replace(/[,\s]*Colombia\b/gi, '').trim();
  }, []);

  const sanitizedAddress = useMemo(
    () => sanitizeLocationCopy(findUs.address),
    [findUs.address, sanitizeLocationCopy],
  );

  const brandLogo = navigation.brandLogo ?? DEFAULT_BRAND_LOGO;
  const staffTriggerLogo = navigation.brandLogo ?? DEFAULT_BRAND_LOGO;
  const navigationBackgroundStyle = createBackgroundStyle(navigation.style);
  const navigationTextStyle = createTextStyle(navigation.style);
  const heroBackgroundStyle = createHeroBackgroundStyle(hero.style, hero.backgroundImage);
  const heroTextStyle = createTextStyle(hero.style);
  const heroBodyTextStyle = createBodyTextStyle(hero.style);
  const aboutBackgroundStyle = createBackgroundStyle(about.style);
  const aboutTextStyle = createTextStyle(about.style);
  const menuBackgroundStyle = createBackgroundStyle(menuContent.style);
  const menuTextStyle = createTextStyle(menuContent.style);
  const menuBodyTextStyle = createBodyTextStyle(menuContent.style);
  const findUsBackgroundStyle = createBackgroundStyle(findUs.style);
  const findUsTextStyle = createTextStyle(findUs.style);
  const findUsBodyTextStyle = createBodyTextStyle(findUs.style);
  const footerBackgroundStyle = createBackgroundStyle(footer.style);
  const footerTextStyle = createBodyTextStyle(footer.style);

  const elementStyles = safeContent.elementStyles ?? {};
  const zoneStyleMap: Record<EditableZoneKey, typeof navigation.style> = {
    navigation: navigation.style,
    hero: hero.style,
    about: about.style,
    menu: menuContent.style,
    instagramReviews: safeContent.instagramReviews.style,
    findUs: findUs.style,
    footer: footer.style,
  };

  const getElementStyle = (key: EditableElementKey) => elementStyles[key];

  const getElementTextStyle = (key: EditableElementKey) => {
    const zone = resolveZoneFromElement(key);
    return createElementTextStyle(zoneStyleMap[zone], getElementStyle(key));
  };

  const getElementBodyTextStyle = (key: EditableElementKey) => {
    const zone = resolveZoneFromElement(key);
    return createElementBodyTextStyle(zoneStyleMap[zone], getElementStyle(key));
  };

  const getElementBackgroundStyle = (key: EditableElementKey) => {
    const zone = resolveZoneFromElement(key);
    return createElementBackgroundStyle(zoneStyleMap[zone], getElementStyle(key));
  };

  const elementRichText = safeContent.elementRichText ?? {};

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const updateNow = () => setNow(new Date());
    updateNow();
    const interval = window.setInterval(updateNow, 60000);
    return () => window.clearInterval(interval);
  }, []);

  const isOrderingAvailable = isWithinWeeklySchedule(weeklySchedule, now);
  const weeklyScheduleFormatted = useMemo(
    () => formatWeeklySchedule(weeklySchedule, 'fr-FR'),
    [weeklySchedule],
  );


  const getRichTextHtml = (key: EditableElementKey): string | null => {
    const entry = elementRichText[key];
    const html = entry?.html?.trim();
    return html && html.length > 0 ? html : null;
  };

  const renderRichTextElement = <T extends keyof JSX.IntrinsicElements>(
    key: EditableElementKey,
    Component: T,
    props: React.ComponentPropsWithoutRef<T>,
    fallback: string,
  ) => {
    const html = getRichTextHtml(key);
    if (html) {
      return React.createElement(Component, {
        ...props,
        dangerouslySetInnerHTML: { __html: html },
      });
    }
    return React.createElement(Component, props, fallback);
  };

  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState(() => getActiveCustomerOrder());

  const submitPin = useCallback(
    async (pinValue: string) => {
      setLoading(true);
      setError('');

      try {
        const role = await login(pinValue);
        const redirectPath = getHomeRedirectPath(role) ?? '/dashboard';

        setIsModalOpen(false);
        setPin('');
        navigate(redirectPath);
      } catch (error) {
        console.error('Failed to authenticate with PIN', error);
        const message = error instanceof Error && error.message ? error.message : 'PIN invalide';
        setError(message);
        setPin('');
        requestAnimationFrame(() => {
          pinInputRef.current?.focus();
        });
      } finally {
        setLoading(false);
      }
    },
    [login, navigate],
  );

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    const timeout = window.setTimeout(() => {
      pinInputRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [isModalOpen]);

  useEffect(() => {
    if (pin.length === 6 && !loading) {
      submitPin(pin);
    }
  }, [pin, loading, submitPin]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const historyJSON = window.localStorage.getItem('customer-order-history');
      if (!historyJSON) {
        return;
      }

      const parsed = JSON.parse(historyJSON) as Order[];
      if (Array.isArray(parsed)) {
        setOrderHistory(parsed);
      }
    } catch (error) {
      console.error('Could not load order history', error);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchBestSellers = async () => {
      try {
        const products = await api.getBestSellerProducts();
        if (isMounted) {
          setBestSellers(products);
        }
      } catch (error) {
        console.error('Could not load best seller products', error);
      } finally {
        if (isMounted) {
          setMenuLoading(false);
        }
      }
    };

    fetchBestSellers();

    return () => {
      isMounted = false;
    };
  }, []);

  const findUsMapQuery = findUs.address.trim();
  const customFindUsMapUrlRaw = findUs.mapUrl;
  const customFindUsMapUrl = typeof customFindUsMapUrlRaw === 'string' ? customFindUsMapUrlRaw.trim() : '';
  const hasCustomMapUrl = customFindUsMapUrl.length > 0;
  const encodedFindUsQuery = !hasCustomMapUrl && findUsMapQuery.length > 0
    ? encodeURIComponent(findUsMapQuery)
    : '';
  const findUsMapUrl = hasCustomMapUrl
    ? customFindUsMapUrl
    : encodedFindUsQuery
      ? `https://www.google.com/maps?q=${encodedFindUsQuery}`
      : 'https://www.google.com/maps';
  const findUsMapEmbedUrl = hasCustomMapUrl
    ? withAppendedQueryParam(customFindUsMapUrl, 'output', 'embed')
    : encodedFindUsQuery
      ? `https://www.google.com/maps?q=${encodedFindUsQuery}&output=embed`
      : 'about:blank';
  const hasMapLocation = hasCustomMapUrl || encodedFindUsQuery.length > 0;
  const findUsMapTitle = findUsMapQuery.length > 0 ? findUsMapQuery : findUs.title;
  const whatsappTestNumber = '0681161642';
  const whatsappInternationalNumber = `33${whatsappTestNumber.replace(/^0/, '')}`;
  const whatsappUrl = `https://wa.me/${whatsappInternationalNumber}`;
  const activeOrderId = activeOrder?.orderId ?? null;
  const bestSellersToDisplay = bestSellers.slice(0, 6);
  const bestSellerCount = bestSellersToDisplay.length;
  const menuGridClassName = computeMenuGridClassName(bestSellerCount);
  const menuCardClassName = computeMenuCardClassName(bestSellerCount);

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (pin.length === 6 && !loading) {
      submitPin(pin);
    }
  };

  const handleNewOrder = () => {
    clearActiveCustomerOrder();
    setActiveOrder(null);
  };

  const handleQuickReorder = (orderId: string) => {
    localStorage.setItem('customer-order-reorder-id', orderId);
    navigate('/commande-client');
  };

  const handleHeroCtaClick = () => {
    if (!isOrderingAvailable) {
      return;
    }
    navigate('/commande-client');
  };

  return (
    <div className="login-page">
      <header className="login-header" style={navigationBackgroundStyle}>
        <div className="layout-container login-header__inner" style={navigationTextStyle}>
          <div className="login-brand" style={navigationTextStyle}>
            <img
              src={brandLogo}
              alt={`Logo ${navigation.brand}`}
              className="login-brand__logo"
            />
            {renderRichTextElement(
              'navigation.brand',
              'span',
              {
                className: 'login-brand__name',
                style: getElementTextStyle('navigation.brand'),
              },
              navigation.brand,
            )}
          </div>
          <nav className="login-nav" aria-label="Navigation principale">
            {renderRichTextElement(
              'navigation.links.home',
              'a',
              {
                href: '#accueil',
                className: 'login-nav__link',
                style: getElementBodyTextStyle('navigation.links.home'),
              },
              navigation.links.home,
            )}
            {renderRichTextElement(
              'navigation.links.about',
              'a',
              {
                href: '#apropos',
                className: 'login-nav__link',
                style: getElementBodyTextStyle('navigation.links.about'),
              },
              navigation.links.about,
            )}
            {renderRichTextElement(
              'navigation.links.menu',
              'a',
              {
                href: '#menu',
                className: 'login-nav__link',
                style: getElementBodyTextStyle('navigation.links.menu'),
              },
              navigation.links.menu,
            )}
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="login-nav__staff-btn"
              aria-label={navigation.links.loginCta}
            >
              <img src={staffTriggerLogo} alt="" className="login-brand__logo" aria-hidden="true" />
            </button>
          </nav>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="login-header__menu"
            aria-label="Ouvrir le menu"
          >
            <Menu size={24} />
          </button>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div className="login-menu-overlay" role="dialog" aria-modal="true" style={navigationBackgroundStyle}>
          <button type="button" onClick={() => setMobileMenuOpen(false)} className="login-menu-overlay__close" aria-label="Fermer le menu">
            <X size={28} />
          </button>
          <nav className="login-menu-overlay__nav" aria-label="Navigation mobile" style={navigationTextStyle}>
            {renderRichTextElement(
              'navigation.links.home',
              'a',
              {
                href: '#accueil',
                onClick: () => setMobileMenuOpen(false),
                className: 'login-menu-overlay__link',
                style: getElementBodyTextStyle('navigation.links.home'),
              },
              navigation.links.home,
            )}
            {renderRichTextElement(
              'navigation.links.about',
              'a',
              {
                href: '#apropos',
                onClick: () => setMobileMenuOpen(false),
                className: 'login-menu-overlay__link',
                style: getElementBodyTextStyle('navigation.links.about'),
              },
              navigation.links.about,
            )}
            {renderRichTextElement(
              'navigation.links.menu',
              'a',
              {
                href: '#menu',
                onClick: () => setMobileMenuOpen(false),
                className: 'login-menu-overlay__link',
                style: getElementBodyTextStyle('navigation.links.menu'),
              },
              navigation.links.menu,
            )}
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(true);
                setMobileMenuOpen(false);
              }}
              className="login-nav__staff-btn login-menu-overlay__staff-btn"
              aria-label={navigation.links.loginCta}
            >
              <img src={staffTriggerLogo} alt="" className="login-brand__logo" aria-hidden="true" />
            </button>
          </nav>
        </div>
      )}

      <main>
                   
        <section id="accueil" className="section section-hero" style={{ ...heroBackgroundStyle, ...heroTextStyle }}>
          {activeOrderId ? (
            <CustomerOrderTracker orderId={activeOrderId} onNewOrderClick={handleNewOrder} variant="hero" />
          ) : (
            <div className="hero-content" style={heroTextStyle}>
              {renderRichTextElement(
                'hero.title',
                'h2',
                {
                  className: 'hero-title',
                  style: getElementTextStyle('hero.title'),
                },
                hero.title,
              )}
              {renderRichTextElement(
                'hero.subtitle',
                'p',
                {
                  className: 'hero-subtitle',
                  style: getElementBodyTextStyle('hero.subtitle'),
                },
                hero.subtitle,
              )}
              <button
                onClick={handleHeroCtaClick}
                className={`ui-btn hero-cta ${isOrderingAvailable ? 'ui-btn-accent' : 'hero-cta--disabled'}`.trim()}
                style={{
                  ...getElementBodyTextStyle('hero.ctaLabel'),
                  ...getElementBackgroundStyle('hero.ctaLabel'),
                }}
                disabled={!isOrderingAvailable}
                aria-disabled={!isOrderingAvailable}
              >
                {renderRichTextElement(
                  'hero.ctaLabel',
                  'span',
                  {
                    className: 'inline-flex items-center justify-center',
                    style: getElementBodyTextStyle('hero.ctaLabel'),
                  },
                  hero.ctaLabel,
                )}
              </button>
              {!isOrderingAvailable && (
                <div className="hero-availability">
                  <div className="hero-availability__icon">
                    <Clock size={28} />
                  </div>
                  <div className="hero-availability__content">
                    <p className="hero-availability__title">{onlineOrdering.closedTitle}</p>
                    <p className="hero-availability__subtitle">
                      {onlineOrdering.closedSubtitle || 'Veuillez consulter nos horaires ci-dessous.'}
                    </p>
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-semibold uppercase tracking-wide text-white/90">Horaires d'ouverture :</p>
                      <div className="space-y-1">
                        {weeklyScheduleFormatted.map(({ day, label, schedule }) => (
                          <div key={day} className="flex items-center text-sm">
                            <span className="font-medium text-white/80 w-24">{label}</span>
                            <span className="font-semibold text-white">{schedule}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {orderHistory.length > 0 && (
                <div className="hero-history">
                  {renderRichTextElement(
                    'hero.historyTitle',
                    'p',
                    {
                      className: 'hero-history__title',
                      style: getElementBodyTextStyle('hero.historyTitle'),
                    },
                    hero.historyTitle,
                  )}
                  <div className="hero-history__list">
                    {orderHistory.slice(0, 3).map(order => (
                      <div key={order.id} className="hero-history__item">
                        <div className="hero-history__meta">
                          <p className="hero-history__date" style={heroBodyTextStyle}>
                            Pedido del {new Date(order.date_creation).toLocaleDateString()}
                          </p>
                          <p className="hero-history__details" style={heroBodyTextStyle}>
                            {order.items.length} article(s) • {formatCurrencyCOP(order.total)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleQuickReorder(order.id)}
                          className="hero-history__cta"
                          style={{
                            ...getElementBodyTextStyle('hero.reorderCtaLabel'),
                            ...getElementBackgroundStyle('hero.reorderCtaLabel'),
                          }}
                        >
                          {renderRichTextElement(
                            'hero.reorderCtaLabel',
                            'span',
                            {
                              className: 'inline-flex items-center justify-center',
                              style: getElementBodyTextStyle('hero.reorderCtaLabel'),
                            },
                            hero.reorderCtaLabel,
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <section
          id="apropos"
          className="section section-surface"
          style={{ ...aboutBackgroundStyle, ...aboutTextStyle }}
        >
          <div className="section-inner section-inner--center" style={aboutTextStyle}>
            {renderRichTextElement(
              'about.title',
              'h2',
              {
                className: 'section-title',
                style: getElementTextStyle('about.title'),
              },
              about.title,
            )}
            {renderRichTextElement(
              'about.description',
              'p',
              {
                className: 'section-text section-text--muted',
                style: getElementBodyTextStyle('about.description'),
              },
              about.description,
            )}
            {about.image && (
              <img
                src={about.image}
                alt={about.title}
                className="mt-6 h-64 w-full rounded-xl object-cover shadow-lg"
              />
            )}
          </div>
        </section>

        <section
          id="menu"
          className="section section-muted"
          style={{ ...menuBackgroundStyle, ...menuTextStyle }}
        >
          <div className="section-inner section-inner--wide section-inner--center" style={menuTextStyle}>
            {renderRichTextElement(
              'menu.title',
              'h2',
              {
                className: 'section-title',
                style: getElementTextStyle('menu.title'),
              },
              menuContent.title,
            )}
            {menuContent.image && (
              <img
                src={menuContent.image}
                alt={menuContent.title}
                className="mb-8 h-64 w-full rounded-xl object-cover shadow-lg"
              />
            )}
            {menuLoading ? (
              renderRichTextElement(
                'menu.loadingLabel',
                'p',
                {
                  className: 'section-text section-text--muted',
                  style: getElementBodyTextStyle('menu.loadingLabel'),
                },
                menuContent.loadingLabel,
              )
            ) : bestSellersToDisplay.length > 0 ? (
              <div className={menuGridClassName}>
                {bestSellersToDisplay.map(product => (
                  <article key={product.id} className={menuCardClassName}>
                    <img src={product.image} alt={product.nom_produit} className="menu-card__media" />
                    <div className="menu-card__body">
                      <h3 className="menu-card__title" style={menuTextStyle}>
                        {product.nom_produit}
                      </h3>
                      <p className="menu-card__description" style={menuBodyTextStyle}>
                        {product.description}
                      </p>
                      <p className="menu-card__price" style={menuBodyTextStyle}>
                        {formatCurrencyCOP(product.prix_vente)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="section-text section-text--muted" style={menuBodyTextStyle}>
                Aucun produit best seller n'est disponible pour le moment.
              </p>
            )}
            <div className="section-actions">
              <button
                onClick={() => navigate('/commande-client')}
                className="ui-btn ui-btn-primary hero-cta"
                style={{
                  ...getElementBodyTextStyle('menu.ctaLabel'),
                  ...getElementBackgroundStyle('menu.ctaLabel'),
                }}
              >
                {renderRichTextElement(
                  'menu.ctaLabel',
                  'span',
                  {
                    className: 'inline-flex items-center justify-center',
                    style: getElementBodyTextStyle('menu.ctaLabel'),
                  },
                  menuContent.ctaLabel,
                )}
              </button>
            </div>
          </div>
        </section>


        <section
          id="find-us"
          className="section section-surface py-14 sm:py-16"
          style={{ ...findUsBackgroundStyle, ...findUsTextStyle }}
        >
          <div className="section-inner section-inner--wide section-inner--center">
            {renderRichTextElement(
              'findUs.title',
              'h2',
              {
                className: 'section-title text-center',
                style: getElementTextStyle('findUs.title'),
              },
              findUs.title,
            )}

            <div className="mx-auto mt-10 grid w-full max-w-6xl gap-8 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
              <div className="grid gap-6">
                <article className="h-full rounded-[24px] border border-white/70 bg-white/75 p-4 text-left shadow-[0_24px_48px_-30px_rgba(15,23,42,0.5)] backdrop-blur">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-2">
                      {renderRichTextElement(
                        'findUs.addressLabel',
                        'h3',
                        {
                          className: 'text-xl font-semibold text-gray-900',
                          style: getElementTextStyle('findUs.addressLabel'),
                        },
                        findUs.addressLabel,
                      )}
                      {renderRichTextElement(
                        'findUs.address',
                        'p',
                        {
                          className: 'whitespace-pre-line text-base font-medium text-gray-700',
                          style: getElementBodyTextStyle('findUs.address'),
                        },
                        sanitizedAddress,
                      )}
                    </div>
                  </div>
                </article>

                <article className="h-full rounded-[24px] border border-white/70 bg-white/75 p-4 text-left shadow-[0_24px_48px_-30px_rgba(15,23,42,0.5)] backdrop-blur">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-2">
                      {renderRichTextElement(
                        'findUs.hoursLabel',
                        'h3',
                        {
                          className: 'text-xl font-semibold text-gray-900',
                          style: getElementTextStyle('findUs.hoursLabel'),
                        },
                        findUs.hoursLabel,
                      )}
                      {renderRichTextElement(
                        'findUs.hours',
                        'p',
                        {
                          className: 'whitespace-pre-line text-base font-medium text-gray-700',
                          style: getElementBodyTextStyle('findUs.hours'),
                        },
                        findUs.hours,
                      )}
                    </div>
                  </div>
                </article>

                <article className="h-full rounded-[24px] border border-white/70 bg-white/75 p-4 text-left shadow-[0_24px_48px_-30px_rgba(15,23,42,0.5)] backdrop-blur">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-3 text-left">
                      {renderRichTextElement(
                        'findUs.cityLabel',
                        'h3',
                        {
                          className: 'text-xl font-semibold text-gray-900',
                          style: getElementTextStyle('findUs.cityLabel'),
                        },
                        findUs.cityLabel,
                      )}
                      <div className="flex flex-col gap-3 text-base font-medium text-gray-700" style={findUsBodyTextStyle}>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-2 text-base font-semibold text-gray-900">
                            {whatsappTestNumber}
                          </span>
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white transition hover:bg-green-600"
                            aria-label="Nous écrire sur WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              </div>

              <div className="flex h-full w-full flex-col justify-between rounded-[36px] border border-white/70 bg-white/75 p-6 shadow-[0_28px_70px_-32px_rgba(15,23,42,0.55)] backdrop-blur">
                <div className="relative aspect-[13/8] w-full overflow-hidden rounded-3xl bg-white">
                  {hasMapLocation ? (
                    <iframe
                      title={`Carte Google Maps pour ${findUsMapTitle}`}
                      src={findUsMapEmbedUrl}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      className="h-full w-full border-0"
                      allowFullScreen
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gray-100 px-8 text-center">
                      <p className="text-lg text-gray-500" style={findUsBodyTextStyle}>
                        La localisation de notre restaurant sera bientôt disponible.
                      </p>
                    </div>
                  )}
                </div>
                <div className="mt-6 flex justify-center">
                  {hasMapLocation ? (
                    <a
                      href={findUsMapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-orange-500 px-6 py-3 text-base font-semibold text-white shadow-lg transition hover:bg-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
                      style={getElementBodyTextStyle('findUs.mapLabel')}
                    >
                      <MapPin className="h-6 w-6 text-white" />
                      {renderRichTextElement(
                        'findUs.mapLabel',
                        'span',
                        {
                          className: 'text-base font-semibold',
                        },
                        findUs.mapLabel,
                      )}
                    </a>
                  ) : null}
                </div>
                <div className="mt-6 overflow-hidden rounded-3xl border border-white/70 bg-white/75 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.55)]">
                  <div id="shapo-widget-e4f400ac5f6fd4edb521" className="h-[380px] w-full" />
                </div>
              </div>
            </div>
          </div>
        </section>
</main>
      
      <footer className="site-footer" style={{ ...footerBackgroundStyle, ...footerTextStyle }}>
        <div className="layout-container site-footer__inner" style={footerTextStyle}>
          <p style={getElementBodyTextStyle('footer.text')}>
            &copy; {new Date().getFullYear()} {navigation.brand}.{' '}
            {renderRichTextElement(
              'footer.text',
              'span',
              {
                style: getElementBodyTextStyle('footer.text'),
              },
              footer.text,
            )}
          </p>
        </div>
      </footer>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setPin('');
          setError('');
        }}
        title="Connexion du personnel"
        size="lg"
      >
        <div className="login-modal">
          <form onSubmit={handleFormSubmit} className="login-modal__form" aria-describedby={error ? 'staff-pin-error' : undefined}>
            <div className="login-modal__panel">
              <PinInput
                ref={pinInputRef}
                pin={pin}
                onPinChange={setPin}
                pinLength={6}
                describedBy={error ? 'staff-pin-error' : undefined}
                disabled={loading}
              />
              {error && (
                <p id="staff-pin-error" className="login-modal__error" role="alert" aria-live="assertive">
                  {error}
                </p>
              )}
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};

export default Login;
