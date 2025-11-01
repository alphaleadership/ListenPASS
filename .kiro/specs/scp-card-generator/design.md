# Design Document - SCP Card Generator

## Overview

Le SCP Card Generator transforme l'architecture existante de ListenPass en un système hybride client-serveur permettant la génération individuelle et en lot de cartes d'identification SCP. Le système conserve l'interface vanilla JS côté client tout en ajoutant un serveur Node.js pour le traitement en lot, l'import de données CSV/JSON et la génération automatisée de multiples cartes.

## Architecture

### Structure hybride Client-Serveur

#### Frontend (Client)
- `index.html` - Page unique avec générateur de cartes unifié
  - Sélection dynamique du type de carte
  - Interface de génération unitaire et en lot
  - Gestion des sites et départements
  - Preview en temps réel
- `css/` - Styles adaptés au thème SCP
- `js/client/` - Logique côté client
  - `card-generator.js` - Générateur principal
  - `site-manager.js` - Gestion des sites
  - `batch-processor.js` - Traitement en lot
  - `ui-controller.js` - Contrôleur d'interface
- `assets/` - Logos et éléments visuels SCP

#### Backend (Serveur Node.js)
- `server/` - Serveur Express.js
- `server/routes/` - API endpoints pour génération en lot
- `server/services/` - Services de traitement des cartes
- `server/templates/` - Templates serveur pour génération
- `server/uploads/` - Dossier temporaire pour fichiers uploadés
- `server/output/` - Cartes générées en lot

### Composants principaux

#### Côté Client
1. **Card Template Engine** - Génère les cartes individuelles
2. **Form Validation System** - Valide les données saisies
3. **Preview System** - Affichage en temps réel des modifications
4. **Export System** - Génération d'images individuelles
5. **Batch Upload Interface** - Interface d'upload CSV/JSON
6. **Progress Tracker** - Suivi de progression des générations en lot

#### Côté Serveur
1. **Batch Processing Engine** - Traite les lots de données
2. **File Parser Service** - Parse CSV/JSON/Excel
3. **Card Generation Service** - Génère les cartes côté serveur
4. **ZIP Archive Service** - Crée des archives des cartes générées
5. **Queue Management** - Gestion des files d'attente de traitement
6. **API Gateway** - Endpoints REST pour communication client-serveur

## Components and Interfaces

### 1. Unified Card Interface
```javascript
// Interface unifiée pour tous les types de cartes
class UnifiedCardInterface {
    constructor() {
        this.currentCardType = 'researcher';
        this.cardTypes = this.initializeCardTypes();
        this.formSections = this.initializeFormSections();
        this.previewCanvas = null;
        this.mode = 'single'; // 'single' ou 'batch'
    }
    
    initializeCardTypes() {
        return {
            researcher: {
                title: "Researcher Card",
                description: "For research personnel and scientists",
                clearanceLevels: [1, 2, 3, 4],
                template: "researcher-template",
                color: "#2c5aa0",
                requiredFields: ['fullName', 'employeeId', 'siteDesignation', 'department', 'clearanceLevel'],
                optionalFields: ['photo', 'specialDesignations', 'emergencyContact']
            },
            security: {
                title: "Security Personnel Card", 
                description: "For security and containment staff",
                clearanceLevels: [1, 2, 3, 4, 5],
                template: "security-template",
                color: "#8b0000",
                requiredFields: ['fullName', 'employeeId', 'siteDesignation', 'department', 'clearanceLevel'],
                optionalFields: ['photo', 'accessZones', 'weaponsAuthorization']
            },
            dclass: {
                title: "D-Class Personnel Card",
                description: "For D-Class test subjects",
                clearanceLevels: [0],
                template: "dclass-template",
                color: "#ff4500",
                requiredFields: ['fullName', 'employeeId', 'siteDesignation', 'expirationDate'],
                optionalFields: ['photo', 'testingHistory', 'medicalNotes']
            },
            o5: {
                title: "O5 Council Card",
                description: "For O5 Council members",
                clearanceLevels: [5],
                template: "o5-template",
                color: "#000000",
                requiredFields: ['fullName', 'employeeId', 'councilNumber'],
                optionalFields: ['photo', 'specialAccess']
            }
        };
    }
    
    // Méthodes de gestion de l'interface
    switchCardType(newType) { }
    updateFormFields() { }
    toggleMode(mode) { } // Basculer entre single et batch
    showPreview() { }
    hidePreview() { }
}

// Contrôleur d'interface principal
class UIController {
    constructor() {
        this.cardInterface = new UnifiedCardInterface();
        this.siteManager = new ClientSiteManager();
        this.batchProcessor = new ClientBatchProcessor();
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        // Sélection du type de carte
        document.getElementById('cardTypeSelector').addEventListener('change', (e) => {
            this.cardInterface.switchCardType(e.target.value);
        });
        
        // Basculement mode single/batch
        document.getElementById('modeToggle').addEventListener('change', (e) => {
            this.cardInterface.toggleMode(e.target.checked ? 'batch' : 'single');
        });
        
        // Sélection du site
        document.getElementById('siteSelector').addEventListener('change', (e) => {
            this.loadDepartments(e.target.value);
        });
    }
    
    async loadDepartments(siteId) { }
    updatePreview() { }
    generateCard() { }
    startBatchGeneration() { }
}
```

