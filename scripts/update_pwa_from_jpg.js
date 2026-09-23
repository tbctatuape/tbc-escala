import sharp from 'sharp';
import path from 'path';

async function updatePwaIcons() {
  const publicDir = path.resolve('public');
  const sourceImage = path.join(publicDir, 'logo.jpg');

  const sizes = [
    { name: 'logo192.png', size: 192 },
    { name: 'pwa-192x192.png', size: 192 },
    { name: 'pwa-512x512.png', size: 512 },
    { name: 'pwa-maskable-512x512.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 },
  ];

  for (const item of sizes) {
    await sharp(sourceImage)
      .resize(item.size, item.size)
      .png()
      .toFile(path.join(publicDir, item.name));
    console.log(`Updated PWA icon ${item.name} from logo.jpg (${item.size}x${item.size})`);
  }
}

updatePwaIcons().catch(console.error);
