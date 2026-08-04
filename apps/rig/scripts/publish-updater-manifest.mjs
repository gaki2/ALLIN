import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(appDir, 'package.json');
const defaultRepository = 'builder-mafia/rig';

const assertString = (value, message) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(message);
  }
};

export const normalizeUpdaterManifest = ({
  manifest,
  assets,
  repository,
  version,
}) => {
  if (manifest == null || typeof manifest !== 'object') {
    throw new Error('Updater manifest must be a JSON object.');
  }

  if (manifest.version !== version) {
    throw new Error(
      `Updater manifest version ${String(manifest.version)} does not match ${version}.`,
    );
  }

  if (manifest.platforms == null || typeof manifest.platforms !== 'object') {
    throw new Error('Updater manifest is missing platforms.');
  }

  const normalized = structuredClone(manifest);
  const tag = `v${version}`;
  const expectedDownloadPrefix = `https://github.com/${repository}/releases/download/${tag}/`;
  const assetsByApiUrl = new Map(assets.map(asset => [asset.url, asset]));
  const assetsById = new Map(assets.map(asset => [String(asset.id), asset]));

  for (const [platformName, platform] of Object.entries(
    normalized.platforms,
  )) {
    if (platform == null || typeof platform !== 'object') {
      throw new Error(`Updater platform ${platformName} must be an object.`);
    }

    assertString(
      platform.signature,
      `Updater platform ${platformName} is missing a signature.`,
    );
    assertString(
      platform.url,
      `Updater platform ${platformName} is missing a download URL.`,
    );

    const assetId = platform.url.split('/').at(-1);
    const asset =
      assetsByApiUrl.get(platform.url) ??
      (assetId == null ? undefined : assetsById.get(assetId));

    if (asset != null) {
      assertString(
        asset.browser_download_url,
        `Release asset ${asset.name} is missing browser_download_url.`,
      );
      platform.url = asset.browser_download_url;
    }

    if (!platform.url.startsWith(expectedDownloadPrefix)) {
      throw new Error(
        `Updater platform ${platformName} does not point to ${tag} on ${repository}.`,
      );
    }
  }

  if (normalized.platforms['darwin-aarch64'] == null) {
    throw new Error('Updater manifest is missing darwin-aarch64.');
  }

  return normalized;
};

const resolveToken = async () => {
  const configuredToken = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
  if (configuredToken != null && configuredToken.trim().length > 0) {
    return configuredToken.trim();
  }

  const { stdout } = await execFileAsync('gh', ['auth', 'token']);
  const token = stdout.trim();
  assertString(token, 'GitHub authentication token is required.');
  return token;
};

const githubRequest = async (url, token, accept) => {
  const response = await fetch(url, {
    headers: {
      Accept: accept,
      Authorization: `Bearer ${token}`,
      'User-Agent': 'rig-updater-manifest',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub returned ${response.status} for ${url}.`);
  }

  return response;
};

const getRelease = async ({ apiBaseUrl, repository, tag, token }) => {
  const response = await githubRequest(
    `${apiBaseUrl}/repos/${repository}/releases/tags/${tag}`,
    token,
    'application/vnd.github+json',
  );
  return response.json();
};

const readManifestAsset = async ({ asset, token }) => {
  if (asset == null) {
    throw new Error('Release is missing latest.json.');
  }

  const response = await githubRequest(
    asset.url,
    token,
    'application/octet-stream',
  );
  return response.json();
};

const verifyBundleResponse = async url => {
  const response = await fetch(url, {
    headers: { Range: 'bytes=0-0' },
    redirect: 'follow',
  });
  const contentType = response.headers.get('content-type') ?? '';
  await response.body?.cancel();

  if (!response.ok || contentType.includes('application/json')) {
    throw new Error(
      `Updater bundle URL returned ${response.status} ${contentType || 'without a content type'}.`,
    );
  }
};

const uploadManifest = async ({ manifest, repository, tag, token }) => {
  const temporaryDirectory = await mkdtemp(
    path.join(os.tmpdir(), 'rig-updater-manifest-'),
  );
  const manifestPath = path.join(temporaryDirectory, 'latest.json');

  try {
    await writeFile(
      manifestPath,
      `${JSON.stringify(manifest, null, 2)}\n`,
      'utf8',
    );
    await execFileAsync(
      'gh',
      [
        'release',
        'upload',
        tag,
        manifestPath,
        '--repo',
        repository,
        '--clobber',
      ],
      {
        env: { ...process.env, GH_TOKEN: token },
      },
    );
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
};

const readPackageVersion = async () => {
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  assertString(packageJson.version, 'Desktop package version is required.');
  return packageJson.version;
};

export const publishUpdaterManifest = async ({
  version,
  repository = defaultRepository,
  apiBaseUrl = process.env.GITHUB_API_URL ?? 'https://api.github.com',
}) => {
  const token = await resolveToken();
  const tag = `v${version}`;
  const release = await getRelease({ apiBaseUrl, repository, tag, token });
  const manifestAsset = release.assets.find(asset => asset.name === 'latest.json');
  const manifest = await readManifestAsset({ asset: manifestAsset, token });
  const normalizedManifest = normalizeUpdaterManifest({
    manifest,
    assets: release.assets,
    repository,
    version,
  });

  await uploadManifest({
    manifest: normalizedManifest,
    repository,
    tag,
    token,
  });

  const publishedRelease = await getRelease({
    apiBaseUrl,
    repository,
    tag,
    token,
  });
  const publishedAsset = publishedRelease.assets.find(
    asset => asset.name === 'latest.json',
  );
  const publishedManifest = await readManifestAsset({
    asset: publishedAsset,
    token,
  });
  const verifiedManifest = normalizeUpdaterManifest({
    manifest: publishedManifest,
    assets: publishedRelease.assets,
    repository,
    version,
  });

  await verifyBundleResponse(
    verifiedManifest.platforms['darwin-aarch64'].url,
  );

  process.stdout.write(
    `Published updater manifest for ${tag} with direct download URLs.\n`,
  );
};

const main = async () => {
  const version = process.argv[2] ?? (await readPackageVersion());
  await publishUpdaterManifest({ version });
};

if (
  process.argv[1] != null &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch(error => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
