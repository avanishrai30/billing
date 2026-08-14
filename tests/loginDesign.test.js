const fs = require('fs');
const path = require('path');

describe('AIAVRO premium login design', () => {
  const root = path.join(__dirname, '..');
  const htmlPath = path.join(root, 'aiavro_billing_system.html');
  const themePath = path.join(root, 'ui', 'theme.css');
  const componentsPath = path.join(root, 'ui', 'components.css');

  let html;
  let theme;
  let components;
  let loginCss;
  let loginMarkup;

  beforeAll(() => {
    html = fs.readFileSync(htmlPath, 'utf8');
    theme = fs.readFileSync(themePath, 'utf8');
    components = fs.readFileSync(componentsPath, 'utf8');
    const cssStart = html.indexOf('/* ==================== LOGIN SCREEN OVERLAY');
    const cssEnd = html.indexOf('/* ==================== RESPONSIVE DESIGN', cssStart);
    loginCss = html.slice(cssStart, cssEnd);
    const markupStart = html.indexOf('id="login-screen-overlay"');
    const markupEnd = html.indexOf('<div class="app-container"', markupStart);
    loginMarkup = html.slice(markupStart, markupEnd);
  });

  test('1. login card exists', () => {
    expect(loginMarkup).toContain('class="login-card"');
    expect(loginCss).toContain('.login-card');
  });

  test('2. official logo appears', () => {
    expect(loginMarkup).toContain('id="login-brand-logo-img"');
    expect(loginMarkup).toContain('alt="AIAVRO logo"');
    expect(loginMarkup).toContain('width="64" height="64"');
  });

  test('3. logo appears above fields', () => {
    expect(loginMarkup.indexOf('id="login-brand-logo-img"')).toBeLessThan(loginMarkup.indexOf('id="login-username"'));
    expect(loginMarkup.indexOf('id="login-brand-name"')).toBeLessThan(loginMarkup.indexOf('id="login-password"'));
  });

  test('4. username input exists', () => {
    expect(loginMarkup).toContain('id="login-username"');
    expect(loginMarkup).toContain('for="login-username"');
  });

  test('5. password input exists', () => {
    expect(loginMarkup).toContain('id="login-password"');
    expect(loginMarkup).toContain('for="login-password"');
  });

  test('6. password toggle exists', () => {
    expect(loginMarkup).toContain('id="login-password-toggle"');
    expect(loginMarkup).toContain('aria-label="Show password"');
    expect(html).toContain('function toggleLoginPasswordVisibility()');
  });

  test('7. login button exists', () => {
    expect(loginMarkup).toContain('<button type="submit" class="login-btn">Login</button>');
    expect(html).toContain('loginBtn.innerText = "Signing in..."');
    expect(html).toContain('loginBtn.innerText = "Login"');
  });

  test('8. no Google login markup', () => {
    expect(loginMarkup).not.toMatch(/google|gmail|oauth/i);
  });

  test('9. no Microsoft login markup', () => {
    expect(loginMarkup).not.toMatch(/microsoft|office|azure/i);
  });

  test('10. no phone mockup markup', () => {
    expect(loginMarkup).not.toMatch(/phone mockup|mobile mockup|device-frame|phone-frame|iphone/i);
  });

  test('11. autocomplete username is preserved', () => {
    expect(loginMarkup).toContain('autocomplete="username"');
  });

  test('12. autocomplete current-password is preserved', () => {
    expect(loginMarkup).toContain('autocomplete="current-password"');
  });

  test('13. no Google Fonts', () => {
    const combined = `${html}\n${theme}\n${components}`;
    expect(combined).not.toMatch(/fonts\.googleapis|fonts\.gstatic/i);
  });

  test('14. no woff or woff2 references', () => {
    const combined = `${html}\n${theme}\n${components}`;
    expect(combined).not.toMatch(/\.woff2?|@font-face/i);
  });

  test('15. app shell initial state remains stable', () => {
    expect(html).toContain('<div class="app-container" data-render-layer="shell" style="display:none">');
    expect(html).toContain('appContainer.style.display = "grid"');
  });

  test('16. login overlay initial state remains stable', () => {
    expect(html).toContain('class="login-screen-overlay active" data-auth-state="pending"');
    expect(html).toContain('loginOverlay.setAttribute("data-auth-state", "login")');
  });

  test('17. no duplicate login handlers', () => {
    expect((loginMarkup.match(/onsubmit="triggerLogin\(event\)"/g) || [])).toHaveLength(1);
    expect((loginMarkup.match(/onclick="toggleLoginPasswordVisibility\(\)"/g) || [])).toHaveLength(1);
  });

  test('18. reduced-motion behavior exists', () => {
    expect(html).toContain('@media (prefers-reduced-motion: reduce)');
    expect(loginCss).toContain('loginOrganicDrift');
    expect(loginCss).toContain('loginOrganicFloat');
  });

  test('19. real login function remains connected', () => {
    expect(html).toContain('async function triggerLogin(e)');
    expect(html).toContain('api.auth.login(usernameInput, passwordInput)');
    expect(html).toContain('if (loginBtn && loginBtn.disabled) return');
    expect(html).toContain('setAttribute("aria-invalid", "true")');
  });

  test('20. no sample or fake authentication data', () => {
    expect(loginMarkup).not.toMatch(/sample user|fake user|demo password|dummy auth|mock login/i);
  });
});
