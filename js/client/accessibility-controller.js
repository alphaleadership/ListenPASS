/**
 * SCP Card Generator - Accessibility Controller
 * Gère l'accessibilité, la navigation clavier et les lecteurs d'écran
 */

class AccessibilityController {
    constructor() {
        this.keyboardNavigationActive = false;
        this.currentFocusIndex = 0;
        this.focusableElements = [];
        this.announcements = [];
        this.preferences = {
            fontSize: 'normal',
            spacing: 'normal',
            highContrast: false,
            reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        };
        
        this.init();
    }
    
    init() {
        this.setupKeyboardNavigation();
        this.setupAriaLabels();
        this.setupLiveRegions();
        this.setupFocusManagement();
        this.setupAccessibilityPreferences();
        this.setupSkipLinks();
        this.setupFormAccessibility();
        this.setupScreenReaderSupport();
        
        // Détecter l'utilisation du clavier
        this.detectKeyboardUsage();
    }
    
    detectKeyboardUsage() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                this.keyboardNavigationActive = true;
                document.body.classList.add('keyboard-navigation-active');
            }
        });
        
        document.addEventListener('mousedown', () => {
            this.keyboardNavigationActive = false;
            document.body.classList.remove('keyboard-navigation-active');
        });
    }
    
    setupKeyboardNavigation() {
        // Navigation dans les card type options
        const cardOptions = document.querySelectorAll('.card-type-option');
        cardOptions.forEach((option, index) => {
            option.setAttribute('tabindex', '0');
            option.setAttribute('role', 'button');
            option.setAttribute('aria-pressed', 'false');
            
            option.addEventListener('keydown', (e) => {
                this.handleCardOptionKeydown(e, option, cardOptions, index);
            });
        });
        
        // Navigation dans les formulaires
        this.setupFormKeyboardNavigation();
        
        // Navigation globale
        document.addEventListener('keydown', (e) => {
            this.handleGlobalKeydown(e);
        });
    }
    
    handleCardOptionKeydown(e, option, allOptions, index) {
        switch (e.key) {
            case 'Enter':
            case ' ':
                e.preventDefault();
                this.selectCardOption(option, allOptions);
                break;
            case 'ArrowRight':
            case 'ArrowDown':
                e.preventDefault();
                this.focusNextCardOption(allOptions, index);
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                e.preventDefault();
                this.focusPreviousCardOption(allOptions, index);
                break;
            case 'Home':
                e.preventDefault();
                allOptions[0].focus();
                break;
            case 'End':
                e.preventDefault();
                allOptions[allOptions.length - 1].focus();
                break;
        }
    }
    
    selectCardOption(option, allOptions) {
        // Désélectionner toutes les options
        allOptions.forEach(opt => {
            opt.classList.remove('active');
            opt.setAttribute('aria-pressed', 'false');
        });
        
        // Sélectionner l'option courante
        option.classList.add('active');
        option.setAttribute('aria-pressed', 'true');
        
        // Annoncer la sélection
        const cardType = option.getAttribute('data-type');
        this.announce(`${cardType} card type selected`);
        
        // Déclencher l'événement de changement
        option.click();
    }
    
    focusNextCardOption(options, currentIndex) {
        const nextIndex = (currentIndex + 1) % options.length;
        options[nextIndex].focus();
    }
    
    focusPreviousCardOption(options, currentIndex) {
        const prevIndex = currentIndex === 0 ? options.length - 1 : currentIndex - 1;
        options[prevIndex].focus();
    }
    
    setupFormKeyboardNavigation() {
        const formFields = document.querySelectorAll('.form-field input, .form-field select');
        
        formFields.forEach(field => {
            field.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    field.blur();
                }
            });
            
            // Navigation rapide dans les selects
            if (field.tagName === 'SELECT') {
                field.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        field.click();
                    }
                });
            }
        });
    }
    
    handleGlobalKeydown(e) {
        // Raccourcis clavier globaux
        if (e.altKey) {
            switch (e.key) {
                case '1':
                    e.preventDefault();
                    this.focusMainContent();
                    break;
                case '2':
                    e.preventDefault();
                    this.focusNavigation();
                    break;
                case 'm':
                    e.preventDefault();
                    this.toggleMode();
                    break;
                case 'h':
                    e.preventDefault();
                    this.showKeyboardHelp();
                    break;
            }
        }
        
        // Échapper pour fermer les modales/dropdowns
        if (e.key === 'Escape') {
            this.closeAllDropdowns();
        }
    }
    
    setupAriaLabels() {
        // Header
        const header = document.querySelector('.scp-header');
        if (header) {
            header.setAttribute('role', 'banner');
        }
        
        // Navigation principale
        const mainNav = document.querySelector('.main-nav');
        if (mainNav) {
            mainNav.setAttribute('role', 'navigation');
            mainNav.setAttribute('aria-label', 'Mode selection');
        }
        
        // Contenu principal
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.setAttribute('role', 'main');
            mainContent.setAttribute('aria-label', 'Card generator interface');
        }
        
        // Sélecteur de type de carte
        const cardTypeSelector = document.querySelector('.card-type-selector');
        if (cardTypeSelector) {
            cardTypeSelector.setAttribute('role', 'group');
            cardTypeSelector.setAttribute('aria-labelledby', 'card-type-heading');
            
            const heading = cardTypeSelector.querySelector('h2');
            if (heading) {
                heading.id = 'card-type-heading';
            }
        }
        
        // Grille des types de cartes
        const cardTypeGrid = document.querySelector('.card-type-grid');
        if (cardTypeGrid) {
            cardTypeGrid.setAttribute('role', 'radiogroup');
            cardTypeGrid.setAttribute('aria-labelledby', 'card-type-heading');
        }
        
        // Options de type de carte
        const cardOptions = document.querySelectorAll('.card-type-option');
        cardOptions.forEach((option, index) => {
            const cardType = option.getAttribute('data-type');
            const title = option.querySelector('h3').textContent;
            const description = option.querySelector('p').textContent;
            
            option.setAttribute('aria-label', `${title}: ${description}`);
            option.setAttribute('aria-describedby', `card-type-${cardType}-details`);
            
            const details = option.querySelector('.card-type-details');
            if (details) {
                details.id = `card-type-${cardType}-details`;
            }
        });
        
        // Mode toggle
        const modeToggle = document.getElementById('modeToggle');
        if (modeToggle) {
            modeToggle.setAttribute('aria-label', 'Switch between single card and batch generation modes');
            modeToggle.setAttribute('aria-describedby', 'mode-toggle-description');
            
            // Ajouter une description cachée
            const description = document.createElement('div');
            description.id = 'mode-toggle-description';
            description.className = 'sr-only';
            description.textContent = 'Toggle to switch between generating single cards or multiple cards in batch';
            modeToggle.parentNode.appendChild(description);
        }
        
        // Formulaires
        this.setupFormAriaLabels();
    }
    
    setupFormAriaLabels() {
        const form = document.getElementById('personnelForm');
        if (!form) return;
        
        form.setAttribute('role', 'form');
        form.setAttribute('aria-label', 'Personnel information form');
        
        // Fieldsets
        const fieldsets = form.querySelectorAll('fieldset');
        fieldsets.forEach(fieldset => {
            const legend = fieldset.querySelector('legend');
            if (legend) {
                fieldset.setAttribute('aria-labelledby', legend.id || this.generateId('fieldset-legend'));
                if (!legend.id) {
                    legend.id = fieldset.getAttribute('aria-labelledby');
                }
            }
        });
        
        // Champs de formulaire
        const formFields = form.querySelectorAll('.form-field');
        formFields.forEach(field => {
            const input = field.querySelector('input, select');
            const label = field.querySelector('label');
            const errorMessage = field.querySelector('.error-message');
            
            if (input && label) {
                const inputId = input.id || this.generateId('form-input');
                const labelId = label.id || this.generateId('form-label');
                
                input.id = inputId;
                label.id = labelId;
                label.setAttribute('for', inputId);
                
                // Marquer les champs requis
                if (input.hasAttribute('required')) {
                    label.classList.add('required');
                    input.setAttribute('aria-required', 'true');
                }
                
                // Associer les messages d'erreur
                if (errorMessage) {
                    const errorId = errorMessage.id || this.generateId('error-message');
                    errorMessage.id = errorId;
                    input.setAttribute('aria-describedby', errorId);
                }
            }
        });
        
        // Progress indicator
        const progressBar = document.querySelector('.progress-bar-fill');
        if (progressBar) {
            progressBar.setAttribute('role', 'progressbar');
            progressBar.setAttribute('aria-valuemin', '0');
            progressBar.setAttribute('aria-valuemax', '100');
            progressBar.setAttribute('aria-valuenow', '0');
            progressBar.setAttribute('aria-label', 'Form completion progress');
        }
    }
    
    setupLiveRegions() {
        // Créer une région live pour les annonces
        const liveRegion = document.createElement('div');
        liveRegion.id = 'live-region';
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'sr-only';
        document.body.appendChild(liveRegion);
        
        // Région pour les annonces urgentes
        const assertiveRegion = document.createElement('div');
        assertiveRegion.id = 'assertive-region';
        assertiveRegion.setAttribute('aria-live', 'assertive');
        assertiveRegion.setAttribute('aria-atomic', 'true');
        assertiveRegion.className = 'sr-only';
        document.body.appendChild(assertiveRegion);
        
        this.liveRegion = liveRegion;
        this.assertiveRegion = assertiveRegion;
    }
    
    setupFocusManagement() {
        // Gérer le focus lors des changements de mode
        const modeToggle = document.getElementById('modeToggle');
        if (modeToggle) {
            modeToggle.addEventListener('change', (e) => {
                const mode = e.target.checked ? 'batch' : 'single';
                this.announce(`Switched to ${mode} generation mode`);
                
                // Déplacer le focus vers le contenu approprié
                setTimeout(() => {
                    if (mode === 'batch') {
                        const batchSection = document.getElementById('batchCardMode');
                        if (batchSection) {
                            const firstFocusable = batchSection.querySelector('button, input, select, [tabindex]');
                            if (firstFocusable) {
                                firstFocusable.focus();
                            }
                        }
                    } else {
                        const singleSection = document.getElementById('singleCardMode');
                        if (singleSection) {
                            const firstFocusable = singleSection.querySelector('input, select, [tabindex]');
                            if (firstFocusable) {
                                firstFocusable.focus();
                            }
                        }
                    }
                }, 100);
            });
        }
        
        // Gérer le focus lors de la sélection de type de carte
        const cardOptions = document.querySelectorAll('.card-type-option');
        cardOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Déplacer le focus vers le premier champ du formulaire
                setTimeout(() => {
                    const firstInput = document.querySelector('#personnelForm input, #personnelForm select');
                    if (firstInput) {
                        firstInput.focus();
                    }
                }, 100);
            });
        });
    }
    
    setupAccessibilityPreferences() {
        // Détecter les préférences système
        this.preferences.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.preferences.highContrast = window.matchMedia('(prefers-contrast: high)').matches;
        
        // Appliquer les préférences
        this.applyPreferences();
        
        // Écouter les changements de préférences
        window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
            this.preferences.reducedMotion = e.matches;
            this.applyPreferences();
        });
        
        window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
            this.preferences.highContrast = e.matches;
            this.applyPreferences();
        });
    }
    
    applyPreferences() {
        const body = document.body;
        
        // Mouvement réduit
        if (this.preferences.reducedMotion) {
            body.classList.add('reduced-motion');
        } else {
            body.classList.remove('reduced-motion');
        }
        
        // Contraste élevé
        if (this.preferences.highContrast) {
            body.classList.add('high-contrast');
        } else {
            body.classList.remove('high-contrast');
        }
        
        // Taille de police
        body.classList.remove('font-size-small', 'font-size-normal', 'font-size-large', 'font-size-extra-large');
        body.classList.add(`font-size-${this.preferences.fontSize}`);
        
        // Espacement
        body.classList.remove('spacing-compact', 'spacing-normal', 'spacing-comfortable', 'spacing-extra-comfortable');
        body.classList.add(`spacing-${this.preferences.spacing}`);
    }
    
    setupSkipLinks() {
        // Créer les liens de navigation rapide
        const skipLinks = document.createElement('div');
        skipLinks.className = 'skip-links';
        skipLinks.innerHTML = `
            <a href="#main-content" class="skip-link">Skip to main content</a>
            <a href="#card-type-selector" class="skip-link">Skip to card type selection</a>
            <a href="#personnel-form" class="skip-link">Skip to form</a>
        `;
        
        document.body.insertBefore(skipLinks, document.body.firstChild);
        
        // Ajouter les IDs correspondants
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.id = 'main-content';
        }
        
        const cardTypeSelector = document.querySelector('.card-type-selector');
        if (cardTypeSelector) {
            cardTypeSelector.id = 'card-type-selector';
        }
        
        const personnelForm = document.getElementById('personnelForm');
        if (personnelForm) {
            personnelForm.id = 'personnel-form';
        }
    }
    
    setupFormAccessibility() {
        const form = document.getElementById('personnelForm');
        if (!form) return;
        
        // Validation en temps réel accessible
        const inputs = form.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateFieldAccessibly(input);
            });
            
            input.addEventListener('input', () => {
                // Nettoyer les erreurs précédentes lors de la saisie
                this.clearFieldError(input);
            });
        });
        
        // Soumission de formulaire accessible
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.validateFormAccessibly(form);
        });
    }
    
    validateFieldAccessibly(field) {
        const formField = field.closest('.form-field');
        const errorMessage = formField.querySelector('.error-message');
        
        if (field.validity.valid) {
            // Champ valide
            field.setAttribute('aria-invalid', 'false');
            if (errorMessage) {
                errorMessage.style.display = 'none';
                errorMessage.textContent = '';
            }
            formField.classList.remove('error');
            formField.classList.add('valid');
        } else {
            // Champ invalide
            field.setAttribute('aria-invalid', 'true');
            const errorText = this.getFieldErrorMessage(field);
            
            if (errorMessage) {
                errorMessage.textContent = errorText;
                errorMessage.style.display = 'block';
                field.setAttribute('aria-describedby', errorMessage.id);
            }
            
            formField.classList.remove('valid');
            formField.classList.add('error');
            
            // Annoncer l'erreur
            this.announceError(errorText);
        }
    }
    
    clearFieldError(field) {
        const formField = field.closest('.form-field');
        const errorMessage = formField.querySelector('.error-message');
        
        if (errorMessage && errorMessage.style.display !== 'none') {
            field.setAttribute('aria-invalid', 'false');
            errorMessage.style.display = 'none';
            formField.classList.remove('error');
        }
    }
    
    getFieldErrorMessage(field) {
        if (field.validity.valueMissing) {
            return `${field.labels[0]?.textContent || 'This field'} is required`;
        }
        if (field.validity.patternMismatch) {
            return `${field.labels[0]?.textContent || 'This field'} format is invalid`;
        }
        if (field.validity.typeMismatch) {
            return `${field.labels[0]?.textContent || 'This field'} must be a valid ${field.type}`;
        }
        return `${field.labels[0]?.textContent || 'This field'} is invalid`;
    }
    
    setupScreenReaderSupport() {
        // Détecter si un lecteur d'écran est utilisé
        this.screenReaderDetected = this.detectScreenReader();
        
        if (this.screenReaderDetected) {
            document.body.classList.add('screen-reader-active');
            
            // Ajouter des descriptions supplémentaires
            this.addScreenReaderDescriptions();
        }
    }
    
    detectScreenReader() {
        // Méthodes de détection des lecteurs d'écran
        return (
            navigator.userAgent.includes('NVDA') ||
            navigator.userAgent.includes('JAWS') ||
            navigator.userAgent.includes('VoiceOver') ||
            window.speechSynthesis ||
            'speechSynthesis' in window
        );
    }
    
    addScreenReaderDescriptions() {
        // Ajouter des descriptions détaillées pour les lecteurs d'écran
        const cardOptions = document.querySelectorAll('.card-type-option');
        cardOptions.forEach(option => {
            const cardType = option.getAttribute('data-type');
            const description = document.createElement('div');
            description.className = 'sr-only';
            description.textContent = this.getDetailedCardDescription(cardType);
            option.appendChild(description);
        });
    }
    
    getDetailedCardDescription(cardType) {
        const descriptions = {
            researcher: 'Research personnel card for scientists and laboratory staff. Requires site assignment, department, and clearance level 1-4.',
            security: 'Security personnel card for guards and containment specialists. Requires site assignment, security clearance, and access zones.',
            dclass: 'D-Class personnel card for test subjects. Requires site assignment and expiration date. Level 0 clearance.',
            o5: 'O5 Council member card for highest-ranking administrators. Requires council number and special authentication. Level 5 clearance.',
            mtf: 'Mobile Task Force operative card for field operations specialists. Requires MTF assignment, clearance level, and specialization.'
        };
        return descriptions[cardType] || 'Personnel identification card';
    }
    
    // Méthodes utilitaires
    announce(message, priority = 'polite') {
        const region = priority === 'assertive' ? this.assertiveRegion : this.liveRegion;
        if (region) {
            region.textContent = message;
            
            // Nettoyer après un délai
            setTimeout(() => {
                region.textContent = '';
            }, 1000);
        }
    }
    
    announceError(message) {
        this.announce(`Error: ${message}`, 'assertive');
    }
    
    announceSuccess(message) {
        this.announce(`Success: ${message}`, 'polite');
    }
    
    focusMainContent() {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.focus();
            mainContent.scrollIntoView({ behavior: 'smooth' });
        }
    }
    
    focusNavigation() {
        const navigation = document.querySelector('.main-nav');
        if (navigation) {
            const firstFocusable = navigation.querySelector('button, input, select, [tabindex]');
            if (firstFocusable) {
                firstFocusable.focus();
            }
        }
    }
    
    toggleMode() {
        const modeToggle = document.getElementById('modeToggle');
        if (modeToggle) {
            modeToggle.checked = !modeToggle.checked;
            modeToggle.dispatchEvent(new Event('change'));
        }
    }
    
    showKeyboardHelp() {
        const helpText = `
            Keyboard shortcuts:
            Alt+1: Focus main content
            Alt+2: Focus navigation
            Alt+M: Toggle mode
            Alt+H: Show this help
            Tab: Navigate forward
            Shift+Tab: Navigate backward
            Enter/Space: Activate buttons
            Arrow keys: Navigate card options
            Escape: Close dropdowns
        `;
        
        this.announce(helpText, 'assertive');
    }
    
    closeAllDropdowns() {
        const dropdowns = document.querySelectorAll('.export-dropdown');
        dropdowns.forEach(dropdown => {
            dropdown.style.display = 'none';
        });
    }
    
    generateId(prefix) {
        return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    updateProgress(percentage) {
        const progressBar = document.querySelector('.progress-bar-fill[role="progressbar"]');
        if (progressBar) {
            progressBar.setAttribute('aria-valuenow', percentage.toString());
            progressBar.style.width = `${percentage}%`;
            
            if (percentage === 100) {
                this.announce('Form completed successfully');
            }
        }
    }
    
    // Nettoyage
    destroy() {
        // Nettoyer les event listeners et éléments créés
        const skipLinks = document.querySelector('.skip-links');
        if (skipLinks) {
            skipLinks.remove();
        }
        
        if (this.liveRegion) {
            this.liveRegion.remove();
        }
        
        if (this.assertiveRegion) {
            this.assertiveRegion.remove();
        }
    }
}

// Export pour utilisation dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AccessibilityController;
} else {
    window.AccessibilityController = AccessibilityController;
}