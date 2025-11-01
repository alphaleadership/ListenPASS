/**
 * Site Service - Manages SCP sites and departments
 */

class SCPSite {
    constructor(data = {}) {
        this.siteId = data.siteId || '';
        this.siteName = data.siteName || '';
        this.location = data.location || { country: '', region: '', coordinates: { lat: 0, lng: 0 } };
        this.classification = data.classification || 'CLASSIFIED';
        this.departments = data.departments || [];
        this.maxClearanceLevel = data.maxClearanceLevel || 5;
        this.specializations = data.specializations || [];
        this.personnelCount = data.personnelCount || 0;
        this.isActive = data.isActive !== undefined ? data.isActive : true;
        this.type = data.type || 'site'; // 'site' ou 'mtf'
        this.specialization = data.specialization || ''; // Spécialisation pour les MTF
    }
    
    addDepartment(department) {
        this.departments.push(department);
    }
    
    getDepartment(departmentId) {
        return this.departments.find(dept => dept.departmentId === departmentId);
    }
    
    canAccommodateClearance(clearanceLevel) {
        return clearanceLevel <= this.maxClearanceLevel;
    }
    
    isMTF() {
        return this.type === 'mtf';
    }
    
    isSite() {
        return this.type === 'site';
    }
    
    getDisplayName() {
        if (this.isMTF()) {
            return `${this.siteName} - ${this.specialization}`;
        }
        return this.siteName;
    }
    
    validatePersonnelAssignment(clearanceLevel, departmentId) {
        // Vérifier le niveau de clearance global
        if (!this.canAccommodateClearance(clearanceLevel)) {
            return {
                isValid: false,
                error: `Clearance level ${clearanceLevel} exceeds site maximum of ${this.maxClearanceLevel}`
            };
        }
        
        // Vérifier le département si spécifié
        if (departmentId) {
            const department = this.getDepartment(departmentId);
            if (!department) {
                return {
                    isValid: false,
                    error: `Department ${departmentId} not found at ${this.siteId}`
                };
            }
            
            if (clearanceLevel < department.requiredClearance) {
                return {
                    isValid: false,
                    error: `Clearance level ${clearanceLevel} insufficient for ${department.name} (requires ${department.requiredClearance})`
                };
            }
        }
        
        return { isValid: true };
    }
}

class Department {
    constructor(data = {}) {
        this.departmentId = data.departmentId || '';
        this.name = data.name || '';
        this.siteId = data.siteId || '';
        this.headOfDepartment = data.headOfDepartment || '';
        this.requiredClearance = data.requiredClearance || 1;
        this.specialPermissions = data.specialPermissions || [];
        this.personnelList = data.personnelList || [];
    }
    
    canAcceptPersonnel(clearanceLevel) {
        return clearanceLevel >= this.requiredClearance;
    }
    
    addPersonnel(personnelId) {
        if (!this.personnelList.includes(personnelId)) {
            this.personnelList.push(personnelId);
        }
    }
    
    removePersonnel(personnelId) {
        const index = this.personnelList.indexOf(personnelId);
        if (index > -1) {
            this.personnelList.splice(index, 1);
        }
    }
}

class SiteService {
    constructor() {
        this.sites = new Map();
        this.departments = new Map();
    }
    
