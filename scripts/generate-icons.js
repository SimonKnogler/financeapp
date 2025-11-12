const sharp = require('sharp');
const fs = require('fs');

// Read the SVG icon
const svgBuffer = fs.readFileSync('public/icon.svg');

// Generate 192x192 icon
sharp(svgBuffer)
  .resize(192, 192)
  .png()
  .toFile('public/icon-192.png')
  .then(() => console.log('✅ Generated icon-192.png'))
  .catch((err) => console.error('Error generating 192px icon:', err));

// Generate 512x512 icon
sharp(svgBuffer)
  .resize(512, 512)
  .png()
  .toFile('public/icon-512.png')
  .then(() => console.log('✅ Generated icon-512.png'))
  .catch((err) => console.error('Error generating 512px icon:', err));

// Generate apple-touch-icon (180x180)
sharp(svgBuffer)
  .resize(180, 180)
  .png()
  .toFile('public/apple-touch-icon.png')
  .then(() => console.log('✅ Generated apple-touch-icon.png'))
  .catch((err) => console.error('Error generating apple touch icon:', err));

