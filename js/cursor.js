/* =============================================================
   cursor.js — кастомный курсор + magnetic + label
   Appolinaria Vorobyeva // Graphic & Motion
   VERSION 2 — надёжное включение
   ============================================================= */

/* =============================================================
   КОНФИГ
   ============================================================= */
const CONFIG = {
    ringLerp: 0.15,
    ringLerpReduced: 1.0,       // при reduce-motion — сразу за мышью
    magneticRadius: 80,
    magneticStrength: 0.35,
    magneticMax: 20,
    labelOffsetX: 20,
    labelOffsetY: 20,
    hideAfterMs: 3000
};

/* =============================================================
   СОСТОЯНИЕ
   ============================================================= */
let cursorEl, dotEl, ringEl, labelEl;
let mouseX = -100, mouseY = -100;
let ringX = -100, ringY = -100;
let prefersReduced = false;
let running = false;
let rafId = null;
let activeLabel = '';
let hideTimer = null;

/* =============================================================
   ПУБЛИЧНЫЙ МЕТОД
   ============================================================= */
export function initCursor() {
    prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Отключаем ТОЛЬКО на реальных тач-устройствах
    const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
    const hasHover = window.matchMedia('(hover: hover)').matches;

    // Если мышь есть (fine pointer или hover) — включаем
    if (!hasFinePointer && !hasHover) {
        console.log('[cursor] disabled: no fine pointer / hover');
        return;
    }

    cursorEl = document.getElementById('cursor');
    if (!cursorEl) {
        console.warn('[cursor] #cursor not found');
        return;
    }

    dotEl = cursorEl.querySelector('.cursor__dot');
    ringEl = cursorEl.querySelector('.cursor__ring');
    labelEl = document.getElementById('cursorLabel');

    if (!dotEl || !ringEl) {
        console.warn('[cursor] cursor structure incomplete');
        return;
    }

    // Включаем кастомный курсор
    document.documentElement.classList.add('has-custom-cursor');

    // Позиция старт — центр экрана
    mouseX = window.innerWidth / 2;
    mouseY = window.innerHeight / 2;
    ringX = mouseX;
    ringY = mouseY;

    // Слушатели
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mousedown', handleMouseDown, { passive: true });
    window.addEventListener('mouseup', handleMouseUp, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave, { passive: true });
    window.addEventListener('mouseenter', handleMouseEnter, { passive: true });

    setupHoverTargets();
    setupMagneticElements();
    setupCursorLabels();
    setupClickRipples();

    start();

    window.dispatchEvent(new CustomEvent('cursor:ready'));

    console.log('[cursor] ready — has-custom-cursor applied');
}

/* =============================================================
   ДВИЖЕНИЕ
   ============================================================= */
function handleMouseMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursorEl.classList.remove('is-hidden');
    resetHideTimer();
}

function handleMouseDown() {
    cursorEl.classList.add('is-down');
}

function handleMouseUp() {
    cursorEl.classList.remove('is-down');
}

function handleMouseLeave() {
    cursorEl.classList.add('is-hidden');
}

function handleMouseEnter() {
    cursorEl.classList.remove('is-hidden');
}

function resetHideTimer() {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
        cursorEl.classList.add('is-hidden');
    }, CONFIG.hideAfterMs);
}

/* =============================================================
   ЦИКЛ ОТРИСОВКИ
   ============================================================= */
function start() {
    if (running) return;
    running = true;
    loop();
}

function loop() {
    if (!running) return;
    rafId = requestAnimationFrame(loop);

    const lerp = prefersReduced ? CONFIG.ringLerpReduced : CONFIG.ringLerp;

    ringX += (mouseX - ringX) * lerp;
    ringY += (mouseY - ringY) * lerp;

    dotEl.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
    ringEl.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;

    if (labelEl && activeLabel) {
        const labelX = ringX + CONFIG.labelOffsetX;
        const labelY = ringY + CONFIG.labelOffsetY;
        labelEl.style.transform = `translate3d(${labelX}px, ${labelY}px, 0) scale(1)`;
    }
}

