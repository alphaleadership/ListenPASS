/**
 * SCP Card Generator - Card Templates
 * Visual templates for different types of SCP Foundation personnel cards
 */

/**
 * Base Card Template class
 * Defines the common structure and methods for all card types
 */
class CardTemplate {
    constructor(type) {
        this.type = type;
        this.layout = {
            width: 856,  // Standard ID card size in pixels (3.375" at 254 DPI)
            height: 540, // Standard ID card size in pixels (2.125" at 254 DPI)
            backgroundColor: '#f0f0f0',
            borderColor: '#333333',
            borderWidth: 2
        };
        
        // Base element positions and styles
        this.elements = {
            logo: { 
                position: { x: 20, y: 20 }, 
                size: { w: 80, h: 80 },
                source: 'assets/scp-logo.svg'
            },
            photo: { 
                position: { x: 680, y: 80 }, 
                size: { w: 150, h: 200 },
                borderRadius: 4,
                borderWidth: 2
            },
            name: { 
                position: { x: 20, y: 120 }, 
                fontSize: 24, 
                fontWeight: 'bold',
                fontFamily: 'Arial, sans-serif'
            },
            employeeId: { 
                position: { x: 20, y: 160 }, 
                fontSize: 18,
                fontFamily: 'Courier New, monospace'
            },
            clearance: { 
                position: { x: 20, y: 200 }, 
                fontSize: 16,
                fontWeight: 'bold'
            },
            department: { 
                position: { x: 20, y: 240 }, 
                fontSize: 16
            },
            site: { 
                position: { x: 20, y: 280 }, 
                fontSize: 16
            },
            position: {
                position: { x: 20, y: 320 },
                fontSize: 14
            },
            issueDate: {
                position: { x: 20, y: 480 },
                fontSize: 12
            },
            expirationDate: {
                position: { x: 20, y: 500 },
                fontSize: 12
            },
            barcode: {
                position: { x: 600, y: 450 },
                size: { w: 200, h: 60 }
            },
            classification: {
                position: { x: 400, y: 30 },
                fontSize: 18,
                fontWeight: 'bold'
            }
        };
        
        this.colors = this.getColorScheme(type);
        this.securityFeatures = this.getSecurityFeatures(type);
    }

    /**
     * Get color scheme for card type
     * @param {string} type - Card type
     * @returns {Object} Color scheme
     */
    getColorScheme(type) {
        const schemes = {
            researcher: { 
                primary: '#2c5aa0', 
                secondary: '#ffffff', 
                accent: '#ff6b35',
                text: '#000000',
                background: '#f8f9fa'
            },
            security: { 
                primary: '#8b0000', 
                secondary: '#ffffff', 
                accent: '#ffd700',
                text: '#ffffff',
                background: '#1a1a1a'
            },
            dclass: { 
                primary: '#ff4500', 
                secondary: '#000000', 
                accent: '#ffff00',
                text: '#000000',
                background: '#fff3e0'
            },
            o5: { 
                primary: '#000000', 
                secondary: '#ffffff', 
                accent: '#ff0000',
                text: '#ffffff',
                background: '#000000'
            }
        };
        return schemes[type] || schemes.researcher;
    }

    /**
     * Get security features for card type
     * @param {string} type - Card type
     * @returns {Object} Security features
     */
    getSecurityFeatures(type) {
        const features = {
            researcher: {
                watermark: 'RESEARCH',
                hologram: false,
                rfid: true,
                biometric: false
            },
            security: {
                watermark: 'SECURITY',
                hologram: true,
                rfid: true,
                biometric: true
            },
            dclass: {
                watermark: 'D-CLASS',
                hologram: false,
                rfid: false,
                biometric: true
            },
            o5: {
                watermark: 'O5 COUNCIL',
                hologram: true,
                rfid: true,
                biometric: true
            }
        };
        return features[type] || features.researcher;
    }

