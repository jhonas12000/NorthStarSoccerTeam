# React + TypeScript + Vite

## MongoDB setup

The Express API uses the official MongoDB Node.js driver. Create a free MongoDB
Atlas cluster, create a database user, and allow your development IP address in
Atlas Network Access. Then:

1. Copy `.env.example` to `.env`.
2. Replace `MONGODB_URI` with the connection string from Atlas and set
   `MONGODB_DATABASE` if you want a different database name.
3. Run `npm run server` and `npm run dev` in separate terminals.
4. Open `http://localhost:4242/api/health` to verify the connection.

Never place `MONGODB_URI` in frontend code or commit `.env`. In Heroku, add
`MONGODB_URI` and `MONGODB_DATABASE` as Config Vars.

The starter member API provides:

- `GET /api/health` — checks the MongoDB connection
- `GET /api/members` — lists up to 100 members
- `GET /api/members/:id` — gets one member
- `POST /api/members` — creates a player, coach, staff member, or supporter

Example request body for `POST /api/members`:

```json
{
  "firstName": "Alex",
  "lastName": "Morgan",
  "email": "alex@example.com",
  "role": "player"
}
```

## Monthly membership payments

Finance users can open a member's **Payment** page to review all 12 months for
each membership year. Paid months are marked, and due months can be selected
for direct/offline payment recording. Each selected month adds **$30** to the
finance income ledger and is saved in that member's payment history. The app
does not process a card payment for membership dues.

## Invitation delivery

Admin-created invitations are sent automatically using the selected contact
method: email through Resend or SMS through Twilio. Configure the provider's
credentials in the local `.env` file and in Heroku **Settings → Config Vars**;
never commit provider secrets. Set `APP_ORIGIN` to the exact public site URL in
production so invitation links point to the deployed app. Resend requires a
verified sender address/domain. Twilio phone numbers must use international
E.164 format, such as `+15551234567`; trial accounts may only message verified
recipients. If delivery is not configured or a provider rejects the message,
the invitation is still created and the admin UI shows a manual share link.

## Project layout

- `frontend/` contains the React UI, components, tests, Vite configuration, and
  public images.
- `backend/` contains the Express server.
- Root-level `package.json` keeps shared scripts and dependencies; the frontend
  build is written to root `dist/` for the server and Heroku to serve.

## Deploy to Heroku

The Heroku web process builds the Vite frontend and serves it together with the
Stripe checkout API from `backend/express.js`. The Heroku `PORT` environment variable is
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
