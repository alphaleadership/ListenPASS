/**
 * Client Site Manager - Gestion des sites et départements côté client
 */
class ClientSiteManager {
    constructor() {
        this.sites = new Map();
        this.departments = new Map();
        
        // Initialize API client safely
        try {
            this.apiClient = window.APIClient ? new APIClient() : null;
        } catch (error) {
            console.warn('APIClient not available, using offline mode');
            this.apiClient = null;
        }
        
        this.initializeDefaultSites();
    }
    
    initializeDefaultSites() {
        // Sites SCP prédéfinis pour fonctionnement hors ligne
        const defaultSites = [
            {
                siteId: 'Site-19',
                siteName: 'Site-19',
                location: { country: 'USA', region: 'Classified' },
                departments: [
                    { departmentId: 'RESEARCH', name: 'Research Department', requiredClearance: 2 },
                    { departmentId: 'SECURITY', name: 'Security Department', requiredClearance: 1 },
                    { departmentId: 'CONTAINMENT', name: 'Containment Department', requiredClearance: 3 },
                    { departmentId: 'ADMINISTRATION', name: 'Administration', requiredClearance: 1 }
                ],
                maxClearanceLevel: 4,
                personnelCount: 1247,
                isActive: true,
                type: 'site'
            },
            {
                siteId: 'Site-██',
                siteName: 'Site-██',
                location: { country: 'Classified', region: 'Classified' },
                departments: [
                    { departmentId: 'RESEARCH', name: 'Research Department', requiredClearance: 3 },
                    { departmentId: 'SECURITY', name: 'Security Department', requiredClearance: 2 },
                    { departmentId: 'SPECIAL_CONTAINMENT', name: 'Special Containment', requiredClearance: 4 }
                ],
                maxClearanceLevel: 5,
                personnelCount: 892,
                isActive: true,
                type: 'site'
            },
            {
                siteId: 'Area-██',
                siteName: 'Area-██',
                location: { country: 'Classified', region: 'Classified' },
                departments: [
                    { departmentId: 'RESEARCH', name: 'Research Department', requiredClearance: 4 },
                    { departmentId: 'SECURITY', name: 'Security Department', requiredClearance: 3 },
                    { departmentId: 'SPECIAL_CONTAINMENT', name: 'Special Containment', requiredClearance: 5 },
                    { departmentId: 'O5_OPERATIONS', name: 'O5 Operations', requiredClearance: 5 }
                ],
                maxClearanceLevel: 5,
                personnelCount: 456,
                isActive: true,
                type: 'site'
            }
        ];
        
        // Forces d'Intervention Mobile (MTF)
        const mobileTasks = [
            {
                siteId: 'MTF-Alpha-1',
                siteName: 'MTF Alpha-1 "Red Right Hand"',
                location: { country: 'Mobile', region: 'Global Operations' },
                departments: [
                    { departmentId: 'TACTICAL', name: 'Tactical Operations', requiredClearance: 4 },
                    { departmentId: 'INTELLIGENCE', name: 'Intelligence Gathering', requiredClearance: 4 },
                    { departmentId: 'COMMAND', name: 'Command Structure', requiredClearance: 5 }
                ],
                maxClearanceLevel: 5,
                personnelCount: 50,
                isActive: true,
                type: 'mtf',
                specialization: 'O5 Council Protection'
            },
            {
                siteId: 'MTF-Epsilon-11',
                siteName: 'MTF Epsilon-11 "Nine-Tailed Fox"',
                location: { country: 'Mobile', region: 'Global Operations' },
                departments: [
                    { departmentId: 'TACTICAL', name: 'Tactical Operations', requiredClearance: 3 },
                    { departmentId: 'CONTAINMENT', name: 'Containment Specialist', requiredClearance: 3 },
                    { departmentId: 'MEDICAL', name: 'Field Medical', requiredClearance: 2 }
                ],
                maxClearanceLevel: 4,
                personnelCount: 120,
                isActive: true,
                type: 'mtf',
                specialization: 'Site Security & Recontainment'
            },
            {
                siteId: 'MTF-Nu-7',
                siteName: 'MTF Nu-7 "Hammer Down"',
                location: { country: 'Mobile', region: 'Global Operations' },
                departments: [
                    { departmentId: 'TACTICAL', name: 'Heavy Tactical', requiredClearance: 3 },
                    { departmentId: 'DEMOLITIONS', name: 'Demolitions Expert', requiredClearance: 3 },
                    { departmentId: 'LOGISTICS', name: 'Field Logistics', requiredClearance: 2 }
                ],
                maxClearanceLevel: 4,
                personnelCount: 200,
                isActive: true,
                type: 'mtf',
                specialization: 'Armed Response & Hostile Anomalies'
            },
            {
                siteId: 'MTF-Beta-7',
                siteName: 'MTF Beta-7 "Maz Hatters"',
                location: { country: 'Mobile', region: 'Global Operations' },
                departments: [
                    { departmentId: 'BIOLOGICAL', name: 'Biological Hazmat', requiredClearance: 3 },
                    { departmentId: 'CHEMICAL', name: 'Chemical Analysis', requiredClearance: 3 },
                    { departmentId: 'CONTAINMENT', name: 'Hazmat Containment', requiredClearance: 3 }
                ],
                maxClearanceLevel: 4,
                personnelCount: 80,
                isActive: true,
                type: 'mtf',
                specialization: 'Biological & Chemical Hazards'
            },
            {
                siteId: 'MTF-Gamma-5',
                siteName: 'MTF Gamma-5 "Red Herrings"',
                location: { country: 'Mobile', region: 'Global Operations' },
                departments: [
                    { departmentId: 'DISINFORMATION', name: 'Disinformation', requiredClearance: 3 },
                    { departmentId: 'MEDIA_CONTROL', name: 'Media Control', requiredClearance: 3 },
                    { departmentId: 'COVER_OPERATIONS', name: 'Cover Operations', requiredClearance: 4 }
                ],
                maxClearanceLevel: 4,
                personnelCount: 60,
                isActive: true,
                type: 'mtf',
                specialization: 'Disinformation & Cover-ups'
            },
            {
                siteId: 'MTF-Eta-10',
                siteName: 'MTF Eta-10 "See No Evil"',
                location: { country: 'Mobile', region: 'Global Operations' },
                departments: [
                    { departmentId: 'COGNITOHAZARD', name: 'Cognitohazard Specialist', requiredClearance: 4 },
                    { departmentId: 'MEMETIC', name: 'Memetic Resistance', requiredClearance: 4 },
                    { departmentId: 'PSYCHOLOGICAL', name: 'Psychological Support', requiredClearance: 3 }
                ],
                maxClearanceLevel: 5,
                personnelCount: 40,
                isActive: true,
                type: 'mtf',
                specialization: 'Cognitohazards & Memetic Anomalies'
            },
            {
                siteId: 'MTF-Mu-4',
                siteName: 'MTF Mu-4 "Debuggers"',
                location: { country: 'Mobile', region: 'Global Operations' },
                departments: [
                    { departmentId: 'DIGITAL_FORENSICS', name: 'Digital Forensics', requiredClearance: 3 },
                    { departmentId: 'CYBER_SECURITY', name: 'Cyber Security', requiredClearance: 3 },
                    { departmentId: 'AI_CONTAINMENT', name: 'AI Containment', requiredClearance: 4 }
                ],
                maxClearanceLevel: 4,
                personnelCount: 35,
                isActive: true,
                type: 'mtf',
                specialization: 'Digital & Electronic Anomalies'
            },
            {
                siteId: 'MTF-Tau-5',
                siteName: 'MTF Tau-5 "Samsara"',
                location: { country: 'Mobile', region: 'Global Operations' },
                departments: [
                    { departmentId: 'CYBERNETIC_OPS', name: 'Cybernetic Operations', requiredClearance: 5 },
                    { departmentId: 'RESURRECTION', name: 'Resurrection Protocol', requiredClearance: 5 },
                    { departmentId: 'ANOMALOUS_TECH', name: 'Anomalous Technology', requiredClearance: 5 }
                ],
                maxClearanceLevel: 5,
                personnelCount: 12,
                isActive: true,
                type: 'mtf',
                specialization: 'Cybernetic Enhancement & High-Risk Operations'
            }
        ];
        
        // Combiner sites et MTF
        const allFacilities = [...defaultSites, ...mobileTasks];
        
        allFacilities.forEach(facility => {
            this.addSite(new SCPSite(facility));
        });
    }
    