    /**
     * Render the card template to canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {PersonnelCard} personnel - Personnel data
     */
    render(ctx, personnel) {
        // Clear canvas
        ctx.clearRect(0, 0, this.layout.width, this.layout.height);
        
        // Draw background
        this.drawBackground(ctx);
        
        // Draw border
        this.drawBorder(ctx);
        
        // Draw logo
        this.drawLogo(ctx);
        
        // Draw photo placeholder or actual photo
        this.drawPhoto(ctx, personnel.personalInfo.photo);
        
        // Draw text elements
        this.drawTextElements(ctx, personnel);
        
        // Draw security features
        this.drawSecurityFeatures(ctx, personnel);
        
        // Draw classification markings
        this.drawClassification(ctx, personnel);
    }

    /**
     * Draw background with card type specific styling
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    drawBackground(ctx) {
        // Main background
        ctx.fillStyle = this.colors.background;
        ctx.fillRect(0, 0, this.layout.width, this.layout.height);
        
        // Header stripe
        ctx.fillStyle = this.colors.primary;
        ctx.fillRect(0, 0, this.layout.width, 60);
        
        // Side accent
        ctx.fillStyle = this.colors.accent;
        ctx.fillRect(0, 60, 10, this.layout.height - 60);
    }

    /**
     * Draw card border
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    drawBorder(ctx) {
        ctx.strokeStyle = this.layout.borderColor;
        ctx.lineWidth = this.layout.borderWidth;
        ctx.strokeRect(0, 0, this.layout.width, this.layout.height);
    }

    /**
     * Draw SCP Foundation logo
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    drawLogo(ctx) {
        // For now, draw a placeholder circle with SCP text
        const logo = this.elements.logo;
        
        // Draw circle background
        ctx.fillStyle = this.colors.secondary;
        ctx.beginPath();
        ctx.arc(logo.position.x + logo.size.w/2, logo.position.y + logo.size.h/2, logo.size.w/2, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw SCP text
        ctx.fillStyle = this.colors.primary;
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('SCP', logo.position.x + logo.size.w/2, logo.position.y + logo.size.h/2 + 6);
        
        // Draw foundation text
        ctx.font = '10px Arial';
        ctx.fillText('FOUNDATION', logo.position.x + logo.size.w/2, logo.position.y + logo.size.h/2 + 20);
    }

    /**
     * Draw personnel photo or placeholder
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {string|null} photoData - Photo data URL or null
     */
    drawPhoto(ctx, photoData) {
        const photo = this.elements.photo;
        
        // Draw photo border
        ctx.strokeStyle = this.colors.primary;
        ctx.lineWidth = photo.borderWidth;
        ctx.strokeRect(photo.position.x, photo.position.y, photo.size.w, photo.size.h);
        
        if (photoData) {
            // TODO: Draw actual photo when image loading is implemented
            // For now, draw placeholder
            ctx.fillStyle = '#cccccc';
            ctx.fillRect(photo.position.x + 2, photo.position.y + 2, photo.size.w - 4, photo.size.h - 4);
            
            ctx.fillStyle = '#666666';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('PHOTO', photo.position.x + photo.size.w/2, photo.position.y + photo.size.h/2);
        } else {
            // Draw placeholder
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(photo.position.x + 2, photo.position.y + 2, photo.size.w - 4, photo.size.h - 4);
            
            ctx.fillStyle = '#999999';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('NO PHOTO', photo.position.x + photo.size.w/2, photo.position.y + photo.size.h/2);
        }
    }

