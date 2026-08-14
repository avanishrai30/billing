const fs = require('fs');
const path = require('path');

describe('Login render-layer regression guard', () => {
  const root = path.join(__dirname, '..');
  const htmlPath = path.join(root, 'aiavro_billing_system.html');

  let html;
  let loginCss;
  let loginMarkup;

  beforeAll(() => {
    html = fs.readFileSync(htmlPath, 'utf8');
    const cssStart = html.indexOf('/* ==================== LOGIN SCREEN OVERLAY');
    const cssEnd = html.indexOf('/* ==================== RESPONSIVE DESIGN', cssStart);
    loginCss = html.slice(cssStart, cssEnd);
    const markupStart = html.indexOf('id="login-screen-overlay"');
    const markupEnd = html.indexOf('<div class="app-container"', markupStart);
    loginMarkup = html.slice(markupStart, markupEnd);
  });

  test('1. login overlay is the only initial auth surface', () => {
    expect(html).toContain('class="login-screen-overlay active" data-auth-state="pending"');
    expect(html).toContain('<div class="app-container" style="display:none">');
    expect(loginMarkup).toContain('class="login-card"');
    expect(loginMarkup).not.toMatch(/modal-backdrop|skeleton-box|boot|preloader|splash/i);
  });

  test('2. login card cannot paint the previous oversized horizontal block', () => {
    expect(loginCss).toContain('width: min(440px, calc(100vw - 32px))');
    expect(loginCss).toContain('min-height: 0');
    expect(loginCss).toContain('max-height: calc(100vh - 32px)');
    expect(loginCss).not.toMatch(/width:\s*min\(720px,\s*58vw\)/);
    expect(loginCss).not.toMatch(/min-height:\s*min\(640px,\s*calc\(100vh - 96px\)\)/);
  });

  test('3. decorative login pseudo-elements stay contained inside the card', () => {
    expect(loginCss).toMatch(/\.login-card::before[\s\S]*width:\s*96px/);
    expect(loginCss).toMatch(/\.login-card::before[\s\S]*height:\s*96px/);
    expect(loginCss).not.toMatch(/\.login-card::before[\s\S]*height:\s*118%/);
    expect(loginCss).not.toMatch(/\.login-card::before[\s\S]*right:\s*-22%/);
  });

  test('4. mobile login layout is viewport-bound and text can wrap', () => {
    expect(loginCss).toContain('box-sizing: border-box');
    expect(loginCss).toContain('overflow-wrap: anywhere');
    expect(loginCss).toContain('width: min(260px, calc(100vw - 112px))');
    expect(loginCss).toContain('font-size: clamp(28px, 8vw, 34px)');
  });

  test('5. authentication display state remains behaviorally unchanged', () => {
    expect(html).toContain('loginOverlay.setAttribute("data-auth-state", "authenticated")');
    expect(html).toContain('loginOverlay.classList.remove("active")');
    expect(html).toContain('appContainer.style.display = "grid"');
    expect(html).toContain('loginOverlay.setAttribute("data-auth-state", "login")');
    expect(html).toContain('appContainer.style.display = "none"');
  });

  test('6. no app-owned initial modal or duplicate visible view is introduced', () => {
    const activeModalMarkup = html.match(/<div[^>]+class="[^"]*modal-backdrop[^"]*active[^"]*"/g) || [];
    expect(activeModalMarkup).toHaveLength(0);
    expect(html).not.toMatch(/class="[^"]*app-view[^"]*active[^"]*app-view[^"]*active/);
  });

  test('7. native password manager and backend contracts are untouched', () => {
    expect(loginMarkup).toContain('autocomplete="username"');
    expect(loginMarkup).toContain('autocomplete="current-password"');
    expect(html).not.toMatch(/password-manager|credentialsContainer|:-webkit-autofill/);
    expect(html).not.toMatch(/fake invoice|fake inventory|fake product|sample purchase/i);
  });
});
