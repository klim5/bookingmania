# Gather

A mobile-first group scheduling app built with React, TypeScript and Vite.

## Development

```bash
npm install
npm run dev
```

Cloudflare Pages can deploy the app with `npm run build` and the output directory `dist`.

To deploy from the command line, use `npm run deploy`. This project uses Pages
Functions, so use `wrangler pages deploy` rather than `wrangler deploy`.

## D1 persistence

The Pages Function in `functions/api/events/[[path]].ts` expects a D1 binding named `abcd`.

1. In Cloudflare, open the Pages/Workers project and add the existing D1 database as a binding named `abcd` for both Production and Preview.
2. Apply the schema to the database (replace `YOUR_DATABASE_NAME`):

```bash
npx wrangler d1 execute YOUR_DATABASE_NAME --remote --file=migrations/0001_create_events.sql
```

3. Redeploy the project.

For local full-stack development, create a local D1 binding with Wrangler and run the Pages development server. The Vite-only `npm run dev` command serves the UI but does not emulate `/api`.

Events and availability responses are stored in D1. A private host token remains in the creator's browser and is required to book the final time, so clearing that browser's site data removes host access.
