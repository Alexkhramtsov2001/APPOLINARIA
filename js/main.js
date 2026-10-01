/* =============================================================
   main.js — точка входа
   Appolinaria Vorobyeva // Graphic & Motion
   VERSION 2 — независимая загрузка модулей
   ============================================================= */

import {
    restoreLang,
    applyTranslations,
    toggleLang,
    getLang
} from './i18n.js';

console.log('[main] bootstrap started');

/* =============================================================
   НАСТРОЙКИ МОДУЛЕЙ
   Каждый можно выключить для отладки
   ============================================================= */
const MODULES = {
    canvasBg:   true,
    cursor:     true,
    animations: true,
    ui:         true
};

/* =============================================================
   БЕЗОПАСНАЯ ЗАГРУЗКА МОДУЛЯ
   Возвращает Promise, который резолвится даже при ошибке.
   Один упавший модуль НЕ ломает остальные.
   ============================================================= */
async function loadModule(name, loader) {
    try {
        console.log(`[main] loading ${name}...`);
        const mod = await loader();
        console.log(`[main] ${name} loaded`);
        return mod;
    } catch (err) {
        console.error(`[main] ${name} FAILED:`, err);
        return null;
    }
}

/* =============================================================
   ИНИЦИАЛИЗАЦИЯ
   ============================================================= */
async function init() {
    console.log('[main] init() called');

    // 1. Язык — сначала, чтобы весь текст был переведён
    try {
        restoreLang();
        applyTranslations();
        console.log('[main] i18n applied');
    } catch (err) {
        console.error('[main] i18n failed:', err);
    }

    // 2. Кнопки языка — сразу, независимо от модулей
    // (это критичный UI, должен работать всегда)
    initLangButtons();

    // 3. Кнопки палитры — на случай, если ui.js не загрузится
    // (мы вызываем initPalette внутри ui.js, но подстрахуемся)
    // — НЕТ, сделаем это ВНУТРИ ui.js, здесь не дублируем.

    // 4. Загружаем модули НЕЗАВИСИМО
    //    Даже если 3 из 4 упадут — 4-й загрузится.

    if (MODULES.canvasBg) {
        const mod = await loadModule('canvas-bg', () => import('./canvas-bg.js'));
        if (mod && typeof mod.initCanvasBg === 'function') {
            try { mod.initCanvasBg(); }
            catch (err) { console.error('[main] canvasBg init failed:', err); }
        }
    }

    if (MODULES.cursor) {
        const mod = await loadModule('cursor', () => import('./cursor.js'));
        if (mod && typeof mod.initCursor === 'function') {
            try { mod.initCursor(); }
            catch (err) { console.error('[main] cursor init failed:', err); }
        }
    }

    if (MODULES.animations) {
        const mod = await loadModule('animations', () => import('./animations.js'));
        if (mod && typeof mod.initAnimations === 'function') {
            try { mod.initAnimations(); }
            catch (err) { console.error('[main] animations init failed:', err); }
        }
    }

    if (MODULES.ui) {
        const mod = await loadModule('ui', () => import('./ui.js'));
        if (mod && typeof mod.initUI === 'function') {
            try { mod.initUI(); }
            catch (err) { console.error('[main] ui init failed:', err); }
        }
    }

    // 5. js-ready — включаем reveal-анимации
    document.documentElement.classList.add('js-ready');
    console.log('[main] js-ready applied');

    // 6. Готово
    window.dispatchEvent(new CustomEvent('portfolio:ready'));

    // 7. Баннер
    console.log(
        '%c◆ APOLLINARIA VOROBYEVA',
        'color:#00f0ff;font-weight:800;font-size:14px;letter-spacing:2px;text-shadow:0 0 8px #00f0ff',
        '\n%cPORTFOLIO v2.0.25 — ready',
        'color:#9090a8;font-size:11px'
    );
}

/* =============================================================
   КНОПКИ ЯЗЫКА
   ============================================================= */
function initLangButtons() {
    const buttons = document.querySelectorAll('.nav__lang, .menu__lang');
    console.log('[main] lang buttons found:', buttons.length);

    if (!buttons.length) return;

    buttons.forEach(btn => {
        // Убираем старые обработчики (на случай повторного init)
        btn.removeEventListener('click', handleLangSwitch);
        btn.addEventListener('click', handleLangSwitch);
    });
}

function handleLangSwitch() {
    console.log('[main] lang switch triggered');

    // Глитч-эффект на body
    document.body.classList.add('is-switching');

    setTimeout(() => {
        try {
            toggleLang();
            applyTranslations();

            window.dispatchEvent(new CustomEvent('portfolio:langchange', {
                detail: { lang: getLang() }
            }));
        } catch (err) {
            console.error('[main] lang switch failed:', err);
        }
    }, 150);

    setTimeout(() => {
        document.body.classList.remove('is-switching');
    }, 350);
}

/* =============================================================
   ЗАПУСК
   ============================================================= */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}