### 2. Card Generation Interface (Hybride Client-Serveur)
```javascript
// Interface unifiée de génération (client et serveur)
class SCPCardGenerator {
    constructor(cardType, mode = 'client') {
        this.cardType = cardType;
        this.mode = mode; // 'client' ou 'server'
        this.template = this.loadTemplate(cardType);
        this.formData = {};
        this.apiClient = new APIClient();
    }
    
    // Méthodes principales (fonctionnent en client et serveur)
    updatePreview(fieldData) { }
    validateForm() { }
    
    // Génération adaptative (client local ou serveur)
    async generateCard() {
        if (this.mode === 'server') {
            return await this.apiClient.generateCardOnServer(this.formData);
        } else {
            return this.generateCardLocally();
        }
    }
    
    generateCardLocally() { }
    exportCard(format) { }
    
    // Gestion des sites et départements
    async loadSites() { }
    async loadDepartments(siteId) { }
    validateSiteAssignment(siteId, clearanceLevel) { }
}

// Interface de génération en lot
class BatchCardGenerator {
    constructor() {
        this.apiEndpoint = '/api/batch-generate';
        this.uploadEndpoint = '/api/upload-data';
        this.statusEndpoint = '/api/batch-status';
        this.sitesEndpoint = '/api/sites';
    }
    
    // Méthodes de traitement en lot
    async uploadDataFile(file) { }
    async startBatchGeneration(config) { }
    async getBatchStatus(batchId) { }
    async downloadBatchResults(batchId) { }
    trackProgress(batchId, callback) { }
    
    // Gestion des sites pour génération en lot
    async validateBatchSites(personnelData) { }
    async getSiteStatistics(siteId) { }
}

// Client API unifié
class APIClient {
    constructor() {
        this.baseURL = '/api';
        this.endpoints = {
            generateCard: '/generate-card',
            batchGenerate: '/batch-generate',
            sites: '/sites',
            departments: '/departments',
            validatePersonnel: '/validate-personnel'
        };
    }
    
    async generateCardOnServer(cardData) { }
    async getSites() { }
    async getDepartments(siteId) { }
    async validatePersonnelData(data) { }
}
```

