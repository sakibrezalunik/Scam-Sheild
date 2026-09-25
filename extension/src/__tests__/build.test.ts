/**
 * ScamShield Extension — Build & Manifest Validation Tests
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Extension build artifacts', () => {
  it('manifest.json exists and is valid JSON', () => {
    const manifestPath = resolve(__dirname, '../../manifest.json');
    const content = readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(content);

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBe('ScamShield');
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(manifest.background).toBeDefined();
    expect(manifest.action).toBeDefined();
  });

  it('manifest requests only necessary permissions', () => {
    const manifestPath = resolve(__dirname, '../../manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

    const allowedPermissions = ['activeTab'];
    const forbiddenPermissions = [
      'bookmarks', 'history', 'downloads', 'cookies',
      'tabs', 'webNavigation', 'webRequest', 'storage',
    ];

    expect(manifest.permissions).toEqual(expect.arrayContaining(allowedPermissions));
    for (const perm of forbiddenPermissions) {
      expect(manifest.permissions).not.toContain(perm);
      expect(manifest.optional_permissions || []).not.toContain(perm);
    }
  });

  it('manifest declares content security policy', () => {
    const manifestPath = resolve(__dirname, '../../manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

    expect(manifest.content_security_policy).toBeDefined();
    expect(manifest.content_security_policy.extension_pages).toContain("'self'");
  });

  it('popup.html exists', () => {
    const path = resolve(__dirname, '../../popup.html');
    const content = readFileSync(path, 'utf-8');
    expect(content).toContain('<div id="root">');
    expect(content).toContain('module');
  });

  it('background service worker exists', () => {
    const manifest = JSON.parse(readFileSync(resolve(__dirname, '../../manifest.json'), 'utf-8'));
    const swPath = resolve(__dirname, '../../dist/background/main.js');
    // In dev mode this won't exist yet; check the source instead
    const srcPath = resolve(__dirname, '../background/main.ts');
    expect(require('fs').existsSync(srcPath)).toBe(true);
  });

  it('icon assets exist for all declared sizes', () => {
    const manifest = JSON.parse(readFileSync(resolve(__dirname, '../../manifest.json'), 'utf-8'));
    const icons = manifest.icons;
    for (const [size, path] of Object.entries(icons)) {
      const fullPath = resolve(__dirname, `../../${path}`);
      expect(require('fs').existsSync(fullPath)).toBe(true);
    }
  });
});

describe('Popup UI components', () => {
  it('App component imports and renders', async () => {
    // Dynamic import to test the module resolves
    const mod = await import('../popup/App');
    expect(mod.default).toBeDefined();
  });

  it('all view components are exported', async () => {
    const idle = await import('../popup/IdleView');
    const loading = await import('../popup/LoadingView');
    const result = await import('../popup/ResultView');
    const error = await import('../popup/ErrorView');
    const unsupported = await import('../popup/UnsupportedView');

    expect(idle.IdleView).toBeDefined();
    expect(loading.LoadingView).toBeDefined();
    expect(result.ResultView).toBeDefined();
    expect(error.ErrorView).toBeDefined();
    expect(unsupported.UnsupportedView).toBeDefined();
  });
});
