/**
 * UI Controller - Contrôleur principal de l'interface utilisateur
 * Gère les interactions et la coordination entre les différents modules
 */
class UIController {
    constructor() {
        this.cardInterface = new UnifiedCardInterface();
        this.siteManager = new ClientSiteManager();
        this.batchProcessor = new ClientBatchProcessor();
        this.cardGenerator = null;
        
        // Recursion prevention flags
        this.isInitializingCardGenerator = false;
        this.classReadyRetryCount = 0;
        
        this.initializeEventListeners();
        this.initializeInterface();
    }
    
    initializeEventListeners() {
        // Sélection du type de carte
        const cardTypeOptions = document.querySelectorAll('.card-type-option');
        cardTypeOptions.forEach(option => {
            // Click event
            option.addEventListener('click', (e) => {
                const cardType = option.dataset.type;
                this.switchCardType(cardType);
            });
            
            // Keyboard navigation
            option.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const cardType = option.dataset.type;
                    this.switchCardType(cardType);
                } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.focusNextCardType(option);
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.focusPreviousCardType(option);
                }
            });
        });
        
        // Basculement mode single/batch
        const modeToggle = document.getElementById('modeToggle');
        if (modeToggle) {
            modeToggle.addEventListener('change', (e) => {
                this.toggleMode(e.target.checked ? 'batch' : 'single');
            });
        }
        
        // Sélection du site
        const siteSelector = document.getElementById('siteDesignation');
        if (siteSelector) {
            siteSelector.addEventListener('change', (e) => {
                this.loadDepartments(e.target.value);
            });
        }
        
        // Génération de carte
        const generateBtn = document.getElementById('generateCard');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                this.generateCard();
            });
        }
        
        // Export de carte
        const exportBtn = document.getElementById('exportCard');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportCard();
            });
        }
        
        // Upload de fichier batch
        const batchFile = document.getElementById('batchFile');
        if (batchFile) {
            batchFile.addEventListener('change', (e) => {
                this.handleBatchFileUpload(e.target.files[0]);
            });
        }
        
        // Drag and drop pour batch
        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('drag-over');
            });
            
            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('drag-over');
            });
            
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('drag-over');
                const file = e.dataTransfer.files[0];
                if (file) {
                    this.handleBatchFileUpload(file);
                }
            });
        }
        
        // Only validation events (preview is handled by card generator)
        const formInputs = document.querySelectorAll('#personnelForm input, #personnelForm select');
        formInputs.forEach(input => {
            // Only validation on blur to avoid conflicts with card generator
            input.addEventListener('blur', () => {
                this.validateFieldOnBlur(input);
            });
            
            // Gestion spéciale pour les sélecteurs
            if (input.tagName === 'SELECT') {
                input.addEventListener('change', () => {
                    this.handleSelectChange(input);
                });
            }
        });
        
        console.log('✅ UI Controller event listeners initialized (validation only)');
    }
    
    async initializeInterface() {
        try {
            // Charger les sites disponibles
            await this.siteManager.loadSites();
            this.populateSiteSelector();
            
            // Charger la préférence de mode
            const savedMode = this.loadModePreference();
            this.toggleMode(savedMode);
            
            // Définir les dates par défaut
            this.setDefaultDates();
            
            // Ajouter les fonctionnalités intelligentes
            this.addFormSmartFeatures();
            
            // Initialiser avec le type de carte par défaut (après un délai pour s'assurer que tous les modules sont chargés)
            setTimeout(() => {
                this.switchCardType('researcher');
                this.initializePendingCardGenerator();
            }, 100);
            
        } catch (error) {
            console.error('Erreur lors de l\'initialisation:', error);
            this.showError('Erreur lors du chargement de l\'interface');
        }
    }
    
    initializePendingCardGenerator() {
        // Initialiser le générateur de cartes si il était en attente
        if (this.pendingCardType && window.SCPCardGenerator && !this.cardGenerator) {
            try {
                this.cardGenerator = new SCPCardGenerator(this.pendingCardType, 'client');
                this.pendingCardType = null;
                console.log('✅ Card generator initialized');
                
                // Don't call updatePreview here to avoid recursion
                // The preview will be updated when the user interacts with the form
            } catch (error) {
                console.error('Failed to initialize card generator:', error);
            }
        }
    }
    
    waitForSCPCardGenerator() {
        return new Promise((resolve, reject) => {
            // If already available, resolve immediately
            if (window.SCPCardGenerator) {
                console.log('✅ SCPCardGenerator already available');
                resolve(window.SCPCardGenerator);
                return;
            }
            
            console.log('⏳ Waiting for SCPCardGenerator to load...');
            
            // Listen for the specific card generator loaded event
            const handleCardGeneratorLoaded = (event) => {
                console.log('🎉 Received scpCardGeneratorLoaded event:', event.detail);
                if (window.SCPCardGenerator) {
                    resolve(window.SCPCardGenerator);
                } else {
                    console.error('❌ Event fired but SCPCardGenerator still not available');
                    reject(new Error('SCPCardGenerator event fired but class not available'));
                }
            };
            
            document.addEventListener('scpCardGeneratorLoaded', handleCardGeneratorLoaded, { once: true });
            
            // Fallback: Set up a check interval with more detailed logging
            let attempts = 0;
            const maxAttempts = 30; // 3 seconds max
            
            const checkInterval = setInterval(() => {
                attempts++;
                console.log(`🔍 Attempt ${attempts}/${maxAttempts}: Checking for SCPCardGenerator...`);
                console.log('- window.SCPCardGenerator:', typeof window.SCPCardGenerator);
                console.log('- SCP_CARD_GENERATOR_LOADED flag:', window.SCP_CARD_GENERATOR_LOADED);
                
                if (window.SCPCardGenerator) {
                    clearInterval(checkInterval);
                    document.removeEventListener('scpCardGeneratorLoaded', handleCardGeneratorLoaded);
                    console.log('✅ SCPCardGenerator found after', attempts * 100, 'ms');
                    resolve(window.SCPCardGenerator);
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkInterval);
                    document.removeEventListener('scpCardGeneratorLoaded', handleCardGeneratorLoaded);
                    
                    // Detailed error information
                    console.error('❌ Timeout waiting for SCPCardGenerator');
                    console.error('Debug info:');
                    console.error('- SCP_CARD_GENERATOR_LOADED:', window.SCP_CARD_GENERATOR_LOADED);
                    console.error('- SCP_CARD_GENERATOR_TIMESTAMP:', window.SCP_CARD_GENERATOR_TIMESTAMP);
                    console.error('- Available SCP keys:', Object.keys(window).filter(k => k.includes('SCP')));
                    console.error('- Available Card keys:', Object.keys(window).filter(k => k.includes('Card')));
                    
                    reject(new Error('SCPCardGenerator not available after timeout'));
                }
            }, 100);
        });
    }
    
    async initializeCardGenerator(cardType) {
        // Prevent recursion
        if (this.isInitializingCardGenerator) {
            console.log('Card generator initialization already in progress');
            return;
        }
        
        this.isInitializingCardGenerator = true;
        
        try {
            // Wait for SCPCardGenerator to be available
            await this.waitForSCPCardGenerator();
            
            // Create the card generator
            this.cardGenerator = new SCPCardGenerator(cardType, 'client');
            console.log('✅ Card generator created for type:', cardType);
            
            // Clear any pending type
            this.pendingCardType = null;
            
        } catch (error) {
            console.error('Failed to initialize card generator:', error);
            this.pendingCardType = cardType;
            
            // Show user-friendly error
            this.showError('Card generator is loading, please wait...');
        } finally {
            // Always clear the flag
            this.isInitializingCardGenerator = false;
        }
    }
    
    switchCardType(cardType) {
        // Animation de sélection
        const selectedOption = document.querySelector(`[data-type="${cardType}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selecting');
            setTimeout(() => {
                selectedOption.classList.remove('selecting');
                selectedOption.classList.add('selected');
                setTimeout(() => selectedOption.classList.remove('selected'), 200);
            }, 150);
        }
        
        // Mettre à jour la sélection visuelle
        document.querySelectorAll('.card-type-option').forEach(option => {
            option.classList.remove('active');
            option.setAttribute('aria-pressed', 'false');
        });
        
        if (selectedOption) {
            selectedOption.classList.add('active');
            selectedOption.setAttribute('aria-pressed', 'true');
        }
        
        // Mettre à jour l'interface
        this.cardInterface.switchCardType(cardType);
        
        // Créer un nouveau générateur pour ce type (avec attente si nécessaire)
        this.initializeCardGenerator(cardType);
        
        // Mettre à jour les niveaux de clearance disponibles
        this.updateClearanceLevels(cardType);
        
        // Mettre à jour la visibilité des champs selon le type
        this.updateFormFieldsVisibility(cardType);
        
        // Mettre à jour les champs requis/optionnels
        this.updateFieldRequirements(cardType);
        
        // Réinitialiser le formulaire avec les valeurs par défaut
        this.resetFormForCardType(cardType);
        
        // Afficher les changements de formulaire
        this.highlightFormChanges();
        
        // Mettre à jour le preview
        this.updatePreview();
        
        // Annoncer le changement pour l'accessibilité
        this.announceCardTypeChange(cardType);
    } 
    
    toggleMode(mode) {
        const singleMode = document.getElementById('singleCardMode');
        const batchMode = document.getElementById('batchCardMode');
        const modeToggle = document.getElementById('modeToggle');
        
        // Animation de transition
        this.animateModeTransition(mode);
        
        if (mode === 'batch') {
            singleMode.classList.remove('active');
            batchMode.classList.add('active');
            if (modeToggle) modeToggle.checked = true;
            
            // Initialiser l'interface batch si nécessaire
            this.initializeBatchInterface();
        } else {
            singleMode.classList.add('active');
            batchMode.classList.remove('active');
            if (modeToggle) modeToggle.checked = false;
            
            // Réinitialiser l'interface single si nécessaire
            this.initializeSingleInterface();
        }
        
        this.cardInterface.toggleMode(mode);
        
        // Annoncer le changement de mode pour l'accessibilité
        this.announceModeChange(mode);
        
        // Sauvegarder la préférence utilisateur
        this.saveModePreference(mode);
    }
    
    async loadDepartments(siteId) {
        if (!siteId) {
            this.clearDepartmentSelector();
            return;
        }
        
        try {
            const departments = await this.siteManager.getDepartments(siteId);
            this.populateDepartmentSelector(departments);
        } catch (error) {
            console.error('Erreur lors du chargement des départements:', error);
            this.showError('Erreur lors du chargement des départements');
        }
    }
    
    populateSiteSelector() {
        const siteSelector = document.getElementById('siteDesignation');
        const allFacilities = this.siteManager.getAllSites();
        
        // Séparer les sites et les MTF
        const sites = allFacilities.filter(f => f.isSite());
        const mtfs = allFacilities.filter(f => f.isMTF());
        
        // Vider les options existantes (sauf la première)
        while (siteSelector.children.length > 1) {
            siteSelector.removeChild(siteSelector.lastChild);
        }
        
        // Ajouter un groupe pour les sites
        if (sites.length > 0) {
            const sitesGroup = document.createElement('optgroup');
            sitesGroup.label = 'Foundation Sites';
            
            sites.forEach(site => {
                const option = document.createElement('option');
                option.value = site.siteId;
                option.textContent = `${site.siteId} - ${site.siteName}`;
                sitesGroup.appendChild(option);
            });
            
            siteSelector.appendChild(sitesGroup);
        }
        
        // Ajouter un groupe pour les MTF
        if (mtfs.length > 0) {
            const mtfGroup = document.createElement('optgroup');
            mtfGroup.label = 'Mobile Task Forces';
            
            mtfs.forEach(mtf => {
                const option = document.createElement('option');
                option.value = mtf.siteId;
                option.textContent = mtf.getDisplayName();
                option.dataset.type = 'mtf';
                mtfGroup.appendChild(option);
            });
            
            siteSelector.appendChild(mtfGroup);
        }
    }
    
    populateDepartmentSelector(departments) {
        const deptSelector = document.getElementById('department');
        
        // Vider les options existantes (sauf la première)
        while (deptSelector.children.length > 1) {
            deptSelector.removeChild(deptSelector.lastChild);
        }
        
        // Ajouter les départements avec informations détaillées
        departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.departmentId;
            option.textContent = `${dept.name} (Clearance ${dept.requiredClearance}+)`;
            option.dataset.requiredClearance = dept.requiredClearance;
            deptSelector.appendChild(option);
        });
        
        // Ajouter un indicateur visuel si des départements sont disponibles
        this.updateDepartmentSelectorState(departments.length > 0);
    }
    
    clearDepartmentSelector() {
        const deptSelector = document.getElementById('department');
        while (deptSelector.children.length > 1) {
            deptSelector.removeChild(deptSelector.lastChild);
        }
    }
    
    updateClearanceLevels(cardType) {
        const clearanceSelector = document.getElementById('clearanceLevel');
        const cardTypeConfig = this.cardInterface.cardTypes[cardType];
        
        if (!clearanceSelector || !cardTypeConfig) return;
        
        // Vider les options existantes (sauf la première)
        while (clearanceSelector.children.length > 1) {
            clearanceSelector.removeChild(clearanceSelector.lastChild);
        }
        
        // Ajouter les niveaux de clearance disponibles
        cardTypeConfig.clearanceLevels.forEach(level => {
            const option = document.createElement('option');
            option.value = level;
            option.textContent = level === 0 ? 'Level 0 (D-Class)' : `Level ${level}`;
            clearanceSelector.appendChild(option);
        });
        
        // Sélectionner automatiquement le premier niveau disponible pour certains types
        if (cardType === 'dclass') {
            clearanceSelector.value = '0';
        } else if (cardType === 'o5') {
            clearanceSelector.value = '5';
        }
    }
    
    updateFormFieldsVisibility(cardType) {
        const cardTypeConfig = this.cardInterface.cardTypes[cardType];
        if (!cardTypeConfig) return;
        
        // Gérer la visibilité des champs selon le type de carte
        const fieldVisibilityRules = {
            researcher: {
                show: ['siteDesignation', 'department', 'clearanceLevel', 'position', 'emergencyContact'],
                hide: []
            },
            security: {
                show: ['siteDesignation', 'department', 'clearanceLevel', 'position', 'emergencyContact'],
                hide: []
            },
            dclass: {
                show: ['siteDesignation', 'expirationDate'],
                hide: ['department', 'position', 'emergencyContact']
            },
            o5: {
                show: ['position'],
                hide: ['siteDesignation', 'department', 'emergencyContact']
            },
            mtf: {
                show: ['siteDesignation', 'department', 'clearanceLevel', 'position', 'emergencyContact'],
                hide: []
            }
        };
        
        const rules = fieldVisibilityRules[cardType] || fieldVisibilityRules.researcher;
        
        // Afficher les champs requis
        rules.show.forEach(fieldName => {
            const field = document.getElementById(fieldName);
            const fieldContainer = field?.closest('.form-field');
            if (fieldContainer) {
                fieldContainer.style.display = 'flex';
            }
        });
        
        // Masquer les champs non nécessaires
        rules.hide.forEach(fieldName => {
            const field = document.getElementById(fieldName);
            const fieldContainer = field?.closest('.form-field');
            if (fieldContainer) {
                fieldContainer.style.display = 'none';
            }
        });
        
        // Gérer les champs spéciaux selon le type
        this.handleSpecialFieldsForCardType(cardType);
    }
    
    handleSpecialFieldsForCardType(cardType) {
        const positionField = document.getElementById('position');
        const expirationField = document.getElementById('expirationDate');
        
        // Mettre à jour les placeholders et labels selon le type
        switch (cardType) {
            case 'researcher':
                if (positionField) {
                    positionField.placeholder = 'e.g., Senior Researcher, Lab Technician';
                }
                break;
                
            case 'security':
                if (positionField) {
                    positionField.placeholder = 'e.g., Security Officer, Agent';
                }
                break;
                
            case 'dclass':
                if (expirationField) {
                    // Pour D-Class, définir une date d'expiration par défaut (30 jours)
                    const today = new Date();
                    const expiry = new Date(today);
                    expiry.setDate(expiry.getDate() + 30);
                    expirationField.value = expiry.toISOString().split('T')[0];
                }
                break;
                
            case 'o5':
                if (positionField) {
                    positionField.placeholder = 'e.g., O5-1, O5-Council Member';
                }
                break;
                
            case 'mtf':
                if (positionField) {
                    positionField.placeholder = 'e.g., Operative, Squad Leader, Specialist';
                }
                break;
        }
    }
    
    updateFieldRequirements(cardType) {
        const cardTypeConfig = this.cardInterface.cardTypes[cardType];
        if (!cardTypeConfig) return;
        
        // Réinitialiser tous les champs comme optionnels
        document.querySelectorAll('#personnelForm input, #personnelForm select').forEach(field => {
            field.removeAttribute('required');
            const label = document.querySelector(`label[for="${field.id}"]`);
            if (label) {
                label.textContent = label.textContent.replace(' *', '');
            }
        });
        
        // Marquer les champs requis pour ce type de carte
        cardTypeConfig.requiredFields.forEach(fieldName => {
            const field = document.getElementById(fieldName);
            if (field) {
                field.setAttribute('required', 'true');
                const label = document.querySelector(`label[for="${fieldName}"]`);
                if (label && !label.textContent.includes(' *')) {
                    label.textContent += ' *';
                }
            }
        });
    }
    
    resetFormForCardType(cardType) {
        // Conserver certaines valeurs communes
        const preserveFields = ['fullName', 'employeeId', 'photo', 'dateOfBirth', 'issueDate'];
        const preservedValues = {};
        
        preserveFields.forEach(fieldName => {
            const field = document.getElementById(fieldName);
            if (field && field.value) {
                preservedValues[fieldName] = field.value;
            }
        });
        
        // Réinitialiser le formulaire
        const form = document.getElementById('personnelForm');
        if (form) {
            form.reset();
        }
        
        // Restaurer les valeurs préservées
        Object.entries(preservedValues).forEach(([fieldName, value]) => {
            const field = document.getElementById(fieldName);
            if (field) {
                field.value = value;
            }
        });
        
        // Remettre les dates par défaut
        this.setDefaultDates();
        
        // Appliquer les valeurs par défaut spécifiques au type
        this.setCardTypeDefaults(cardType);
    }
    
    setCardTypeDefaults(cardType) {
        switch (cardType) {
            case 'dclass':
                // Pour D-Class, pas de département ni de position
                const deptField = document.getElementById('department');
                const posField = document.getElementById('position');
                if (deptField) deptField.value = '';
                if (posField) posField.value = 'D-Class Personnel';
                break;
                
            case 'o5':
                // Pour O5, pas de site ni département
                const siteField = document.getElementById('siteDesignation');
                const deptFieldO5 = document.getElementById('department');
                if (siteField) siteField.value = '';
                if (deptFieldO5) deptFieldO5.value = '';
                break;
        }
    }
    
    focusNextCardType(currentOption) {
        const cardTypeOptions = Array.from(document.querySelectorAll('.card-type-option'));
        const currentIndex = cardTypeOptions.indexOf(currentOption);
        const nextIndex = (currentIndex + 1) % cardTypeOptions.length;
        cardTypeOptions[nextIndex].focus();
    }
    
    focusPreviousCardType(currentOption) {
        const cardTypeOptions = Array.from(document.querySelectorAll('.card-type-option'));
        const currentIndex = cardTypeOptions.indexOf(currentOption);
        const previousIndex = currentIndex === 0 ? cardTypeOptions.length - 1 : currentIndex - 1;
        cardTypeOptions[previousIndex].focus();
    }
    
    highlightFormChanges() {
        // Mettre en évidence les champs qui ont changé de statut
        const allFields = document.querySelectorAll('#personnelForm .form-field');
        
        allFields.forEach(fieldContainer => {
            const field = fieldContainer.querySelector('input, select');
            if (!field) return;
            
            // Ajouter une classe temporaire pour l'animation
            fieldContainer.classList.add('field-updated');
            
            // Retirer la classe après l'animation
            setTimeout(() => {
                fieldContainer.classList.remove('field-updated');
            }, 600);
        });
    }
    
    announceCardTypeChange(cardType) {
        // Créer une annonce pour les lecteurs d'écran
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        
        const cardTypeConfig = this.cardInterface.cardTypes[cardType];
        announcement.textContent = `Card type changed to ${cardTypeConfig.title}. ${cardTypeConfig.description}`;
        
        document.body.appendChild(announcement);
        
        // Retirer l'annonce après un délai
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 3000);
    }
    
    animateModeTransition(mode) {
        const singleMode = document.getElementById('singleCardMode');
        const batchMode = document.getElementById('batchCardMode');
        
        // Ajouter une classe de transition
        const generationInterface = document.querySelector('.generation-interface');
        if (generationInterface) {
            generationInterface.classList.add('mode-transitioning');
            
            setTimeout(() => {
                generationInterface.classList.remove('mode-transitioning');
            }, 300);
        }
        
        // Animation de fade pour les sections
        if (mode === 'batch') {
            if (singleMode) {
                singleMode.style.opacity = '0';
                setTimeout(() => {
                    singleMode.classList.remove('active');
                    batchMode.classList.add('active');
                    batchMode.style.opacity = '1';
                }, 150);
            }
        } else {
            if (batchMode) {
                batchMode.style.opacity = '0';
                setTimeout(() => {
                    batchMode.classList.remove('active');
                    singleMode.classList.add('active');
                    singleMode.style.opacity = '1';
                }, 150);
            }
        }
    }
    
    initializeBatchInterface() {
        // Réinitialiser l'interface batch
        const batchProgress = document.getElementById('batchProgress');
        if (batchProgress) {
            batchProgress.style.display = 'none';
        }
        
        // Réinitialiser les conteneurs de preview et options
        const previewContainer = document.querySelector('.batch-preview-container');
        const optionsContainer = document.querySelector('.generation-options-container');
        const resultsContainer = document.querySelector('.batch-results-container');
        
        if (previewContainer) previewContainer.innerHTML = '';
        if (optionsContainer) optionsContainer.innerHTML = '';
        if (resultsContainer) resultsContainer.innerHTML = '';
        
        // Réinitialiser le batch processor
        if (this.batchProcessor) {
            this.batchProcessor.currentBatch = null;
        }
        
        // Afficher les instructions d'upload
        this.showBatchInstructions();
    }
    
    initializeSingleInterface() {
        // S'assurer que le preview est visible
        const previewSection = document.querySelector('.preview-section');
        if (previewSection) {
            previewSection.style.display = 'block';
        }
        
        // Réactiver les boutons de génération
        const generateBtn = document.getElementById('generateCard');
        const exportBtn = document.getElementById('exportCard');
        
        if (generateBtn) generateBtn.disabled = false;
        if (exportBtn) exportBtn.disabled = true; // Désactivé jusqu'à génération
        
        // Mettre à jour le preview si des données sont présentes
        this.updatePreview();
    }
    
    showBatchInstructions() {
        const uploadArea = document.getElementById('uploadArea');
        if (!uploadArea) return;
        
        // Ajouter des instructions détaillées
        const instructionsHTML = `
            <div class="batch-instructions">
                <span class="material-symbols-outlined">cloud_upload</span>
                <h4>Upload Personnel Data</h4>
                <p>Drag and drop your CSV, JSON, or Excel file here</p>
                <div class="file-format-info">
                    <h5>Supported formats:</h5>
                    <ul>
                        <li><strong>CSV:</strong> Comma-separated values with headers</li>
                        <li><strong>JSON:</strong> Array of personnel objects</li>
                        <li><strong>Excel:</strong> .xlsx or .xls files (coming soon)</li>
                    </ul>
                </div>
                <div class="required-fields-info">
                    <h5>Required fields:</h5>
                    <p>fullName, employeeId, siteDesignation (Site-XX or MTF-XX), department, clearanceLevel</p>
                </div>
                <button type="button" class="btn-secondary" onclick="document.getElementById('batchFile').click()">
                    Choose File
                </button>
            </div>
        `;
        
        uploadArea.innerHTML = instructionsHTML;
    }
    
    announceModeChange(mode) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        
        const modeText = mode === 'batch' ? 'Batch Generation' : 'Single Card';
        const description = mode === 'batch' 
            ? 'Generate multiple cards from uploaded data files'
            : 'Generate individual cards using the form';
            
        announcement.textContent = `Mode changed to ${modeText}. ${description}`;
        
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 3000);
    }
    
    saveModePreference(mode) {
        try {
            localStorage.setItem('scpCardGenerator_mode', mode);
        } catch (error) {
            console.log('Could not save mode preference:', error);
        }
    }
    
    loadModePreference() {
        try {
            const savedMode = localStorage.getItem('scpCardGenerator_mode');
            if (savedMode && (savedMode === 'single' || savedMode === 'batch')) {
                return savedMode;
            }
        } catch (error) {
            console.log('Could not load mode preference:', error);
        }
        return 'single'; // Default mode
    }
    
    validateFieldRealTime(field) {
        const fieldName = field.name || field.id;
        const value = field.value.trim();
        const errorElement = document.getElementById(`error-${fieldName}`);
        
        // Effacer l'erreur précédente
        this.clearFieldError(fieldName);
        
        // Validation selon le type de champ
        let isValid = true;
        let errorMessage = '';
        
        switch (fieldName) {
            case 'fullName':
                if (value.length > 0 && value.length < 2) {
                    isValid = false;
                    errorMessage = 'Le nom doit contenir au moins 2 caractères';
                } else if (value.length > 50) {
                    isValid = false;
                    errorMessage = 'Le nom ne peut pas dépasser 50 caractères';
                }
                break;
                
            case 'employeeId':
                if (value.length > 0 && !/^SCP-\d{4}-\d{3}$/.test(value)) {
                    isValid = false;
                    errorMessage = 'Format requis: SCP-0000-000';
                }
                break;
                
            case 'clearanceLevel':
                if (value && this.cardInterface.currentCardType) {
                    const cardConfig = this.cardInterface.cardTypes[this.cardInterface.currentCardType];
                    if (!cardConfig.clearanceLevels.includes(parseInt(value))) {
                        isValid = false;
                        errorMessage = `Niveau non autorisé pour ce type de carte`;
                    }
                }
                break;
                
            case 'expirationDate':
                if (value) {
                    const issueDate = document.getElementById('issueDate')?.value;
                    if (issueDate && new Date(value) <= new Date(issueDate)) {
                        isValid = false;
                        errorMessage = 'Doit être postérieure à la date d\'émission';
                    }
                }
                break;
        }
        
        // Afficher l'erreur si nécessaire
        if (!isValid) {
            this.showFieldError(fieldName, errorMessage);
            field.classList.add('error');
        } else {
            field.classList.remove('error');
            field.classList.add('valid');
            
            // Retirer la classe valid après un délai
            setTimeout(() => {
                field.classList.remove('valid');
            }, 2000);
        }
        
        return isValid;
    }
    
    validateFieldOnBlur(field) {
        const fieldName = field.name || field.id;
        const value = field.value.trim();
        const cardConfig = this.cardInterface.cardTypes[this.cardInterface.currentCardType];
        
        // Validation des champs requis
        if (cardConfig && cardConfig.requiredFields.includes(fieldName)) {
            if (!value) {
                this.showFieldError(fieldName, 'Ce champ est requis');
                field.classList.add('error');
                return false;
            }
        }
        
        // Validation spécifique selon le champ
        return this.validateFieldRealTime(field);
    }
    
    handleSelectChange(select) {
        const fieldName = select.name || select.id;
        
        switch (fieldName) {
            case 'siteDesignation':
                this.loadDepartments(select.value);
                this.validateSiteAssignment(select.value);
                break;
                
            case 'department':
                this.validateDepartmentAssignment(select.value);
                break;
                
            case 'clearanceLevel':
                this.validateClearanceLevel(select.value);
                break;
        }
    }
    
    validateSiteAssignment(siteId) {
        if (!siteId) return true;
        
        const site = this.siteManager.getSite(siteId);
        if (!site) {
            this.showFieldError('siteDesignation', 'Site non reconnu');
            return false;
        }
        
        // Vérifier si le niveau de clearance est compatible
        const clearanceField = document.getElementById('clearanceLevel');
        if (clearanceField && clearanceField.value) {
            const clearanceLevel = parseInt(clearanceField.value);
            if (!this.siteManager.validateSiteAccess(siteId, clearanceLevel)) {
                this.showFieldError('clearanceLevel', `Niveau ${clearanceLevel} non autorisé pour ${siteId}`);
                return false;
            }
        }
        
        this.clearFieldError('siteDesignation');
        return true;
    }
    
    validateDepartmentAssignment(departmentId) {
        if (!departmentId) return true;
        
        const siteId = document.getElementById('siteDesignation')?.value;
        if (!siteId) {
            this.showFieldError('department', 'Sélectionnez d\'abord un site');
            return false;
        }
        
        const site = this.siteManager.getSite(siteId);
        const department = site?.departments.find(d => d.departmentId === departmentId);
        
        if (!department) {
            this.showFieldError('department', 'Département non disponible sur ce site');
            return false;
        }
        
        // Vérifier le niveau de clearance requis
        const clearanceField = document.getElementById('clearanceLevel');
        if (clearanceField && clearanceField.value) {
            const clearanceLevel = parseInt(clearanceField.value);
            if (clearanceLevel < department.requiredClearance) {
                this.showFieldError('clearanceLevel', `Niveau ${department.requiredClearance} minimum requis pour ce département`);
                return false;
            }
        }
        
        this.clearFieldError('department');
        return true;
    }
    
    validateClearanceLevel(level) {
        if (!level) return true;
        
        const clearanceLevel = parseInt(level);
        const cardConfig = this.cardInterface.cardTypes[this.cardInterface.currentCardType];
        
        // Vérifier si le niveau est autorisé pour ce type de carte
        if (!cardConfig.clearanceLevels.includes(clearanceLevel)) {
            this.showFieldError('clearanceLevel', `Niveau ${clearanceLevel} non autorisé pour ce type de carte`);
            return false;
        }
        
        // Vérifier la compatibilité avec le site
        const siteId = document.getElementById('siteDesignation')?.value;
        if (siteId && !this.siteManager.validateSiteAccess(siteId, clearanceLevel)) {
            this.showFieldError('clearanceLevel', `Niveau ${clearanceLevel} non autorisé pour ${siteId}`);
            return false;
        }
        
        // Vérifier la compatibilité avec le département
        const departmentId = document.getElementById('department')?.value;
        if (departmentId && siteId) {
            const site = this.siteManager.getSite(siteId);
            const department = site?.departments.find(d => d.departmentId === departmentId);
            if (department && clearanceLevel < department.requiredClearance) {
                this.showFieldError('clearanceLevel', `Niveau ${department.requiredClearance} minimum requis pour ce département`);
                return false;
            }
        }
        
        this.clearFieldError('clearanceLevel');
        return true;
    }
    
    showFieldError(fieldName, message) {
        const errorElement = document.getElementById(`error-${fieldName}`);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
        
        // Ajouter une classe d'erreur au champ
        const field = document.getElementById(fieldName);
        if (field) {
            field.classList.add('error');
        }
    }
    
    clearFieldError(fieldName) {
        const errorElement = document.getElementById(`error-${fieldName}`);
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }
        
        // Retirer la classe d'erreur du champ
        const field = document.getElementById(fieldName);
        if (field) {
            field.classList.remove('error');
        }
    }
    
    updateDepartmentSelectorState(hasOptions) {
        const deptSelector = document.getElementById('department');
        const deptField = deptSelector?.closest('.form-field');
        
        if (deptField) {
            if (hasOptions) {
                deptField.classList.remove('disabled');
                deptSelector.disabled = false;
            } else {
                deptField.classList.add('disabled');
                deptSelector.disabled = true;
            }
        }
    }
    
    generateEmployeeIdSuggestion() {
        // Générer une suggestion d'ID employé basée sur le type de carte et le site/MTF
        const cardType = this.cardInterface.currentCardType;
        const siteId = document.getElementById('siteDesignation')?.value;
        
        let prefix = 'SCP';
        let siteCode = '0000';
        let sequence = '001';
        
        // Adapter le code selon le site ou MTF
        if (siteId) {
            const facility = this.siteManager.getSite(siteId);
            
            if (facility && facility.isMTF()) {
                // Codes spéciaux pour les MTF
                switch (siteId) {
                    case 'MTF-Alpha-1':
                        siteCode = 'A001';
                        break;
                    case 'MTF-Epsilon-11':
                        siteCode = 'E011';
                        break;
                    case 'MTF-Nu-7':
                        siteCode = 'N007';
                        break;
                    case 'MTF-Beta-7':
                        siteCode = 'B007';
                        break;
                    case 'MTF-Gamma-5':
                        siteCode = 'G005';
                        break;
                    case 'MTF-Eta-10':
                        siteCode = 'H010';
                        break;
                    case 'MTF-Mu-4':
                        siteCode = 'M004';
                        break;
                    case 'MTF-Tau-5':
                        siteCode = 'T005';
                        break;
                    default:
                        siteCode = 'MTF0';
                }
            } else {
                // Codes pour les sites traditionnels
                switch (siteId) {
                    case 'Site-19':
                        siteCode = '0019';
                        break;
                    case 'Site-██':
                        siteCode = '0099';
                        break;
                    case 'Area-██':
                        siteCode = '0199';
                        break;
                    default:
                        siteCode = '0000';
                }
            }
        }
        
        // Générer un numéro de séquence aléatoire
        sequence = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
        
        return `${prefix}-${siteCode}-${sequence}`;
    }
    
    addEmployeeIdSuggestion() {
        const employeeIdField = document.getElementById('employeeId');
        if (!employeeIdField || employeeIdField.value.trim() !== '') return;
        
        const suggestion = this.generateEmployeeIdSuggestion();
        
        // Créer un bouton de suggestion
        let suggestionBtn = document.getElementById('employeeIdSuggestion');
        if (!suggestionBtn) {
            suggestionBtn = document.createElement('button');
            suggestionBtn.id = 'employeeIdSuggestion';
            suggestionBtn.type = 'button';
            suggestionBtn.className = 'suggestion-btn';
            suggestionBtn.innerHTML = '<span class="material-symbols-outlined">auto_fix_high</span> Suggest ID';
            
            employeeIdField.parentNode.appendChild(suggestionBtn);
            
            suggestionBtn.addEventListener('click', () => {
                employeeIdField.value = suggestion;
                employeeIdField.dispatchEvent(new Event('input'));
                suggestionBtn.style.display = 'none';
            });
        }
        
        suggestionBtn.textContent = `Use: ${suggestion}`;
        suggestionBtn.style.display = 'inline-flex';
    }
    
    addFormSmartFeatures() {
        // Ajouter des fonctionnalités intelligentes au formulaire
        
        // Auto-suggestion d'ID employé
        const siteSelector = document.getElementById('siteDesignation');
        if (siteSelector) {
            siteSelector.addEventListener('change', () => {
                this.addEmployeeIdSuggestion();
            });
        }
        
        // Auto-complétion du nom
        const nameField = document.getElementById('fullName');
        if (nameField) {
            nameField.addEventListener('input', () => {
                this.formatNameField(nameField);
            });
        }
        
        // Validation de format en temps réel pour l'ID
        const employeeIdField = document.getElementById('employeeId');
        if (employeeIdField) {
            employeeIdField.addEventListener('input', (e) => {
                this.formatEmployeeIdField(e.target);
            });
        }
    }
    
    formatNameField(field) {
        // Formater automatiquement le nom (première lettre en majuscule)
        let value = field.value;
        
        // Capitaliser chaque mot
        value = value.replace(/\b\w/g, l => l.toUpperCase());
        
        // Mettre à jour le champ si nécessaire
        if (field.value !== value) {
            const cursorPos = field.selectionStart;
            field.value = value;
            field.setSelectionRange(cursorPos, cursorPos);
        }
    }
    
    formatEmployeeIdField(field) {
        let value = field.value.toUpperCase();
        
        // Formater automatiquement selon le pattern SCP-0000-000
        value = value.replace(/[^SCP0-9-]/g, '');
        
        // Ajouter les tirets automatiquement
        if (value.length >= 3 && !value.startsWith('SCP')) {
            value = 'SCP-' + value.substring(3);
        }
        
        if (value.length >= 8 && value.charAt(7) !== '-') {
            value = value.substring(0, 8) + '-' + value.substring(8);
        }
        
        // Limiter la longueur
        if (value.length > 12) {
            value = value.substring(0, 12);
        }
        
        if (field.value !== value) {
            const cursorPos = field.selectionStart;
            field.value = value;
            field.setSelectionRange(cursorPos, cursorPos);
        }
    }
    
    setDefaultDates() {
        const today = new Date();
        const issueDate = document.getElementById('issueDate');
        const expirationDate = document.getElementById('expirationDate');
        
        if (issueDate && !issueDate.value) {
            issueDate.value = today.toISOString().split('T')[0];
        }
        
        if (expirationDate && !expirationDate.value) {
            const cardType = this.cardInterface.currentCardType;
            let expiryDate = new Date(today);
            
            // Définir la durée selon le type de carte
            switch (cardType) {
                case 'dclass':
                    expiryDate.setDate(expiryDate.getDate() + 30); // 30 jours pour D-Class
                    break;
                case 'o5':
                    expiryDate.setFullYear(expiryDate.getFullYear() + 5); // 5 ans pour O5
                    break;
                default:
                    expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 an par défaut
            }
            
            expirationDate.value = expiryDate.toISOString().split('T')[0];
        }
    }
    
    updatePreview() {
        if (!this.cardGenerator) {
            // Check if classes are ready
            if (!window.SCP_CLASSES_READY) {
                // Initialize retry counter if not exists
                if (!this.classReadyRetryCount) this.classReadyRetryCount = 0;
                
                if (this.classReadyRetryCount < 20) { // Max 2 seconds
                    this.classReadyRetryCount++;
                    console.log(`⏳ Waiting for SCP classes to be ready... (${this.classReadyRetryCount}/20)`);
                    setTimeout(() => this.updatePreview(), 100);
                    return;
                } else {
                    console.warn('⚠️ SCP classes never became ready, proceeding anyway');
                    this.classReadyRetryCount = 0; // Reset for next time
                }
            }
            
            // Try to initialize card generator if it's not available
            console.log('🔍 DEBUG: Checking SCPCardGenerator availability');
            console.log('- window.SCPCardGenerator:', typeof window.SCPCardGenerator);
            
            if (!window.SCPCardGenerator) {
                console.warn('Card generator not available for preview update, attempting async initialization...');
                
                // Prevent recursion by checking if we're already initializing
                if (this.isInitializingCardGenerator) {
                    console.log('Already initializing card generator, skipping recursive call');
                    return;
                }
                
                // Use the async initialization method
                const currentType = this.cardInterface.currentCardType || 'researcher';
                this.initializeCardGenerator(currentType).then(() => {
                    // Only retry if we're not in a recursive call
                    if (!this.isInitializingCardGenerator) {
                        this.updatePreview();
                    }
                }).catch(error => {
                    console.warn('Could not initialize card generator for preview:', error.message);
                });
                return;
            }
            
            // If we don't have a card generator yet, create one
            if (!this.cardGenerator) {
                try {
                    const currentType = this.cardInterface.currentCardType || 'researcher';
                    this.cardGenerator = new SCPCardGenerator(currentType, 'client');
                    console.log('✅ Card generator initialized in updatePreview');
                } catch (error) {
                    console.warn('Could not initialize card generator:', error);
                    return;
                }
            }
        }
        
        // Get form data
        const formData = this.getFormData();
        console.log('🔍 UI Controller - Form data retrieved:', formData);
        
        // Check if card generator has updatePreview method
        if (this.cardGenerator && typeof this.cardGenerator.updatePreview === 'function') {
            console.log('📤 UI Controller - Sending data to card generator...');
            this.cardGenerator.updatePreview(formData);
        } else {
            console.warn('⚠️ UI Controller - Card generator or updatePreview method not available');
            console.log('Card generator:', this.cardGenerator);
            console.log('UpdatePreview method:', this.cardGenerator ? typeof this.cardGenerator.updatePreview : 'N/A');
        }
        
        // Mettre à jour le progrès du formulaire
        this.updateFormProgress();
    }
    
    generateCard() {
        if (!this.cardGenerator) {
            this.showError('Card generator not available. Please refresh the page.');
            return;
        }
        
        try {
            const formData = this.getFormData();
            
            // Valider les données
            if (this.cardGenerator.validateForm) {
                const validation = this.cardGenerator.validateForm(formData);
                if (!validation.isValid) {
                    this.showValidationErrors(validation.errors);
                    return;
                }
            }
            
            // Générer la carte
            if (this.cardGenerator.generateCard) {
                this.cardGenerator.generateCard(formData);
            }
            
            // Activer le bouton d'export
            const exportBtn = document.getElementById('exportCard');
            if (exportBtn) {
                exportBtn.disabled = false;
            }
            
        } catch (error) {
            console.error('Erreur lors de la génération:', error);
            this.showError('Erreur lors de la génération de la carte');
        }
    }
    
    exportCard() {
        if (!this.cardGenerator) {
            this.showError('Card generator not available. Please generate a card first.');
            return;
        }
        
        try {
            if (this.cardGenerator.exportCard) {
                this.cardGenerator.exportCard('png');
            } else {
                this.showError('Export functionality not available');
            }
        } catch (error) {
            console.error('Erreur lors de l\'export:', error);
            this.showError('Erreur lors de l\'export de la carte');
        }
    }
    
    getFormData() {
        const form = document.getElementById('personnelForm');
        if (!form) {
            console.warn('Personnel form not found');
            return {};
        }
        
        const data = {};
        
        // Get all form elements (inputs, selects, textareas)
        const formElements = form.querySelectorAll('input, select, textarea');
        
        formElements.forEach(element => {
            const name = element.name || element.id;
            if (!name) return; // Skip elements without name/id
            
            let value = null;
            
            // Handle different input types
            switch (element.type) {
                case 'file':
                    value = element.files && element.files[0] ? element.files[0] : null;
                    break;
                case 'checkbox':
                    value = element.checked;
                    break;
                case 'radio':
                    if (element.checked) {
                        value = element.value;
                    } else {
                        return; // Skip unchecked radio buttons
                    }
                    break;
                default:
                    value = element.value || '';
            }
            
            // Store the value
            data[name] = value;
        });
        
        // Debug logging
        console.log('📋 Form data collected:', data);
        
        return data;
    }
    
    showValidationErrors(errors) {
        // Use the enhanced error handler
        if (window.errorHandler) {
            window.errorHandler.handleValidationErrors(errors, {
                clearPrevious: true,
                showNotification: true,
                groupByField: true,
                autoHide: false
            });
        } else {
            // Fallback to basic error display
            this.showValidationErrorsBasic(errors);
        }
    }
    
    showValidationErrorsBasic(errors) {
        // Fallback method for basic error display
        document.querySelectorAll('.error-message').forEach(el => {
            el.textContent = '';
            el.style.display = 'none';
        });
        
        errors.forEach(error => {
            const errorElement = document.getElementById(`error-${error.field}`);
            if (errorElement) {
                errorElement.textContent = error.getUserMessage ? error.getUserMessage() : error.message;
                errorElement.style.display = 'block';
            }
        });
    }
    
    showError(message, options = {}) {
        // Use the enhanced error handler for notifications
        if (window.errorHandler) {
            window.errorHandler.showNotification({
                title: options.title || 'Error',
                message: message,
                type: 'error',
                autoHide: options.autoHide !== false ? 5000 : false
            });
        } else {
            // Fallback to basic notification
            this.showErrorBasic(message);
        }
    }
    
    showErrorBasic(message) {
        // Fallback method for basic error notification
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 5000);
    }
    
    showWarning(message, options = {}) {
        if (window.errorHandler) {
            window.errorHandler.showNotification({
                title: options.title || 'Warning',
                message: message,
                type: 'warning',
                autoHide: options.autoHide !== false ? 5000 : false
            });
        } else {
            this.showError(message, { title: 'Warning' });
        }
    }
    
    showSuccess(message, options = {}) {
        if (window.errorHandler) {
            window.errorHandler.showNotification({
                title: options.title || 'Success',
                message: message,
                type: 'success',
                autoHide: options.autoHide !== false ? 3000 : false
            });
        } else {
            this.showError(message, { title: 'Success' });
        }
    }
    
    showInfo(message, options = {}) {
        if (window.errorHandler) {
            window.errorHandler.showNotification({
                title: options.title || 'Information',
                message: message,
                type: 'info',
                autoHide: options.autoHide !== false ? 4000 : false
            });
        } else {
            this.showError(message, { title: 'Information' });
        }
    }
    
    handleBatchErrors(batchResult) {
        if (window.errorHandler) {
            window.errorHandler.handleBatchErrors(batchResult, {
                showSummary: true,
                showDetails: false,
                autoHide: false
            });
        } else {
            // Fallback for batch errors
            if (batchResult.summary && batchResult.summary.invalidRecords > 0) {
                this.showError(`Batch processing completed with ${batchResult.summary.invalidRecords} errors`);
            }
        }
    }
    
    clearErrors() {
        if (window.errorHandler) {
            window.errorHandler.clearAll();
        } else {
            // Fallback error clearing
            document.querySelectorAll('.error-message').forEach(el => {
                el.textContent = '';
                el.style.display = 'none';
            });
        }
    }
    
    async handleBatchFileUpload(file) {
        if (!file) return;
        
        try {
            // Validate file before upload
            if (window.PersonnelValidator) {
                const validator = new PersonnelValidator();
                const fileValidation = validator.validateFile(file, 'batchFile');
                
                if (!fileValidation.isValid) {
                    this.showValidationErrors(fileValidation.errors);
                    return;
                }
            }
            
            await this.batchProcessor.uploadFile(file);
            this.showSuccess('File uploaded successfully');
            
        } catch (error) {
            console.error('Erreur lors de l\'upload:', error);
            
            // Enhanced error handling with context
            if (error.name === 'ValidationError') {
                this.showValidationErrors([error]);
            } else if (error.code === 'FILE_TOO_LARGE') {
                this.showError('File size exceeds maximum allowed limit', {
                    title: 'Upload Error'
                });
            } else if (error.code === 'INVALID_FILE_TYPE') {
                this.showError('Invalid file type. Please upload CSV, JSON, or Excel files only', {
                    title: 'Upload Error'
                });
            } else if (error.code === 'NETWORK_ERROR') {
                this.showError('Network error occurred during upload. Please check your connection and try again', {
                    title: 'Network Error'
                });
            } else {
                this.showError(`Upload failed: ${error.message}`, {
                    title: 'Upload Error'
                });
            }
        }
    }
}

/**
 * Interface unifiée pour tous les types de cartes
 */
class UnifiedCardInterface {
    constructor() {
        this.currentCardType = 'researcher';
        this.cardTypes = this.initializeCardTypes();
        this.mode = 'single';
    }
    
    initializeCardTypes() {
        return {
            researcher: {
                title: "Researcher Card",
                description: "For research personnel and scientists",
                clearanceLevels: [1, 2, 3, 4],
                template: "researcher-template",
                color: "#2c5aa0",
                requiredFields: ['fullName', 'employeeId', 'siteDesignation', 'department', 'clearanceLevel', 'position', 'issueDate', 'expirationDate'],
                optionalFields: ['photo', 'dateOfBirth', 'emergencyContact']
            },
            security: {
                title: "Security Personnel Card", 
                description: "For security and containment staff",
                clearanceLevels: [1, 2, 3, 4, 5],
                template: "security-template",
                color: "#8b0000",
                requiredFields: ['fullName', 'employeeId', 'siteDesignation', 'department', 'clearanceLevel', 'position', 'issueDate', 'expirationDate'],
                optionalFields: ['photo', 'dateOfBirth', 'emergencyContact']
            },
            dclass: {
                title: "D-Class Personnel Card",
                description: "For D-Class test subjects",
                clearanceLevels: [0],
                template: "dclass-template",
                color: "#ff4500",
                requiredFields: ['fullName', 'employeeId', 'siteDesignation', 'expirationDate'],
                optionalFields: ['photo', 'dateOfBirth']
            },
            o5: {
                title: "O5 Council Card",
                description: "For O5 Council members",
                clearanceLevels: [5],
                template: "o5-template",
                color: "#000000",
                requiredFields: ['fullName', 'employeeId', 'position'],
                optionalFields: ['photo']
            },
            mtf: {
                title: "MTF Personnel Card",
                description: "For Mobile Task Force operatives",
                clearanceLevels: [2, 3, 4, 5],
                template: "mtf-template",
                color: "#4a4a4a",
                requiredFields: ['fullName', 'employeeId', 'siteDesignation', 'department', 'clearanceLevel', 'position', 'issueDate', 'expirationDate'],
                optionalFields: ['photo', 'dateOfBirth', 'emergencyContact', 'specialDesignations']
            }
        };
    }
    
    switchCardType(newType) {
        this.currentCardType = newType;
        this.updateFormVisibility();
    }
    
    toggleMode(mode) {
        this.mode = mode;
    }
    
    updateFormVisibility() {
        // Mettre à jour la visibilité des champs selon le type de carte sélectionné
        const cardTypeConfig = this.cardTypes[this.currentCardType];
        if (!cardTypeConfig) return;
        
        // Logique de visibilité déjà gérée dans UIController.updateFormFieldsVisibility
        // Cette méthode peut être étendue pour des règles plus complexes
    }
    
    getCardTypeConfig(cardType) {
        return this.cardTypes[cardType] || null;
    }
    
    getCurrentCardType() {
        return this.currentCardType;
    }
    
    isFieldRequired(fieldName) {
        const config = this.cardTypes[this.currentCardType];
        return config ? config.requiredFields.includes(fieldName) : false;
    }
    
    isFieldOptional(fieldName) {
        const config = this.cardTypes[this.currentCardType];
        return config ? config.optionalFields.includes(fieldName) : false;
    }
    
    updateFormProgress() {
        const cardConfig = this.cardInterface.cardTypes[this.cardInterface.currentCardType];
        if (!cardConfig) return;
        
        const requiredFields = cardConfig.requiredFields;
        let completedFields = 0;
        
        // Compter les champs requis complétés
        requiredFields.forEach(fieldName => {
            const field = document.getElementById(fieldName);
            if (field && field.value.trim() !== '') {
                // Validation basique pour s'assurer que la valeur est valide
                if (this.isFieldValueValid(fieldName, field.value)) {
                    completedFields++;
                }
            }
        });
        
        const totalFields = requiredFields.length;
        const percentage = totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;
        
        // Mettre à jour l'interface de progrès
        const progressPercentage = document.getElementById('progressPercentage');
        const progressBarFill = document.getElementById('progressBarFill');
        const progressDetails = document.getElementById('progressDetails');
        
        if (progressPercentage) {
            progressPercentage.textContent = `${percentage}%`;
        }
        
        if (progressBarFill) {
            progressBarFill.style.width = `${percentage}%`;
            
            // Changer la couleur selon le progrès
            if (percentage < 50) {
                progressBarFill.style.backgroundColor = '#dc3545';
            } else if (percentage < 80) {
                progressBarFill.style.backgroundColor = '#ffc107';
            } else {
                progressBarFill.style.backgroundColor = '#28a745';
            }
        }
        
        if (progressDetails) {
            const completedSpan = progressDetails.querySelector('.completed-fields');
            const totalSpan = progressDetails.querySelector('.total-fields');
            
            if (completedSpan) completedSpan.textContent = completedFields;
            if (totalSpan) totalSpan.textContent = totalFields;
        }
        
        // Activer/désactiver le bouton de génération
        const generateBtn = document.getElementById('generateCard');
        if (generateBtn) {
            generateBtn.disabled = percentage < 100;
            
            if (percentage === 100) {
                generateBtn.classList.add('ready');
            } else {
                generateBtn.classList.remove('ready');
            }
        }
    }
    
    isFieldValueValid(fieldName, value) {
        // Validation basique pour le progrès
        switch (fieldName) {
            case 'employeeId':
                return /^SCP-\d{4}-\d{3}$/.test(value);
            case 'fullName':
                return value.length >= 2 && value.length <= 50;
            case 'clearanceLevel':
                const level = parseInt(value);
                const cardConfig = this.cardInterface.cardTypes[this.cardInterface.currentCardType];
                return cardConfig && cardConfig.clearanceLevels.includes(level);
            case 'expirationDate':
                const issueDate = document.getElementById('issueDate')?.value;
                return !issueDate || new Date(value) > new Date(issueDate);
            default:
                return value.trim() !== '';
        }
    }
}

// Make classes globally available
window.UIController = UIController;
window.UnifiedCardInterface = UnifiedCardInterface;
