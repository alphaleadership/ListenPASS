/**
 * Main API Routes - Core endpoints for card generation and validation
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Import services
const cardService = require('../services/cardService');
const validationService = require('../services/validationService');
const fileService = require('../services/fileService');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
        files: 1
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'text/csv',
            'application/json',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        
        const allowedExtensions = ['.csv', '.json', '.xls', '.xlsx'];
        const fileExtension = path.extname(file.originalname).toLowerCase();
        
        if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only CSV, JSON, and Excel files are allowed.'));
        }
    }
});

/**
 * POST /api/generate-card
 * Generate a single card on the server
 */
router.post('/generate-card', async (req, res) => {
    try {
        const { cardData, outputFormat = 'png', resolution = 300, includeBackside = false } = req.body;
        
        if (!cardData) {
            return res.status(400).json({
                success: false,
                error: 'Card data is required'
            });
        }
        
        // Validate card data
        const validation = await validationService.validatePersonnelData(cardData);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                error: 'Invalid card data',
                validationErrors: validation.errors
            });
        }
        
        // Generate card
        const result = await cardService.generateSingleCard(cardData, {
            outputFormat,
            resolution,
            includeBackside
        });
        
        res.json({
            success: true,
            cardUrl: result.url,
            cardId: result.id,
            expiresAt: result.expiresAt,
            metadata: result.metadata
        });
        
    } catch (error) {
        console.error('Error generating card:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during card generation'
        });
    }
});

/**
 * POST /api/validate-personnel
 * Enhanced personnel data validation with detailed error reporting
 */
router.post('/validate-personnel', async (req, res) => {
    try {
        const { personnelData, cardType = 'researcher', options = {} } = req.body;
        
        if (!personnelData) {
            return res.status(400).json({
                success: false,
                error: 'Personnel data is required'
            });
        }
        
        // Import the enhanced validator
        const PersonnelValidator = require('../services/personnelValidator');
        const validator = new PersonnelValidator();
        
        let validationResults;
        
        if (Array.isArray(personnelData)) {
            // Enhanced batch validation
            const batchResult = await validator.validatePersonnelBatch(personnelData, {
                defaultCardType: cardType,
                ...options
            });
            
            validationResults = {
                isBatch: true,
                isValid: batchResult.isValid,
                summary: batchResult.summary,
                results: batchResult.results.map(result => ({
                    index: result.recordIndex,
                    isValid: result.isValid,
                    errors: result.errors.map(error => error.toJSON()),
                    warnings: result.warnings.map(warning => warning.toJSON()),
                    sanitizedData: result.sanitizedData,
                    cardType: result.cardType
                })),
                processingTime: batchResult.summary.processingTime
            };
        } else {
            // Enhanced single validation
            const validation = await validator.validatePersonnelRecord(personnelData, cardType, options);
            
            validationResults = {
                isBatch: false,
                isValid: validation.isValid,
                errors: validation.errors.map(error => error.toJSON()),
                warnings: validation.warnings.map(warning => warning.toJSON()),
                sanitizedData: validation.sanitizedData,
                cardType: validation.cardType,
                validationTimestamp: validation.validationTimestamp
            };
        }
        
        res.json({
            success: true,
            validation: validationResults
        });
        
    } catch (error) {
        console.error('Error validating personnel data:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during validation'
        });
    }
});

/**
 * POST /api/upload-data
 * Upload and parse data file (CSV, JSON, Excel)
 */
router.post('/upload-data', upload.single('dataFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }
        
        // Parse the uploaded file
        const parseResult = await fileService.parseDataFile(req.file.path, req.file.mimetype);
        
        if (!parseResult.success) {
            return res.status(400).json({
                success: false,
                error: parseResult.error
            });
        }
        
        const personnelData = parseResult.data;
        
        // Validate the parsed data
        const validationResults = await Promise.all(
            personnelData.map(async (person, index) => {
                const validation = await validationService.validatePersonnelData(person);
                return {
                    index,
                    isValid: validation.isValid,
                    errors: validation.errors,
                    warnings: validation.warnings || []
                };
            })
        );
        
        // Calculate statistics
        const validRecords = validationResults.filter(r => r.isValid).length;
        const invalidRecords = validationResults.length - validRecords;
        
        // Site distribution
        const siteDistribution = {};
        personnelData.forEach(person => {
            const site = person.siteDesignation || 'Unknown';
            siteDistribution[site] = (siteDistribution[site] || 0) + 1;
        });
        
        // Store file info for later batch processing
        const fileId = await fileService.storeFileInfo({
            originalName: req.file.originalname,
            filePath: req.file.path,
            mimeType: req.file.mimetype,
            size: req.file.size,
            personnelData,
            validationResults
        });
        
        res.json({
            success: true,
            fileId,
            preview: personnelData.slice(0, 5), // First 5 records for preview
            totalRecords: personnelData.length,
            validRecords,
            invalidRecords,
            siteDistribution,
            errors: validationResults.filter(r => !r.isValid).flatMap(r => r.errors)
        });
        
    } catch (error) {
        console.error('Error uploading data file:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during file upload'
        });
    }
});

/**
 * GET /api/personnel/:employeeId
 * Get personnel information by employee ID
 */
