const LOCAL_JWT_SECRET = 'vc_organic_local_dev_jwt_secret_2026';

function resolveJwtSecret(env = process.env) {
  const nodeEnv = String(env.NODE_ENV || '').toLowerCase();
  const explicitSecret = typeof env.JWT_SECRET === 'string' ? env.JWT_SECRET.trim() : '';

  if (explicitSecret) {
    return explicitSecret;
  }

  if (nodeEnv === 'production') {
    throw new Error(
      '[Startup Config] JWT_SECRET is required when NODE_ENV=production. ' +
      'Set process.env.JWT_SECRET to the existing production signing secret before starting the API.'
    );
  }

  return LOCAL_JWT_SECRET;
}

module.exports = {
  LOCAL_JWT_SECRET,
  resolveJwtSecret
};
