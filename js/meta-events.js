;(function () {
  function parseBrazilianPrice(value) {
    return Number(String(value || '').replace(/[^\d,]/g, '').replace('.', '').replace(',', '.')) || 0;
  }

  function selectedKitInput() {
    return document.querySelector('input[name="kit"]:checked');
  }

  function selectedKitData() {
    var input = selectedKitInput();
    if (!input) {
      return {
        id: 'media',
        name: 'Cesta Media',
        value: 129.9,
        currency: 'BRL'
      };
    }

    var card = input.closest('label');
    var titleNode = card ? card.querySelector('.font-black.text-sm.leading-tight') : null;
    var priceNodes = card ? card.querySelectorAll('.text-base.sm\\:text-lg.font-black.text-brand-text.leading-tight') : [];
    var title = titleNode ? titleNode.textContent.trim() : input.value;
    var rawPrice = priceNodes.length > 0 ? priceNodes[0].textContent : '';

    return {
      id: input.value,
      name: title,
      value: parseBrazilianPrice(rawPrice),
      currency: 'BRL'
    };
  }

  function track(eventName, extraData, options) {
    if (!window.metaConversionsBridge) {
      return;
    }

    var kit = selectedKitData();
    var payload = {
      eventName: eventName,
      customData: {
        currency: kit.currency,
        value: kit.value,
        content_name: kit.name,
        content_ids: [kit.id],
        content_type: 'product',
        contents: [
          {
            id: kit.id,
            quantity: 1,
            item_price: kit.value
          }
        ]
      }
    };

    if (extraData) {
      Object.assign(payload.customData, extraData);
    }

    if (options) {
      Object.assign(payload, options);
    }

    window.metaConversionsBridge.track(payload);
  }

  function initKitTracking() {
    var kitInputs = Array.prototype.slice.call(document.querySelectorAll('input[name="kit"]'));
    if (kitInputs.length === 0) {
      return;
    }

    track('ViewContent');

    kitInputs.forEach(function (input) {
      input.addEventListener('change', function () {
        track('CustomizeProduct');
      });
    });
  }

  function initCtaTracking() {
    var ctas = Array.prototype.slice.call(document.querySelectorAll('a[href="#kits"]'));
    ctas.forEach(function (cta) {
      cta.addEventListener('click', function () {
        track('AddToCart', {
          cta_label: cta.textContent.trim()
        });
      });
    });
  }

  function init() {
    initKitTracking();
    initCtaTracking();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
