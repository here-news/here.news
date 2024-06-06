// key2svg.js

// Simple RNG class based on a seed
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

export function hashToSeed(key) {
    // Sum the char codes to create a seed
    return Array.from(key).reduce((acc, byte) => acc + byte.charCodeAt(0), 0);
}

export function deterministicHexColor(rng) {
    return '#' + (0x1000000 + Math.floor(rng.next() * 0xffffff)).toString(16).slice(1);
}

export function drawBezier(svg, params) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute('d', params.d);
    path.setAttribute('stroke', params.stroke);
    path.setAttribute('stroke-width', params.strokeWidth);
    path.setAttribute('fill', params.fill);
    path.setAttribute('opacity', params.opacity);
    svg.appendChild(path);
}

export function generateSVG(publicKey, svg) {
    // Use debug logging to check seed value
    const seed = hashToSeed(publicKey);
    // console.log("Seed:", seed);

    const rng = new LCG(seed);
    const params = {
        bgcolor: deterministicHexColor(rng),
        stroke: deterministicHexColor(rng),
        strokeWidth: Math.floor(rng.next() * 10) + 1,
        fill: deterministicHexColor(rng),
        opacity: rng.next().toFixed(2)
    };

    svg.style.background = params.bgcolor;

    const numberOfCurves = 5;
    for (let i = 0; i < numberOfCurves; i++) {
        // Generate path using valid numbers
        const d = `M${rng.next() * 800},${rng.next() * 600} C${rng.next() * 800},${rng.next() * 600} ${rng.next() * 800},${rng.next() * 600} ${rng.next() * 800},${rng.next() * 600}`;
        // console.log("Path:", d);
        drawBezier(svg, { ...params, d });
    }
}
