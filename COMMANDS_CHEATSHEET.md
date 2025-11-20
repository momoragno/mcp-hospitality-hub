# Commands Cheat Sheet

Riferimento rapido a tutti i comandi utili del progetto.

## 📦 NPM Commands

### Setup & Build
```bash
# Installa dipendenze (solo prima volta o dopo modifiche package.json)
npm install

# Compila TypeScript in JavaScript (genera dist/)
npm run build

# Compila in watch mode (ricompila automaticamente ad ogni modifica)
npm run dev

# Prepara il progetto (viene eseguito automaticamente dopo npm install)
npm run prepare
```

### Testing & Debug
```bash
# Apri MCP Inspector per testare i tool
npm run inspector

# Alternativo se inspector non funziona
npx @modelcontextprotocol/inspector dist/index.js
```

## 🧪 Testing

### Test Locale
```bash
# Test rapido della connessione Airtable
node test-local.js

# Output atteso:
# ✅ All tests passed! Your Airtable is configured correctly.
```

### Test con MCP Inspector
```bash
npm run inspector
# Si apre browser su http://localhost:6274
# Puoi testare ogni tool individualmente
```

## 📁 File Operations

### Visualizzare File
```bash
# Lista tutti i file
ls -la

# Lista file in src/
ls -la src/

# Lista file compilati
ls -la dist/

# Visualizza contenuto .env (ATTENZIONE: contiene segreti!)
cat .env

# Visualizza package.json
cat package.json
```

### Modificare File
```bash
# Modifica .env con nano
nano .env

# Modifica con vim
vim .env

# Modifica con VS Code
code .env

# Modifica file sorgente
code src/index.ts
```

## 🔍 Ricerca & Grep

### Cerca nei File
```bash
# Cerca parola chiave in tutti i .md
grep -r "keyword" *.md

# Cerca in tutto il progetto (escludendo node_modules)
grep -r "keyword" . --exclude-dir=node_modules

# Trova tutti i file TypeScript
find . -name "*.ts" -not -path "*/node_modules/*"

# Trova tutti i file markdown
find . -name "*.md"

# Conta linee di codice TypeScript
find src -name "*.ts" | xargs wc -l
```

## 🗂️ Navigazione

```bash
# Vai alla directory del progetto
cd /Users/momo.ramadori/mcp-hospitality-hub

# Vai a src/
cd src/

# Torna alla root
cd ..

# Torna alla home
cd ~

# Mostra path corrente
pwd
```

## 🧹 Pulizia

```bash
# Rimuovi node_modules e reinstalla
rm -rf node_modules package-lock.json
npm install

# Rimuovi dist e rebuilda
rm -rf dist
npm run build

# Clean install (rimuove tutto e reinstalla)
npm ci
```

## 🔧 Git Commands (se usi Git)

```bash
# Inizializza repository
git init

# Aggiungi file (ricorda: .env è in .gitignore!)
git add .

# Commit
git commit -m "Initial commit: MCP Hospitality Hub"

# Verifica cosa verrà committato
git status

# Vedi cosa è cambiato
git diff

# Aggiungi remote
git remote add origin https://github.com/tuo-username/mcp-hospitality-hub.git

# Push
git push -u origin main
```

## 📊 Informazioni Sistema

```bash
# Versione Node.js
node --version

# Versione NPM
npm --version

# Versione TypeScript
npx tsc --version

# Info sistema
uname -a

# Spazio disco
df -h

# Memoria
free -h  # Linux
top      # macOS/Linux
```

## 🔐 Environment Variables

```bash
# Visualizza tutte le env vars
env

# Visualizza variabile specifica
echo $AIRTABLE_API_KEY

# Imposta temporaneamente (solo per sessione corrente)
export AIRTABLE_API_KEY="your_key"

# Testa con env vars custom
AIRTABLE_API_KEY=test node test-local.js
```

## 📝 Log & Debug

```bash
# Run con output verbose
DEBUG=* npm run inspector

# Salva log in file
node test-local.js > test-output.log 2>&1

# Tail dei log (se hai un server in esecuzione)
tail -f /path/to/logfile.log

# Visualizza errori system (macOS)
log show --predicate 'process == "node"' --last 1h
```

