export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { rubro, rubroNombre, precio, email, userId } = req.body;
  console.log('BODY:', JSON.stringify({ rubro, rubroNombre, precio, email, userId }));
  console.log('TOKEN:', MP_TOKEN ? 'OK' : 'FALTA');
  const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
  const BASE_URL = process.env.BASE_URL || 'https://operix-liard.vercel.app';

  try {
    const preference = {
      items: [{
        id: `operix-${rubro}`,
        title: `Operix ${rubroNombre} — Plan Completo`,
        description: `Suscripción mensual para ${rubroNombre}`,
        quantity: 1,
        currency_id: 'ARS',
        unit_price: parseInt(precio)
      }],
      payer: { email: email || '' },
      back_urls: {
        success: `${BASE_URL}/pago-exitoso.html?rubro=${rubro}&rubroNombre=${encodeURIComponent(rubroNombre)}&userId=${userId}`,
        failure: `${BASE_URL}/?pago=error`,
        pending: `${BASE_URL}/?pago=pendiente`
      },
      auto_return: 'approved',
      external_reference: `${userId}-${rubro}-${Date.now()}`,
      notification_url: `${BASE_URL}/api/webhook-mp`
    };

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preference)
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: 'Error MP', details: data });

    // Devolver SOLO init_point (produccion real)
    return res.status(200).json({
      init_point: data.init_point,
      preference_id: data.id
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
