export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') return res.status(200).end();

  const { type, data } = req.body;

  if (type === 'payment') {
    const paymentId = data?.id;
    if (!paymentId) return res.status(200).json({ ok: true });

    try {
      const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { 'Authorization': `Bearer ${MP_TOKEN}` }
      });
      const payment = await response.json();

      if (payment.status === 'approved') {
        const ref = payment.external_reference || '';
        const parts = ref.split('-');
        const userId = parts[0] || '';
        const rubro = parts[1] || '';

        // Actualizar Supabase
        const SUPA_URL = process.env.SUPA_URL;
        const SUPA_KEY = process.env.SUPA_SERVICE_KEY;

        if (userId && rubro && SUPA_URL && SUPA_KEY) {
          const vence = new Date();
          vence.setDate(vence.getDate() + 30);

          await fetch(`${SUPA_URL}/rest/v1/usuarios?id=eq.${userId}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${SUPA_KEY}`,
              'apikey': SUPA_KEY,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              plan: 'Completo',
              rubro: rubro,
              activo: true,
              fecha_inicio: new Date().toISOString(),
              fecha_vencimiento: vence.toISOString()
            })
          });
        }
      }
    } catch (err) {
      console.error('Webhook error:', err);
    }
  }

  return res.status(200).json({ ok: true });
}
