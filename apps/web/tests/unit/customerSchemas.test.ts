import {
  customerSchema,
  customerFormSchema
} from '../../features/customers/schemas';

describe('Customer Zod Validation Schemas', () => {
  it('1. Validates complete customer document schema', () => {
    const validDoc = {
      id: 'cust-101',
      name: 'Avanish Rai',
      phone: '9876543210',
      email: 'avanish@example.com',
      gstin: '27AAAAA0000A1Z5',
      address: 'Mumbai, India',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const res = customerSchema.safeParse(validDoc);
    expect(res.success).toBe(true);
  });

  it('2. Validates minimal customer form with only name and 10-digit phone', () => {
    const validMinimal = {
      name: 'Rohan Sharma',
      phone: '9876543210'
    };

    const res = customerFormSchema.safeParse(validMinimal);
    expect(res.success).toBe(true);
  });

  it('3. Rejects customer form without name', () => {
    const invalid = {
      name: '',
      phone: '9876543210'
    };

    const res = customerFormSchema.safeParse(invalid);
    expect(res.success).toBe(false);
  });

  it('4. Rejects phone numbers shorter than 10 digits', () => {
    const invalidPhone = {
      name: 'Rohan Sharma',
      phone: '12345'
    };

    const res = customerFormSchema.safeParse(invalidPhone);
    expect(res.success).toBe(false);
  });

  it('5. Rejects invalid email format', () => {
    const invalidEmail = {
      name: 'Rohan Sharma',
      phone: '9876543210',
      email: 'not-an-email'
    };

    const res = customerFormSchema.safeParse(invalidEmail);
    expect(res.success).toBe(false);
  });

  it('6. Rejects invalid GSTIN pattern', () => {
    const invalidGst = {
      name: 'Rohan Sharma',
      phone: '9876543210',
      gstin: 'INVALIDGSTIN123'
    };

    const res = customerFormSchema.safeParse(invalidGst);
    expect(res.success).toBe(false);
  });
});
