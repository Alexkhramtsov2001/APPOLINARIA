/* =============================================================
   animations.js — typewriter, glitch, counters, reveal, parallax
   Appolinaria Vorobyeva // Graphic & Motion
   ============================================================= */

import { getLang, translations } from './i18n.js';

/* =============================================================
   КОНФИГ
   ============================================================= */
const CONFIG = {
    typewriter: {
        charDelay: 55,          // мс между буквами
        startDelay: 300         // задержка перед началом
    },
    glitchRandom: {
        minInterval: 8000,      // мс — минимум между случайными глитчами
        maxInterval: 18000,     // мс — максимум
        duration: 320           // длительность одного глитча
    },
    counters: {
        duration: 1800          // мс
    },
    reveal: {
        threshold: 0.08,
        rootMargin: '0px 0px -8% 0px',
        stagger: 80             // мс между элементами в одной группе
    },
    parallax: {
        strength: 0.15          // смещение орбов относительно скролла
    }
};

/* =============================================================
   СОСТОЯНИЕ
   ============================================================= */
let prefersReduced = false;

/* =============================================================
   ПУБЛИЧНЫЙ МЕТОД
   ============================================================= */
export function initAnimations() {
    prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1. Глитч: подготовка data-text для ::before/::after
    prepareGlitchText();

    // 2. Typewriter в hero
    initTypewriter();

    // 3. Reveal по скроллу
    initReveal();

    // 4. Счётчики
    initCounters();

    // 5. Случайные глитчи на заголовках
    initRandomGlitches();

    // 6. Parallax орбов
    initOrbsParallax();

    // 7. Spotlight за курсором в hero
    initHeroSpotlight();

    // 8. Слежение за сменой языка
    window.addEventListener('portfolio:langchange', () => {
        prepareGlitchText();
        // Перезапустить typewriter не будем — уже поздно
    });

    window.dispatchEvent(new CustomEvent('animations:ready'));
}

/* =============================================================
   1. ПОДГОТОВКА ГЛИТЧА
   Копируем текст в data-text, чтобы CSS ::before/::after могли
   отрисовать RGB-двойников
   ============================================================= */
function prepareGlitchText() {
    document.querySelectorAll('[data-glitch]').forEach(el => {
        // Если у элемента есть вложенные children (например, span), берём текст из первого
        const source = el.querySelector('span') || el;
        const text = source.textContent.trim();
        el.setAttribute('data-text', text);
    });
}

/* =============================================================
   2. TYPEWRITER
   Печатает hero.name посимвольно
   ============================================================= */
function initTypewriter() {
    const el = document.querySelector('[data-typewriter]');
    if (!el) return;

    if (prefersReduced) {
        // При reduce-motion — просто ставим финальный текст
        el.classList.add('typewriter-done');
        return;
    }

    // Сохраняем оригинал (в текущем языке)
    const originalText = el.textContent.trim();
    el.textContent = '';
    el.dataset.originalText = originalText;

    // Разбиваем на слова и буквы, но печатаем посимвольно с сохранением пробелов
    const chars = [...originalText];

    let i = 0;
    let timer = null;

    function typeNext() {
        if (i >= chars.length) {
            el.classList.add('typewriter-done');
            return;
        }

        const char = chars[i];

        // Обработка пробела — не создаём span, просто пишем
        if (char === ' ') {
            el.appendChild(document.createTextNode(' '));
        } else {
            const span = document.createElement('span');
            span.textContent = char;
            span.style.display = 'inline-block';
            span.style.opacity = '0';
            span.style.transform = 'translateY(0.4em)';
            span.style.transition = 'opacity 0.25s ease-out, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
            el.appendChild(span);

            // Триггерим появление на следующем кадре
            requestAnimationFrame(() => {
                span.style.opacity = '1';
                span.style.transform = 'translateY(0)';
            });
        }

        i++;
        timer = setTimeout(typeNext, CONFIG.typewriter.charDelay);
    }

    // Старт с задержкой
    setTimeout(typeNext, CONFIG.typewriter.startDelay);

    // Если язык меняется — просто даём финальный текст
    window.addEventListener('portfolio:langchange', () => {
        if (timer) clearTimeout(timer);
        const key = el.dataset.i18n;
        el.textContent = translations[getLang()][key] || '';
        el.classList.add('typewriter-done');
    }, { once: true });
}

/* =============================================================
   3. REVEAL ПО СКРОЛЛУ
   ============================================================= */
