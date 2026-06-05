import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Anyone whose auth account was created strictly before this instant
// gets 50% off for their first 3 months (Inner Circle launch perk).
const EARLY_USER_CUTOFF = new Date("2026-06-05T00:00:00Z").getTime();
const EARLY_BIRD_COUPON_ID = "earlybird_50_3mo";

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId?: string },
): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) {
    throw new Error("Invalid userId");
  }
  if (options.userId) {
    const found = await stripe.customers.search({
      query: `metadata['userId']:'${options.userId}'`,
      limit: 1,
    });
    if (found.data.length) return found.data[0].id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0];
      if (options.userId && customer.metadata?.userId !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.userId && { metadata: { userId: options.userId } }),
  });
  return created.id;
}

async function ensureEarlyBirdCoupon(stripe: ReturnType<typeof createStripeClient>) {
  try {
    return await stripe.coupons.retrieve(EARLY_BIRD_COUPON_ID);
  } catch {
    return await stripe.coupons.create({
      id: EARLY_BIRD_COUPON_ID,
      percent_off: 50,
      duration: "repeating",
      duration_in_months: 3,
      name: "Founding member — 50% off for 3 months",
    });
  }
}

async function isEarlyUser(userId: string): Promise<boolean> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data?.user?.created_at) return false;
  return new Date(data.user.created_at).getTime() < EARLY_USER_CUTOFF;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { priceId, quantity, customerEmail, userId, returnUrl, environment } = await req.json();
    if (!priceId || !/^[a-zA-Z0-9_-]+$/.test(priceId)) throw new Error("Invalid priceId");
    if (environment !== "sandbox" && environment !== "live") throw new Error("Invalid environment");
    const env = environment as StripeEnv;

    const stripe = createStripeClient(env);
    const prices = await stripe.prices.list({ lookup_keys: [priceId] });
    if (!prices.data.length) throw new Error("Price not found");
    const stripePrice = prices.data[0];
    const isRecurring = stripePrice.type === "recurring";

    const customerId = (customerEmail || userId)
      ? await resolveOrCreateCustomer(stripe, { email: customerEmail, userId })
      : undefined;

    let productDescription: string | undefined;
    if (!isRecurring) {
      const productId = typeof stripePrice.product === "string" ? stripePrice.product : stripePrice.product.id;
      const product = await stripe.products.retrieve(productId);
      productDescription = product.name;
    }

    // Apply 50% off 3 months for accounts created before the launch cutoff.
    let discounts: { coupon: string }[] | undefined;
    if (isRecurring && userId && await isEarlyUser(userId)) {
      await ensureEarlyBirdCoupon(stripe);
      discounts = [{ coupon: EARLY_BIRD_COUPON_ID }];
    }

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePrice.id, quantity: quantity || 1 }],
      mode: isRecurring ? "subscription" : "payment",
      ui_mode: "embedded_page",
      return_url: returnUrl,
      ...(customerId && { customer: customerId }),
      ...(!isRecurring && { payment_intent_data: { description: productDescription } }),
      ...(discounts && { discounts }),
      ...(userId && {
        metadata: { userId, ...(discounts && { early_bird: "true" }) },
        ...(isRecurring && { subscription_data: { metadata: { userId, ...(discounts && { early_bird: "true" }) } } }),
      }),
    });

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error("create-checkout error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