router.get('/personnel/:employeeId', async (req, res) => {
    try {
        const { employeeId } = req.params;
        
        // This would typically query a database
        // For now, return a mock response
        res.json({
            success: true,
            personnel: {
                employeeId,
                exists: false,
                message: 'Personnel database integration not yet implemented'
            }
        });
        
    } catch (error) {
        console.error('Error fetching personnel:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/status
 * Get server status and statistics
 */
router.get('/status', (req, res) => {
    res.json({
        success: true,
        status: 'operational',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: require('../../package.json').version
    });
});

/**
 * GET /api/download-card/:cardId
 * Download a generated card file
 */
router.get('/download-card/:cardId', async (req, res) => {
    try {
        const { cardId } = req.params;
        const outputDir = path.join(__dirname, '../output');
        
        // Try different formats
        const formats = ['png', 'jpg', 'pdf'];
        let filePath = null;
        let format = null;
        
        for (const fmt of formats) {
            const testPath = path.join(outputDir, `card-${cardId}.${fmt}`);
            try {
                await require('fs').promises.access(testPath);
                filePath = testPath;
                format = fmt;
                break;
            } catch (error) {
                // File doesn't exist, try next format
            }
        }
        
        if (!filePath) {
            return res.status(404).json({
                success: false,
                error: 'Card file not found or expired'
            });
        }
        
        // Set appropriate headers
        const mimeTypes = {
            png: 'image/png',
            jpg: 'image/jpeg',
            pdf: 'application/pdf'
        };
        
        res.setHeader('Content-Type', mimeTypes[format]);
        res.setHeader('Content-Disposition', `attachment; filename="scp-card-${cardId}.${format}"`);
        
        // Stream the file
        const fileStream = require('fs').createReadStream(filePath);
        fileStream.pipe(res);
        
        // Clean up file after download (optional)
        fileStream.on('end', () => {
            setTimeout(async () => {
                try {
                    await require('fs').promises.unlink(filePath);
                } catch (error) {
                    // File might already be deleted, ignore error
                }
            }, 5000); // Delete after 5 seconds
        });
        
    } catch (error) {
        console.error('Error downloading card:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during download'
        });
    }
});

/**
 * POST /api/validate-field
 * Validate a single field in real-time
 */
router.post('/validate-field', async (req, res) => {
    try {
        const { fieldName, fieldValue, allData = {}, cardType = 'researcher' } = req.body;
        
        if (!fieldName) {
            return res.status(400).json({
                success: false,
                error: 'Field name is required'
            });
        }
        
        const PersonnelValidator = require('../services/personnelValidator');
        const validator = new PersonnelValidator();
        
        const fieldErrors = await validator.validateField(fieldName, fieldValue, allData, cardType);
        
        res.json({
            success: true,
            fieldName,
            isValid: fieldErrors.length === 0,
            errors: fieldErrors.map(error => error.toJSON()),
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error validating field:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during field validation'
        });
    }
});

/**
 * POST /api/validate-file
 * Validate uploaded file before processing
 */
router.post('/validate-file', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }
        
        const { fileType = 'batchFile' } = req.body;
        
        // Import client-side validation logic for consistency
        const { ValidationError } = require('../models/ValidationError');
        
        const fileValidationRules = {
            photo: {
                allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
                maxSize: 5 * 1024 * 1024, // 5MB
            },
            batchFile: {
                allowedTypes: ['text/csv', 'application/json', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
                maxSize: 10 * 1024 * 1024, // 10MB
            }
        };
        
        const rule = fileValidationRules[fileType];
        const errors = [];
        
        if (rule) {
            // Check file type
            if (rule.allowedTypes && !rule.allowedTypes.includes(req.file.mimetype)) {
                errors.push(new ValidationError(
                    fileType,
                    `Invalid file type. Allowed types: ${rule.allowedTypes.join(', ')}`,
                    'INVALID_FILE_TYPE',
                    { allowedTypes: rule.allowedTypes, actualType: req.file.mimetype }
                ));
            }
            
            // Check file size
            if (rule.maxSize && req.file.size > rule.maxSize) {
                errors.push(new ValidationError(
                    fileType,
                    `File size too large. Maximum size: ${Math.round(rule.maxSize / 1024 / 1024)}MB`,
                    'FILE_TOO_LARGE',
                    { maxSize: rule.maxSize, actualSize: req.file.size }
                ));
            }
        }
        
        // Clean up uploaded file if validation failed
        if (errors.length > 0) {
            const fs = require('fs').promises;
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                console.warn('Failed to clean up invalid file:', unlinkError);
            }
        }
        
        res.json({
            success: errors.length === 0,
            isValid: errors.length === 0,
            errors: errors.map(error => error.toJSON()),
            fileInfo: errors.length === 0 ? {
                originalName: req.file.originalname,
                size: req.file.size,
                mimeType: req.file.mimetype,
                uploadPath: req.file.path
            } : null
        });
        
    } catch (error) {
        console.error('Error validating file:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during file validation'
        });
    }
});

/**
 * GET /api/validation-rules
 * Get validation rules for client-side validation
 */
router.get('/validation-rules', (req, res) => {
    try {
        const { cardType = 'researcher' } = req.query;
        
        const PersonnelValidator = require('../services/personnelValidator');
        const validator = new PersonnelValidator();
        
        const cardTypeConfig = validator.getCardTypeConfig(cardType);
        const validationRules = validator.validationRules;
        const fileValidationRules = validator.fileValidationRules;
        
        res.json({
            success: true,
            cardType,
            cardTypeConfig,
            validationRules: Object.keys(validationRules).reduce((acc, field) => {
                const rule = validationRules[field];
                acc[field] = {
                    required: rule.required,
                    type: rule.type,
                    minLength: rule.minLength,
                    maxLength: rule.maxLength,
                    min: rule.min,
                    max: rule.max,
                    pattern: rule.pattern ? rule.pattern.toString() : null,
                    allowedValues: rule.allowedValues
                };
                return acc;
            }, {}),
            fileValidationRules
        });
        
    } catch (error) {
        console.error('Error getting validation rules:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error getting validation rules'
        });
    }
});

module.exports = router;