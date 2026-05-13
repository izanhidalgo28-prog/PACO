const twilio = require('twilio');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const userMessage = req.body.Body;
  const from = req.body.From;

  const system = `Eres el asistente virtual de Clínica Vicente Pascual, especializada en Fisioterapia, Osteopatía y Podología en Av. Alicante nº46, Elche. Teléfono: 966 20 21 22. Responde en español, sé amable y conciso. Máximo 3 oraciones. No des diagnósticos médicos.`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system,
        messages: [{ role: 'user', content: userMessage }]
      })
    });

    const data = await r.json();
    const reply = data.content[0].text;

    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message(reply);
    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(twiml.toString());
  } catch (e) {
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message('Lo siento, hubo un error. Llámanos al 966 20 21 22.');
    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(twiml.toString());
  }
};
