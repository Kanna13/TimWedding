function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, message: 'Метод не поддерживается.' });
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    return json(res, 500, { ok: false, message: 'Сервис временно недоступен. Попробуйте позже.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const name = String(body.name || '').trim();
    const answerRaw = String(body.answer || '').trim();
    const guests = Math.max(1, Math.min(20, Number.parseInt(body.guests, 10) || 1));
    const note = String(body.note || '').trim();
    if (!name || !answerRaw) return json(res, 400, { ok: false, message: 'Пожалуйста, заполните имя и выберите ответ.' });

    const answer = /не смогу|не прид|нет/i.test(answerRaw) ? 'Не придёт' : 'Придёт';
    const date = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bishkek' }).format(new Date());
    const message = [
      '💌 <b>НОВЫЙ ОТВЕТ НА СВАДЬБУ</b>', '',
      `👤 Имя: ${escapeHtml(name)}`,
      `💍 Ответ: ${answer}`,
      `👥 Гостей: ${guests}`,
      `💬 Комментарий: ${escapeHtml(note || '—')}`, '',
      `📅 Дата ответа: ${date}`
    ].join('\n');
    const tg = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: message, parse_mode: 'HTML' })
    });
    const telegramBody = await tg.text();
    if (!tg.ok) {
      console.error('Telegram API error', tg.status, telegramBody);
      throw new Error(`Telegram request failed (${tg.status})`);
    }
    return json(res, 200, { ok: true });
  } catch (error) {
    console.error('RSVP error', error);
    return json(res, 500, { ok: false, message: 'Не удалось отправить ответ. Попробуйте ещё раз.' });
  }
};

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
}
