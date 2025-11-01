/**
 * Data Models - Core data structures for SCP Card Generator
 */

/**
 * Personnel Card Model - Represents a complete personnel card
 */
class PersonnelCard {
    constructor(data = {}) {
        this.personalInfo = {
            fullName: data.fullName || '',
            employeeId: data.employeeId || '',
            photo: data.photo || null,
            dateOfBirth: data.dateOfBirth || null,
            nationality: data.nationality || '',
            bloodType: data.bloodType || ''
        };
        
        this.assignment = {
            siteDesignation: data.siteDesignation || '',
            siteName: data.siteName || '',
            department: data.department || '',
            departmentName: data.departmentName || '',
            clearanceLevel: data.clearanceLevel || 1,
            position: data.position || '',
            supervisor: data.supervisor || '',
            assignmentDate: data.assignmentDate ? new Date(data.assignmentDate) : new Date(),
            specialDesignations: data.specialDesignations || [],
            accessZones: data.accessZones || []
        };
        
        this.security = {
            issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
            expirationDate: data.expirationDate ? new Date(data.expirationDate) : null,
            emergencyContact: data.emergencyContact || '',
            biometricHash: data.biometricHash || '',
            accessCodes: data.accessCodes || [],
            securityNotes: data.securityNotes || '',
            lastUpdate: new Date()
        };
        
        this.cardType = data.cardType || 'researcher';
        this.template = data.template || null;
        this.isActive = data.isActive !== undefined ? data.isActive : true;
        this.metadata = {
            createdAt: new Date(),
            version: '1.0.0',
            generator: 'SCP Foundation Card Generator'
        };
    }
    
