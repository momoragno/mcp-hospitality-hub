# Quick Start Guide

Guida rapida per far partire il tuo AI Receptionist in 10 minuti.

## 1. Setup Base (5 minuti)

### A. Configura Airtable

1. Vai su [airtable.com](https://airtable.com) e crea account (se non ce l'hai)
2. Crea una nuova Base chiamata "Hotel Management"
3. Segui [AIRTABLE_SETUP.md](./AIRTABLE_SETUP.md) per creare le tabelle
   - O importa questo template: [link al template Airtable - TODO]
4. Ottieni API Key e Base ID (vedi AIRTABLE_SETUP.md step 3)

### B. Configura il Progetto

```bash
# 1. Naviga nella directory (se non ci sei già)
cd mcp-hospitality-hub

# 2. Le dipendenze sono già installate, ma se necessario:
npm install

# 3. Copia .env.example in .env
cp .env.example .env

# 4. Modifica .env con le tue credenziali
nano .env
# Oppure apri con il tuo editor preferito
```

Nel file `.env`, sostituisci:
```bash
AIRTABLE_API_KEY=pat...  # Il tuo Personal Access Token
AIRTABLE_BASE_ID=app...  # Il tuo Base ID
```

## 2. Test Locale (3 minuti)

### Opzione A: Test con MCP Inspector (consigliato)

```bash
npm run inspector
```

Questo aprirà una UI web dove puoi:
1. Vedere tutti i 7 tool disponibili
2. Testarli uno per uno con parametri custom
3. Vedere le risposte in tempo reale

**Test da fare:**
```bash
# 1. Test menu
Tool: get_menu
Parameters: { "category": "dinner" }

# 2. Test disponibilità
Tool: check_availability
Parameters: {
  "checkIn": "2024-12-01",
  "checkOut": "2024-12-03",
  "guests": 2
}

# 3. Test info camera
Tool: get_room_info
Parameters: { "roomNumber": "101" }
```

### Opzione B: Test con Claude Desktop

1. Apri Claude Desktop
2. Vai in Settings → Developer → Edit Config
3. Aggiungi:
```json
{
  "mcpServers": {
    "hospitality": {
      "command": "node",
      "args": ["/Users/momo.ramadori/mcp-hospitality-hub/dist/index.js"],
      "env": {
        "AIRTABLE_API_KEY": "il_tuo_key",
        "AIRTABLE_BASE_ID": "il_tuo_base_id"
      }
    }
  }
}
```
4. Riavvia Claude Desktop
5. Cerca l'icona 🔨 in basso - dovresti vedere "hospitality" connesso

**Test conversazione:**
```
Tu: "Che camere hai disponibili dal 1 al 3 dicembre per 2 persone?"
Claude: [userà check_availability tool]

Tu: "Vorrei vedere il menu della cena"
Claude: [userà get_menu tool]
```

## 3. Integrazione con ElevenLabs (2 minuti)

### Setup nell'interfaccia ElevenLabs

1. Vai su [elevenlabs.io/app/agents](https://elevenlabs.io/app/agents)
2. Crea o apri il tuo Agent
3. Nella sezione "Tools" o "Integrations":
   - Aggiungi "Custom MCP Server"
   - Command: `node`
   - Args: `["/path/to/mcp-hospitality-hub/dist/index.js"]`
   - Environment Variables:
     ```json
     {
       "AIRTABLE_API_KEY": "il_tuo_key",
       "AIRTABLE_BASE_ID": "il_tuo_base_id"
     }
     ```

4. Salva e testa nella console ElevenLabs

### Prompt Suggerito per l'Agente

```
You are a professional hotel receptionist AI. You have access to tools to:
- Check room availability and make bookings
- Take room service orders from the menu
- Handle guest requests and complaints
- Access room and booking information

Be polite, professional, and helpful. Always confirm details before creating bookings.
For room service, present the menu clearly and calculate the total.

When guests report issues (like noise), use get_room_info and get_active_booking to identify the situation before escalating.
```

## 4. Test End-to-End

### Scenario 1: Nuova Prenotazione
```
Guest: "Hi, I'd like to book a room for this weekend"
Agent:
  → Asks for specific dates
  → Uses check_availability
  → Presents options
  → Asks for guest details
  → Uses create_booking
  → Confirms with booking ID
```

### Scenario 2: Room Service
```
Guest: "I'm in room 202, can I order dinner?"
Agent:
  → Uses get_menu with category "dinner"
  → Presents menu items
  → Takes order
  → Uses create_room_service_order
  → Confirms order and total
```

### Scenario 3: Complaint
```
Guest: "There's noise from room 305"
Agent:
  → Uses get_room_info for room 305
  → Uses get_active_booking for room 305
  → Provides information to handle situation
```

## 5. Next Steps

### Per Sviluppo
- Leggi [DEVELOPMENT.md](./DEVELOPMENT.md) per estendere funzionalità
- Aggiungi più dati di test in Airtable
- Personalizza le risposte dell'agente

### Per Produzione
- Leggi [DEPLOYMENT.md](./DEPLOYMENT.md)
- Setup monitoring e logging
- Configura backup Airtable
- Test di carico

## Troubleshooting Rapido

### "Configuration error: AIRTABLE_API_KEY is required"
→ Hai dimenticato di creare il file `.env` o le variabili sono sbagliate

### "Table not found"
→ Nomi tabelle in Airtable diversi da quelli nel `.env`

### Inspector non si apre
→ Prova: `npx @modelcontextprotocol/inspector dist/index.js`

### Tool non appaiono in Claude/ElevenLabs
→ Verifica che il path in config sia ASSOLUTO (non relativo)
→ Riavvia l'applicazione dopo modifiche

### "Module not found" errors
→ `npm install && npm run build`

## Dati di Test Rapido

Usa questi dati per testare rapidamente:

**Room Numbers:** 101, 102, 201, 202, 301, 302
**Date Range:** 2024-12-01 to 2024-12-31
**Menu Categories:** Breakfast, Lunch, Dinner, Drinks

**Test Booking:**
```json
{
  "roomId": "rec...",
  "guestName": "Test Guest",
  "guestEmail": "test@example.com",
  "checkIn": "2024-12-15",
  "checkOut": "2024-12-17",
  "guests": 2
}
```

## Supporto

- Problemi tecnici: Controlla i log
- Domande Airtable: [AIRTABLE_SETUP.md](./AIRTABLE_SETUP.md)
- Sviluppo: [DEVELOPMENT.md](./DEVELOPMENT.md)
- Deploy: [DEPLOYMENT.md](./DEPLOYMENT.md)

## Checklist Completamento

- [ ] Airtable Base creata con 4 tabelle
- [ ] API Key e Base ID ottenuti
- [ ] File `.env` configurato
- [ ] `npm install` eseguito con successo
- [ ] `npm run inspector` funziona
- [ ] Tool testati con successo
- [ ] Integrato con ElevenLabs
- [ ] Test conversazioni completate

Una volta completata questa checklist, sei pronto per andare in produzione! 🎉

---

**Tempo totale stimato:** 10-15 minuti
**Difficoltà:** Facile ⭐⭐☆☆☆
