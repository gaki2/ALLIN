# Rig releases

Rig validates every pull request and every push to `main` with GitHub Actions.
The release workflow builds, signs, notarizes, and publishes the macOS app and
its Tauri updater manifest.

## Required repository secrets

- `APPLE_CERTIFICATE`: base64-encoded Developer ID Application `.p12`
- `APPLE_CERTIFICATE_PASSWORD`: password for the `.p12`
- `APPLE_SIGNING_IDENTITY`: Developer ID Application identity
- `APPLE_ID`: Apple Account used for notarization
- `APPLE_PASSWORD`: app-specific password for that Apple Account
- `APPLE_TEAM_ID`: Apple Developer team ID
- `TAURI_SIGNING_PRIVATE_KEY`: private updater signing key
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: updater key password

`GITHUB_TOKEN` is supplied by GitHub Actions automatically.

## Publish a version

1. Run `pnpm --filter desktop-app sync:version <version>` and commit the four
   synchronized version files.
2. Merge the commit into `main` and wait for CI to pass.
3. Push a matching tag, for example `git tag v26.8.31 && git push origin v26.8.31`.

The release workflow verifies that the tag matches `apps/rig/package.json`,
creates the GitHub release, and uploads the generated updater `latest.json`.
It can also be started manually from the Actions tab to rebuild the version on
the selected branch.
