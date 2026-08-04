import { spawn } from 'node:child_process';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appDir = path.resolve(__dirname, '..');
const exportEnvScriptPath = path.join(appDir, 'scripts', 'export-env.sh');
const latestJsonPath = path.join(appDir, 'latest.json');
const packageJsonPath = path.join(appDir, 'package.json');
const macosBundleDir = path.join(
  appDir,
  'src-tauri',
  'target',
  'release',
  'bundle',
  'macos',
);

const runCommand = command =>
  new Promise((resolve, reject) => {
    const child = spawn('bash', ['-lc', command], {
      cwd: appDir,
      stdio: 'inherit',
    });

    child.on('exit', code => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Command failed with exit code ${code}: ${command}`));
    });
  });

const readPackageVersion = async () => {
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  return packageJson.version;
};

const promptVersion = async () => {
  const currentVersion = await readPackageVersion();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const value = await rl.question(
      `Release version (current: ${currentVersion}): `,
    );
    const version = value.trim();

    if (version.length === 0) {
      throw new Error('Release version is required.');
    }

    return version;
  } finally {
    rl.close();
  }
};

const getPlatformKey = () => {
  if (process.platform !== 'darwin') {
    throw new Error('build:prod currently supports macOS releases only.');
  }

  return os.arch() === 'arm64' ? 'darwin-aarch64' : 'darwin-x86_64';
};

const getUpdaterArtifactPath = async () => {
  const files = await readdir(macosBundleDir);
  const artifactName = files.find(file => file.endsWith('.app.tar.gz'));

  if (artifactName == null) {
    throw new Error(
      'Could not find updater artifact (.app.tar.gz) in macOS bundle output.',
    );
  }

  return path.join(macosBundleDir, artifactName);
};

const ensureUpdaterSignature = async artifactPath => {
  const signaturePath = `${artifactPath}.sig`;

  try {
    await readFile(signaturePath, 'utf8');
    return signaturePath;
  } catch {
    const relativeArtifactPath = path.relative(appDir, artifactPath);
    await runCommand(
      `source "${exportEnvScriptPath}" && pnpm tauri signer sign "./${relativeArtifactPath}"`,
    );
    return signaturePath;
  }
};

const buildReleaseDownloadUrl = (version, artifactPath) => {
  const artifactName = path.basename(artifactPath);

  return `https://github.com/builder-mafia/rig/releases/download/v${version}/${artifactName}`;
};

const updateLatestJson = async (version, artifactPath) => {
  const signaturePath = await ensureUpdaterSignature(artifactPath);
  const signature = (await readFile(signaturePath, 'utf8')).trim();
  const platformKey = getPlatformKey();
  const latestJson = {
    version,
    notes: `Release ${version}`,
    pub_date: new Date().toISOString(),
    platforms: {
      [platformKey]: {
        signature,
        url: buildReleaseDownloadUrl(version, artifactPath),
      },
    },
  };

  await writeFile(
    latestJsonPath,
    `${JSON.stringify(latestJson, null, 2)}\n`,
    'utf8',
  );
};

const main = async () => {
  const version = await promptVersion();

  await runCommand(`node ./scripts/sync-tauri-version.mjs "${version}"`);
  await runCommand(`source "${exportEnvScriptPath}" && pnpm tauri build`);

  const artifactPath = await getUpdaterArtifactPath();
  await updateLatestJson(version, artifactPath);

  process.stdout.write(`\nRelease build finished for ${version}.\n`);
  process.stdout.write(
    `Updated latest.json with ${path.basename(artifactPath)} metadata.\n`,
  );
};

main().catch(error => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
