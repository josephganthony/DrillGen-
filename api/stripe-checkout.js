export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) return res.status(500).json({ error: 'Stripe not configured' });

  const { priceId, userId, userEmail } = req.body;
  if (!priceId) return res.status(400).json({ error: 'Price ID required' });

  try {
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecret}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'payment_method_types[]': 'card',
        'mode': 'subscription',
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        'customer_email': userEmail || '',
        'metadata[userId]': userId || '',
        'metadata[priceId]': priceId,
        'success_url': 'https://drillgen.app/upgrade-success.html?session_id={CHECKOUT_SESSION_ID}',
        'cancel_url': 'https://drillgen.app/pricing.html',
        'allow_promotion_codes': 'true',
        'billing_address_collection': 'auto',
        'subscription_data[trial_period_days]': '0',
      }).toString()
    });

    const session = await response.json();
    if (session.error) return res.status(400).json({ error: session.error.message });
    return res.status(200).json({ url: session.url });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
