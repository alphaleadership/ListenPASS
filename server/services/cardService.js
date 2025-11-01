/**
 * Card Service - Handles server-side card generation
 */

const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

class CardService {
    constructor() {
        this.outputDir = path.join(__dirname, '../output');
        this.tempDir = path.join(__dirname, '../temp');
        this.assetsDir = path.join(__dirname, '../../assets');
        
        // Card dimensions (standard ID card size at 300 DPI)
        this.cardDimensions = {
            width: 1012,  // 85.6mm at 300 DPI
            height: 638   // 54mm at 300 DPI
        };
        
        // Initialize directories
        this.initializeDirectories();
    }
    
    async initializeDirectories() {
        try {
            await fs.mkdir(this.outputDir, { recursive: true });
            await fs.mkdir(this.tempDir, { recursive: true });
        } catch (error) {
            console.error('Error creating directories:', error);
        }
    }
    
    async generateSingleCard(cardData, options = {}) {
        try {
            const {
                outputFormat = 'png',
                resolution = 300,
                includeBackside = false
            } = options;
            
            // Generate front side
            const frontCanvas = await this.generateCardFront(cardData, resolution);
            
            // Generate back side if requested
            let backCanvas = null;
            if (includeBackside) {
                backCanvas = await this.generateCardBack(cardData, resolution);
            }
            
            // Save to file
            const cardId = uuidv4();
            const filename = `card-${cardId}.${outputFormat}`;
            const filePath = path.join(this.outputDir, filename);
            
            await this.saveCanvas(frontCanvas, filePath, outputFormat);
            
            // If backside is included, save it too
            let backFilePath = null;
            if (backCanvas) {
                const backFilename = `card-${cardId}-back.${outputFormat}`;
                backFilePath = path.join(this.outputDir, backFilename);
                await this.saveCanvas(backCanvas, backFilePath, outputFormat);
            }
            
            // Calculate expiration (24 hours from now)
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
            
            return {
                id: cardId,
                url: `/api/download-card/${cardId}`,
                backUrl: backFilePath ? `/api/download-card/${cardId}-back` : null,
                expiresAt: expiresAt.toISOString(),
                metadata: {
                    fileSize: await this.getFileSize(filePath),
                    dimensions: this.cardDimensions,
                    format: outputFormat,
                    resolution
                }
            };
            
        } catch (error) {
            console.error('Error generating card:', error);
            throw new Error(`Card generation failed: ${error.message}`);
        }
    }
    
    async generateCardFront(cardData, resolution = 300) {
        const scale = resolution / 300; // Scale factor for different resolutions
        const width = Math.round(this.cardDimensions.width * scale);
        const height = Math.round(this.cardDimensions.height * scale);
        
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        
        // Get card template based on type
        const template = this.getCardTemplate(cardData.cardType || 'researcher');
        
        // Fill background
        ctx.fillStyle = template.backgroundColor;
        ctx.fillRect(0, 0, width, height);
        
        // Draw border
        ctx.strokeStyle = template.borderColor;
        ctx.lineWidth = 2 * scale;
        ctx.strokeRect(0, 0, width, height);
        
        // Draw SCP Foundation logo
        await this.drawLogo(ctx, template, scale);
        
        // Draw card type indicator
        this.drawCardTypeIndicator(ctx, template, cardData.cardType, scale);
        
        // Draw text fields
        await this.drawTextFields(ctx, template, cardData, scale);
        
        // Draw clearance indicator
        this.drawClearanceIndicator(ctx, template, cardData.clearanceLevel, scale);
        
        // Draw photo placeholder or actual photo
        await this.drawPhoto(ctx, template, cardData.photoUrl, scale);
        
        // Draw security features
        this.drawSecurityFeatures(ctx, template, cardData, scale);
        
        return canvas;
    }
    
    async generateCardBack(cardData, resolution = 300) {
        const scale = resolution / 300;
        const width = Math.round(this.cardDimensions.width * scale);
        const height = Math.round(this.cardDimensions.height * scale);
        
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        
        const template = this.getCardTemplate(cardData.cardType || 'researcher');
        
        // Fill background
        ctx.fillStyle = template.backgroundColor;
        ctx.fillRect(0, 0, width, height);
        
        // Draw border
        ctx.strokeStyle = template.borderColor;
        ctx.lineWidth = 2 * scale;
        ctx.strokeRect(0, 0, width, height);
        
        // Draw barcode
        this.drawBarcode(ctx, cardData.employeeId, scale);
        
        // Draw emergency information
        this.drawEmergencyInfo(ctx, cardData, scale);
        
        // Draw security warnings
        this.drawSecurityWarnings(ctx, template, cardData.cardType, scale);
        
        return canvas;
    }
    