    /**
     * Draw text elements (name, ID, etc.)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {PersonnelCard} personnel - Personnel data
     */
    drawTextElements(ctx, personnel) {
        ctx.textAlign = 'left';
        
        // Name
        const nameEl = this.elements.name;
        ctx.fillStyle = this.colors.text;
        ctx.font = `${nameEl.fontWeight} ${nameEl.fontSize}px ${nameEl.fontFamily}`;
        ctx.fillText(personnel.getDisplayName(), nameEl.position.x, nameEl.position.y);
        
        // Employee ID
        const idEl = this.elements.employeeId;
        ctx.font = `${idEl.fontSize}px ${idEl.fontFamily}`;
        ctx.fillText(personnel.personalInfo.employeeId, idEl.position.x, idEl.position.y);
        
        // Clearance Level
        const clearanceEl = this.elements.clearance;
        ctx.fillStyle = this.colors.accent;
        ctx.font = `${clearanceEl.fontWeight} ${clearanceEl.fontSize}px Arial`;
        ctx.fillText(personnel.getClearanceDisplay(), clearanceEl.position.x, clearanceEl.position.y);
        
        // Department
        const deptEl = this.elements.department;
        ctx.fillStyle = this.colors.text;
        ctx.font = `${deptEl.fontSize}px Arial`;
        ctx.fillText(`DEPT: ${personnel.assignment.departmentName || personnel.assignment.department}`, 
                    deptEl.position.x, deptEl.position.y);
        
        // Site
        const siteEl = this.elements.site;
        ctx.fillText(`SITE: ${personnel.assignment.siteDesignation}`, siteEl.position.x, siteEl.position.y);
        
        // Position
        const posEl = this.elements.position;
        ctx.font = `${posEl.fontSize}px Arial`;
        ctx.fillText(`POSITION: ${personnel.assignment.position}`, posEl.position.x, posEl.position.y);
        
        // Issue Date
        const issueEl = this.elements.issueDate;
        ctx.font = `${issueEl.fontSize}px Arial`;
        ctx.fillText(`ISSUED: ${personnel.security.issueDate.toLocaleDateString()}`, 
                    issueEl.position.x, issueEl.position.y);
        
        // Expiration Date (if applicable)
        if (personnel.security.expirationDate) {
            const expEl = this.elements.expirationDate;
            ctx.fillStyle = this.colors.accent;
            ctx.fillText(`EXPIRES: ${personnel.security.expirationDate.toLocaleDateString()}`, 
                        expEl.position.x, expEl.position.y);
        }
    }

    /**
     * Draw security features (barcode, watermark, etc.)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {PersonnelCard} personnel - Personnel data
     */
    drawSecurityFeatures(ctx, personnel) {
        // Draw barcode placeholder
        const barcode = this.elements.barcode;
        ctx.fillStyle = '#000000';
        
        // Draw barcode lines
        for (let i = 0; i < 50; i++) {
            const lineWidth = Math.random() > 0.5 ? 2 : 1;
            const x = barcode.position.x + (i * 4);
            ctx.fillRect(x, barcode.position.y, lineWidth, barcode.size.h);
        }
        
        // Draw watermark if enabled
        if (this.securityFeatures.watermark) {
            ctx.save();
            ctx.globalAlpha = 0.1;
            ctx.fillStyle = this.colors.primary;
            ctx.font = 'bold 48px Arial';
            ctx.textAlign = 'center';
            ctx.translate(this.layout.width/2, this.layout.height/2);
            ctx.rotate(-Math.PI/6);
            ctx.fillText(this.securityFeatures.watermark, 0, 0);
            ctx.restore();
        }
    }

