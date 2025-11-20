# Setup Checklist

Segui questa checklist passo-passo per configurare il progetto.

## ✅ Pre-requisiti

- [ ] Node.js 18+ installato (`node --version`)
- [ ] Account Airtable creato
- [ ] Editor di codice (VS Code consigliato)

## 📦 Step 1: Installazione Progetto

- [x] Navigato nella directory `mcp-hospitality-hub`
- [x] Eseguito `npm install` ✅
- [x] Build completata (`npm run build`) ✅

## 🗄️ Step 2: Configurazione Airtable

### 2.1 Crea Base Airtable

- [ ] Vai su [airtable.com](https://airtable.com)
- [ ] Clicca "Add a base" → "Start from scratch"
- [ ] Nomina la base "Hotel Management" (o nome a tua scelta)

### 2.2 Crea Tabella "Rooms"

- [ ] Crea nuova tabella chiamata "Rooms"
- [ ] Aggiungi campi (vedi AIRTABLE_SETUP.md per dettagli):
  - [ ] `Number` (Single line text)
  - [ ] `Type` (Single select: Single, Double, Suite, Deluxe)
  - [ ] `Price` (Number, formato Euro)
  - [ ] `Capacity` (Number, intero)
  - [ ] `Amenities` (Long text)
  - [ ] `Status` (Single select: available, occupied, maintenance)
- [ ] Inserisci almeno 3 camere di test

### 2.3 Crea Tabella "Bookings"

- [ ] Crea tabella "Bookings"
- [ ] Aggiungi campi:
  - [ ] `RoomId` (Single line text)
  - [ ] `RoomNumber` (Single line text)
  - [ ] `GuestName` (Single line text)
  - [ ] `GuestEmail` (Email)
  - [ ] `GuestPhone` (Phone)
  - [ ] `CheckIn` (Date)
  - [ ] `CheckOut` (Date)
  - [ ] `Guests` (Number)
  - [ ] `TotalPrice` (Number, Euro)
  - [ ] `Status` (Single select: confirmed, checked-in, checked-out, cancelled)
  - [ ] `SpecialRequests` (Long text)
- [ ] Opzionale: Inserisci 1-2 prenotazioni di test

### 2.4 Crea Tabella "Menu"

- [ ] Crea tabella "Menu"
- [ ] Aggiungi campi:
  - [ ] `Name` (Single line text)
  - [ ] `Description` (Long text)
  - [ ] `Category` (Single select: Breakfast, Lunch, Dinner, Drinks, Desserts)
  - [ ] `Price` (Number, Euro)
  - [ ] `Available` (Checkbox)
  - [ ] `Allergens` (Long text)
- [ ] Inserisci almeno 5-10 piatti di test

### 2.5 Crea Tabella "RoomService"

- [ ] Crea tabella "RoomService"
- [ ] Aggiungi campi:
  - [ ] `RoomNumber` (Single line text)
  - [ ] `Items` (Long text)
  - [ ] `TotalAmount` (Number, Euro)
  - [ ] `OrderTime` (Date, con time enabled)
  - [ ] `Status` (Single select: pending, preparing, delivered, cancelled)
  - [ ] `SpecialInstructions` (Long text)
- [ ] Lascia vuota per ora (verrà popolata dai test)

## 🔑 Step 3: Ottieni Credenziali API

### 3.1 Personal Access Token

- [ ] Clicca icona profilo (alto destra) → "Developer hub"
- [ ] Clicca "Personal access tokens" → "Create token"
- [ ] Nome: "MCP Hospitality Hub"
- [ ] Scope selezionati:
  - [ ] `data.records:read`
  - [ ] `data.records:write`
- [ ] Base selezionata: "Hotel Management"
- [ ] Token creato e **COPIATO** (inizia con `pat...`)

### 3.2 Base ID

- [ ] Vai su [airtable.com/api](https://airtable.com/api)
- [ ] Seleziona base "Hotel Management"
- [ ] Copia Base ID dalla URL (inizia con `app...`)

## ⚙️ Step 4: Configurazione Ambiente

- [x] File `.env` creato
- [ ] Apri `.env` e verifica/aggiorna:
  ```bash
  AIRTABLE_API_KEY=pat...  # Il tuo token
  AIRTABLE_BASE_ID=app...  # Il tuo Base ID
  ```
- [ ] Salva il file

## 🧪 Step 5: Test

### 5.1 Test Connessione Base

```bash
node test-local.js
```

**Risultato atteso:**
```
✅ All tests passed!
```

**Se fallisce:**
- Verifica che API key e Base ID siano corretti
- Verifica che le tabelle abbiano i nomi esatti (case-sensitive)
- Verifica che ci siano dati nelle tabelle
- Controlla gli scope del token

### 5.2 Test MCP Inspector

```bash
npm run inspector
```

**Risultato atteso:**
- Si apre browser con UI inspector
- Vedi 7 tools disponibili
- Puoi testare ogni tool

**Test suggeriti:**
1. `get_menu` con `{ "category": "dinner" }`
2. `check_availability` con date future
3. `get_room_info` con numero camera esistente

### 5.3 Test con Claude Desktop (Opzionale)

- [ ] Apri Claude Desktop
- [ ] Settings → Developer → Edit Config
- [ ] Aggiungi configurazione MCP (vedi QUICKSTART.md)
- [ ] Riavvia Claude Desktop
- [ ] Verifica icona 🔨 in basso
- [ ] Test conversazione: "Che camere hai disponibili?"

## 🚀 Step 6: Integrazione ElevenLabs

- [ ] Vai su [elevenlabs.io/app/agents](https://elevenlabs.io/app/agents)
- [ ] Apri il tuo Agent
- [ ] Configura MCP Server:
  - Command: `node`
  - Args: `["/path/completo/to/mcp-hospitality-hub/dist/index.js"]`
  - Environment variables: AIRTABLE_API_KEY e AIRTABLE_BASE_ID
- [ ] Salva configurazione
- [ ] Test nell'interfaccia ElevenLabs

## 🎯 Step 7: Test End-to-End

### Scenario Test 1: Prenotazione

**Prompt:** "Hi, I'd like to book a room for December 15-17 for 2 guests"

**Verifica:**
- [ ] Agent chiede disponibilità con `check_availability`
- [ ] Presenta opzioni camere
- [ ] Chiede dati ospite
- [ ] Crea prenotazione con `create_booking`
- [ ] Conferma con numero prenotazione

### Scenario Test 2: Room Service

**Prompt:** "I'm in room 101, can I order dinner?"

**Verifica:**
- [ ] Agent usa `get_menu` categoria dinner
- [ ] Presenta menu
- [ ] Prende ordine
- [ ] Crea ordine con `create_room_service_order`
- [ ] Conferma totale e addebito

### Scenario Test 3: Info Camera

**Prompt:** "Tell me about room 102"

**Verifica:**
- [ ] Agent usa `get_room_info`
- [ ] Descrive camera con dettagli

## ✅ Checklist Finale

- [ ] Tutte le tabelle Airtable create e popolate
- [ ] API credentials configurate correttamente
- [ ] `node test-local.js` passa
- [ ] MCP Inspector funziona e tool rispondono
- [ ] Integrazione con ElevenLabs completata
- [ ] Test end-to-end passati

## 🎉 Completato!

Una volta completata questa checklist, il tuo AI Receptionist è pronto per l'uso!

## 📝 Note

- Backup regolare della base Airtable
- Monitora i log per errori
- Vedi DEPLOYMENT.md per messa in produzione

## ❓ Troubleshooting

### "Authorization error"
→ Token non ha i permessi corretti o è scaduto

### "Table not found"
→ Nome tabella in .env diverso da quello in Airtable (case-sensitive!)

### Tool non rispondono
→ `npm run build` e riprova

### Inspector non si apre
→ Prova: `npx @modelcontextprotocol/inspector dist/index.js`

Per ulteriori problemi, vedi documentazione specifica in:
- [AIRTABLE_SETUP.md](./AIRTABLE_SETUP.md)
- [DEVELOPMENT.md](./DEVELOPMENT.md)
- [QUICKSTART.md](./QUICKSTART.md)
