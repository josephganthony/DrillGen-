export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) return res.status(500).json({ error: 'Stripe not configured on server' });

  // Parse body — handle both parsed and raw
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  if (!body) body = {};

  const { priceId, userId, userEmail } = body;
  if (!priceId) return res.status(400).json({ error: 'Price ID required' });

  try {
    const params = new URLSearchParams();
    params.append('payment_method_types[]', 'card');
    params.append('mode', 'subscription');
    params.append('line_items[0][price]', priceId);
    params.append('line_items[0][quantity]', '1');
    params.append('success_url', 'https://drillgen.app/upgrade-success.html?session_id={CHECKOUT_SESSION_ID}');
    params.append('cancel_url', 'https://drillgen.app/pricing.html');
    params.append('allow_promotion_codes', 'true');
    if (userEmail) params.append('customer_email', userEmail);
    if (userId) params.append('metadata[userId]', userId);

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecret}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const session = await response.json();
    if (session.error) return res.status(400).json({ error: session.error.message });
    if (!session.url) return res.status(500).json({ error: 'No checkout URL returned', session });
    return res.status(200).json({ url: session.url });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
