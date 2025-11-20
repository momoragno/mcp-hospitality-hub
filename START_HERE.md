# 👋 START HERE

Benvenuto nel progetto **MCP Hospitality Hub**!

Questo è un server MCP completo per il tuo AI Receptionist con ElevenLabs.

## 🎯 Cosa Hai Ora

Un progetto **production-ready** che include:

✅ Server MCP funzionante con 7 tool per gestione hotel
✅ Integrazione completa con Airtable
✅ TypeScript con type safety
✅ Documentazione completa
✅ Script di test
✅ Configurazione pronta per ElevenLabs

## 📂 File Importanti

### Per Iniziare
- **[QUICKSTART.md](./QUICKSTART.md)** - ⚡ Parti da qui! Setup in 10 minuti
- **[SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md)** - Checklist passo-passo dettagliata

### Documentazione
- **[README.md](./README.md)** - Overview del progetto
- **[PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)** - Architettura completa
- **[AIRTABLE_SETUP.md](./AIRTABLE_SETUP.md)** - Configurazione Airtable dettagliata
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Per estendere il progetto
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Messa in produzione

### File Configurazione
- `.env` - Le tue credenziali (NON committare!)
- `package.json` - Dipendenze e script
- `tsconfig.json` - Configurazione TypeScript

### Codice
- `src/` - Codice sorgente TypeScript
- `dist/` - Codice compilato (eseguibile)
- `test-local.js` - Script per testare connessione Airtable

## 🚀 Quick Start (3 Passi)

### 1. Configura Airtable (5 min)
```bash
# Segui AIRTABLE_SETUP.md per creare:
# - Base "Hotel Management"
# - 4 tabelle: Rooms, Bookings, Menu, RoomService
# - Ottieni API Key e Base ID
```

### 2. Configura .env (1 min)
```bash
# Il file .env è già creato, verifica che contenga:
AIRTABLE_API_KEY=pat...  # Il tuo Personal Access Token
AIRTABLE_BASE_ID=app...  # Il tuo Base ID
```

### 3. Testa (2 min)
```bash
# Test connessione Airtable
node test-local.js

# Se passa, testa con MCP Inspector
npm run inspector
```

## 🎮 I 7 Tool Disponibili

1. **check_availability** - Verifica camere disponibili
2. **create_booking** - Crea prenotazione
3. **update_booking** - Modifica prenotazione
4. **get_menu** - Ottieni menu ristorante
5. **create_room_service_order** - Ordina room service
6. **get_room_info** - Info su camera specifica
7. **get_active_booking** - Trova prenotazione per camera

## 🏗️ Struttura Progetto

```
mcp-hospitality-hub/
├── src/                    # Codice TypeScript
│   ├── config/            # Configurazione
│   ├── services/          # Logica business (Airtable)
│   ├── tools/             # Definizioni tool MCP
│   ├── types/             # TypeScript types
│   └── index.ts           # Server MCP entry point
├── dist/                   # Compiled JavaScript
├── docs/                   # Tutta la documentazione
├── .env                    # Le TUE credenziali
├── package.json
└── test-local.js          # Test rapido
```

## 🎯 Casi d'Uso Supportati

✅ **Prenotazione Camera**
- Cliente chiede disponibilità
- Agent verifica e propone opzioni
- Cliente sceglie e fornisce dati
- Agent crea prenotazione

✅ **Room Service**
- Cliente in camera chiede menu
- Agent presenta opzioni
- Cliente ordina
- Agent conferma e addebita alla camera

✅ **Gestione Reclami**
- Cliente segnala rumore
- Agent identifica camera problema
- Agent recupera info ospite
- Staff può intervenire

✅ **Modifica Prenotazione**
- Cliente vuole cambiare date
- Agent verifica nuova disponibilità
- Agent modifica prenotazione
- Conferma aggiornata

## 📱 Integrazione ElevenLabs

Nell'interfaccia ElevenLabs Agent:

1. Vai su Settings → Tools
2. Aggiungi Custom MCP Server:
   ```
   Command: node
   Args: ["/path/completo/to/dist/index.js"]
   Env:
     AIRTABLE_API_KEY: il_tuo_key
     AIRTABLE_BASE_ID: il_tuo_base_id
   ```
3. I 7 tool saranno automaticamente disponibili per l'agent!

## 🧪 Testing

### Test Locale (senza MCP)
```bash
node test-local.js
```

### Test con MCP Inspector
```bash
npm run inspector
# Si apre browser con UI per testare tool
```

### Test con Claude Desktop
```bash
# Configura in Claude Desktop settings
# Testa con conversazioni naturali
```

### Test con ElevenLabs
```bash
# Configura nell'interfaccia ElevenLabs
# Testa con chiamate voice
```

## ⚠️ Troubleshooting Comune

### "Authorization error" dal test
→ API Key non ha i permessi corretti
→ Vai su Airtable → Developer Hub → verifica scope del token

### "Table not found"
→ Nomi tabelle in .env diversi da quelli in Airtable
→ I nomi sono case-sensitive!

### Tool non appaiono in ElevenLabs
→ Path deve essere ASSOLUTO (non relativo)
→ Esempio: `/Users/momo.ramadori/mcp-hospitality-hub/dist/index.js`

### Build errors
```bash
rm -rf node_modules dist
npm install
npm run build
```

## 🔄 Workflow Tipico

1. **Sviluppo**
   ```bash
   # Modifica codice in src/
   npm run dev  # watch mode
   # Testa con inspector
   ```

2. **Test**
   ```bash
   npm run build
   node test-local.js
   npm run inspector
   ```

3. **Deploy**
   ```bash
   npm run build
   # Segui DEPLOYMENT.md
   ```

## 🎓 Imparare di Più

- **MCP Protocol:** [modelcontextprotocol.io](https://modelcontextprotocol.io)
- **Airtable API:** [airtable.com/developers](https://airtable.com/developers/web/api/introduction)
- **ElevenLabs:** [elevenlabs.io/docs](https://elevenlabs.io/docs)

## 🚀 Prossimi Passi

### Setup Iniziale
1. [ ] Leggi [QUICKSTART.md](./QUICKSTART.md)
2. [ ] Configura Airtable (segui [AIRTABLE_SETUP.md](./AIRTABLE_SETUP.md))
3. [ ] Testa localmente: `node test-local.js`
4. [ ] Testa con inspector: `npm run inspector`
5. [ ] Integra con ElevenLabs

### Dopo il Setup
1. [ ] Aggiungi più dati di test in Airtable
2. [ ] Personalizza prompt dell'agente ElevenLabs
3. [ ] Testa tutti i scenari d'uso
4. [ ] Leggi [DEVELOPMENT.md](./DEVELOPMENT.md) per customizzare
5. [ ] Quando pronto, segui [DEPLOYMENT.md](./DEPLOYMENT.md)

## 💡 Tips

- Usa MCP Inspector per debug rapido dei tool
- Aggiungi dati realistici in Airtable per test migliori
- Personalizza le descrizioni dei tool per il tuo use case
- Monitora i log durante il testing

## 📞 Supporto

- **Documentazione:** Vedi file .md nella directory
- **Issues:** Apri issue su GitHub (se configurato)
- **Community:** [Link a Discord/Slack se presente]

## 🎉 Pronto?

**Inizia da qui:**
1. Apri [QUICKSTART.md](./QUICKSTART.md)
2. Segui i 3 step
3. In 10 minuti hai il tuo AI Receptionist funzionante!

---

**Buon lavoro! 🚀**

> Ricorda: questo è un progetto production-ready ma personalizzabile.
> Sentiti libero di estenderlo secondo le tue esigenze!
