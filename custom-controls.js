// ==UserScript==
// @name         Controles Netflix Desktop Premium
// @namespace    http://tampermonkey.net/
// @version      4.2
// @description  Recria os controles desktop da Netflix com seek, volume, atalhos, tela cheia e sincronizacao com os controles nativos.
// @author       Antigravity
// @match        *://*.netflix.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const APP_ID = 'nf-desktop-player';
    const STYLE_ID = 'nf-desktop-player-style';
    const HIDE_DELAY = 3200;
    const SEEK_STEP = 10;
    const VOLUME_STEP = 0.05;

    let app = null;
    let domObserver = null;
    let routeTimer = null;
    let lastUrl = location.href;

    const Icons = {
        back: icon('M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.42-1.41L7.83 13H20v-2z', 32),
        play: icon('M8 5v14l11-7z', 34),
        pause: icon('M6 19h4V5H6v14zm8-14v14h4V5h-4z', 34),
        replay10: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/><text x="12" y="16" text-anchor="middle" font-size="5.5" font-weight="700">10</text></svg>`,
        forward10: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/><text x="12" y="16" text-anchor="middle" font-size="5.5" font-weight="700">10</text></svg>`,
        volumeHigh: icon('M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z'),
        volumeLow: icon('M3 9v6h4l5 5V4L7 9H3zm11 1.06v3.88c.59-.35 1-.99 1-1.94s-.41-1.59-1-1.94z'),
        volumeOff: icon('M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z'),
        next: icon('M6 18l8.5-6L6 6v12zm10-12h2v12h-2V6z'),
        episodes: icon('M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12zM10 7h8v2h-8V7zm0 3h8v2h-8v-2zm0 3h5v2h-5v-2z'),
        subtitles: icon('M21 4H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM9 11H4V9h5v2zm7 0h-5V9h5v2zm4 4H4v-2h16v2z'),
        subtitlesOff: `<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M21 4H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H3V6h18v12zM9 11H4V9h5v2zm7 0h-5V9h5v2zm4 4H4v-2h16v2z"/><path d="M2 22L22 2" stroke="currentColor" stroke-width="2" fill="none"/></svg>`,
        speed: icon('M12 3a9 9 0 0 0-9 9h2a7 7 0 1 1 11.95 4.95l1.41 1.41A9 9 0 0 0 12 3zm.5 4H11v6l5.25 3.15.75-1.23-4.5-2.67V7z'),
        pip: icon('M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z'),
        fullscreenEnter: icon('M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z'),
        fullscreenExit: icon('M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z')
    };

    const NATIVE_CONTROLS = {
        back: {
            selector: '[data-uia="player-back-button"], [data-uia="control-back-to-browse"], [data-uia="back-to-browse"], .button-nfplayerBack, .watch-video--back-button, [aria-label*="Voltar"], [aria-label*="Back"]',
            labels: ['voltar', 'voltar para navegar', 'voltar para detalhes', 'back', 'back to browse', 'back to details']
        },
        next: {
            selector: '[data-uia="next-episode-seamless-button"], [data-uia="next-episode-button"], [data-uia="player-next-episode"], [data-uia="control-next-episode"], .button-nfplayerNextEpisode',
            labels: ['proximo episodio', 'próximo episódio', 'next episode']
        },
        episodes: {
            selector: '[data-uia="episodes-selector"], [data-uia="control-episodes"], [data-uia="episodes-button"], [data-uia="episode-selector"], [data-uia="episode-selector-button"], [data-uia="control-episodes-and-info"], .button-nfplayerEpisodes, .nfplayerEpisodes, [aria-label*="Episodes"], [aria-label*="Episódios"], [aria-label*="Episodios"], [aria-label*="Epis"]',
            labels: ['episodes', 'episodes and info', 'episodes & info', 'episodios', 'episódios', 'episodios e informacoes', 'episódios e informações', 'mais episodios', 'mais episódios', 'more episodes']
        },
        audio: {
            selector: '[data-uia="control-audio-subtitles"], [data-uia="audio-subtitle-controls"], [aria-label*="Audio"], [aria-label*="Áudio"], [aria-label*="Legendas"], [aria-label*="Subtitles"]',
            labels: ['audio', 'áudio', 'legendas', 'subtitles', 'audio e legendas', 'áudio e legendas']
        },
        fullscreen: {
            selector: '[data-uia="control-fullscreen"], [aria-label*="Tela cheia"], [aria-label*="Full screen"], [aria-label*="Fullscreen"]',
            labels: ['tela cheia', 'sair da tela cheia', 'fullscreen', 'full screen']
        }
    };

    function icon(path, size = 28) {
        return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><path d="${path}"/></svg>`;
    }

    function loadDependencies(callback) {
        injectStyle();

        if (window.gsap) {
            callback();
            return;
        }

        const existing = document.querySelector('script[data-nf-desktop-player-gsap="true"]');
        if (existing) {
            existing.addEventListener('load', callback, { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js';
        script.dataset.nfDesktopPlayerGsap = 'true';
        script.onload = callback;
        script.onerror = callback;
        appendToHead(script);
    }

    function appendToHead(node) {
        const head = document.head || document.documentElement;
        if (head) {
            head.appendChild(node);
            return;
        }
        setTimeout(() => appendToHead(node), 25);
    }

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            #${APP_ID}, #${APP_ID} * { box-sizing: border-box; }
            #${APP_ID} { position: fixed; inset: 0; z-index: 2147483647; color: #fff; font-family: Netflix Sans, Helvetica Neue, Segoe UI, Arial, sans-serif; pointer-events: none; }
            #${APP_ID}.is-hidden { cursor: none; }
            #${APP_ID} button { color: #fff; fill: currentColor; background: transparent; border: 0; padding: 0; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; opacity: .95; transition: opacity .18s ease, transform .18s ease; }
            #${APP_ID} button:hover { opacity: 1; transform: scale(1.13); }
            #${APP_ID} button:active { transform: scale(.94); }
            #${APP_ID} button.is-unavailable { opacity: .32; pointer-events: none; }
            #${APP_ID} button.is-native-linked { color: #fff; }
            #${APP_ID} button:focus-visible, #${APP_ID} input:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }
            .nf-layer { position: absolute; inset: 0; pointer-events: none; opacity: 1; transition: opacity .25s ease; }
            .nf-layer.is-off { opacity: 0; }
            .nf-top { position: absolute; top: 0; left: 0; right: 0; padding: 22px 42px 80px; background: linear-gradient(to bottom, rgba(0,0,0,.72), rgba(0,0,0,.35) 55%, transparent); display: flex; align-items: center; gap: 22px; pointer-events: auto; }
            .nf-back { width: 44px; height: 44px; }
            .nf-heading { min-width: 0; text-shadow: 0 2px 8px rgba(0,0,0,.75); }
            .nf-eyebrow { color: rgba(255,255,255,.72); font-size: 13px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
            .nf-title { margin-top: 3px; max-width: min(720px, 70vw); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 22px; font-weight: 700; }
            .nf-bottom { position: absolute; left: 0; right: 0; bottom: 0; padding: 88px 48px 26px; background: linear-gradient(to top, rgba(0,0,0,.88), rgba(0,0,0,.54) 54%, transparent); pointer-events: auto; }
            .nf-progress { position: relative; height: 22px; display: flex; align-items: center; cursor: pointer; }
            .nf-track { position: relative; width: 100%; height: 4px; border-radius: 999px; background: rgba(255,255,255,.28); transition: height .16s ease; }
            .nf-progress:hover .nf-track, .nf-progress.is-seeking .nf-track { height: 7px; }
            .nf-buffer, .nf-fill { position: absolute; inset: 0 auto 0 0; width: 0%; border-radius: inherit; pointer-events: none; }
            .nf-buffer { background: rgba(255,255,255,.46); }
            .nf-fill { background: #e50914; }
            .nf-thumb { position: absolute; left: 0%; top: 50%; width: 15px; height: 15px; border-radius: 50%; background: #e50914; box-shadow: 0 1px 10px rgba(0,0,0,.65); transform: translate(-50%, -50%) scale(0); transition: transform .16s ease; pointer-events: none; }
            .nf-progress:hover .nf-thumb, .nf-progress.is-seeking .nf-thumb { transform: translate(-50%, -50%) scale(1); }
            .nf-time-bubble { position: absolute; left: 0%; bottom: 24px; min-width: 58px; padding: 5px 8px; border-radius: 4px; transform: translateX(-50%); background: rgba(0,0,0,.88); color: #fff; font-size: 12px; font-weight: 700; text-align: center; opacity: 0; pointer-events: none; }
            .nf-progress:hover .nf-time-bubble, .nf-progress.is-seeking .nf-time-bubble { opacity: 1; }
            .nf-row { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin-top: 9px; }
            .nf-left, .nf-right, .nf-volume { display: flex; align-items: center; gap: 16px; }
            .nf-control { width: 38px; height: 38px; }
            .nf-control svg { width: 28px; height: 28px; fill: currentColor; }
            .nf-play { width: 46px; height: 46px; margin-right: 2px; }
            .nf-play svg { width: 34px; height: 34px; }
            .nf-time { min-width: 118px; color: rgba(255,255,255,.9); font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; }
            .nf-volume { gap: 10px; }
            .nf-slider-wrap { width: 0; opacity: 0; overflow: hidden; transition: width .18s ease, opacity .18s ease; }
            .nf-volume:hover .nf-slider-wrap, .nf-volume:focus-within .nf-slider-wrap { width: 92px; opacity: 1; }
            .nf-volume input { width: 92px; accent-color: #fff; cursor: pointer; }
            .nf-speed-menu { position: absolute; right: 94px; bottom: 78px; display: none; min-width: 126px; padding: 9px; border-radius: 6px; background: rgba(18,18,18,.96); box-shadow: 0 10px 30px rgba(0,0,0,.38); pointer-events: auto; }
            .nf-speed-menu.is-open { display: grid; gap: 3px; }
            .nf-speed-menu button { justify-content: flex-start; width: 100%; padding: 8px 10px; border-radius: 4px; font-size: 13px; font-weight: 700; }
            .nf-speed-menu button:hover, .nf-speed-menu button.is-active { background: rgba(255,255,255,.16); transform: none; }
            .nf-next-prompt { position: absolute; right: 48px; bottom: 118px; display: none; align-items: center; gap: 14px; max-width: 360px; padding: 14px 16px; border-radius: 7px; background: rgba(18,18,18,.94); box-shadow: 0 12px 34px rgba(0,0,0,.42); pointer-events: auto; }
            .nf-next-prompt.is-visible { display: flex; }
            .nf-next-prompt-text { min-width: 0; }
            .nf-next-prompt-label { color: rgba(255,255,255,.72); font-size: 12px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
            .nf-next-prompt-title { margin-top: 2px; color: #fff; font-size: 15px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .nf-next-prompt button { flex: 0 0 auto; gap: 8px; min-height: 34px; padding: 0 13px; border-radius: 4px; background: #fff; color: #111; fill: currentColor; font-size: 13px; font-weight: 800; }
            .nf-next-prompt button:hover { transform: scale(1.04); }
            .nf-toast { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); padding: 14px 20px; border-radius: 8px; background: rgba(0,0,0,.68); font-size: 18px; font-weight: 800; opacity: 0; pointer-events: none; text-shadow: 0 1px 6px rgba(0,0,0,.8); }
            @media (max-width: 760px) { .nf-top { padding: 16px 18px 60px; } .nf-bottom { padding: 70px 18px 18px; } .nf-title { font-size: 17px; max-width: 58vw; } .nf-time { display: none; } .nf-left, .nf-right { gap: 9px; } .nf-control { width: 34px; } .nf-slider-wrap { display: none; } .nf-next-prompt { left: 18px; right: 18px; bottom: 104px; max-width: none; } }
        `;
        appendToHead(style);
    }

    function createPlayer(video) {
        destroyPlayer();

        const root = document.createElement('div');
        root.id = APP_ID;
        root.innerHTML = `
            <div class="nf-layer" data-layer>
                <div class="nf-top">
                    <button class="nf-back" data-action="back" title="Voltar" aria-label="Voltar">${Icons.back}</button>
                    <div class="nf-heading">
                        <div class="nf-eyebrow">Assistindo agora</div>
                        <div class="nf-title" data-title>Netflix</div>
                    </div>
                </div>
                <div class="nf-bottom">
                    <div class="nf-next-prompt" data-next-prompt>
                        <div class="nf-next-prompt-text">
                            <div class="nf-next-prompt-label">A seguir</div>
                            <div class="nf-next-prompt-title" data-next-prompt-title>Próximo episódio</div>
                        </div>
                        <button type="button" data-action="nextPrompt">${Icons.next}<span>Pular</span></button>
                    </div>
                    <div class="nf-progress" data-progress role="slider" tabindex="0" aria-label="Barra de progresso" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
                        <div class="nf-track" data-track>
                            <div class="nf-buffer" data-buffer></div>
                            <div class="nf-fill" data-fill></div>
                            <div class="nf-thumb" data-thumb></div>
                        </div>
                        <div class="nf-time-bubble" data-bubble>0:00</div>
                    </div>
                    <div class="nf-row">
                        <div class="nf-left">
                            <button class="nf-control nf-play" data-action="play" title="Reproduzir/Pausar" aria-label="Reproduzir/Pausar">${Icons.pause}</button>
                            <button class="nf-control" data-action="replay" title="Voltar 10 segundos" aria-label="Voltar 10 segundos">${Icons.replay10}</button>
                            <button class="nf-control" data-action="forward" title="Avancar 10 segundos" aria-label="Avancar 10 segundos">${Icons.forward10}</button>
                            <div class="nf-volume">
                                <button class="nf-control" data-action="mute" title="Volume" aria-label="Volume">${Icons.volumeHigh}</button>
                                <div class="nf-slider-wrap"><input data-volume type="range" min="0" max="1" step="0.01" value="1" aria-label="Volume"></div>
                            </div>
                            <div class="nf-time" data-time>0:00 / 0:00</div>
                        </div>
                        <div class="nf-right">
                            <button class="nf-control" data-action="next" title="Proximo episodio" aria-label="Proximo episodio">${Icons.next}</button>
                            <button class="nf-control" data-action="episodes" title="Episodios" aria-label="Episodios">${Icons.episodes}</button>
                            <button class="nf-control" data-action="audio" title="Audio e legendas" aria-label="Audio e legendas">${Icons.subtitles}</button>
                            <button class="nf-control" data-action="speed" title="Velocidade" aria-label="Velocidade">${Icons.speed}</button>
                            <button class="nf-control" data-action="pip" title="Picture in Picture" aria-label="Picture in Picture">${Icons.pip}</button>
                            <button class="nf-control" data-action="fullscreen" title="Tela cheia" aria-label="Tela cheia">${Icons.fullscreenEnter}</button>
                        </div>
                    </div>
                    <div class="nf-speed-menu" data-speed-menu>
                        <button type="button" data-rate="0.5">0.5x</button>
                        <button type="button" data-rate="0.75">0.75x</button>
                        <button type="button" data-rate="1">Normal</button>
                        <button type="button" data-rate="1.25">1.25x</button>
                        <button type="button" data-rate="1.5">1.5x</button>
                    </div>
                </div>
            </div>
            <div class="nf-toast" data-toast></div>
        `;
        document.body.appendChild(root);

        const state = {
            root,
            video,
            layer: root.querySelector('[data-layer]'),
            progress: root.querySelector('[data-progress]'),
            track: root.querySelector('[data-track]'),
            fill: root.querySelector('[data-fill]'),
            buffer: root.querySelector('[data-buffer]'),
            thumb: root.querySelector('[data-thumb]'),
            bubble: root.querySelector('[data-bubble]'),
            time: root.querySelector('[data-time]'),
            title: root.querySelector('[data-title]'),
            nextPrompt: root.querySelector('[data-next-prompt]'),
            nextPromptTitle: root.querySelector('[data-next-prompt-title]'),
            volume: root.querySelector('[data-volume]'),
            speedMenu: root.querySelector('[data-speed-menu]'),
            toast: root.querySelector('[data-toast]'),
            hideTimer: null,
            nativeSyncTimer: null,
            seeking: false,
            wasPausedBeforeSeek: false,
            handlers: []
        };

        app = state;
        bindPlayer(state);
        state.nativeSyncTimer = setInterval(() => syncNativeControls(state), 1000);
        updateTitle(state);
        updateAll(state);
        showControls(state, true);
    }

    function bindPlayer(state) {
        on(state, document, 'mousemove', () => showControls(state));
        on(state, document, 'mousedown', () => showControls(state));
        on(state, document, 'keydown', (event) => handleKeyboard(state, event), true);
        on(state, document, 'fullscreenchange', () => updateFullscreen(state));

        on(state, state.root, 'click', (event) => {
            const action = event.target.closest('button')?.dataset.action;
            if (!action) return;
            event.preventDefault();
            handleAction(state, action);
        });

        on(state, state.root, 'mousemove', () => showControls(state));
        on(state, state.root, 'mouseenter', () => showControls(state));
        on(state, state.root, 'mouseleave', () => scheduleHide(state));
        on(state, state.video, 'play', () => updatePlay(state));
        on(state, state.video, 'pause', () => updatePlay(state));
        on(state, state.video, 'timeupdate', () => updateProgress(state));
        on(state, state.video, 'durationchange', () => updateProgress(state));
        on(state, state.video, 'progress', () => updateBuffer(state));
        on(state, state.video, 'volumechange', () => updateVolume(state));
        on(state, state.video, 'ratechange', () => updateSpeedMenu(state));

        on(state, state.progress, 'pointerdown', (event) => startSeek(state, event));
        on(state, state.progress, 'pointermove', (event) => hoverSeek(state, event));
        on(state, state.progress, 'keydown', (event) => handleProgressKeyboard(state, event));
        on(state, document, 'pointermove', (event) => moveSeek(state, event));
        on(state, document, 'pointerup', (event) => endSeek(state, event));
        on(state, state.volume, 'input', () => setVolume(state, Number(state.volume.value)));

        state.speedMenu.querySelectorAll('[data-rate]').forEach((button) => {
            on(state, button, 'click', () => setPlaybackRate(state, Number(button.dataset.rate)));
        });
    }

    function on(state, target, type, handler, options) {
        target.addEventListener(type, handler, options);
        state.handlers.push(() => target.removeEventListener(type, handler, options));
    }

    function handleAction(state, action) {
        showControls(state);

        const actions = {
            back: () => goBack(state),
            play: () => togglePlay(state),
            replay: () => seekBy(state, -SEEK_STEP),
            forward: () => seekBy(state, SEEK_STEP),
            mute: () => toggleMute(state),
            next: () => nextEpisode(state),
            nextPrompt: () => nextEpisode(state),
            episodes: () => openEpisodesPanel(state),
            audio: () => toggleSubtitles(state),
            speed: () => toggleSpeedMenu(state),
            pip: () => togglePip(state),
            fullscreen: () => toggleFullscreen(state)
        };

        actions[action]?.();
    }

    function handleKeyboard(state, event) {
        if (!state.root || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
        if (isEditable(event.target)) return;
        if (!isWatchPage()) return;

        const key = event.key.toLowerCase();
        const handled = [' ', 'k', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'm', 'f', 'escape'].includes(key);
        if (!handled) return;

        event.preventDefault();
        showControls(state);

        if (key === ' ' || key === 'k') togglePlay(state);
        if (key === 'arrowleft') seekBy(state, -SEEK_STEP);
        if (key === 'arrowright') seekBy(state, SEEK_STEP);
        if (key === 'arrowup') adjustVolume(state, VOLUME_STEP);
        if (key === 'arrowdown') adjustVolume(state, -VOLUME_STEP);
        if (key === 'm') toggleMute(state);
        if (key === 'f') toggleFullscreen(state);
        if (key === 'escape') hideControls(state);
    }

    function handleProgressKeyboard(state, event) {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        event.stopImmediatePropagation();
        seekBy(state, event.key === 'ArrowLeft' ? -SEEK_STEP : SEEK_STEP);
    }

    function togglePlay(state) {
        if (state.video.paused) {
            state.video.play().catch(() => clickNativeByText(['play', 'reproduzir']));
            showToast(state, 'Play');
        } else {
            state.video.pause();
            showToast(state, 'Pause');
        }
        updatePlay(state);
    }

    function startSeek(state, event) {
        if (!hasDuration(state.video)) return;
        state.seeking = true;
        state.wasPausedBeforeSeek = state.video.paused;
        state.progress.classList.add('is-seeking');
        state.progress.setPointerCapture?.(event.pointerId);
        applySeekPosition(state, event, false);
    }

    function moveSeek(state, event) {
        if (!state.seeking) return;
        applySeekPosition(state, event, false);
    }

    function endSeek(state, event) {
        if (!state.seeking) return;
        applySeekPosition(state, event, true);
        state.seeking = false;
        state.progress.classList.remove('is-seeking');
        state.progress.releasePointerCapture?.(event.pointerId);
    }

    function hoverSeek(state, event) {
        if (!hasDuration(state.video) || state.seeking) return;
        const pct = pointToPct(state, event.clientX);
        state.bubble.style.left = `${pct * 100}%`;
        state.bubble.textContent = formatTime(pct * state.video.duration);
    }

    function applySeekPosition(state, event, commit) {
        const pct = pointToPct(state, event.clientX);
        const seconds = pct * state.video.duration;
        setProgressUi(state, seconds, state.video.duration);
        state.bubble.style.left = `${pct * 100}%`;
        state.bubble.textContent = formatTime(seconds);

        if (!commit) return;

        try {
            state.video.currentTime = seconds;
            if (!state.wasPausedBeforeSeek) state.video.play().catch(() => {});
        } catch (error) {
            dispatchNetflixKey(seconds > state.video.currentTime ? 'ArrowRight' : 'ArrowLeft');
        }
    }

    function seekBy(state, seconds) {
        if (!hasDuration(state.video)) return;
        const next = clamp((Number.isFinite(state.video.currentTime) ? state.video.currentTime : 0) + seconds, 0, state.video.duration);
        try {
            state.video.currentTime = next;
        } catch (error) {
            dispatchNetflixKey(seconds < 0 ? 'ArrowLeft' : 'ArrowRight');
        }
        setProgressUi(state, next, state.video.duration);
        showToast(state, seconds < 0 ? `-${Math.abs(seconds)}s` : `+${seconds}s`);
        setTimeout(() => {
            if (state.video && Math.abs(state.video.currentTime - next) > 0.5) {
                state.video.currentTime = next;
            }
        }, 0);
    }

    function pointToPct(state, clientX) {
        const rect = state.track.getBoundingClientRect();
        if (!rect.width) return 0;
        return clamp((clientX - rect.left) / rect.width, 0, 1);
    }

    function updateAll(state) {
        updatePlay(state);
        updateProgress(state);
        updateBuffer(state);
        updateVolume(state);
        updateFullscreen(state);
        updateSpeedMenu(state);
        syncNativeControls(state);
    }

    function updatePlay(state) {
        const button = state.root.querySelector('[data-action="play"]');
        button.innerHTML = state.video.paused ? Icons.play : Icons.pause;
    }

    function updateProgress(state) {
        if (state.seeking) return;
        const duration = hasDuration(state.video) ? state.video.duration : 0;
        const current = Number.isFinite(state.video.currentTime) ? state.video.currentTime : 0;
        setProgressUi(state, current, duration);
        updateNextPrompt(state, current, duration);
    }

    function setProgressUi(state, current, duration) {
        const pct = duration > 0 ? clamp(current / duration, 0, 1) : 0;
        state.fill.style.width = `${pct * 100}%`;
        state.thumb.style.left = `${pct * 100}%`;
        state.time.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
        state.progress.setAttribute('aria-valuenow', String(Math.round(pct * 100)));
    }

    function updateBuffer(state) {
        if (!hasDuration(state.video) || state.video.buffered.length === 0) {
            state.buffer.style.width = '0%';
            return;
        }

        let end = 0;
        for (let index = 0; index < state.video.buffered.length; index += 1) {
            end = Math.max(end, state.video.buffered.end(index));
        }
        state.buffer.style.width = `${clamp(end / state.video.duration, 0, 1) * 100}%`;
    }

    function updateNextPrompt(state, current, duration) {
        if (!state.nextPrompt || duration <= 0) return;

        const remaining = duration - current;
        const shouldShow = remaining > 0 && remaining <= 60 && current > 30;
        state.nextPrompt.classList.toggle('is-visible', shouldShow);

        if (!shouldShow) return;

        const title = getNextEpisodeTitle() || 'Próximo episódio';
        state.nextPromptTitle.textContent = title;
    }

    function getNextEpisodeTitle() {
        const selectors = [
            '[data-uia="next-episode-title"]',
            '[data-uia="next-episode-seamless-title"]',
            '.WatchNext-title',
            '.next-episode-title'
        ];

        return selectors
            .map((selector) => document.querySelector(selector)?.textContent?.trim())
            .find(Boolean);
    }

    function updateVolume(state) {
        state.volume.value = String(state.video.muted ? 0 : state.video.volume);
        state.root.querySelector('[data-action="mute"]').innerHTML = volumeIcon(state.video);
    }

    function volumeIcon(video) {
        if (video.muted || video.volume === 0) return Icons.volumeOff;
        return video.volume < 0.5 ? Icons.volumeLow : Icons.volumeHigh;
    }

    function setVolume(state, value) {
        const volume = clamp(value, 0, 1);
        state.video.volume = volume;
        state.video.muted = volume === 0;
        showToast(state, `Volume ${Math.round(volume * 100)}%`);
        updateVolume(state);
    }

    function adjustVolume(state, delta) {
        setVolume(state, (state.video.muted ? 0 : state.video.volume) + delta);
    }

    function toggleMute(state) {
        state.video.muted = !state.video.muted;
        if (!state.video.muted && state.video.volume === 0) state.video.volume = 0.5;
        showToast(state, state.video.muted ? 'Mudo' : `Volume ${Math.round(state.video.volume * 100)}%`);
        updateVolume(state);
    }

    let subtitlesHidden = false;

    function toggleSubtitles(state) {
        subtitlesHidden = !subtitlesHidden;
        const timedtext = document.querySelector('.player-timedtext');
        if (timedtext) {
            timedtext.style.display = subtitlesHidden ? 'none' : '';
        }
        const button = state.root.querySelector('[data-action="audio"]');
        if (button) {
            button.innerHTML = subtitlesHidden ? Icons.subtitlesOff : Icons.subtitles;
        }
        showToast(state, subtitlesHidden ? 'Legendas off' : 'Legendas on');
    }

    function toggleSpeedMenu(state) {
        state.speedMenu.classList.toggle('is-open');
        updateSpeedMenu(state);
    }

    function setPlaybackRate(state, rate) {
        state.video.playbackRate = rate;
        state.speedMenu.classList.remove('is-open');
        showToast(state, rate === 1 ? 'Velocidade normal' : `${rate}x`);
        updateSpeedMenu(state);
    }

    function updateSpeedMenu(state) {
        state.speedMenu.querySelectorAll('[data-rate]').forEach((button) => {
            button.classList.toggle('is-active', Number(button.dataset.rate) === state.video.playbackRate);
        });
    }

    function togglePip(state) {
        if (!document.pictureInPictureEnabled || state.video.disablePictureInPicture) {
            showToast(state, 'PiP indisponivel');
            return;
        }

        if (document.pictureInPictureElement) {
            document.exitPictureInPicture().catch(() => {});
            return;
        }

        state.video.requestPictureInPicture().catch(() => showToast(state, 'PiP bloqueado'));
    }

    function toggleFullscreen(state) {
        const native = findNativeControl('fullscreen');
        if (native) {
            dispatchMouseSequence(native);
            setTimeout(() => updateFullscreen(state), 120);
            return;
        }

        const target = document.querySelector('.watch-video, .nf-player-container, #appMountPoint') || document.documentElement;
        if (!document.fullscreenElement) {
            target.requestFullscreen?.().catch(() => document.documentElement.requestFullscreen?.().catch(() => {}));
        } else {
            document.exitFullscreen?.();
        }
    }

    function updateFullscreen(state) {
        const button = state.root.querySelector('[data-action="fullscreen"]');
        button.innerHTML = document.fullscreenElement ? Icons.fullscreenExit : Icons.fullscreenEnter;
    }

    function nextEpisode(state) {
        if (triggerNativeControl('next')) return;

        if (hasDuration(state.video)) {
            state.video.currentTime = Math.max(0, state.video.duration - 2);
            state.video.play().catch(() => {});
        }
    }

    function openEpisodesPanel(state) {
        if (triggerNativeControl('episodes')) return;

        revealNativeControls();
        setTimeout(() => {
            if (!triggerNativeControl('episodes')) {
                showToast(state, 'Episodios indisponiveis');
            }
        }, 180);
    }

    function goBack(state) {
        if (triggerNativeControl('back', { requireVisible: true })) return;

        revealNativeControls();
        setTimeout(() => {
            if (triggerNativeControl('back', { requireVisible: true })) return;
            showToast(state, 'Voltando');
            history.back();
        }, 140);
    }

    function clickNetflixBack() {
        return triggerNativeControl('back', { requireVisible: true });
    }

    function revealNativeControls() {
        const eventInit = {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: Math.round(window.innerWidth / 2),
            clientY: Math.max(0, window.innerHeight - 90)
        };
        const targets = [document, document.querySelector('.watch-video, .nf-player-container, #appMountPoint')].filter(Boolean);

        targets.forEach((target) => {
            ['pointermove', 'mousemove', 'mouseover'].forEach((type) => {
                target.dispatchEvent(new MouseEvent(type, eventInit));
            });
        });
    }

    function triggerNativeControl(name, options = {}) {
        const native = findNativeControl(name, options);
        if (!native) return false;
        dispatchMouseSequence(native);
        setTimeout(() => app && syncNativeControls(app), 120);
        return true;
    }

    function syncNativeControls(state) {
        if (!state?.root) return;

        Object.keys(NATIVE_CONTROLS).forEach((name) => {
            const button = state.root.querySelector(`[data-action="${name}"]`);
            if (!button) return;

            const native = findNativeControl(name, { requireVisible: false });
            applyNativeButtonState(button, native);
        });

        const audioButton = state.root.querySelector('[data-action="audio"]');
        if (audioButton && !findNativeControl('audio')) {
            audioButton.innerHTML = subtitlesHidden ? Icons.subtitlesOff : Icons.subtitles;
        }
    }

    function applyNativeButtonState(button, native) {
        button.classList.toggle('is-native-linked', Boolean(native));
        button.classList.toggle('is-unavailable', Boolean(native?.disabled || native?.getAttribute('aria-disabled') === 'true'));

        if (!native) return;

        const label = native.getAttribute('aria-label') || native.getAttribute('title') || button.getAttribute('aria-label') || button.title;
        if (label) {
            button.title = label;
            button.setAttribute('aria-label', label);
        }

        const pressed = native.getAttribute('aria-pressed');
        if (pressed !== null) button.setAttribute('aria-pressed', pressed);

        copyNativeIcon(button, native);
    }

    function copyNativeIcon(button, native) {
        if (button.dataset.action === 'play' || button.dataset.action === 'mute' || button.dataset.action === 'fullscreen' || button.dataset.action === 'audio') return;

        const nativeSvg = native.querySelector('svg');
        if (!nativeSvg) return;

        const nativeMarkup = nativeSvg.outerHTML;
        if (button.dataset.nativeIcon === nativeMarkup) return;

        button.dataset.nativeIcon = nativeMarkup;
        button.innerHTML = nativeMarkup;
        button.querySelector('svg')?.setAttribute('aria-hidden', 'true');
    }

    function findNativeControl(name, options = {}) {
        const config = NATIVE_CONTROLS[name];
        if (!config) return null;
        const requireVisible = options.requireVisible === true;

        const bySelector = [...document.querySelectorAll(config.selector)]
            .map((element) => element.closest('button, [role="button"]') || element)
            .filter(isNativeCandidate);

        const visible = bySelector.find(isVisibleElement);
        if (visible) return visible;
        if (requireVisible) return findNativeByText(config.labels, { requireVisible: true });
        if (bySelector.length) return bySelector[0];

        return findNativeByText(config.labels, options);
    }

    function findNativeByText(texts, options = {}) {
        const normalized = texts.map(normalizeText);
        return [...document.querySelectorAll('button, [role="button"]')].find((button) => {
            if (!isNativeCandidate(button)) return false;
            if (options.requireVisible && !isVisibleElement(button)) return false;
            const label = normalizeText([button.getAttribute('aria-label'), button.getAttribute('title'), button.textContent].filter(Boolean).join(' '));
            return normalized.some((text) => label.includes(text));
        }) || null;
    }

    function clickNative(selector) {
        const elements = [...document.querySelectorAll(selector)];
        const target = elements.find((element) => isNativeClickable(element));
        if (!target) return false;
        dispatchMouseSequence(target.closest('button, [role="button"]') || target);
        return true;
    }

    function clickNativeByText(texts) {
        const normalized = texts.map(normalizeText);
        const target = [...document.querySelectorAll('button, [role="button"]')].find((button) => {
            if (!isNativeClickable(button)) return false;
            const label = normalizeText([button.getAttribute('aria-label'), button.getAttribute('title'), button.textContent].filter(Boolean).join(' '));
            return normalized.some((text) => label.includes(text));
        });

        if (!target) return false;
        dispatchMouseSequence(target);
        return true;
    }

    function isNativeClickable(element) {
        if (!isNativeCandidate(element)) return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    }

    function isNativeCandidate(element) {
        return Boolean(element && !app?.root?.contains(element) && !element.disabled && element.getAttribute('aria-disabled') !== 'true');
    }

    function isVisibleElement(element) {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    }

    function dispatchMouseSequence(element) {
        ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach((type) => {
            element.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
        });
    }

    function dispatchNetflixKey(key) {
        const keyCode = key === 'ArrowLeft' ? 37 : 39;
        [document, window, document.querySelector('video')].filter(Boolean).forEach((target) => {
            ['keydown', 'keyup'].forEach((type) => {
                target.dispatchEvent(new KeyboardEvent(type, { key, code: key, keyCode, which: keyCode, bubbles: true, cancelable: true }));
            });
        });
    }

    function showControls(state, force) {
        if (!state.root) return;
        state.root.classList.remove('is-hidden');
        setLayerVisible(state, true, force);
        scheduleHide(state);
    }

    function scheduleHide(state) {
        clearTimeout(state.hideTimer);
        if (state.video.paused || state.seeking || state.speedMenu.classList.contains('is-open')) return;
        state.hideTimer = setTimeout(() => hideControls(state), HIDE_DELAY);
    }

    function hideControls(state) {
        if (state.video.paused || state.seeking) return;
        state.root.classList.add('is-hidden');
        setLayerVisible(state, false);
    }

    function setLayerVisible(state, visible, force) {
        if (window.gsap && !force) {
            window.gsap.to(state.layer, { opacity: visible ? 1 : 0, duration: visible ? 0.18 : 0.34, ease: visible ? 'power2.out' : 'power2.in' });
            return;
        }
        state.layer.style.opacity = visible ? '1' : '0';
    }

    function showToast(state, message) {
        state.toast.textContent = message;
        if (window.gsap) {
            window.gsap.killTweensOf(state.toast);
            window.gsap.fromTo(state.toast, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.12, yoyo: true, repeat: 1, repeatDelay: 0.45 });
            return;
        }
        state.toast.style.opacity = '1';
        clearTimeout(state.toastTimer);
        state.toastTimer = setTimeout(() => { state.toast.style.opacity = '0'; }, 650);
    }

    function updateTitle(state) {
        const sources = [
            '[data-uia="video-title"] h4',
            '[data-uia="video-title"]',
            '.video-title h4',
            '.watch-video--header-title',
            '[data-uia="video-title"] span'
        ];

        const elementTitle = sources.map((selector) => document.querySelector(selector)?.textContent?.trim()).find(Boolean);
        const documentTitle = document.title.replace(/\s*[|-]\s*Netflix\s*$/i, '').trim();
        state.title.textContent = elementTitle || documentTitle || 'Netflix';
    }

    function destroyPlayer() {
        if (!app) return;
        clearTimeout(app.hideTimer);
        clearInterval(app.nativeSyncTimer);
        app.handlers.forEach((cleanup) => cleanup());
        app.root.remove();
        app = null;
    }

    function findVideo() {
        return [...document.querySelectorAll('video')].find((video) => video.readyState >= 0 && video.offsetParent !== null) || document.querySelector('video');
    }

    function syncPlayer() {
        clearTimeout(routeTimer);
        routeTimer = setTimeout(() => {
            if (!isWatchPage()) {
                destroyPlayer();
                return;
            }

            const video = findVideo();
            if (!video) return;

            if (!app || app.video !== video || !document.body.contains(app.root)) {
                createPlayer(video);
                return;
            }

            updateTitle(app);
            syncNativeControls(app);
        }, 80);
    }

    function watchDom() {
        if (domObserver) return;
        const start = () => {
            if (!document.body) {
                setTimeout(start, 50);
                return;
            }

            domObserver = new MutationObserver(() => {
                if (lastUrl !== location.href) {
                    lastUrl = location.href;
                    destroyPlayer();
                }
                syncPlayer();
            });
            domObserver.observe(document.body, { childList: true, subtree: true });
            syncPlayer();
        };
        start();
    }

    function hasDuration(video) {
        return Number.isFinite(video.duration) && video.duration > 0;
    }

    function formatTime(seconds) {
        if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
        const total = Math.floor(seconds);
        const h = Math.floor(total / 3600);
        const m = Math.floor((total % 3600) / 60);
        const s = String(total % 60).padStart(2, '0');
        return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
    }

    function normalizeText(text) {
        return String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function isWatchPage() {
        return location.pathname.includes('/watch/');
    }

    function isEditable(target) {
        return target?.closest?.('input, textarea, select, [contenteditable="true"]');
    }

    if (document.head || document.documentElement) {
        loadDependencies(watchDom);
    } else {
        document.addEventListener('DOMContentLoaded', () => loadDependencies(watchDom), { once: true });
    }
})();
