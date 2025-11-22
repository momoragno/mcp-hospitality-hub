# Setup Airtable per MCP Hospitality Hub

Questa guida ti aiuterà a configurare la tua Base Airtable correttamente.

## 1. Crea una nuova Base

1. Vai su [airtable.com](https://airtable.com)
2. Clicca su "Add a base" → "Start from scratch"
3. Chiamala "Hotel Management" o simile

## 2. Crea le Tabelle

### Tabella 1: Rooms

Clicca su "Add or import" → "Table" → Rinomina in "Rooms"

**Campi da creare:**

| Nome Campo | Tipo | Opzioni |
|------------|------|---------|
| Number | Single line text | - |
| Type | Single select | Options: Single, Double, Suite, Deluxe |
| Price | Number | Format: Euro (€), Precision: 2 |
| Capacity | Number | Format: Integer |
| Amenities | Long text | - |
| Status | Single select | Options: available, occupied, maintenance |

**Dati di esempio:**

| Number | Type | Price | Capacity | Amenities | Status |
|--------|------|-------|----------|-----------|--------|
| 101 | Single | 80 | 1 | WiFi, TV, Minibar | available |
| 102 | Double | 120 | 2 | WiFi, TV, Minibar, Balcony | available |
| 201 | Suite | 250 | 4 | WiFi, TV, Minibar, Balcony, Kitchen, Living Room | available |
| 202 | Double | 120 | 2 | WiFi, TV, Minibar | occupied |
| 301 | Deluxe | 180 | 3 | WiFi, TV, Minibar, Balcony, Jacuzzi | available |

### Tabella 2: Bookings

Clicca su "+" accanto a Rooms → Rinomina in "Bookings"

**Campi da creare:**

| Nome Campo | Tipo | Opzioni |
|------------|------|---------|
| RoomId | Single line text | - |
| RoomNumber | Single line text | - |
| GuestName | Single line text | - |
| GuestEmail | Email | - |
| GuestPhone | Phone number | - |
| CheckIn | Date | Format: European (DD/MM/YYYY) |
| CheckOut | Date | Format: European (DD/MM/YYYY) |
| Guests | Number | Format: Integer |
| TotalPrice | Number | Format: Euro (€), Precision: 2 |
| Status | Single select | Options: confirmed, checked-in, checked-out, cancelled |
| SpecialRequests | Long text | - |

**Dati di esempio:**

| RoomId | RoomNumber | GuestName | GuestEmail | CheckIn | CheckOut | Guests | TotalPrice | Status |
|--------|------------|-----------|------------|---------|----------|--------|------------|--------|
| rec123... | 202 | Mario Rossi | mario@example.com | 20/11/2024 | 23/11/2024 | 2 | 360 | checked-in |

> **Nota:** RoomId sarà l'ID del record dalla tabella Rooms. Puoi copiarlo dal record.

## 3. Ottieni le Credenziali API

### API Key

1. Clicca sull'icona del tuo profilo (in alto a destra)
2. Vai su "Developer hub"
3. Clicca su "Personal access tokens"
4. Clicca "Create token"
5. Dai un nome (es. "MCP Hospitality Hub")
6. Seleziona gli scope necessari:
   - `data.records:read`
   - `data.records:write`
7. Seleziona la tua base
8. Clicca "Create token"
9. **COPIA IL TOKEN** (non potrai rivederlo!)

### Base ID

1. Vai su [airtable.com/api](https://airtable.com/api)
2. Seleziona la tua base "Hotel Management"
3. Nella URL vedrai qualcosa come: `https://airtable.com/appXXXXXXXXXXXXXX/api/docs`
4. Il Base ID è quella stringa che inizia con `app` (es. `appAbC123dEfGhI456`)

## 4. Configura il File .env

Nel progetto MCP, crea un file `.env`:

```bash
AIRTABLE_API_KEY=patAbC123XyZ...  # Il token che hai copiato
AIRTABLE_BASE_ID=appAbC123dEfGhI456  # Il Base ID

# Nomi delle tabelle (se hai usato nomi diversi)
AIRTABLE_ROOMS_TABLE=Rooms
AIRTABLE_BOOKINGS_TABLE=Bookings
```

## 5. Test della Connessione

```bash
# Build il progetto
npm run build

# Avvia l'inspector per testare
npm run inspector
```

Nell'inspector, prova:
1. `getAvailableRooms` con date future
2. `getRoomInfo` con un numero di camera esistente
3. `getActiveBooking` per cercare una prenotazione

## 6. Tips

### Performance
- Usa "Grid view" come default per inserimento rapido dati
- Crea una "Form view" per il front-desk se vuoi inserimento manuale bookings

### Automazioni Airtable (opzionali)
Puoi creare automazioni in Airtable per:
- Inviare email di conferma quando Status booking = "confirmed"
- Alert quando camera passa a "maintenance"

### Views Utili
- **Rooms → Available Today**: Filter `Status = available`
- **Bookings → Check-ins Today**: Filter per data odierna

### Backup
Vai su "..." in alto a destra della base → "Download CSV" → Esporta tutte le tabelle regolarmente

## 7. Troubleshooting

### "Invalid API Key"
- Verifica di aver copiato tutto il token
- Assicurati che il token abbia gli scope corretti
- Controlla che il token non sia scaduto

### "Table not found"
- Verifica che i nomi delle tabelle nel `.env` corrispondano esattamente (case-sensitive)
- Controlla il Base ID

### "Could not find field X"
- I nomi dei campi sono case-sensitive
- Verifica che tutti i campi richiesti siano presenti

## 8. Schema Visuale

```
┌─────────────────────────────────────────┐
│         HOTEL MANAGEMENT                │
│          (Airtable Base)                │
├──────────────────┬──────────────────────┤
│      Rooms       │      Bookings        │
├──────────────────┼──────────────────────┤
│ • Number         │ • RoomId             │
│ • Type           │ • RoomNumber         │
│ • Price          │ • GuestName          │
│ • Capacity       │ • GuestEmail         │
│ • Amenities      │ • CheckIn            │
│ • Status         │ • CheckOut           │
│                  │ • Guests             │
│                  │ • TotalPrice         │
│                  │ • Status             │
│                  │ • SpecialRequests    │
└──────────────────┴──────────────────────┘
```

## Pronto!

Ora hai la tua base Airtable configurata e pronta per integrarsi con il server MCP!

Prossimi passi:
1. Testa con MCP Inspector
2. Integra con ElevenLabs Agent
3. Aggiungi più dati di esempio per test realistici