    async initializeDefaultSites() {
        const defaultSites = [
            {
                siteId: 'Site-19',
                siteName: 'Site-19',
                location: { 
                    country: 'USA', 
                    region: 'Classified',
                    coordinates: { lat: 0, lng: 0 }
                },
                classification: 'EUCLID',
                departments: [
                    {
                        departmentId: 'RESEARCH',
                        name: 'Research Department',
                        headOfDepartment: 'Dr. ████████',
                        requiredClearance: 2,
                        specialPermissions: ['SCP Access', 'Anomalous Materials'],
                        personnelList: []
                    },
                    {
                        departmentId: 'SECURITY',
                        name: 'Security Department',
                        headOfDepartment: 'Agent ████████',
                        requiredClearance: 1,
                        specialPermissions: ['Armed Response', 'Containment Breach'],
                        personnelList: []
                    },
                    {
                        departmentId: 'CONTAINMENT',
                        name: 'Containment Department',
                        headOfDepartment: 'Dr. ████████',
                        requiredClearance: 3,
                        specialPermissions: ['Containment Protocols', 'Emergency Response'],
                        personnelList: []
                    },
                    {
                        departmentId: 'ADMINISTRATION',
                        name: 'Administration',
                        headOfDepartment: 'Administrator ████████',
                        requiredClearance: 1,
                        specialPermissions: ['Personnel Management'],
                        personnelList: []
                    }
                ],
                maxClearanceLevel: 4,
                specializations: ['Containment', 'Research', 'Training'],
                personnelCount: 1247,
                isActive: true
            },
            {
                siteId: 'Site-██',
                siteName: 'Site-██',
                location: { 
                    country: 'Classified', 
                    region: 'Classified',
                    coordinates: { lat: 0, lng: 0 }
                },
                classification: 'KETER',
                departments: [
                    {
                        departmentId: 'RESEARCH',
                        name: 'Research Department',
                        headOfDepartment: 'Dr. ████████',
                        requiredClearance: 3,
                        specialPermissions: ['High-Risk SCP Access', 'Memetic Hazards'],
                        personnelList: []
                    },
                    {
                        departmentId: 'SECURITY',
                        name: 'Security Department',
                        headOfDepartment: 'Commander ████████',
                        requiredClearance: 2,
                        specialPermissions: ['Heavy Weapons', 'Tactical Response'],
                        personnelList: []
                    },
                    {
                        departmentId: 'SPECIAL_CONTAINMENT',
                        name: 'Special Containment',
                        headOfDepartment: 'Dr. ████████',
                        requiredClearance: 4,
                        specialPermissions: ['Anomalous Technology', 'Reality Anchors'],
                        personnelList: []
                    }
                ],
                maxClearanceLevel: 5,
                specializations: ['High-Risk Containment', 'Anomalous Research'],
                personnelCount: 892,
                isActive: true
            },
            {
                siteId: 'Area-██',
                siteName: 'Area-██',
                location: { 
                    country: 'Classified', 
                    region: 'Classified',
                    coordinates: { lat: 0, lng: 0 }
                },
                classification: 'APOLLYON',
                departments: [
                    {
                        departmentId: 'RESEARCH',
                        name: 'Research Department',
                        headOfDepartment: 'Dr. ████████',
                        requiredClearance: 4,
                        specialPermissions: ['Cognitohazards', 'Temporal Anomalies'],
                        personnelList: []
                    },
                    {
                        departmentId: 'SECURITY',
                        name: 'Security Department',
                        headOfDepartment: 'Director ████████',
                        requiredClearance: 3,
                        specialPermissions: ['Scranton Reality Anchors', 'Memetic Countermeasures'],
                        personnelList: []
                    },
                    {
                        departmentId: 'SPECIAL_CONTAINMENT',
                        name: 'Special Containment',
                        headOfDepartment: 'O5-█',
                        requiredClearance: 5,
                        specialPermissions: ['XK-Class Scenarios', 'Thaumiel Objects'],
                        personnelList: []
                    },
                    {
                        departmentId: 'O5_OPERATIONS',
                        name: 'O5 Operations',
                        headOfDepartment: 'O5 Council',
                        requiredClearance: 5,
                        specialPermissions: ['All Access', 'Administrative Override'],
                        personnelList: []
                    }
                ],
                maxClearanceLevel: 5,
                specializations: ['O5 Operations', 'Critical Containment', 'Global Security'],
                personnelCount: 456,
                isActive: true
            }
        ];
        
        // Mobile Task Forces (MTF)
        const mobileTasks = [
            {
                siteId: 'MTF-Alpha-1',
                siteName: 'MTF Alpha-1 "Red Right Hand"',
                location: { 
                    country: 'Mobile', 
                    region: 'Global Operations',
                    coordinates: { lat: 0, lng: 0 }
                },
                classification: 'TOP SECRET',
                departments: [
                    {
                        departmentId: 'TACTICAL',
                        name: 'Tactical Operations',
                        headOfDepartment: 'Commander ████████',
                        requiredClearance: 4,
                        specialPermissions: ['O5 Protection', 'Lethal Force Authorization'],
                        personnelList: []
                    },
                    {
                        departmentId: 'INTELLIGENCE',
                        name: 'Intelligence Gathering',
                        headOfDepartment: 'Agent ████████',
                        requiredClearance: 4,
                        specialPermissions: ['Information Warfare', 'Surveillance'],
                        personnelList: []
                    },
                    {
                        departmentId: 'COMMAND',
                        name: 'Command Structure',
                        headOfDepartment: 'O5-█',
                        requiredClearance: 5,
                        specialPermissions: ['Administrative Override', 'Emergency Powers'],
                        personnelList: []
                    }
                ],
                maxClearanceLevel: 5,
                specializations: ['O5 Council Protection', 'High-Value Target Elimination'],
                personnelCount: 50,
                isActive: true,
                type: 'mtf',
                specialization: 'O5 Council Protection'
            },
            {
                siteId: 'MTF-Epsilon-11',
                siteName: 'MTF Epsilon-11 "Nine-Tailed Fox"',
                location: { 
                    country: 'Mobile', 
                    region: 'Global Operations',
                    coordinates: { lat: 0, lng: 0 }
                },
                classification: 'SECRET',
                departments: [
                    {
                        departmentId: 'TACTICAL',
                        name: 'Tactical Operations',
                        headOfDepartment: 'Commander ████████',
                        requiredClearance: 3,
                        specialPermissions: ['Breach Response', 'Site Security'],
                        personnelList: []
                    },
                    {
                        departmentId: 'CONTAINMENT',
                        name: 'Containment Specialist',
                        headOfDepartment: 'Dr. ████████',
                        requiredClearance: 3,
                        specialPermissions: ['Emergency Containment', 'SCP Handling'],
                        personnelList: []
                    },
                    {
                        departmentId: 'MEDICAL',
                        name: 'Field Medical',
                        headOfDepartment: 'Dr. ████████',
                        requiredClearance: 2,
                        specialPermissions: ['Field Surgery', 'Anomalous Medicine'],
                        personnelList: []
                    }
                ],
                maxClearanceLevel: 4,
                specializations: ['Site Security', 'Containment Breach Response'],
                personnelCount: 120,
                isActive: true,
                type: 'mtf',
                specialization: 'Site Security & Recontainment'
            },
            {
                siteId: 'MTF-Nu-7',
                siteName: 'MTF Nu-7 "Hammer Down"',
                location: { 
                    country: 'Mobile', 
                    region: 'Global Operations',
                    coordinates: { lat: 0, lng: 0 }
                },
                classification: 'SECRET',
                departments: [
                    {
                        departmentId: 'TACTICAL',
                        name: 'Heavy Tactical',
                        headOfDepartment: 'Colonel ████████',
                        requiredClearance: 3,
                        specialPermissions: ['Heavy Weapons', 'Armored Vehicles'],
                        personnelList: []
                    },
                    {
                        departmentId: 'DEMOLITIONS',
                        name: 'Demolitions Expert',
                        headOfDepartment: 'Specialist ████████',
                        requiredClearance: 3,
                        specialPermissions: ['Explosives', 'Structural Demolition'],
                        personnelList: []
                    },
                    {
                        departmentId: 'LOGISTICS',
                        name: 'Field Logistics',
                        headOfDepartment: 'Quartermaster ████████',
                        requiredClearance: 2,
                        specialPermissions: ['Supply Chain', 'Equipment Maintenance'],
                        personnelList: []
                    }
                ],
                maxClearanceLevel: 4,
                specializations: ['Armed Response', 'Hostile Anomaly Suppression'],
                personnelCount: 200,
                isActive: true,
                type: 'mtf',
                specialization: 'Armed Response & Hostile Anomalies'
            },
            {
                siteId: 'MTF-Beta-7',
                siteName: 'MTF Beta-7 "Maz Hatters"',
                location: { 
                    country: 'Mobile', 
                    region: 'Global Operations',
                    coordinates: { lat: 0, lng: 0 }
                },
                classification: 'SECRET',
                departments: [
                    {
                        departmentId: 'BIOLOGICAL',
                        name: 'Biological Hazmat',
                        headOfDepartment: 'Dr. ████████',
                        requiredClearance: 3,
                        specialPermissions: ['Biohazard Response', 'Pathogen Analysis'],
                        personnelList: []
                    },
                    {
                        departmentId: 'CHEMICAL',
                        name: 'Chemical Analysis',
                        headOfDepartment: 'Dr. ████████',
                        requiredClearance: 3,
                        specialPermissions: ['Chemical Warfare', 'Toxicology'],
                        personnelList: []
                    },
                    {
                        departmentId: 'CONTAINMENT',
                        name: 'Hazmat Containment',
                        headOfDepartment: 'Specialist ████████',
                        requiredClearance: 3,
                        specialPermissions: ['Environmental Cleanup', 'Decontamination'],
                        personnelList: []
                    }
                ],
                maxClearanceLevel: 4,
                specializations: ['Biological Hazards', 'Chemical Contamination'],
                personnelCount: 80,
                isActive: true,
                type: 'mtf',
                specialization: 'Biological & Chemical Hazards'
            },
            {
                siteId: 'MTF-Eta-10',
                siteName: 'MTF Eta-10 "See No Evil"',
                location: { 
                    country: 'Mobile', 
                    region: 'Global Operations',
                    coordinates: { lat: 0, lng: 0 }
                },
                classification: 'TOP SECRET',
                departments: [
                    {
                        departmentId: 'COGNITOHAZARD',
                        name: 'Cognitohazard Specialist',
                        headOfDepartment: 'Dr. ████████',
                        requiredClearance: 4,
                        specialPermissions: ['Memetic Resistance', 'Cognitohazard Exposure'],
                        personnelList: []
                    },
                    {
                        departmentId: 'MEMETIC',
                        name: 'Memetic Resistance',
                        headOfDepartment: 'Dr. ████████',
                        requiredClearance: 4,
                        specialPermissions: ['Memetic Inoculation', 'Information Hazards'],
                        personnelList: []
                    },
                    {
                        departmentId: 'PSYCHOLOGICAL',
                        name: 'Psychological Support',
                        headOfDepartment: 'Dr. ████████',
                        requiredClearance: 3,
                        specialPermissions: ['Mental Health', 'Trauma Response'],
                        personnelList: []
                    }
                ],
                maxClearanceLevel: 5,
                specializations: ['Cognitohazards', 'Memetic Anomalies'],
                personnelCount: 40,
                isActive: true,
                type: 'mtf',
                specialization: 'Cognitohazards & Memetic Anomalies'
            }
        ];
        
        // Combine sites and MTFs
        const allFacilities = [...defaultSites, ...mobileTasks];
        
        for (const facilityData of allFacilities) {
            const site = new SCPSite({
                ...facilityData,
                type: facilityData.type || 'site'
            });
            this.addSite(site);
        }
        
        console.log(`Initialized ${this.sites.size} default SCP facilities (${defaultSites.length} sites, ${mobileTasks.length} MTFs)`);
    }
    