### 3. Server API Interface
```javascript
// API endpoints pour le serveur
const apiRoutes = {
    // Génération unitaire
    'POST /api/generate-card': 'generateSingleCard',
    
    // Gestion des sites
    'GET /api/sites': 'getAllSites',
    'GET /api/sites/:siteId': 'getSiteDetails',
    'GET /api/sites/:siteId/departments': 'getSiteDepartments',
    'POST /api/sites': 'createSite',
    'PUT /api/sites/:siteId': 'updateSite',
    
    // Gestion des départements
    'GET /api/departments': 'getAllDepartments',
    'GET /api/departments/:deptId': 'getDepartmentDetails',
    'POST /api/departments': 'createDepartment',
    
    // Validation du personnel
    'POST /api/validate-personnel': 'validatePersonnelData',
    'GET /api/personnel/:employeeId': 'getPersonnelInfo',
    
    // Upload de fichiers de données
    'POST /api/upload-data': 'uploadDataFile',
    
    // Démarrage de génération en lot
    'POST /api/batch-generate': 'startBatchGeneration',
    
    // Statut de traitement
    'GET /api/batch-status/:batchId': 'getBatchStatus',
    
    // Téléchargement des résultats
    'GET /api/download-batch/:batchId': 'downloadBatch',
    
    // Preview d'un échantillon
    'POST /api/preview-batch': 'previewBatchSample'
};

// Service de génération unifié côté serveur
class ServerCardService {
    constructor() {
        this.cardRenderer = new ServerCardRenderer();
        this.siteManager = new SiteManager();
        this.personnelValidator = new PersonnelValidator();
    }
    
    // Génération unitaire
    async generateSingleCard(cardData) { }
    async validateCardData(data) { }
    
    // Génération en lot
    async processBatch(batchData, config) { }
    async generateCardsFromData(personnelList) { }
    async createZipArchive(cardFiles) { }
    updateBatchProgress(batchId, progress) { }
}

// Gestionnaire des sites SCP
class SiteManager {
    constructor() {
        this.sites = new Map();
        this.departments = new Map();
        this.loadDefaultSites();
    }
    
    loadDefaultSites() {
        // Sites SCP prédéfinis
        this.addSite(new SCPSite({
            siteId: 'Site-19',
            siteName: 'Site-19',
            location: { country: 'USA', region: 'Classified' },
            departments: ['Research', 'Security', 'Containment', 'Administration'],
            maxClearanceLevel: 4
        }));
        
        this.addSite(new SCPSite({
            siteId: 'Area-██',
            siteName: 'Area-██',
            location: { country: 'Classified', region: 'Classified' },
            departments: ['Research', 'Security', 'Special Containment'],
            maxClearanceLevel: 5
        }));
    }
    
    addSite(site) { }
    getSite(siteId) { }
    getAllSites() { }
    validateSiteAccess(siteId, clearanceLevel) { }
    getDepartments(siteId) { }
}

// Validateur de données personnel
class PersonnelValidator {
    constructor() {
        this.siteManager = new SiteManager();
    }
    
    validatePersonnelData(data) {
        const errors = [];
        
        // Validation de l'affectation au site
        if (!this.siteManager.getSite(data.siteDesignation)) {
            errors.push(`Site invalide: ${data.siteDesignation}`);
        }
        
        // Validation du niveau de clearance pour le site
        if (!this.siteManager.validateSiteAccess(data.siteDesignation, data.clearanceLevel)) {
            errors.push(`Niveau de clearance ${data.clearanceLevel} non autorisé pour ${data.siteDesignation}`);
        }
        
        // Validation du département
        const siteDepts = this.siteManager.getDepartments(data.siteDesignation);
        if (!siteDepts.includes(data.department)) {
            errors.push(`Département ${data.department} non disponible sur ${data.siteDesignation}`);
        }
        
        return { isValid: errors.length === 0, errors };
    }
}
```

### 4. Batch Data Structure
```javascript
// Structure pour données en lot (CSV/JSON)
const batchDataSchema = {
    personnel: [
        {
            fullName: "Dr. ████ ████████",
            employeeId: "SCP-0001-001", 
            cardType: "researcher",
            clearanceLevel: 3,
            siteDesignation: "Site-19",
            department: "Research",
            position: "Senior Researcher",
            dateOfBirth: "1985-03-15",
            issueDate: "2024-01-01",
            expirationDate: "2025-01-01",
            photoUrl: "photos/dr_████.jpg", // Optionnel
            specialDesignations: ["Anomalous", "Memetic Resistance"]
        }
        // ... autres entrées
    ],
    batchConfig: {
        outputFormat: "png", // png, jpg, pdf
        resolution: 300, // DPI
        includeBackside: false,
        watermark: true,
        archiveFormat: "zip" // zip, tar
    }
};

// Configuration de traitement en lot
class BatchConfig {
    constructor() {
        this.maxBatchSize = 1000;
        this.concurrentProcessing = 5;
        this.outputFormats = ['png', 'jpg', 'pdf'];
        this.compressionLevel = 6;
        this.includeManifest = true;
    }
}
```

### 5. Form Fields Structure
```javascript
// Champs communs à tous les types de cartes
const commonFields = {
    personalInfo: {
        fullName: { required: true, maxLength: 50 },
        employeeId: { required: true, pattern: /^SCP-\d{4}-\d{3}$/ },
        photo: { required: true, type: 'file' },
        dateOfBirth: { required: true, type: 'date' }
    },
    assignment: {
        siteDesignation: { required: true, options: ['Site-19', 'Site-██', 'Area-██'] },
        department: { required: true, options: ['Research', 'Security', 'Containment', 'Administration'] },
        clearanceLevel: { required: true, type: 'number', min: 0, max: 5 },
        position: { required: true, maxLength: 30 }
    },
    security: {
        issueDate: { required: true, type: 'date' },
        expirationDate: { required: true, type: 'date' },
        emergencyContact: { required: false, maxLength: 100 }
    }
};
```

