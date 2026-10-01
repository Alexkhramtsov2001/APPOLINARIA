/* =============================================================
   canvas-bg.js — неоновая сетка + частицы
   Appolinaria Vorobyeva // Graphic & Motion
   VERSION 4 — мягкая яркость
   ============================================================= */

console.log('[canvas-bg] module loaded');

/* =============================================================
   КОНФИГ
   ============================================================= */
const CONFIG = {
    /* Неоновые цвета */
    colors: [
        [0, 240, 255],      // cyan
        [255, 0, 170],      // magenta
        [180, 255, 57],     // lime
        [157, 78, 221],     // violet
        [255, 234, 0]       // yellow
    ],

    /* Сетка — МЯГКАЯ ЯРКОСТЬ */
    gridSize: 60,
    gridSpeed: 12,              // px/s (было 14 — чуть спокойнее)
    gridAngle: 25,
    gridOpacity: 0.18,          // ← было 0.55, теперь мягко
    gridLineWidth: 1.2,         // ← было 1.5
    gridDots: true,
    gridDotRadius: 1.5,         // ← было 2.2
    gridDotOpacity: 0.4,        // ← было 0.9
    gridDotShadow: 4,           // ← было 10

    /* Частицы — МЯГКИЕ */
    particleCount: 60,          // ← было 70
    particleSizeMin: 1.4,       // ← было 1.8
    particleSizeMax: 3.2,       // ← было 4.5
    particleSpeedMin: 12,       // ← было 15
    particleSpeedMax: 35,       // ← было 45
    particleOpacityMin: 0.35,   // ← было 0.6
    particleOpacityMax: 0.7,    // ← было 1.0
    particleGlowFactor: 3.5,    // ← было 5
    particleWhiteCore: false,   // ← убираем белый центр

    /* Связи — МЯГКИЕ */
    connectionsEnabled: true,
    connectionDistance: 110,    // ← было 140
    connectionOpacity: 0.12,    // ← было 0.25

    /* Общие */
    fps: 60,
    dprCap: 2
};

/* =============================================================
   СОСТОЯНИЕ
   ============================================================= */
let canvas, ctx;
let width = 0, height = 0, dpr = 1;
let running = false;
let rafId = null;
let lastTime = 0;

let gridOffset = { x: 0, y: 0 };
let gridColorT = 0;
let particles = [];
let mouse = { x: -1000, y: -1000, active: false };

let isTouch = false;

/* =============================================================
   ПУБЛИЧНЫЙ МЕТОД
   ============================================================= */
export function initCanvasBg() {
    console.log('[canvas-bg] init() called');

    canvas = document.getElementById('bgCanvas');
    if (!canvas) {
        console.error('[canvas-bg] #bgCanvas NOT FOUND');
        return;
    }

    ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) {
        console.error('[canvas-bg] 2d context unavailable');
        return;
    }

    isTouch = window.matchMedia('(hover: none)').matches;

    resize();

    const area = width * height;
    const baseCount = Math.min(
        CONFIG.particleCount,
        Math.max(25, Math.round(area / 28000))
    );
    const count = isTouch ? Math.round(baseCount * 0.5) : baseCount;
    particles = Array.from({ length: count }, () => createParticle(true));

    window.addEventListener('resize', debounce(resize, 200), { passive: true });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stop();
        else start();
    });

    if (!isTouch) {
        window.addEventListener('mousemove', (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
            mouse.active = true;
        }, { passive: true });
        window.addEventListener('mouseleave', () => {
            mouse.active = false;
        });
    }

    start();

    console.log('[canvas-bg] READY — particles:', particles.length);
    window.dispatchEvent(new CustomEvent('canvas-bg:ready'));
}

/* =============================================================
   RESIZE
   ============================================================= */
function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, CONFIG.dprCap);
    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/* =============================================================
   ЧАСТИЦЫ
   ============================================================= */
function createParticle(anywhere = false) {
    const angle = Math.random() * Math.PI * 2;
    const speed = rand(CONFIG.particleSpeedMin, CONFIG.particleSpeedMax);
    const color = CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)];

    return {
        x: anywhere ? Math.random() * width : -20,
        y: anywhere ? Math.random() * height : Math.random() * height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: rand(CONFIG.particleSizeMin, CONFIG.particleSizeMax),
        alpha: rand(CONFIG.particleOpacityMin, CONFIG.particleOpacityMax),
        color,
        twinkleT: Math.random() * Math.PI * 2,
        twinkleSpeed: rand(0.5, 2)
    };
}

function updateParticle(p, dt) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.twinkleT += p.twinkleSpeed * dt;

    if (mouse.active) {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const distSq = dx * dx + dy * dy;
        const radius = 180;
        const radiusSq = radius * radius;

        if (distSq < radiusSq && distSq > 1) {
            const dist = Math.sqrt(distSq);
            const force = (1 - dist / radius) * 0.5;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;

            const maxSpeed = CONFIG.particleSpeedMax * 2.5;
            const speedSq = p.vx * p.vx + p.vy * p.vy;
            if (speedSq > maxSpeed * maxSpeed) {
                const s = maxSpeed / Math.sqrt(speedSq);
                p.vx *= s;
                p.vy *= s;
            }
        }
    }

    p.vx *= 0.995;
    p.vy *= 0.995;

    const minSpeed = CONFIG.particleSpeedMin * 0.6;
    const s2 = p.vx * p.vx + p.vy * p.vy;
    if (s2 < minSpeed * minSpeed) {
        const angle = Math.random() * Math.PI * 2;
        p.vx = Math.cos(angle) * CONFIG.particleSpeedMin;
        p.vy = Math.sin(angle) * CONFIG.particleSpeedMin;
    }

    const margin = 20;
    if (p.x < -margin) p.x = width + margin;
    if (p.x > width + margin) p.x = -margin;
    if (p.y < -margin) p.y = height + margin;
    if (p.y > height + margin) p.y = -margin;
}

