Render deployment checklist

- Ensure dev dependencies are installed during build:

  npm ci --include=dev

- Build steps (same as Render):

  npm ci --include=dev
  npm run build

- If you run migrations during deploy, ensure DATABASE_URL is set and then:

  npm run migrate

- Pin Node version (already added to `package.json` engines). Use Node 24 on Render.

- Healthcheck: app exposes `/health` returning 200 with JSON. Render will detect runtime by binding to `process.env.PORT`.

- Clearing Render build cache (recommended after fixes):

  - Use Render dashboard -> Service -> Manual Deploy -> Clear cache and deploy
  - OR trigger a fresh commit:

    git commit --allow-empty -m "Trigger clean deploy" && git push

- Local preflight (run before deploy):

  npm ci --include=dev
  npx tsc --noEmit
  npm run build

- Troubleshooting tips:
  - If you see missing types for packages like `pdfkit`, either add `@types/*` as devDeps or add a local `src/types/*.d.ts` shim.
  - Confirm `process.env.PORT` is used when starting the server and that the `start` script runs the app entrypoint.
  - Provide Render env vars (DATABASE_URL, JWT_SECRET) in the Render dashboard.

If you want, I can add a `scripts` entry that runs a clean build (including clearing node_modules) and a small CI-friendly health check script.
