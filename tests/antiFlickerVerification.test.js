const fs = require('fs');
const path = require('path');

describe('Anti-Flicker & Zero-FOUC Architecture Verification', () => {
  let html;

  beforeAll(() => {
    html = fs.readFileSync(path.join(__dirname, '../aiavro_billing_system.html'), 'utf8');
  });

  test('TEST E: Stale fonts purge — 0 remote font dependencies or stale font declarations', () => {
    expect(html).not.toMatch(/<link[^>]*fonts\.googleapis\.com/);
    expect(html).not.toMatch(/<link[^>]*fonts\.gstatic\.com/);
    expect(html).not.toMatch(/font-family:[^;]*'Outfit'/);
    expect(html).not.toMatch(/font-family:[^;]*"Outfit"/);
    expect(html).not.toMatch(/font-family:[^;]*'Plus Jakarta Sans'/);
    expect(html).not.toMatch(/font-family:[^;]*"Plus Jakarta Sans"/);
    expect(html).not.toMatch(/@font-face/);
  });

  test('External library scripts in head have defer attribute to prevent render blocking', () => {
    const headMatch = html.match(/<head>[\s\S]*?<\/head>/i);
    expect(headMatch).toBeTruthy();
    const headContent = headMatch[0];
    
    const scriptTags = headContent.match(/<script\b[^>]*>/gi) || [];
    const srcScripts = scriptTags.filter(tag => tag.includes('src='));
    
    srcScripts.forEach(tag => {
      expect(tag).toContain('defer');
    });
  });

  test('TEST A: Preferred App Shell Lifecycle — display:none when logged out, display:grid on auth', () => {
    expect(html).toContain('class="app-container" style="display:none"');
    expect(html).toContain('appContainer.style.display = "grid"');
    expect(html).toContain('appContainer.style.display = "none"');
    // Ensure visibility:hidden data-loading was rejected as per Test A
    expect(html).not.toContain('.app-container[data-loading]');
  });

  test('TEST B: syncStateWithServer uses atomic Promise.all parallel batching', () => {
    expect(html).toContain('Promise.all(promises)');
    const syncMatch = html.match(/function syncStateWithServer[\s\S]*?^    \}/m);
    expect(syncMatch).toBeTruthy();
    const syncBody = syncMatch[0];
    const awaitApiCount = (syncBody.match(/await api\./g) || []).length;
    expect(awaitApiCount).toBe(0);
  });

  test('TEST C: Preferred Login Lifecycle — state sync -> determine view -> render -> reveal shell', () => {
    const initAuthMatch = html.match(/function initAuthentication[\s\S]*?^    \}/m);
    expect(initAuthMatch).toBeTruthy();
    const initAuthBody = initAuthMatch[0];
    
    const switchPos = initAuthBody.indexOf('switchView(state.activeView)');
    const revealPos = initAuthBody.indexOf('appContainer.style.display = "grid"');
    
    expect(switchPos).toBeGreaterThan(-1);
    expect(revealPos).toBeGreaterThan(-1);
    // View is rendered BEFORE revealing shell to prevent empty frame flash
    expect(switchPos).toBeLessThan(revealPos);
  });

  test('CSS --transition variable uses paint-only properties, NOT transition: all', () => {
    const transitionMatch = html.match(/--transition:\s*([^;]+);/);
    expect(transitionMatch).toBeTruthy();
    const transitionValue = transitionMatch[1];
    expect(transitionValue).not.toMatch(/\ball\b/);
    expect(transitionValue).toContain('background-color');
    expect(transitionValue).toContain('border-color');
    expect(transitionValue).toContain('color');
    expect(transitionValue).toContain('box-shadow');
  });

  test('Body element has no CSS transition (instant theme application)', () => {
    const bodyMatch = html.match(/body\s*\{[^}]*\}/);
    expect(bodyMatch).toBeTruthy();
    expect(bodyMatch[0]).not.toMatch(/transition\s*:/);
  });

  test('CSS anti-flicker resize freeze utility is defined', () => {
    expect(html).toContain('.no-resize-transition *');
    expect(html).toContain('transition: none !important');
  });

  test('Missing keyframes spin animation is defined', () => {
    expect(html).toContain('@keyframes spin');
    expect(html).toContain('rotate(360deg)');
  });

  test('app-view has zero slideUp keyframe animation to prevent view switch flicker', () => {
    expect(html).not.toContain('animation: slideUp');
    expect(html).not.toContain('@keyframes slideUp');
  });

  test('No transition: all CSS rules remain in stylesheet or inline styles', () => {
    const transitionAllMatches = html.match(/transition:\s*all\b/g) || [];
    expect(transitionAllMatches.length).toBe(0);
  });

  test('syncStateWithServer uses active-view-only scoped rendering', () => {
    expect(html).toContain('renderCurrentActiveView()');
  });

  test('.login-screen-overlay uses deterministic display toggle (no opacity transition)', () => {
    expect(html).toContain('.login-screen-overlay.active {');
    const overlayCSS = html.match(/\.login-screen-overlay\s*\{[^}]*\}/);
    expect(overlayCSS).toBeTruthy();
    expect(overlayCSS[0]).not.toContain('transition');
  });
});
