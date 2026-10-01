/* =============================================================
   ui.js — boot, меню, палитра, копирование, toast, glitch,
           scroll-progress, active-nav, smooth-scroll,
           marquee (JS-клонирование)
   Appolinaria Vorobyeva // Graphic & Motion
   VERSION 3 — marquee через JS, active nav по центру viewport
   ============================================================= */

import { t } from './i18n.js';

console.log('[ui] module loaded');

/* =============================================================
   КОНФИГ
   ============================================================= */
const CONFIG = {
    boot: {
        charDelay: 22,
        lineDelay: 180,
        holdAfter: 600,
        barInterval: 180
    },
    glitchBars: {
        minInterval: 4000,
        maxInterval: 12000,
        duration: 400,
        maxBars: 3
    },
    palettes: ['cyan', 'magenta', 'lime', 'violet'],
    paletteStorageKey: 'av-portfolio-palette',
    marquee: {
        minCopies: 2,           // минимум 2 копии
        maxCopies: 8,           // защита от бесконечного клонирования
        targetMultiplier: 2.2   // сколько ширин экрана нужно
    }
};

/* =============================================================
   ЛОГИ BOOT-ЭКРАНА
   ============================================================= */
const BOOT_LINES = [
    { text: '> INITIALIZING PORTFOLIO.SYS ...', type: 'warn' },
    { text: '> MOUNT /design/engine', type: '' },
    { text: '> LOADING MODULES', type: 'ok' },
    { text: '>   [GRAPHIC_ENGINE]', type: 'ok' },
    { text: '>   [MOTION_ENGINE]', type: 'ok' },
    { text: '>   [PRINT_MODULE]', type: 'ok' },
    { text: '> RUNNING DIAGNOSTICS ...', type: 'warn' },
    { text: '>   composition ........ OK', type: 'ok' },
    { text: '>   typography ......... OK', type: 'ok' },
    { text: '>   color_balance ...... OK', type: 'ok' },
    { text: '> AUTHORIZATION: APOLLINARIA', type: 'done' },
    { text: '> WELCOME TO THE GRID_', type: 'done' }
];

/* =============================================================
   СОСТОЯНИЕ
   ============================================================= */
let prefersReduced = false;
let bootSkipped = false;

/* =============================================================
   ПУБЛИЧНЫЙ МЕТОД
   ============================================================= */
export function initUI() {
    console.log('[ui] init() called');

    prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Каждый блок — независимо
    safeRun('boot', initBoot);
    safeRun('mobile-menu', initMobileMenu);
    safeRun('palette', initPalette);
    safeRun('email-copy', initEmailCopy);
    safeRun('scroll-progress', initScrollProgress);
    safeRun('active-nav', initActiveNav);
    safeRun('glitch-bars', initGlitchBars);
    safeRun('smooth-scroll', initSmoothScroll);
    safeRun('marquee', initMarquee);

    // Экспорт toast
    window.showToast = showToast;

    console.log('[ui] READY');
    window.dispatchEvent(new CustomEvent('ui:ready'));
}

function safeRun(name, fn) {
    try {
        fn();
    } catch (err) {
        console.error(`[ui] ${name} failed:`, err);
    }
}

/* =============================================================
   0. MARQUEE — JS-клонирование контента
   Логика:
   1) Считаем ширину ОДНОЙ копии трека
   2) Считаем сколько копий нужно, чтобы покрыть 2.2× ширины экрана
   3) Дублируем копии внутри трека
   4) translateX(-50%) даёт бесшовный цикл
   ============================================================= */
function initMarquee() {
    const marquees = document.querySelectorAll('[data-marquee]');
    if (!marquees.length) {
        console.log('[ui.marquee] no [data-marquee] found');
        return;
    }

    marquees.forEach(marquee => {
        buildMarquee(marquee);
    });

    console.log('[ui.marquee] initialized', marquees.length);

    // Пересборка при изменении размера (debounced)
    let resizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            marquees.forEach(buildMarquee);
        }, 250);
    }, { passive: true });
}

