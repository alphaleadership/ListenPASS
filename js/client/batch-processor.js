/**
 * Client Batch Processor - Gestion du traitement en lot côté client
 */
class ClientBatchProcessor {
    constructor() {
        try {
            this.apiClient = new APIClient();
        } catch (error) {
            console.warn('APIClient not available, batch processor will work in offline mode:', error);
            this.apiClient = null;
        }
        
        this.currentBatch = null;
        this.progressCallback = null;
        
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        try {
            // Gestion du drag and drop
            const uploadArea = document.getElementById('uploadArea');
            if (uploadArea) {
                uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
                uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
                uploadArea.addEventListener('drop', this.handleDrop.bind(this));
            }
        } catch (error) {
            console.warn('Could not initialize event listeners for batch processor:', error);
        }
    }
    
    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    }
    
    handleDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    }
    
    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.uploadFile(files[0]);
        }
    }
    
    async uploadFile(file) {
        try {
            // Enhanced file validation
            if (window.PersonnelValidator) {
                try {
                    const validator = new PersonnelValidator();
                    const fileValidation = validator.validateFile(file, 'batchFile');
                    
                    if (!fileValidation.isValid) {
                        if (window.errorHandler) {
                            window.errorHandler.handleValidationErrors(fileValidation.errors);
                        }
                        throw new ValidationError('file', 'File validation failed', 'FILE_VALIDATION_FAILED', {
                            errors: fileValidation.errors
                        });
                    }
                } catch (error) {
                    console.warn('Enhanced validation failed, using basic validation:', error);
                    if (!this.validateFileBasic(file)) {
                        throw new ValidationError('file', 'Type de fichier non supporté. Utilisez CSV, JSON, ou Excel.', 'INVALID_FILE_TYPE');
                    }
                }
            } else if (!this.validateFileBasic(file)) {
                throw new ValidationError('file', 'Type de fichier non supporté. Utilisez CSV, JSON, ou Excel.', 'INVALID_FILE_TYPE');
            }
            
            this.showProgress(0, 'Upload du fichier...');
            
            // Upload vers le serveur
            const uploadResult = await this.uploadToServer(file);
            
            this.showProgress(50, 'Validation des données...');
            
            // Afficher un aperçu des données
            this.showDataPreview(uploadResult);
            
            this.showProgress(100, 'Prêt pour la génération');
            
            // Stocker les données pour la génération
            this.currentBatch = {
                fileId: uploadResult.fileId,
                preview: uploadResult.preview,
                validation: uploadResult,
                file: file
            };
            
            // Afficher les options de génération
            this.showGenerationOptions();
            
        } catch (error) {
            this.hideProgress();
            
            // Enhanced error handling
            if (window.errorHandler) {
                if (error.name === 'ValidationError') {
                    window.errorHandler.handleValidationErrors([error]);
                } else {
                    window.errorHandler.showNotification({
                        title: 'Upload Error',
                        message: error.message,
                        type: 'error',
                        autoHide: false
                    });
                }
            }
            
            throw error;
        }
    }
    
    async uploadToServer(file) {
        const formData = new FormData();
        formData.append('dataFile', file);
        
        try {
            const response = await fetch('/api/upload-data', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erreur lors de l\'upload');
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Upload échoué');
            }
            
            return result;
            
        } catch (error) {
            console.error('Erreur upload serveur:', error);
            
            // Create enhanced error with context
            const enhancedError = new ValidationError(
                'upload',
                `Server upload failed: ${error.message}`,
                'SERVER_UPLOAD_ERROR',
                { originalError: error.message, timestamp: new Date().toISOString() }
            );
            
            throw enhancedError;
        }
    }
    
    validateFileBasic(file) {
        const allowedTypes = [
            'text/csv',
            'application/json',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        
        const allowedExtensions = ['.csv', '.json', '.xls', '.xlsx'];
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        
        return allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension);
    }
    
    // Keep the old method for backward compatibility
    validateFile(file) {
        return this.validateFileBasic(file);
    }
    
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                resolve(e.target.result);
            };
            
            reader.onerror = () => {
                reject(new Error('Erreur lors de la lecture du fichier'));
            };
            
            if (file.type === 'application/json' || file.name.endsWith('.json')) {
                reader.readAsText(file);
            } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
                reader.readAsText(file);
            } else {
                // Pour Excel, on lit en ArrayBuffer (nécessiterait une librairie comme xlsx)
                reader.readAsArrayBuffer(file);
            }
        });
    }
    
    async parseFileContent(content, fileType) {
        if (fileType === 'application/json' || fileType.includes('json')) {
            return this.parseJSON(content);
        } else if (fileType === 'text/csv' || fileType.includes('csv')) {
            return this.parseCSV(content);
        } else {
            // Pour Excel, on aurait besoin d'une librairie externe
            throw new Error('Format Excel non encore supporté. Utilisez CSV ou JSON.');
        }
    }
    
    parseJSON(content) {
        try {
            const data = JSON.parse(content);
            
            // Vérifier si c'est un tableau ou un objet avec une propriété personnel
            if (Array.isArray(data)) {
                return data;
            } else if (data.personnel && Array.isArray(data.personnel)) {
                return data.personnel;
            } else {
                throw new Error('Format JSON invalide. Attendu: tableau ou objet avec propriété "personnel"');
            }
        } catch (error) {
            throw new Error(`Erreur de parsing JSON: ${error.message}`);
        }
    }
    
    parseCSV(content) {
        const lines = content.split('\n').filter(line => line.trim() !== '');
        if (lines.length < 2) {
            throw new Error('Fichier CSV vide ou invalide');
        }
        
        // Première ligne = headers
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        // Mapper les headers vers les champs attendus
        const fieldMapping = this.getCSVFieldMapping(headers);
        
        const personnel = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            
            if (values.length !== headers.length) {
                console.warn(`Ligne ${i + 1} ignorée: nombre de colonnes incorrect`);
                continue;
            }
            
            const person = {};
            headers.forEach((header, index) => {
                const mappedField = fieldMapping[header];
                if (mappedField && values[index]) {
                    person[mappedField] = values[index];
                }
            });
            
            if (person.fullName && person.employeeId) {
                personnel.push(person);
            }
        }
        
        return personnel;
    }
    
    getCSVFieldMapping(headers) {
        const mapping = {};
        
        headers.forEach(header => {
            const lowerHeader = header.toLowerCase();
            
            if (lowerHeader.includes('name') || lowerHeader.includes('nom')) {
                mapping[header] = 'fullName';
            } else if (lowerHeader.includes('id') || lowerHeader.includes('employee')) {
                mapping[header] = 'employeeId';
            } else if (lowerHeader.includes('site')) {
                mapping[header] = 'siteDesignation';
            } else if (lowerHeader.includes('department') || lowerHeader.includes('dept')) {
                mapping[header] = 'department';
            } else if (lowerHeader.includes('clearance') || lowerHeader.includes('level')) {
                mapping[header] = 'clearanceLevel';
            } else if (lowerHeader.includes('position') || lowerHeader.includes('poste')) {
                mapping[header] = 'position';
            } else if (lowerHeader.includes('birth') || lowerHeader.includes('naissance')) {
                mapping[header] = 'dateOfBirth';
            } else if (lowerHeader.includes('issue') || lowerHeader.includes('emission')) {
                mapping[header] = 'issueDate';
            } else if (lowerHeader.includes('expir') || lowerHeader.includes('expiration')) {
                mapping[header] = 'expirationDate';
            }
        });
        
        return mapping;
    }
    
    async validateBatchData(personnelData) {
        const results = {
            total: personnelData.length,
            valid: 0,
            invalid: 0,
            errors: [],
            warnings: [],
            siteDistribution: {}
        };
        
        const siteManager = new ClientSiteManager();
        await siteManager.loadSites();
        
        personnelData.forEach((person, index) => {
            const validation = this.validatePersonRecord(person, siteManager, index);
            
            if (validation.isValid) {
                results.valid++;
                
                // Compter la distribution par site
                const site = person.siteDesignation || 'Unknown';
                results.siteDistribution[site] = (results.siteDistribution[site] || 0) + 1;
            } else {
                results.invalid++;
                results.errors.push(...validation.errors);
            }
            
            results.warnings.push(...validation.warnings);
        });
        
        return results;
    }
    
    validatePersonRecord(person, siteManager, index) {
        const errors = [];
        const warnings = [];
        
        // Champs requis
        if (!person.fullName || person.fullName.trim() === '') {
            errors.push({ index, field: 'fullName', message: 'Nom complet requis' });
        }
        
        if (!person.employeeId || person.employeeId.trim() === '') {
            errors.push({ index, field: 'employeeId', message: 'ID employé requis' });
        } else if (!/^SCP-\d{4}-\d{3}$/.test(person.employeeId)) {
            errors.push({ index, field: 'employeeId', message: 'Format ID invalide (SCP-0000-000)' });
        }
        
        // Validation du site
        if (person.siteDesignation) {
            const site = siteManager.getSite(person.siteDesignation);
            if (!site) {
                errors.push({ index, field: 'siteDesignation', message: `Site ${person.siteDesignation} inconnu` });
            } else {
                // Validation du niveau de clearance pour le site
                if (person.clearanceLevel && !siteManager.validateSiteAccess(person.siteDesignation, parseInt(person.clearanceLevel))) {
                    errors.push({ index, field: 'clearanceLevel', message: `Niveau de clearance ${person.clearanceLevel} non autorisé pour ${person.siteDesignation}` });
                }
                
                // Validation du département
                if (person.department) {
                    const departments = site.departments;
                    const dept = departments.find(d => d.departmentId === person.department || d.name === person.department);
                    if (!dept) {
                        warnings.push({ index, field: 'department', message: `Département ${person.department} non trouvé sur ${person.siteDesignation}` });
                    }
                }
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
    
    showProgress(percentage, message) {
        const progressSection = document.getElementById('batchProgress');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (progressSection) {
            progressSection.style.display = 'block';
        }
        
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        
        if (progressText) {
            progressText.textContent = message;
        }
    }
    
    hideProgress() {
        const progressSection = document.getElementById('batchProgress');
        if (progressSection) {
            progressSection.style.display = 'none';
        }
    }
    
    showDataPreview(uploadResult) {
        // Créer un aperçu des données dans l'interface
        const previewHTML = `
            <div class="batch-preview">
                <h4>Aperçu des données</h4>
                <div class="stats">
                    <div class="stat">
                        <span class="label">Total:</span>
                        <span class="value">${uploadResult.totalRecords}</span>
                    </div>
                    <div class="stat valid">
                        <span class="label">Valides:</span>
                        <span class="value">${uploadResult.validRecords}</span>
                    </div>
                    <div class="stat invalid">
                        <span class="label">Invalides:</span>
                        <span class="value">${uploadResult.invalidRecords}</span>
                    </div>
                </div>
                
                ${uploadResult.invalidRecords > 0 ? `
                    <div class="errors">
                        <h5>Erreurs détectées:</h5>
                        <ul>
                            ${uploadResult.errors.slice(0, 5).map(error => 
                                `<li>${error}</li>`
                            ).join('')}
                            ${uploadResult.errors.length > 5 ? `<li>... et ${uploadResult.errors.length - 5} autres erreurs</li>` : ''}
                        </ul>
                    </div>
                ` : ''}
                
                <div class="site-distribution">
                    <h5>Distribution par site:</h5>
                    <ul>
                        ${Object.entries(uploadResult.siteDistribution).map(([site, count]) => 
                            `<li>${site}: ${count} personnel(s)</li>`
                        ).join('')}
                    </ul>
                </div>
                
                <div class="data-preview">
                    <h5>Aperçu des premières entrées:</h5>
                    <div class="preview-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Nom</th>
                                    <th>ID Employé</th>
                                    <th>Site</th>
                                    <th>Département</th>
                                    <th>Clearance</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${uploadResult.preview.map(person => `
                                    <tr>
                                        <td>${person.fullName || 'N/A'}</td>
                                        <td>${person.employeeId || 'N/A'}</td>
                                        <td>${person.siteDesignation || 'N/A'}</td>
                                        <td>${person.department || 'N/A'}</td>
                                        <td>${person.clearanceLevel || 'N/A'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        // Injecter dans l'interface
        const batchInterface = document.querySelector('.batch-interface');
        if (batchInterface) {
            let previewContainer = batchInterface.querySelector('.batch-preview-container');
            if (!previewContainer) {
                previewContainer = document.createElement('div');
                previewContainer.className = 'batch-preview-container';
                batchInterface.appendChild(previewContainer);
            }
            previewContainer.innerHTML = previewHTML;
        }
    }
    
    showGenerationOptions() {
        const optionsHTML = `
            <div class="generation-options">
                <h4>Options de génération</h4>
                <div class="options-form">
                    <div class="option-group">
                        <label for="outputFormat">Format de sortie:</label>
                        <select id="outputFormat">
                            <option value="png">PNG (Recommandé)</option>
                            <option value="jpg">JPG</option>
                            <option value="pdf">PDF</option>
                        </select>
                    </div>
                    
                    <div class="option-group">
                        <label for="resolution">Résolution:</label>
                        <select id="resolution">
                            <option value="150">150 DPI (Web)</option>
                            <option value="300" selected>300 DPI (Print)</option>
                            <option value="600">600 DPI (Haute qualité)</option>
                        </select>
                    </div>
                    
                    <div class="option-group">
                        <label>
                            <input type="checkbox" id="includeInvalid">
                            Inclure les cartes avec erreurs (avec watermark)
                        </label>
                    </div>
                    
                    <div class="actions">
                        <button type="button" id="startBatchGeneration" class="btn-primary">
                            <span class="material-symbols-outlined">play_arrow</span>
                            Démarrer la génération (${this.currentBatch?.validation.validRecords || 0} cartes)
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        const batchInterface = document.querySelector('.batch-interface');
        if (batchInterface) {
            let optionsContainer = batchInterface.querySelector('.generation-options-container');
            if (!optionsContainer) {
                optionsContainer = document.createElement('div');
                optionsContainer.className = 'generation-options-container';
                batchInterface.appendChild(optionsContainer);
            }
            optionsContainer.innerHTML = optionsHTML;
            
            // Ajouter l'event listener pour le bouton de génération
            const startBtn = document.getElementById('startBatchGeneration');
            if (startBtn) {
                startBtn.addEventListener('click', () => {
                    this.startBatchGeneration();
                });
            }
        }
    }
    
    async startBatchGeneration() {
        if (!this.currentBatch) {
            throw new Error('Aucun batch de données disponible');
        }
        
        const config = {
            outputFormat: document.getElementById('outputFormat')?.value || 'png',
            resolution: parseInt(document.getElementById('resolution')?.value) || 300,
            includeInvalid: document.getElementById('includeInvalid')?.checked || false
        };
        
        try {
            // Démarrer la génération côté serveur
            await this.generateCardsOnServer(this.currentBatch.fileId, config);
        } catch (error) {
            console.error('Erreur lors de la génération en lot:', error);
            
            // Enhanced batch error handling
            if (window.errorHandler) {
                if (error.name === 'ValidationError') {
                    window.errorHandler.handleValidationErrors([error]);
                } else {
                    window.errorHandler.showNotification({
                        title: 'Batch Generation Error',
                        message: error.message,
                        type: 'error',
                        autoHide: false,
                        actions: [{
                            label: 'Retry',
                            action: () => this.startBatchGeneration()
                        }]
                    });
                }
            }
            
            throw error;
        }
    }
    
    async generateCardsOnServer(fileId, config) {
        try {
            this.showProgress(0, 'Démarrage de la génération côté serveur...');
            
            // Démarrer la génération en lot
            const response = await fetch('/api/batch-generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fileId: fileId,
                    config: config
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erreur lors du démarrage de la génération');
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Échec du démarrage de la génération');
            }
            
            // Suivre le progrès
            await this.trackBatchProgress(result.batchId);
            
        } catch (error) {
            console.error('Erreur génération serveur:', error);
            throw new Error(`Erreur serveur: ${error.message}`);
        }
    }
    
    async trackBatchProgress(batchId) {
        const pollInterval = 2000; // 2 secondes
        let isCompleted = false;
        
        while (!isCompleted) {
            try {
                const response = await fetch(`/api/batch-status/${batchId}`);
                
                if (!response.ok) {
                    throw new Error('Erreur lors de la récupération du statut');
                }
                
                const status = await response.json();
                
                // Mettre à jour l'interface
                this.showProgress(
                    status.progress, 
                    `Génération en cours: ${status.processedCards}/${status.totalCards} cartes`
                );
                
                if (status.status === 'completed') {
                    isCompleted = true;
                    this.showProgress(100, 'Génération terminée!');
                    
                    // Afficher le bouton de téléchargement
                    this.showDownloadButton(batchId);
                    
                } else if (status.status === 'failed') {
                    isCompleted = true;
                    throw new Error('La génération a échoué');
                    
                } else if (status.status === 'processing') {
                    // Continuer à surveiller
                    await new Promise(resolve => setTimeout(resolve, pollInterval));
                }
                
            } catch (error) {
                console.error('Erreur suivi progression:', error);
                isCompleted = true;
                throw error;
            }
        }
    }
    
    showDownloadButton(batchId) {
        const downloadHTML = `
            <div class="download-section">
                <h4>Génération terminée!</h4>
                <p>Votre lot de cartes est prêt à être téléchargé.</p>
                <div class="download-actions">
                    <a href="/api/download-batch/${batchId}" 
                       class="btn-primary download-btn"
                       download="scp-cards-batch-${batchId}.zip">
                        <span class="material-symbols-outlined">download</span>
                        Télécharger l'archive ZIP
                    </a>
                    <button type="button" class="btn-secondary" onclick="window.location.reload()">
                        <span class="material-symbols-outlined">refresh</span>
                        Nouvelle génération
                    </button>
                </div>
            </div>
        `;
        
        const batchInterface = document.querySelector('.batch-interface');
        if (batchInterface) {
            let downloadContainer = batchInterface.querySelector('.download-container');
            if (!downloadContainer) {
                downloadContainer = document.createElement('div');
                downloadContainer.className = 'download-container';
                batchInterface.appendChild(downloadContainer);
            }
            downloadContainer.innerHTML = downloadHTML;
        }
    }
    
    async generateCardsLocally(personnelData, config) {
        const validPersonnel = personnelData.filter(person => 
            person.fullName && person.employeeId
        );
        
        this.showProgress(0, 'Démarrage de la génération...');
        
        const generatedCards = [];
        
        for (let i = 0; i < validPersonnel.length; i++) {
            const person = validPersonnel[i];
            
            try {
                // Déterminer le type de carte basé sur les données
                const cardType = this.determineCardType(person);
                
                // Créer un générateur temporaire
                const generator = new SCPCardGenerator(cardType, 'client');
                
                // Générer la carte
                generator.generateCard(person);
                
                // Exporter (simulation pour l'instant)
                const cardData = {
                    employeeId: person.employeeId,
                    cardType: cardType,
                    generated: true
                };
                
                generatedCards.push(cardData);
                
                // Mettre à jour le progrès
                const progress = ((i + 1) / validPersonnel.length) * 100;
                this.showProgress(progress, `Génération ${i + 1}/${validPersonnel.length}...`);
                
                // Petite pause pour éviter de bloquer l'interface
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.error(`Erreur génération carte ${person.employeeId}:`, error);
            }
        }
        
        this.showProgress(100, `Génération terminée: ${generatedCards.length} cartes créées`);
        
        // Afficher les résultats
        this.showBatchResults(generatedCards);
    }
    
    determineCardType(person) {
        // Logique pour déterminer le type de carte
        if (person.siteDesignation && person.siteDesignation.startsWith('MTF-')) {
            return 'mtf';
        } else if (person.department && person.department.toLowerCase().includes('security')) {
            return 'security';
        } else if (person.employeeId && person.employeeId.includes('D-')) {
            return 'dclass';
        } else if (person.clearanceLevel && parseInt(person.clearanceLevel) === 5 && !person.siteDesignation?.startsWith('MTF-')) {
            return 'o5';
        } else {
            return 'researcher';
        }
    }
    
    showBatchResults(generatedCards) {
        const resultsHTML = `
            <div class="batch-results">
                <h4>Résultats de la génération</h4>
                <div class="results-summary">
                    <p><strong>${generatedCards.length}</strong> cartes générées avec succès</p>
                </div>
                
                <div class="results-actions">
                    <button type="button" class="btn-secondary" onclick="window.location.reload()">
                        <span class="material-symbols-outlined">refresh</span>
                        Nouvelle génération
                    </button>
                </div>
                
                <div class="results-list">
                    <h5>Cartes générées:</h5>
                    <ul>
                        ${generatedCards.slice(0, 10).map(card => 
                            `<li>${card.employeeId} (${card.cardType})</li>`
                        ).join('')}
                        ${generatedCards.length > 10 ? `<li>... et ${generatedCards.length - 10} autres</li>` : ''}
                    </ul>
                </div>
            </div>
        `;
        
        const batchInterface = document.querySelector('.batch-interface');
        if (batchInterface) {
            let resultsContainer = batchInterface.querySelector('.batch-results-container');
            if (!resultsContainer) {
                resultsContainer = document.createElement('div');
                resultsContainer.className = 'batch-results-container';
                batchInterface.appendChild(resultsContainer);
            }
            resultsContainer.innerHTML = resultsHTML;
        }
    }
}

// Make class globally available
window.ClientBatchProcessor = ClientBatchProcessor;