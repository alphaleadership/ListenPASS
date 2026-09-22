 // Debug: Card generator script is being executed
console.log('🚀 SCP Card Generator script starting execution...');
console.log('- Current timestamp:', Date.now());
console.log('- Document ready state:', document.readyState);

/**
 * Template de carte - Configuration visuelle pour chaque type
 */

/**
 * Unified Card Interface - Manages card type configurations and form interface
 */
class UnifiedCardInterface {
    constructor() {
        this.currentCardType = 'researcher';
        this.cardTypes = this.initializeCardTypes();
        this.mode = 'single'; // 'single' ou 'batch'
    }
    
    initializeCardTypes() {
        return {
            researcher: {
                title: "Research Personnel",
                description: "Scientists, researchers, and laboratory staff with access to anomalous objects and research data",
                clearanceLevels: [1, 2, 3, 4],
                template: "researcher-template",
                color: "#2c5aa0",
                requiredFields: ['fullName', 'employeeId', 'siteDesignation', 'department', 'clearanceLevel', 'position', 'issueDate', 'expirationDate'],
                optionalFields: ['photo', 'dateOfBirth', 'emergencyContact']
            },
            security: {
                title: "Security Personnel", 
                description: "Guards, agents, and containment specialists responsible for site security and SCP containment",
                clearanceLevels: [1, 2, 3, 4, 5],
                template: "security-template",
                color: "#8b0000",
                requiredFields: ['fullName', 'employeeId', 'siteDesignation', 'department', 'clearanceLevel', 'position', 'issueDate', 'expirationDate'],
                optionalFields: ['photo', 'dateOfBirth', 'emergencyContact']
            },
            dclass: {
                title: "D-Class Personnel",
                description: "Expendable test subjects used in experiments with dangerous SCPs",
                clearanceLevels: [0],
                template: "dclass-template",
                color: "#ff4500",
                requiredFields: ['fullName', 'employeeId', 'siteDesignation', 'expirationDate'],
                optionalFields: ['photo', 'dateOfBirth']
            },
            o5: {
                title: "O5 Council",
                description: "Highest-ranking Foundation administrators with unlimited access to all information",
                clearanceLevels: [5],
                template: "o5-template",
                color: "#000000",
                requiredFields: ['fullName', 'employeeId', 'position'],
                optionalFields: ['photo']
            },
            mtf: {
                title: "MTF Personnel",
                description: "Mobile Task Force operatives specialized in field operations and anomaly containment",
                clearanceLevels: [2, 3, 4, 5],
                template: "mtf-template",
                color: "#4a4a4a",
                requiredFields: ['fullName', 'employeeId', 'siteDesignation', 'department', 'clearanceLevel', 'position', 'issueDate', 'expirationDate'],
                optionalFields: ['photo', 'dateOfBirth', 'emergencyContact', 'specialDesignations']
            }
        };
    }
    
    switchCardType(newType) {
        if (this.cardTypes[newType]) {
            this.currentCardType = newType;
            return true;
        }
        return false;
    }
    
    toggleMode(mode) {
        if (mode === 'single' || mode === 'batch') {
            this.mode = mode;
            return true;
        }
        return false;
    }
    
    getCurrentCardType() {
        return this.cardTypes[this.currentCardType];
    }
    
    getCardTypeConfig(cardType) {
        return this.cardTypes[cardType] || null;
    }
}

/**
 * SCP Card Generator - Générateur principal de cartes côté client
 */
class SCPCardGenerator {
    constructor(cardType, mode = 'client') {
        this.cardType = cardType;
        this.mode = mode;
        this.template = this.loadTemplate(cardType);
        this.formData = {};
        this.photoImage = null;
        this.logoImage = null;
        
        // Configuration haute résolution
        this.dpi = 300;
        this.displayScale = 0.5; // Échelle d'affichage pour le preview
        this.cardDimensions = {
            width: 856,  // 85.6mm à 300 DPI
            height: 540, // 54mm à 300 DPI
            displayWidth: 428,  // Taille d'affichage réduite
            displayHeight: 270
        };
        
        // Initialize DOM-dependent elements safely
        this.initializeDOMElements();
        
        // Initialize other components
        this.loadAssets();
        this.initializeRealTimePreview();
        this.initializeExportDropdown();
        
        // Load initial form data
        this.loadInitialFormData();
    }
    
    initializeDOMElements() {
        try {
            this.canvas = document.getElementById('cardPreview');
            this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
            
            if (this.canvas && this.ctx) {
                this.initializeCanvas();
            } else {
                console.warn('Canvas element not found, card generator will work without preview');
            }
        } catch (error) {
            console.warn('Error initializing DOM elements:', error);
            this.canvas = null;
            this.ctx = null;
        }
    }
    