function buildMarquee(marquee) {
    const track = marquee.querySelector('[data-marquee-track]');
    if (!track) {
        console.warn('[ui.marquee] track not found');
        return;
    }

    // Если уже инициализирован — вернём исходный вид
    if (track.dataset.marqueeBuilt === '1') {
        const original = track.dataset.marqueeOriginal;
        if (original) {
            track.innerHTML = original;
        }
    } else {
        // Сохраняем оригинальное содержимое
        track.dataset.marqueeOriginal = track.innerHTML;
    }

    // Замеряем ширину одной копии
    // (на время отключаем анимацию, чтобы избежать проблем с замером)
    const prevAnimation = track.style.animation;
    track.style.animation = 'none';

    // Ширина одной копии
    const singleWidth = track.scrollWidth;
    const viewportWidth = window.innerWidth;

    // Сколько копий нужно
    const targetWidth = viewportWidth * CONFIG.marquee.targetMultiplier;
    let copies = Math.ceil(targetWidth / Math.max(singleWidth, 1));
    copies = Math.max(CONFIG.marquee.minCopies, Math.min(copies, CONFIG.marquee.maxCopies));

    // Дублируем содержимое
    const originalHTML = track.innerHTML;
    let newHTML = '';
    for (let i = 0; i < copies; i++) {
        newHTML += originalHTML;
    }
    track.innerHTML = newHTML;

    // Возвращаем анимацию
    track.style.animation = prevAnimation || '';

    // Отмечаем как собранный
    track.dataset.marqueeBuilt = '1';

    console.log(`[ui.marquee] built: ${copies} copies, width ${singleWidth}px × ${copies} = ${singleWidth * copies}px (target ${targetWidth}px)`);
}

/* =============================================================
   1. BOOT-ЭКРАН
   ============================================================= */
function initBoot() {
    const bootEl = document.getElementById('boot');
    const logEl = document.getElementById('bootLog');
    const barEl = document.getElementById('bootBar');

    if (!bootEl) {
        console.log('[ui.boot] #boot not found');
        return;
    }

    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const visited = sessionStorage.getItem('av-boot-shown');

    if (prefersReduced || isMobile || visited === '1') {
        console.log('[ui.boot] skipped');
        return;
    }

    console.log('[ui.boot] showing');

    bootEl.classList.add('is-active');
    document.body.classList.add('boot-active');

    function handleSkip(e) {
        if (e.code === 'Space' || e.key === ' ' || e.key === 'Escape') {
            e.preventDefault();
            if (bootSkipped) return;
            bootSkipped = true;
            finishBoot();
        }
    }
    document.addEventListener('keydown', handleSkip);

    let barProgress = 0;
    const barTimer = setInterval(() => {
        if (bootSkipped) {
            clearInterval(barTimer);
            return;
        }
        barProgress += Math.random() * 12 + 3;
        if (barProgress >= 100) {
            barProgress = 100;
            clearInterval(barTimer);
        }
        if (barEl) barEl.style.width = barProgress + '%';
    }, CONFIG.boot.barInterval);

    let lineIndex = 0;

    function typeLine() {
        if (bootSkipped) return;

        if (lineIndex >= BOOT_LINES.length) {
            setTimeout(() => {
                if (barEl) barEl.style.width = '100%';
                setTimeout(finishBoot, 400);
            }, CONFIG.boot.holdAfter);
            return;
        }

        const line = BOOT_LINES[lineIndex];
        const lineEl = document.createElement('span');
        lineEl.className = 'boot-line';
        if (line.type) lineEl.classList.add('boot-line--' + line.type);
        logEl.appendChild(lineEl);

        let charIndex = 0;
        const text = line.text;

        function typeChar() {
            if (bootSkipped) return;

            if (charIndex >= text.length) {
                lineIndex++;
                setTimeout(typeLine, CONFIG.boot.lineDelay);
                return;
            }

            lineEl.textContent += text[charIndex];
            charIndex++;
            setTimeout(typeChar, CONFIG.boot.charDelay);
        }

        typeChar();
    }

    setTimeout(typeLine, 200);

    function finishBoot() {
        bootSkipped = true;
        document.removeEventListener('keydown', handleSkip);
        clearInterval(barTimer);

        bootEl.classList.remove('is-active');
        bootEl.classList.add('is-hidden');
        document.body.classList.remove('boot-active');

        try {
            sessionStorage.setItem('av-boot-shown', '1');
        } catch (e) { /* ignore */ }

        setTimeout(() => {
            if (bootEl.parentNode) bootEl.parentNode.removeChild(bootEl);
        }, 800);
    }
}

