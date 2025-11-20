# Railway Deployment Guide

Questa guida ti aiuta a deployare il MCP Hospitality Hub su Railway con HTTPS.

## Setup Rapido

### 1. Prerequisiti
- Account Railway (https://railway.app)
- Repository GitHub del progetto (opzionale ma consigliato)
- Credenziali Airtable (API Key e Base ID)

### 2. Deploy su Railway

#### Opzione A: Deploy da GitHub (Consigliato)
1. Vai su [Railway](https://railway.app)
2. Click su "New Project"
3. Seleziona "Deploy from GitHub repo"
4. Autorizza Railway ad accedere al tuo repository
5. Seleziona il repository `mcp-hospitality-hub`

#### Opzione B: Deploy da CLI
```bash
# Installa Railway CLI
npm install -g @railway/cli

# Login
railway login

# Inizializza il progetto
railway init

# Deploy
railway up
```

### 3. Configura le Variabili d'Ambiente

Nel dashboard Railway, vai su **Variables** e aggiungi:

```
AIRTABLE_API_KEY=your_actual_api_key
AIRTABLE_BASE_ID=your_actual_base_id
SERVER_MODE=http
AIRTABLE_ROOMS_TABLE=Rooms
AIRTABLE_BOOKINGS_TABLE=Bookings
AIRTABLE_MENU_TABLE=Menu
AIRTABLE_ROOM_SERVICE_TABLE=RoomService
```

**IMPORTANTE**: `SERVER_MODE=http` è fondamentale per Railway!

### 4. Verifica il Deploy

Railway ti fornirà un URL HTTPS tipo:
```
https://mcp-hospitality-hub-production-xxxx.up.railway.app
```

Testa che il server funzioni:

```bash
# Health check
curl https://your-app.up.railway.app/health

# Dovrebbe rispondere:
# {"status":"ok","service":"mcp-hospitality-hub"}
```

### 5. Endpoint MCP SSE

**✅ SSE Transport Implementato!**

L'endpoint SSE è ora completamente funzionante:

```
https://your-app.up.railway.app/sse
```

Funzionalità disponibili:
- ✅ Server HTTP funzionante
- ✅ Health check endpoint (`/health`)
- ✅ Info endpoint (`/`)
- ✅ SSE transport per MCP
- ✅ Supporto connessioni multiple simultanee
- ✅ Session management automatico

## Integrazione con ElevenLabs Agent

### Configurazione

Nel tuo ElevenLabs Agent, configura il server MCP usando l'URL SSE:

```
URL: https://mcp-hospitality-hub-production.up.railway.app/sse
Transport: SSE
```

### Tool Disponibili

L'agente avrà accesso a:
- `check_availability` - Verifica disponibilità camere
- `create_booking` - Crea prenotazione
- `update_booking` - Modifica prenotazione
- `get_menu` - Ottieni menu (con filtro categoria)
- `create_room_service_order` - Ordina room service
- `get_room_info` - Info camera specifica
- `get_active_booking` - Trova prenotazione attiva per camera

## Monitoraggio

### Visualizzare i Log

Nel dashboard Railway:
1. Vai su **Deployments**
2. Click sul deployment attivo
3. Visualizza i logs in real-time

Oppure via CLI:
```bash
railway logs
```

### Health Check

Railway esegue automaticamente health check su `/health`.
Se il server non risponde, Railway riavvia automaticamente il servizio.

## Troubleshooting

### "Application failed to respond"

**Causa**: `SERVER_MODE` non impostato su `http`

**Soluzione**:
1. Vai su Railway Variables
2. Aggiungi `SERVER_MODE=http`
3. Redeploy

### "Configuration error: AIRTABLE_API_KEY is required"

**Causa**: Variabili d'ambiente mancanti

**Soluzione**:
1. Verifica che tutte le variabili siano configurate
2. Assicurati di non avere spazi extra nei valori
3. Redeploy dopo aver aggiunto le variabili

### SSE Connection Issues

Se i client non riescono a connettersi all'endpoint SSE:

1. Verifica che l'URL sia corretto (deve finire con `/sse`)
2. Controlla i CORS logs in Railway
3. Assicurati che il client supporti SSE

### Port Issues

Railway assegna automaticamente la porta tramite `process.env.PORT`.
Non serve configurare manualmente la porta.

## Costi

Railway offre:
- **Free tier**: 500 ore/mese ($5 di crediti)
- **Pro tier**: $5/mese + usage

Per un MCP server leggero come questo, il free tier dovrebbe essere sufficiente per sviluppo e testing.

## Aggiornamenti

### Deploy Automatico (GitHub)

Se hai collegato Railway a GitHub, ogni push sul branch main trigghera un deploy automatico.

### Deploy Manuale (CLI)

```bash
railway up
```

## Best Practices

1. **Usa GitHub Integration**: Abilita deploy automatici
2. **Monitor Logs**: Controlla regolarmente i logs per errori
3. **Health Checks**: Railway monitora `/health` automaticamente
4. **Environment Variables**: Non committare mai credenziali nel codice
5. **Rollback**: Railway permette rollback istantanei a deploy precedenti

## URL per Testing

Dopo il deploy, avrai:

- **Health Check**: `https://your-app.up.railway.app/health`
- **MCP SSE Endpoint**: `https://your-app.up.railway.app/sse`

## Sicurezza

### Proteggere l'API (Opzionale)

Se vuoi aggiungere autenticazione all'endpoint SSE:

```typescript
// In src/index.ts, aggiungi:
app.use('/sse', (req, res, next) => {
  const token = req.headers.authorization;
  if (token !== `Bearer ${process.env.API_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

Poi aggiungi `API_SECRET` nelle variabili Railway.

## Supporto

Per problemi specifici di Railway:
- [Railway Docs](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)

Per problemi del MCP server:
- Controlla i logs in Railway
- Verifica le variabili d'ambiente
- Testa localmente con `SERVER_MODE=http npm start`