    /**
     * Draw classification markings
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {PersonnelCard} personnel - Personnel data
     */
    drawClassification(ctx, personnel) {
        const classEl = this.elements.classification;
        ctx.fillStyle = this.colors.accent;
        ctx.font = `${classEl.fontWeight} ${classEl.fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('CLASSIFIED', classEl.position.x, classEl.position.y);
    }
}

/**
 * Researcher Card Template
 * Blue color scheme for research personnel
 */
class ResearcherCardTemplate extends CardTemplate {
    constructor() {
        super('researcher');
        
        // Customize for researcher cards
        this.elements.classification.position.y = 35;
        
        // Add research-specific elements
        this.elements.specializations = {
            position: { x: 20, y: 360 },
            fontSize: 12
        };
    }

    drawTextElements(ctx, personnel) {
        super.drawTextElements(ctx, personnel);
        
        // Add specializations if any
        if (personnel.assignment.specialDesignations && personnel.assignment.specialDesignations.length > 0) {
            const specEl = this.elements.specializations;
            ctx.fillStyle = this.colors.text;
            ctx.font = `${specEl.fontSize}px Arial`;
            ctx.fillText(`SPEC: ${personnel.assignment.specialDesignations.join(', ')}`, 
                        specEl.position.x, specEl.position.y);
        }
    }
}

/**
 * Security Card Template
 * Red color scheme for security personnel
 */
class SecurityCardTemplate extends CardTemplate {
    constructor() {
        super('security');
        
        // Customize for security cards
        this.layout.backgroundColor = '#1a1a1a';
        
        // Add security-specific elements
        this.elements.accessZones = {
            position: { x: 20, y: 360 },
            fontSize: 12
        };
        
        this.elements.weaponsAuth = {
            position: { x: 20, y: 380 },
            fontSize: 12
        };
    }

    drawBackground(ctx) {
        super.drawBackground(ctx);
        
        // Add security stripes
        ctx.fillStyle = this.colors.accent;
        for (let i = 0; i < 5; i++) {
            ctx.fillRect(this.layout.width - 20, i * 20, 10, 10);
        }
    }

    drawTextElements(ctx, personnel) {
        super.drawTextElements(ctx, personnel);
        
        // Add access zones
        if (personnel.assignment.accessZones && personnel.assignment.accessZones.length > 0) {
            const accessEl = this.elements.accessZones;
            ctx.fillStyle = this.colors.secondary;
            ctx.font = `${accessEl.fontSize}px Arial`;
            ctx.fillText(`ACCESS: ${personnel.assignment.accessZones.join(', ')}`, 
                        accessEl.position.x, accessEl.position.y);
        }
        
        // Add weapons authorization placeholder
        const weaponsEl = this.elements.weaponsAuth;
        ctx.fillText('WEAPONS AUTH: [CLASSIFIED]', weaponsEl.position.x, weaponsEl.position.y);
    }
}

/**
 * D-Class Card Template
 * Orange color scheme for D-Class personnel
 */
class DClassCardTemplate extends CardTemplate {
    constructor() {
        super('dclass');
        
        // Customize for D-Class cards
        this.elements.warnings = {
            position: { x: 20, y: 360 },
            fontSize: 14,
            fontWeight: 'bold'
        };
        
        this.elements.testingHistory = {
            position: { x: 20, y: 380 },
            fontSize: 10
        };
    }

    drawBackground(ctx) {
        super.drawBackground(ctx);
        
        // Add warning stripes
        ctx.fillStyle = this.colors.accent;
        for (let i = 0; i < this.layout.width; i += 40) {
            ctx.fillRect(i, this.layout.height - 20, 20, 20);
        }
    }

    drawTextElements(ctx, personnel) {
        super.drawTextElements(ctx, personnel);
        
        // Add D-Class warnings
        const warningsEl = this.elements.warnings;
        ctx.fillStyle = this.colors.accent;
        ctx.font = `${warningsEl.fontWeight} ${warningsEl.fontSize}px Arial`;
        ctx.fillText('⚠ D-CLASS PERSONNEL ⚠', warningsEl.position.x, warningsEl.position.y);
        
        // Add testing history placeholder
        const testingEl = this.elements.testingHistory;
        ctx.fillStyle = this.colors.text;
        ctx.font = `${testingEl.fontSize}px Arial`;
        ctx.fillText('Testing History: [REDACTED]', testingEl.position.x, testingEl.position.y);
    }

    drawClassification(ctx, personnel) {
        // Override to show expiration prominently
        const classEl = this.elements.classification;
        ctx.fillStyle = this.colors.accent;
        ctx.font = `${classEl.fontWeight} ${classEl.fontSize}px Arial`;
        ctx.textAlign = 'center';
        
        if (personnel.security.expirationDate) {
            const daysUntilExpiry = Math.ceil((personnel.security.expirationDate - new Date()) / (1000 * 60 * 60 * 24));
            ctx.fillText(`EXPIRES IN ${daysUntilExpiry} DAYS`, classEl.position.x, classEl.position.y);
        } else {
            ctx.fillText('EXPIRATION REQUIRED', classEl.position.x, classEl.position.y);
        }
    }
}

/**
 * O5 Council Card Template
 * Black color scheme for O5 Council members
 */
class O5CardTemplate extends CardTemplate {
    constructor() {
        super('o5');
        
        // Customize for O5 cards
        this.layout.backgroundColor = '#000000';
        
        this.elements.councilNumber = {
            position: { x: 400, y: 120 },
            fontSize: 48,
            fontWeight: 'bold'
        };
        
        this.elements.specialAccess = {
            position: { x: 20, y: 360 },
            fontSize: 12
        };
    }

    drawBackground(ctx) {
        // Full black background
        ctx.fillStyle = this.colors.background;
        ctx.fillRect(0, 0, this.layout.width, this.layout.height);
        
        // Red header stripe
        ctx.fillStyle = this.colors.accent;
        ctx.fillRect(0, 0, this.layout.width, 60);
        
        // Gold accents
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(0, 60, 5, this.layout.height - 60);
        ctx.fillRect(this.layout.width - 5, 60, 5, this.layout.height - 60);
    }

    drawTextElements(ctx, personnel) {
        super.drawTextElements(ctx, personnel);
        
        // Add O5 council number (extract from employee ID or use separate field)
        const councilEl = this.elements.councilNumber;
        ctx.fillStyle = this.colors.accent;
        ctx.font = `${councilEl.fontWeight} ${councilEl.fontSize}px Arial`;
        ctx.textAlign = 'center';
        
        // Extract O5 number from employee ID or use default
        const o5Number = personnel.personalInfo.employeeId.match(/O5-(\d+)/) || ['', '█'];
        ctx.fillText(`O5-${o5Number[1]}`, councilEl.position.x, councilEl.position.y);
        
        // Add special access note
        const accessEl = this.elements.specialAccess;
        ctx.fillStyle = this.colors.secondary;
        ctx.font = `${accessEl.fontSize}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText('SPECIAL ACCESS: ALL CLEARANCE LEVELS', accessEl.position.x, accessEl.position.y);
    }

