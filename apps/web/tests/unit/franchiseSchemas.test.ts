import {
  franchiseFormSchema,
  supplyOrderFormSchema
} from '../../features/franchises/schemas';

describe('Franchise Validation Schemas Suite', () => {
  it('1. franchiseFormSchema validates correct franchise payload', () => {
    const validPayload = {
      name: 'VC Organics Navi Mumbai',
      location: 'Vashi, Navi Mumbai',
      owner: 'Sanjay Deshmukh',
      phone: '9876543210',
      email: 'sanjay@vcorganic.com',
      gstin: '27AAAAA0000A1Z5',
      status: 'active',
      supplyList: [
        {
          productId: 'prod-1',
          name: 'A2 Cow Milk 1L',
          supplyPrice: 65,
          retailPrice: 85,
          isCustom: false
        }
      ]
    };

    const parsed = franchiseFormSchema.safeParse(validPayload);
    expect(parsed.success).toBe(true);
  });

  it('2. franchiseFormSchema rejects missing required fields and invalid GSTIN', () => {
    const invalidPayload = {
      name: '',
      location: '',
      owner: '',
      gstin: 'INVALID-GST'
    };

    const parsed = franchiseFormSchema.safeParse(invalidPayload);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      expect(fieldErrors.name).toBeDefined();
      expect(fieldErrors.location).toBeDefined();
      expect(fieldErrors.owner).toBeDefined();
      expect(fieldErrors.gstin).toBeDefined();
    }
  });

  it('3. supplyOrderFormSchema validates supply order items and payment status', () => {
    const validOrder = {
      franchiseId: 'fran-1',
      date: '2026-08-17',
      items: [
        {
          productId: 'prod-1',
          name: 'A2 Cow Milk 1L',
          qty: 50,
          supplyPrice: 65,
          gst: 5,
          isCustom: false
        }
      ],
      subtotal: 3250,
      tax: 162.5,
      grandTotal: 3412.5,
      paymentStatus: 'paid',
      notes: 'Dispatched via morning milk van'
    };

    const parsed = supplyOrderFormSchema.safeParse(validOrder);
    expect(parsed.success).toBe(true);
  });

  it('4. supplyOrderFormSchema rejects empty item list', () => {
    const invalidOrder = {
      franchiseId: 'fran-1',
      items: [],
      subtotal: 0,
      tax: 0,
      grandTotal: 0,
      paymentStatus: 'paid'
    };

    const parsed = supplyOrderFormSchema.safeParse(invalidOrder);
    expect(parsed.success).toBe(false);
  });
});