    /**
     * Validate the personnel card data
     */
    validate() {
        const errors = [];
        
        if (!this.personalInfo.fullName) {
            errors.push('Full name is required');
        }
        
        if (!this.personalInfo.employeeId) {
            errors.push('Employee ID is required');
        } else if (!/^SCP-\d{4}-\d{3}$/.test(this.personalInfo.employeeId)) {
            errors.push('Employee ID format is invalid (SCP-XXXX-XXX)');
        }
        
        if (!this.assignment.siteDesignation && this.cardType !== 'o5') {
            errors.push('Site designation is required');
        }
        
        if (!this.assignment.department && !['dclass', 'o5'].includes(this.cardType)) {
            errors.push('Department is required');
        }
        
        if (this.assignment.clearanceLevel < 0 || this.assignment.clearanceLevel > 5) {
            errors.push('Clearance level must be between 0 and 5');
        }
        
        if (!this.assignment.position) {
            errors.push('Position is required');
        }
        
        if (!this.security.issueDate) {
            errors.push('Issue date is required');
        }
        
        if (!this.security.expirationDate) {
            errors.push('Expiration date is required');
        } else if (this.security.expirationDate <= this.security.issueDate) {
            errors.push('Expiration date must be after issue date');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    
    /**
     * Convert to plain object for serialization
     */
    toJSON() {
        return {
            personalInfo: this.personalInfo,
            assignment: this.assignment,
            security: {
                ...this.security,
                issueDate: this.security.issueDate?.toISOString(),
                expirationDate: this.security.expirationDate?.toISOString(),
                lastUpdate: this.security.lastUpdate?.toISOString()
            },
            cardType: this.cardType,
            template: this.template,
            isActive: this.isActive,
            metadata: {
                ...this.metadata,
                createdAt: this.metadata.createdAt?.toISOString()
            }
        };
    }
    
    /**
     * Create from plain object
     */
    static fromJSON(data) {
        return new PersonnelCard(data);
    }
    
    /**
     * Get display name for the card
     */
    getDisplayName() {
        return this.personalInfo.fullName || 'Unknown Personnel';
    }
    
    /**
     * Get formatted employee ID
     */
    getFormattedEmployeeId() {
        return this.personalInfo.employeeId || 'SCP-XXXX-XXX';
    }
    
    /**
     * Check if card is expired
     */
    isExpired() {
        if (!this.security.expirationDate) return false;
        return new Date() > this.security.expirationDate;
    }
    
    /**
     * Get days until expiration
     */
    getDaysUntilExpiration() {
        if (!this.security.expirationDate) return null;
        const now = new Date();
        const expiry = this.security.expirationDate;
        const diffTime = expiry - now;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    /**
     * Check if card needs renewal (within 30 days of expiration)
     */
    needsRenewal() {
        const daysUntilExpiry = this.getDaysUntilExpiration();
        return daysUntilExpiry !== null && daysUntilExpiry <= 30;
    }
}

/**
 * Batch Job Model - Represents a batch processing job
 */
class BatchJob {
    constructor(data = {}) {
        this.batchId = data.batchId || this.generateBatchId();
        this.status = data.status || 'pending'; // pending, processing, completed, failed
        this.totalCards = data.totalCards || 0;
        this.processedCards = data.processedCards || 0;
        this.failedCards = data.failedCards || 0;
        this.startTime = data.startTime ? new Date(data.startTime) : null;
        this.endTime = data.endTime ? new Date(data.endTime) : null;
        this.outputPath = data.outputPath || null;
        this.errors = data.errors || [];
        this.config = data.config || {};
        this.metadata = {
            createdAt: new Date(),
            version: '1.0.0'
        };
    }
    
    generateBatchId() {
        return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    getProgress() {
        return this.totalCards > 0 ? (this.processedCards / this.totalCards) * 100 : 0;
    }
    
    addError(cardIndex, error) {
        this.errors.push({
            cardIndex,
            error: error.message || error,
            timestamp: new Date(),
            details: error.details || {}
        });
        this.failedCards++;
    }
    
    start() {
        this.status = 'processing';
        this.startTime = new Date();
    }
    
    complete() {
        this.status = 'completed';
        this.endTime = new Date();
    }
    
    fail(error) {
        this.status = 'failed';
        this.endTime = new Date();
        this.addError(-1, error);
    }
    
    getDuration() {
        if (!this.startTime) return 0;
        const endTime = this.endTime || new Date();
        return endTime - this.startTime;
    }
    
    getEstimatedTimeRemaining() {
        if (this.status !== 'processing' || this.processedCards === 0) return null;
        
        const elapsed = this.getDuration();
        const avgTimePerCard = elapsed / this.processedCards;
        const remainingCards = this.totalCards - this.processedCards;
        
        return remainingCards * avgTimePerCard;
    }
    
    toJSON() {
        return {
            batchId: this.batchId,
            status: this.status,
            totalCards: this.totalCards,
            processedCards: this.processedCards,
            failedCards: this.failedCards,
            startTime: this.startTime?.toISOString(),
            endTime: this.endTime?.toISOString(),
            outputPath: this.outputPath,
            errors: this.errors,
            config: this.config,
            metadata: {
                ...this.metadata,
                createdAt: this.metadata.createdAt?.toISOString()
            }
        };
    }
}

/**
 * Card Template Model - Represents visual template configuration
 */
class CardTemplate {
    constructor(type) {
        this.type = type;
        this.layout = {
            width: 856,  // Standard ID card size in pixels at 300 DPI
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
        this.fonts = {
            primary: 'Roboto, Arial, sans-serif',
            secondary: 'Arial, sans-serif',
            monospace: 'Courier New, monospace'
        };
    }
    
    getColorScheme(type) {
        const schemes = {
            researcher: { 
                primary: '#2c5aa0', 
                secondary: '#ffffff', 
                accent: '#ff6b35',
                text: '#333333'
            },
            security: { 
                primary: '#8b0000', 
                secondary: '#ffffff', 
                accent: '#ffd700',
                text: '#333333'
            },
            dclass: { 
                primary: '#ff4500', 
                secondary: '#000000', 
                accent: '#ffff00',
                text: '#000000'
            },
            o5: { 
                primary: '#000000', 
                secondary: '#ffffff', 
                accent: '#ff0000',
                text: '#ffffff'
            },
            mtf: { 
                primary: '#4a4a4a', 
                secondary: '#ffffff', 
                accent: '#00ff00',
                text: '#333333'
            }
        };
        
        return schemes[type] || schemes.researcher;
    }
    
    /**
     * Get element configuration
     */
    getElement(elementName) {
        return this.elements[elementName] || null;
    }
    
    /**
     * Update element configuration
     */
    setElement(elementName, config) {
        this.elements[elementName] = { ...this.elements[elementName], ...config };
    }
    
    /**
     * Get color by name
     */
    getColor(colorName) {
        return this.colors[colorName] || '#000000';
    }
    
    /**
     * Clone template with modifications
     */
    clone(modifications = {}) {
        const cloned = new CardTemplate(this.type);
        
        if (modifications.colors) {
            cloned.colors = { ...cloned.colors, ...modifications.colors };
        }
        
        if (modifications.elements) {
            Object.keys(modifications.elements).forEach(elementName => {
                cloned.setElement(elementName, modifications.elements[elementName]);
            });
        }
        
        if (modifications.layout) {
            cloned.layout = { ...cloned.layout, ...modifications.layout };
        }
        
        return cloned;
    }
}

/**
 * Application State Model - Manages global application state
 */
class AppState {
    constructor() {
        this.currentMode = 'single'; // single, batch
        this.currentCardType = 'researcher';
        this.isInitialized = false;
        this.isOnline = navigator.onLine;
        this.currentBatch = null;
        this.formData = {};
        this.preferences = this.loadPreferences();
        this.errors = [];
        this.notifications = [];
    }
    
    /**
     * Load user preferences from localStorage
     */
    loadPreferences() {
        try {
            const saved = localStorage.getItem('scpCardGenerator_preferences');
            return saved ? JSON.parse(saved) : this.getDefaultPreferences();
        } catch (error) {
            console.warn('Could not load preferences:', error);
            return this.getDefaultPreferences();
        }
    }
    
    /**
     * Save user preferences to localStorage
     */
    savePreferences() {
        try {
            localStorage.setItem('scpCardGenerator_preferences', JSON.stringify(this.preferences));
        } catch (error) {
            console.warn('Could not save preferences:', error);
        }
    }
    
    /**
     * Get default preferences
     */
    getDefaultPreferences() {
        return {
            defaultCardType: 'researcher',
            defaultMode: 'single',
            autoSave: true,
            showNotifications: true,
            theme: 'default',
            language: 'en',
            exportFormat: 'png',
            exportQuality: 'high'
        };
    }
    
    /**
     * Update preference
     */
    setPreference(key, value) {
        this.preferences[key] = value;
        this.savePreferences();
    }
    
    /**
     * Get preference
     */
    getPreference(key) {
        return this.preferences[key];
    }
    
    /**
     * Set current mode
     */
    setMode(mode) {
        this.currentMode = mode;
        this.setPreference('defaultMode', mode);
    }
    
    /**
     * Set current card type
     */
    setCardType(cardType) {
        this.currentCardType = cardType;
        this.setPreference('defaultCardType', cardType);
    }
    
    /**
     * Update form data
     */
    updateFormData(data) {
        this.formData = { ...this.formData, ...data };
        
        if (this.preferences.autoSave) {
            this.saveFormData();
        }
    }
    
    /**
     * Save form data to localStorage
     */
    saveFormData() {
        try {
            localStorage.setItem('scpCardGenerator_formData', JSON.stringify(this.formData));
        } catch (error) {
            console.warn('Could not save form data:', error);
        }
    }
    
    /**
     * Load form data from localStorage
     */
    loadFormData() {
        try {
            const saved = localStorage.getItem('scpCardGenerator_formData');
            if (saved) {
                this.formData = JSON.parse(saved);
                return this.formData;
            }
        } catch (error) {
            console.warn('Could not load form data:', error);
        }
        return {};
    }
    
    /**
     * Clear form data
     */
    clearFormData() {
        this.formData = {};
        try {
            localStorage.removeItem('scpCardGenerator_formData');
        } catch (error) {
            console.warn('Could not clear form data:', error);
        }
    }
    
    /**
     * Add error to state
     */
    addError(error) {
        this.errors.push({
            id: Date.now() + Math.random(),
            error,
            timestamp: new Date(),
            acknowledged: false
        });
        
        // Keep only last 50 errors
        if (this.errors.length > 50) {
            this.errors = this.errors.slice(-50);
        }
    }
    
    /**
     * Get unacknowledged errors
     */
    getUnacknowledgedErrors() {
        return this.errors.filter(e => !e.acknowledged);
    }
    
    /**
     * Acknowledge error
     */
    acknowledgeError(errorId) {
        const error = this.errors.find(e => e.id === errorId);
        if (error) {
            error.acknowledged = true;
        }
    }
    
    /**
     * Clear all errors
     */
    clearErrors() {
        this.errors = [];
    }
    
    /**
     * Get application statistics
     */
    getStatistics() {
        return {
            mode: this.currentMode,
            cardType: this.currentCardType,
            isInitialized: this.isInitialized,
            isOnline: this.isOnline,
            errorCount: this.errors.length,
            unacknowledgedErrors: this.getUnacknowledgedErrors().length,
            hasFormData: Object.keys(this.formData).length > 0,
            hasBatch: !!this.currentBatch,
            preferences: this.preferences
        };
    }
}

// Make classes globally available
window.PersonnelCard = PersonnelCard;
window.BatchJob = BatchJob;
window.CardTemplate = CardTemplate;
window.AppState = AppState;

// Create global app state instance
window.appState = new AppState();