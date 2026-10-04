# React + TypeScript + Vite

## Stripe donations

Donations use Stripe-hosted Checkout. Copy `.env.example` to `.env` and set
`STRIPE_SECRET_KEY` to a Stripe **test-mode** secret key while developing. Keep
the secret key on the server; never add it to frontend code or commit `.env`.

Run `npm run server` in one terminal and `npm run dev` in another. The app
proxies its checkout request to the local payment API. Switch to a live Stripe
secret key only after configuring the production API and verifying the account.

Set `CHECKOUT_ORIGIN` to the deployed site's origin when deploying, and route
`/api/create-checkout-session` to `server.js`.

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
