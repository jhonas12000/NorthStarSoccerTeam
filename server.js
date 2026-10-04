import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';

if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && !match[1].startsWith('#') && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  }
}

const port = Number(process.env.API_PORT || 4242);
const checkoutOrigin = (process.env.CHECKOUT_ORIGIN || 'http://localhost:5173').replace(/\/$/, '');

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 4096) {
      throw new Error('Request body is too large.');
    }
  }
  return JSON.parse(body);
}

const server = createServer(async (request, response) => {
  if (request.method !== 'POST' || request.url !== '/api/create-checkout-session') {
    sendJson(response, 404, { error: 'Not found.' });
    return;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    sendJson(response, 503, { error: 'Payments are not configured yet. Please try again later.' });
    return;
  }

  try {
    const { amountCents } = await readJson(request);
    if (!Number.isSafeInteger(amountCents) || amountCents < 100 || amountCents > 1_000_000) {
      sendJson(response, 400, { error: 'Donation must be between $1 and $10,000.' });
      return;
    }

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
      sendJson(response, 502, { error: 'Secure checkout could not be started. Please try again.' });
      return;
    }

    sendJson(response, 200, { url: session.url });
  } catch (error) {
    if (error instanceof SyntaxError) {
      sendJson(response, 400, { error: 'Invalid request.' });
      return;
    }
    console.error('Checkout request failed:', error);
    sendJson(response, 500, { error: 'Unable to start checkout. Please try again.' });
  }
});

server.listen(port, () => {
  console.log(`Payment API listening on http://localhost:${port}`);
});
