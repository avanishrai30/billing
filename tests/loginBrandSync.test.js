const fs = require('fs');
const path = require('path');

describe('Login Dynamic Branding & Live Sync Suite', () => {
  let html;

  beforeAll(() => {
    const htmlPath = path.join(__dirname, '..', 'aiavro_billing_system.html');
    html = fs.readFileSync(htmlPath, 'utf8');
  });

  test('1. api.settings.getPublicSettings() is called during initial page load', () => {
    expect(html).toContain('api.settings.getPublicSettings()');
    expect(html).toContain('loadPublicSettings()');
    const loadDbState = html.match(/function loadDatabaseState\(\)\s*\{([\s\S]*?)\n    \}/);
    expect(loadDbState).not.toBeNull();
    expect(loadDbState[1]).toContain('loadPublicSettings();');
    expect(html).toMatch(/window\.addEventListener\("DOMContentLoaded",\s*async \(\)\s*=>\s*\{[\s\S]*?loadDatabaseState\(\)/);
  });

  test('2. Dedicated #login-brand-logo element exists inside a fixed aspect-ratio container', () => {
    expect(html).toContain('id="login-brand-logo"');
    expect(html).toContain('.login-brand-logo-container');
    expect(html).toContain('object-fit: contain');
  });

  test('3. Dynamic #login-brand-name exists for displaying public settings title', () => {
    expect(html).toContain('id="login-brand-name"');
  });

  test('4. Socket.IO settings_updated event updates logo and title in place without full DOM reload', () => {
    expect(html).toContain("syncSocket.on('settings_updated', handleSettingsUpdated)");
    expect(html).toContain("syncSocket.on('settings.updated', handleSettingsUpdated)");
    
    // Check handleSettingsUpdated implementation
    const fnMatch = html.match(/const handleSettingsUpdated = \((?:data)?\) => \{([\s\S]*?)\};/);
    expect(fnMatch).not.toBeNull();
    const fnBody = fnMatch[1];
    expect(fnBody).toContain('document.getElementById("login-brand-name")');
    expect(fnBody).toContain('document.getElementById("login-brand-logo")');
    expect(fnBody).not.toContain('location.reload()');
    expect(fnBody).not.toContain('initAuthentication()');
  });

  test('5. Synchronous cold boot local cache script initializes branding before first paint', () => {
    expect(html).toMatch(/localStorage\.getItem\("aiavro_active_biz_name"\)/);
    expect(html).toMatch(/localStorage\.getItem\("aiavro_active_biz_logo"\)/);
  });
});
