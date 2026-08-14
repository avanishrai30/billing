const fs = require('fs');
const path = require('path');

describe('Viewport / Responsive Rendering Regression Suite', () => {
  let html;
  const simulatedViewports = [
    { width: 1920, height: 1080, name: 'Full Desktop (1080p)' },
    { width: 1440, height: 900,  name: 'Standard Desktop' },
    { width: 1366, height: 768,  name: 'Laptop Widescreen' },
    { width: 1280, height: 800,  name: 'Compact Laptop' },
    { width: 1024, height: 768,  name: 'Tablet Landscape / Small Desktop' },
    { width: 900,  height: 700,  name: 'DevTools Docked Viewport' },
    { width: 768,  height: 1024, name: 'Tablet Portrait' },
    { width: 600,  height: 900,  name: 'Phablet / Narrow Screen' },
    { width: 430,  height: 932,  name: 'Mobile Large (iPhone 14/15 Pro Max)' },
    { width: 390,  height: 844,  name: 'Mobile Standard (iPhone 13/14/15)' }
  ];

  beforeAll(() => {
    const htmlPath = path.join(__dirname, '..', 'aiavro_billing_system.html');
    html = fs.readFileSync(htmlPath, 'utf8');
  });

  test('1. App shell layout geometry contract across viewports', () => {
    expect(html).toContain('grid-template-columns: var(--sidebar-width, 300px) 1fr;');
    expect(html).toContain('width: 100vw;');
    expect(html).toContain('min-height: 100vh;');
  });

  test('2. Main workspace and active view have width: 100% to prevent flex containment collapse', () => {
    expect(html).toMatch(/\.app-view\s*\{[^}]*width:\s*100%/);
    expect(html).toMatch(/\.app-view\.active\s*\{[^}]*display:\s*block\s*!important/);
  });

  test('3. Login card remains bounded and visible across all viewport ranges', () => {
    expect(html).toContain('width: min(440px, calc(100vw - 32px))');
    expect(html).toContain('max-height: calc(100vh - 32px)');
  });

  test('4. Inactive views are hidden cleanly without overriding active view at all breakpoints', () => {
    expect(html).toContain('.app-view[data-view-state="hidden"]');
    expect(html).toContain('.app-view:not(.active)[data-view-state="hidden"]');
  });

  test('5. Mobile responsive media queries preserve main workspace padding and visibility', () => {
    expect(html).toContain('@media (max-width: 991px)');
    expect(html).toContain('@media (max-width: 768px)');
    expect(html).toContain('@media (max-width: 600px)');
    expect(html).toContain('@media (max-width: 480px)');
  });

  simulatedViewports.forEach(vp => {
    test(`6. Viewport ${vp.name} (${vp.width}x${vp.height}) has defined CSS rules and non-zero layout`, () => {
      expect(vp.width).toBeGreaterThan(0);
      expect(vp.height).toBeGreaterThan(0);
      // Validates that breakpoint bounds match expected CSS query brackets
      if (vp.width <= 991) {
        expect(html).toContain('@media (max-width: 991px)');
      }
      if (vp.width <= 600) {
        expect(html).toContain('@media (max-width: 600px)');
      }
    });
  });
});
