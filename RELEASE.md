# Release Checklist

## Commands
```sh
npm run lint
npm run build
firebase deploy --only hosting
```

## Post-deploy checks
- Open `https://shiretto-todo-chat.web.app/health.html` and confirm "OK".
- Open Settings in the app and confirm the version label is visible (e.g. `v0.0.0` or `v0.0.0 (abc123)`).

## Recovery: blank screen / stale cache
1) Unregister the Service Worker:
   - Chrome: DevTools > Application > Service Workers > "Unregister".
2) Clear site data:
   - Chrome: DevTools > Application > Storage > "Clear site data".
3) Reload the app.
