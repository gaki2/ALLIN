import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeUpdaterManifest } from './publish-updater-manifest.mjs';

const repository = 'builder-mafia/rig';
const version = '26.804.1';
const apiUrl =
  'https://api.github.com/repos/builder-mafia/rig/releases/assets/123';
const downloadUrl =
  'https://github.com/builder-mafia/rig/releases/download/v26.804.1/Rig_26.804.1_aarch64.app.tar.gz';
const assets = [
  {
    id: 123,
    name: 'Rig_26.804.1_aarch64.app.tar.gz',
    url: apiUrl,
    browser_download_url: downloadUrl,
  },
];

const manifest = {
  version,
  notes: 'Release notes',
  platforms: {
    'darwin-aarch64': {
      signature: 'signed-value',
      url: apiUrl,
    },
    'darwin-aarch64-app': {
      signature: 'signed-value',
      url: apiUrl,
    },
  },
};

test('replaces GitHub API asset URLs with direct downloads', () => {
  const normalized = normalizeUpdaterManifest({
    manifest,
    assets,
    repository,
    version,
  });

  assert.equal(normalized.platforms['darwin-aarch64'].url, downloadUrl);
  assert.equal(normalized.platforms['darwin-aarch64-app'].url, downloadUrl);
  assert.equal(manifest.platforms['darwin-aarch64'].url, apiUrl);
});

test('accepts an already normalized manifest', () => {
  const normalized = normalizeUpdaterManifest({
    manifest: {
      ...manifest,
      platforms: {
        'darwin-aarch64': {
          signature: 'signed-value',
          url: downloadUrl,
        },
      },
    },
    assets,
    repository,
    version,
  });

  assert.equal(normalized.platforms['darwin-aarch64'].url, downloadUrl);
});

test('rejects a manifest for a different version', () => {
  assert.throws(
    () =>
      normalizeUpdaterManifest({
        manifest: { ...manifest, version: '26.8.31' },
        assets,
        repository,
        version,
      }),
    /does not match/,
  );
});

test('rejects unsigned platform entries', () => {
  assert.throws(
    () =>
      normalizeUpdaterManifest({
        manifest: {
          ...manifest,
          platforms: {
            'darwin-aarch64': { signature: '', url: apiUrl },
          },
        },
        assets,
        repository,
        version,
      }),
    /missing a signature/,
  );
});
