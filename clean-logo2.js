const { Jimp, intToRGBA, rgbaToInt } = require('jimp');

async function processImage() {
  const img = await Jimp.read('apps/web/public/logo-innovation.jpg');
  const width = img.bitmap.width;
  const height = img.bitmap.height;
  const cx = width / 2;
  const cy = height / 2;
  
  let radius = 0;
  for (let x = width - 1; x > cx; x--) {
    const hex = img.getPixelColor(x, Math.floor(cy));
    const rgba = intToRGBA(hex);
    // Dark circle edge
    if (rgba.r < 120 && rgba.g < 120 && rgba.b < 150) {
      radius = x - cx;
      break;
    }
  }
  
  console.log("Found correct radius:", radius);
  
  const cropRadius = radius - 5; // padding to not have a white border
  
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
