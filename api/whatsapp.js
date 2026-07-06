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

function esIngles(texto) {
  const t = texto.toLowerCase();
  const palabrasIngles = ['hello','hi','appointment','book','cancel','price','schedule','please','thanks','thank you','today','tomorrow','can i','do you','i want','i need','what time','open','closed'];
  return palabrasIngles.some(p => t.includes(p));
}

function elegir(opciones) {
  return opciones[Math.floor(Math.random() * opciones.length)];
}

const SALUDOS_ES = ['¡Hola! Soy Vera 👋', '¡Hola de nuevo! Soy Vera 😊', 'Hola, soy Vera, encantada de ayudarte'];
const SALUDOS_EN = ['Hi! I\'m Vera 👋', 'Hello again! I\'m Vera 😊', 'Hi there, I\'m Vera, happy to help'];
const CONFIRMACIONES_ES = ['Perfecto', '¡Genial!', 'Estupendo', 'Anotado'];
const CONFIRMACIONES_EN = ['Perfect', 'Great!', 'Awesome', 'Got it'];

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const userMessage = req.body.Body.trim();
  const from = req.body.From;

  if (!conversaciones[from]) conversaciones[from] = { paso: null };
  const conv = conversaciones[from];

  // Re-detecta idioma en cada mensaje
  conv.idioma = esIngles(userMessage) ? 'en' : 'es';
  const EN = conv.idioma === 'en';

  const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbyQDszGP0RlFR_jsjyfyvc4ZVDg7wyHaYp8qkog1Kr-Xcciq8-r0ScXRvAz0CHA1m8aGw/exec';
  const TWILIO_SID = 'AC5dbda67e3e4433d40118fb90a5984ec4';
  const TWILIO_TOKEN = '6276d0dab9929c69220a58adebc4ed90';

  function responder(texto) {
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message(texto);
    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(twiml.toString());
  }

  const msg = userMessage.toLowerCase();
  const enFlujoDeCita = ['nombre','telefono','servicio','dia','hora','consulta_telefono','cancelar_telefono'].includes(conv.paso);

  const esCita = msg.includes('cita') || msg.includes('reservar') || msg.includes('pedir') || msg.includes('appointment') || msg.includes('book') || msg.includes('schedule');
  const esMiCita = msg.includes('mi cita') || msg.includes('ver cita') || msg.includes('consultar cita') || msg.includes('my appointment') || msg.includes('check appointment');
  const esCancelar = msg.includes('cancelar') || msg.includes('anular') || msg.includes('cancel');

  // ── CONSULTAR MI CITA ────────────────────────────────────────────
  if (!enFlujoDeCita && esMiCita) {
    conv.paso = 'consulta_telefono';
    return responder(EN
      ? 'To find your appointment, please tell me your phone number.'
      : 'Para buscar tu cita, dime tu número de teléfono.');
  }

  if (conv.paso === 'consulta_telefono') {
    conv.paso = null;
    try {
      const r = await fetch(SHEETS_URL + '?sheet=citas');
      const citas = await r.json();
      const telefonoLimpio = userMessage.replace(/\s/g, '');
      const miCita = Array.isArray(citas) ? citas.find(c => String(c.telefono).replace(/\s/g,'') === telefonoLimpio && c.estado !== 'Cancelada') : null;
      if (miCita) {
        return responder(EN
          ? `Your appointment: ${miCita.tratamiento} on ${miCita.dia} in the ${miCita.hora}. Status: ${miCita.estado}.`
          : `Tu cita: ${miCita.tratamiento} el ${miCita.dia} por la ${miCita.hora}. Estado: ${miCita.estado}.`);
      }
      return responder(EN
        ? 'I couldn\'t find an active appointment with that phone number. Please call us at 966 20 21 22.'
        : 'No he encontrado ninguna cita activa con ese teléfono. Llámanos al 966 20 21 22.');
    } catch(e) {
      return responder(EN
        ? 'I couldn\'t check your appointment right now. Please call us at 966 20 21 22.'
        : 'No he podido consultar tu cita ahora mismo. Llámanos al 966 20 21 22.');
    }
  }

  // ── CANCELAR CITA ────────────────────────────────────────────────
  if (!enFlujoDeCita && esCancelar) {
    conv.paso = 'cancelar_telefono';
    return responder(EN
      ? 'I understand you want to cancel your appointment. Please tell me your phone number to find it.'
      : 'Entiendo que quieres cancelar tu cita. Dime tu número de teléfono para localizarla.');
  }

  if (conv.paso === 'cancelar_telefono') {
    conv.paso = null;
    try {
      const r = await fetch(SHEETS_URL + '?sheet=citas');
      const citas = await r.json();
      const telefonoLimpio = userMessage.replace(/\s/g, '');
      const miCita = Array.isArray(citas) ? citas.find(c => String(c.telefono).replace(/\s/g,'') === telefonoLimpio && c.estado !== 'Cancelada') : null;
      if (miCita) {
        await fetch(SHEETS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accion: 'actualizar', fila: miCita.fila, estado: 'Cancelada' })
        }).catch(() => {});
        return responder(EN
          ? `Your ${miCita.tratamiento} appointment on ${miCita.dia} has been cancelled. Write "appointment" to book a new one.`
          : `Tu cita de ${miCita.tratamiento} el ${miCita.dia} ha sido cancelada. Escribe "cita" si quieres pedir otra.`);
      }
      return responder(EN
        ? 'I couldn\'t find an active appointment with that phone number. Call us at 966 20 21 22 if you need help.'
        : 'No he encontrado ninguna cita activa con ese teléfono. Llámanos al 966 20 21 22 si necesitas ayuda.');
    } catch(e) {
      return responder(EN
        ? 'I couldn\'t cancel the appointment right now. Please call us at 966 20 21 22.'
        : 'No he podido cancelar la cita ahora mismo. Llámanos al 966 20 21 22.');
    }
  }

  // ── FUERA DE HORARIO ─────────────────────────────────────────────
  if (!estaAbierto() && !enFlujoDeCita) {
    if (esCita) {
      conv.paso = 'nombre';
      return responder(EN
        ? 'Hi, I\'m Vera. We\'re currently closed, but you can leave your request and we\'ll confirm when we open. What\'s your full name?'
        : `${elegir(SALUDOS_ES)}. Ahora estamos cerrados, pero puedes dejar tu solicitud y te confirmamos cuando abramos. ¿Cuál es tu nombre completo?`);
    }
    return responder(EN
      ? 'Hi, I\'m Vera. We\'re currently closed. Hours: Monday to Thursday 8:00–20:00, Friday 8:00–18:00. Write "appointment" to leave your request, or call us at 966 20 21 22.'
      : `${elegir(SALUDOS_ES)}. Ahora mismo estamos cerrados. Horario: lunes a jueves 8:00–20:00, viernes 8:00–18:00. Escribe "cita" para dejar tu solicitud. También puedes llamarnos al 966 20 21 22.`);
  }

  // ── FLUJO DE NUEVA CITA ──────────────────────────────────────────
  if (conv.paso === 'nombre') {
    conv.nombre = userMessage;
    conv.paso = 'telefono';
    return responder(EN ? 'What\'s your phone number?' : '¿Cuál es tu número de teléfono?');
  }
  if (conv.paso === 'telefono') {
    conv.telefono = userMessage;
    conv.paso = 'servicio';
    return responder(EN
      ? 'Which service do you need?\n1. Physiotherapy\n2. Osteopathy\n3. Podiatry\n4. Not sure, I need guidance'
      : '¿Qué servicio necesitas?\n1. Fisioterapia\n2. Osteopatía\n3. Podología\n4. No sé, necesito orientación');
  }
  if (conv.paso === 'servicio') {
    conv.servicio = userMessage;
    conv.paso = 'dia';
    return responder(EN ? 'Which day works best for you? (e.g. Monday, Tuesday...)' : '¿Qué día te viene mejor? (ej: lunes, martes...)');
  }
  if (conv.paso === 'dia') {
    conv.dia = userMessage;
    conv.paso = 'hora';
    return responder(EN
      ? 'Do you prefer morning (8am-12pm), afternoon (12pm-4pm) or evening (4pm-8pm)?'
      : '¿Prefieres mañana (8am-12pm), tarde (12pm-4pm) o última hora (4pm-8pm)?');
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

    try {
      const client = twilio(TWILIO_SID, TWILIO_TOKEN);
      await client.messages.create({
        from: 'whatsapp:+14155238886',
        to: 'whatsapp:+34651173012',
        body: `Nueva cita registrada:\nNombre: ${conv.nombre}\nTelefono: ${conv.telefono}\nServicio: ${conv.servicio}\nDia: ${conv.dia}\nHora: ${conv.hora}`
      });
    } catch(e) { console.error('Aviso clinica error:', e.message); }

    const confirm = EN ? elegir(CONFIRMACIONES_EN) : elegir(CONFIRMACIONES_ES);
    return responder(EN
      ? `${confirm} ${conv.nombre}, your ${conv.servicio} appointment for ${conv.dia} in the ${conv.hora} has been registered. We'll call you at ${conv.telefono} to confirm. See you soon!`
      : `${confirm} ${conv.nombre}, tu cita de ${conv.servicio} para el ${conv.dia} por la ${conv.hora} ha sido registrada. Te llamaremos al ${conv.telefono} para confirmar. ¡Hasta pronto!`);
  }

  if (esCita) {
    conv.paso = 'nombre';
    return responder(EN
      ? `${elegir(CONFIRMACIONES_EN)}, let's book your appointment. What's your full name?`
      : `${elegir(CONFIRMACIONES_ES)}, vamos a pedir tu cita. ¿Cuál es tu nombre completo?`);
  }

  // ── IA GENERAL ───────────────────────────────────────────────────
  const system = EN
    ? `You are Vera, the virtual assistant of Clínica Vicente Pascual, specialized in Physiotherapy, Osteopathy and Podiatry at Av. Alicante nº46, Elche, Spain. Phone: 966 20 21 22. Reply in English, be warm, friendly and concise — vary your wording naturally. Maximum 3 sentences. Never give medical diagnoses. No markdown or special formatting. If someone wants to book tell them to write "appointment". If they want to check their appointment write "my appointment". If they want to cancel write "cancel".`
    : `Eres Vera, la asistente virtual de Clínica Vicente Pascual, especializada en Fisioterapia, Osteopatía y Podología en Av. Alicante nº46, Elche. Teléfono: 966 20 21 22. Responde siempre en español, sé cercana, amable y concisa — varía tu forma de expresarte de manera natural. Máximo 3 oraciones. No des diagnósticos médicos. No uses markdown ni formato especial. Si alguien quiere pedir cita dile que escriba "cita". Si quiere consultar su cita dile "mi cita". Si quiere cancelar dile "cancelar".`;

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
  } catch(e) {
    responder(EN
      ? 'Sorry, something went wrong. Please call us at 966 20 21 22.'
      : 'Lo siento, hubo un error. Llámanos al 966 20 21 22.');
  }
};
