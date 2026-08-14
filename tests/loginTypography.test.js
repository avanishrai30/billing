const fs = require('fs');
const path = require('path');

describe('P1 Login Typography Refinement Suite', () => {
  let html;

  beforeAll(() => {
    const htmlPath = path.join(__dirname, '..', 'aiavro_billing_system.html');
    html = fs.readFileSync(htmlPath, 'utf8');
  });

  test('1. Intended classic human-designed font stack exists in login rules', () => {
    expect(html).toContain('"Avenir Next", "Helvetica Neue", Helvetica, Arial, sans-serif');
  });

  test('2. Forbidden AI/futuristic/playful font names do NOT exist in login styling', () => {
    const forbiddenFonts = [
      'Poppins',
      'Montserrat',
      'Plus Jakarta Sans',
      'Space Grotesk',
      'Sora',
      'Orbitron'
    ];
    // Check inside login-screen-overlay and login-card rules
    const loginSection = html.slice(
      html.indexOf('.login-screen-overlay {'),
      html.indexOf('.login-error {') + 300
    );
    forbiddenFonts.forEach((font) => {
      expect(loginSection).not.toContain(font);
    });
  });

  test('3. No external Google Fonts, @font-face, or woff/woff2 font files in HTML', () => {
    expect(html).not.toMatch(/<link[^>]*fonts\.googleapis\.com/i);
    expect(html).not.toMatch(/<link[^>]*fonts\.gstatic\.com/i);
    expect(html).not.toContain('@font-face');
    expect(html).not.toContain('.woff2');
    expect(html).not.toContain('.woff');
  });

  test('4. Heading "Welcome back" uses refined 400 weight, responsive clamp size, and -0.02em letter spacing', () => {
    expect(html).toContain('.login-welcome-heading');
    const headingMatch = html.match(/\.login-welcome-heading\s*\{([\s\S]*?)\}/);
    expect(headingMatch).not.toBeNull();
    const headingBody = headingMatch[1];
    expect(headingBody).toContain('font-weight: 400');
    expect(headingBody).toContain('letter-spacing: -0.02em');
    expect(headingBody).toContain('line-height: 1.08');
    expect(headingBody).toMatch(/font-size:\s*clamp\(32px/);
  });

  test('5. Dynamic Brand Title uses 600 weight and -0.01em letter spacing', () => {
    const titleMatch = html.match(/\.login-brand-title\s*\{([\s\S]*?)\}/);
    expect(titleMatch).not.toBeNull();
    const titleBody = titleMatch[1];
    expect(titleBody).toContain('font-weight: 600');
    expect(titleBody).toContain('letter-spacing: -0.01em');
  });

  test('6. Billing OS badge uses restrained 11px, 600 weight, and 0.10em letter spacing', () => {
    const badgeMatch = html.match(/\.login-brand-badge\s*\{([\s\S]*?)\}/);
    expect(badgeMatch).not.toBeNull();
    const badgeBody = badgeMatch[1];
    expect(badgeBody).toContain('font-size: 11px');
    expect(badgeBody).toContain('font-weight: 600');
    expect(badgeBody).toContain('letter-spacing: 0.10em');
    expect(badgeBody).toContain('text-transform: uppercase');
  });

  test('7. Subtitle uses 14px, 400 weight, 1.5 line height, and controlled max-width', () => {
    const descMatch = html.match(/\.login-welcome-desc\s*\{([\s\S]*?)\}/);
    expect(descMatch).not.toBeNull();
    const descBody = descMatch[1];
    expect(descBody).toContain('font-size: 14px');
    expect(descBody).toContain('font-weight: 400');
    expect(descBody).toContain('line-height: 1.5');
    expect(descBody).toContain('max-width: 380px');
  });

  test('8. Field labels use subtle 11px, 600 weight, and 0.08em letter spacing', () => {
    const labelMatch = html.match(/\.login-label\s*\{([\s\S]*?)\}/);
    expect(labelMatch).not.toBeNull();
    const labelBody = labelMatch[1];
    expect(labelBody).toContain('font-size: 11px');
    expect(labelBody).toContain('font-weight: 600');
    expect(labelBody).toContain('letter-spacing: 0.08em');
    expect(labelBody).toContain('text-transform: uppercase');
  });

  test('9. Input text uses 15px, 400 weight, 1.4 line height, and non-bold placeholder', () => {
    const inputMatch = html.match(/\.login-input\s*\{([\s\S]*?)\}/);
    expect(inputMatch).not.toBeNull();
    const inputBody = inputMatch[1];
    expect(inputBody).toContain('font-size: 15px');
    expect(inputBody).toContain('font-weight: 400');
    expect(inputBody).toContain('line-height: 1.4');

    const phMatch = html.match(/\.login-input::placeholder\s*\{([\s\S]*?)\}/);
    expect(phMatch).not.toBeNull();
    const phBody = phMatch[1];
    expect(phBody).toContain('font-size: 14px');
    expect(phBody).toContain('font-weight: 400');
  });

  test('10. Login CTA button uses 15px, 600 weight, and 0 letter spacing without uppercase', () => {
    const btnMatch = html.match(/\.login-btn\s*\{([\s\S]*?)\}/);
    expect(btnMatch).not.toBeNull();
    const btnBody = btnMatch[1];
    expect(btnBody).toContain('font-size: 15px');
    expect(btnBody).toContain('font-weight: 600');
    expect(btnBody).toContain('letter-spacing: 0');
    expect(btnBody).not.toContain('text-transform: uppercase');
  });

  test('11. Anti-aliasing and subpixel text rendering optimizations are active', () => {
    expect(html).toContain('-webkit-font-smoothing: antialiased');
    expect(html).toContain('-moz-osx-font-smoothing: grayscale');
    expect(html).toContain('text-rendering: optimizeLegibility');
  });

  test('12. No CSS gradient text or background-clip text on login typography', () => {
    const loginSection = html.slice(
      html.indexOf('.login-screen-overlay {'),
      html.indexOf('.login-error {') + 300
    );
    expect(loginSection).not.toContain('background-clip: text');
    expect(loginSection).not.toContain('-webkit-background-clip: text');
  });
});
