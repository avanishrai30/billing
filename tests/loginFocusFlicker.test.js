const fs = require('fs');
const path = require('path');

describe('Login Focus/Hover Flicker & Deterministic Layout Suite', () => {
  let html;

  beforeAll(() => {
    const htmlPath = path.join(__dirname, '..', 'aiavro_billing_system.html');
    html = fs.readFileSync(htmlPath, 'utf8');
  });

  test('1. Login input focus state is strictly paint-only without layout geometry mutations', () => {
    expect(html).toContain('.login-input:focus');
    const focusMatch = html.match(/\.login-input:focus[^{]*\{([\s\S]*?)\}/);
    expect(focusMatch).not.toBeNull();
    const focusBody = focusMatch[1];
    
    // Prohibited layout-altering properties on focus
    expect(focusBody).not.toMatch(/\bheight\s*:/);
    expect(focusBody).not.toMatch(/\bwidth\s*:/);
    expect(focusBody).not.toMatch(/\bpadding\s*:/);
    expect(focusBody).not.toMatch(/\bmargin\s*:/);
    expect(focusBody).not.toMatch(/\bborder-width\s*:/);
    expect(focusBody).not.toMatch(/\btransform\s*:/);
    expect(focusBody).not.toMatch(/\btop\s*:/);
    expect(focusBody).not.toMatch(/\bleft\s*:/);
  });

  test('2. No dangerous "transition: all" or layout transition on login inputs', () => {
    const inputMatch = html.match(/\.login-input\s*\{([\s\S]*?)\}/);
    expect(inputMatch).not.toBeNull();
    const inputBody = inputMatch[1];
    expect(inputBody).not.toContain('transition: all');
    expect(inputBody).not.toMatch(/transition:[^;]*\b(width|height|margin|padding|transform)\b/);
  });

  test('3. Login card maintains isolation and deterministic viewport bounds without clipping sub-layers', () => {
    const cardMatch = html.match(/\.login-card\s*\{([\s\S]*?)\}/);
    expect(cardMatch).not.toBeNull();
    const cardBody = cardMatch[1];
    expect(cardBody).toContain('isolation: isolate');
    expect(cardBody).toContain('max-height: calc(100dvh - 32px)');
    expect(cardBody).toContain('width: min(460px, calc(100vw - 32px))');
  });

  test('4. WebKit autofill styling is explicitly overridden to prevent native background flash', () => {
    expect(html).toContain('.login-input:-webkit-autofill');
    expect(html).toContain('-webkit-box-shadow: 0 0 0 1000px #171b2d inset');
  });

  test('5. Login password toggle button is isolated without changing input dimensions', () => {
    const toggleMatch = html.match(/\.login-password-toggle\s*\{([\s\S]*?)\}/);
    expect(toggleMatch).not.toBeNull();
    const toggleBody = toggleMatch[1];
    expect(toggleBody).toContain('position: absolute');
    expect(toggleBody).toContain('right: 12px');
    expect(toggleBody).toContain('width: 32px');
    expect(toggleBody).toContain('height: 32px');
  });

  test('6. Login button has paint-only hover and focus states without scale/layout distortion', () => {
    const btnMatch = html.match(/\.login-btn:hover\s*\{([\s\S]*?)\}/);
    expect(btnMatch).not.toBeNull();
    const btnBody = btnMatch[1];
    expect(btnBody).not.toMatch(/\bscale\(/);
    expect(btnBody).not.toMatch(/\bwidth\s*:/);
    expect(btnBody).not.toMatch(/\bheight\s*:/);
  });

  test('7. Login overlay and login card are present and active by default', () => {
    expect(html).toContain('id="login-screen-overlay" class="login-screen-overlay active"');
    expect(html).toContain('class="login-card"');
  });

  test('8. No mousemove requestAnimationFrame parallax running on main thread', () => {
    expect(html).not.toContain('initLoginPointerParallax()');
  });
});
