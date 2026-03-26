;(function () {
  function resolveApiPath() {
    var isLocalhost =
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === 'localhost';

    if (isLocalhost && window.location.port && window.location.port !== '3000') {
      return window.location.protocol + '//' + window.location.hostname + ':3000/api/meta/events';
    }

    return '/api/meta/events';
  }

  var API_PATH = resolveApiPath();

  function randomPart() {
    return Math.random().toString(36).slice(2, 10);
  }

  function buildEventId(prefix) {
    return (prefix || 'meta') + '-' + Date.now() + '-' + randomPart();
  }

  function readCookie(name) {
    var escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var match = document.cookie.match(new RegExp('(?:^|; )' + escaped + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : '';
  }

  function postToBackend(payload) {
    if (!window.fetch) {
      return Promise.resolve();
    }

    return window.fetch(API_PATH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(function () {
      return null;
    });
  }

  function trackBrowserEvent(eventName, customData, eventId) {
    if (typeof window.fbq !== 'function') {
      return;
    }

    window.fbq('track', eventName, customData || {}, {
      eventID: eventId
    });
  }

  function trackServerEvent(config) {
    var eventName = config && config.eventName ? config.eventName : 'PageView';
    var customData = config && config.customData ? config.customData : {};
    var userData = config && config.userData ? config.userData : {};
    var eventId = config && config.eventId ? config.eventId : buildEventId(eventName.toLowerCase());

    if (config == null || config.skipBrowser !== true) {
      trackBrowserEvent(eventName, customData, eventId);
    }

    return postToBackend({
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      action_source: 'website',
      event_source_url: window.location.href,
      user_data: {
        client_user_agent: navigator.userAgent,
        fbc: readCookie('_fbc'),
        fbp: readCookie('_fbp'),
        external_id: readCookie('uniqueId'),
        client_ip_address: userData.client_ip_address || undefined,
        em: userData.em || undefined,
        ph: userData.ph || undefined,
        fn: userData.fn || undefined,
        ln: userData.ln || undefined
      },
      custom_data: customData
    });
  }

  window.metaConversionsBridge = {
    buildEventId: buildEventId,
    track: trackServerEvent
  };
})();
