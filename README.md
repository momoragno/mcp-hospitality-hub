# MCP Hospitality Hub

Un server MCP (Model Context Protocol) per gestire operazioni di receptionist AI tramite integrazione con Airtable. Progettato per integrarsi con ElevenLabs Agent per fornire un'esperienza di receptionist virtuale completa.

> **⚡ Quick Start:** Vuoi partire velocemente? Leggi [QUICKSTART.md](./QUICKSTART.md) per essere operativo in 10 minuti!

## 📚 Documentazione

- **[QUICKSTART.md](./QUICKSTART.md)** - Setup rapido in 10 minuti
- **[AIRTABLE_SETUP.md](./AIRTABLE_SETUP.md)** - Guida completa configurazione Airtable
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Guida per sviluppatori
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deploy in produzione
- **[RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)** - 🚀 Deploy su Railway con HTTPS

## Caratteristiche

- ✅ **Gestione Prenotazioni**: Verifica disponibilità e crea/modifica prenotazioni
- 🛏️ **Gestione Camere**: Informazioni dettagliate sulle camere
- 📞 **Supporto Reclami**: Recupero informazioni per gestire problemi (es. rumore)
- 🔄 **Architettura Scalabile**: Pronto per essere esteso con nuove funzionalità

## Prerequisiti

- Node.js 18+
- Account Airtable con API key
- Base Airtable configurata (vedi schema sotto)

## Installazione

```bash
# Clone o crea la directory del progetto
cd mcp-hospitality-hub

# Installa le dipendenze
npm install

# Copia il file di configurazione
cp .env.example .env

# Configura le tue credenziali Airtable in .env
```

## Configurazione Airtable

Il tuo Airtable Base dovrebbe avere queste tabelle:

### Tabella "Rooms"
- `Number` (Single line text) - Numero camera
- `Type` (Single select) - Tipo camera (single, double, suite, etc.)
- `Price` (Number) - Prezzo per notte
- `Capacity` (Number) - Numero ospiti
- `Amenities` (Long text) - Servizi separati da virgola
- `Status` (Single select) - available, occupied, maintenance

### Tabella "Bookings"
- `RoomId` (Single line text) - ID della camera (Airtable record ID)
- `RoomNumber` (Single line text) - Numero camera (popolato automaticamente dal sistema)
- `GuestName` (Single line text) - Nome ospite
- `GuestEmail` (Email)
- `GuestPhone` (Phone)
- `CheckIn` (Date) - Data check-in
- `CheckOut` (Date) - Data check-out
- `Guests` (Number) - Numero ospiti
- `TotalPrice` (Number) - Prezzo totale
- `Status` (Single select) - confirmed, checked-in, checked-out, cancelled
- `SpecialRequests` (Long text)

## Configurazione .env

```env
AIRTABLE_API_KEY=your_api_key_here
AIRTABLE_BASE_ID=your_base_id_here

AIRTABLE_ROOMS_TABLE=Rooms
AIRTABLE_BOOKINGS_TABLE=Bookings
```

## Build

```bash
npm run build
```

## Sviluppo

```bash
# Watch mode per sviluppo
npm run dev
```

## Testing con MCP Inspector

```bash
npm run inspector
```

Questo aprirà l'inspector ufficiale MCP per testare i tool.

## Integrazione con ElevenLabs Agent

### 1. Configurazione nell'interfaccia ElevenLabs

Vai su [ElevenLabs Agents](https://elevenlabs.io/app/agents) e configura il tuo agente.

### 2. Aggiungi il server MCP

Nel file di configurazione dell'agente ElevenLabs (o Claude Desktop per testing), aggiungi:

```json
{
  "mcpServers": {
    "hospitality-hub": {
      "command": "node",
      "args": ["/path/to/mcp-hospitality-hub/dist/index.js"],
      "env": {
        "AIRTABLE_API_KEY": "your_key",
        "AIRTABLE_BASE_ID": "your_base_id"
      }
    }
  }
}
```

### 3. Tool Disponibili per l'Agente

L'agente ElevenLabs avrà accesso a questi tool:

- `getAvailableRooms` - Verifica disponibilità camere
- `addBooking` - Crea nuova prenotazione
- `updateBooking` - Modifica prenotazione esistente
- `getRoomInfo` - Info su una camera specifica
- `getActiveBooking` - Trova prenotazione attiva per camera

## Casi d'Uso Supportati

### 1. Book a Room + Checking Availability
```
Cliente: "Vorrei prenotare una camera dal 15 al 20 dicembre per 2 persone"
Agente:
  1. Usa getAvailableRooms(checkIn: "2024-12-15", checkOut: "2024-12-20", guests: 2)
  2. Propone camere disponibili
  3. Usa addBooking(...) con i dati del cliente
```

### 2. Noise Complaint
```
Cliente: "C'è rumore dalla camera 304"
Agente:
  1. Usa getRoomInfo(roomNumber: "304")
  2. Usa getActiveBooking(roomNumber: "304")
  3. Può identificare e contattare l'ospite
```

### 3. Change Booking
```
Cliente: "Voglio cambiare le date della mia prenotazione"
Agente:
  1. Trova la prenotazione esistente
  2. Usa check_availability per nuove date
  3. Usa update_booking(...) per modificare
```

## Struttura del Progetto

```
mcp-hospitality-hub/
├── src/
│   ├── config/          # Configurazione e validazione
│   ├── services/        # Servizi (Airtable integration)
│   ├── tools/           # Definizioni tool MCP
│   ├── types/           # TypeScript types
│   └── index.ts         # Server MCP principale
├── dist/                # Build output
├── package.json
├── tsconfig.json
└── README.md
```

## Espansione Futura

Il sistema è progettato per essere facilmente esteso. Per aggiungere nuove funzionalità:

1. **Nuovo Tool**: Aggiungi definizione in `src/tools/index.ts`
2. **Nuovo Service**: Crea un nuovo service in `src/services/`
3. **Handler**: Aggiungi il case nel switch di `src/index.ts`

Esempi di espansioni:
- Integrazione con sistemi di pagamento
- Gestione spa/wellness
- Sistema di feedback/recensioni
- Integrazione con smart room (IoT)
- Gestione check-in/check-out automatico

## Troubleshooting

### "Configuration error: AIRTABLE_API_KEY is required"
Assicurati che il file `.env` sia configurato correttamente e sia nella root del progetto.

### "Room not found"
Verifica che la tabella Rooms in Airtable abbia il campo `Number` compilato correttamente.

### Tool non appaiono nell'agente
Assicurati che il server MCP sia buildato (`npm run build`) e che il path nel config sia corretto.

## Licenza

MIT

## Supporto

Per problemi o domande, apri una issue nel repository.