/* =============================================================
   HOVER-СОСТОЯНИЕ
   ============================================================= */
function setupHoverTargets() {
    const selector = 'a, button, [role="button"], input, textarea, .skill, .work-card, .contact';

    document.addEventListener('mouseover', (e) => {
        const target = e.target.closest(selector);
        if (target) cursorEl.classList.add('is-hover');
    }, { passive: true });

    document.addEventListener('mouseout', (e) => {
        const target = e.target.closest(selector);
        if (target) {
            const related = e.relatedTarget?.closest?.(selector);
            if (!related) cursorEl.classList.remove('is-hover');
        }
    }, { passive: true });
}

/* =============================================================
   МАГНИТНЫЕ ЭЛЕМЕНТЫ
   ============================================================= */
function setupMagneticElements() {
    const magnetics = document.querySelectorAll('[data-magnetic]');
    if (!magnetics.length) return;

    magnetics.forEach(el => {
        el.addEventListener('mousemove', (e) => {
            const rect = el.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;

            const dx = e.clientX - cx;
            const dy = e.clientY - cy;

            const dist = Math.hypot(dx, dy);
            if (dist > CONFIG.magneticRadius) {
                resetMagnetic(el);
                return;
            }

            const strength = (1 - dist / CONFIG.magneticRadius) * CONFIG.magneticStrength;
            let moveX = dx * strength;
            let moveY = dy * strength;

            moveX = clamp(moveX, -CONFIG.magneticMax, CONFIG.magneticMax);
            moveY = clamp(moveY, -CONFIG.magneticMax, CONFIG.magneticMax);

            el.style.transform = `translate3d(${moveX}px, ${moveY}px, 0)`;
        });

        el.addEventListener('mouseleave', () => resetMagnetic(el));
    });
}

function resetMagnetic(el) {
    el.style.transform = 'translate3d(0, 0, 0)';
}

/* =============================================================
   МЕТКИ КУРСОРА
   ============================================================= */
function setupCursorLabels() {
    if (!labelEl) return;

    document.addEventListener('mouseover', (e) => {
        const target = e.target.closest('[data-cursor-label]');
        if (target) {
            const label = target.dataset.cursorLabel;
            if (label && label !== activeLabel) {
                activeLabel = label;
                labelEl.textContent = label;
                cursorEl.classList.add('is-labeled');
            }
        }
    }, { passive: true });

    document.addEventListener('mouseout', (e) => {
        const target = e.target.closest('[data-cursor-label]');
        if (target) {
            const related = e.relatedTarget?.closest?.('[data-cursor-label]');
            if (!related) {
                activeLabel = '';
                cursorEl.classList.remove('is-labeled');
            }
        }
    }, { passive: true });
}

/* =============================================================
   РИППЛ ПРИ КЛИКЕ
   ============================================================= */
function setupClickRipples() {
    document.addEventListener('click', (e) => {
        if (e.ctrlKey || e.metaKey || e.shiftKey) return;
        createRipple(e.clientX, e.clientY);
    });
}

function createRipple(x, y) {
    const ripple = document.createElement('span');
    ripple.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        width: 10px;
        height: 10px;
        border: 2px solid var(--accent);
        border-radius: 50%;
        pointer-events: none;
        transform: translate(-50%, -50%);
        z-index: 9998;
    `;
    document.body.appendChild(ripple);

    const animation = ripple.animate([
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, borderWidth: '2px' },
        { transform: 'translate(-50%, -50%) scale(6)', opacity: 0, borderWidth: '1px' }
    ], {
        duration: 600,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
    });

    animation.onfinish = () => ripple.remove();
    animation.oncancel = () => ripple.remove();
}

/* =============================================================
   ВСПОМОГАТЕЛЬНОЕ
   ============================================================= */
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}