const fs = require('fs');
const generateImage = require('./withdraw-image');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

const TX_ID = String(process.env.TX_ID || '');
const TX_AMOUNT = Math.abs(Number(process.env.TX_AMOUNT || 0));
const TX_TIME = String(process.env.TX_TIME || '');

const API_URL = 'https://v6aus.com/getLiveStat.php';
const MIN_AMOUNT = 500;

function absAmount(value) {
  const cleaned = String(value ?? '').replace(/,/g, '').trim();
  return Math.abs(parseFloat(cleaned) || 0);
}

function getCaption(amount, provider, mobile) {
  if (amount >= 5000) {
    return `🎉 <b>CONGRATULATIONS!</b>
=======================
💎 <b>V6BET HIGH ROLLER WIN ALERT !</b>
Cashout : <b>AUD ${amount.toFixed(2)}</b>
Game : {provider}
Player ▶️ {mobile}
=======================
⚡ <b>REAL WIN • REAL PAYOUT</b>
🌍 国际认证 • 公平透明 • 全天候服务
🌐 Internationally Certified • Fair & Transparent • 24/7
🪙 Instant Deposit: 5–15s
🪙 Fast Withdrawal: 2–5 min
=======================
💎 <a href="https://v6aus.com/RF1525A8312">START WINNING NOW</a >`;
  }

  if (amount >= 2000) {
    return `🎉 <b>CONGRATULATIONS!</b>
=======================
🎯 <b>Another BIG WIN on V6BET!</b>
Cashout : <b>AUD ${amount.toFixed(2)}</b>
Game : {provider}
Player ▶️ {mobile}
=======================
⚡ <b>REAL WIN • REAL PAYOUT</b>
🌍 国际认证 • 公平透明 • 全天候服务
🌐 Internationally Certified • Fair & Transparent • 24/7
🪙 Instant Deposit: 5–15s
🪙 Fast Withdrawal: 2–5 min
=======================
🔥 <a href="https://v6aus.com/RF1525A8312">JOIN NOW & WIN BIG</a >`;
  }

  if (amount >= 1000) {
    return `🎉 <b>CONGRATULATIONS!</b>
=======================
🔥 <b>V6BET BIG WIN JUST HIT!</b>
Cashout : <b>AUD ${amount.toFixed(2)}</b>
Game : {provider}
Player ▶️ {mobile}
=======================
⚡ <b>REAL WIN • REAL PAYOUT</b>
🌍 国际认证 • 公平透明 • 全天候服务
🌐 Internationally Certified • Fair & Transparent • 24/7
🪙 Instant Deposit: 5–15s
🪙 Fast Withdrawal: 2–5 min
=======================
🔥 <a href="https://v6aus.com/RF1525A8312">CLICK NOW & WIN</a >`;
  }

  return `🎉 <b>CONGRATULATIONS!</b>
=======================
🎉 <b>V6BET WIN UPDATE</b>
Cashout : <b>AUD ${amount.toFixed(2)}</b>
Game : {provider}
Player ▶️ {mobile}
=======================
⚡ <b>REAL WIN • REAL PAYOUT</b>
🌍 国际认证 • 公平透明 • 全天候服务
🌐 Internationally Certified • Fair & Transparent • 24/7
🪙 Instant Deposit: 5–15s
🪙 Fast Withdrawal: 2–5 min
=======================
🌐 <a href="https://v6aus.com/RF1525A8312">PLAY NOW</a >`;
}

async function sendPhoto(imagePath, caption) {
  const chatIds = String(CHAT_ID || '')
    .split(',')
    .map(x => x.trim())
    .filter(Boolean);

  if (!chatIds.length) {
    throw new Error('No valid chat_id found');
  }

  const fileBuffer = fs.readFileSync(imagePath);

  for (const id of chatIds) {
    const form = new FormData();
    form.append('chat_id', id);
    form.append('caption', caption);
    form.append('parse_mode', 'HTML');
    form.append('disable_web_page_preview', 'true');
    form.append('photo', new Blob([fileBuffer], { type: 'image/png' }), 'withdraw.png');

    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      body: form
    });

    const json = await res.json();

    if (!json.ok) {
      throw new Error(`Telegram send failed for ${id}: ${JSON.stringify(json)}`);
    }

    console.log(`Sent to ${id}`);
  }
}

async function fetchLiveWithdraws() {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'referer': 'https://v6aus.com/'
    },
    body: 'background=1&mId=727'
  });

  const json = await res.json();

  if (json?.status !== 'SUCCESS') {
    throw new Error('Live TX API not success');
  }

  return Array.isArray(json?.data?.WITHDRAW) ? json.data.WITHDRAW : [];
}

function findMatchingWithdraw(withdraws, targetAmount) {
  const normalized = withdraws.map(w => ({
    id: String(w.id || ''),
    mobile: String(w.mobile || ''),
    provider: String(w.site || '').toUpperCase(),
    amount: absAmount(w.cash)
  }));

  console.log('LIVE WITHDRAW NORMALIZED:', JSON.stringify(normalized, null, 2));

  return normalized.find(w => w.amount === targetAmount) || null;
}

(async () => {
  try {
    if (!BOT_TOKEN || !CHAT_ID) {
      throw new Error('Missing BOT_TOKEN or CHAT_ID');
    }

    if (!TX_ID || !TX_AMOUNT || !TX_TIME) {
      throw new Error('Missing workflow input');
    }

    if (TX_AMOUNT < MIN_AMOUNT) {
      console.log(`Amount below ${MIN_AMOUNT}, exit`);
      return;
    }

    console.log('Triggered by webhook:', {
      TX_ID,
      TX_AMOUNT,
      TX_TIME
    });

    const withdraws = await fetchLiveWithdraws();

    if (!withdraws.length) {
      console.log('No live withdraw data, exit');
      return;
    }

    const matched = findMatchingWithdraw(withdraws, TX_AMOUNT);

    if (!matched) {
      console.log('No matching live tx found, do not send');
      return;
    }

    console.log('MATCHED LIVE TX:', matched);

    const data = {
      id: matched.id || TX_ID,
      mobile: matched.mobile,
      provider: matched.provider,
      amount: matched.amount,
      time: TX_TIME
    };

    await generateImage(data);

    if (!fs.existsSync('withdraw.png')) {
      throw new Error('Image not created');
    }

    const caption = getCaption(data.amount, data.provider, data.mobile);
    await sendPhoto('withdraw.png', caption);

    console.log('DONE');
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