    addSite(site) {
        this.sites.set(site.siteId, site);
        
        // Add departments to the departments map
        site.departments.forEach(dept => {
            const department = new Department({
                ...dept,
                siteId: site.siteId
            });
            const departmentKey = `${site.siteId}-${dept.departmentId}`;
            this.departments.set(departmentKey, department);
        });
    }
    
    async getSite(siteId) {
        return this.sites.get(siteId);
    }
    
    async getAllSites() {
        return Array.from(this.sites.values()).filter(site => site.isActive);
    }
    
    async getDepartments(siteId) {
        const site = this.sites.get(siteId);
        if (!site) {
            return null;
        }
        
        return site.departments.map(dept => {
            const departmentKey = `${siteId}-${dept.departmentId}`;
            return this.departments.get(departmentKey) || dept;
        });
    }
    
    async validateSiteAccess(siteId, clearanceLevel) {
        const site = this.sites.get(siteId);
        if (!site) return false;
        
        return clearanceLevel <= site.maxClearanceLevel;
    }
    
    async validateDepartmentAccess(siteId, departmentId, clearanceLevel) {
        const departmentKey = `${siteId}-${departmentId}`;
        const department = this.departments.get(departmentKey);
        
        if (!department) return false;
        
        return clearanceLevel >= department.requiredClearance;
    }
    
