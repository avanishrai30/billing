import { auditQuerySchema, auditFilterSchema } from '../../features/audit/schemas';

describe('Audit Validation Schemas Suite', () => {
  it('1. auditQuerySchema validates valid query options with defaults', () => {
    const valid = {
      limit: 100,
      skip: 50,
      eventType: 'LOGIN_SUCCESS',
      entity: 'auth',
      storeId: 'store-1'
    };

    const parsed = auditQuerySchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.limit).toBe(100);
      expect(parsed.data.skip).toBe(50);
      expect(parsed.data.eventType).toBe('LOGIN_SUCCESS');
    }
  });

  it('2. auditQuerySchema applies defaults for missing fields', () => {
    const parsed = auditQuerySchema.safeParse({});
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.limit).toBe(200);
      expect(parsed.data.skip).toBe(0);
    }
  });

  it('3. auditFilterSchema validates client filter values', () => {
    const valid = {
      eventType: 'invoice_created',
      entity: 'billing',
      action: 'billing',
      storeId: 'store-1',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      search: 'Ramesh'
    };

    const parsed = auditFilterSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });
});
