const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');

function maskPhone(phone) {
  return String(phone || '').replace(/(\d{2})\d+(\d{3})/, '$1******$2');
}

function getTemplateByAmount(amount) {
  if (amount >= 5000) return 'template-5000.png';
  if (amount >= 2000) return 'template-2000.png';
  if (amount >= 1000) return 'template-1000.png';
  return 'template.png';
}

async function generateImage(data) {
  const templateFile = getTemplateByAmount(Number(data.amount || 0));
  const base = await loadImage(templateFile);

  const canvas = createCanvas(base.width, base.height);
  const ctx = canvas.getContext('2d');

  ctx.drawImage(base, 0, 0, base.width, base.height);

  const centerX = base.width / 2;
  ctx.textAlign = 'center';

  // 金额
  ctx.shadowColor = '#ffaa00';
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#ffaa00';
  ctx.font = 'bold 80px Poppins';
  ctx.fillText(`AUD ${Math.abs(Number(data.amount || 0)).toFixed(2)}`, centerX, 120);
  ctx.shadowBlur = 0;

  // 手机 + provider
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px Poppins';
  ctx.fillText(
    `${maskPhone(data.mobile)}   •   ${data.provider}`,
    centerX,
    180
  );

  fs.writeFileSync('withdraw.png', canvas.toBuffer('image/png'));
}

module.exports = generateImage;