    getCardTemplate(cardType) {
        const templates = {
            researcher: {
                backgroundColor: '#f8f9fa',
                borderColor: '#2c5aa0',
                primaryColor: '#2c5aa0',
                secondaryColor: '#ffffff',
                accentColor: '#ff6b35',
                textColor: '#333333'
            },
            security: {
                backgroundColor: '#f8f9fa',
                borderColor: '#8b0000',
                primaryColor: '#8b0000',
                secondaryColor: '#ffffff',
                accentColor: '#ffd700',
                textColor: '#333333'
            },
            dclass: {
                backgroundColor: '#fff3cd',
                borderColor: '#ff4500',
                primaryColor: '#ff4500',
                secondaryColor: '#000000',
                accentColor: '#ffff00',
                textColor: '#000000'
            },
            o5: {
                backgroundColor: '#000000',
                borderColor: '#ffffff',
                primaryColor: '#000000',
                secondaryColor: '#ffffff',
                accentColor: '#ff0000',
                textColor: '#ffffff'
            }
        };
        
        return templates[cardType] || templates.researcher;
    }
    
    async drawLogo(ctx, template, scale) {
        try {
            const logoPath = path.join(this.assetsDir, 'scp-logo.svg');
            // For now, draw a placeholder logo
            const logoSize = 80 * scale;
            const x = 20 * scale;
            const y = 20 * scale;
            
            // Draw SCP logo placeholder
            ctx.fillStyle = template.primaryColor;
            ctx.fillRect(x, y, logoSize, logoSize);
            
            // Draw SCP text
            ctx.fillStyle = template.secondaryColor;
            ctx.font = `bold ${24 * scale}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText('SCP', x + logoSize/2, y + logoSize/2 + 8 * scale);
            
        } catch (error) {
            console.error('Error drawing logo:', error);
        }
    }
    
    drawCardTypeIndicator(ctx, template, cardType, scale) {
        const typeNames = {
            researcher: 'RESEARCHER',
            security: 'SECURITY',
            dclass: 'D-CLASS',
            o5: 'O5 COUNCIL'
        };
        
        const typeName = typeNames[cardType] || 'PERSONNEL';
        
        // Draw type banner
        const bannerHeight = 30 * scale;
        const bannerY = 120 * scale;
        
        ctx.fillStyle = template.primaryColor;
        ctx.fillRect(0, bannerY, ctx.canvas.width, bannerHeight);
        
        // Draw type text
        ctx.fillStyle = template.secondaryColor;
        ctx.font = `bold ${16 * scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(typeName, ctx.canvas.width / 2, bannerY + 20 * scale);
    }
    
    async drawTextFields(ctx, template, cardData, scale) {
        ctx.fillStyle = template.textColor;
        ctx.textAlign = 'left';
        
        const startY = 180 * scale;
        const lineHeight = 25 * scale;
        let currentY = startY;
        
        // Name
        ctx.font = `bold ${20 * scale}px Arial`;
        ctx.fillText(cardData.fullName || 'UNKNOWN', 20 * scale, currentY);
        currentY += lineHeight + 5 * scale;
        
        // Employee ID
        ctx.font = `${16 * scale}px Arial`;
        ctx.fillText(`ID: ${cardData.employeeId || 'SCP-XXXX-XXX'}`, 20 * scale, currentY);
        currentY += lineHeight;
        
        // Site and Department
        ctx.fillText(`Site: ${cardData.siteDesignation || 'Unknown'}`, 20 * scale, currentY);
        currentY += lineHeight;
        
        ctx.fillText(`Dept: ${cardData.department || 'Unknown'}`, 20 * scale, currentY);
        currentY += lineHeight;
        
        // Position
        if (cardData.position) {
            ctx.fillText(`Position: ${cardData.position}`, 20 * scale, currentY);
            currentY += lineHeight;
        }
        
        // Issue/Expiration dates
        if (cardData.issueDate) {
            ctx.font = `${12 * scale}px Arial`;
            ctx.fillText(`Issued: ${cardData.issueDate}`, 20 * scale, currentY);
            currentY += 20 * scale;
        }
        
        if (cardData.expirationDate) {
            ctx.font = `${12 * scale}px Arial`;
            ctx.fillStyle = template.accentColor;
            ctx.fillText(`Expires: ${cardData.expirationDate}`, 20 * scale, currentY);
        }
    }
    
    drawClearanceIndicator(ctx, template, clearanceLevel, scale) {
        if (clearanceLevel === undefined) return;
        
        const size = 60 * scale;
        const x = ctx.canvas.width - size - 20 * scale;
        const y = 180 * scale;
        
        // Draw clearance circle
        ctx.beginPath();
        ctx.arc(x + size/2, y + size/2, size/2, 0, 2 * Math.PI);
        ctx.fillStyle = template.accentColor;
        ctx.fill();
        ctx.strokeStyle = template.primaryColor;
        ctx.lineWidth = 3 * scale;
        ctx.stroke();
        
        // Draw clearance level
        ctx.fillStyle = template.textColor;
        ctx.font = `bold ${24 * scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(clearanceLevel.toString(), x + size/2, y + size/2 + 8 * scale);
        
        // Draw "CLEARANCE" text
        ctx.font = `${10 * scale}px Arial`;
        ctx.fillText('CLEARANCE', x + size/2, y + size + 15 * scale);
    }
    
    async drawPhoto(ctx, template, photoUrl, scale) {
        const photoWidth = 120 * scale;
        const photoHeight = 160 * scale;
        const x = ctx.canvas.width - photoWidth - 20 * scale;
        const y = 20 * scale;
        
        try {
            if (photoUrl && photoUrl.startsWith('http')) {
                // Load external image (in production, implement proper image loading)
                // For now, draw placeholder
                this.drawPhotoPlaceholder(ctx, x, y, photoWidth, photoHeight, template);
            } else {
                // Draw placeholder
                this.drawPhotoPlaceholder(ctx, x, y, photoWidth, photoHeight, template);
            }
        } catch (error) {
            console.error('Error loading photo:', error);
            this.drawPhotoPlaceholder(ctx, x, y, photoWidth, photoHeight, template);
        }
    }
    
    drawPhotoPlaceholder(ctx, x, y, width, height, template) {
        // Draw photo border
        ctx.fillStyle = '#cccccc';
        ctx.fillRect(x, y, width, height);
        
        ctx.strokeStyle = template.primaryColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
        
        // Draw placeholder text
        ctx.fillStyle = template.textColor;
        ctx.font = `${12}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('PHOTO', x + width/2, y + height/2);
    }
    
    drawSecurityFeatures(ctx, template, cardData, scale) {
        // Draw security strip
        const stripWidth = 10 * scale;
        ctx.fillStyle = template.accentColor;
        ctx.fillRect(0, 0, stripWidth, ctx.canvas.height);
        
        // Draw holographic effect (placeholder)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        for (let i = 0; i < 5; i++) {
            ctx.fillRect(i * 20 * scale, 0, 2 * scale, ctx.canvas.height);
        }
    }
    
    drawBarcode(ctx, employeeId, scale) {
        const barcodeWidth = 200 * scale;
        const barcodeHeight = 50 * scale;
        const x = (ctx.canvas.width - barcodeWidth) / 2;
        const y = 100 * scale;
        
        // Draw barcode placeholder
        ctx.fillStyle = '#000000';
        for (let i = 0; i < 50; i++) {
            const barWidth = Math.random() > 0.5 ? 2 * scale : 4 * scale;
            const barX = x + (i * 4 * scale);
            if (barX + barWidth <= x + barcodeWidth) {
                ctx.fillRect(barX, y, barWidth, barcodeHeight);
            }
        }
        
        // Draw employee ID below barcode
        ctx.fillStyle = '#333333';
        ctx.font = `${12 * scale}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(employeeId || 'SCP-XXXX-XXX', x + barcodeWidth/2, y + barcodeHeight + 20 * scale);
    }
    
    drawEmergencyInfo(ctx, cardData, scale) {
        ctx.fillStyle = '#333333';
        ctx.font = `${12 * scale}px Arial`;
        ctx.textAlign = 'left';
        
        const startY = 200 * scale;
        const lineHeight = 20 * scale;
        
        ctx.fillText('EMERGENCY CONTACT:', 20 * scale, startY);
        ctx.fillText(cardData.emergencyContact || 'Site Security', 20 * scale, startY + lineHeight);
        
        ctx.fillText('IN CASE OF BREACH:', 20 * scale, startY + lineHeight * 3);
        ctx.fillText('1. Remain calm', 20 * scale, startY + lineHeight * 4);
        ctx.fillText('2. Follow evacuation procedures', 20 * scale, startY + lineHeight * 5);
        ctx.fillText('3. Report to designated safe zone', 20 * scale, startY + lineHeight * 6);
    }
    
    drawSecurityWarnings(ctx, template, cardType, scale) {
        const warnings = {
            researcher: 'AUTHORIZED PERSONNEL ONLY',
            security: 'ARMED RESPONSE AUTHORIZED',
            dclass: 'EXPENDABLE - HANDLE WITH CAUTION',
            o5: 'MAXIMUM SECURITY CLEARANCE'
        };
        
        const warning = warnings[cardType] || 'RESTRICTED ACCESS';
        
        ctx.fillStyle = template.accentColor;
        ctx.font = `bold ${14 * scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(warning, ctx.canvas.width / 2, ctx.canvas.height - 30 * scale);
    }
    
    async saveCanvas(canvas, filePath, format) {
        const buffer = canvas.toBuffer(format === 'jpg' ? 'image/jpeg' : 'image/png');
        await fs.writeFile(filePath, buffer);
    }
    
    async getFileSize(filePath) {
        try {
            const stats = await fs.stat(filePath);
            return stats.size;
        } catch (error) {
            return 0;
        }
    }
}

// Create singleton instance
const cardService = new CardService();

module.exports = {
    generateSingleCard: (cardData, options) => cardService.generateSingleCard(cardData, options)
};