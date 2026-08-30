const fs = require('fs');
const {
  RUNTIME_ENVIRONMENTS,
  assertRuntimeEnvFile,
  loadRuntimeEnvironment,
  parseEnvContent,
  resolveRuntimeName,
  validateRuntimeEnvironment
} = require('../services/runtimeConfig');

describe('Deployment runtime configuration loader', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('loads stable staging environment from /etc/vc-organic/staging.env', () => {
    jest.spyOn(fs, 'existsSync').mockImplementation((file) => file === RUNTIME_ENVIRONMENTS.staging.envFile);
    jest.spyOn(fs, 'readFileSync').mockImplementation(() => [
      'NODE_ENV=production',
      'APP_RUNTIME_ENV=staging',
      'JWT_SECRET=existing-staging-secret',
      'MONGODB_URI=mongodb://127.0.0.1:27017/staging',
      'UPLOAD_PATH=/opt/vc-organic-staging-uploads',
      'PORT=8281'
    ].join('\n'));

    const env = { APP_RUNTIME_ENV: 'staging' };
    const loaded = loadRuntimeEnvironment({ env });

    expect(loaded).toMatchObject({
      runtimeName: 'staging',
      envFile: '/etc/vc-organic/staging.env',
      loaded: true
    });
    expect(env.JWT_SECRET).toBe('existing-staging-secret');
    expect(validateRuntimeEnvironment({ env })).toBe(RUNTIME_ENVIRONMENTS.staging);
  });

  test('production without JWT_SECRET fails clearly during runtime validation', () => {
    const env = {
      NODE_ENV: 'production',
      APP_RUNTIME_ENV: 'production',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/prod',
      UPLOAD_PATH: '/opt/vc-organic-uploads',
      PORT: '8181'
    };

    expect(() => validateRuntimeEnvironment({ env })).toThrow(/JWT_SECRET is required/);
  });

  test('rejects wrong environment file for runtime identity', () => {
    expect(() => assertRuntimeEnvFile('staging', '/etc/vc-organic/production.env')).toThrow(
      /staging must load \/etc\/vc-organic\/staging\.env/
    );
  });

  test('rejects wrong port for stable environment configuration', () => {
    const env = {
      NODE_ENV: 'production',
      APP_RUNTIME_ENV: 'staging',
      JWT_SECRET: 'existing-staging-secret',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/staging',
      UPLOAD_PATH: '/opt/vc-organic-staging-uploads',
      PORT: '8181'
    };

    expect(() => validateRuntimeEnvironment({ env })).toThrow(/PORT must be 8281 for staging/);
  });

  test('parses quoted environment values without using release-local dotenv files', () => {
    const parsed = parseEnvContent([
      '# persistent runtime file',
      'NODE_ENV=production',
      'APP_RUNTIME_ENV="production"',
      "UPLOAD_PATH='/opt/vc-organic/uploads'"
    ].join('\n'));

    expect(parsed).toEqual({
      NODE_ENV: 'production',
      APP_RUNTIME_ENV: 'production',
      UPLOAD_PATH: '/opt/vc-organic/uploads'
    });
    expect(resolveRuntimeName(parsed)).toBe('production');
  });
});
