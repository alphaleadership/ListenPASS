/**
 * File Service - Handles file uploads, parsing, and temporary storage
 */

const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parser');
const XLSX = require('xlsx');
const { v4: uuidv4 } = require('uuid');

class FileService {
    constructor() {
        this.uploadDir = path.join(__dirname, '../uploads');
        this.tempDir = path.join(__dirname, '../temp');
        this.fileInfoStore = new Map(); // In production, use Redis or database
        this.cleanupInterval = 60 * 60 * 1000; // 1 hour
        
        // Start cleanup timer
        setInterval(() => this.cleanupExpiredFiles(), this.cleanupInterval);
    }
    
    async parseDataFile(filePath, mimeType) {
        try {
            const extension = path.extname(filePath).toLowerCase();
            
            switch (extension) {
                case '.csv':
                    return await this.parseCSV(filePath);
                case '.json':
                    return await this.parseJSON(filePath);
                case '.xlsx':
                case '.xls':
                    return await this.parseExcel(filePath);
                default:
                    return {
                        success: false,
                        error: `Unsupported file type: ${extension}`
                    };
            }
        } catch (error) {
            console.error('Error parsing file:', error);
            return {
                success: false,
                error: `Failed to parse file: ${error.message}`
            };
        }
    }
    
    async parseCSV(filePath) {
        return new Promise((resolve) => {
            const results = [];
            const errors = [];
            let rowCount = 0;
            
            const stream = require('fs').createReadStream(filePath);
            
            stream
                .pipe(csv({
                    mapHeaders: ({ header }) => this.normalizeHeader(header),
                    skipEmptyLines: true,
                    skipLinesWithError: false
                }))
                .on('data', (data) => {
                    rowCount++;
                    try {
                        // Skip rows that are completely empty
                        const hasData = Object.values(data).some(value => 
                            value !== null && value !== undefined && value.toString().trim() !== ''
                        );
                        
                        if (!hasData) {
                            return;
                        }
                        
                        const normalized = this.normalizePersonnelData(data);
                        if (normalized) {
                            results.push(normalized);
                        }
                    } catch (error) {
                        errors.push(`Row ${rowCount + 1}: ${error.message}`);
                    }
                })
                .on('end', () => {
                    resolve({
                        success: true,
                        data: results,
                        warnings: errors.length > 0 ? errors : undefined
                    });
                })
                .on('error', (error) => {
                    resolve({
                        success: false,
                        error: `CSV parsing error: ${error.message}`
                    });
                });
        });
    }
    
    async parseJSON(filePath) {
        try {
            const fileContent = await fs.readFile(filePath, 'utf8');
            
            // Validate JSON syntax
            let jsonData;
            try {
                jsonData = JSON.parse(fileContent);
            } catch (parseError) {
                return {
                    success: false,
                    error: `Invalid JSON format: ${parseError.message}`
                };
            }
            
            let personnelArray;
            const errors = [];
            
            // Handle different JSON structures
            if (Array.isArray(jsonData)) {
                personnelArray = jsonData;
            } else if (jsonData.personnel && Array.isArray(jsonData.personnel)) {
                personnelArray = jsonData.personnel;
            } else if (jsonData.data && Array.isArray(jsonData.data)) {
                personnelArray = jsonData.data;
            } else if (jsonData.records && Array.isArray(jsonData.records)) {
                personnelArray = jsonData.records;
            } else if (jsonData.employees && Array.isArray(jsonData.employees)) {
                personnelArray = jsonData.employees;
            } else {
                return {
                    success: false,
                    error: 'JSON must contain an array of personnel records under one of these keys: root array, "personnel", "data", "records", or "employees"'
                };
            }
            
            if (personnelArray.length === 0) {
                return {
                    success: false,
                    error: 'JSON file contains no personnel records'
                };
            }
            
            const normalizedData = [];
            
            personnelArray.forEach((person, index) => {
                try {
                    const normalized = this.normalizePersonnelData(person);
                    if (normalized) {
                        normalizedData.push(normalized);
                    }
                } catch (error) {
                    errors.push(`Record ${index + 1}: ${error.message}`);
                }
            });
            
            return {
                success: true,
                data: normalizedData,
                warnings: errors.length > 0 ? errors : undefined
            };
            
        } catch (error) {
            return {
                success: false,
                error: `JSON parsing error: ${error.message}`
            };
        }
    }
    