    async getSiteStatistics(siteId) {
        const site = this.sites.get(siteId);
        if (!site) return null;
        
        return {
            siteId: site.siteId,
            siteName: site.siteName,
            personnelCount: site.personnelCount,
            departmentCount: site.departments.length,
            maxClearanceLevel: site.maxClearanceLevel,
            classification: site.classification,
            specializations: site.specializations,
            isActive: site.isActive
        };
    }
    
    async createSite(siteData) {
        const site = new SCPSite(siteData);
        this.addSite(site);
        return site;
    }
    
    async updateSite(siteId, updateData) {
        const site = this.sites.get(siteId);
        if (!site) return null;
        
        // Update site properties
        Object.keys(updateData).forEach(key => {
            if (key !== 'siteId' && updateData[key] !== undefined) {
                site[key] = updateData[key];
            }
        });
        
        return site;
    }
    
    async addDepartment(siteId, departmentData) {
        const site = this.sites.get(siteId);
        if (!site) return null;
        
        const department = new Department({
            ...departmentData,
            siteId
        });
        
        site.addDepartment(department);
        
        const departmentKey = `${siteId}-${department.departmentId}`;
        this.departments.set(departmentKey, department);
        
        return department;
    }
    
    /**
     * Valide une affectation complète de personnel
     */
    async validatePersonnelAssignment(siteId, departmentId, clearanceLevel) {
        const site = this.sites.get(siteId);
        if (!site) {
            return {
                isValid: false,
                errors: [`Site ${siteId} not found`],
                warnings: []
            };
        }
        
        return site.validatePersonnelAssignment(clearanceLevel, departmentId);
    }
    