## 🚀 Deployment Commands

### Docker (se usi Docker)
```bash
# Build immagine
docker build -t mcp-hospitality-hub .

# Run container
docker run -d \
  --name hospitality-hub \
  -e AIRTABLE_API_KEY=$AIRTABLE_API_KEY \
  -e AIRTABLE_BASE_ID=$AIRTABLE_BASE_ID \
  mcp-hospitality-hub

# Vedi log
docker logs -f hospitality-hub

# Stop container
docker stop hospitality-hub

# Remove container
docker rm hospitality-hub
```

### Systemd (Linux Server)
```bash
# Controlla status servizio
sudo systemctl status mcp-hospitality

# Start servizio
sudo systemctl start mcp-hospitality

# Stop servizio
sudo systemctl stop mcp-hospitality

# Restart servizio
sudo systemctl restart mcp-hospitality

# Abilita auto-start al boot
sudo systemctl enable mcp-hospitality

# Vedi log
sudo journalctl -u mcp-hospitality -f
```

## 🔧 Troubleshooting Commands

### Problema: Module not found
```bash
rm -rf node_modules package-lock.json dist
npm install
npm run build
```

### Problema: TypeScript errors
```bash
npx tsc --noEmit
npm run build
```

### Problema: Port già in uso
```bash
# Trova processo su porta 6274 (MCP Inspector)
lsof -i :6274

# Kill processo
kill -9 <PID>
```

### Problema: Permission denied
```bash
# Rendi eseguibile
chmod +x test-local.js

# Fix ownership
sudo chown -R $USER:$USER .
```

## 📦 Package Management

```bash
# Aggiungi nuova dipendenza
npm install <package-name>

# Aggiungi dev dependency
npm install --save-dev <package-name>

# Rimuovi dipendenza
npm uninstall <package-name>

# Aggiorna dipendenze
npm update

# Controlla dipendenze obsolete
npm outdated

# Audit sicurezza
npm audit

# Fix vulnerabilità automaticamente
npm audit fix
```

## 🎯 Quick Commands per Use Cases Comuni

### "Voglio testare subito"
```bash
node test-local.js && npm run inspector
```

### "Ho modificato il codice, voglio testare"
```bash
npm run build && npm run inspector
```

### "Fresh start"
```bash
rm -rf node_modules dist package-lock.json
npm install
npm run build
node test-local.js
```

### "Deploy check"
```bash
npm run build && \
node dist/index.js --version && \
echo "✅ Build OK"
```

### "Conta righe di codice"
```bash
find src -name "*.ts" | xargs wc -l | tail -1
```

## 📋 Aliases Utili (aggiungi a ~/.bashrc o ~/.zshrc)

```bash
# Aggiungi questi al tuo shell config
alias mcp-build="npm run build"
alias mcp-test="node test-local.js"
alias mcp-inspect="npm run inspector"
alias mcp-dev="npm run dev"
alias mcp-clean="rm -rf node_modules dist && npm install && npm run build"

# Dopo aver aggiunto, ricarica shell:
source ~/.bashrc  # o ~/.zshrc
```

## 🔍 Performance & Monitoring

```bash
# Tempo di build
time npm run build

# Dimensione progetto
du -sh .
du -sh node_modules
du -sh dist

# Numero di file
find . -type f | wc -l

# File più grandi
find . -type f -exec du -h {} + | sort -rh | head -20
```

## 📚 Documentazione Commands

```bash
# Apri README in browser (macOS)
open README.md

# Converti markdown in HTML (se hai pandoc)
pandoc README.md -o readme.html

# Conta parole documentazione
wc -w *.md
```

## 🎓 Help Commands

```bash
# Help NPM
npm help

# Help script specifico
npm run build --help

# Node.js help
node --help

# TypeScript help
npx tsc --help

# MCP Inspector help
npx @modelcontextprotocol/inspector --help
```

---

💡 **Tip:** Salva questo file nei tuoi bookmark per riferimento rapido!

🔖 **Path:** [COMMANDS_CHEATSHEET.md](./COMMANDS_CHEATSHEET.md)
