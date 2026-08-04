import { spawn } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appDir = path.resolve(__dirname, '..');
const latestJsonPath = path.join(appDir, '.release', 'latest.json');
const packageJsonPath = path.join(appDir, 'package.json');

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

const getPackageVersion = async () => {
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  return packageJson.version;
};

const promptVersion = async () => {
  const currentVersion = await getPackageVersion();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const value = await rl.question(
      `Release version to upload (default: ${currentVersion}): `,
    );
    return value.trim() || currentVersion;
  } finally {
    rl.close();
  }
};

const quote = value => `"${value.replaceAll('"', '\\"')}"`;

const assertFileExists = async filePath => {
  try {
    await access(filePath);
  } catch {
    throw new Error(`Missing artifact: ${filePath}`);
  }
};

const main = async () => {
  const versionArg = process.argv[2]?.trim();
  const version =
    versionArg && versionArg.length > 0 ? versionArg : await promptVersion();
  const tag = `v${version}`;

  const dmgPath = path.join(
    appDir,
    'src-tauri',
    'target',
    'release',
    'bundle',
    'dmg',
    `Rig_${version}_aarch64.dmg`,
  );
  const updaterPath = path.join(
    appDir,
    'src-tauri',
    'target',
    'release',
    'bundle',
    'macos',
    'Rig.app.tar.gz',
  );
  const signaturePath = `${updaterPath}.sig`;

  await Promise.all([
    assertFileExists(dmgPath),
    assertFileExists(updaterPath),
    assertFileExists(signaturePath),
    assertFileExists(latestJsonPath),
  ]);

  await runCommand('gh auth status');

  try {
    await runCommand(`gh release view ${quote(tag)}`);
  } catch {
    await runCommand(
      [
        'gh release create',
        quote(tag),
        '--title',
        quote(tag),
        '--notes',
        quote(`Release ${version}`),
      ].join(' '),
    );
  }

  await runCommand(
    [
      'gh release upload',
      quote(tag),
      quote(dmgPath),
      quote(updaterPath),
      quote(signaturePath),
      quote(latestJsonPath),
      '--clobber',
    ].join(' '),
  );

  process.stdout.write(`Uploaded release artifacts for ${tag}.\n`);
};

main().catch(error => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
