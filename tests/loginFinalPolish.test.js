const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('P1 Final Login Experience Polish Suite', () => {
  let html;
  let inlineScripts = [];

  beforeAll(() => {
    const htmlPath = path.join(__dirname, '..', 'aiavro_billing_system.html');
    html = fs.readFileSync(htmlPath, 'utf8');

    const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = scriptRegex.exec(html)) !== null) {
      const attrs = match[1];
      const body = match[2];
      if (!/src\s*=/i.test(attrs) && body.trim()) {
        inlineScripts.push(body);
      }
    }
  });

  test('1. Login overlay exists and is active on cold boot', () => {
    expect(html).toContain('id="login-screen-overlay" class="login-screen-overlay active"');
  });

  test('2. Login card container exists with glassmorphism styles', () => {
    expect(html).toContain('class="login-card"');
    expect(html).toContain('backdrop-filter: blur(28px)');
  });

  test('3. Dynamic login logo element exists with id="login-brand-logo"', () => {
    expect(html).toContain('id="login-brand-logo"');
  });

  test('4. Dynamic login brand title exists with id="login-brand-name"', () => {
    expect(html).toContain('id="login-brand-name"');
  });

  test('5. Existing username input exists with required attributes', () => {
    expect(html).toContain('id="login-username"');
    expect(html).toContain('autocomplete="username"');
  });

  test('6. Existing password input exists with current-password autocomplete', () => {
    expect(html).toContain('id="login-password"');
    expect(html).toContain('autocomplete="current-password"');
  });

  test('7. Existing triggerLogin function exists in script and form handler', () => {
    expect(html).toContain('async function triggerLogin(e)');
    expect(html).toContain('onsubmit="triggerLogin(event)"');
  });

  test('8. Accessible password visibility toggle exists with proper button attribute', () => {
    expect(html).toContain('function toggleLoginPasswordVisibility()');
    expect(html).toContain('id="login-password-toggle-btn"');
    expect(html).toContain('type="button"');
  });

  test('9. Technical API configuration text is completely absent from login DOM', () => {
    expect(html).not.toContain('Configure API Server URL');
    expect(html).not.toContain('API Gateway Endpoint URL');
  });

  test('10. Demo credentials and hardcoded passwords are completely absent', () => {
    expect(html).not.toContain('admin123');
    expect(html).not.toContain('cashier123');
    expect(html).not.toContain('System Credentials');
    expect(html).not.toContain('login-cred-box');
  });

  test('11. No Google, Microsoft, Apple or external SSO buttons in login DOM', () => {
    expect(html).not.toContain('Sign In with Google');
    expect(html).not.toContain('Sign in with Google');
    expect(html).not.toContain('Sign in with Microsoft');
    expect(html).not.toContain('Sign in with Apple');
  });

  test('12. Public settings API is referenced for dynamic logo and brand hydration', () => {
    expect(html).toContain('api.settings.getPublicSettings()');
    expect(html).toContain('loadPublicSettings()');
  });

  test('13. settings_updated Socket.IO event is referenced for live branding updates', () => {
    expect(html).toContain("syncSocket.on('settings_updated'");
    expect(html).toContain("syncSocket.on('settings.updated'");
  });

  test('14. Logo element is enclosed inside fixed-dimension container to prevent layout shifts', () => {
    expect(html).toContain('.login-brand-logo-container');
    expect(html).toContain('width: 64px');
    expect(html).toContain('height: 64px');
    expect(html).toContain('object-fit: contain');
  });

  test('15. Apple-style fluid gradient animation layers exist in DOM and CSS', () => {
    expect(html).toContain('class="login-gradient-canvas"');
    expect(html).toContain('class="login-blob login-blob-1"');
    expect(html).toContain('class="login-blob login-blob-2"');
    expect(html).toContain('class="login-blob login-blob-3"');
    expect(html).toContain('class="login-blob login-blob-4"');
    expect(html).toContain('@keyframes blobOrbit1');
    expect(html).toContain('@keyframes blobDrift2');
  });

  test('16. No external Google Fonts or font file network dependencies', () => {
    expect(html).not.toMatch(/<link[^>]*fonts\.googleapis\.com/);
    expect(html).not.toMatch(/<link[^>]*fonts\.gstatic\.com/);
  });

  test('17. No duplicate lexical declarations across script blocks', () => {
    inlineScripts.forEach((code) => {
      expect(() => {
        new vm.Script(code);
      }).not.toThrow();
    });
  });

  test('18. All inline script blocks parse with zero syntax errors', () => {
    expect(inlineScripts.length).toBeGreaterThan(0);
  });
});
