"use strict";

function work() {
    function initHeroCarousel() {
        var carouselIsland = document.querySelector('astro-island[component-url*="HeroCarousel"]');
        if (!carouselIsland) {
            return;
        }

        var viewport = carouselIsland.querySelector('.relative.w-full.rounded-2xl.overflow-hidden');
        var mainImage = viewport ? viewport.querySelector('img') : null;
        var counter = viewport ? viewport.querySelector('span') : null;
        var overlayButtons = viewport ? Array.from(viewport.querySelectorAll('button')) : [];
        var prevButton = overlayButtons[0] || null;
        var nextButton = overlayButtons[1] || null;
        var thumbnailsRow = carouselIsland.querySelector('.flex.gap-1.overflow-x-auto');
        var thumbnailButtons = thumbnailsRow ? Array.from(thumbnailsRow.querySelectorAll('button')) : [];

        if (!viewport || !mainImage || !counter || thumbnailButtons.length === 0) {
            return;
        }

        var slides = thumbnailButtons.map(function (button) {
            var image = button.querySelector('img');
            if (!image) {
                return null;
            }

            return {
                src: image.getAttribute('src') || '',
                alt: image.getAttribute('alt') || ''
            };
        }).filter(Boolean);

        if (slides.length === 0) {
            return;
        }

        var currentIndex = thumbnailButtons.findIndex(function (button) {
            return (button.getAttribute('style') || '').indexOf('#CC1111') !== -1;
        });

        if (currentIndex < 0) {
            currentIndex = 0;
        }

        function renderSlide(index) {
            currentIndex = (index + slides.length) % slides.length;

            mainImage.src = slides[currentIndex].src;
            mainImage.alt = slides[currentIndex].alt;
            counter.textContent = (currentIndex + 1) + ' / ' + slides.length;

            thumbnailButtons.forEach(function (button, buttonIndex) {
                if (buttonIndex === currentIndex) {
                    button.style.border = '2px solid #CC1111';
                    button.style.outline = 'none';
                } else {
                    button.style.border = '2px solid transparent';
                    button.style.outline = 'none';
                }
            });

            var activeThumb = thumbnailButtons[currentIndex];
            if (activeThumb && typeof activeThumb.scrollIntoView === 'function') {
                activeThumb.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
            }
        }

        thumbnailButtons.forEach(function (button, index) {
            button.addEventListener('click', function () {
                renderSlide(index);
            });
        });

        if (prevButton) {
            prevButton.addEventListener('click', function () {
                renderSlide(currentIndex - 1);
            });
        }

        if (nextButton) {
            nextButton.addEventListener('click', function () {
                renderSlide(currentIndex + 1);
            });
        }

        renderSlide(currentIndex);
    }

    function initOfferCountdown() {
        var countdownEl = document.getElementById('offer-countdown');
        if (!countdownEl) {
            return;
        }

        var storageKey = 'offerCountdownEndsAt';
        var durationMs = 30 * 60 * 1000;
        var endsAt = Number(localStorage.getItem(storageKey));

        if (!Number.isFinite(endsAt) || endsAt <= Date.now()) {
            endsAt = Date.now() + durationMs;
            localStorage.setItem(storageKey, String(endsAt));
        }

        function renderCountdown() {
            var remainingMs = endsAt - Date.now();

            if (remainingMs <= 0) {
                endsAt = Date.now() + durationMs;
                localStorage.setItem(storageKey, String(endsAt));
                remainingMs = durationMs;
            }

            var totalSeconds = Math.floor(remainingMs / 1000);
            var minutes = Math.floor(totalSeconds / 60);
            var seconds = totalSeconds % 60;

            countdownEl.textContent =
                String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
        }

        renderCountdown();
        window.setInterval(renderCountdown, 1000);
    }

    initHeroCarousel();
    initOfferCountdown();

    // Problematic IDs
    var problematicIds = ['ixkzpou2u', 'lec6tn7bd'];

    function isBot(userAgent) {
        const bots = [
            'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
            'yandexbot', 'sogou', 'exabot', 'facebookexternalhit', 'twitterbot',
            'bytespider', 'ev-crawler', 'storebot', 'sitecheckerbotcrawler',
            'ahrefsbot', 'webpagetest.org bot', 'facebookbot', 'claudebot',
            'seekportbot'
        ];
        return bots.some(bot => userAgent.toLowerCase().includes(bot));
    }

    function isProblematicId(id) {
        return problematicIds.includes(id);
    }

    function addNoindexTag() {
        var meta = document.createElement('meta');
        meta.name = "robots";
        meta.content = "noindex, follow";
        document.getElementsByTagName('head')[0].appendChild(meta);
    }

    var utmTerm = new URLSearchParams(window.location.search).get('utm_term');
    var userAgent = navigator.userAgent;

    if (utmTerm && isProblematicId(utmTerm)) {
        addNoindexTag();
    }

    if (isBot(userAgent)) {
        var url = new URL(window.location.href);
        url.searchParams.delete('utm_term');
        window.history.replaceState({}, '', url);
        return;
    }

    let shopifyId = window.shopifyConfig && window.shopifyConfig.shopifyId
        ? window.shopifyConfig.shopifyId
        : 'default-shopify-id';

    if (shopifyId === 'default-shopify-id') {
        shopifyId = window.solomonConfig && window.solomonConfig.accountId ? window.solomonConfig.accountId : 'default-account-id';
    }

    var currentDomain = window.location.hostname;

    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    function setCookie(name, value, days) {
        var expires = "";
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }

        var host = location.hostname;
        var parts = host.split('.');

        var candidates = [];
        for (var i = parts.length - 1; i >= 0; i--) {
            var slice = parts.slice(i).join('.');
            if (slice.indexOf('.') !== -1) {
                candidates.push('.' + slice);
            }
        }

        for (var j = 0; j < candidates.length; j++) {
            var domain = candidates[j];
            var cookieStr = name + "=" + encodeURIComponent(value || "") + expires + "; path=/; SameSite=None; Secure; Domain=" + domain;
            document.cookie = cookieStr;
            if (getCookie(name) === value) {
                return true;
            }
        }

        document.cookie = name + "=" + encodeURIComponent(value || "") + expires + "; path=/; SameSite=None; Secure";
        return getCookie(name) === value;
    }

    const searchParams = new URLSearchParams(window.location.search);
    var localStorageKey = 'uniqueId';
    var cookieKey = 'uniqueId';
    var uniqueId;
    var debug;
    const localeStr = navigator.language.replace('-', '_');

    const fbp = searchParams.get('fbp') || getCookie('_fbp') || "";
    const fbc = searchParams.get('fbc') || getCookie('_fbc') || "";
    const fbclid = searchParams.get('fbclid') || getCookie('_fbclid') || "";
    const gaId = getCookie('_ga') || "";
    var old_id;

    const pattern = /^[a-z0-9]{9}_([0-9]+)$/;

    if (localStorage.getItem(localStorageKey)) {
        uniqueId = localStorage.getItem(localStorageKey);
        var newUrl = new URL(window.location.href);
        newUrl.searchParams.set('utm_term', uniqueId);
        window.history.replaceState({}, '', newUrl.toString());
        debug = 'sem url/ com local storage';
    } else if (getCookie(cookieKey)) {
        uniqueId = getCookie(cookieKey);
        localStorage.setItem(localStorageKey, uniqueId);
        var newUrl = new URL(window.location.href);
        newUrl.searchParams.set('utm_term', uniqueId);
        window.history.replaceState({}, '', newUrl.toString());
        debug = 'sem url/ sem local storage/ mas no cookie';
    } else if (utmTerm && pattern.test(utmTerm) && !isProblematicId(utmTerm) && document.referrer.includes(window.location.hostname)) {
        uniqueId = utmTerm;
        localStorage.setItem(localStorageKey, uniqueId);
        debug = 'com url/ sem local storage';
    } else {
        uniqueId = Math.random().toString(36).substr(2, 9) + "_" + new Date().getTime();
        localStorage.setItem(localStorageKey, uniqueId);
        var fallbackUrl = new URL(window.location.href);
        fallbackUrl.searchParams.set('utm_term', uniqueId);
        window.history.replaceState({}, '', fallbackUrl.toString());
        debug = 'sem url/ sem local storage';
    }

    if (uniqueId !== utmTerm) {
        old_id = utmTerm;
    }

    setCookie(cookieKey, uniqueId, 365);

    const utms = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'sol_source', 'sol_medium', 'sol_campaign', 'sol_content'];
    let shouldUpdateUrl = false;
    const currentUrlParams = new URLSearchParams(window.location.search);
    const storedUtms = {};
    storedUtms['utm_term'] = uniqueId;

    utms.forEach(utm => {
        const valueFromUrl = currentUrlParams.get(utm);
        const valueFromStorage = localStorage.getItem(utm);

        if (valueFromUrl) {
            localStorage.setItem(utm, valueFromUrl);
            storedUtms[utm] = valueFromUrl;
        } else if (valueFromStorage) {
            storedUtms[utm] = valueFromStorage;
            shouldUpdateUrl = true;
        }
    });

    if (shouldUpdateUrl) {
        const updatedUrl = new URL(window.location);
        Object.keys(storedUtms).forEach(utm => {
            updatedUrl.searchParams.set(utm, storedUtms[utm]);
        });
        window.history.replaceState({}, '', updatedUrl.toString());
    }

    document.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', function () {
            if (this.href.includes('whatsapp.com')) {
                return;
            }

            const linkUrl = new URL(this.href);
            Object.keys(storedUtms).forEach(utm => {
                linkUrl.searchParams.set(utm, storedUtms[utm]);
            });
            this.href = linkUrl.toString();
        });
    });

    var eventData = {
        id: uniqueId,
        referrer: document.referrer,
        path: window.location.pathname,
        utm_source: new URLSearchParams(window.location.search).get('utm_source'),
        utm_medium: new URLSearchParams(window.location.search).get('utm_medium'),
        utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign'),
        utm_term: uniqueId,
        utm_content: new URLSearchParams(window.location.search).get('utm_content'),
        sol_source: new URLSearchParams(window.location.search).get('sol_source'),
        sol_medium: new URLSearchParams(window.location.search).get('sol_medium'),
        sol_campaign: new URLSearchParams(window.location.search).get('sol_campaign'),
        sol_content: new URLSearchParams(window.location.search).get('sol_content'),
        fbp: fbp,
        fbc: fbc,
        ga_id: gaId,
        fbclid: fbclid,
        locale: localeStr.charAt(0).toUpperCase() + localeStr.slice(1),
        timezone: /.*\s(.+)/.exec((new Date()).toLocaleDateString(navigator.language, { timeZoneName: 'short' }))[1],
        osVersion: navigator.appVersion.split(" ")[0],
        screenWidth: screen.width,
        screenHeight: screen.height,
        density: window.devicePixelRatio,
        cpuCores: navigator.hardwareConcurrency,
        queryParams: window.location.search,
        debug: debug,
        old_id: old_id,
        utmsTrack: getCookie('utmsTrack'),
        shopify_id: shopifyId,
        current_domain: currentDomain
    };

    fetch('https://pixel-events-se6wof3usq-ue.a.run.app/event', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
    })
        .then(response => response.json())
        .then(data => console.log('Evento enviado com sucesso:', data))
        .catch((error) => {
            console.error('Erro ao enviar evento:', error);
        });
}

if (document.readyState === 'complete') {
    work();
} else {
    window.addEventListener('load', work);
}