    async loadSites() {
        try {
            // Essayer de charger depuis le serveur si disponible
            if (this.apiClient) {
                const serverSites = await this.apiClient.getSites();
                if (serverSites && serverSites.length > 0) {
                    this.sites.clear();
                    this.departments.clear();
                    serverSites.forEach(siteData => {
                        this.addSite(new SCPSite(siteData));
                    });
                    console.log(`Loaded ${serverSites.length} sites from server`);
                    
                    // Valider l'intégrité des données chargées
                    this.validateSiteData();
                    return;
                }
            }
        } catch (error) {
            console.log('Server not available, using default sites');
            // Les sites par défaut sont déjà chargés dans initializeDefaultSites()
        }
        
        // Valider l'intégrité des données par défaut
        this.validateSiteData();
        console.log(`Using ${this.sites.size} default sites`);
    }
    
    addSite(site) {
        this.sites.set(site.siteId, site);
        
        // Ajouter les départements de ce site
        site.departments.forEach(dept => {
            const departmentKey = `${site.siteId}-${dept.departmentId}`;
            this.departments.set(departmentKey, {
                ...dept,
                siteId: site.siteId
            });
        });
    }
    
    getSite(siteId) {
        return this.sites.get(siteId);
    }
    
    getAllSites() {
        return Array.from(this.sites.values());
    }
    
