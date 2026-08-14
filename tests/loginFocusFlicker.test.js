const fs = require('fs');
const path = require('path');

describe('Login Focus/Hover Flicker & Deterministic Layout Suite', () => {
  let html;

  beforeAll(() => {
    const htmlPath = path.join(__dirname, '..', 'aiavro_billing_system.html');
    html = fs.readFileSync(htmlPath, 'utf8');
  });

  test('1. Login input focus state does not alter layout dimensions (height/width/padding/margin)', () => {
    // Extract .login-input and .login-input:focus rules
    expect(html).toContain('.login-input:focus');
    expect(html).toContain('border-color:');
    expect(html).toContain('box-shadow:');
    // Ensure no height, width, padding, or margin changes in focus rule
    const focusMatch = html.match(/\.login-input:focus[^{]*\{([^}]+)\}/);
    expect(focusMatch).not.toBeNull();
    const focusBody = focusMatch[1];
    expect(focusBody).not.toMatch(/\bheight\s*:/);
    expect(focusBody).not.toMatch(/\bwidth\s*:/);
    expect(focusBody).not.toMatch(/\bpadding\s*:/);
    expect(focusBody).not.toMatch(/\bmargin\s*:/);
  });

  test('2. Login input wrapper has isolation and containment to eliminate tile invalidation flash', () => {
    expect(html).toContain('.login-input-wrapper');
    const wrapperMatch = html.match(/\.login-input-wrapper[^{]*\{([^}]+)\}/);
    expect(wrapperMatch).not.toBeNull();
    const wrapperBody = wrapperMatch[1];
    expect(wrapperBody).toContain('isolation: isolate');
    expect(wrapperBody).toContain('contain: paint');
  });

  test('3. Login card has isolation, contain: paint, and bounded max-height for responsive stability', () => {
    expect(html).toContain('.login-card');
    const cardMatch = html.match(/\.login-card[^{]*\{([^}]+)\}/);
    expect(cardMatch).not.toBeNull();
    const cardBody = cardMatch[1];
    expect(cardBody).toContain('isolation: isolate');
    expect(cardBody).toContain('contain: paint');
    expect(cardBody).toContain('max-height: calc(100dvh - 32px)');
    expect(cardBody).toContain('width: min(460px, calc(100vw - 32px))');
  });

  test('4. WebKit autofill styling is explicitly overridden to prevent native background flash', () => {
    expect(html).toContain('.login-input:-webkit-autofill');
    expect(html).toContain('-webkit-box-shadow: 0 0 0 1000px #1a1e32 inset');
  });

  test('5. Login password toggle button is isolated without changing input dimensions', () => {
    expect(html).toContain('.login-password-toggle');
    expect(html).toContain('position: absolute');
    expect(html).toContain('right: 12px');
    expect(html).toContain('width: 32px');
    expect(html).toContain('height: 32px');
  });

  test('6. Login button has paint-only hover and focus states without scale/layout distortion', () => {
    const btnMatch = html.match(/\.login-btn:hover[^{]*\{([^}]+)\}/);
    expect(btnMatch).not.toBeNull();
    const btnBody = btnMatch[1];
    expect(btnBody).not.toMatch(/\bscale\(/);
    expect(btnBody).not.toMatch(/\bwidth\s*:/);
    expect(btnBody).not.toMatch(/\bheight\s*:/);
  });
});
