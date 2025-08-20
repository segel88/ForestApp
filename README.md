# ForestApp Pro v2.0 - Multi-Project PWA

Una Progressive Web App professionale per rilevamenti forestali con gestione multi-progetto e database locale IndexedDB.

## 🚀 Nuove Funzionalità v2.0

### 🗄️ Database Locale IndexedDB
- **Storage Robusto**: Fino a GB di dati locali persistenti
- **Performance**: Accesso istantaneo ai dati, nessuna latenza di rete
- **Affidabilità**: I dati sopravvivono a riavvii e aggiornamenti del browser
- **Offline First**: Funziona completamente offline

### 📂 Gestione Multi-Progetto
- **Progetti Multipli**: Gestisci diversi progetti forestali separatamente
- **Switch Rapido**: Cambio progetto istantaneo dal dropdown nell'header
- **Isolamento Dati**: Ogni progetto ha i suoi dati completamente separati
- **Metadati Progetto**: Nome, descrizione, operatore, località, area

### 📤 Import/Export Avanzato
- **Esportazione JSON**: Backup completo del progetto
- **Esportazione CSV**: Formato universale per analisi
- **Importazione**: Ripristina progetti da file JSON
- **Report HTML**: Report stampabili professionali

### ☁️ Sincronizzazione Opzionale
- **Google Sheets**: Sync opzionale quando necessario
- **No Dipendenze**: L'app funziona senza configurazione cloud
- **Timeout Migliorato**: Gestione intelligente delle connessioni lente
- **Retry Logic**: Tentativi automatici in caso di errori di rete

## 🏗️ Architettura

```
ForestApp/
├── index.html              # UI principale
├── manifest.json           # Configurazione PWA
├── sw.js                   # Service Worker
├── offline.html            # Pagina offline
├── css/
│   └── style.css           # Stili organizzati
├── js/
│   ├── database.js         # Layer IndexedDB
│   ├── projectManager.js   # Gestione progetti
│   └── app.js              # Logica applicazione
└── assets/
    └── icons/              # Icone PWA
```

## 📊 Schema Database

### Tabella `projects`
- id, name, description, operator, inventoryAreaHa, location
- createdAt, updatedAt, status

### Tabella `sampleTrees`
- id, projectId, area, species, diameterClass, height
- timestamp, operator, gps, synced

### Tabella `inventoryTrees`
- id, projectId, species, diameterClass
- timestamp, operator, gps, synced

### Tabella `heightAverages`
- id, projectId, species, average, count, min, max

### Tabella `settings`
- key, value, updatedAt

## 🔧 Utilizzo

### Primo Avvio
1. L'app crea automaticamente un progetto di default
2. Inserisci il tuo nome operatore
3. Inizia subito a rilevare dati

### Gestione Progetti
- **Nuovo Progetto**: Pulsante "➕ Nuovo Progetto" nella tab Risultati
- **Cambio Progetto**: Dropdown nell'header
- **Esporta**: Pulsante "📄 Esporta Progetto"
- **Importa**: Pulsante "📥 Importa Progetto"
- **Elimina**: Pulsante "🗑️ Elimina Progetto" (protetto da conferma)

### Rilevamento Dati
1. **Aree di Saggio**: Seleziona area → specie → diametro → altezza
2. **Piedilista**: Seleziona specie → conta per classe diametrica
3. **Calcoli Automatici**: Volumi e statistiche in tempo reale

### Export/Backup
- **CSV**: Per analisi in Excel/spreadsheet
- **JSON**: Backup completo per ForestApp
- **HTML Report**: Report stampabile professionale
- **Google Sheets**: Sync opzionale (se configurato)

## ⚡ Performance

- **Caricamento**: < 2 secondi
- **Database**: Queries istantanee (< 10ms)
- **Storage**: Supporta migliaia di rilevamenti per progetto
- **Offline**: Funzionalità completa senza internet

## 🔐 Privacy e Sicurezza

- **Dati Locali**: Tutto memorizzato nel dispositivo
- **No Tracking**: Nessun dato inviato a server esterni
- **HTTPS**: Comunicazioni sicure
- **Backup Opzionale**: Solo se configurato da utente

## 🛠️ Configurazione Google Sheets (Opzionale)

1. Sostituisci `GOOGLE_APPS_SCRIPT_URL` in `js/app.js`
2. Usa il pulsante "☁️ Sync con Google Sheets" quando necessario
3. L'app funziona perfettamente anche senza questa configurazione

## 📱 Installazione PWA

1. Apri l'app nel browser
2. Browser chiederà di "Installare l'app"
3. Accetta per avere l'app sulla home screen
4. Funziona come app nativa offline

## 🆕 Migrazione da v1.0

I dati esistenti in localStorage vengono automaticamente migrati al primo avvio di v2.0. Nessuna perdita di dati.

---

**ForestApp Pro v2.0** - Sviluppato per professionisti forestali che necessitano di strumenti affidabili, veloci e offline-first.