    async getDepartments(siteId) {
        const site = this.getSite(siteId);
        if (!site) {
            throw new Error(`Site ${siteId} non trouvé`);
        }
        
        return site.departments;
    }
    
    validateSiteAccess(siteId, clearanceLevel) {
        const site = this.getSite(siteId);
        if (!site) return false;
        
        return clearanceLevel <= site.maxClearanceLevel;
    }
    
    validateDepartmentAccess(siteId, departmentId, clearanceLevel) {
        const departmentKey = `${siteId}-${departmentId}`;
        const department = this.departments.get(departmentKey);
        
        if (!department) return false;
        
        return clearanceLevel >= department.requiredClearance;
    }
    
    getSiteStatistics(siteId) {
        const site = this.getSite(siteId);
        if (!site) return null;
        
        return {
            siteId: site.siteId,
            siteName: site.siteName,
            personnelCount: site.personnelCount,
            departmentCount: site.departments.length,
            maxClearanceLevel: site.maxClearanceLevel,
            classification: site.classification,
            type: site.type,
            specialization: site.specialization,
            isActive: site.isActive
        };
    }
    
    /**
     * Valide l'intégrité des données de sites chargées
     */
    validateSiteData() {
        let validSites = 0;
        let invalidSites = 0;
        
        this.sites.forEach((site, siteId) => {
            if (this.validateSiteIntegrity(site)) {
                validSites++;
            } else {
                invalidSites++;
                console.warn(`Site ${siteId} has integrity issues`);
            }
        });
        
        console.log(`Site validation complete: ${validSites} valid, ${invalidSites} invalid`);
        return { validSites, invalidSites };
    }
    
    /**
     * Valide l'intégrité d'un site individuel
     */
    validateSiteIntegrity(site) {
        if (!site.siteId || !site.siteName) return false;
        if (!Array.isArray(site.departments)) return false;
        if (site.maxClearanceLevel < 0 || site.maxClearanceLevel > 5) return false;
        
        // Valider chaque département
        for (const dept of site.departments) {
            if (!dept.departmentId || !dept.name) return false;
            if (dept.requiredClearance < 0 || dept.requiredClearance > 5) return false;
            if (dept.requiredClearance > site.maxClearanceLevel) return false;
        }
        
        return true;
    }
    
    /**
     * Obtient les sites par type (site ou MTF)
     */
    getSitesByType(type) {
        return Array.from(this.sites.values()).filter(site => 
            site.type === type && site.isActive
        );
    }
    
    /**
     * Obtient tous les MTF disponibles
     */
    getAllMTFs() {
        return this.getSitesByType('mtf');
    }
    
    /**
     * Obtient tous les sites traditionnels
     */
    getAllTraditionalSites() {
        return this.getSitesByType('site');
    }
    
    /**
     * Recherche de sites par critères
     */
    searchSites(criteria) {
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
     * Valide une affectation complète (site + département + clearance)
     */
    validateCompleteAssignment(siteId, departmentId, clearanceLevel) {
        const validation = {
            isValid: true,
            errors: [],
            warnings: []
        };
        
        // Valider le site
        if (!this.validateSiteAccess(siteId, clearanceLevel)) {
            validation.isValid = false;
            validation.errors.push(`Clearance level ${clearanceLevel} not authorized for ${siteId}`);
        }
        
        // Valider le département
        if (!this.validateDepartmentAccess(siteId, departmentId, clearanceLevel)) {
            validation.isValid = false;
            validation.errors.push(`Clearance level ${clearanceLevel} insufficient for department ${departmentId}`);
        }
        
        // Ajouter des avertissements pour les affectations inhabituelles
        const site = this.getSite(siteId);
        if (site && site.isMTF() && clearanceLevel < 2) {
            validation.warnings.push('MTF personnel typically require clearance level 2 or higher');
        }
        
        if (site && site.type === 'site' && site.siteId.includes('Area') && clearanceLevel < 3) {
            validation.warnings.push('Area facilities typically require higher clearance levels');
        }
        
        return validation;
    }
}

/**
 * Modèle de site SCP
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
}

/**
 * Modèle de département
 */
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

// Make classes globally available
window.ClientSiteManager = ClientSiteManager;
window.SCPSite = SCPSite;
window.Department = Department;