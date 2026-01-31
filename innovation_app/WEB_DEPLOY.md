# Flutter Web Deploy Notes

## Build
```bash
flutter build web --release --dart-define=API_BASE_URL=https://api.innovation.com
```

## Hosting
- **Firebase Hosting**: configure `firebase.json` to rewrite all routes to `/index.html`.
- **Vercel**: add a rewrite rule to serve `index.html` for SPA routes.

## API Base URL
Use `--dart-define=API_BASE_URL=...` to point to production.