    async parseExcel(filePath) {
        try {
            const workbook = XLSX.readFile(filePath);
            
            // Check if workbook has sheets
            if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                return {
                    success: false,
                    error: 'Excel file contains no worksheets'
                };
            }
            
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // Convert to JSON with better options
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                header: 1,
                defval: '',
                blankrows: false, // Skip blank rows
                raw: false // Convert dates and numbers to strings
            });
            
            if (jsonData.length < 2) {
                return {
                    success: false,
                    error: 'Excel file must contain at least a header row and one data row'
                };
            }
            
            // First row is headers
            const rawHeaders = jsonData[0];
            const headers = rawHeaders.map(header => this.normalizeHeader(header));
            const dataRows = jsonData.slice(1);
            
            const results = [];
            const errors = [];
            
            dataRows.forEach((row, rowIndex) => {
                try {
                    // Skip completely empty rows
                    if (row.every(cell => !cell || cell.toString().trim() === '')) {
                        return;
                    }
                    
                    const rowData = {};
                    headers.forEach((header, index) => {
                        if (header && row[index] !== undefined && row[index] !== '') {
                            // Handle Excel date conversion
                            let value = row[index];
                            if (typeof value === 'number' && header.includes('Date')) {
                                // Convert Excel date number to date string
                                const excelDate = XLSX.SSF.parse_date_code(value);
                                if (excelDate) {
                                    value = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`;
                                }
                            }
                            rowData[header] = value;
                        }
                    });
                    
                    const normalized = this.normalizePersonnelData(rowData);
                    if (normalized) {
                        results.push(normalized);
                    }
                } catch (error) {
                    errors.push(`Row ${rowIndex + 2}: ${error.message}`);
                }
            });
            
            return {
                success: true,
                data: results,
                warnings: errors.length > 0 ? errors : undefined
            };
            
        } catch (error) {
            return {
                success: false,
                error: `Excel parsing error: ${error.message}`
            };
        }
    }
    
    normalizeHeader(header) {
        if (!header || typeof header !== 'string') return null;
        
        const headerMap = {
            'full name': 'fullName',
            'name': 'fullName',
            'employee id': 'employeeId',
            'id': 'employeeId',
            'employee_id': 'employeeId',
            'card type': 'cardType',
            'type': 'cardType',
            'card_type': 'cardType',
            'clearance level': 'clearanceLevel',
            'clearance': 'clearanceLevel',
            'clearance_level': 'clearanceLevel',
            'site designation': 'siteDesignation',
            'site': 'siteDesignation',
            'site_designation': 'siteDesignation',
            'department': 'department',
            'dept': 'department',
            'position': 'position',
            'title': 'position',
            'date of birth': 'dateOfBirth',
            'dob': 'dateOfBirth',
            'date_of_birth': 'dateOfBirth',
            'issue date': 'issueDate',
            'issued': 'issueDate',
            'issue_date': 'issueDate',
            'expiration date': 'expirationDate',
            'expires': 'expirationDate',
            'expiration_date': 'expirationDate',
            'photo': 'photoUrl',
            'photo url': 'photoUrl',
            'photo_url': 'photoUrl',
            'emergency contact': 'emergencyContact',
            'emergency_contact': 'emergencyContact',
            'council number': 'councilNumber',
            'council_number': 'councilNumber',
            'special designations': 'specialDesignations',
            'special_designations': 'specialDesignations'
        };
        
        const normalized = header.toLowerCase().trim();
        return headerMap[normalized] || header.replace(/\s+/g, '').replace(/_/g, '');
    }
    
    normalizePersonnelData(data) {
        if (!data || typeof data !== 'object') return null;
        
        // Skip empty rows
        const hasData = Object.values(data).some(value => 
            value !== null && value !== undefined && value !== ''
        );
        
        if (!hasData) return null;
        
        const normalized = {
            fullName: this.cleanString(data.fullName || data.name || data.firstName + ' ' + data.lastName),
            employeeId: this.cleanString(data.employeeId || data.id || data.employee_id || data.empId),
            cardType: this.normalizeCardType(data.cardType || data.type || data.card_type || 'researcher'),
            clearanceLevel: this.parseNumber(data.clearanceLevel || data.clearance || data.clearance_level || data.level),
            siteDesignation: this.cleanString(data.siteDesignation || data.site || data.site_designation || data.location),
            department: this.cleanString(data.department || data.dept || data.division),
            position: this.cleanString(data.position || data.title || data.role || data.job_title),
            dateOfBirth: this.parseDate(data.dateOfBirth || data.dob || data.birth_date || data.birthDate),
            issueDate: this.parseDate(data.issueDate || data.issued || data.issue_date || data.dateIssued),
            expirationDate: this.parseDate(data.expirationDate || data.expires || data.expiration_date || data.expiry),
            photoUrl: this.cleanString(data.photoUrl || data.photo || data.photo_url || data.image),
            emergencyContact: this.cleanString(data.emergencyContact || data.emergency_contact || data.emergency),
            councilNumber: this.parseNumber(data.councilNumber || data.council_number || data.o5Number),
            specialDesignations: this.parseArray(data.specialDesignations || data.special_designations || data.designations),
            nationality: this.cleanString(data.nationality || data.country),
            bloodType: this.cleanString(data.bloodType || data.blood_type),
            accessZones: this.parseArray(data.accessZones || data.access_zones || data.zones),
            weaponsAuthorization: this.cleanString(data.weaponsAuthorization || data.weapons_auth),
            testingHistory: this.cleanString(data.testingHistory || data.testing_history),
            medicalNotes: this.cleanString(data.medicalNotes || data.medical_notes)
        };
        
        // Validate required fields
        if (!normalized.fullName || !normalized.employeeId) {
            return null;
        }
        
        // Remove undefined/null values
        Object.keys(normalized).forEach(key => {
            if (normalized[key] === undefined || normalized[key] === null || normalized[key] === '') {
                delete normalized[key];
            }
        });
        
        return normalized;
    }
    
    normalizeCardType(cardType) {
        if (!cardType) return 'researcher';
        
        const type = cardType.toLowerCase().trim();
        const typeMap = {
            'researcher': 'researcher',
            'research': 'researcher',
            'scientist': 'researcher',
            'dr': 'researcher',
            'security': 'security',
            'guard': 'security',
            'agent': 'security',
            'mtf': 'security',
            'dclass': 'dclass',
            'd-class': 'dclass',
            'dclass': 'dclass',
            'subject': 'dclass',
            'o5': 'o5',
            'o5-council': 'o5',
            'council': 'o5',
            'administrator': 'o5'
        };
        
        return typeMap[type] || 'researcher';
    }
    
    cleanString(value) {
        if (!value) return undefined;
        return String(value).trim() || undefined;
    }
    
    parseNumber(value) {
        if (value === undefined || value === null || value === '') return undefined;
        const num = parseInt(value);
        return isNaN(num) ? undefined : num;
    }
    
    parseDate(value) {
        if (!value) return undefined;
        
        const date = new Date(value);
        if (isNaN(date.getTime())) return undefined;
        
        return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
    }
    
    parseArray(value) {
        if (!value) return undefined;
        
        if (Array.isArray(value)) return value;
        
        if (typeof value === 'string') {
            // Split by common delimiters
            return value.split(/[,;|]/).map(item => item.trim()).filter(item => item);
        }
        
        return undefined;
    }
    
    async storeFileInfo(fileInfo) {
        const fileId = uuidv4();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        
        this.fileInfoStore.set(fileId, {
            ...fileInfo,
            fileId,
            uploadedAt: new Date(),
            expiresAt
        });
        
        return fileId;
    }
    
    async getFileInfo(fileId) {
        const fileInfo = this.fileInfoStore.get(fileId);
        
        if (!fileInfo) return null;
        
        // Check if expired
        if (new Date() > fileInfo.expiresAt) {
            this.fileInfoStore.delete(fileId);
            // Clean up file
            try {
                await fs.unlink(fileInfo.filePath);
            } catch (error) {
                console.error('Error cleaning up expired file:', error);
            }
            return null;
        }
        
        return fileInfo;
    }
    
    async cleanupExpiredFiles() {
        const now = new Date();
        const expiredFiles = [];
        
        for (const [fileId, fileInfo] of this.fileInfoStore.entries()) {
            if (now > fileInfo.expiresAt) {
                expiredFiles.push({ fileId, filePath: fileInfo.filePath });
            }
        }
        
        for (const { fileId, filePath } of expiredFiles) {
            this.fileInfoStore.delete(fileId);
            try {
                await fs.unlink(filePath);
                console.log(`Cleaned up expired file: ${filePath}`);
            } catch (error) {
                console.error(`Error cleaning up file ${filePath}:`, error);
            }
        }
        
        if (expiredFiles.length > 0) {
            console.log(`Cleaned up ${expiredFiles.length} expired files`);
        }
    }
    
    async deleteFile(fileId) {
        const fileInfo = this.fileInfoStore.get(fileId);
        if (!fileInfo) return false;
        
        this.fileInfoStore.delete(fileId);
        
        try {
            await fs.unlink(fileInfo.filePath);
            return true;
        } catch (error) {
            console.error('Error deleting file:', error);
            return false;
        }
    }
}

// Create singleton instance
const fileService = new FileService();

module.exports = {
    parseDataFile: (filePath, mimeType) => fileService.parseDataFile(filePath, mimeType),
    storeFileInfo: (fileInfo) => fileService.storeFileInfo(fileInfo),
    getFileInfo: (fileId) => fileService.getFileInfo(fileId),
    deleteFile: (fileId) => fileService.deleteFile(fileId)
};