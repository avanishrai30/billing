import {
  storeSchema,
  storeFormSchema
} from '../../features/stores/schemas';
import {
  businessSchema,
  businessFormSchema
} from '../../features/businesses/schemas';

describe('Store & Business Zod Validation Schemas', () => {
  it('1. Validates complete store document schema', () => {
    const validStore = {
      id: 'st-101',
      name: 'Mumbai Flagship',
      code: 'ST-MUM',
      address: 'Bandra West, Mumbai',
      phone: '022-26401234',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const res = storeSchema.safeParse(validStore);
    expect(res.success).toBe(true);
  });

  it('2. Rejects store form without name or code', () => {
    const invalidStore = {
      name: '',
      code: ''
    };

    const res = storeFormSchema.safeParse(invalidStore);
    expect(res.success).toBe(false);
  });

  it('3. Validates complete business document schema', () => {
    const validBiz = {
      id: 'biz-1',
      name: 'VC Organic Billing Pvt Ltd',
      subtitle: 'Pure Organic Dairy & Staples',
      owner: 'Avanish Rai',
      gstin: '27AAAAA0000A1Z5',
      phone: '9876543210',
      email: 'admin@vcorganic.com',
      address: 'Mumbai, India',
      bankName: 'HDFC Bank',
      accountNo: '50200012345678',
      ifsc: 'HDFC0000123',
      upiId: 'vcorganic@hdfcbank',
      status: 'active'
    };

    const res = businessSchema.safeParse(validBiz);
    expect(res.success).toBe(true);
  });

  it('4. Rejects business form without legal name', () => {
    const invalidBiz = {
      name: ''
    };

    const res = businessFormSchema.safeParse(invalidBiz);
    expect(res.success).toBe(false);
  });
});
