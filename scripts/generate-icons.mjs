// Gera os PNGs de ícone/splash/favicon do app "Nosso Espaço" a partir de um
// SVG de marca (coração), usando sharp. Rode: node scripts/generate-icons.mjs

import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const imagesDir = join(root, 'assets', 'images');

const ACCENT = '#C85A7C';
const ACCENT_DEEP = '#9E3D5A';

// Caminho de coração em viewBox 0 0 32 29.6
const HEART = 'M23.6,0c-3.4,0-6.3,2.7-7.6,5.6C14.7,2.7,11.8,0,8.4,0C3.8,0,0,3.8,0,8.4c0,9.4,9.5,11.9,16,21.2 c6.1-9.3,16-12.1,16-21.2C32,3.8,28.2,0,23.6,0z';

/** Monta um SVG quadrado com um coração centralizado. */
function buildSvg({ size, bg, heartColor, heartFrac = 0.5, glow = false }) {
  const w = size * heartFrac;
  const scale = w / 32;
  const h = 29.6 * scale;
  const tx = (size - w) / 2;
  const ty = (size - h) / 2;

  let background = '';
  if (bg === 'gradient') {
    background = `<rect width="${size}" height="${size}" fill="url(#g)" />`;
  } else if (bg && bg !== 'none') {
    background = `<rect width="${size}" height="${size}" fill="${bg}" />`;
  }

  const glowCircle = glow
    ? `<circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.34}" fill="#ffffff" opacity="0.12" />`
    : '';

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${ACCENT}" />
        <stop offset="1" stop-color="${ACCENT_DEEP}" />
      </linearGradient>
    </defs>
    ${background}
    ${glowCircle}
    <g transform="translate(${tx}, ${ty}) scale(${scale})">
      <path d="${HEART}" fill="${heartColor}" />
    </g>
  </svg>`);
}

async function render(svg, size, outName) {
  await sharp(svg, { density: 384 }).resize(size, size).png().toFile(join(imagesDir, outName));
  console.log('  ✓', outName);
}

async function main() {
  console.log('Gerando ícones de "Nosso Espaço"...');
  // Ícone principal (fundo gradiente + coração branco)
  await render(buildSvg({ size: 1024, bg: 'gradient', heartColor: '#ffffff', heartFrac: 0.46, glow: true }), 1024, 'icon.png');
  // Favicon
  await render(buildSvg({ size: 96, bg: 'gradient', heartColor: '#ffffff', heartFrac: 0.5 }), 96, 'favicon.png');
  // Splash (coração sobre transparente — backgroundColor vem do app.json)
  await render(buildSvg({ size: 1024, bg: 'none', heartColor: ACCENT, heartFrac: 0.42 }), 1024, 'splash-icon.png');
  // Android adaptive: foreground (transparente, coração branco com folga p/ máscara)
  await render(buildSvg({ size: 1024, bg: 'none', heartColor: '#ffffff', heartFrac: 0.4 }), 1024, 'android-icon-foreground.png');
  // Android adaptive: background sólido
  await render(buildSvg({ size: 1024, bg: ACCENT, heartColor: ACCENT, heartFrac: 0 }), 1024, 'android-icon-background.png');
  // Android adaptive: monochrome (coração branco em transparente)
  await render(buildSvg({ size: 1024, bg: 'none', heartColor: '#ffffff', heartFrac: 0.4 }), 1024, 'android-icon-monochrome.png');
  console.log('Pronto!');
}

main().catch(err => { console.error(err); process.exit(1); });