    initializeRealTimePreview() {
        try {
            // Écouter les changements de formulaire pour la mise à jour en temps réel
            const form = document.getElementById('personnelForm');
            if (!form) {
                console.warn('Personnel form not found, real-time preview disabled');
                return;
            }
        
        // Écouter tous les champs du formulaire
        const formElements = form.querySelectorAll('input, select, textarea');
        formElements.forEach(element => {
            // Événements pour la mise à jour en temps réel
            element.addEventListener('input', (e) => {
                this.handleFormFieldChange(e.target);
            });
            
            element.addEventListener('change', (e) => {
                this.handleFormFieldChange(e.target);
            });
        });
        
        // Gestion spéciale pour l'upload de photo
        const photoInput = document.getElementById('photo');
        if (photoInput) {
            photoInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    this.handlePhotoUpload(e.target.files[0]).then(() => {
                        this.renderPreview();
                    }).catch(error => {
                        console.error('Erreur lors du chargement de la photo:', error);
                    });
                }
            });
        }
        } catch (error) {
            console.warn('Error initializing real-time preview:', error);
        }
    }
    
    handleFormFieldChange(field) {
        // Prevent recursion when we're updating the field value
        if (field._updating) {
            return;
        }
        
        const fieldName = field.name || field.id;
        let fieldValue = field.value;
        
        // Traitement spécial pour certains champs
        if (field.type === 'file') {
            fieldValue = field.files && field.files[0] ? field.files[0] : null;
        }
        
        // Transform value for specific fields
        if (fieldName === 'fullName' && typeof fieldValue === 'string') {
            fieldValue = fieldValue.trim().replace(/\s+/g, ' ');
        }
        
        if (fieldName === 'employeeId' && typeof fieldValue === 'string') {
            fieldValue = fieldValue.toUpperCase().trim();
            // Auto-format employee ID
            if (fieldValue.length > 0 && !fieldValue.startsWith('SCP-')) {
                fieldValue = 'SCP-' + fieldValue.replace(/[^0-9]/g, '');
            }
        }
        
        // Mettre à jour les données du formulaire
        this.formData[fieldName] = fieldValue;
        
        // Update the actual form field with transformed value (prevent recursion)
        if (field.value !== fieldValue && typeof fieldValue === 'string') {
            // Set a flag to prevent recursive calls
            field._updating = true;
            field.value = fieldValue;
            // Clear the flag after a short delay
            setTimeout(() => {
                field._updating = false;
            }, 10);
        }
        
        // Real-time validation for the changed field
        this.validateFieldRealTime(fieldName, fieldValue);
        
        // Collect all form data and update preview
        this.collectAllFormData();
        
        // Débounce pour éviter trop de rendus
        clearTimeout(this.previewTimeout);
        this.previewTimeout = setTimeout(() => {
            this.renderPreview();
        }, 150);
        
        // Update form progress immediately for better UX
        this.updateFormProgress();
        
        // Also notify UI controller if available
        if (window.uiController && typeof window.uiController.updateFormProgress === 'function') {
            window.uiController.updateFormProgress();
        }
    }
    
    loadInitialFormData() {
        console.log('🔄 Loading initial form data...');
        
        // Wait a bit for DOM to be ready
        setTimeout(() => {
            this.collectAllFormData();
            
            // If form is empty, set some default dates
            if (!this.formData.issueDate) {
                const today = new Date().toISOString().split('T')[0];
                const issueDateField = document.getElementById('issueDate');
                if (issueDateField && !issueDateField.value) {
                    issueDateField.value = today;
                }
            }
            
            if (!this.formData.expirationDate) {
                const nextYear = new Date();
                nextYear.setFullYear(nextYear.getFullYear() + 1);
                const expiryDate = nextYear.toISOString().split('T')[0];
                const expiryDateField = document.getElementById('expirationDate');
                if (expiryDateField && !expiryDateField.value) {
                    expiryDateField.value = expiryDate;
                }
            }
            
            // Collect data again after setting defaults
            this.collectAllFormData();
            
            // Initial preview render
            this.renderPreview();
        }, 100);
    }
    
    collectAllFormData() {
        const form = document.getElementById('personnelForm');
        if (!form) {
            console.warn('Personnel form not found for data collection');
            return;
        }
        
        const formElements = form.querySelectorAll('input, select, textarea');
        const allData = {};
        
        formElements.forEach(element => {
            const name = element.name || element.id;
            if (!name) return;
            
            let value = null;
            
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
                        return;
                    }
                    break;
                default:
                    value = element.value || '';
            }
            
            allData[name] = value;
        });
        
        // Update form data with all collected data
        this.formData = { ...this.formData, ...allData };
        console.log('📋 Card Generator - All form data collected:', this.formData);
    }
    
    validateFieldRealTime(fieldName, fieldValue) {
        // Only validate if we have the enhanced validator
        if (!window.PersonnelValidator || !window.errorHandler) return;
        
        try {
            const validator = new PersonnelValidator(window.scpCardApp && window.scpCardApp.siteManager);
            const fieldErrors = validator.validateField(fieldName, fieldValue, this.formData, this.cardType);
            
            // Clear previous errors for this field
            const fieldElement = document.getElementById(fieldName);
            const fieldContainer = fieldElement ? fieldElement.closest('.form-field') : null;
            if (fieldContainer) {
                fieldContainer.classList.remove('has-error', 'has-warning', 'has-info');
                const existingErrors = fieldContainer.querySelectorAll('.field-error, .field-warning, .field-info');
                existingErrors.forEach(el => el.remove());
            }
            
            // Display new errors if any
            if (fieldErrors.length > 0) {
                window.errorHandler.displayFieldErrors(fieldName, fieldErrors);
            }
            
        } catch (error) {
            console.warn('Real-time validation error:', error);
        }
    }
    
    initializeExportDropdown() {
        try {
            const exportBtn = document.getElementById('exportCard');
            const exportDropdown = document.getElementById('exportDropdown');
            
            if (!exportBtn || !exportDropdown) {
                console.warn('Export elements not found, export dropdown disabled');
                return;
            }
        
        // Toggle dropdown
        exportBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            exportDropdown.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!exportBtn.contains(e.target) && !exportDropdown.contains(e.target)) {
                exportDropdown.classList.remove('show');
            }
        });
        
        // Handle format selection
        const formatButtons = exportDropdown.querySelectorAll('.export-format-btn');
        formatButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const format = btn.dataset.format;
                this.handleExportFormat(format);
                exportDropdown.classList.remove('show');
            });
        });
        } catch (error) {
            console.warn('Error initializing export dropdown:', error);
        }
    }
    
    handleExportFormat(format) {
        this.showExportProgress();
        
        try {
            switch (format) {
                case 'png':
                    this.exportCard('png');
                    break;
                case 'jpg':
                    this.exportCard('jpg', { quality: 0.9 });
                    break;
                case 'png-hires':
                    this.exportHighResolution('png', 3);
                    break;
                case 'pdf':
                    this.exportCard('pdf');
                    break;
                default:
                    this.exportCard('png');
            }
            
            setTimeout(() => {
                this.hideExportProgress();
                this.showExportSuccess(format);
            }, 1000);
            
        } catch (error) {
            this.hideExportProgress();
            this.showExportError(error.message);
        }
    }
    
    showExportProgress() {
        const progressDiv = document.createElement('div');
        progressDiv.id = 'exportProgress';
        progressDiv.className = 'export-progress';
        progressDiv.innerHTML = `
            <span class="material-symbols-outlined">download</span>
            <h4>Exporting Card</h4>
            <p>Generating high-quality image...</p>
        `;
        
        document.body.appendChild(progressDiv);
    }
    
    hideExportProgress() {
        const progressDiv = document.getElementById('exportProgress');
        if (progressDiv) {
            progressDiv.remove();
        }
    }
    
    showExportSuccess(format) {
        const successDiv = document.createElement('div');
        successDiv.className = 'export-success';
        successDiv.innerHTML = `
            <span class="material-symbols-outlined">check_circle</span>
            Card exported successfully as ${format.toUpperCase()}
        `;
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }
    
    showExportError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'export-error';
        errorDiv.innerHTML = `
            <span class="material-symbols-outlined">error</span>
            Export failed: ${message}
        `;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
    
    initializeCanvas() {
        if (!this.canvas || !this.ctx) return;
        
        // Configuration haute résolution pour le rendu
        this.canvas.width = this.cardDimensions.width;
        this.canvas.height = this.cardDimensions.height;
        
        // Taille d'affichage pour le preview
        this.canvas.style.width = this.cardDimensions.displayWidth + 'px';
        this.canvas.style.height = this.cardDimensions.displayHeight + 'px';
        
        // Configuration du contexte pour une meilleure qualité
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        this.ctx.textBaseline = 'top';
        
        // Effacer le canvas
        this.clearCanvas();
    }
    
    async loadAssets() {
        try {
            // Charger le logo SCP
            this.logoImage = await this.loadImage('assets/scp-logo.svg');
        } catch (error) {
            console.log('Logo SCP non trouvé, utilisation du texte de remplacement');
        }
    }
    
    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }
    
    clearCanvas() {
        if (!this.ctx) return;
        
        this.ctx.fillStyle = '#f0f0f0';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Afficher le placeholder
        this.showPlaceholder();
    }
    
    showPlaceholder() {
        const placeholder = document.getElementById('previewPlaceholder');
        if (placeholder) {
            placeholder.style.display = 'flex';
        }
        
        if (this.canvas) {
            this.canvas.style.display = 'none';
        }
    }
    
    hidePlaceholder() {
        const placeholder = document.getElementById('previewPlaceholder');
        if (placeholder) {
            placeholder.style.display = 'none';
        }
        
        if (this.canvas) {
            this.canvas.style.display = 'block';
        }
    }
    
    loadTemplate(cardType) {
        return new CardTemplate(cardType);
    }
    
    updatePreview(fieldData) {
        // Debug logging
        console.log('🔄 Updating preview with data:', fieldData);
        
        // Merge new data with existing form data
        this.formData = { ...this.formData, ...fieldData };
        
        console.log('📝 Current form data:', this.formData);
        
        // Gérer l'upload de photo si présent
        if (fieldData.photo && fieldData.photo instanceof File) {
            console.log('📷 Processing photo upload...');
            this.handlePhotoUpload(fieldData.photo).then(() => {
                this.renderPreview();
            }).catch(error => {
                console.error('Erreur photo:', error);
                this.renderPreview();
            });
        } else {
            this.renderPreview();
        }
    }
    
    renderPreview() {
        // Skip if real-time preview is disabled (for performance in batch mode)
        if (this.disableRealTimePreview) return;
        
        // Toujours afficher le progrès ou la carte
        this.showPreviewProgress();
        
        // Déclencher l'événement de mise à jour du preview
        this.dispatchPreviewUpdateEvent();
        
        // Mettre à jour les indicateurs visuels
        this.updatePreviewIndicators();
    }
    
    updatePreviewIndicators() {
        // Mettre à jour les indicateurs de validation en temps réel
        const status = this.getPreviewCompletionStatus();
        
        // Mettre à jour le bouton de génération
        const generateBtn = document.getElementById('generateCard');
        if (generateBtn) {
            generateBtn.disabled = status.percentage < 100;
            generateBtn.classList.toggle('ready', status.percentage === 100);
        }
        
        // Mettre à jour les indicateurs de champs
        this.updateFieldIndicators();
    }
    
    updateFieldIndicators() {
        const cardTypeConfig = new UnifiedCardInterface().cardTypes[this.cardType];
        if (!cardTypeConfig) return;
        
        cardTypeConfig.requiredFields.forEach(fieldName => {
            const field = document.getElementById(fieldName);
            const fieldContainer = field ? field.closest('.form-field') : null;
            
            if (field && fieldContainer) {
                const hasValue = this.formData[fieldName] && 
                    (typeof this.formData[fieldName] === 'string' ? 
                     this.formData[fieldName].trim() !== '' : true);
                
                fieldContainer.classList.toggle('completed', hasValue);
                fieldContainer.classList.toggle('pending', !hasValue);
            }
        });
    }
    
    // Méthode pour prévisualiser les changements avant de les appliquer
    previewFieldChange(fieldName, value) {
        const originalValue = this.formData[fieldName];
        this.formData[fieldName] = value;
        
        // Rendu temporaire
        this.renderPreview();
        
        // Restaurer la valeur originale après un délai
        setTimeout(() => {
            this.formData[fieldName] = originalValue;
        }, 100);
    }
    
    dispatchPreviewUpdateEvent() {
        const event = new CustomEvent('cardPreviewUpdated', {
            detail: {
                cardType: this.cardType,
                formData: this.formData,
                isValid: this.hasRequiredData()
            }
        });
        document.dispatchEvent(event);
    }
    
    hasRequiredData() {
        // Obtenir les champs requis pour ce type de carte
        const cardTypeConfig = new UnifiedCardInterface().cardTypes[this.cardType];
        if (!cardTypeConfig) return false;
        
        const requiredFields = cardTypeConfig.requiredFields;
        return requiredFields.every(field => {
            const value = this.formData[field];
            return value && (typeof value === 'string' ? value.trim() !== '' : true);
        });
    }
    
    getPreviewCompletionStatus() {
        const cardTypeConfig = new UnifiedCardInterface().cardTypes[this.cardType];
        if (!cardTypeConfig) return { percentage: 0, completed: 0, total: 0 };
        
        const requiredFields = cardTypeConfig.requiredFields;
        let completed = 0;
        
        requiredFields.forEach(field => {
            const value = this.formData[field];
            if (value && (typeof value === 'string' ? value.trim() !== '' : true)) {
                completed++;
            }
        });
        
        return {
            percentage: Math.round((completed / requiredFields.length) * 100),
            completed: completed,
            total: requiredFields.length
        };
    }
    
    showPreviewProgress() {
        const status = this.getPreviewCompletionStatus();
        
        if (status.percentage < 100) {
            this.showProgressPlaceholder(status);
        } else {
            this.hidePlaceholder();
            // Render the actual card when all required fields are filled
            try {
                this.renderCard();
                
                // Enable export button when card is successfully rendered
                const exportBtn = document.getElementById('exportCard');
                if (exportBtn) {
                    exportBtn.disabled = false;
                }
            } catch (error) {
                console.error('Error rendering card preview:', error);
                this.showErrorPlaceholder(error.message);
            }
        }
    }
    
    showProgressPlaceholder(status) {
        const placeholder = document.getElementById('previewPlaceholder');
        if (!placeholder) return;
        
        placeholder.style.display = 'flex';
        placeholder.innerHTML = `
            <div class="preview-progress-content">
                <span class="material-symbols-outlined">badge</span>
                <h4>Card Preview</h4>
                <div class="preview-progress-bar">
                    <div class="preview-progress-fill" style="width: ${status.percentage}%"></div>
                </div>
                <p>${status.completed} of ${status.total} required fields completed</p>
                <small>Fill in the required information to see the card preview</small>
            </div>
        `;
        
        if (this.canvas) {
            this.canvas.style.display = 'none';
        }
    }
    
    showErrorPlaceholder(errorMessage) {
        const placeholder = document.getElementById('previewPlaceholder');
        if (!placeholder) return;
        
        placeholder.style.display = 'flex';
        placeholder.innerHTML = `
            <div class="preview-error-content">
                <span class="material-symbols-outlined" style="color: #dc3545;">error</span>
                <h4>Preview Error</h4>
                <p style="color: #dc3545;">${errorMessage}</p>
                <small>Please check your form data and try again</small>
            </div>
        `;
        
        if (this.canvas) {
            this.canvas.style.display = 'none';
        }
    }
    
    renderCard() {
        if (!this.ctx) return;
        
        // Effacer le canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Dessiner les couches dans l'ordre
        this.drawBackground();
        this.drawBorder();
        this.drawHeader();
        this.drawLogo();
        this.drawTextInformation();
        this.drawClassificationBand();
        this.drawSecurityElements();
        this.drawPhoto();
        this.drawWatermark();
    }
    
    drawBackground() {
        const colors = this.template.colors;
        
        // Fond principal avec gradient subtil
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, colors.secondary);
        gradient.addColorStop(1, this.lightenColor(colors.secondary, -5));
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Motif de fond subtil pour la sécurité
        this.drawSecurityPattern();
    }
    
    drawHeader() {
        const colors = this.template.colors;
        
        // Bande de couleur principale selon le type
        const headerGradient = this.ctx.createLinearGradient(0, 0, 0, 80);
        headerGradient.addColorStop(0, colors.primary);
        headerGradient.addColorStop(1, this.darkenColor(colors.primary, 20));
        
        this.ctx.fillStyle = headerGradient;
        this.ctx.fillRect(0, 0, this.canvas.width, 80);
        
        // Ligne de séparation
        this.ctx.fillStyle = colors.accent;
        this.ctx.fillRect(0, 78, this.canvas.width, 4);
    }
    
    drawSecurityPattern() {
        // Motif de sécurité en arrière-plan (très subtil)
        this.ctx.save();
        this.ctx.globalAlpha = 0.02;
        this.ctx.fillStyle = '#000000';
        
        // Motif de losanges
        for (let x = 0; x < this.canvas.width; x += 40) {
            for (let y = 100; y < this.canvas.height - 60; y += 40) {
                this.ctx.save();
                this.ctx.translate(x + 20, y + 20);
                this.ctx.rotate(Math.PI / 4);
                this.ctx.fillRect(-8, -8, 16, 16);
                this.ctx.restore();
            }
        }
        
        this.ctx.restore();
    }
    
    drawBorder() {
        const colors = this.template.colors;
        
        // Bordure principale
        this.ctx.strokeStyle = colors.primary;
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(2, 2, this.canvas.width - 4, this.canvas.height - 4);
        
        // Bordure intérieure
        this.ctx.strokeStyle = this.lightenColor(colors.primary, 30);
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(8, 8, this.canvas.width - 16, this.canvas.height - 16);
        
        // Coins arrondis pour un aspect plus moderne
        this.drawRoundedCorners();
    }
    
    drawRoundedCorners() {
        const radius = 12;
        const colors = this.template.colors;
        
        this.ctx.fillStyle = colors.secondary;
        
        // Coins supérieurs
        this.ctx.beginPath();
        this.ctx.arc(radius, radius, radius, Math.PI, 1.5 * Math.PI);
        this.ctx.arc(this.canvas.width - radius, radius, radius, 1.5 * Math.PI, 0);
        this.ctx.arc(this.canvas.width - radius, this.canvas.height - radius, radius, 0, 0.5 * Math.PI);
        this.ctx.arc(radius, this.canvas.height - radius, radius, 0.5 * Math.PI, Math.PI);
        this.ctx.closePath();
        this.ctx.clip();
    }
    
    drawLogo() {
        const logoX = 20;
        const logoY = 15;
        const logoSize = 50;
        
        if (this.logoImage) {
            // Dessiner le logo SCP si disponible
            this.ctx.drawImage(this.logoImage, logoX, logoY, logoSize, logoSize);
        } else {
            // Logo de remplacement
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 32px Roboto';
            this.ctx.fillText('SCP', logoX, logoY + 25);
        }
        
        // Texte "FOUNDATION"
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 16px Roboto';
        this.ctx.fillText('FOUNDATION', logoX + logoSize + 15, logoY + 20);
        
        // Sous-titre "SECURE • CONTAIN • PROTECT"
        this.ctx.font = '10px Roboto';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.fillText('SECURE • CONTAIN • PROTECT', logoX + logoSize + 15, logoY + 40);
        
        // Classification du site (si applicable)
        if (this.formData.siteDesignation) {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 14px Roboto';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(this.formData.siteDesignation, this.canvas.width - 20, logoY + 25);
            this.ctx.textAlign = 'left';
        }
    }
    
    drawTextInformation() {
        const startY = 100;
        let currentY = startY;
        const leftMargin = 25;
        const lineHeight = 32;
        const smallLineHeight = 26;
        
        // Nom complet - élément principal
        if (this.formData.fullName) {
            this.ctx.fillStyle = '#000000';
            this.ctx.font = 'bold 32px Roboto';
            const name = this.formData.fullName.toUpperCase();
            this.ctx.fillText(name, leftMargin, currentY);
            currentY += 45;
            
            // Ligne de séparation sous le nom
            this.ctx.fillStyle = this.template.colors.primary;
            this.ctx.fillRect(leftMargin, currentY - 5, 300, 2);
            currentY += 15;
        }
        
        // ID employé avec style distinctif
        if (this.formData.employeeId) {
            this.ctx.fillStyle = '#000000';
            this.ctx.font = 'bold 22px Roboto';
            this.ctx.fillText(`ID: ${this.formData.employeeId}`, leftMargin, currentY);
            currentY += lineHeight;
        }
        
        // Niveau de clearance avec badge visuel
        if (this.formData.clearanceLevel) {
            this.drawClearanceBadge(leftMargin, currentY - 8, this.formData.clearanceLevel);
            currentY += lineHeight + 5;
        }
        
        // Informations d'affectation
        const assignmentY = currentY;
        
        // Département
        if (this.formData.department) {
            this.ctx.fillStyle = '#333333';
            this.ctx.font = 'bold 16px Roboto';
            this.ctx.fillText('DEPARTMENT:', leftMargin, currentY);
            this.ctx.font = '16px Roboto';
            this.ctx.fillText(this.formData.department.toUpperCase(), leftMargin + 120, currentY);
            currentY += smallLineHeight;
        }
        
        // Site ou MTF avec informations spécialisées
        if (this.formData.siteDesignation) {
            const facility = window.scpCardApp && window.scpCardApp.siteManager ? 
                window.scpCardApp.siteManager.getSite(this.formData.siteDesignation) : null;
            
            this.ctx.fillStyle = '#333333';
            this.ctx.font = 'bold 16px Roboto';
            
            if (facility && facility.isMTF()) {
                this.ctx.fillText('MTF UNIT:', leftMargin, currentY);
                this.ctx.font = '16px Roboto';
                this.ctx.fillStyle = this.template.colors.primary;
                this.ctx.fillText(this.formData.siteDesignation, leftMargin + 90, currentY);
                currentY += smallLineHeight;
                
                // Spécialisation MTF
                if (facility.specialization) {
                    this.ctx.fillStyle = '#666666';
                    this.ctx.font = '14px Roboto';
                    this.ctx.fillText(`"${facility.specialization}"`, leftMargin, currentY);
                    currentY += smallLineHeight - 2;
                }
            } else {
                this.ctx.fillText('SITE:', leftMargin, currentY);
                this.ctx.font = '16px Roboto';
                this.ctx.fillStyle = this.template.colors.primary;
                this.ctx.fillText(this.formData.siteDesignation, leftMargin + 50, currentY);
                currentY += smallLineHeight;
            }
        }
        
        // Position/Titre
        if (this.formData.position) {
            this.ctx.fillStyle = '#333333';
            this.ctx.font = 'bold 16px Roboto';
            this.ctx.fillText('POSITION:', leftMargin, currentY);
            this.ctx.font = '16px Roboto';
            this.ctx.fillText(this.formData.position.toUpperCase(), leftMargin + 90, currentY);
            currentY += smallLineHeight;
        }
        
        // Dates dans la partie inférieure
        this.drawDateInformation();
    }
    
    drawClearanceBadge(x, y, level) {
        const badgeWidth = 180;
        const badgeHeight = 28;
        const colors = this.template.colors;
        
        // Fond du badge
        const gradient = this.ctx.createLinearGradient(x, y, x, y + badgeHeight);
        gradient.addColorStop(0, colors.primary);
        gradient.addColorStop(1, this.darkenColor(colors.primary, 20));
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(x, y, badgeWidth, badgeHeight);
        
        // Bordure du badge
        this.ctx.strokeStyle = this.darkenColor(colors.primary, 30);
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, badgeWidth, badgeHeight);
        
        // Texte du niveau de clearance
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 16px Roboto';
        this.ctx.textAlign = 'center';
        
        const levelText = level === '0' ? 'D-CLASS' : `CLEARANCE LEVEL ${level}`;
        this.ctx.fillText(levelText, x + badgeWidth/2, y + 18);
        this.ctx.textAlign = 'left';
        
        // Indicateurs de sécurité
        for (let i = 0; i < parseInt(level); i++) {
            this.ctx.fillStyle = colors.accent;
            this.ctx.fillRect(x + badgeWidth - 25 + (i * 4), y + 5, 2, 18);
        }
    }
    
    drawDateInformation() {
        const bottomY = this.canvas.height - 80;
        const leftMargin = 25;
        
        this.ctx.fillStyle = '#666666';
        this.ctx.font = '12px Roboto';
        
        if (this.formData.issueDate) {
            this.ctx.fillText(`ISSUED: ${this.formatDate(this.formData.issueDate)}`, leftMargin, bottomY);
        }
        
        if (this.formData.expirationDate) {
            this.ctx.fillText(`EXPIRES: ${this.formatDate(this.formData.expirationDate)}`, leftMargin, bottomY + 15);
            
            // Avertissement si proche de l'expiration
            const expiryDate = new Date(this.formData.expirationDate);
            const today = new Date();
            const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
            
            if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
                this.ctx.fillStyle = '#ff6600';
                this.ctx.font = 'bold 12px Roboto';
                this.ctx.fillText(`⚠ EXPIRES IN ${daysUntilExpiry} DAYS`, leftMargin, bottomY + 30);
            } else if (daysUntilExpiry <= 0) {
                this.ctx.fillStyle = '#cc0000';
                this.ctx.font = 'bold 12px Roboto';
                this.ctx.fillText('⚠ EXPIRED', leftMargin, bottomY + 30);
            }
        }
    }
    
    drawClassificationBand() {
        const bandHeight = 35;
        const bandY = this.canvas.height - bandHeight - 45;
        const colors = this.template.colors;
        
        // Fond de la bande de classification
        this.ctx.fillStyle = colors.primary;
        this.ctx.fillRect(0, bandY, this.canvas.width, bandHeight);
        
        // Texte de classification
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 18px Roboto';
        this.ctx.textAlign = 'center';
        
        let classification = this.getClassificationText();
        this.ctx.fillText(classification, this.canvas.width / 2, bandY + 22);
        this.ctx.textAlign = 'left';
        
        // Indicateurs de sécurité sur les côtés
        this.drawSecurityIndicators(bandY, bandHeight);
    }
    
    getClassificationText() {
        switch (this.cardType) {
            case 'researcher':
                return 'RESEARCH PERSONNEL';
            case 'security':
                return 'SECURITY PERSONNEL';
            case 'dclass':
                return 'D-CLASS SUBJECT';
            case 'o5':
                return 'O5 COUNCIL MEMBER';
            case 'mtf':
                return 'MTF OPERATIVE';
            default:
                return 'FOUNDATION PERSONNEL';
        }
    }
    
    drawSecurityIndicators(bandY, bandHeight) {
        const colors = this.template.colors;
        
        // Indicateurs gauche
        for (let i = 0; i < 3; i++) {
            this.ctx.fillStyle = colors.accent;
            this.ctx.fillRect(10 + (i * 8), bandY + 8, 4, bandHeight - 16);
        }
        
        // Indicateurs droite
        for (let i = 0; i < 3; i++) {
            this.ctx.fillStyle = colors.accent;
            this.ctx.fillRect(this.canvas.width - 34 + (i * 8), bandY + 8, 4, bandHeight - 16);
        }
    }
    
    drawSecurityElements() {
        // Code-barres amélioré
        this.drawBarcode();
        
        // QR Code placeholder
        this.drawQRCode();
        
        // Numéro de série
        this.drawSerialNumber();
        
        // Hologramme simulé
        this.drawHologram();
    }
    
    drawBarcode() {
        const barcodeY = this.canvas.height - 35;
        const barcodeX = 25;
        const barcodeWidth = 200;
        
        this.ctx.fillStyle = '#000000';
        
        // Générer un code-barres basé sur l'ID employé
        const employeeId = this.formData.employeeId || 'SCP-0000-000';
        const barcodeData = employeeId.replace(/[^0-9]/g, '');
        
        for (let i = 0; i < barcodeData.length * 3; i++) {
            const barWidth = Math.random() > 0.5 ? 2 : 1;
            const barHeight = 20 + (parseInt(barcodeData[i % barcodeData.length]) * 2);
            this.ctx.fillRect(barcodeX + (i * 3), barcodeY - barHeight, barWidth, barHeight);
        }
        
        // Texte sous le code-barres
        this.ctx.fillStyle = '#666666';
        this.ctx.font = '10px Roboto';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(employeeId, barcodeX + barcodeWidth/2, barcodeY + 15);
        this.ctx.textAlign = 'left';
    }
    
    drawQRCode() {
        const qrSize = 60;
        const qrX = this.canvas.width - qrSize - 25;
        const qrY = this.canvas.height - qrSize - 25;
        
        // Fond blanc pour le QR code
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(qrX, qrY, qrSize, qrSize);
        
        // Bordure
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(qrX, qrY, qrSize, qrSize);
        
        // Pattern QR simulé
        this.ctx.fillStyle = '#000000';
        const cellSize = 3;
        for (let x = 0; x < qrSize; x += cellSize) {
            for (let y = 0; y < qrSize; y += cellSize) {
                if (Math.random() > 0.5) {
                    this.ctx.fillRect(qrX + x, qrY + y, cellSize, cellSize);
                }
            }
        }
        
        // Coins de positionnement
        this.drawQRCorner(qrX + 3, qrY + 3, 15);
        this.drawQRCorner(qrX + qrSize - 18, qrY + 3, 15);
        this.drawQRCorner(qrX + 3, qrY + qrSize - 18, 15);
    }
    
    drawQRCorner(x, y, size) {
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(x, y, size, size);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(x + 3, y + 3, size - 6, size - 6);
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(x + 6, y + 6, size - 12, size - 12);
    }
    
    drawSerialNumber() {
        const serialX = this.canvas.width - 150;
        const serialY = this.canvas.height - 100;
        
        // Générer un numéro de série basé sur les données
        const serial = this.generateSerialNumber();
        
        this.ctx.fillStyle = '#999999';
        this.ctx.font = '10px Roboto';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`S/N: ${serial}`, serialX, serialY);
        this.ctx.textAlign = 'left';
    }
    
    drawHologram() {
        // Effet holographique simulé dans le coin supérieur droit
        const holoX = this.canvas.width - 100;
        const holoY = 90;
        const holoSize = 80;
        
        this.ctx.save();
        this.ctx.globalAlpha = 0.3;
        
        // Gradient irisé
        const gradient = this.ctx.createRadialGradient(
            holoX + holoSize/2, holoY + holoSize/2, 0,
            holoX + holoSize/2, holoY + holoSize/2, holoSize/2
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.3, 'rgba(0, 255, 255, 0.6)');
        gradient.addColorStop(0.6, 'rgba(255, 0, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 255, 0, 0.2)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(holoX, holoY, holoSize, holoSize);
        
        // Motif holographique
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < 8; i++) {
            this.ctx.beginPath();
            this.ctx.arc(holoX + holoSize/2, holoY + holoSize/2, i * 8, 0, 2 * Math.PI);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }
    
    drawPhoto() {
        const photoX = this.canvas.width - 170;
        const photoY = 100;
        const photoWidth = 140;
        const photoHeight = 180;
        const borderWidth = 3;
        
        // Bordure de la photo
        this.ctx.fillStyle = this.template.colors.primary;
        this.ctx.fillRect(photoX - borderWidth, photoY - borderWidth, 
                         photoWidth + (borderWidth * 2), photoHeight + (borderWidth * 2));
        
        if (this.photoImage) {
            // Dessiner la photo réelle
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.rect(photoX, photoY, photoWidth, photoHeight);
            this.ctx.clip();
            
            // Calculer les dimensions pour maintenir le ratio
            const crop = this.calculateImageCrop(this.photoImage, { width: photoWidth, height: photoHeight });
            
            this.ctx.drawImage(
                this.photoImage,
                crop.x, crop.y, crop.width, crop.height,
                photoX, photoY, photoWidth, photoHeight
            );
            
            this.ctx.restore();
        } else {
            // Placeholder photo
            this.ctx.fillStyle = '#f8f8f8';
            this.ctx.fillRect(photoX, photoY, photoWidth, photoHeight);
            
            // Bordure intérieure
            this.ctx.strokeStyle = '#dddddd';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(photoX, photoY, photoWidth, photoHeight);
            
            // Icône placeholder
            this.ctx.fillStyle = '#cccccc';
            this.ctx.font = '60px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('👤', photoX + photoWidth/2, photoY + photoHeight/2 + 20);
            this.ctx.textAlign = 'left';
            
            // Texte "PHOTO REQUIRED"
            this.ctx.fillStyle = '#999999';
            this.ctx.font = 'bold 12px Roboto';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('PHOTO', photoX + photoWidth/2, photoY + photoHeight - 20);
            this.ctx.fillText('REQUIRED', photoX + photoWidth/2, photoY + photoHeight - 5);
            this.ctx.textAlign = 'left';
        }
        
        // Overlay de sécurité sur la photo
        this.drawPhotoSecurityOverlay(photoX, photoY, photoWidth, photoHeight);
    }
    
    drawPhotoSecurityOverlay(x, y, width, height) {
        this.ctx.save();
        this.ctx.globalAlpha = 0.1;
        
        // Lignes de sécurité diagonales
        this.ctx.strokeStyle = this.template.colors.primary;
        this.ctx.lineWidth = 1;
        
        for (let i = -height; i < width; i += 20) {
            this.ctx.beginPath();
            this.ctx.moveTo(x + i, y);
            this.ctx.lineTo(x + i + height, y + height);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }
    
    drawWatermark() {
        // Filigrane de sécurité
        this.ctx.save();
        this.ctx.globalAlpha = 0.05;
        this.ctx.fillStyle = this.template.colors.primary;
        this.ctx.font = 'bold 48px Roboto';
        this.ctx.textAlign = 'center';
        this.ctx.translate(this.canvas.width/2, this.canvas.height/2);
        this.ctx.rotate(-Math.PI/6);
        this.ctx.fillText('SCP FOUNDATION', 0, 0);
        this.ctx.restore();
    }
    
    formatDate(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }
    
    generateSerialNumber() {
        const employeeId = this.formData.employeeId || 'SCP-0000-000';
        const hash = this.hashString(employeeId + this.cardType);
        return Math.abs(hash).toString().substring(0, 8).toUpperCase();
    }
    
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash;
    }
    
    calculateImageCrop(image, targetSize) {
        const aspectRatio = targetSize.width / targetSize.height;
        let width, height;
        
        if (aspectRatio >= image.naturalWidth / image.naturalHeight) {
            width = image.naturalWidth;
            height = image.naturalWidth / aspectRatio;
        } else {
            width = image.naturalHeight * aspectRatio;
            height = image.naturalHeight;
        }
        
        return {
            x: (image.naturalWidth - width) / 2,
            y: (image.naturalHeight - height) / 2,
            width: width,
            height: height
        };
    }
    
    lightenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }
    
    darkenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return "#" + (0x1000000 + (R > 255 ? 255 : R < 0 ? 0 : R) * 0x10000 +
            (G > 255 ? 255 : G < 0 ? 0 : G) * 0x100 +
            (B > 255 ? 255 : B < 0 ? 0 : B)).toString(16).slice(1);
    }
    
    async handlePhotoUpload(file) {
        if (!file) {
            this.photoImage = null;
            return;
        }
        
        try {
            // Valider le fichier
            if (!file.type.startsWith('image/')) {
                throw new Error('Le fichier doit être une image');
            }
            
            if (file.size > 5 * 1024 * 1024) { // 5MB max
                throw new Error('L\'image ne peut pas dépasser 5MB');
            }
            
            // Charger l\'image
            const imageUrl = URL.createObjectURL(file);
            this.photoImage = await this.loadImage(imageUrl);
            
            // Nettoyer l'URL temporaire
            URL.revokeObjectURL(imageUrl);
            
            // Mettre à jour le preview
            this.renderCard();
            
        } catch (error) {
            console.error('Erreur lors du chargement de la photo:', error);
            throw error;
        }
    }
    
    validateForm(data) {
        // Use enhanced validation if available
        if (window.PersonnelValidator) {
            try {
                const validator = new PersonnelValidator(window.scpCardApp && window.scpCardApp.siteManager);
                const validation = validator.validatePersonnelData(data, this.cardType);
                
                return {
                    isValid: validation.isValid,
                    errors: validation.errors || [],
                    warnings: validation.warnings || [],
                    completionPercentage: validation.completionPercentage || 0
                };
            } catch (error) {
                console.error('Enhanced validation failed, falling back to basic validation:', error);
                return this.validateFormBasic(data);
            }
        } else {
            return this.validateFormBasic(data);
        }
    }
    
    validateFormBasic(data) {
        // Fallback basic validation
        const errors = [];
        const cardTypeConfig = new UnifiedCardInterface().cardTypes[this.cardType];
        
        // Vérifier les champs requis
        cardTypeConfig.requiredFields.forEach(field => {
            if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
                errors.push(new ValidationError(
                    field,
                    `${this.getFieldLabel(field)} est requis`,
                    'REQUIRED_FIELD',
                    { cardType: this.cardType }
                ));
            }
        });
        
        // Validation spécifique de l'ID employé
        if (data.employeeId && !/^SCP-\d{4}-\d{3}$/.test(data.employeeId)) {
            errors.push(new ValidationError(
                'employeeId',
                'Format d\'ID invalide (SCP-0000-000)',
                'INVALID_FORMAT',
                { pattern: 'SCP-XXXX-XXX', value: data.employeeId }
            ));
        }
        
        // Validation des dates
        if (data.issueDate && data.expirationDate) {
            const issueDate = new Date(data.issueDate);
            const expirationDate = new Date(data.expirationDate);
            
            if (expirationDate <= issueDate) {
                errors.push(new ValidationError(
                    'expirationDate',
                    'La date d\'expiration doit être postérieure à la date d\'émission',
                    'INVALID_DATE_RANGE',
                    { issueDate: data.issueDate, expirationDate: data.expirationDate }
                ));
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors,
            warnings: [],
            completionPercentage: this.calculateBasicCompletionPercentage(data, cardTypeConfig.requiredFields)
        };
    }
    
    calculateBasicCompletionPercentage(data, requiredFields) {
        let completedFields = 0;
        
        for (const field of requiredFields) {
            if (data[field] && (typeof data[field] !== 'string' || data[field].trim() !== '')) {
                completedFields++;
            }
        }
        
        return Math.round((completedFields / requiredFields.length) * 100);
    }
    
    getFieldLabel(field) {
        const labels = {
            fullName: 'Nom complet',
            employeeId: 'ID employé',
            siteDesignation: 'Désignation du site',
            department: 'Département',
            clearanceLevel: 'Niveau de clearance',
            position: 'Position',
            issueDate: 'Date d\'émission',
            expirationDate: 'Date d\'expiration'
        };
        
        return labels[field] || field;
    }
    
    generateCard(data) {
        this.formData = data;
        this.renderCard();
    }
    
    exportCard(format = 'png', options = {}) {
        if (!this.canvas) return;
        
        try {
            const fileName = this.generateFileName(format);
            
            if (format === 'pdf') {
                this.exportToPDF(fileName, options);
            } else {
                this.exportToImage(format, fileName, options);
            }
            
        } catch (error) {
            console.error('Erreur lors de l\'export:', error);
            throw error;
        }
    }
    
    exportToImage(format, fileName, options = {}) {
        const quality = options.quality || (format === 'jpg' ? 0.95 : 1.0);
        const resolution = options.resolution || this.dpi;
        
        let dataUrl;
        if (format === 'png') {
            dataUrl = this.canvas.toDataURL('image/png');
        } else if (format === 'jpg' || format === 'jpeg') {
            dataUrl = this.canvas.toDataURL('image/jpeg', quality);
        } else {
            throw new Error(`Format ${format} non supporté`);
        }
        
        // Créer le lien de téléchargement
        const link = document.createElement('a');
        link.download = fileName;
        link.href = dataUrl;
        link.click();
        
        // Nettoyer
        setTimeout(() => {
            URL.revokeObjectURL(link.href);
        }, 100);
    }
    
    exportToPDF(fileName, options = {}) {
        // Approche simple pour l'export PDF sans bibliothèque externe
        // Créer une nouvelle fenêtre avec la carte pour impression
        
        const printWindow = window.open('', '_blank');
        const cardDataUrl = this.canvas.toDataURL('image/png');
        
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>SCP Card - ${this.formData.employeeId || 'Unknown'}</title>
                <style>
                    @page {
                        size: 85.6mm 54mm;
                        margin: 0;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        background: white;
                    }
                    .card-container {
                        width: 85.6mm;
                        height: 54mm;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                    }
                    .card-image {
                        max-width: 100%;
                        max-height: 100%;
                        object-fit: contain;
                    }
                    @media print {
                        body {
                            min-height: auto;
                        }
                        .card-container {
                            width: 100%;
                            height: 100%;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="card-container">
                    <img src="${cardDataUrl}" alt="SCP Personnel Card" class="card-image">
                </div>
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            setTimeout(function() {
                                window.close();
                            }, 1000);
                        }, 500);
                    };
                </script>
            </body>
            </html>
        `;
        
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    }
    
    generateFileName(format) {
        const employeeId = this.formData.employeeId || 'unknown';
        const cardType = this.cardType;
        const timestamp = new Date().toISOString().slice(0, 10);
        
        return `scp-card-${cardType}-${employeeId}-${timestamp}.${format}`;
    }
    
    // Méthode pour créer une version haute résolution pour l'impression
    createHighResolutionCanvas(scaleFactor = 2) {
        const highResCanvas = document.createElement('canvas');
        const highResCtx = highResCanvas.getContext('2d');
        
        // Dimensions haute résolution
        highResCanvas.width = this.canvas.width * scaleFactor;
        highResCanvas.height = this.canvas.height * scaleFactor;
        
        // Configurer le contexte
        highResCtx.imageSmoothingEnabled = true;
        highResCtx.imageSmoothingQuality = 'high';
        highResCtx.scale(scaleFactor, scaleFactor);
        
        // Sauvegarder le contexte original
        const originalCtx = this.ctx;
        const originalCanvas = this.canvas;
        
        // Utiliser le contexte haute résolution temporairement
        this.ctx = highResCtx;
        this.canvas = highResCanvas;
        
        // Rendre la carte en haute résolution
        this.renderCard();
        
        // Restaurer le contexte original
        this.ctx = originalCtx;
        this.canvas = originalCanvas;
        
        return highResCanvas;
    }
    
    exportHighResolution(format = 'png', scaleFactor = 2) {
        const highResCanvas = this.createHighResolutionCanvas(scaleFactor);
        const fileName = this.generateFileName(format).replace(`.${format}`, `-hires.${format}`);
        
        let dataUrl;
        if (format === 'png') {
            dataUrl = highResCanvas.toDataURL('image/png');
        } else if (format === 'jpg' || format === 'jpeg') {
            dataUrl = highResCanvas.toDataURL('image/jpeg', 0.95);
        }
        
        const link = document.createElement('a');
        link.download = fileName;
        link.href = dataUrl;
        link.click();
        
        // Nettoyer
        setTimeout(() => {
            URL.revokeObjectURL(link.href);
        }, 100);
    }
    
    // Méthode pour exporter avec options avancées
    exportWithOptions(options = {}) {
        const {
            format = 'png',
            quality = 0.95,
            scaleFactor = 1,
            includeMetadata = true,
            watermark = false
        } = options;
        
        let canvas = this.canvas;
        
        // Créer une version haute résolution si nécessaire
        if (scaleFactor > 1) {
            canvas = this.createHighResolutionCanvas(scaleFactor);
        }
        
        // Ajouter un filigrane si demandé
        if (watermark) {
            this.addWatermarkToCanvas(canvas);
        }
        
        // Générer le nom de fichier
        const fileName = this.generateFileName(format);
        
        // Exporter selon le format
        if (format === 'pdf') {
            this.exportToPDF(fileName, options);
        } else {
            const dataUrl = canvas.toDataURL(`image/${format}`, quality);
            this.downloadFile(dataUrl, fileName);
        }
    }
    
    addWatermarkToCanvas(canvas) {
        const ctx = canvas.getContext('2d');
        const originalComposite = ctx.globalCompositeOperation;
        
        ctx.save();
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = '#000000';
        ctx.font = `${canvas.width * 0.08}px Roboto`;
        ctx.textAlign = 'center';
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(-Math.PI / 6);
        ctx.fillText('SCP FOUNDATION', 0, 0);
        ctx.restore();
        
        ctx.globalCompositeOperation = originalComposite;
    }
    
    downloadFile(dataUrl, fileName) {
        const link = document.createElement('a');
        link.download = fileName;
        link.href = dataUrl;
        
        // Ajouter temporairement au DOM pour le téléchargement
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Nettoyer l'URL après un délai
        setTimeout(() => {
            if (dataUrl.startsWith('blob:')) {
                URL.revokeObjectURL(dataUrl);
            }
        }, 100);
    }
    
    // Méthode pour obtenir les métadonnées de la carte
    updateFormProgress() {
        const progressBar = document.getElementById('progressBarFill');
        const progressPercentage = document.getElementById('progressPercentage');
        const progressDetails = document.getElementById('progressDetails');
        
        if (!progressBar || !progressPercentage || !progressDetails) return;
        
        const status = this.getPreviewCompletionStatus();
        
        // Update progress bar
        progressBar.style.width = `${status.percentage}%`;
        progressBar.setAttribute('aria-valuenow', status.percentage);
        
        // Update percentage text
        progressPercentage.textContent = `${status.percentage}%`;
        
        // Update details
        const completedSpan = progressDetails.querySelector('.completed-fields');
        const totalSpan = progressDetails.querySelector('.total-fields');
        
        if (completedSpan) completedSpan.textContent = status.completed;
        if (totalSpan) totalSpan.textContent = status.total;
        
        // Add visual feedback
        if (status.percentage === 100) {
            progressBar.style.backgroundColor = '#28a745';
            progressDetails.style.color = '#28a745';
        } else if (status.percentage >= 75) {
            progressBar.style.backgroundColor = '#ffc107';
            progressDetails.style.color = '#856404';
        } else {
            progressBar.style.backgroundColor = '#007bff';
            progressDetails.style.color = '#495057';
        }
    }
    
    getCardMetadata() {
        return {
            cardType: this.cardType,
            employeeId: this.formData.employeeId,
            fullName: this.formData.fullName,
            siteDesignation: this.formData.siteDesignation,
            department: this.formData.department,
            clearanceLevel: this.formData.clearanceLevel,
            issueDate: this.formData.issueDate,
            expirationDate: this.formData.expirationDate,
            generatedAt: new Date().toISOString(),
            generator: 'SCP Foundation Card Generator v1.0'
        };
    }
}

// Debug logging before export
console.log('🔧 About to export SCP classes to window object...');
console.log('- SCPCardGenerator defined:', typeof SCPCardGenerator);
console.log('- CardTemplate defined:', typeof CardTemplate);
console.log('- UnifiedCardInterface defined:', typeof UnifiedCardInterface);

// Make classes globally available
window.SCPCardGenerator = SCPCardGenerator;
window.CardTemplate = CardTemplate;
window.UnifiedCardInterface = UnifiedCardInterface;

// Verify export
console.log('✅ SCP classes exported to window object');
console.log('- window.SCPCardGenerator:', typeof window.SCPCardGenerator);
console.log('- window.CardTemplate:', typeof window.CardTemplate);
console.log('- window.UnifiedCardInterface:', typeof window.UnifiedCardInterface);

// Set a flag to indicate classes are ready
window.SCP_CARD_GENERATOR_LOADED = true;
window.SCP_CARD_GENERATOR_TIMESTAMP = Date.now();

// Dispatch a custom event
if (typeof document !== 'undefined') {
    document.dispatchEvent(new CustomEvent('scpCardGeneratorLoaded', {
        detail: {
            timestamp: window.SCP_CARD_GENERATOR_TIMESTAMP,
            classes: ['SCPCardGenerator', 'CardTemplate', 'UnifiedCardInterface']
        }
    }));
}
window.SCPCardGenerator=SCPCardGenerator