/* =============================================================
   2. МОБИЛЬНОЕ МЕНЮ
   ============================================================= */
function initMobileMenu() {
    const burger = document.querySelector('.nav__burger');
    const menu = document.getElementById('menu');
    if (!burger || !menu) return;

    console.log('[ui.menu] attached');

    function open() {
        burger.setAttribute('aria-expanded', 'true');
        menu.classList.add('is-open');
        menu.setAttribute('aria-hidden', 'false');
        document.body.classList.add('menu-open');
    }

    function close() {
        burger.setAttribute('aria-expanded', 'false');
        menu.classList.remove('is-open');
        menu.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('menu-open');
    }

    burger.addEventListener('click', () => {
        if (menu.classList.contains('is-open')) close();
        else open();
    });

    menu.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', close);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && menu.classList.contains('is-open')) {
            close();
            burger.focus();
        }
    });
}

/* =============================================================
   3. ПАЛИТРА
   ============================================================= */
function initPalette() {
    const btn = document.getElementById('paletteBtn');
    if (!btn) {
        console.log('[ui.palette] #paletteBtn not found');
        return;
    }

    console.log('[ui.palette] attached');

    let current = 'cyan';
    try {
        const saved = localStorage.getItem(CONFIG.paletteStorageKey);
        if (saved && CONFIG.palettes.includes(saved)) current = saved;
    } catch (e) { /* ignore */ }

    document.documentElement.setAttribute('data-palette', current);
    console.log('[ui.palette] initial:', current);

    btn.addEventListener('click', () => {
        const idx = CONFIG.palettes.indexOf(current);
        current = CONFIG.palettes[(idx + 1) % CONFIG.palettes.length];
        document.documentElement.setAttribute('data-palette', current);

        try {
            localStorage.setItem(CONFIG.paletteStorageKey, current);
        } catch (e) { /* ignore */ }

        const names = {
            cyan: 'CYAN',
            magenta: 'MAGENTA',
            lime: 'LIME',
            violet: 'VIOLET'
        };

        console.log('[ui.palette] switched to:', current);
        showToast('PALETTE: ' + names[current]);

        if (navigator.vibrate) navigator.vibrate(15);

        btn.animate([
            { transform: 'scale(1) rotate(0deg)' },
            { transform: 'scale(1.15) rotate(180deg)' },
            { transform: 'scale(1) rotate(360deg)' }
        ], {
            duration: 500,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
        });
    });
}

/* =============================================================
   4. EMAIL COPY
   ============================================================= */
function initEmailCopy() {
    const btn = document.querySelector('[data-copy-email]');
    if (!btn) return;

    console.log('[ui.email] attached');

    btn.addEventListener('click', async () => {
        const email = btn.dataset.copyEmail;
        if (!email) return;

        let success = false;

        if (navigator.clipboard && navigator.clipboard.writeText) {
            try {
                await navigator.clipboard.writeText(email);
                success = true;
            } catch (e) {
                console.warn('[ui.email] Clipboard failed:', e);
            }
        }

        if (!success) {
            try {
                const ta = document.createElement('textarea');
                ta.value = email;
                ta.setAttribute('readonly', '');
                ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none;';
                document.body.appendChild(ta);
                ta.select();
                ta.setSelectionRange(0, email.length);
                success = document.execCommand('copy');
                document.body.removeChild(ta);
            } catch (e) {
                console.warn('[ui.email] execCommand failed:', e);
                success = false;
            }
        }

        if (success) {
            showToast(t('toast.copied') + ' · ' + email);
            if (navigator.vibrate) navigator.vibrate(20);
        } else {
            showToast(t('toast.copy_failed') + ' · ' + email);
        }
    });
}

/* =============================================================
   5. SCROLL PROGRESS
   ============================================================= */
