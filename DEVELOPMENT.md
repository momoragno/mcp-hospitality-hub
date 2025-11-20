# Development Guide

Guida per sviluppatori che vogliono estendere o modificare il server MCP.

## Setup Ambiente di Sviluppo

```bash
# Clone repository
git clone <repo-url>
cd mcp-hospitality-hub

# Installa dipendenze
npm install

# Copia configurazione
cp .env.example .env
# Configura le tue credenziali di sviluppo

# Build
npm run build

# Watch mode (ricompila automaticamente)
npm run dev
```

## Struttura del Progetto

```
src/
├── config/              # Configurazione e validazione env
│   └── index.ts
├── services/            # Business logic e integrazioni
│   └── airtable.ts     # Servizio Airtable
├── tools/               # Definizioni tool MCP
│   └── index.ts
├── types/               # TypeScript interfaces
│   └── index.ts
└── index.ts            # Entry point e server MCP
```

## Aggiungere un Nuovo Tool

### 1. Definisci il Type

In `src/types/index.ts`:

```typescript
export interface NewFeature {
  id: string;
  // ... altri campi
}
```

### 2. Crea lo Schema di Validazione

In `src/tools/index.ts`:

```typescript
export const NewFeatureSchema = z.object({
  param1: z.string().describe('Descrizione parametro'),
  param2: z.number().optional().describe('Parametro opzionale'),
});

// Aggiungi ai tool exports
export const tools = [
  // ... existing tools
  {
    name: 'new_feature_tool',
    description: 'Descrizione chiara per l\'AI agent',
    inputSchema: {
      type: 'object',
      properties: {
        param1: {
          type: 'string',
          description: 'Descrizione parametro',
        },
        param2: {
          type: 'number',
          description: 'Parametro opzionale',
        },
      },
      required: ['param1'],
    },
  },
];
```

### 3. Implementa il Metodo nel Service

In `src/services/airtable.ts`:

```typescript
async newFeatureMethod(params: any): Promise<NewFeature> {
  const records = await this.base(config.airtable.tables.newTable)
    .select()
    .all();

  return records.map(record => this.mapRecordToNewFeature(record));
}

private mapRecordToNewFeature(record: Records<FieldSet>[0]): NewFeature {
  return {
    id: record.id,
    // ... mapping campi
  };
}
```

### 4. Aggiungi Handler nel Server

In `src/index.ts`:

```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // ... existing cases

      case 'new_feature_tool': {
        const validated = NewFeatureSchema.parse(args);
        const result = await airtableService.newFeatureMethod(validated);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  data: result,
                },
                null,
                2
              ),
            },
          ],
        };
      }
    }
  } catch (error) {
    // ... error handling
  }
});
```

### 5. Test

```bash
# Rebuild
npm run build

# Test con inspector
npm run inspector

# Testa il nuovo tool nell'interfaccia
```

## Testing

### Test Manuale con Inspector

```bash
npm run inspector
```

L'inspector ti permette di:
- Vedere tutti i tool disponibili
- Chiamare tool con parametri custom
- Vedere response formattate
- Debuggare errori

### Test con Claude Desktop

1. Build il progetto: `npm run build`
2. Configura Claude Desktop (vedi README)
3. Riavvia Claude Desktop
4. Testa con conversazioni naturali

### Unit Test (TODO)

Per aggiungere unit tests:

```bash
npm install --save-dev jest @types/jest ts-jest
```

Esempio test:

```typescript
// src/services/__tests__/airtable.test.ts
import { AirtableService } from '../airtable';

describe('AirtableService', () => {
  it('should fetch rooms correctly', async () => {
    const service = new AirtableService();
    const rooms = await service.getRooms();
    expect(rooms).toBeInstanceOf(Array);
  });
});
```

## Best Practices

### 1. Validazione Input
Sempre usare Zod per validare input:

```typescript
const schema = z.object({
  email: z.string().email(),
  age: z.number().min(0).max(150),
});

const validated = schema.parse(input);
```

### 2. Error Handling
Gestire errori specifici:

```typescript
try {
  // ... operation
} catch (error) {
  if (error instanceof ZodError) {
    return { success: false, error: 'Invalid input', details: error.errors };
  }
  if (error.statusCode === 404) {
    return { success: false, error: 'Resource not found' };
  }
  throw error; // Re-throw unexpected errors
}
```

