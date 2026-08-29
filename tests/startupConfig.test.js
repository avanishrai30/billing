const jwt = require('jsonwebtoken');
const { LOCAL_JWT_SECRET, resolveJwtSecret } = require('../services/startupConfig');

describe('Startup JWT configuration validation', () => {
  test('production with JWT_SECRET starts with the provided secret', () => {
    expect(resolveJwtSecret({
      NODE_ENV: 'production',
      JWT_SECRET: 'existing-production-secret'
    })).toBe('existing-production-secret');
  });

  test('production without JWT_SECRET fails with a clear configuration error', () => {
    expect(() => resolveJwtSecret({ NODE_ENV: 'production' })).toThrow(
      /JWT_SECRET is required when NODE_ENV=production/
    );
  });

  test('development and test may use the documented local fallback', () => {
    expect(resolveJwtSecret({ NODE_ENV: 'development' })).toBe(LOCAL_JWT_SECRET);
    expect(resolveJwtSecret({ NODE_ENV: 'test' })).toBe(LOCAL_JWT_SECRET);
  });

  test('existing JWT tokens remain valid when the same production secret is loaded', () => {
    const productionSecret = 'stable-production-secret';
    const token = jwt.sign(
      { id: 'usr-1', username: 'rajesh', tokenVersion: 1 },
      productionSecret
    );

    const resolvedSecret = resolveJwtSecret({
      NODE_ENV: 'production',
      JWT_SECRET: productionSecret
    });

    const decoded = jwt.verify(token, resolvedSecret);
    expect(decoded).toMatchObject({
      id: 'usr-1',
      username: 'rajesh',
      tokenVersion: 1
    });
  });
});
