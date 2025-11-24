import { LayoutDashboard, Package, Armchair, Soup, UtensilsCrossed, ShoppingBag, AreaChart, Brush, Percent } from 'lucide-react';

export const SITE_CUSTOMIZER_PERMISSION_KEY = '/site-customizer';

export const NAV_LINKS = [
  { name: 'Panel', href: '/dashboard', icon: LayoutDashboard, permissionKey: '/dashboard' },
  { name: 'Para llevar', href: '/para-llevar', icon: ShoppingBag, permissionKey: '/para-llevar' },
  { name: 'Plano del salón', href: '/ventes', icon: Armchair, permissionKey: '/ventes' },
  { name: 'Cocina', href: '/cocina', icon: Soup, permissionKey: '/cocina' },
  {
    name: 'Personalización',
    href: SITE_CUSTOMIZER_PERMISSION_KEY,
    icon: Brush,
    permissionKey: SITE_CUSTOMIZER_PERMISSION_KEY,
  },
  { name: 'Productos', href: '/produits', icon: UtensilsCrossed, permissionKey: '/produits' },
  { name: 'Ingredientes', href: '/ingredients', icon: Package, permissionKey: '/ingredients' },
  { name: 'Promociones', href: '/promotions', icon: Percent, permissionKey: '/promotions' },
  { name: 'Resumen de ventas', href: '/resume-ventes', icon: AreaChart, permissionKey: '/resume-ventes' },
];

export const ROLES = {
    ADMIN: 'admin',
    COCINA: 'cocina',
    MESERO: 'mesero'
};

export const ROLE_HOME_PAGE_META_KEY = '__home_page';
