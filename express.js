import express from 'express';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && !match[1].startsWith('#') && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  }
}

const app = express();
const port = Number(process.env.PORT || process.env.API_PORT || 4242);
const distDirectory = resolve('dist');

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '4kb' }));

app.post('/api/create-checkout-session', async (request, response) => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    response.status(503).json({ error: 'Payments are not configured yet. Please try again later.' });
    return;
  }

  const { amountCents } = request.body ?? {};
  if (!Number.isSafeInteger(amountCents) || amountCents < 100 || amountCents > 1_000_000) {
    response.status(400).json({ error: 'Donation must be between $1 and $10,000.' });
    return;
  }

  try {
    const checkoutOrigin = (process.env.CHECKOUT_ORIGIN || `${request.protocol}://${request.get('host')}`)
      .replace(/\/$/, '');
    const form = new URLSearchParams({
      mode: 'payment',
      submit_type: 'donate',
      success_url: `${checkoutOrigin}/?payment=success#support`,
      cancel_url: `${checkoutOrigin}/?payment=cancelled#support`,
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][unit_amount]': String(amountCents),
      'line_items[0][price_data][product_data][name]': 'North Star Soccer Team donation',
    });

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form,
    });
    const session = await stripeResponse.json();

    if (!stripeResponse.ok) {
      console.error('Stripe checkout session error:', session.error?.message || stripeResponse.status);
      response.status(502).json({ error: 'Secure checkout could not be started. Please try again.' });
      return;
    }

    response.json({ url: session.url });
  } catch (error) {
    console.error('Checkout request failed:', error);
    response.status(500).json({ error: 'Unable to start checkout. Please try again.' });
  }
});

app.use('/api', (_request, response) => {
  response.status(404).json({ error: 'Not found.' });
});

app.use(express.static(distDirectory, { index: false, fallthrough: true }));
app.get(/.*/, (_request, response) => {
  response.sendFile(resolve(distDirectory, 'index.html'), (error) => {
    if (error && !response.headersSent) {
      response.status(503).send('Application is starting. Please try again shortly.');
    }
  });
});

app.use((error, _request, response, _next) => {
  if (error.type === 'entity.parse.failed') {
    response.status(400).json({ error: 'Invalid request.' });
    return;
  }
  if (error.type === 'entity.too.large') {
    response.status(413).json({ error: 'Request body is too large.' });
    return;
  }
  console.error('Request failed:', error);
  response.status(500).json({ error: 'Internal server error.' });
});

app.listen(port, () => {
  console.log(`Express server listening on port ${port}`);
});
