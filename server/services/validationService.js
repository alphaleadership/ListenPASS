/**
 * Validation Service - Validates personnel data and card information
 */

const siteService = require('./siteService');

class ValidationService {
    constructor() {
        this.requiredFields = {
            common: ['fullName', 'employeeId', 'siteDesignation', 'department', 'clearanceLevel'],
            researcher: ['position'],
            security: ['position'],
            dclass: ['expirationDate'],
            o5: ['councilNumber']
        };
        
        this.patterns = {
            employeeId: /^SCP-\d{4}-\d{3}$/,
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            phone: /^\+?[\d\s\-\(\)]{10,}$/
        };
    }
    
    async validatePersonnelData(data) {
        const errors = [];
        const warnings = [];
        const suggestions = {};
        
        try {
            // Basic field validation
            this.validateRequiredFields(data, errors);
            this.validateFieldFormats(data, errors);
            
            // Site and department validation
            await this.validateSiteAssignment(data, errors, warnings, suggestions);
            
            // Card type specific validation
            this.validateCardTypeSpecific(data, errors, warnings);
            
            // Date validation
            this.validateDates(data, errors, warnings);
            
            return {
                isValid: errors.length === 0,
                errors,
                warnings,
                suggestions
            };
            
        } catch (error) {
            console.error('Validation error:', error);
            return {
                isValid: false,
                errors: ['Internal validation error'],
                warnings: [],
                suggestions: {}
            };
        }
    }
    
