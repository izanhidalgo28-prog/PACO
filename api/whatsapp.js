const twilio = require('twilio');

const conversaciones = {};

function estaAbierto() {
  const ahora = new Date();
  const dia = ahora.getDay();
  const hora = ahora.getHours();
  if (dia === 0 || dia === 6) return false;
  if (dia === 5) return hora >= 8 && hora < 18;
  return hora >= 8 && hora < 20;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const userMessage = req.body.Body.trim();
  const from = req.body.From;

  if (!conversaciones[from]) conversaciones[from] = { paso: null };
  const conv = conversaciones[from];

  const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbyQDszGP0RlFR_jsjyfyvc4ZVDg7wyHaYp8qkog1Kr-Xcciq8-r0ScXRvAz0CHA1m8aGw/exec';
  const TWILIO_SID = 'AC5dbda67e3e4433d40118fb90a5984ec4';
  const TWILIO_TOKEN = '6276d0dab9929c69220a58adebc4ed90' ;

  function responder(texto) {
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message(texto);
    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(twiml.toString());
  }

  const msg = userMessage.toLowerCase();
  const enFlujoDeСita = ['nombre','telefono','servicio','dia','hora'].includes(conv.paso);

  if (!estaAbierto() && !enFlujoDeСita) {
    if (msg.includes('cita') || msg.includes('reservar') || msg.includes('pedir')) {
      conv.paso = 'nombre';
      return responder('Hola soy Vera. Ahora estamos cerrados, pero puedes dejar tu solicitud y te confirmamos cuando abramos. ¿Cuál es tu nombre completo?');
    }
    return responder('Hola soy Vera. Ahora mismo estamos cerrados. Horario: lunes a jueves 8:00–20:00, viernes 8:00–18:00. Escribe "cita" para dejar tu solicitud y te confirmamos mañana. También puedes llamarnos al 966 20 21 22.');
  }

  if (conv.paso === 'nombre') {
    conv.nombre = userMessage;
    conv.paso = 'telefono';
    return responder('¿Cuál es tu número de teléfono?');
  }
  if (conv.paso === 'telefono') {
    conv.telefono = userMessage;
    conv.paso = 'servicio';
    return responder('¿Qué servicio necesitas?\n1. Fisioterapia\n2. Osteopatía\n3. Podología\n4. No sé, necesito orientación');
  }
  if (conv.paso === 'servicio') {
    conv.servicio = userMessage;
    conv.paso = 'dia';
    return responder('¿Qué día te viene mejor? (ej: lunes, martes...)');
  }
  if (conv.paso === 'dia') {
    conv.dia = userMessage;
    conv.paso = 'hora';
    return responder('¿Prefieres mañana (8am-12pm), tarde (12pm-4pm) o última hora (4pm-8pm)?');
  }
  if (conv.paso === 'hora') {
    conv.hora = userMessage;
    conv.paso = null;

    await fetch(SHEETS_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: conv.nombre,
        telefono: conv.telefono,
        tratamiento: conv.servicio,
        dia: conv.dia,
        hora: conv.hora
      })
    }).catch(() => {});

    return responder(`Perfecto ${conv.nombre}, tu cita de ${conv.servicio} para el ${conv.dia} por la ${conv.hora} ha sido registrada. Te llamaremos al ${conv.telefono} para confirmar. ¡Hasta pronto!`);
  }

  if (msg.includes('cita') || msg.includes('reservar') || msg.includes('pedir')) {
    conv.paso = 'nombre';
    return responder('Perfecto, vamos a pedir tu cita. ¿Cuál es tu nombre completo?');
  }

  const system = `Eres Vera, la asistente virtual de Clínica Vicente Pascual, especializada en Fisioterapia, Osteopatía y Podología en Av. Alicante nº46, Elche. Teléfono: 966 20 21 22. Responde en español, sé amable y conciso. Máximo 3 oraciones. No des diagnósticos médicos. Si alguien quiere pedir cita dile que escriba la palabra "cita".`;

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
    responder(data.content[0].text);
  } catch (e) {
    responder('Lo siento, hubo un error. Llámanos al 966 20 21 22.');
  }
};
