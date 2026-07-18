# Gather

A mobile-first group scheduling app built with React, TypeScript and Vite.

## Development

```bash
npm install
npm run dev
```

Cloudflare Pages can deploy the app with `npm run build` and the output directory `dist`.

## Persistence

The current prototype stores events in the browser's local storage. This makes the complete create, respond and host-results flow usable on one browser. For real cross-device invite links, replace the functions in `src/store.ts` with calls to a Cloudflare Pages Function backed by D1 or KV.
