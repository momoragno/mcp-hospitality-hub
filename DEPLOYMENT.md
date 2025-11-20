# Guida al Deployment

Questa guida ti aiuterà a mettere in produzione il server MCP Hospitality Hub.

## Preparazione per la Produzione

### 1. Ottimizzazioni di Sicurezza

#### Rate Limiting
Considera l'aggiunta di rate limiting per prevenire abusi:

```typescript
// Esempio di implementazione base (da aggiungere)
const rateLimits = new Map<string, number>();
```

#### Validazione Input Estesa
Tutti gli input sono già validati con Zod, ma considera validazioni aggiuntive business-specific.

#### Logging
Aggiungi un sistema di logging professionale:

```bash
npm install winston
```

### 2. Monitoraggio

Considera l'aggiunta di:
- Metriche di utilizzo (quante chiamate per tool)
- Error tracking (Sentry, etc.)
- Uptime monitoring

### 3. Database/Airtable

#### Backup
- Configura backup automatici della tua base Airtable
- Testa regolarmente il restore dei backup

#### Performance
- Usa caching per menu items che cambiano raramente
- Implementa pooling delle connessioni se necessario

## Deployment Options

### Opzione 1: Server Dedicato (VPS)

```bash
# Su server (Ubuntu/Debian)
# 1. Installa Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Clona il progetto
git clone your-repo-url
cd mcp-hospitality-hub

# 3. Installa dipendenze
npm install

# 4. Build
npm run build

# 5. Configura variabili d'ambiente
sudo nano /etc/environment
# Aggiungi le tue variabili AIRTABLE_*

# 6. Setup come servizio systemd
sudo nano /etc/systemd/system/mcp-hospitality.service
```

Contenuto del file service:

```ini
[Unit]
Description=MCP Hospitality Hub
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/mcp-hospitality-hub
ExecStart=/usr/bin/node /path/to/mcp-hospitality-hub/dist/index.js
Restart=always
Environment=NODE_ENV=production
EnvironmentFile=/etc/mcp-hospitality.env

[Install]
WantedBy=multi-user.target
```

```bash
# Abilita e avvia il servizio
sudo systemctl enable mcp-hospitality
sudo systemctl start mcp-hospitality
sudo systemctl status mcp-hospitality
```

### Opzione 2: Docker

Crea un `Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

CMD ["node", "dist/index.js"]
```

E un `docker-compose.yml`:

```yaml
version: '3.8'

services:
  mcp-hospitality:
    build: .
    restart: always
    environment:
      - AIRTABLE_API_KEY=${AIRTABLE_API_KEY}
      - AIRTABLE_BASE_ID=${AIRTABLE_BASE_ID}
      - NODE_ENV=production
    volumes:
      - ./logs:/app/logs
```

Deploy:
```bash
docker-compose up -d
```

### Opzione 3: Cloud Functions (Serverless)

Il protocollo MCP usa stdio, quindi non è direttamente compatibile con serverless HTTP. Tuttavia, puoi:

1. Wrappare il server in un HTTP endpoint
2. Usare un proxy che converte HTTP → stdio
3. Hostare su VM cloud (GCP Compute, AWS EC2, DigitalOcean)

## Integrazione con ElevenLabs in Produzione

### 1. Setup API Endpoint (se necessario)

Se ElevenLabs richiede un endpoint HTTP invece di stdio:

```typescript
// Aggiungi express wrapper (esempio)
import express from 'express';

const app = express();
app.use(express.json());

app.post('/mcp', async (req, res) => {
  // Proxy MCP over HTTP
  // Implementazione dipende da requisiti ElevenLabs
});
```

### 2. Configurazione ElevenLabs

Nel dashboard ElevenLabs:

1. Vai su Agent Settings
2. Configura MCP Server:
   - Se stdio: fornisci comando per eseguire il server
   - Se HTTP: fornisci URL endpoint
3. Testa ogni tool individualmente

### 3. Webhook per Notifiche (opzionale)

Aggiungi webhook per notificare eventi:

```typescript
async createBooking(booking: Booking) {
  const result = await this.airtableService.createBooking(booking);

  // Notifica staff
  await fetch('https://your-webhook.com/booking-created', {
    method: 'POST',
    body: JSON.stringify(result)
  });

  return result;
}
```

## Configurazione Ambiente di Produzione

### Variabili d'Ambiente

```bash
# Production .env
NODE_ENV=production
AIRTABLE_API_KEY=your_production_key
AIRTABLE_BASE_ID=your_production_base

# Optional
LOG_LEVEL=info
SENTRY_DSN=your_sentry_dsn
```

### Secrets Management

Non committare mai `.env` in git. Usa:

- **AWS**: AWS Secrets Manager
- **GCP**: Secret Manager
- **Azure**: Key Vault
- **Docker**: Docker Secrets
- **Self-hosted**: Vault by HashiCorp

## Testing Pre-Produzione

```bash
# 1. Test con dati reali ma ambiente staging
cp .env.production.example .env.production
# Configura con base Airtable di staging

# 2. Build production
NODE_ENV=production npm run build

# 3. Test smoke
npm run inspector
# Testa manualmente ogni tool

# 4. Test integrazione con ElevenLabs (staging)
```

## Monitoraggio Post-Deploy

### Logs da Monitorare

```bash
# Systemd logs
sudo journalctl -u mcp-hospitality -f

# Docker logs
docker-compose logs -f
```

### Metriche Chiave

- Latenza media per tool
- Error rate per tool
- Utilizzo per fascia oraria
- Prenotazioni create vs. fallite
- Ordini room service completati

### Alert da Configurare

1. Server down
2. Error rate > 5%
3. Nessuna prenotazione in 24h (possibile problema)
4. Tempo risposta > 5s

## Rollback Plan

```bash
# Backup pre-deploy
cp -r dist dist.backup

# Se problemi dopo deploy
systemctl stop mcp-hospitality
rm -rf dist
mv dist.backup dist
systemctl start mcp-hospitality
```

## Scaling

### Vertical Scaling
- Aumenta risorse VM se latenza alta
- Airtable ha rate limits, monitora utilizzo

### Horizontal Scaling
- MCP server è stateless, può essere replicato
- Load balancer se necessario per HTTP wrapper

### Caching Strategy
```typescript
// Esempio: cache menu per 1 ora
const menuCache = new Map<string, { data: MenuItem[], timestamp: number }>();

async getMenu(category?: string): Promise<MenuItem[]> {
  const cacheKey = category || 'all';
  const cached = menuCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < 3600000) {
    return cached.data;
  }

  const data = await this.fetchMenuFromAirtable(category);
  menuCache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}
```

## Checklist Pre-Produzione

- [ ] Variabili ambiente configurate
- [ ] Build production testata
- [ ] Backup Airtable configurati
- [ ] Monitoring attivo
- [ ] Alert configurati
- [ ] Documentazione aggiornata
- [ ] Team training completato
- [ ] Piano di rollback testato
- [ ] Test end-to-end con ElevenLabs
- [ ] Load testing eseguito
- [ ] Security audit completato

## Supporto

Per problemi in produzione:
1. Controlla i logs
2. Verifica configurazione Airtable
3. Testa singoli tool con inspector
4. Contatta supporto se persistente
