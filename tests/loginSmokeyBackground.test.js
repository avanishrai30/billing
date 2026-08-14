const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('P1 Smokey Fluid Apple-Style Login Background Suite', () => {
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

  test('1. Smokey background atmosphere and canvas exist with 5 fluid gradient blobs', () => {
    expect(html).toContain('class="login-atmosphere"');
    expect(html).toContain('class="login-gradient-canvas"');
    expect(html).toContain('class="login-blob login-blob-1"');
    expect(html).toContain('class="login-blob login-blob-2"');
    expect(html).toContain('class="login-blob login-blob-3"');
    expect(html).toContain('class="login-blob login-blob-4"');
    expect(html).toContain('class="login-blob login-blob-5"');
  });

  test('2. Palette uses deep indigo, electric blue, violet, lavender, and subtle cyan on #05070d base', () => {
    expect(html).toContain('background: #05070d');
    expect(html).toContain('17, 25, 74'); // Deep Indigo
    expect(html).toContain('36, 76, 255'); // Electric Blue
    expect(html).toContain('91, 75, 232'); // Violet
    expect(html).toContain('155, 140, 255'); // Lavender
    expect(html).toContain('54, 183, 255'); // Subtle Cyan Accent
  });

  test('3. Compositor-only keyframe animations exist with differing 28s–48s durations', () => {
    expect(html).toContain('@keyframes blobOrbit1');
    expect(html).toContain('@keyframes blobDrift2');
    expect(html).toContain('@keyframes blobBreathe3');
    expect(html).toContain('@keyframes blobDrift4');
    expect(html).toContain('@keyframes blobDrift5');
    expect(html).toContain('36s ease-in-out infinite alternate');
    expect(html).toContain('42s ease-in-out infinite alternate');
    expect(html).toContain('28s ease-in-out infinite alternate');
    expect(html).toContain('48s ease-in-out infinite alternate');
    expect(html).toContain('34s ease-in-out infinite alternate');
  });

  test('4. prefers-reduced-motion media query disables animations gracefully', () => {
    expect(html).toContain('@media (prefers-reduced-motion: reduce)');
    expect(html).toContain('animation: none !important');
  });

  test('5. Background animation strictly mutates transform/scale, never layout/dimensions', () => {
    const keyframes = html.match(/@keyframes\s+blob[A-Za-z0-9]+\s*\{([\s\S]*?)\n\s*\}/g) || [];
    expect(keyframes.length).toBeGreaterThanOrEqual(5);
    keyframes.forEach((kf) => {
      expect(kf).not.toMatch(/\b(width|height|margin|padding|top|left)\s*:/);
      expect(kf).toMatch(/transform:\s*translate3d/);
    });
  });

  test('6. Centered glass login card has fixed maximum bounds and internal scroll on small heights', () => {
    expect(html).toContain('class="login-card"');
    expect(html).toContain('width: min(460px, calc(100vw - 32px))');
    expect(html).toContain('max-height: calc(100dvh - 32px)');
    expect(html).toContain('overflow-y: auto');
    expect(html).toContain('isolation: isolate');
  });

  test('7. Dedicated #login-brand-logo exists in a fixed aspect-ratio container', () => {
    expect(html).toContain('id="login-brand-logo"');
    expect(html).toContain('.login-brand-logo-container');
    expect(html).toContain('width: 64px');
    expect(html).toContain('height: 64px');
    expect(html).toContain('object-fit: contain');
  });

  test('8. Dynamic #login-brand-name is authoritative for branding', () => {
    expect(html).toContain('id="login-brand-name"');
  });

  test('9. Public settings API and settings_updated socket handler hydrate branding', () => {
    expect(html).toContain('api.settings.getPublicSettings()');
    expect(html).toContain("syncSocket.on('settings_updated', handleSettingsUpdated)");
    expect(html).toContain("syncSocket.on('settings.updated', handleSettingsUpdated)");
  });

  test('10. Technical API config and demo credentials are fully absent from markup', () => {
    expect(html).not.toContain('admin123');
    expect(html).not.toContain('cashier123');
    expect(html).not.toContain('pos_cashier');
    expect(html).not.toContain('System Credentials');
    expect(html).not.toContain('Configure API Server URL');
    expect(html).not.toContain('API Gateway Endpoint URL');
  });

  test('11. No fake SSO, Google, Microsoft or Apple login buttons', () => {
    expect(html).not.toContain('Sign In with Google');
    expect(html).not.toContain('Sign in with Google');
    expect(html).not.toContain('Sign in with Microsoft');
    expect(html).not.toContain('Sign in with Apple');
  });

  test('12. Existing authentication contracts (triggerLogin, initAuthentication) are preserved', () => {
    expect(html).toContain('async function triggerLogin(e)');
    expect(html).toContain('function toggleLoginPasswordVisibility()');
    expect(html).toContain('function initAuthentication()');
    expect(html).toContain('api.auth.login');
  });

  test('13. All inline scripts compile cleanly without any syntax errors', () => {
    expect(inlineScripts.length).toBeGreaterThan(0);
    inlineScripts.forEach((code) => {
      expect(() => {
        new vm.Script(code);
      }).not.toThrow();
    });
  });
});
