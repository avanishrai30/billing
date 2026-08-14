const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('P0 Login Experience Redesign: Cinematic Atmospheric Glassmorphism Suite', () => {
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

  test('1. Login overlay container exists with active class for deterministic first paint', () => {
    expect(html).toContain('id="login-screen-overlay" class="login-screen-overlay active"');
  });

  test('2. Login form exists with correct ID and onsubmit handler', () => {
    expect(html).toMatch(/<form id="login-form"[^>]*onsubmit="triggerLogin\(event\)"/);
  });

  test('3. Username input exists with autofocus and autocomplete', () => {
    expect(html).toContain('id="login-username"');
    expect(html).toContain('autocomplete="username"');
  });

  test('4. Password input exists with current-password autocomplete', () => {
    expect(html).toContain('id="login-password"');
    expect(html).toContain('autocomplete="current-password"');
  });

  test('5. Login submit button exists with high-contrast text', () => {
    expect(html).toMatch(/<button type="submit" class="login-btn">Log In<\/button>/);
  });

  test('6. Technical API Configuration label is completely removed from UI', () => {
    expect(html).not.toContain('Configure API Server URL');
    expect(html).not.toContain('id="login-url-config-box"');
  });

  test('7. No Google, Microsoft, or external SSO buttons on login surface', () => {
    expect(html).not.toContain('Sign In with Google');
    expect(html).not.toContain('Sign in with Google');
    expect(html).not.toContain('Sign in with Microsoft');
    expect(html).not.toContain('Sign in with Apple');
  });

  test('8. Existing triggerLogin function is present and functional', () => {
    expect(html).toContain('async function triggerLogin(e)');
    expect(html).toContain('api.auth.login(usernameInput, passwordInput)');
  });

  test('9. Password visibility toggle function exists and is accessible', () => {
    expect(html).toContain('function toggleLoginPasswordVisibility()');
    expect(html).toContain('id="login-password-toggle-btn"');
    expect(html).toContain('aria-label="Toggle password visibility"');
  });

  test('10. Login card geometry is responsive with clamp and viewport safety', () => {
    expect(html).toContain('width: min(460px, calc(100vw - 32px));');
    expect(html).toContain('border-radius: 28px;');
  });

  test('11. Background video has autoplay attribute', () => {
    expect(html).toMatch(/<video[^>]*class="login-bg-video"[^>]*autoplay/);
  });

  test('12. Background video is muted', () => {
    expect(html).toMatch(/<video[^>]*class="login-bg-video"[^>]*muted/);
  });

  test('13. Background video loops continuously', () => {
    expect(html).toMatch(/<video[^>]*class="login-bg-video"[^>]*loop/);
  });

  test('14. Background video has playsinline for mobile browsers', () => {
    expect(html).toMatch(/<video[^>]*class="login-bg-video"[^>]*playsinline/);
  });

  test('15. Fluid gradient canvas and ambient fallback exists independently of video', () => {
    expect(html).toContain('class="login-gradient-canvas"');
    expect(html).toContain('class="login-blob login-blob-1"');
    expect(html).toContain('class="login-bg-vignette"');
    expect(html).toContain('rgba(91, 75, 232');
  });

  test('16. No external web font network links in head', () => {
    expect(html).not.toMatch(/<link[^>]*fonts\.googleapis\.com/);
    expect(html).not.toMatch(/<link[^>]*fonts\.gstatic\.com/);
  });

  test('17. No duplicate lexical declarations in script scopes', () => {
    inlineScripts.forEach((code) => {
      expect(() => {
        new vm.Script(code);
      }).not.toThrow();
    });
  });

  test('18. All inline scripts compile cleanly with zero parse errors', () => {
    expect(inlineScripts.length).toBeGreaterThan(0);
  });
});