## Data Models

### Batch Processing Model
```javascript
class BatchJob {
    constructor() {
        this.batchId = this.generateBatchId();
        this.status = 'pending'; // pending, processing, completed, failed
        this.totalCards = 0;
        this.processedCards = 0;
        this.failedCards = 0;
        this.startTime = null;
        this.endTime = null;
        this.outputPath = null;
        this.errors = [];
        this.config = new BatchConfig();
    }
    
    generateBatchId() {
        return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    getProgress() {
        return this.totalCards > 0 ? (this.processedCards / this.totalCards) * 100 : 0;
    }
    
    addError(cardIndex, error) {
        this.errors.push({ cardIndex, error, timestamp: new Date() });
        this.failedCards++;
    }
}

class BatchResult {
    constructor(batchId) {
        this.batchId = batchId;
        this.generatedFiles = [];
        this.archivePath = null;
        this.manifest = {
            totalGenerated: 0,
            totalFailed: 0,
            generationTime: 0,
            fileSize: 0
        };
    }
}
```

### Site Management Model
```javascript
class SCPSite {
    constructor() {
        this.siteId = ''; // Site-19, Area-██, etc.
        this.siteName = '';
        this.location = {
            country: '',
            region: '',
            coordinates: { lat: 0, lng: 0 }
        };
        this.classification = 'CLASSIFIED';
        this.departments = [];
        this.maxClearanceLevel = 5;
        this.specializations = []; // Containment, Research, etc.
        this.personnelCount = 0;
        this.isActive = true;
    }
}

class Department {
    constructor() {
        this.departmentId = '';
        this.name = ''; // Research, Security, Containment, etc.
        this.siteId = '';
        this.headOfDepartment = '';
        this.requiredClearance = 1;
        this.specialPermissions = [];
        this.personnelList = [];
    }
}
```

### Personnel Card Model
```javascript
class PersonnelCard {
    constructor() {
        this.personalInfo = {
            fullName: '',
            employeeId: '',
            photo: null,
            dateOfBirth: null,
            nationality: '',
            bloodType: ''
        };
        
        this.assignment = {
            siteDesignation: '', // Référence à SCPSite
            siteName: '', // Nom complet du site
            department: '', // Référence à Department
            departmentName: '', // Nom complet du département
            clearanceLevel: 1,
            position: '',
            supervisor: '',
            assignmentDate: new Date(),
            specialDesignations: [], // Anomalous, Memetic Resistance, etc.
            accessZones: [] // Zones autorisées dans le site
        };
        
        this.security = {
            issueDate: new Date(),
            expirationDate: null,
            emergencyContact: '',
            biometricHash: '',
            accessCodes: [],
            securityNotes: '',
            lastUpdate: new Date()
        };
        
        this.cardType = 'researcher';
        this.template = null;
        this.isActive = true;
    }
}
```

### Template Configuration Model
```javascript
class CardTemplate {
    constructor(type) {
        this.type = type;
        this.layout = {
            width: 856,  // Standard ID card size in pixels
            height: 540,
            backgroundColor: '#f0f0f0',
            borderColor: '#333333'
        };
        
        this.elements = {
            logo: { position: { x: 20, y: 20 }, size: { w: 80, h: 80 } },
            photo: { position: { x: 680, y: 80 }, size: { w: 150, h: 200 } },
            name: { position: { x: 20, y: 120 }, fontSize: 24, fontWeight: 'bold' },
            employeeId: { position: { x: 20, y: 160 }, fontSize: 18 },
            clearance: { position: { x: 20, y: 200 }, fontSize: 16 },
            department: { position: { x: 20, y: 240 }, fontSize: 16 },
            site: { position: { x: 20, y: 280 }, fontSize: 16 }
        };
        
        this.colors = this.getColorScheme(type);
    }
    
    getColorScheme(type) {
        const schemes = {
            researcher: { primary: '#2c5aa0', secondary: '#ffffff', accent: '#ff6b35' },
            security: { primary: '#8b0000', secondary: '#ffffff', accent: '#ffd700' },
            dclass: { primary: '#ff4500', secondary: '#000000', accent: '#ffff00' },
            o5: { primary: '#000000', secondary: '#ffffff', accent: '#ff0000' }
        };
        return schemes[type] || schemes.researcher;
    }
}
```

