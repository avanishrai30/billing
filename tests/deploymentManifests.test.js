const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('Stable deployment manifests and scripts', () => {
  test('staging PM2 manifest uses stable names, ports, symlink cwd, and external env file', () => {
    const content = read('ops/ecosystem.staging.config.js');

    expect(content).toContain("vc-organic-api-staging");
    expect(content).toContain("vc-organic-web-staging");
    expect(content).toContain("/opt/vc-organic-staging-current");
    expect(content).toContain("/etc/vc-organic/staging.env");
    expect(content).toContain("Missing required staging runtime environment file");
    expect(content).toContain("PORT: '8281'");
    expect(content).toContain("-p 3000");
    expect(content).toContain("max_restarts: 5");
    expect(content).not.toContain("vc-organic-billing-api-staging");
  });

  test('production PM2 manifest uses stable names, ports, symlink cwd, and external env file', () => {
    const content = read('ops/ecosystem.production.config.js');

    expect(content).toContain("vc-organic-api-production");
    expect(content).toContain("vc-organic-web-production");
    expect(content).toContain("/opt/vc-organic-production-current");
    expect(content).toContain("/etc/vc-organic/production.env");
    expect(content).toContain("Missing required production runtime environment file");
    expect(content).toContain("PORT: '8181'");
    expect(content).toContain("-p 3001");
    expect(content).toContain("max_restarts: 5");
    expect(content).not.toContain("vc-organic-billing-api");
  });

  test('deploy scripts include lock, immutable release, health failure rollback, and retention', () => {
    for (const script of ['scripts/deploy-staging.sh', 'scripts/deploy-production.sh']) {
      const content = read(script);
      expect(content).toContain('flock -n');
      expect(content).toContain('prepare_release');
      expect(content).toContain('health_check');
      expect(content).toContain('rollback');
      expect(content).toContain('retain_releases');
      expect(content).toContain('pm2 startOrReload');
      expect(content).not.toContain('nginx');
      expect(content).not.toContain('migrate');
    }
  });

  test('preflight command protects against duplicate PM2 identity and failed health check', () => {
    const content = read('scripts/deploy-check.js');

    expect(content).toContain('Expected exactly one PM2 process named');
    expect(content).toContain('Health check failed');
    expect(content).toContain('API port');
    expect(content).toContain('to be listening');
  });
});
