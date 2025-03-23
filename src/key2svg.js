// key2svg.js - Simple avatar generation from public keys

/**
 * Simple RNG class based on a seed
 */
export class LCG {
  constructor(seed) {
    this.modulus = 2 ** 32;
    this.multiplier = 1664525;
    this.increment = 1013904223;
    this.seed = seed % this.modulus;
  }

  next() {
    this.seed = (this.multiplier * this.seed + this.increment) % this.modulus;
    return this.seed / this.modulus;
  }
}

/**
 * Convert a key string to a numeric seed
 * @param {string} key - Public key to convert to seed
 * @returns {number} Numeric seed for RNG
 */
export function hashToSeed(key) {
  // Sum the char codes to create a seed
  return Array.from(key).reduce((acc, byte) => acc + byte.charCodeAt(0), 0);
}

/**
 * Generate a deterministic hex color based on RNG
 * @param {LCG} rng - Random number generator
 * @returns {string} Hex color code
 */
export function deterministicHexColor(rng) {
  return '#' + (0x1000000 + Math.floor(rng.next() * 0xffffff)).toString(16).slice(1);
}

/**
 * Draw a bezier curve on an SVG element
 * @param {SVGElement} svg - SVG element to draw on
 * @param {Object} params - Drawing parameters
 */
export function drawBezier(svg, params) {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute('d', params.d);
  path.setAttribute('stroke', params.stroke);
  path.setAttribute('stroke-width', params.strokeWidth);
  path.setAttribute('fill', params.fill);
  path.setAttribute('opacity', params.opacity);
  svg.appendChild(path);
}

/**
 * Generate an SVG avatar from a public key
 * @param {string} publicKey - Nostr public key
 * @param {SVGElement} svg - SVG element to draw on
 */
export function generateSVG(publicKey, svg) {
  // Use public key to create a deterministic seed
  const seed = hashToSeed(publicKey);
  
  const rng = new LCG(seed);
  const params = {
    bgcolor: deterministicHexColor(rng),
    stroke: deterministicHexColor(rng),
    strokeWidth: Math.floor(rng.next() * 10) + 1,
    fill: deterministicHexColor(rng),
    opacity: rng.next().toFixed(2)
  };

  svg.style.background = params.bgcolor;

  // Generate several curves for a more complex avatar
  const numberOfCurves = 5;
  for (let i = 0; i < numberOfCurves; i++) {
    // Generate path using valid numbers
    const d = `M${rng.next() * 800},${rng.next() * 600} C${rng.next() * 800},${rng.next() * 600} ${rng.next() * 800},${rng.next() * 600} ${rng.next() * 800},${rng.next() * 600}`;
    drawBezier(svg, { ...params, d });
  }
}