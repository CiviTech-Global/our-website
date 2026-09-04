import type { CategoryDef } from './types.js';

/**
 * Nine groupings, ordered the way a visitor scans them: the compulsory motor
 * products first because that is what most people arrive looking for, the
 * corporate lines last because those visitors already know what they want and
 * will use search or a direct link.
 */
export const CATEGORIES: CategoryDef[] = [
  {
    slug: 'auto',
    title: 'خودرو و موتورسیکلت',
    titleEn: 'Motor',
    emoji: '🚗',
    icon: 'Car',
    order: 1,
  },
  {
    slug: 'property',
    title: 'اموال و ساختمان',
    titleEn: 'Property',
    emoji: '🏠',
    icon: 'Home',
    order: 2,
  },
  {
    slug: 'health',
    title: 'درمان',
    titleEn: 'Health',
    emoji: '❤️',
    icon: 'HeartPulse',
    order: 3,
  },
  {
    slug: 'life',
    title: 'عمر و سرمایه‌گذاری',
    titleEn: 'Life and investment',
    emoji: '🌱',
    icon: 'Sprout',
    order: 4,
  },
  {
    slug: 'accident',
    title: 'حوادث',
    titleEn: 'Personal accident',
    emoji: '🚑',
    icon: 'Siren',
    order: 5,
  },
  {
    slug: 'travel',
    title: 'مسافرتی',
    titleEn: 'Travel',
    emoji: '✈️',
    icon: 'Plane',
    order: 6,
  },
  {
    slug: 'liability',
    title: 'مسئولیت',
    titleEn: 'Liability',
    emoji: '⚖️',
    icon: 'Scale',
    order: 7,
  },
  {
    slug: 'device',
    title: 'کالا و دستگاه',
    titleEn: 'Devices',
    emoji: '📱',
    icon: 'Smartphone',
    order: 8,
  },
  {
    slug: 'corporate',
    title: 'سازمانی و بازرگانی',
    titleEn: 'Corporate and trade',
    emoji: '🏢',
    icon: 'Building2',
    order: 9,
  },
];