    /**
     * Obtient les sites par type
     */
    async getSitesByType(type) {
        return Array.from(this.sites.values()).filter(site => 
            site.type === type && site.isActive
        );
    }
    
    /**
     * Obtient tous les MTF
     */
    async getAllMTFs() {
        return this.getSitesByType('mtf');
    }
    
    /**
     * Recherche de sites par critères
     */
    async searchSites(criteria) {
        const results = [];
        
        this.sites.forEach(site => {
            let matches = true;
            
            if (criteria.type && site.type !== criteria.type) matches = false;
            if (criteria.minClearance && site.maxClearanceLevel < criteria.minClearance) matches = false;
            if (criteria.maxClearance && site.maxClearanceLevel > criteria.maxClearance) matches = false;
            if (criteria.hasSpecialization && !site.specialization) matches = false;
            if (criteria.searchTerm) {
                const term = criteria.searchTerm.toLowerCase();
                const searchableText = `${site.siteId} ${site.siteName} ${site.specialization || ''}`.toLowerCase();
                if (!searchableText.includes(term)) matches = false;
            }
            
            if (matches) results.push(site);
        });
        
        return results;
    }
    
    /**
     * Valide l'intégrité de tous les sites
     */
    async validateAllSites() {
        let validSites = 0;
        let invalidSites = 0;
        const issues = [];
        
        this.sites.forEach((site, siteId) => {
            const validation = this.validateSiteIntegrity(site);
            if (validation.isValid) {
                validSites++;
            } else {
                invalidSites++;
                issues.push({
                    siteId,
                    errors: validation.errors
                });
            }
        });
        
        return {
            validSites,
            invalidSites,
            issues,
            totalSites: this.sites.size
        };
    }
    
    /**
     * Valide l'intégrité d'un site individuel
     */
    validateSiteIntegrity(site) {
        const errors = [];
        
        if (!site.siteId) errors.push('Missing site ID');
        if (!site.siteName) errors.push('Missing site name');
        if (!Array.isArray(site.departments)) errors.push('Invalid departments array');
        if (site.maxClearanceLevel < 0 || site.maxClearanceLevel > 5) {
            errors.push('Invalid max clearance level');
        }
        
        // Valider chaque département
        if (Array.isArray(site.departments)) {
            site.departments.forEach((dept, index) => {
                if (!dept.departmentId) errors.push(`Department ${index}: Missing department ID`);
                if (!dept.name) errors.push(`Department ${index}: Missing name`);
                if (dept.requiredClearance < 0 || dept.requiredClearance > 5) {
                    errors.push(`Department ${index}: Invalid required clearance`);
                }
                if (dept.requiredClearance > site.maxClearanceLevel) {
                    errors.push(`Department ${index}: Required clearance exceeds site maximum`);
                }
            });
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

// Create singleton instance
const siteService = new SiteService();

// Export functions
module.exports = {
    initializeDefaultSites: () => siteService.initializeDefaultSites(),
    getSite: (siteId) => siteService.getSite(siteId),
    getAllSites: () => siteService.getAllSites(),
    getDepartments: (siteId) => siteService.getDepartments(siteId),
    validateSiteAccess: (siteId, clearanceLevel) => siteService.validateSiteAccess(siteId, clearanceLevel),
    validateDepartmentAccess: (siteId, departmentId, clearanceLevel) => siteService.validateDepartmentAccess(siteId, departmentId, clearanceLevel),
    getSiteStatistics: (siteId) => siteService.getSiteStatistics(siteId),
    createSite: (siteData) => siteService.createSite(siteData),
    updateSite: (siteId, updateData) => siteService.updateSite(siteId, updateData),
    addDepartment: (siteId, departmentData) => siteService.addDepartment(siteId, departmentData),
    
    // New enhanced methods
    validatePersonnelAssignment: (siteId, departmentId, clearanceLevel) => siteService.validatePersonnelAssignment(siteId, departmentId, clearanceLevel),
    getSitesByType: (type) => siteService.getSitesByType(type),
    getAllMTFs: () => siteService.getAllMTFs(),
    searchSites: (criteria) => siteService.searchSites(criteria),
    validateAllSites: () => siteService.validateAllSites(),
    
    // Export classes for use in other modules
    SCPSite,
    Department
};