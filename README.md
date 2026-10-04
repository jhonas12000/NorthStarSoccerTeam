# React + TypeScript + Vite

## Stripe donations

Donations use Stripe-hosted Checkout. Copy `.env.example` to `.env` and set
`STRIPE_SECRET_KEY` to a Stripe **test-mode** secret key while developing. Keep
the secret key on the server; never add it to frontend code or commit `.env`.

Run `npm run server` in one terminal and `npm run dev` in another. The app
proxies its checkout request to the local payment API. Switch to a live Stripe
secret key only after configuring the production API and verifying the account.

Set `CHECKOUT_ORIGIN` to the deployed site's origin when deploying, and route
`/api/create-checkout-session` to the Express server in `express.js`.

## Deploy to Heroku

The Heroku web process builds the Vite frontend and serves it together with the
Stripe checkout API from `express.js`. The Heroku `PORT` environment variable is
used automatically, and client-side routes such as `/teams` fall back to the
React app.

1. Create a Heroku app and connect this Git repository (or create an app with
  the Heroku CLI).
2. In Heroku **Settings → Config Vars**, set `STRIPE_SECRET_KEY` to your Stripe
  secret key and `CHECKOUT_ORIGIN` to the exact public origin, such as
  `https://your-app-name.herokuapp.com` (no trailing slash). Keep the key out
  of source control. Use a test key first, then switch to a live key only when
  payments are ready for production.
3. Deploy the `main` branch. Heroku runs `npm run build` and starts the app with
  the included `Procfile`.
4. Visit the deployed site and verify the homepage, `/teams`, and a Stripe test
  donation checkout.

The React + TypeScript + Vite template information follows.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