function initScrollProgress() {
    const fill = document.getElementById('scrollProgress');
    if (!fill) return;

    let ticking = false;

    function update() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        fill.style.width = Math.min(progress, 100) + '%';
        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
    }, { passive: true });

    window.addEventListener('resize', update, { passive: true });

    update();
    console.log('[ui.progress] attached');
}

/* =============================================================
   6. ACTIVE NAV — по центру viewport
   ============================================================= */
function initActiveNav() {
    const nav = document.getElementById('nav');
    const links = document.querySelectorAll('.nav__link');
    const sections = document.querySelectorAll('section[id]');

    if (!nav || !sections.length) return;

    console.log('[ui.nav] attached, sections:', sections.length);

    let ticking = false;

    function update() {
        nav.classList.toggle('scrolled', window.pageYOffset > 40);

        const scrollTop = window.pageYOffset;
        const docHeight = document.documentElement.scrollHeight;
        const winHeight = window.innerHeight;
        const scrollBottom = scrollTop + winHeight;
        const isAtBottom = scrollBottom >= docHeight - 80;

        let currentId = sections[0].id;

        if (isAtBottom) {
            currentId = sections[sections.length - 1].id;
        } else {
            // Ищем секцию, которая содержит точку (scrollTop + winHeight/2)
            const probePoint = scrollTop + winHeight * 0.45;

            sections.forEach(sec => {
                const secTop = sec.offsetTop;
                const secBottom = secTop + sec.offsetHeight;
                if (probePoint >= secTop && probePoint < secBottom) {
                    currentId = sec.id;
                }
            });
        }

        links.forEach(link => {
            const href = link.getAttribute('href');
            link.classList.toggle('is-active', href === '#' + currentId);
        });

        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
    }, { passive: true });

    window.addEventListener('resize', update, { passive: true });

    update();
}

/* =============================================================
   7. GLITCH-ПОЛОСЫ
   ============================================================= */
function initGlitchBars() {
    if (prefersReduced) return;

    const layer = document.getElementById('glitchLayer');
    if (!layer) return;

    console.log('[ui.glitch] attached');

    function spawnBar() {
        const bar = document.createElement('div');
        bar.className = 'glitch-layer__bar';
        bar.style.top = Math.random() * 100 + '%';
        const color = Math.random() > 0.5 ? 'var(--neon-cyan)' : 'var(--neon-magenta)';
        bar.style.background = color;
        bar.style.boxShadow = `0 0 12px ${color}, 0 0 24px ${color}`;
        bar.style.height = (Math.random() * 2 + 1) + 'px';

        layer.appendChild(bar);

        requestAnimationFrame(() => {
            bar.classList.add('is-active');
        });

        setTimeout(() => {
            if (bar.parentNode) bar.parentNode.removeChild(bar);
        }, CONFIG.glitchBars.duration + 100);
    }

    function scheduleNext() {
        const delay = rand(CONFIG.glitchBars.minInterval, CONFIG.glitchBars.maxInterval);

        setTimeout(() => {
            const count = Math.floor(Math.random() * CONFIG.glitchBars.maxBars) + 1;
            for (let i = 0; i < count; i++) {
                setTimeout(spawnBar, i * 80);
            }
            scheduleNext();
        }, delay);
    }

    scheduleNext();
}

/* =============================================================
   8. SMOOTH SCROLL
   ============================================================= */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', (e) => {
            const href = a.getAttribute('href');
            if (href === '#' || href.length < 2) return;

            const target = document.querySelector(href);
            if (!target) return;

            e.preventDefault();

            const nav = document.getElementById('nav');
            const offset = nav ? nav.offsetHeight + 12 : 80;
            const top = target.getBoundingClientRect().top + window.pageYOffset - offset;

            window.scrollTo({
                top,
                behavior: prefersReduced ? 'auto' : 'smooth'
            });

            if (history.pushState) {
                history.pushState(null, '', href);
            }
        });
    });

    console.log('[ui.smooth-scroll] attached');
}

/* =============================================================
   9. TOAST
   ============================================================= */
let toastTimer = null;

function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add('is-shown');

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove('is-shown');
    }, 3200);
}

/* =============================================================
   ВСПОМОГАТЕЛЬНОЕ
   ============================================================= */
function rand(min, max) {
    return min + Math.random() * (max - min);
}