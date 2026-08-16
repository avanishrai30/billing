import {
  userFormSchema,
  changePasswordSchema,
  updateProfileSchema
} from '../../features/users/schemas';

describe('User Validation Schemas Suite', () => {
  it('1. userFormSchema validates valid user registration payload', () => {
    const validUser = {
      name: 'Ramesh Patil',
      username: 'ramesh.patil',
      email: 'ramesh@example.com',
      phone: '9876543210',
      password: 'password123',
      role: 'Senior Store Cashier',
      category: 'employee',
      assignedStoreId: 'store-1',
      assignedStores: ['store-1'],
      status: 'active'
    };

    const parsed = userFormSchema.safeParse(validUser);
    expect(parsed.success).toBe(true);
  });

  it('2. userFormSchema rejects invalid username characters and short password', () => {
    const invalidUser = {
      name: '',
      username: 'Invalid Username With Spaces!',
      password: '123',
      role: ''
    };

    const parsed = userFormSchema.safeParse(invalidUser);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      expect(errors.name).toBeDefined();
      expect(errors.username).toBeDefined();
      expect(errors.password).toBeDefined();
      expect(errors.role).toBeDefined();
    }
  });

  it('3. changePasswordSchema validates matching passwords with min length', () => {
    const validChange = {
      currentPassword: 'oldPassword123',
      newPassword: 'newStrongPassword456',
      confirmPassword: 'newStrongPassword456'
    };

    const parsed = changePasswordSchema.safeParse(validChange);
    expect(parsed.success).toBe(true);
  });

  it('4. changePasswordSchema rejects mismatched passwords', () => {
    const mismatched = {
      currentPassword: 'oldPassword123',
      newPassword: 'newStrongPassword456',
      confirmPassword: 'differentPassword789'
    };

    const parsed = changePasswordSchema.safeParse(mismatched);
    expect(parsed.success).toBe(false);
  });
});
