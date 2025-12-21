# Release Checklist

## Pre-deploy
```sh
npm ci
# or: npm install
npm run lint
npm run build
```

## Deploy
```sh
firebase deploy --only hosting
```

## Post-deploy verification
- Open `/health.html` and confirm OK.
- Open the app and confirm the Settings version label matches the new build.

## If users see a blank screen
1) Check the app version label first (Settings) to confirm the build.
2) Chrome DevTools > Application > Service Workers > Unregister.
3) Application > Storage > Clear site data.
4) Hard reload.

## Notes
- Vite chunk size warning is acceptable for now.
- Keep PRs small, one theme per PR.
