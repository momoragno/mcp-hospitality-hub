# Files Reference - Quick Guide

Riferimento rapido a tutti i file del progetto.

## 📚 Documentazione (Leggi Questi)

| File | Scopo | Quando Leggere |
|------|-------|----------------|
| [START_HERE.md](./START_HERE.md) | Punto di partenza | Primo file da aprire! |
| [QUICKSTART.md](./QUICKSTART.md) | Setup rapido 10 minuti | Quando vuoi partire veloce |
| [SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md) | Checklist dettagliata passo-passo | Per setup guidato |
| [README.md](./README.md) | Overview generale del progetto | Per capire il progetto |
| [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) | Architettura completa | Per capire a fondo come funziona |
| [AIRTABLE_SETUP.md](./AIRTABLE_SETUP.md) | Guida configurazione Airtable | Quando configuri Airtable |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Guida sviluppatori | Quando vuoi estendere/modificare |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Guida deploy produzione | Quando vai in produzione |

## ⚙️ Configurazione

| File | Scopo | Note |
|------|-------|------|
| `.env` | Le TUE credenziali Airtable | NON committare mai! |
| `.env.example` | Template credenziali | Safe da committare |
| `.gitignore` | File da non tracciare in git | Include .env, node_modules, dist |
| `package.json` | Dipendenze e script npm | Definisce comandi npm |
| `tsconfig.json` | Configurazione TypeScript | Opzioni compilazione |
| `claude_desktop_config.json` | Config esempio per Claude Desktop | Copia in settings Claude |

## 💻 Codice Sorgente (src/)

| File | Scopo | Cosa Contiene |
|------|-------|---------------|
| `src/index.ts` | Entry point server MCP | Server MCP e handler dei tool |
| `src/config/index.ts` | Configurazione ambiente | Carica e valida .env |
| `src/services/airtable.ts` | Logica business Airtable | Tutti i metodi per Airtable |
| `src/tools/index.ts` | Definizioni tool MCP | Schema e descrizioni dei 7 tool |
| `src/types/index.ts` | TypeScript types | Interfaces (Room, Booking, etc.) |

## 🔧 Script e Utility

| File | Comando | Scopo |
|------|---------|-------|
| `test-local.js` | `node test-local.js` | Test veloce connessione Airtable |

## 📦 Build Output

| Directory | Scopo | Note |
|-----------|-------|------|
| `dist/` | JavaScript compilato | Creato da `npm run build` |
| `node_modules/` | Dipendenze installate | Creato da `npm install` |

## 🎯 Workflow Files

### Primo Setup
1. `START_HERE.md` - Overview
2. `QUICKSTART.md` o `SETUP_CHECKLIST.md` - Setup
3. `AIRTABLE_SETUP.md` - Configura database
4. `.env` - Aggiungi credenziali
5. `node test-local.js` - Test

### Sviluppo
1. `DEVELOPMENT.md` - Leggi guida sviluppo
2. Modifica file in `src/`
3. `npm run build` - Compila
4. `npm run inspector` - Testa

### Deploy
1. `DEPLOYMENT.md` - Leggi guida deploy
2. Setup server/docker
3. Configure environment variables
4. Deploy!

## 📋 Script NPM Disponibili

```bash
npm install          # Installa dipendenze
npm run build        # Compila TypeScript → JavaScript
npm run dev          # Watch mode (ricompila auto)
npm run inspector    # Apri MCP Inspector per testing
```

## 🗂️ Directory Structure

```
mcp-hospitality-hub/
├── 📚 Docs (tutti i .md)
├── ⚙️ Config (.env, package.json, tsconfig.json)
├── 💻 src/
│   ├── config/        # Environment config
│   ├── services/      # Business logic
│   ├── tools/         # MCP tool definitions
│   ├── types/         # TypeScript types
│   └── index.ts       # Main server
├── 📦 dist/           # Compiled code
└── 🔧 Scripts (test-local.js)
```

## 🎨 File per Use Case

### "Voglio solo far partire il sistema"
→ [QUICKSTART.md](./QUICKSTART.md)

### "Voglio capire come funziona"
→ [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)

### "Ho problemi con Airtable"
→ [AIRTABLE_SETUP.md](./AIRTABLE_SETUP.md)

### "Voglio aggiungere feature"
→ [DEVELOPMENT.md](./DEVELOPMENT.md)

### "Devo metterlo in produzione"
→ [DEPLOYMENT.md](./DEPLOYMENT.md)

### "Non so da dove iniziare"
→ [START_HERE.md](./START_HERE.md)

## 🚨 File da NON Modificare (senza sapere cosa fai)

- `node_modules/` - Gestiti da npm
- `dist/` - Generato dal build
- `package-lock.json` - Gestito da npm

## ✏️ File che Modificherai Probabilmente

- `.env` - Per cambiare credenziali
- `src/services/airtable.ts` - Per aggiungere logica business
- `src/tools/index.ts` - Per aggiungere nuovi tool
- `src/types/index.ts` - Per aggiungere nuovi types

## 🔒 File Sensibili (Non Committare!)

- `.env` - Contiene API keys
- Qualsiasi file con credenziali

(Questi sono già in .gitignore)

## 📊 File Size Reference

```
Piccoli (<10KB):        Config files, types
Medi (10-50KB):         Services, documentation
Grandi (>50KB):         package-lock.json, compiled dist/
```

## 🎓 Ordine di Lettura Consigliato

### Per User (Non Developer)
1. START_HERE.md
2. QUICKSTART.md
3. AIRTABLE_SETUP.md

### Per Developer
1. START_HERE.md
2. PROJECT_OVERVIEW.md
3. DEVELOPMENT.md
4. Codice in src/

### Per DevOps
1. DEPLOYMENT.md
2. README.md (sezione produzione)
3. .env.example

---

**Tip:** Cerca nel progetto con:
```bash
# Trova tutti i .md
find . -name "*.md"

# Cerca parola chiave nei docs
grep -r "keyword" *.md
```
