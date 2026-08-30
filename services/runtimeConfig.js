const fs = require('fs');
const net = require('net');
const path = require('path');
const http = require('http');

const RUNTIME_ENVIRONMENTS = {
  staging: {
    name: 'staging',
    envFile: '/etc/vc-organic/staging.env',
    apiPort: 8281,
    webPort: 3000,
    apiProcess: 'vc-organic-api-staging',
    webProcess: 'vc-organic-web-staging',
    currentSymlink: '/opt/vc-organic-staging-current'
  },
  production: {
    name: 'production',
    envFile: '/etc/vc-organic/production.env',
    apiPort: 8181,
    webPort: 3001,
    apiProcess: 'vc-organic-api-production',
    webProcess: 'vc-organic-web-production',
    currentSymlink: '/opt/vc-organic-production-current'
  }
};

const REQUIRED_RUNTIME_VARS = ['NODE_ENV', 'APP_RUNTIME_ENV', 'JWT_SECRET', 'MONGODB_URI', 'UPLOAD_PATH', 'PORT'];

function parseEnvContent(content) {
  const parsed = {};
  String(content || '').split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) parsed[key] = value;
  });
  return parsed;
}

function resolveRuntimeName(env = process.env) {
  const raw = String(env.APP_RUNTIME_ENV || env.VC_ORGANIC_RUNTIME_ENV || '').trim().toLowerCase();
  if (raw === 'staging' || raw === 'production') return raw;
  if (raw) {
    throw new Error(`[Runtime Config] Unsupported APP_RUNTIME_ENV '${raw}'. Expected staging or production.`);
  }
  return null;
}

function expectedRuntimeConfig(runtimeName) {
  const config = RUNTIME_ENVIRONMENTS[runtimeName];
  if (!config) {
    throw new Error(`[Runtime Config] Unsupported runtime '${runtimeName}'. Expected staging or production.`);
  }
  return config;
}

function applyEnv(parsed, env = process.env) {
  Object.entries(parsed).forEach(([key, value]) => {
    env[key] = value;
  });
}

function assertRuntimeEnvFile(runtimeName, envFile) {
  const expected = expectedRuntimeConfig(runtimeName).envFile;
  if (path.resolve(envFile) !== path.resolve(expected)) {
    throw new Error(
      `[Runtime Config] ${runtimeName} must load ${expected}; received ${envFile}.`
    );
  }
}

function loadRuntimeEnvironment(options = {}) {
  const env = options.env || process.env;
  const runtimeName = options.runtimeName || resolveRuntimeName(env);
  if (!runtimeName) {
    return { runtimeName: 'local', envFile: null, loaded: false, config: null };
  }

  const config = expectedRuntimeConfig(runtimeName);
  const envFile = options.envFile || config.envFile;
  assertRuntimeEnvFile(runtimeName, envFile);

  if (!fs.existsSync(envFile)) {
    throw new Error(`[Runtime Config] Missing required ${runtimeName} environment file: ${envFile}`);
  }

  const parsed = parseEnvContent(fs.readFileSync(envFile, 'utf8'));
  applyEnv(parsed, env);
  env.APP_RUNTIME_ENV = runtimeName;

  return { runtimeName, envFile, loaded: true, config };
}

function validateRuntimeEnvironment(options = {}) {
  const env = options.env || process.env;
  const runtimeName = options.runtimeName || resolveRuntimeName(env);
  if (!runtimeName) {
    throw new Error('[Runtime Config] APP_RUNTIME_ENV is required for deployment preflight.');
  }

  const config = expectedRuntimeConfig(runtimeName);
  const errors = [];
  for (const key of REQUIRED_RUNTIME_VARS) {
    if (!String(env[key] || '').trim()) errors.push(`${key} is required`);
  }

  if (env.APP_RUNTIME_ENV !== runtimeName) {
    errors.push(`APP_RUNTIME_ENV must be ${runtimeName}`);
  }
  if (env.NODE_ENV !== 'production') {
    errors.push('NODE_ENV must be production');
  }
  if (Number(env.PORT) !== config.apiPort) {
    errors.push(`PORT must be ${config.apiPort} for ${runtimeName}`);
  }

  if (errors.length) {
    throw new Error(`[Runtime Config] Invalid ${runtimeName} configuration: ${errors.join('; ')}`);
  }

  return config;
}

function getRuntimeConfig(env = process.env) {
  const runtimeName = resolveRuntimeName(env);
  return runtimeName ? expectedRuntimeConfig(runtimeName) : null;
}

function isPortListening(port, host = '127.0.0.1', timeoutMs = 1000) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host });
    const done = (result) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

function requestHealth(port, host = '127.0.0.1', timeoutMs = 3000) {
  return new Promise((resolve) => {
    const req = http.get({ host, port, path: '/health', timeout: timeoutMs }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ ok: res.statusCode === 200, statusCode: res.statusCode, body }));
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, statusCode: 0, body: 'timeout' });
    });
    req.on('error', (err) => resolve({ ok: false, statusCode: 0, body: err.message }));
  });
}

module.exports = {
  REQUIRED_RUNTIME_VARS,
  RUNTIME_ENVIRONMENTS,
  applyEnv,
  assertRuntimeEnvFile,
  expectedRuntimeConfig,
  getRuntimeConfig,
  isPortListening,
  loadRuntimeEnvironment,
  parseEnvContent,
  requestHealth,
  resolveRuntimeName,
  validateRuntimeEnvironment
};
