# Meta Conversions API neste projeto

Este site atual e estatico. Isso significa que o `access_token` da Meta nao deve entrar no `index.html` nem em nenhum arquivo dentro de `js/`.

## O que foi preparado

- `js/meta-conversions-bridge.js`
  Faz o papel seguro do frontend:
  gera `event_id`, dispara o Pixel no navegador com o mesmo ID e envia um POST para `/api/meta/events`.

- `js/meta-events.js`
  Dispara eventos basicos desta landing:
  `ViewContent` ao carregar, `CustomizeProduct` ao trocar kit e `AddToCart` ao clicar nos CTAs de compra.

- `meta-conversions-api.example.js`
  Exemplo de codigo Node.js para o backend receber esse POST e reenviar para a Meta com o token guardado em variaveis de ambiente.

- `server.js`
  Servidor Node local sem dependencias externas para servir os arquivos estaticos e encaminhar `POST /api/meta/events` para a Meta.

## Como rodar localmente

1. Copie `.env.example` para `.env`.
2. Preencha `META_ACCESS_TOKEN`.
3. Inicie com:

```powershell
$env:META_PIXEL_ID="1265085375004506"
$env:META_ACCESS_TOKEN="SEU_TOKEN_AQUI"
node server.js
```

4. Abra `http://127.0.0.1:3000`.

## Como usar no frontend

Depois que o usuario fizer uma acao relevante, chame:

```html
<script>
  window.metaConversionsBridge.track({
    eventName: 'Lead',
    customData: {
      currency: 'BRL',
      value: 129.9
    }
  });
</script>
```

Para compra com deduplicacao:

```html
<script>
  const eventId = window.metaConversionsBridge.buildEventId('purchase');

  fbq('track', 'Purchase', {
    currency: 'BRL',
    value: 129.9
  }, {
    eventID: eventId
  });

  window.metaConversionsBridge.track({
    eventName: 'Purchase',
    eventId,
    skipBrowser: true,
    customData: {
      currency: 'BRL',
      value: 129.9
    }
  });
</script>
```

## Como usar no backend

1. Crie um endpoint `POST /api/meta/events`.
2. Receba o JSON enviado pelo navegador.
3. Monte o payload da Meta usando `meta-conversions-api.example.js`.
4. Guarde `META_PIXEL_ID` e `META_ACCESS_TOKEN` em variaveis de ambiente.

Exemplo conceitual com Express:

```js
const express = require('express');
const { sendMetaEvent } = require('./meta-conversions-api.example');

const app = express();
app.use(express.json());

app.post('/api/meta/events', async (req, res) => {
  try {
    const result = await sendMetaEvent(req.body);
    res.json({ ok: true, result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});
```

## Observacoes importantes

- O token fica apenas no backend.
- `event_id` deve ser o mesmo no browser e no servidor.
- Dados pessoais devem ser normalizados e hashados com SHA-256 antes do envio.
- `client_ip_address` deve ser preenchido no backend com o IP real da requisicao.
- Use `test_event_code` antes de publicar em producao.
- O `server.js` exige Node 18 ou superior por usar `fetch` nativo.
