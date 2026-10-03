const { Jimp } = require('jimp');
const { intToRGBA } = require('jimp');

async function processImage() {
  const img = await Jimp.read('apps/web/public/logo-innovation.jpg');
  
  const width = img.bitmap.width;
  const height = img.bitmap.height;
  
  const cx = width / 2;
  const cy = height / 2;
  
  let radius = 0;
  for (let x = Math.floor(cx); x < width; x++) {
    const hex = img.getPixelColor(x, Math.floor(cy));
    const rgba = intToRGBA(hex);
    if (rgba.r > 150 && rgba.g > 150 && rgba.b > 150) {
      radius = x - cx;
      break;
    }
  }
  
  console.log("Found radius:", radius);
  
  const cropRadius = radius - 3; // a bit more padding
  
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const dx = x - cx;
      const dy = y - cy;
      if (Math.sqrt(dx*dx + dy*dy) > cropRadius) {
        img.setPixelColor(0x00000000, x, y);
      }
    }
  }
  
  const size = Math.floor(cropRadius * 2);
  const startX = Math.floor(cx - cropRadius);
  const startY = Math.floor(cy - cropRadius);
  
  img.crop({ x: startX, y: startY, w: size, h: size });
  
  await img.write('apps/web/public/logo-innovation-clean.png');
  console.log("Saved clean PNG");
}

processImage().catch(console.error);