## Error Handling

### Validation Errors
```javascript
class ValidationError extends Error {
    constructor(field, message, code) {
        super(message);
        this.field = field;
        this.code = code;
        this.name = 'ValidationError';
    }
}

// Gestionnaire d'erreurs centralisé
class ErrorHandler {
    static handleValidationError(error) {
        const errorElement = document.querySelector(`#error-${error.field}`);
        if (errorElement) {
            errorElement.textContent = error.message;
            errorElement.style.display = 'block';
        }
    }
    
    static handleGenerationError(error) {
        console.error('Card generation failed:', error);
        alert('Erreur lors de la génération de la carte. Veuillez vérifier vos données.');
    }
}
```

### File Upload Handling
```javascript
class FileHandler {
    static validateImage(file) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        const maxSize = 5 * 1024 * 1024; // 5MB
        
        if (!allowedTypes.includes(file.type)) {
            throw new ValidationError('photo', 'Format d\'image non supporté', 'INVALID_FORMAT');
        }
        
        if (file.size > maxSize) {
            throw new ValidationError('photo', 'Image trop volumineuse (max 5MB)', 'FILE_TOO_LARGE');
        }
        
        return true;
    }
}
```

## Testing Strategy

### Unit Testing Approach
- **Form Validation Tests**: Validation des champs requis et formats
- **Template Rendering Tests**: Génération correcte des éléments visuels
- **Data Model Tests**: Intégrité des modèles de données
- **Export Functionality Tests**: Génération d'images dans différents formats

### Integration Testing
- **End-to-End Card Generation**: Test complet du processus de création individuelle
- **Batch Processing Tests**: Génération en lot avec différentes tailles de données
- **API Integration Tests**: Communication client-serveur
- **Cross-Browser Compatibility**: Tests sur différents navigateurs
- **Responsive Design Tests**: Fonctionnement sur mobile et desktop
- **File Upload Tests**: Gestion des images et fichiers de données
- **Server Load Tests**: Performance avec multiples utilisateurs simultanés

### Manual Testing Scenarios
1. **Interface unifiée** - Basculement entre types de cartes sur la même page
2. **Création de carte chercheur** avec tous les champs requis
3. **Génération de carte D-Class** avec date d'expiration
4. **Sélection dynamique de site** et chargement des départements
5. **Validation en temps réel** des affectations site/département
6. **Test de validation** avec données invalides
7. **Export de carte** en haute résolution (client et serveur)
8. **Basculement mode single/batch** sur la même interface
9. **Upload de fichier CSV** avec 50+ entrées de personnel
10. **Génération en lot** avec suivi de progression en temps réel
11. **Téléchargement d'archive ZIP** avec toutes les cartes générées
12. **Gestion d'erreurs** lors du traitement en lot
13. **Test de performance** avec 500+ cartes simultanées
14. **Responsive design** - Interface adaptée mobile/desktop

### Performance Testing
- **Temps de génération** des cartes (< 2 secondes)
- **Taille des fichiers** exportés (< 2MB)
- **Utilisation mémoire** lors du traitement d'images
- **Responsive time** de l'interface utilisateur

## Visual Design Specifications

### SCP Foundation Branding
- **Couleurs principales**: Noir (#000000), Blanc (#FFFFFF), Rouge (#CC0000)
- **Police principale**: Roboto ou Arial pour la lisibilité
- **Logo**: Logo officiel SCP Foundation avec symboles de sécurité
- **Iconographie**: Symboles de clearance, codes de département, warnings

### Card Layout Standards
- **Dimensions**: Format carte de crédit standard (85.6mm x 54mm)
- **Résolution**: 300 DPI pour impression
- **Zones de sécurité**: Marges de 2mm sur tous les côtés
- **Hiérarchie visuelle**: Nom > ID > Clearance > Département > Site

### Accessibility Considerations
- **Contraste**: Ratio minimum 4.5:1 pour le texte
- **Taille de police**: Minimum 12pt pour la lisibilité
- **Navigation clavier**: Support complet des raccourcis
- **Screen readers**: Labels appropriés pour tous les éléments
## Server 
Architecture Details

### Technology Stack
- **Backend**: Node.js avec Express.js
- **File Processing**: Multer pour uploads, csv-parser pour CSV, xlsx pour Excel
- **Image Generation**: Canvas API ou Puppeteer pour rendu serveur
- **Archive Creation**: archiver pour ZIP, tar pour TAR
- **Queue Management**: Bull Queue avec Redis (optionnel)
- **Database**: SQLite pour tracking des jobs (optionnel)

### API Endpoints Specification

#### POST /api/generate-card
```javascript
// Génération d'une carte unitaire côté serveur
Request: {
    cardData: PersonnelCard,
    outputFormat: 'png' | 'jpg' | 'pdf',
    resolution: number,
    includeBackside: boolean
}
Response: {
    success: boolean,
    cardUrl: string, // URL temporaire de téléchargement
    cardId: string,
    expiresAt: string, // ISO date
    metadata: {
        fileSize: number,
        dimensions: { width: number, height: number },
        format: string
    }
}
```

#### GET /api/sites
```javascript
// Liste de tous les sites SCP disponibles
Response: {
    success: boolean,
    sites: [
        {
            siteId: "Site-19",
            siteName: "Site-19",
            location: { country: "USA", region: "Classified" },
            departments: ["Research", "Security", "Containment"],
            maxClearanceLevel: 4,
            personnelCount: 1247,
            isActive: true
        }
    ]
}
```

#### GET /api/sites/:siteId/departments
```javascript
// Départements disponibles pour un site spécifique
Response: {
    success: boolean,
    siteId: "Site-19",
    departments: [
        {
            departmentId: "RESEARCH",
            name: "Research Department",
            requiredClearance: 2,
            headOfDepartment: "Dr. ████████",
            personnelCount: 342,
            specialPermissions: ["SCP Access", "Anomalous Materials"]
        }
    ]
}
```

#### POST /api/validate-personnel
```javascript
// Validation des données de personnel
Request: {
    personnelData: PersonnelCard | PersonnelCard[]
}
Response: {
    success: boolean,
    validationResults: [
        {
            index: number,
            isValid: boolean,
            errors: string[],
            warnings: string[],
            suggestions: {
                siteDesignation?: string,
                department?: string,
                clearanceLevel?: number
            }
        }
    ]
}
```

#### POST /api/upload-data
```javascript
// Upload de fichier de données (CSV, JSON, Excel)
Request: FormData avec file
Response: {
    success: boolean,
    fileId: string,
    preview: PersonnelCard[], // Premiers 5 éléments
    totalRecords: number,
    validRecords: number,
    invalidRecords: number,
    siteDistribution: { [siteId: string]: number },
    errors: ValidationError[]
}
```

#### POST /api/batch-generate
```javascript
// Démarrage de génération en lot
Request: {
    fileId: string,
    config: BatchConfig,
    cardTypes: string[] // Types de cartes à générer
}
Response: {
    success: boolean,
    batchId: string,
    estimatedTime: number, // en secondes
    totalCards: number
}
```

#### GET /api/batch-status/:batchId
```javascript
// Statut de traitement en temps réel
Response: {
    batchId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    progress: number, // 0-100
    processedCards: number,
    totalCards: number,
    failedCards: number,
    estimatedTimeRemaining: number,
    errors: BatchError[]
}
```

#### GET /api/download-batch/:batchId
```javascript
// Téléchargement des résultats
Response: File stream (ZIP archive)
Headers: {
    'Content-Type': 'application/zip',
    'Content-Disposition': 'attachment; filename="scp-cards-batch-{batchId}.zip"'
}
```

### Batch Processing Workflow

1. **Upload & Validation**
   - Réception du fichier de données
   - Validation du format et structure
   - Preview des premières entrées
   - Stockage temporaire sécurisé

2. **Job Creation**
   - Création d'un BatchJob avec ID unique
   - Configuration des paramètres de génération
   - Ajout à la queue de traitement

3. **Processing**
   - Traitement séquentiel ou parallèle des cartes
   - Génération d'images haute résolution
   - Gestion des erreurs par carte
   - Mise à jour du statut en temps réel

4. **Archive Creation**
   - Compilation des cartes générées
   - Création du fichier manifest
   - Compression en archive ZIP/TAR
   - Nettoyage des fichiers temporaires

5. **Delivery**
   - Notification de fin de traitement
   - Mise à disposition du téléchargement
   - Expiration automatique après 24h

### Security Considerations

- **File Upload Limits**: Taille max 50MB, types autorisés
- **Rate Limiting**: Max 5 jobs simultanés par IP
- **Data Sanitization**: Validation stricte des données d'entrée
- **Temporary File Cleanup**: Suppression automatique après traitement
- **Access Control**: Tokens de session pour accès aux résultats## Single
 Page Application Structure

### HTML Layout Structure
```html
<!DOCTYPE html>
<html lang="fr">
<head>
    <title>SCP Foundation - Card Generator</title>
    <!-- Meta tags, CSS, etc. -->
