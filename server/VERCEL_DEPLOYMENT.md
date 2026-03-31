# Vercel Backend Deployment

This backend can be deployed to Vercel as a standalone Express project.

## Recommended setup

Create a separate Vercel project and set the project root directory to:

```text
server
```

Vercel's Express support detects `src/index.ts` automatically. The app is now exported for Vercel, while local development still uses `app.listen()`.

Use this Vercel build command:

```text
npm run build
```

The backend package now runs `prisma generate` during the build so Vercel gets a fresh Prisma Client on every deploy.

## Environment variables

Add these in the Vercel project settings:

```text
DATABASE_URL=your-mongodb-atlas-connection-string
JWT_SECRET=your-strong-secret
CORS_ORIGINS=https://your-frontend-domain.vercel.app,https://your-custom-domain.com
```

## Frontend configuration

Point the web frontend to the deployed backend:

```text
VITE_API_BASE_URL=https://your-backend-domain.vercel.app/api
```

For the Flutter app, update the base URL in `expiry_mobile/lib/api_client.dart`.

## Important limitations

1. Vercel runs Express as a serverless function, so there is no always-on process.
2. Static frontend serving from Express is skipped on Vercel. Deploy the frontend separately.
3. The legacy backup file upload route currently uses temporary filesystem storage (`multer({ dest: 'uploads/' })`). That is not reliable for persistent storage on Vercel and should be replaced with memory storage or Blob storage if you want that route to be production-safe there.

## Local verification

From the `server` directory:

```bash
npm install
npm run build
```

For Vercel local emulation:

```bash
vercel dev
```
