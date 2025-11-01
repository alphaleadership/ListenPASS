/**
 * Batch Service - Handles batch card generation and processing
 */

const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
const archiver = require('archiver');
const cardService = require('./cardService');

class BatchJob {
    constructor(fileInfo, config = {}) {
        this.batchId = this.generateBatchId();
        this.status = 'pending'; // pending, processing, completed, failed
        this.totalCards = fileInfo.personnelData.length;
        this.processedCards = 0;
        this.failedCards = 0;
        this.startTime = null;
        this.endTime = null;
        this.outputPath = null;
        this.archivePath = null;
        this.errors = [];
        this.config = {
            outputFormat: config.outputFormat || 'png',
            resolution: config.resolution || 300,
            includeInvalid: config.includeInvalid || false,
            cardTypes: config.cardTypes || [],
            ...config
        };
        this.fileInfo = fileInfo;
        this.estimatedTime = this.calculateEstimatedTime();
    }
    
    generateBatchId() {
        return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    getProgress() {
        return this.totalCards > 0 ? Math.round((this.processedCards / this.totalCards) * 100) : 0;
    }
    
    addError(cardIndex, error) {
        this.errors.push({ 
            cardIndex, 
            error: error.message || error, 
            timestamp: new Date() 
        });
        this.failedCards++;
    }
    
    calculateEstimatedTime() {
        // Estimate ~2 seconds per card
        return this.totalCards * 2;
    }
    
    updateEstimatedTimeRemaining() {
        if (this.status !== 'processing' || !this.startTime) return 0;
        
        const elapsed = (Date.now() - this.startTime.getTime()) / 1000;
        const avgTimePerCard = elapsed / Math.max(this.processedCards, 1);
        const remainingCards = this.totalCards - this.processedCards;
        
        return Math.round(remainingCards * avgTimePerCard);
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

class BatchService {
    constructor() {
        this.activeBatches = new Map();
        this.completedBatches = new Map();
        this.outputDir = path.join(__dirname, '../output');
        this.batchDir = path.join(__dirname, '../output/batches');
        
        // Initialize directories
        this.initializeDirectories();
        
        // Cleanup old batches every hour
        setInterval(() => this.cleanupOldBatches(), 60 * 60 * 1000);
    }
    
    async initializeDirectories() {
        try {
            await fs.mkdir(this.batchDir, { recursive: true });
        } catch (error) {
            console.error('Error creating batch directories:', error);
        }
    }
    
    async startBatchGeneration(fileInfo, config = {}) {
        const batchJob = new BatchJob(fileInfo, config);
        
        this.activeBatches.set(batchJob.batchId, batchJob);
        
        // Start processing asynchronously
        this.processBatch(batchJob).catch(error => {
            console.error(`Batch ${batchJob.batchId} failed:`, error);
            batchJob.status = 'failed';
            batchJob.addError(-1, error);
            batchJob.endTime = new Date();
        });
        
        return {
            batchId: batchJob.batchId,
            estimatedTime: batchJob.estimatedTime,
            totalCards: batchJob.totalCards
        };
    }
    
    async processBatch(batchJob) {
        try {
            batchJob.status = 'processing';
            batchJob.startTime = new Date();
            
            console.log(`Starting batch generation: ${batchJob.batchId} (${batchJob.totalCards} cards)`);
            
            // Create batch output directory
            const batchOutputDir = path.join(this.batchDir, batchJob.batchId);
            await fs.mkdir(batchOutputDir, { recursive: true });
            
            const generatedFiles = [];
            const validPersonnel = batchJob.config.includeInvalid 
                ? batchJob.fileInfo.personnelData 
                : batchJob.fileInfo.personnelData.filter((_, index) => {
                    const validation = batchJob.fileInfo.validationResults[index];
                    return validation && validation.isValid;
                });
            
            // Process cards in parallel batches with better concurrency control
            const concurrency = Math.min(batchJob.config.concurrency || 3, 5); // Max 5 concurrent generations
            const batchSize = concurrency;
            
            for (let i = 0; i < validPersonnel.length; i += batchSize) {
                const batch = validPersonnel.slice(i, i + batchSize);
                
                // Process batch with controlled concurrency
                const batchPromises = batch.map(async (person, batchIndex) => {
                    const globalIndex = i + batchIndex;
                    try {
                        // Generate card with progress tracking
                        const startTime = Date.now();
                        const cardResult = await cardService.generateSingleCard(person, {
                            outputFormat: batchJob.config.outputFormat,
                            resolution: batchJob.config.resolution,
                            includeBackside: batchJob.config.includeBackside
                        });
                        const generationTime = Date.now() - startTime;
                        
                        // Create safe filename
                        const safeEmployeeId = (person.employeeId || `card-${globalIndex + 1}`)
                            .replace(/[^a-zA-Z0-9\-_]/g, '_');
                        const newFilename = `${safeEmployeeId}.${batchJob.config.outputFormat}`;
                        
                        // Move generated file to batch directory
                        const originalPath = path.join(this.outputDir, `card-${cardResult.id}.${batchJob.config.outputFormat}`);
                        const newPath = path.join(batchOutputDir, newFilename);
                        
                        await fs.rename(originalPath, newPath);
                        
                        // Handle backside if generated
                        let backsideFilename = null;
                        if (cardResult.backUrl) {
                            const backsideOriginalPath = path.join(this.outputDir, `card-${cardResult.id}-back.${batchJob.config.outputFormat}`);
                            backsideFilename = `${safeEmployeeId}-back.${batchJob.config.outputFormat}`;
                            const backsidePath = path.join(batchOutputDir, backsideFilename);
                            
                            try {
                                await fs.rename(backsideOriginalPath, backsidePath);
                            } catch (error) {
                                console.warn(`Could not move backside file for ${person.employeeId}:`, error);
                            }
                        }
                        
                        const fileInfo = {
                            filename: newFilename,
                            backsideFilename,
                            path: newPath,
                            employeeId: person.employeeId,
                            fullName: person.fullName,
                            cardType: person.cardType || 'researcher',
                            generationTime,
                            fileSize: cardResult.metadata?.fileSize || 0
                        };
                        
                        generatedFiles.push(fileInfo);
                        batchJob.processedCards++;
                        
                        // Update estimated time remaining
                        batchJob.estimatedTimeRemaining = batchJob.updateEstimatedTimeRemaining();
                        
                        console.log(`Generated card ${batchJob.processedCards}/${batchJob.totalCards}: ${person.employeeId} (${generationTime}ms)`);
                        
                        return fileInfo;
                        
                    } catch (error) {
                        console.error(`Error generating card for ${person.employeeId}:`, error);
                        batchJob.addError(globalIndex, error);
                        return null;
                    }
                });
                
                // Wait for current batch to complete
                const batchResults = await Promise.allSettled(batchPromises);
                
                // Process results and handle any rejections
                batchResults.forEach((result, index) => {
                    if (result.status === 'rejected') {
                        const globalIndex = i + index;
                        const person = batch[index];
                        console.error(`Batch promise rejected for ${person.employeeId}:`, result.reason);
                        batchJob.addError(globalIndex, result.reason);
                    }
                });
                
                // Small delay between batches to prevent overwhelming the system
                if (i + batchSize < validPersonnel.length) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
                
                // Log progress
                const progress = Math.round((batchJob.processedCards / batchJob.totalCards) * 100);
                console.log(`Batch progress: ${progress}% (${batchJob.processedCards}/${batchJob.totalCards})`);
            }
            
            // Calculate statistics
            const totalGenerationTime = generatedFiles.reduce((sum, file) => sum + (file.generationTime || 0), 0);
            const averageGenerationTime = generatedFiles.length > 0 ? totalGenerationTime / generatedFiles.length : 0;
            const totalFileSize = generatedFiles.reduce((sum, file) => sum + (file.fileSize || 0), 0);
            
            // Group by card type
            const cardTypeDistribution = {};
            generatedFiles.forEach(file => {
                const type = file.cardType || 'unknown';
                cardTypeDistribution[type] = (cardTypeDistribution[type] || 0) + 1;
            });
            
            // Create comprehensive manifest file
            const manifest = {
                batchId: batchJob.batchId,
                generatedAt: new Date().toISOString(),
                processingTime: {
                    startTime: batchJob.startTime?.toISOString(),
                    endTime: batchJob.endTime?.toISOString(),
                    totalDuration: batchJob.endTime ? batchJob.endTime - batchJob.startTime : 0,
                    averagePerCard: averageGenerationTime
                },
                statistics: {
                    totalRequested: batchJob.totalCards,
                    totalGenerated: generatedFiles.length,
                    totalFailed: batchJob.failedCards,
                    successRate: batchJob.totalCards > 0 ? ((generatedFiles.length / batchJob.totalCards) * 100).toFixed(2) + '%' : '0%',
                    totalFileSize: totalFileSize,
                    averageFileSize: generatedFiles.length > 0 ? Math.round(totalFileSize / generatedFiles.length) : 0
                },
                config: batchJob.config,
                cardTypeDistribution,
                files: generatedFiles.map(f => ({
                    filename: f.filename,
                    backsideFilename: f.backsideFilename,
                    employeeId: f.employeeId,
                    fullName: f.fullName,
                    cardType: f.cardType,
                    fileSize: f.fileSize,
                    generationTime: f.generationTime
                })),
                errors: batchJob.errors.map(error => ({
                    cardIndex: error.cardIndex,
                    error: error.error,
                    timestamp: error.timestamp
                })),
                generator: {
                    name: 'SCP Card Generator',
                    version: '1.0.0',
                    server: true
                }
            };
            
            const manifestPath = path.join(batchOutputDir, 'manifest.json');
            await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
            
            // Create ZIP archive
            const archivePath = path.join(this.batchDir, `${batchJob.batchId}.zip`);
            await this.createZipArchive(batchOutputDir, archivePath);
            
            batchJob.status = 'completed';
            batchJob.endTime = new Date();
            batchJob.archivePath = archivePath;
            
            // Move to completed batches
            this.completedBatches.set(batchJob.batchId, batchJob);
            this.activeBatches.delete(batchJob.batchId);
            
            console.log(`Batch ${batchJob.batchId} completed: ${generatedFiles.length}/${batchJob.totalCards} cards generated`);
            
        } catch (error) {
            console.error(`Batch processing error for ${batchJob.batchId}:`, error);
            batchJob.status = 'failed';
            batchJob.addError(-1, error);
            batchJob.endTime = new Date();
        }
    }
    
    async createZipArchive(sourceDir, outputPath) {
        return new Promise((resolve, reject) => {
            const output = require('fs').createWriteStream(outputPath);
            const archive = archiver('zip', { 
                zlib: { level: 6 }, // Balance between compression and speed
                forceLocalTime: true,
                comment: 'SCP Foundation Personnel Cards - Generated by SCP Card Generator'
            });
            
            let totalFiles = 0;
            
            output.on('close', () => {
                const sizeInMB = (archive.pointer() / (1024 * 1024)).toFixed(2);
                console.log(`Archive created: ${outputPath} (${sizeInMB} MB, ${totalFiles} files)`);
                resolve({
                    path: outputPath,
                    size: archive.pointer(),
                    fileCount: totalFiles
                });
            });
            
            archive.on('error', (err) => {
                console.error('Archive creation error:', err);
                reject(err);
            });
            
            archive.on('entry', (entry) => {
                totalFiles++;
            });
            
            archive.on('progress', (progress) => {
                if (progress.entries.processed % 10 === 0) {
                    console.log(`Archiving progress: ${progress.entries.processed}/${progress.entries.total} files`);
                }
            });
            
            archive.pipe(output);
            
            // Add files with organized structure
            archive.directory(sourceDir, false, (entry) => {
                // Organize files by type
                if (entry.name.endsWith('-back.png') || entry.name.endsWith('-back.jpg')) {
                    entry.name = `backsides/${entry.name}`;
                } else if (entry.name.endsWith('.png') || entry.name.endsWith('.jpg') || entry.name.endsWith('.pdf')) {
                    entry.name = `cards/${entry.name}`;
                } else if (entry.name === 'manifest.json') {
                    entry.name = 'manifest.json'; // Keep at root
                }
                
                return entry;
            });
            
            archive.finalize();
        });
    }
    
    getBatchStatus(batchId) {
        let batch = this.activeBatches.get(batchId) || this.completedBatches.get(batchId);
        
        if (!batch) return null;
        
        return {
            batchId: batch.batchId,
            status: batch.status,
            processedCards: batch.processedCards,
            totalCards: batch.totalCards,
            failedCards: batch.failedCards,
            estimatedTimeRemaining: batch.updateEstimatedTimeRemaining(),
            errors: batch.errors,
            getProgress: () => batch.getProgress()
        };
    }
    
    getBatchResult(batchId) {
        const batch = this.completedBatches.get(batchId);
        if (!batch || batch.status !== 'completed') return null;
        
        return {
            batchId: batch.batchId,
            status: batch.status,
            archivePath: batch.archivePath,
            totalGenerated: batch.processedCards,
            totalFailed: batch.failedCards,
            generationTime: batch.endTime - batch.startTime
        };
    }
    
    async generatePreviewCard(personnelData) {
        try {
            // Generate a small preview card (lower resolution)
            const result = await cardService.generateSingleCard(personnelData, {
                outputFormat: 'png',
                resolution: 150 // Lower resolution for preview
            });
            
            // Read the file and convert to base64
            const filePath = path.join(this.outputDir, `card-${result.id}.png`);
            const imageBuffer = await fs.readFile(filePath);
            const dataUrl = `data:image/png;base64,${imageBuffer.toString('base64')}`;
            
            // Clean up the temporary file
            await fs.unlink(filePath);
            
            return { dataUrl };
            
        } catch (error) {
            throw new Error(`Preview generation failed: ${error.message}`);
        }
    }
    
    async cancelBatch(batchId) {
        const batch = this.activeBatches.get(batchId) || this.completedBatches.get(batchId);
        if (!batch) return false;
        
        const wasActive = this.activeBatches.has(batchId);
        
        batch.status = 'cancelled';
        batch.endTime = new Date();
        
        // Remove from active batches
        if (wasActive) {
            this.activeBatches.delete(batchId);
        }
        
        // Clean up files
        try {
            const batchOutputDir = path.join(this.batchDir, batchId);
            const archivePath = path.join(this.batchDir, `${batchId}.zip`);
            
            // Remove batch directory
            try {
                await fs.rmdir(batchOutputDir, { recursive: true });
                console.log(`Cleaned up batch directory: ${batchOutputDir}`);
            } catch (error) {
                console.warn('Error removing batch directory:', error);
            }
            
            // Remove archive if it exists
            try {
                await fs.unlink(archivePath);
                console.log(`Cleaned up batch archive: ${archivePath}`);
            } catch (error) {
                // Archive might not exist yet, ignore error
            }
            
        } catch (error) {
            console.error('Error cleaning up cancelled batch:', error);
        }
        
        console.log(`Batch ${batchId} cancelled and cleaned up`);
        return true;
    }
    
    async pauseBatch(batchId) {
        const batch = this.activeBatches.get(batchId);
        if (!batch || batch.status !== 'processing') return false;
        
        batch.status = 'paused';
        console.log(`Batch ${batchId} paused`);
        return true;
    }
    
    async resumeBatch(batchId) {
        const batch = this.activeBatches.get(batchId);
        if (!batch || batch.status !== 'paused') return false;
        
        batch.status = 'processing';
        console.log(`Batch ${batchId} resumed`);
        return true;
    }
    
    getAllBatches(options = {}) {
        const { status, limit = 50, offset = 0 } = options;
        
        let allBatches = [
            ...Array.from(this.activeBatches.values()),
            ...Array.from(this.completedBatches.values())
        ];
        
        if (status) {
            allBatches = allBatches.filter(batch => batch.status === status);
        }
        
        // Sort by start time (newest first)
        allBatches.sort((a, b) => {
            const timeA = a.startTime || new Date(0);
            const timeB = b.startTime || new Date(0);
            return timeB - timeA;
        });
        
        return allBatches.slice(offset, offset + limit);
    }
    
    async cleanupOldBatches() {
        const cutoffTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
        const batchesToCleanup = [];
        
        for (const [batchId, batch] of this.completedBatches.entries()) {
            if (batch.endTime && batch.endTime < cutoffTime) {
                batchesToCleanup.push(batchId);
            }
        }
        
        for (const batchId of batchesToCleanup) {
            try {
                const batch = this.completedBatches.get(batchId);
                
                // Delete archive file
                if (batch.archivePath) {
                    await fs.unlink(batch.archivePath);
                }
                
                // Delete batch directory
                const batchDir = path.join(this.batchDir, batchId);
                await fs.rmdir(batchDir, { recursive: true });
                
                this.completedBatches.delete(batchId);
                
                console.log(`Cleaned up old batch: ${batchId}`);
                
            } catch (error) {
                console.error(`Error cleaning up batch ${batchId}:`, error);
            }
        }
        
        if (batchesToCleanup.length > 0) {
            console.log(`Cleaned up ${batchesToCleanup.length} old batches`);
        }
    }
}

// Create singleton instance
const batchService = new BatchService();

module.exports = {
    startBatchGeneration: (fileInfo, config) => batchService.startBatchGeneration(fileInfo, config),
    getBatchStatus: (batchId) => batchService.getBatchStatus(batchId),
    getBatchResult: (batchId) => batchService.getBatchResult(batchId),
    generatePreviewCard: (personnelData) => batchService.generatePreviewCard(personnelData),
    cancelBatch: (batchId) => batchService.cancelBatch(batchId),
    getAllBatches: (options) => batchService.getAllBatches(options)
};