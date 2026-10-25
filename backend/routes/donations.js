import { Router } from "express";
import Stripe from "stripe";

const router = Router();
const minimumAmountCents = 100;
const maximumAmountCents = 1_000_000;
let stripeClient;

function stripe() {
  stripeClient ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripeClient;
}

// Redirect targets come from config, never from request headers.
function checkoutOrigin() {
  const configured = process.env.CHECKOUT_ORIGIN?.replace(/\/$/, "");
  if (configured) return configured;
  return process.env.NODE_ENV === "production" ? null : "http://localhost:5173";
}

router.post("/", async (request, response) => {
  const amountCents = request.body?.amountCents;
  if (!Number.isSafeInteger(amountCents) || amountCents < minimumAmountCents || amountCents > maximumAmountCents) {
    return response.status(400).json({ error: "Choose a donation between $1 and $10,000." });
  }

  const origin = checkoutOrigin();
  if (!process.env.STRIPE_SECRET_KEY || !origin) {
    console.error("Donations are not configured: set STRIPE_SECRET_KEY and CHECKOUT_ORIGIN.");
    return response.status(503).json({ error: "Donations are temporarily unavailable." });
  }

  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: { name: "Donation to North Star Youth Development Foundation" },
        },
      }],
      metadata: { purpose: "donation" },
      success_url: `${origin}/?payment=success#support`,
      cancel_url: `${origin}/?payment=cancelled#support`,
    });

    response.json({ url: session.url });
  } catch (error) {
    console.error("Unable to create donation checkout session:", error);
    response.status(502).json({ error: "Unable to start checkout. Please try again." });
  }
});

export default router;
