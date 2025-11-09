# API Configuration

## Development (Default)
No configuration needed. Uses Vite proxy to `http://localhost:4004`.

## Production
Set `VITE_API_BASE_URL` environment variable before building:
```bash
VITE_API_BASE_URL=https://api.yourdomain.com npm run build
```

Or create `.env.production` file:
```
VITE_API_BASE_URL=https://api.yourdomain.com
```

All API calls use centralized config from `src/config/api.js`. Change backend URL in one place!
