#!/usr/bin/env node
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const {
  RUNTIME_ENVIRONMENTS,
  isPortListening,
  loadRuntimeEnvironment,
  requestHealth,
  validateRuntimeEnvironment
} = require('../services/runtimeConfig');

function parseArgs(argv) {
  const args = { env: process.env.APP_RUNTIME_ENV || '', cwd: true, health: true, pm2: true, port: null };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--env') args.env = argv[++i];
    else if (arg === '--no-health') args.health = false;
    else if (arg === '--no-pm2') args.pm2 = false;
    else if (arg === '--no-cwd') args.cwd = false;
    else if (arg === '--no-port') args.checkPort = false;
    else if (arg === '--expected-cwd') args.expectedCwd = argv[++i];
    else if (arg === '--service') args.service = argv[++i];
    else if (arg === '--port') args.port = Number(argv[++i]);
  }
  if (args.checkPort === undefined) args.checkPort = true;
  return args;
}

function run(command, args) {
  return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function assertPm2Identity(config, options) {
  const service = options.service || config.apiProcess;
  let describe;
  try {
    describe = run('pm2', ['jlist']);
  } catch (err) {
    throw new Error(`[deploy:check] Unable to inspect PM2. Is pm2 installed? ${err.stderr || err.message}`);
  }

  const processes = JSON.parse(describe || '[]');
  const matches = processes.filter((proc) => proc.name === service);
  if (matches.length !== 1) {
    throw new Error(`[deploy:check] Expected exactly one PM2 process named ${service}; found ${matches.length}.`);
  }

  const cwd = matches[0].pm2_env?.pm_cwd;
  const expectedCwd = options.expectedCwd || config.currentSymlink;
  if (path.resolve(cwd || '') !== path.resolve(expectedCwd)) {
    throw new Error(`[deploy:check] ${service} cwd must be ${expectedCwd}; found ${cwd || 'unknown'}.`);
  }

  return { service, cwd };
}

async function main() {
  const options = parseArgs(process.argv);
  const runtimeName = String(options.env || '').toLowerCase();
  const config = RUNTIME_ENVIRONMENTS[runtimeName];
  if (!config) {
    throw new Error('[deploy:check] Pass --env staging or --env production.');
  }

  process.env.APP_RUNTIME_ENV = runtimeName;
  const loaded = loadRuntimeEnvironment({ runtimeName });
  const validated = validateRuntimeEnvironment({ runtimeName });
  const port = options.port || validated.apiPort;

  if (options.cwd && !fs.existsSync(config.currentSymlink)) {
    throw new Error(`[deploy:check] Missing active-release symlink: ${config.currentSymlink}`);
  }

  const listening = options.checkPort ? await isPortListening(port) : null;
  if (options.checkPort && !listening) {
    throw new Error(`[deploy:check] Expected ${runtimeName} API port ${port} to be listening.`);
  }

  let pm2 = null;
  if (options.pm2) {
    pm2 = assertPm2Identity(config, options);
  }

  let health = null;
  if (options.health) {
    health = await requestHealth(port);
    if (!health.ok) {
      throw new Error(`[deploy:check] Health check failed on port ${port}: ${health.statusCode} ${health.body}`);
    }
  }

  console.log(JSON.stringify({
    success: true,
    runtime: runtimeName,
    envFile: loaded.envFile,
    port,
    portListening: listening,
    process: pm2,
    health
  }, null, 2));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