    drawClassification(ctx, personnel) {
        const classEl = this.elements.classification;
        ctx.fillStyle = this.colors.accent;
        ctx.font = `${classEl.fontWeight} ${classEl.fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('EYES ONLY', classEl.position.x, classEl.position.y);
    }
}

/**
 * Template Factory
 * Creates appropriate template instances based on card type
 */
class CardTemplateFactory {
    /**
     * Create template instance for card type
     * @param {string} cardType - Type of card (researcher, security, dclass, o5)
     * @returns {CardTemplate} Template instance
     */
    static createTemplate(cardType) {
        switch (cardType.toLowerCase()) {
            case 'researcher':
                return new ResearcherCardTemplate();
            case 'security':
                return new SecurityCardTemplate();
            case 'dclass':
                return new DClassCardTemplate();
            case 'o5':
                return new O5CardTemplate();
            default:
                return new ResearcherCardTemplate(); // Default fallback
        }
    }

    /**
     * Get available card types
     * @returns {Array} Array of available card types
     */
    static getAvailableTypes() {
        return [
            {
                type: 'researcher',
                title: 'Researcher Card',
                description: 'For research personnel and scientists',
                clearanceLevels: [1, 2, 3, 4],
                color: '#2c5aa0'
            },
            {
                type: 'security',
                title: 'Security Personnel Card',
                description: 'For security and containment staff',
                clearanceLevels: [1, 2, 3, 4, 5],
                color: '#8b0000'
            },
            {
                type: 'dclass',
                title: 'D-Class Personnel Card',
                description: 'For D-Class test subjects',
                clearanceLevels: [0],
                color: '#ff4500'
            },
            {
                type: 'o5',
                title: 'O5 Council Card',
                description: 'For O5 Council members',
                clearanceLevels: [5],
                color: '#000000'
            }
        ];
    }
}

// Export classes for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = {
        CardTemplate,
        ResearcherCardTemplate,
        SecurityCardTemplate,
        DClassCardTemplate,
        O5CardTemplate,
        CardTemplateFactory
    };
} else {
    // Browser environment - attach to window
    window.CardTemplate = CardTemplate;
    window.ResearcherCardTemplate = ResearcherCardTemplate;
    window.SecurityCardTemplate = SecurityCardTemplate;
    window.DClassCardTemplate = DClassCardTemplate;
    window.O5CardTemplate = O5CardTemplate;
    window.CardTemplateFactory = CardTemplateFactory;
}