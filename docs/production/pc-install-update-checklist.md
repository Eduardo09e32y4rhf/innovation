# PC Install and Update Checklist

This checklist is intended for desktop installations and safe updates of the Electron package.

## Before packaging

- [ ] Confirm `.env.example` values were copied to a secure local `.env` file.
- [ ] Verify production API URL is reachable from the desktop client.
- [ ] Verify the web app builds successfully with `npm run build:web`.
- [ ] Verify the Electron TypeScript build succeeds with `npm run build:desktop`.
- [ ] Confirm no secrets are embedded in the build artifacts.
- [ ] Confirm old installers are archived before a new release.

## Build the installer

- [ ] Run `npm run build:installer` for the Windows NSIS installer.
- [ ] Run `npm run build:exe` if you need the packaged EXE flow alias.
- [ ] Validate the output in `dist/`.
- [ ] Test installer on a clean Windows VM or spare machine.

## Installation checklist

- [ ] Install the app using the generated NSIS installer.
- [ ] Confirm the app starts and loads the production URL.
- [ ] Confirm login, dashboard load, and API calls are functional.
- [ ] Confirm the tray/window close behavior is correct.
- [ ] Confirm shortcuts are created only when expected.

## Update checklist

- [ ] Close the running desktop app before applying an update.
- [ ] Archive the previous installer and release notes.
- [ ] Install the new version over the old one or via a clean reinstall if needed.
- [ ] Confirm the version text in the app matches the release tag.
- [ ] Confirm cached data and auth state behave as expected after update.

## Rollback checklist

- [ ] Reinstall the last known good installer.
- [ ] Restore the last known good production URL if the issue is backend-related.
- [ ] Check backend logs before reattempting the rollout.

