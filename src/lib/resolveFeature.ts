// src/lib/resolveFeature.ts
// Static import map for theme feature components. Same static-import pattern as resolveSection.

// Ecommerce shop features
import EcommerceProductGrid from '../themes/ecommerce/features/shop/ProductGrid.astro';
import EcommerceProductCard from '../themes/ecommerce/features/shop/ProductCard.astro';
import EcommerceCartDrawer from '../themes/ecommerce/features/shop/CartDrawer.astro';
import EcommerceCheckoutForm from '../themes/ecommerce/features/shop/CheckoutForm.astro';

// Portfolio features
import PortfolioGrid from '../themes/portfolio/features/portfolio/PortfolioGrid.astro';
import CaseStudyLayout from '../themes/portfolio/features/portfolio/CaseStudyLayout.astro';

// Restaurant features
import RestaurantMenuGrid from '../themes/restaurant/features/restaurant/MenuGrid.astro';
import RestaurantOrderBuilder from '../themes/restaurant/features/restaurant/OrderBuilder.astro';

// Service/booking features
import ServiceBookingWizard from '../themes/service/features/booking/BookingWizard.astro';
import ServiceServiceCard from '../themes/service/features/booking/ServiceCard.astro';
import ServiceStaffCard from '../themes/service/features/booking/StaffCard.astro';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FEATURE_MAP: Record<string, Record<string, Record<string, any>>> = {
  ecommerce: {
    shop: {
      ProductGrid: EcommerceProductGrid,
      ProductCard: EcommerceProductCard,
      CartDrawer: EcommerceCartDrawer,
      CheckoutForm: EcommerceCheckoutForm,
    },
  },
  portfolio: {
    portfolio: {
      PortfolioGrid: PortfolioGrid,
      CaseStudyLayout: CaseStudyLayout,
    },
  },
  restaurant: {
    restaurant: {
      MenuGrid: RestaurantMenuGrid,
      OrderBuilder: RestaurantOrderBuilder,
    },
  },
  service: {
    booking: {
      BookingWizard: ServiceBookingWizard,
      ServiceCard: ServiceServiceCard,
      StaffCard: ServiceStaffCard,
    },
  },
};

/**
 * Returns the Astro component for a feature component within a given theme.
 * Returns undefined if the theme/feature/component combination is not found.
 *
 * @param feature - Feature module name ('shop', 'booking', 'restaurant', 'portfolio')
 * @param component - Component name within the feature ('ProductGrid', 'BookingWizard', etc.)
 * @param themeKey - Active theme key ('ecommerce', 'service', etc.)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function resolveFeature(feature: string, component: string, themeKey: string): any {
  return FEATURE_MAP[themeKey]?.[feature]?.[component];
}
