import {
  BrandingFormSchema,
  StoreProfileFormSchema,
  PreferencesSchema
} from '../../features/settings/schemas';

describe('Settings & Configuration Schemas Suite', () => {
  it('1. BrandingFormSchema validates valid branding payload', () => {
    const valid = {
      title: 'VC Organics Billing OS',
      logo: '/uploads/logos/brand-logo.webp'
    };

    const parsed = BrandingFormSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it('2. BrandingFormSchema rejects empty title', () => {
    const invalid = {
      title: '',
      logo: '/uploads/logos/brand-logo.webp'
    };

    const parsed = BrandingFormSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it('3. StoreProfileFormSchema validates valid store profile', () => {
    const valid = {
      name: 'Mumbai Flagship',
      subtitle: 'Pure Farm Produce',
      gstin: '27AAAAA0000A1Z5',
      phone: '+91 98765 43210',
      email: 'contact@vcorganics.com',
      upiId: 'vcorganics@icici',
      address: 'Shop 4, Market Yard, Pune',
      logo: '/uploads/logos/store.webp',
      invoicePrefix: 'VC-MUM-',
      currency: 'INR',
      isActive: true,
      inventoryAlertThreshold: 10
    };

    const parsed = StoreProfileFormSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it('4. StoreProfileFormSchema applies default values', () => {
    const minimal = {
      name: 'Thane Outlet'
    };

    const parsed = StoreProfileFormSchema.safeParse(minimal);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.invoicePrefix).toBe('INV-');
      expect(parsed.data.currency).toBe('INR');
      expect(parsed.data.isActive).toBe(true);
      expect(parsed.data.inventoryAlertThreshold).toBe(5);
    }
  });

  it('5. PreferencesSchema validates visual preferences', () => {
    const parsed = PreferencesSchema.safeParse({ showProductImages: false });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.showProductImages).toBe(false);
    }
  });
});
