/**
 * Batch Processing Routes - Endpoints for batch card generation
 */

const express = require('express');
const router = express.Router();

// Import services
const batchService = require('../services/batchService');
const fileService = require('../services/fileService');

/**
 * POST /api/batch-generate
 * Start batch card generation
 */
router.post('/batch-generate', async (req, res) => {
    try {
        const { fileId, config } = req.body;
        
        // Validate required fields
        if (!fileId) {
            return res.status(400).json({
                success: false,
                error: 'File ID is required',
                code: 'MISSING_FILE_ID'
            });
        }
        
        // Get file info
        const fileInfo = await fileService.getFileInfo(fileId);
        if (!fileInfo) {
            return res.status(404).json({
                success: false,
                error: 'File not found or expired',
                code: 'FILE_NOT_FOUND'
            });
        }
        
        // Validate configuration
        const batchConfig = {
            outputFormat: config?.outputFormat || 'png',
            resolution: parseInt(config?.resolution) || 300,
            includeInvalid: config?.includeInvalid || false,
            includeBackside: config?.includeBackside || false,
            concurrency: Math.min(parseInt(config?.concurrency) || 3, 5)
        };
        
        // Validate output format
        const validFormats = ['png', 'jpg', 'pdf'];
        if (!validFormats.includes(batchConfig.outputFormat)) {
            return res.status(400).json({
                success: false,
                error: `Invalid output format. Must be one of: ${validFormats.join(', ')}`,
                code: 'INVALID_FORMAT'
            });
        }
        
        // Validate resolution
        if (batchConfig.resolution < 150 || batchConfig.resolution > 600) {
            return res.status(400).json({
                success: false,
                error: 'Resolution must be between 150 and 600 DPI',
                code: 'INVALID_RESOLUTION'
            });
        }
        
        // Check if file has valid personnel data
        if (!fileInfo.personnelData || fileInfo.personnelData.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid personnel data found in file',
                code: 'NO_PERSONNEL_DATA'
            });
        }
        
        // Start batch processing
        const batchJob = await batchService.startBatchGeneration(fileInfo, batchConfig);
        
        res.json({
            success: true,
            batchId: batchJob.batchId,
            estimatedTime: batchJob.estimatedTime,
            totalCards: batchJob.totalCards,
            config: batchConfig,
            startedAt: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error starting batch generation:', error);
        
        // Handle specific error types
        if (error.message.includes('Batch size')) {
            return res.status(400).json({
                success: false,
                error: error.message,
                code: 'BATCH_SIZE_EXCEEDED'
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Internal server error during batch generation',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * GET /api/batch-status/:batchId
 * Get batch processing status
 */
router.get('/batch-status/:batchId', async (req, res) => {
    try {
        const { batchId } = req.params;
        const { includeErrors = 'false' } = req.query;
        
        if (!batchId || typeof batchId !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Valid batch ID is required',
                code: 'INVALID_BATCH_ID'
            });
        }
        
        const status = await batchService.getBatchStatus(batchId);
        
        if (!status) {
            return res.status(404).json({
                success: false,
                error: 'Batch job not found',
                code: 'BATCH_NOT_FOUND'
            });
        }
        
        const response = {
            success: true,
            batchId: status.batchId,
            status: status.status,
            progress: status.getProgress(),
            processedCards: status.processedCards,
            totalCards: status.totalCards,
            failedCards: status.failedCards,
            estimatedTimeRemaining: status.estimatedTimeRemaining,
            lastUpdated: new Date().toISOString()
        };
        
        // Include errors if requested
        if (includeErrors === 'true') {
            response.errors = status.errors.slice(-20); // Last 20 errors
            response.errorSummary = {
                totalErrors: status.errors.length,
                recentErrors: status.errors.slice(-5).length
            };
        } else {
            response.hasErrors = status.errors.length > 0;
            response.errorCount = status.errors.length;
        }
        
        // Add completion info if finished
        if (status.status === 'completed' || status.status === 'failed') {
            response.completedAt = status.endTime?.toISOString();
            response.duration = status.endTime && status.startTime ? 
                status.endTime - status.startTime : null;
        }
        
        res.json(response);
        
    } catch (error) {
        console.error('Error fetching batch status:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * GET /api/download-batch/:batchId
 * Download batch results as ZIP archive
 */
router.get('/download-batch/:batchId', async (req, res) => {
    try {
        const { batchId } = req.params;
        
        if (!batchId || typeof batchId !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Valid batch ID is required',
                code: 'INVALID_BATCH_ID'
            });
        }
        
        const batchResult = await batchService.getBatchResult(batchId);
        
        if (!batchResult) {
            return res.status(404).json({
                success: false,
                error: 'Batch result not found or expired',
                code: 'BATCH_NOT_FOUND'
            });
        }
        
        if (batchResult.status !== 'completed') {
            return res.status(400).json({
                success: false,
                error: `Batch processing not completed yet. Current status: ${batchResult.status}`,
                code: 'BATCH_NOT_READY',
                currentStatus: batchResult.status
            });
        }
        
        // Check if archive file exists
        const archivePath = batchResult.archivePath;
        const fs = require('fs');
        
        if (!fs.existsSync(archivePath)) {
            console.error(`Archive file not found: ${archivePath}`);
            return res.status(404).json({
                success: false,
                error: 'Archive file not found',
                code: 'ARCHIVE_NOT_FOUND'
            });
        }
        
        // Get file stats for headers
        const stats = fs.statSync(archivePath);
        const filename = `scp-cards-batch-${batchId}.zip`;
        
        // Set appropriate headers
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', stats.size);
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('X-Batch-ID', batchId);
        res.setHeader('X-Generated-Cards', batchResult.totalGenerated || 0);
        res.setHeader('X-Archive-Size', stats.size);
        
        // Stream the ZIP file
        const fileStream = fs.createReadStream(archivePath);
        
        fileStream.on('open', () => {
            console.log(`Starting download of batch ${batchId} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
        });
        
        fileStream.on('error', (error) => {
            console.error('Error streaming file:', error);
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    error: 'Error streaming archive file',
                    code: 'STREAM_ERROR'
                });
            }
        });
        
        fileStream.on('end', () => {
            console.log(`Download completed for batch ${batchId}`);
        });
        
        // Pipe the file to response
        fileStream.pipe(res);
        
    } catch (error) {
        console.error('Error downloading batch:', error);
        
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: 'Internal server error during download',
                code: 'INTERNAL_ERROR'
            });
        }
    }
});

/**
 * POST /api/preview-batch
 * Generate preview of batch data
 */
router.post('/preview-batch', async (req, res) => {
    try {
        const { fileId, sampleSize = 5 } = req.body;
        
        if (!fileId) {
            return res.status(400).json({
                success: false,
                error: 'File ID is required'
            });
        }
        
        const fileInfo = await fileService.getFileInfo(fileId);
        if (!fileInfo) {
            return res.status(404).json({
                success: false,
                error: 'File not found or expired'
            });
        }
        
        // Generate preview cards for sample data
        const sampleData = fileInfo.personnelData.slice(0, sampleSize);
        const previews = await Promise.all(
            sampleData.map(async (person, index) => {
                try {
                    // Generate a small preview image
                    const preview = await batchService.generatePreviewCard(person);
                    return {
                        index,
                        employeeId: person.employeeId,
                        fullName: person.fullName,
                        preview: preview.dataUrl,
                        success: true
                    };
                } catch (error) {
                    return {
                        index,
                        employeeId: person.employeeId,
                        fullName: person.fullName,
                        error: error.message,
                        success: false
                    };
                }
            })
        );
        
        res.json({
            success: true,
            previews,
            totalRecords: fileInfo.personnelData.length
        });
        
    } catch (error) {
        console.error('Error generating batch preview:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * DELETE /api/batch/:batchId
 * Cancel or delete a batch job
 */
router.delete('/batch/:batchId', async (req, res) => {
    try {
        const { batchId } = req.params;
        
        if (!batchId || typeof batchId !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Valid batch ID is required',
                code: 'INVALID_BATCH_ID'
            });
        }
        
        const result = await batchService.cancelBatch(batchId);
        
        if (!result) {
            return res.status(404).json({
                success: false,
                error: 'Batch job not found',
                code: 'BATCH_NOT_FOUND'
            });
        }
        
        res.json({
            success: true,
            message: `Batch job ${batchId} cancelled successfully`,
            batchId,
            cancelledAt: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error cancelling batch:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * POST /api/batch/:batchId/pause
 * Pause a running batch job
 */
router.post('/batch/:batchId/pause', async (req, res) => {
    try {
        const { batchId } = req.params;
        
        if (!batchId || typeof batchId !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Valid batch ID is required',
                code: 'INVALID_BATCH_ID'
            });
        }
        
        const result = await batchService.pauseBatch(batchId);
        
        if (!result) {
            return res.status(400).json({
                success: false,
                error: 'Batch job cannot be paused (not found or not in processing state)',
                code: 'CANNOT_PAUSE'
            });
        }
        
        res.json({
            success: true,
            message: `Batch job ${batchId} paused successfully`,
            batchId,
            pausedAt: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error pausing batch:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * POST /api/batch/:batchId/resume
 * Resume a paused batch job
 */
router.post('/batch/:batchId/resume', async (req, res) => {
    try {
        const { batchId } = req.params;
        
        if (!batchId || typeof batchId !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Valid batch ID is required',
                code: 'INVALID_BATCH_ID'
            });
        }
        
        const result = await batchService.resumeBatch(batchId);
        
        if (!result) {
            return res.status(400).json({
                success: false,
                error: 'Batch job cannot be resumed (not found or not in paused state)',
                code: 'CANNOT_RESUME'
            });
        }
        
        res.json({
            success: true,
            message: `Batch job ${batchId} resumed successfully`,
            batchId,
            resumedAt: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error resuming batch:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * GET /api/batches
 * Get list of all batch jobs (admin endpoint)
 */
router.get('/batches', async (req, res) => {
    try {
        const { 
            status, 
            limit = 50, 
            offset = 0,
            sortBy = 'startTime',
            sortOrder = 'desc'
        } = req.query;
        
        const parsedLimit = Math.min(parseInt(limit) || 50, 100); // Max 100 results
        const parsedOffset = Math.max(parseInt(offset) || 0, 0);
        
        const batches = await batchService.getAllBatches({
            status,
            limit: parsedLimit,
            offset: parsedOffset,
            sortBy,
            sortOrder
        });
        
        const batchSummaries = batches.map(batch => ({
            batchId: batch.batchId,
            status: batch.status,
            totalCards: batch.totalCards,
            processedCards: batch.processedCards,
            failedCards: batch.failedCards,
            startTime: batch.startTime?.toISOString(),
            endTime: batch.endTime?.toISOString(),
            progress: batch.getProgress(),
            duration: batch.endTime && batch.startTime ? 
                batch.endTime - batch.startTime : null,
            config: {
                outputFormat: batch.config?.outputFormat,
                resolution: batch.config?.resolution,
                includeBackside: batch.config?.includeBackside
            }
        }));
        
        res.json({
            success: true,
            batches: batchSummaries,
            pagination: {
                total: batches.length,
                limit: parsedLimit,
                offset: parsedOffset,
                hasMore: batches.length === parsedLimit
            },
            filters: {
                status,
                sortBy,
                sortOrder
            }
        });
        
    } catch (error) {
        console.error('Error fetching batches:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * GET /api/batch-stats
 * Get batch processing statistics
 */
router.get('/batch-stats', async (req, res) => {
    try {
        const { timeframe = '24h' } = req.query;
        
        // Calculate timeframe
        let startTime;
        const now = new Date();
        
        switch (timeframe) {
            case '1h':
                startTime = new Date(now.getTime() - 60 * 60 * 1000);
                break;
            case '24h':
                startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case '7d':
                startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            default:
                startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        }
        
        const allBatches = await batchService.getAllBatches({ limit: 1000 });
        const recentBatches = allBatches.filter(batch => 
            batch.startTime && batch.startTime >= startTime
        );
        
        const stats = {
            timeframe,
            period: {
                start: startTime.toISOString(),
                end: now.toISOString()
            },
            totals: {
                batches: recentBatches.length,
                cardsGenerated: recentBatches.reduce((sum, batch) => sum + batch.processedCards, 0),
                cardsFailed: recentBatches.reduce((sum, batch) => sum + batch.failedCards, 0),
                totalRequested: recentBatches.reduce((sum, batch) => sum + batch.totalCards, 0)
            },
            statusDistribution: {
                pending: recentBatches.filter(b => b.status === 'pending').length,
                processing: recentBatches.filter(b => b.status === 'processing').length,
                completed: recentBatches.filter(b => b.status === 'completed').length,
                failed: recentBatches.filter(b => b.status === 'failed').length,
                cancelled: recentBatches.filter(b => b.status === 'cancelled').length
            },
            averages: {
                cardsPerBatch: recentBatches.length > 0 ? 
                    Math.round(recentBatches.reduce((sum, batch) => sum + batch.totalCards, 0) / recentBatches.length) : 0,
                successRate: recentBatches.length > 0 ? 
                    ((recentBatches.filter(b => b.status === 'completed').length / recentBatches.length) * 100).toFixed(2) + '%' : '0%'
            }
        };
        
        res.json({
            success: true,
            stats,
            generatedAt: now.toISOString()
        });
        
    } catch (error) {
        console.error('Error fetching batch stats:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
});

module.exports = router;