function initReveal() {
    const elements = document.querySelectorAll('[data-reveal]');
    if (!elements.length) return;

    // Fallback: показать всё, если нет IO или reduce-motion
    if (prefersReduced || !('IntersectionObserver' in window)) {
        elements.forEach(el => el.classList.add('is-visible'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        // Сортируем по вертикальной позиции — так стаггер будет визуально приятным
        const visible = entries
            .filter(e => e.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        visible.forEach((entry, index) => {
            const el = entry.target;
            const delay = index * CONFIG.reveal.stagger;

            setTimeout(() => {
                el.classList.add('is-visible');
            }, delay);

            observer.unobserve(el);
        });
    }, {
        threshold: CONFIG.reveal.threshold,
        rootMargin: CONFIG.reveal.rootMargin
    });

    elements.forEach(el => observer.observe(el));

    // Safety-net: через 2.5 сек показать всё, что в зоне видимости,
    // но не получило класс (на случай глюка observer)
    setTimeout(() => {
        elements.forEach(el => {
            if (el.classList.contains('is-visible')) return;
            const rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                el.classList.add('is-visible');
            }
        });
    }, 2500);
}

/* =============================================================
   4. СЧЁТЧИКИ
   ============================================================= */
function initCounters() {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    if (prefersReduced || !('IntersectionObserver' in window)) {
        counters.forEach(c => {
            c.textContent = c.dataset.count + (c.dataset.suffix || '');
        });
        return;
    }

    const animate = (el) => {
        const target = parseInt(el.dataset.count, 10);
        const suffix = el.dataset.suffix || '';
        const duration = CONFIG.counters.duration;
        const start = performance.now();

        function tick(now) {
            const t = Math.min((now - start) / duration, 1);
            // easeOutCubic
            const eased = 1 - Math.pow(1 - t, 3);
            const value = Math.round(eased * target);
            el.textContent = value + suffix;

            if (t < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animate(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(c => observer.observe(c));
}

/* =============================================================
   5. СЛУЧАЙНЫЕ ГЛИТЧИ
   Раз в 8-18 сек случайный [data-glitch] "сбоит" на 300мс
   ============================================================= */
function initRandomGlitches() {
    if (prefersReduced) return;

    const glitchEls = document.querySelectorAll('[data-glitch]');
    if (!glitchEls.length) return;

    // Раз в N сек выбираем случайный элемент и триггерим .is-glitching
    function scheduleNext() {
        const delay = rand(
            CONFIG.glitchRandom.minInterval,
            CONFIG.glitchRandom.maxInterval
        );

        setTimeout(() => {
            const el = glitchEls[Math.floor(Math.random() * glitchEls.length)];
            triggerGlitch(el);
            scheduleNext();
        }, delay);
    }

    // Первый глитч — через 5 секунд
    setTimeout(() => {
        const el = glitchEls[Math.floor(Math.random() * glitchEls.length)];
        triggerGlitch(el);
        scheduleNext();
    }, 5000);
}

function triggerGlitch(el) {
    if (!el || el.classList.contains('is-glitching')) return;

    el.classList.add('is-glitching');
    setTimeout(() => {
        el.classList.remove('is-glitching');
    }, CONFIG.glitchRandom.duration);
}

/* =============================================================
   6. PARALLAX ОРБОВ
   Лёгкое смещение при скролле
   ============================================================= */
function initOrbsParallax() {
    if (prefersReduced) return;

    const orbs = document.querySelectorAll('.orb');
    if (!orbs.length) return;

    let ticking = false;

    function update() {
        const scrolled = window.pageYOffset;
        orbs.forEach((orb, i) => {
            const factor = (i + 1) * CONFIG.parallax.strength;
            const offset = scrolled * factor;
            // Применяем к translateY, сохраняя исходные CSS-анимации через calc?
            // Проще — не трогаем keyframes, а двигаем через transform-origin
            // (иначе конфликт с orb-1/orb-2 keyframes)
            orb.style.setProperty('--parallax-y', `${offset}px`);
        });
        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
    }, { passive: true });
}

/* =============================================================
   7. SPOTLIGHT В HERO
   Радиальное пятно света следует за курсором
   ============================================================= */
function initHeroSpotlight() {
    if (prefersReduced) return;

    const spotlight = document.getElementById('heroSpotlight');
    const hero = document.querySelector('.hero');
    if (!spotlight || !hero) return;

    // На тач-устройствах отключаем
    if (!window.matchMedia('(hover: hover)').matches) {
        spotlight.style.display = 'none';
        return;
    }

    let ticking = false;

    hero.addEventListener('mousemove', (e) => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            const rect = hero.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            spotlight.style.setProperty('--mx', x + '%');
            spotlight.style.setProperty('--my', y + '%');
            ticking = false;
        });
    }, { passive: true });
}

/* =============================================================
   ВСПОМОГАТЕЛЬНОЕ
   ============================================================= */
function rand(min, max) {
    return min + Math.random() * (max - min);
}