function drawParticle(p) {
    const twinkle = 0.8 + Math.sin(p.twinkleT) * 0.2;
    const alpha = p.alpha * twinkle;
    const size = p.size * twinkle;
    const [r, g, b] = p.color;

    // Свечение (мягкое)
    const glowRadius = size * CONFIG.particleGlowFactor;
    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowRadius);
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha * 0.5})`);
    gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${alpha * 0.15})`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    // Ядро
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.min(alpha * 1.1, 1)})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    ctx.fill();
}

function drawConnections() {
    if (!CONFIG.connectionsEnabled) return;

    const maxDist = CONFIG.connectionDistance;
    const maxDistSq = maxDist * maxDist;

    for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
            const b = particles[j];
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < maxDistSq) {
                const dist = Math.sqrt(distSq);
                const opacity = (1 - dist / maxDist) * CONFIG.connectionOpacity;

                const r = Math.round((a.color[0] + b.color[0]) / 2);
                const g = Math.round((a.color[1] + b.color[1]) / 2);
                const bl = Math.round((a.color[2] + b.color[2]) / 2);

                ctx.strokeStyle = `rgba(${r}, ${g}, ${bl}, ${opacity})`;
                ctx.lineWidth = 0.6;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.stroke();
            }
        }
    }
}

/* =============================================================
   СЕТКА
   ============================================================= */
function updateGrid(dt) {
    const rad = (CONFIG.gridAngle * Math.PI) / 180;
    gridOffset.x = (gridOffset.x + Math.cos(rad) * CONFIG.gridSpeed * dt) % CONFIG.gridSize;
    gridOffset.y = (gridOffset.y + Math.sin(rad) * CONFIG.gridSpeed * dt) % CONFIG.gridSize;

    if (gridOffset.x < 0) gridOffset.x += CONFIG.gridSize;
    if (gridOffset.y < 0) gridOffset.y += CONFIG.gridSize;

    gridColorT += dt;
}

function getGridColor(offsetRatio = 0) {
    const colors = CONFIG.colors;
    const total = colors.length;
    const t = (gridColorT * 0.15 + offsetRatio) % 1;
    const pos = t * total;
    const i1 = Math.floor(pos) % total;
    const i2 = (i1 + 1) % total;
    const f = pos - Math.floor(pos);

    const c1 = colors[i1];
    const c2 = colors[i2];

    return [
        Math.round(c1[0] + (c2[0] - c1[0]) * f),
        Math.round(c1[1] + (c2[1] - c1[1]) * f),
        Math.round(c1[2] + (c2[2] - c1[2]) * f)
    ];
}

function drawGrid() {
    const size = CONFIG.gridSize;
    const startX = -size + gridOffset.x;
    const startY = -size + gridOffset.y;

    ctx.lineWidth = CONFIG.gridLineWidth;

    // Вертикальные
    for (let x = startX; x < width + size; x += size) {
        const ratio = (x / width) * 0.5;
        const [r, g, b] = getGridColor(ratio);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${CONFIG.gridOpacity})`;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }

    // Горизонтальные
    for (let y = startY; y < height + size; y += size) {
        const ratio = (y / height) * 0.5 + 0.5;
        const [r, g, b] = getGridColor(ratio);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${CONFIG.gridOpacity})`;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }

    // Точки на пересечениях — мягкие
    if (CONFIG.gridDots) {
        ctx.shadowBlur = CONFIG.gridDotShadow;
        for (let x = startX; x < width + size; x += size) {
            for (let y = startY; y < height + size; y += size) {
                const [r, g, b] = getGridColor((x + y) / (width + height));
                ctx.shadowColor = `rgb(${r}, ${g}, ${b})`;
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${CONFIG.gridDotOpacity})`;
                ctx.beginPath();
                ctx.arc(x, y, CONFIG.gridDotRadius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.shadowBlur = 0;
    }
}

/* =============================================================
   ЦИКЛ
   ============================================================= */
function loop(now) {
    if (!running) return;
    rafId = requestAnimationFrame(loop);

    const targetInterval = 1000 / CONFIG.fps;
    const elapsed = now - lastTime;
    if (elapsed < targetInterval) return;

    const dt = Math.min(elapsed / 1000, 0.1);
    lastTime = now;

    ctx.clearRect(0, 0, width, height);

    updateGrid(dt);
    drawGrid();

    for (let i = 0; i < particles.length; i++) {
        updateParticle(particles[i], dt);
    }
    drawConnections();

    for (let i = 0; i < particles.length; i++) {
        drawParticle(particles[i]);
    }
}

function start() {
    if (running) return;
    running = true;
    lastTime = performance.now();
    rafId = requestAnimationFrame(loop);
}

function stop() {
    running = false;
    if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
}

/* =============================================================
   ВСПОМОГАТЕЛЬНОЕ
   ============================================================= */
function rand(min, max) {
    return min + Math.random() * (max - min);
}

function debounce(fn, delay) {
    let timer = null;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}