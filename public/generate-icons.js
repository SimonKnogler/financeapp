// Simple script to generate PNG icons from SVG
// For production, use a proper icon generator or design tool
const fs = require('fs');

// Create placeholder PNGs by copying the SVG
const sizes = [192, 512];
const svgContent = fs.readFileSync('public/icon.svg', 'utf8');

sizes.forEach(size => {
  // For now, just copy the SVG - you'll want to use a proper converter
  // or design custom PNGs in tools like Figma/Sketch
  fs.writeFileSync(`public/icon-${size}.png.placeholder`, svgContent);
});

console.log('Icon placeholders created. Please generate proper PNG icons from icon.svg');
console.log('Recommended tools:');
console.log('- https://realfavicongenerator.net/');
console.log('- https://www.pwabuilder.com/imageGenerator');
