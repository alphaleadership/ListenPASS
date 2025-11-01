/**
 * SCP Foundation - Animation Controller
 * Gère les animations et effets visuels de l'interface
 */

class SCPAnimationController {
    constructor() {
        this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.animationQueue = [];
        this.isAnimating = false;
        
        this.init();
    }
    
    init() {
        this.setupIntersectionObserver();
        this.setupModeTransitions();
        this.setupFormAnimations();
        this.setupCardTypeAnimations();
        this.setupLoadingAnimations();
        this.setupErrorAnimations();
        
        // Démarrer les animations d'entrée
        this.startEntryAnimations();
    }
    
    setupIntersectionObserver() {
        if (this.isReducedMotion) return;
        
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.triggerAnimation(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '50px'
        });
        
        // Observer les éléments animables
        document.querySelectorAll('.card-type-option, .form-section, .preview-section').forEach(el => {
            this.observer.observe(el);
        });
    }
    
    startEntryAnimations() {
        if (this.isReducedMotion) return;
        
        // Animation du titre principal
        setTimeout(() => {
            const title = document.querySelector('.card-type-selector h2');
            if (title) {
                title.classList.add('animated');
            }
        }, 500);
        
        // Animation des éléments avec stagger
        const staggerElements = document.querySelectorAll('.card-type-option');
        staggerElements.forEach((el, index) => {
            setTimeout(() => {
                el.style.animationDelay = `${index * 0.1}s`;
                el.classList.add('animate-in');
            }, 100);
        });
    }
    
    setupModeTransitions() {
        const modeToggle = document.getElementById('modeToggle');
        const singleMode = document.getElementById('singleCardMode');
        const batchMode = document.getElementById('batchCardMode');
        
        if (!modeToggle || !singleMode || !batchMode) return;
        
        modeToggle.addEventListener('change', (e) => {
            this.transitionModes(e.target.checked, singleMode, batchMode);
        });
    }
    
    transitionModes(isBatch, singleMode, batchMode) {
        if (this.isReducedMotion) {
            // Mode simple sans animations
            if (isBatch) {
                singleMode.classList.remove('active');
                batchMode.classList.add('active');
            } else {
                batchMode.classList.remove('active');
                singleMode.classList.add('active');
            }
            return;
        }
        
        const currentMode = isBatch ? singleMode : batchMode;
        const nextMode = isBatch ? batchMode : singleMode;
        
        // Marquer comme en transition
        document.querySelector('.generation-interface').classList.add('mode-transitioning');
        
        // Animation de sortie
        currentMode.style.animation = 'fadeOut 0.3s ease-out forwards';
        
        setTimeout(() => {
            currentMode.classList.remove('active');
            nextMode.classList.add('active');
            
            // Animation d'entrée
            nextMode.style.animation = 'fadeIn 0.3s ease-in forwards';
            
            setTimeout(() => {
                document.querySelector('.generation-interface').classList.remove('mode-transitioning');
                nextMode.style.animation = '';
                currentMode.style.animation = '';
            }, 300);
        }, 300);
    }
    
    setupCardTypeAnimations() {
        const cardOptions = document.querySelectorAll('.card-type-option');
        
        cardOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                this.animateCardSelection(option, cardOptions);
            });
            
            // Effet de survol avec scanline
            option.addEventListener('mouseenter', () => {
                if (!this.isReducedMotion) {
                    this.addScanlineEffect(option);
                }
            });
            
            option.addEventListener('mouseleave', () => {
                this.removeScanlineEffect(option);
            });
        });
    }
    
    animateCardSelection(selectedOption, allOptions) {
        if (this.isReducedMotion) {
            // Mode simple
            allOptions.forEach(opt => opt.classList.remove('active'));
            selectedOption.classList.add('active');
            return;
        }
        
        // Animation de sélection
        selectedOption.classList.add('selecting');
        
        // Désélectionner les autres avec animation
        allOptions.forEach(opt => {
            if (opt !== selectedOption) {
                opt.classList.remove('active');
                opt.style.animation = 'scaleOut 0.2s ease-out';
                setTimeout(() => {
                    opt.style.animation = '';
                }, 200);
            }
        });
        
        // Sélectionner le nouveau avec animation
        setTimeout(() => {
            selectedOption.classList.remove('selecting');
            selectedOption.classList.add('active', 'selected');
            
            setTimeout(() => {
                selectedOption.classList.remove('selected');
            }, 300);
        }, 100);
    }
    
    addScanlineEffect(element) {
        const scanline = document.createElement('div');
        scanline.className = 'scanline-effect';
        scanline.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent);
            animation: scpScanline 2s linear infinite;
            pointer-events: none;
            z-index: 10;
        `;
        
        element.style.position = 'relative';
        element.appendChild(scanline);
    }
    
    removeScanlineEffect(element) {
        const scanline = element.querySelector('.scanline-effect');
        if (scanline) {
            scanline.remove();
        }
    }
    
    setupFormAnimations() {
        const formFields = document.querySelectorAll('.form-field input, .form-field select');
        
        formFields.forEach(field => {
            field.addEventListener('focus', () => {
                this.animateFieldFocus(field);
            });
            
            field.addEventListener('blur', () => {
                this.animateFieldBlur(field);
            });
            
            field.addEventListener('input', () => {
                this.animateFieldUpdate(field);
            });
        });
        
        // Animation du progress bar
        this.setupProgressAnimation();
    }
    
    animateFieldFocus(field) {
        if (this.isReducedMotion) return;
        
        const formField = field.closest('.form-field');
        formField.classList.add('focused');
        
        // Effet de glow
        field.style.boxShadow = '0 0 0 2px rgba(44, 90, 160, 0.3)';
    }
    
    animateFieldBlur(field) {
        if (this.isReducedMotion) return;
        
        const formField = field.closest('.form-field');
        formField.classList.remove('focused');
        
        field.style.boxShadow = '';
    }
    
    animateFieldUpdate(field) {
        if (this.isReducedMotion) return;
        
        const formField = field.closest('.form-field');
        formField.classList.add('field-updated');
        
        setTimeout(() => {
            formField.classList.remove('field-updated');
        }, 600);
    }
    
    setupProgressAnimation() {
        const progressFill = document.getElementById('progressBarFill');
        if (!progressFill) return;
        
        // Observer les changements de largeur
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    this.animateProgressChange(progressFill);
                }
            });
        });
        
        observer.observe(progressFill, { attributes: true });
    }
    
    animateProgressChange(progressElement) {
        if (this.isReducedMotion) return;
        
        // Effet de pulse sur le changement
        progressElement.style.animation = 'progressPulse 0.3s ease-out';
        
        setTimeout(() => {
            progressElement.style.animation = '';
        }, 300);
    }
    
    setupLoadingAnimations() {
        // Observer les éléments avec classe loading
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && node.classList.contains('loading')) {
                        this.startLoadingAnimation(node);
                    }
                });
                
                mutation.removedNodes.forEach(node => {
                    if (node.nodeType === 1 && node.classList.contains('loading')) {
                        this.stopLoadingAnimation(node);
                    }
                });
            });
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
    }
    
    startLoadingAnimation(element) {
        if (this.isReducedMotion) return;
        
        element.style.position = 'relative';
        
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        spinner.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            width: 20px;
            height: 20px;
            margin: -10px 0 0 -10px;
            border: 2px solid transparent;
            border-top: 2px solid var(--scp-red);
            border-radius: 50%;
            animation: scpLoading 1s linear infinite;
            z-index: 1000;
        `;
        
        element.appendChild(spinner);
    }
    
    stopLoadingAnimation(element) {
        const spinner = element.querySelector('.loading-spinner');
        if (spinner) {
            spinner.remove();
        }
    }
    
    setupErrorAnimations() {
        // Observer les messages d'erreur
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        if (node.classList.contains('error-message') || 
                            node.classList.contains('error-notification')) {
                            this.animateError(node);
                        }
                        
                        if (node.classList.contains('success-message')) {
                            this.animateSuccess(node);
                        }
                    }
                });
            });
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
    }
    
    animateError(element) {
        if (this.isReducedMotion) {
            element.style.display = 'block';
            return;
        }
        
        element.style.animation = 'shake 0.5s ease-out, fadeIn 0.3s ease-out';
        element.style.display = 'block';
        
        // Effet de glow rouge
        setTimeout(() => {
            element.style.boxShadow = '0 0 10px rgba(204, 0, 0, 0.3)';
            
            setTimeout(() => {
                element.style.boxShadow = '';
            }, 1000);
        }, 100);
    }
    
    animateSuccess(element) {
        if (this.isReducedMotion) {
            element.style.display = 'block';
            return;
        }
        
        element.style.animation = 'fadeIn 0.3s ease-out';
        element.style.display = 'block';
        
        // Effet de glow vert
        setTimeout(() => {
            element.style.boxShadow = '0 0 10px rgba(40, 167, 69, 0.3)';
            
            setTimeout(() => {
                element.style.boxShadow = '';
            }, 1000);
        }, 100);
    }
    
    // Méthodes utilitaires
    triggerAnimation(element) {
        if (this.isReducedMotion) return;
        
        element.classList.add('animate-in');
    }
    
    addGlitchEffect(element, duration = 2000) {
        if (this.isReducedMotion) return;
        
        element.classList.add('glitch');
        element.setAttribute('data-text', element.textContent);
        
        setTimeout(() => {
            element.classList.remove('glitch');
            element.removeAttribute('data-text');
        }, duration);
    }
    
    addTypewriterEffect(element, text, speed = 50) {
        if (this.isReducedMotion) {
            element.textContent = text;
            return;
        }
        
        element.textContent = '';
        element.classList.add('typewriter');
        
        let i = 0;
        const typeInterval = setInterval(() => {
            element.textContent += text.charAt(i);
            i++;
            
            if (i >= text.length) {
                clearInterval(typeInterval);
                setTimeout(() => {
                    element.classList.remove('typewriter');
                }, 1000);
            }
        }, speed);
    }
    
    // Nettoyage
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
        
        // Nettoyer les event listeners et animations
        document.querySelectorAll('.scanline-effect, .loading-spinner').forEach(el => {
            el.remove();
        });
    }
}

// Export pour utilisation dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SCPAnimationController;
} else {
    window.SCPAnimationController = SCPAnimationController;
}