### 3. Response Format
Mantenere formato consistente:

```typescript
// Success
{
  success: true,
  data: { ... },
  message: "Operation completed" // opzionale
}

// Error
{
  success: false,
  error: "Error message",
  details: { ... } // opzionale
}
```

### 4. Documentazione Tool
Le descrizioni dei tool sono CRUCIALI per l'AI:

```typescript
{
  name: 'clear_descriptive_name',
  description: 'Clear description of what this tool does, when to use it, and what it returns. Be specific!',
  inputSchema: {
    properties: {
      param: {
        type: 'string',
        description: 'Detailed parameter description with examples if possible'
      }
    }
  }
}
```

## Debug

### Logging

Aggiungi logging temporaneo:

```typescript
console.error('Debug info:', data); // stderr non interferisce con MCP
```

### Inspector Debug Mode

```bash
# Con log dettagliati
DEBUG=* npm run inspector
```

### VSCode Debugging

Crea `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug MCP Server",
      "program": "${workspaceFolder}/dist/index.js",
      "preLaunchTask": "npm: build",
      "console": "integratedTerminal"
    }
  ]
}
```

## Estensioni Comuni

### 1. Aggiungere Caching

```typescript
// src/services/cache.ts
export class CacheService<T> {
  private cache = new Map<string, { data: T; timestamp: number }>();

  get(key: string, ttl: number): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }
    return null;
  }

  set(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
}
```

### 2. Aggiungere Nuovo Provider (es. Notion)

```typescript
// src/services/notion.ts
export class NotionService {
  async getKnowledgeBase(): Promise<any> {
    // Implementazione
  }
}

// src/index.ts
const notionService = new NotionService();
```

### 3. Webhook per Notifiche

```typescript
// src/services/notifications.ts
export class NotificationService {
  async sendBookingConfirmation(booking: Booking): Promise<void> {
    await fetch('https://webhook.site/...', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(booking),
    });
  }
}
```

## Performance Optimization

### 1. Batch Operations

```typescript
// Invece di:
for (const item of items) {
  await processItem(item);
}

// Usa:
await Promise.all(items.map(item => processItem(item)));
```

### 2. Connection Pooling

Per molte chiamate Airtable:

```typescript
// Configura rate limiting
const pQueue = new PQueue({ concurrency: 5, interval: 1000 });
```

### 3. Caching Strategy

Cache elementi che cambiano raramente:
- Menu items: TTL 1 ora
- Room info: TTL 30 minuti
- Availability: NO cache (dati real-time)

## Troubleshooting Sviluppo

### "Module not found"
```bash
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors
```bash
npm run build -- --noEmit
```

### MCP Not Working
1. Verifica che dist/ sia aggiornato: `npm run build`
2. Check path assoluto in configurazione
3. Testa con inspector prima di Claude/ElevenLabs

### Rate Limiting Airtable
Airtable ha limite di 5 richieste/secondo:
- Aggiungi retry logic
- Usa batch operations dove possibile
- Implementa caching

## Risorse

- [MCP Documentation](https://modelcontextprotocol.io)
- [Airtable API Docs](https://airtable.com/developers/web/api/introduction)
- [Zod Documentation](https://zod.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

## Contribuire

1. Fork il repository
2. Crea un branch per la tua feature: `git checkout -b feature/amazing-feature`
3. Commit le modifiche: `git commit -m 'Add amazing feature'`
4. Push al branch: `git push origin feature/amazing-feature`
5. Apri una Pull Request

### Code Style

- Usa TypeScript strict mode
- Nomi descrittivi per variabili e funzioni
- Commenti solo dove necessario (codice self-documenting)
- Consistent formatting (Prettier configuration TODO)

## Next Steps

Possibili migliorazioni per contributor:

1. **Testing Suite**: Aggiungere Jest con test coverage
2. **Rate Limiting**: Implementare rate limiting robusto
3. **Logging**: Sistema di logging professionale (Winston)
4. **Monitoring**: Metriche e telemetria
5. **Multi-provider**: Supporto per altri database (Notion, Google Sheets)
6. **Websockets**: Real-time updates
7. **Authentication**: Sistema di auth per multi-tenant
8. **Admin Dashboard**: UI web per gestione

Buon sviluppo! 🚀
