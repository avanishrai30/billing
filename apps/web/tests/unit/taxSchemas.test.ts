import { taxFilterSchema } from '../../features/tax/schemas';

describe('Tax & GST Schemas Suite', () => {
  it('1. taxFilterSchema validates valid filter values', () => {
    const valid = {
      storeId: 'store-1',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      tab: 'slabs'
    };

    const parsed = taxFilterSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.storeId).toBe('store-1');
      expect(parsed.data.tab).toBe('slabs');
    }
  });

  it('2. taxFilterSchema applies default values', () => {
    const parsed = taxFilterSchema.safeParse({});
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.storeId).toBe('all');
      expect(parsed.data.tab).toBe('overview');
    }
  });
});