</head>
<body>
    <!-- Header avec navigation -->
    <header class="scp-header">
        <div class="logo-section">
            <img src="assets/scp-logo.svg" alt="SCP Foundation">
            <h1>SCP Foundation Card Generator</h1>
        </div>
        <nav class="main-nav">
            <button id="modeToggle" class="mode-toggle">
                <span class="single-mode">Single Card</span>
                <span class="batch-mode">Batch Generation</span>
            </button>
        </nav>
    </header>

    <!-- Section principale -->
    <main class="main-content">
        <!-- Sélecteur de type de carte -->
        <section class="card-type-selector">
            <h2>Select Card Type</h2>
            <div class="card-type-grid">
                <div class="card-type-option" data-type="researcher">
                    <div class="card-preview-mini researcher"></div>
                    <h3>Researcher</h3>
                    <p>Research personnel and scientists</p>
                </div>
                <div class="card-type-option" data-type="security">
                    <div class="card-preview-mini security"></div>
                    <h3>Security</h3>
                    <p>Security and containment staff</p>
                </div>
                <div class="card-type-option" data-type="dclass">
                    <div class="card-preview-mini dclass"></div>
                    <h3>D-Class</h3>
                    <p>D-Class test subjects</p>
                </div>
                <div class="card-type-option" data-type="o5">
                    <div class="card-preview-mini o5"></div>
                    <h3>O5 Council</h3>
                    <p>O5 Council members</p>
                </div>
            </div>
        </section>

        <!-- Interface de génération -->
        <section class="generation-interface">
            <!-- Mode single card -->
            <div id="singleCardMode" class="generation-mode active">
                <div class="form-preview-container">
                    <!-- Formulaire -->
                    <div class="card-form">
                        <h3>Personnel Information</h3>
                        <div class="form-section personal-info">
                            <input type="text" id="fullName" placeholder="Full Name" required>
                            <input type="text" id="employeeId" placeholder="Employee ID (SCP-XXXX-XXX)" required>
                            <input type="file" id="photo" accept="image/*">
                            <input type="date" id="dateOfBirth">
                        </div>

                        <h3>Site Assignment</h3>
                        <div class="form-section assignment">
                            <select id="siteSelector" required>
                                <option value="">Select Site</option>
                            </select>
                            <select id="departmentSelector" required>
                                <option value="">Select Department</option>
                            </select>
                            <select id="clearanceLevel" required>
                                <option value="">Clearance Level</option>
                            </select>
                            <input type="text" id="position" placeholder="Position/Title">
                        </div>

                        <div class="form-actions">
                            <button id="generateCard" class="btn-primary">Generate Card</button>
                            <button id="previewCard" class="btn-secondary">Preview</button>
                        </div>
                    </div>

                    <!-- Preview -->
                    <div class="card-preview">
                        <h3>Card Preview</h3>
                        <canvas id="cardCanvas" width="856" height="540"></canvas>
                        <div class="preview-actions">
                            <button id="downloadCard" class="btn-download">Download</button>
                            <select id="formatSelector">
                                <option value="png">PNG</option>
                                <option value="jpg">JPG</option>
                                <option value="pdf">PDF</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Mode batch generation -->
            <div id="batchMode" class="generation-mode">
                <div class="batch-interface">
                    <div class="upload-section">
                        <h3>Upload Personnel Data</h3>
                        <div class="file-upload-area">
                            <input type="file" id="batchFile" accept=".csv,.json,.xlsx">
                            <div class="upload-instructions">
                                <p>Upload CSV, JSON, or Excel file with personnel data</p>
                                <a href="#" id="downloadTemplate">Download Template</a>
                            </div>
                        </div>
                    </div>

                    <div class="batch-preview">
                        <h3>Data Preview</h3>
                        <div id="dataPreviewTable"></div>
                        <div class="batch-stats">
                            <span id="totalRecords">0 records</span>
                            <span id="validRecords">0 valid</span>
                            <span id="invalidRecords">0 invalid</span>
                        </div>
                    </div>

                    <div class="batch-config">
                        <h3>Generation Settings</h3>
                        <div class="config-options">
                            <select id="batchFormat">
                                <option value="png">PNG</option>
                                <option value="jpg">JPG</option>
                                <option value="pdf">PDF</option>
                            </select>
                            <input type="number" id="batchResolution" value="300" min="150" max="600">
                            <label><input type="checkbox" id="includeBackside"> Include Backside</label>
                        </div>
                        <button id="startBatchGeneration" class="btn-primary">Start Batch Generation</button>
                    </div>

                    <div class="batch-progress" style="display: none;">
                        <h3>Generation Progress</h3>
                        <div class="progress-bar">
                            <div class="progress-fill"></div>
                        </div>
                        <div class="progress-stats">
                            <span id="progressText">0 / 0 cards generated</span>
                            <span id="estimatedTime">Estimated time: --</span>
                        </div>
                        <button id="downloadBatch" class="btn-download" style="display: none;">Download All Cards</button>
                    </div>
                </div>
            </div>
        </section>
    </main>

    <!-- Footer -->
    <footer class="scp-footer">
        <p>&copy; 2024 SCP Foundation - Secure, Contain, Protect</p>
    </footer>

    <!-- Scripts -->
    <script src="js/client/site-manager.js"></script>
    <script src="js/client/card-generator.js"></script>
    <script src="js/client/batch-processor.js"></script>
    <script src="js/client/ui-controller.js"></script>
    <script src="js/client/app.js"></script>
