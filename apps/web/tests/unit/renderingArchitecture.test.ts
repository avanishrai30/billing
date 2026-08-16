import fs from 'fs';
import path from 'path';

function getFilesRecursively(dir: string, extensions: string[]): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== 'tests' && file !== 'test-results') {
        results = results.concat(getFilesRecursively(filePath, extensions));
      }
    } else {
      if (extensions.some((ext) => file.endsWith(ext))) {
        results.push(filePath);
      }
    }
  }
  return results;
}

describe('Anti-Flicker Architectural Integrity & Codebase Safety Suite', () => {
  const srcRoot = path.resolve(__dirname, '../../');
  const codeFiles = getFilesRecursively(srcRoot, ['.ts', '.tsx', '.css']);

  it('1. Zero instances of forbidden "transition: all" or "transition-all" across UI code', () => {
    const violations: { file: string; line: number; text: string }[] = [];

    for (const file of codeFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (
          (line.includes('transition: all') || line.includes('transition-all')) &&
          !file.includes('renderingArchitecture.test.ts')
        ) {
          violations.push({ file: path.relative(srcRoot, file), line: idx + 1, text: line.trim() });
        }
      });
    }

    expect(violations).toEqual([]);
  });

  it('2. Zero instances of forbidden hover transform scale or hover translation on buttons/cards', () => {
    const violations: { file: string; line: number; text: string }[] = [];

    for (const file of codeFiles) {
      if (file.includes('components/ui/')) {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (
            (line.includes('hover:scale') ||
              line.includes('hover:translate-y') ||
              line.includes('hover:translate-x')) &&
            !file.includes('renderingArchitecture.test.ts')
          ) {
            violations.push({ file: path.relative(srcRoot, file), line: idx + 1, text: line.trim() });
          }
        });
      }
    }

    expect(violations).toEqual([]);
  });

  it('3. Zero imperative DOM manipulation (innerHTML, appendChild, document.querySelector) in UI primitives', () => {
    const violations: { file: string; line: number; text: string }[] = [];

    for (const file of codeFiles) {
      if (file.includes('components/ui/')) {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (
            line.includes('innerHTML') ||
            line.includes('dangerouslySetInnerHTML') ||
            line.includes('document.querySelector') ||
            line.includes('document.getElementById') ||
            line.includes('appendChild')
          ) {
            violations.push({ file: path.relative(srcRoot, file), line: idx + 1, text: line.trim() });
          }
        });
      }
    }

    expect(violations).toEqual([]);
  });

  it('4. Zero external font downloads (Google Fonts / woff / woff2) in stylesheets or components', () => {
    const violations: { file: string; line: number; text: string }[] = [];

    for (const file of codeFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (
          (line.includes('fonts.googleapis.com') ||
            line.includes('fonts.gstatic.com') ||
            line.includes('@font-face') ||
            line.includes('.woff')) &&
          !file.includes('renderingArchitecture.test.ts')
        ) {
          violations.push({ file: path.relative(srcRoot, file), line: idx + 1, text: line.trim() });
        }
      });
    }

    expect(violations).toEqual([]);
  });
});
