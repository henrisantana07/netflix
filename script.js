// ==UserScript==
// @name         Remover de Modais e Pop-ups (Preservando Controles)
// @namespace    http://tampermonkey.net/
// @version      2.3
// @description  Oculta pop-ups e modais indesejados mantendo a árvore React da Netflix intacta.
// @author       Antigravity
// @match        *://*.netflix.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    console.log("[Script Modais] Ocultação segura de modais ativada.");

    // Seletores ESPECÍFICOS do bloqueio de residência. Não remova o HTML desses elementos:
    // eles pertencem à árvore React da Netflix e apagá-los pode causar M7375/erro de root.
    const SELECTORS_TO_HIDE = [
        '.e1ih54e40', // Classe do modal específico da residência
        '[data-uia="clcsModal"]', // Wrapper principal da verificação Netflix
        '.watch-video--interstitial-scrim' // Camada escura que escurece o player
    ];

    // Seletores de elementos críticos que NUNCA devem ser ocultados
    const PROTECTED_SELECTORS = [
        '.watch-video--player-controls',
        '.nf-player-container',
        '.button-nfplayerPlay',
        '.button-nfplayerPause',
        '.button-nfplayerNextEpisode',
        '.player-controls-container',
        '.player-interactive-trigger',
        '#nf-desktop-player',
        '.netflix-sans-font-loaded', // Mantém o container principal de navegação intacto
        'video',
        'audio'
    ];

    // Injeta regras CSS agressivas para limpar fundos desfocados (background-images) e ocultar modais imediatamente
    function injectInstantCSS() {
        const isWatchPage = window.location.href.includes('/watch/');

        let css = `
            /* Ocultação visual apenas dos elementos de bloqueio específicos */
            [data-uia="clcsModal"],
            .watch-video--interstitial-scrim,
            .e1ih54e40 {
                visibility: hidden !important;
                opacity: 0 !important;
                pointer-events: none !important;
            }
            
            /* Garante que a interação com a tela permaneça ativa */
            body, html {
                pointer-events: auto !important;
            }
        `;

        if (!isWatchPage) {
            css += `
                body, html {
                    overflow: auto !important;
                }
            `;
        }

        // Se estiver na página de reprodução, remove somente o scrim sem alterar filhos do player.
        if (isWatchPage) {
            css += `
                .watch-video--interstitial-scrim {
                    background-image: none !important;
                }
            `;
        }

        const head = document.head || document.getElementsByTagName('head')[0];
        if (head) {
            const style = document.createElement('style');
            style.type = 'text/css';
            style.appendChild(document.createTextNode(css));
            head.appendChild(style);
            console.log("[Script Modais] Estilos de ocultação segura injetados.");
        } else {
            setTimeout(injectInstantCSS, 10);
        }
    }

    injectInstantCSS();

    /**
     * Limpa dados acessíveis ao JavaScript para diagnóstico local.
     * Cookies HttpOnly de sessão não são acessíveis por userscript/navegador JS.
     */
    function clearAccessibleSiteData() {
        try {
            localStorage.clear();
        } catch (error) {
            console.warn('[Script Modais] Não foi possível limpar localStorage.', error);
        }

        try {
            sessionStorage.clear();
        } catch (error) {
            console.warn('[Script Modais] Não foi possível limpar sessionStorage.', error);
        }

        document.cookie.split(';').forEach(cookie => {
            const name = cookie.split('=')[0]?.trim();
            if (!name) return;

            const hostParts = location.hostname.split('.');
            const domains = [location.hostname];

            if (hostParts.length > 2) {
                domains.push('.' + hostParts.slice(-2).join('.'));
            }

            domains.forEach(domain => {
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domain}`;
            });
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        });

        console.log('[Script Modais] Dados acessíveis ao JavaScript limpos. Recarregue a página para testar.');
    }

    window.NFModalTools = Object.assign({}, window.NFModalTools, {
        clearAccessibleSiteData
    });

    /**
     * Verifica se um elemento pertence aos seletores protegidos.
     */
    function isProtected(element) {
        for (const modalSelector of SELECTORS_TO_HIDE) {
            if (element.matches(modalSelector)) {
                return false;
            }
        }

        for (const selector of PROTECTED_SELECTORS) {
            if (element.closest(selector)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Automatiza o clique em "Assistir temporariamente" se disponível.
     */
    function autoAcceptTemporaryWatch() {
            const watchTempButton = document.querySelector('button[data-uia="EBI_MOBILE_WATCH_TEMPORARILY"]');
            if (watchTempButton && !watchTempButton.dataset.autoClicked) {
                const rect = watchTempButton.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0 || watchTempButton.disabled) return;

                watchTempButton.dataset.autoClicked = "true";
                console.log("[Script Modais] Aceitando acesso temporário automaticamente...");
                watchTempButton.click();
        }
    }

    /**
     * Garante a navegabilidade e rolagem.
     */
    function restoreScrolling() {
        const dialogPresent = document.querySelector('.e1ih54e40, [data-uia="clcsModal"]');
        if (dialogPresent) {
            if (document.body.style.overflow === 'hidden' || document.documentElement.style.overflow === 'hidden') {
                console.log("[Script Modais] Destravando scroll.");
                document.body.style.setProperty('overflow', 'auto', 'important');
                document.documentElement.style.setProperty('overflow', 'auto', 'important');
            }
        }
    }

    /**
     * Remove somente o shell totalmente vazio do modal original da Netflix.
     * Se houver filhos, neutraliza apenas quando forem backgrounds sem conteúdo.
     */
    function neutralizeEmptyInterstitialShell() {
        document.querySelectorAll('.nf-modal.interstitial-full-screen').forEach(element => {
            if (element.children.length === 0 && element.textContent.trim() === '') {
                console.log('[Script Modais] Removendo modal original vazio da Netflix.');
                element.remove();
                return;
            }

            const children = [...element.children];
            const isOnlyBackground = children.length > 0 && children.every(child => {
                return child.matches('.nf-modal-background[data-uia="nf-modal-background"]');
            });

            if (isOnlyBackground && element.dataset.modalNeutralizedSafe !== 'true') {
                console.log('[Script Modais] Neutralizando shell vazio do modal original da Netflix.');
                element.dataset.modalNeutralizedSafe = 'true';
                element.setAttribute('aria-hidden', 'true');
                element.style.setProperty('visibility', 'hidden', 'important');
                element.style.setProperty('opacity', '0', 'important');
                element.style.setProperty('pointer-events', 'none', 'important');

                children.forEach(child => {
                    child.style.setProperty('visibility', 'hidden', 'important');
                    child.style.setProperty('opacity', '0', 'important');
                    child.style.setProperty('pointer-events', 'none', 'important');
                });
            }
        });
    }

    /**
     * Varre e oculta os elementos indesejados sem remover conteúdo interno.
     * Remover nós controlados pelo React quebra a SPA da Netflix e pode gerar M7375.
     */
    function cleanDOM() {
        autoAcceptTemporaryWatch();
        restoreScrolling();
        neutralizeEmptyInterstitialShell();

        for (const selector of SELECTORS_TO_HIDE) {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (!isProtected(element)) {
                    if (element.dataset.modalHiddenSafe !== 'true') {
                        console.log(`[Script Modais] Ocultando seletor com segurança: ${selector}`);
                        element.dataset.modalHiddenSafe = 'true';
                        element.style.setProperty('visibility', 'hidden', 'important');
                        element.style.setProperty('opacity', '0', 'important');
                        element.style.setProperty('pointer-events', 'none', 'important');
                    }
                }
            });
        }
    }

    // Observador reativo do DOM para alterações dinâmicas
    const observer = new MutationObserver((mutations) => {
        cleanDOM();
    });

    if (document.body) {
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        cleanDOM();
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            cleanDOM();
        });
    }
})();