</body>
</html>
```

### CSS Structure for Single Page
```css
/* Variables SCP */
:root {
    --scp-black: #000000;
    --scp-white: #ffffff;
    --scp-red: #cc0000;
    --scp-gray: #333333;
    --researcher-color: #2c5aa0;
    --security-color: #8b0000;
    --dclass-color: #ff4500;
    --o5-color: #000000;
}

/* Layout principal */
.main-content {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
}

/* Sélecteur de type de carte */
.card-type-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin-bottom: 40px;
}

.card-type-option {
    border: 2px solid transparent;
    border-radius: 8px;
    padding: 20px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
}

.card-type-option.active {
    border-color: var(--scp-red);
    background-color: rgba(204, 0, 0, 0.1);
}

/* Interface de génération */
.form-preview-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 40px;
    align-items: start;
}

.card-form {
    background: #f8f8f8;
    padding: 30px;
    border-radius: 8px;
    border-left: 4px solid var(--scp-red);
}

.card-preview {
    background: #ffffff;
    padding: 30px;
    border-radius: 8px;
    border: 1px solid #ddd;
    text-align: center;
}

/* Mode batch */
.batch-interface {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 30px;
}

.file-upload-area {
    border: 2px dashed #ccc;
    border-radius: 8px;
    padding: 40px;
    text-align: center;
    transition: border-color 0.3s ease;
}

.file-upload-area:hover {
    border-color: var(--scp-red);
}

/* Responsive */
@media (max-width: 768px) {
    .form-preview-container,
    .batch-interface {
        grid-template-columns: 1fr;
    }
    
    .card-type-grid {
        grid-template-columns: 1fr 1fr;
    }
}

@media (max-width: 480px) {
    .card-type-grid {
        grid-template-columns: 1fr;
    }
}
```

### JavaScript Module Structure
```javascript
// app.js - Point d'entrée principal
document.addEventListener('DOMContentLoaded', () => {
    const app = new SCPCardApp();
    app.initialize();
});

class SCPCardApp {
    constructor() {
        this.uiController = new UIController();
        this.cardGenerator = new SCPCardGenerator();
        this.siteManager = new ClientSiteManager();
        this.batchProcessor = new ClientBatchProcessor();
    }
    
    async initialize() {
        await this.loadInitialData();
        this.setupEventListeners();
        this.uiController.initializeInterface();
    }
    
    async loadInitialData() {
        // Charger les sites et départements
        await this.siteManager.loadSites();
        
        // Initialiser les templates de cartes
        await this.cardGenerator.loadTemplates();
    }
}
```