    validateRequiredFields(data, errors) {
        const cardType = data.cardType || 'researcher';
        const requiredFields = [
            ...this.requiredFields.common,
            ...(this.requiredFields[cardType] || [])
        ];
        
        requiredFields.forEach(field => {
            if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
                errors.push(`Field '${field}' is required`);
            }
        });
    }
    
    validateFieldFormats(data, errors) {
        // Employee ID format
        if (data.employeeId && !this.patterns.employeeId.test(data.employeeId)) {
            errors.push('Employee ID must follow format: SCP-XXXX-XXX (e.g., SCP-0001-001)');
        }
        
        // Name validation
        if (data.fullName && data.fullName.length > 50) {
            errors.push('Full name must be 50 characters or less');
        }
        
        // Clearance level validation
        if (data.clearanceLevel !== undefined) {
            const level = parseInt(data.clearanceLevel);
            if (isNaN(level) || level < 0 || level > 5) {
                errors.push('Clearance level must be between 0 and 5');
            }
        }
        
        // Email validation (if provided)
        if (data.email && !this.patterns.email.test(data.email)) {
            errors.push('Invalid email format');
        }
        
        // Phone validation (if provided)
        if (data.phone && !this.patterns.phone.test(data.phone)) {
            errors.push('Invalid phone number format');
        }
    }
    
    async validateSiteAssignment(data, errors, warnings, suggestions) {
        if (!data.siteDesignation) return;
        
        // Check if site exists
        const site = await siteService.getSite(data.siteDesignation);
        if (!site) {
            errors.push(`Site '${data.siteDesignation}' does not exist`);
            
            // Suggest similar sites
            const allSites = await siteService.getAllSites();
            const similarSites = allSites
                .filter(s => s.siteId.toLowerCase().includes(data.siteDesignation.toLowerCase()))
                .map(s => s.siteId);
            
            if (similarSites.length > 0) {
                suggestions.siteDesignation = similarSites[0];
            }
            return;
        }
        
        // Check clearance level for site
        if (data.clearanceLevel !== undefined) {
            const canAccess = await siteService.validateSiteAccess(data.siteDesignation, data.clearanceLevel);
            if (!canAccess) {
                errors.push(`Clearance level ${data.clearanceLevel} is not sufficient for ${data.siteDesignation} (max: ${site.maxClearanceLevel})`);
                suggestions.clearanceLevel = Math.min(data.clearanceLevel, site.maxClearanceLevel);
            }
        }
        
        // Check department
        if (data.department) {
            const departments = await siteService.getDepartments(data.siteDesignation);
            const department = departments?.find(d => 
                d.departmentId === data.department || 
                d.name.toLowerCase() === data.department.toLowerCase()
            );
            
            if (!department) {
                errors.push(`Department '${data.department}' is not available at ${data.siteDesignation}`);
                
                // Suggest available departments
                if (departments && departments.length > 0) {
                    suggestions.department = departments[0].departmentId;
                }
            } else {
                // Check clearance for department
                if (data.clearanceLevel !== undefined) {
                    const canAccessDept = await siteService.validateDepartmentAccess(
                        data.siteDesignation, 
                        department.departmentId, 
                        data.clearanceLevel
                    );
                    
                    if (!canAccessDept) {
                        errors.push(`Clearance level ${data.clearanceLevel} is insufficient for ${department.name} (requires: ${department.requiredClearance})`);
                        suggestions.clearanceLevel = Math.max(data.clearanceLevel, department.requiredClearance);
                    }
                }
            }
        }
    }
    
    validateCardTypeSpecific(data, errors, warnings) {
        const cardType = data.cardType || 'researcher';
        
        switch (cardType) {
            case 'dclass':
                // D-Class specific validation
                if (data.clearanceLevel && data.clearanceLevel > 0) {
                    warnings.push('D-Class personnel typically have clearance level 0');
                }
                
                if (!data.expirationDate) {
                    errors.push('D-Class personnel cards require an expiration date');
                } else {
                    const expDate = new Date(data.expirationDate);
                    const maxExpiration = new Date();
                    maxExpiration.setMonth(maxExpiration.getMonth() + 6); // 6 months max
                    
                    if (expDate > maxExpiration) {
                        warnings.push('D-Class cards typically expire within 6 months');
                    }
                }
                break;
                
            case 'o5':
                // O5 Council specific validation
                if (data.clearanceLevel && data.clearanceLevel < 5) {
                    errors.push('O5 Council members must have clearance level 5');
                }
                
                if (!data.councilNumber) {
                    errors.push('O5 Council cards require a council number');
                } else {
                    const councilNum = parseInt(data.councilNumber);
                    if (isNaN(councilNum) || councilNum < 1 || councilNum > 13) {
                        errors.push('O5 Council number must be between 1 and 13');
                    }
                }
                break;
                
            case 'researcher':
            case 'security':
                // Standard personnel validation
                if (data.clearanceLevel && data.clearanceLevel < 1) {
                    warnings.push(`${cardType} personnel typically have clearance level 1 or higher`);
                }
                break;
        }
    }
    
    validateDates(data, errors, warnings) {
        const now = new Date();
        
        // Issue date validation
        if (data.issueDate) {
            const issueDate = new Date(data.issueDate);
            if (isNaN(issueDate.getTime())) {
                errors.push('Invalid issue date format');
            } else if (issueDate > now) {
                errors.push('Issue date cannot be in the future');
            }
        }
        
        // Expiration date validation
        if (data.expirationDate) {
            const expDate = new Date(data.expirationDate);
            if (isNaN(expDate.getTime())) {
                errors.push('Invalid expiration date format');
            } else if (expDate <= now) {
                warnings.push('Card expiration date is in the past');
            }
        }
        
        // Date of birth validation
        if (data.dateOfBirth) {
            const birthDate = new Date(data.dateOfBirth);
            if (isNaN(birthDate.getTime())) {
                errors.push('Invalid date of birth format');
            } else {
                const age = (now - birthDate) / (1000 * 60 * 60 * 24 * 365.25);
                if (age < 18) {
                    warnings.push('Personnel appears to be under 18 years old');
                } else if (age > 80) {
                    warnings.push('Personnel appears to be over 80 years old');
                }
            }
        }
    }
    
    validateBatchData(personnelArray) {
        if (!Array.isArray(personnelArray)) {
            return {
                isValid: false,
                error: 'Data must be an array of personnel records'
            };
        }
        
        if (personnelArray.length === 0) {
            return {
                isValid: false,
                error: 'No personnel records found'
            };
        }
        
        if (personnelArray.length > 1000) {
            return {
                isValid: false,
                error: 'Batch size cannot exceed 1000 records'
            };
        }
        
        // Check for duplicate employee IDs
        const employeeIds = new Set();
        const duplicates = [];
        
        personnelArray.forEach((person, index) => {
            if (person.employeeId) {
                if (employeeIds.has(person.employeeId)) {
                    duplicates.push(`Duplicate employee ID "${person.employeeId}" at record ${index + 1}`);
                } else {
                    employeeIds.add(person.employeeId);
                }
            }
        });
        
        if (duplicates.length > 0) {
            return {
                isValid: false,
                error: 'Duplicate employee IDs found',
                details: duplicates
            };
        }
        
        // Check for minimum required fields across all records
        const missingRequiredFields = [];
        personnelArray.forEach((person, index) => {
            if (!person.fullName) {
                missingRequiredFields.push(`Record ${index + 1}: Missing full name`);
            }
            if (!person.employeeId) {
                missingRequiredFields.push(`Record ${index + 1}: Missing employee ID`);
            }
        });
        
        if (missingRequiredFields.length > personnelArray.length * 0.5) {
            return {
                isValid: false,
                error: 'Too many records missing required fields',
                details: missingRequiredFields.slice(0, 10) // Show first 10 errors
            };
        }
        
        return { 
            isValid: true,
            warnings: missingRequiredFields.length > 0 ? missingRequiredFields : undefined
        };
    }
    
    async validateBatchPersonnelData(personnelArray) {
        const batchValidation = this.validateBatchData(personnelArray);
        if (!batchValidation.isValid) {
            return batchValidation;
        }
        
        const results = [];
        const summary = {
            total: personnelArray.length,
            valid: 0,
            invalid: 0,
            warnings: 0
        };
        
        for (let i = 0; i < personnelArray.length; i++) {
            const person = personnelArray[i];
            const validation = await this.validatePersonnelData(person);
            
            results.push({
                index: i,
                employeeId: person.employeeId,
                fullName: person.fullName,
                isValid: validation.isValid,
                errors: validation.errors,
                warnings: validation.warnings,
                suggestions: validation.suggestions
            });
            
            if (validation.isValid) {
                summary.valid++;
            } else {
                summary.invalid++;
            }
            
            if (validation.warnings && validation.warnings.length > 0) {
                summary.warnings++;
            }
        }
        
        return {
            isValid: true,
            summary,
            results,
            batchWarnings: batchValidation.warnings
        };
    }
}

// Create singleton instance
const validationService = new ValidationService();

module.exports = {
    validatePersonnelData: (data) => validationService.validatePersonnelData(data),
    validateBatchData: (data) => validationService.validateBatchData(data)
};