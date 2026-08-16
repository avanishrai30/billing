import {
  supplierSchema,
  supplierFormSchema
} from '../../features/suppliers/schemas';

describe('Supplier Zod Validation Schemas', () => {
  it('1. Validates complete supplier document schema', () => {
    const validDoc = {
      id: 'sup-101',
      name: 'Golden Ghee Co.',
      contact: '9876543210',
      email: 'orders@goldenghee.com',
      gst: '27AAAAA0000A1Z5',
      address: 'Gujarat, India',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const res = supplierSchema.safeParse(validDoc);
    expect(res.success).toBe(true);
  });

  it('2. Validates minimal supplier form with only name and 10-digit contact', () => {
    const validMinimal = {
      name: 'Pure Dairy Products',
      contact: '9876543210'
    };

    const res = supplierFormSchema.safeParse(validMinimal);
    expect(res.success).toBe(true);
  });

  it('3. Rejects supplier form without name', () => {
    const invalid = {
      name: '',
      contact: '9876543210'
    };

    const res = supplierFormSchema.safeParse(invalid);
    expect(res.success).toBe(false);
  });

  it('4. Rejects contact numbers shorter than 10 digits', () => {
    const invalidContact = {
      name: 'Pure Dairy Products',
      contact: '12345'
    };

    const res = supplierFormSchema.safeParse(invalidContact);
    expect(res.success).toBe(false);
  });

  it('5. Rejects invalid email format', () => {
    const invalidEmail = {
      name: 'Pure Dairy Products',
      contact: '9876543210',
      email: 'not-an-email'
    };

    const res = supplierFormSchema.safeParse(invalidEmail);
    expect(res.success).toBe(false);
  });

  it('6. Rejects invalid GST pattern', () => {
    const invalidGst = {
      name: 'Pure Dairy Products',
      contact: '9876543210',
      gst: 'INVALIDGSTIN123'
    };

    const res = supplierFormSchema.safeParse(invalidGst);
    expect(res.success).toBe(false);
  });
});
