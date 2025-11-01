/**
 * Sites API Routes - Endpoints for SCP sites and departments management
 */

const express = require('express');
const router = express.Router();

// Import services
const siteService = require('../services/siteService');

/**
 * GET /api/sites
 * Get all available SCP sites
 */
router.get('/', async (req, res) => {
    try {
        const sites = await siteService.getAllSites();
        
        res.json({
            success: true,
            sites: sites.map(site => ({
                siteId: site.siteId,
                siteName: site.siteName,
                location: site.location,
                departments: site.departments.map(dept => ({
                    departmentId: dept.departmentId,
                    name: dept.name,
                    requiredClearance: dept.requiredClearance
                })),
                maxClearanceLevel: site.maxClearanceLevel,
                personnelCount: site.personnelCount,
                isActive: site.isActive
            }))
        });
        
    } catch (error) {
        console.error('Error fetching sites:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/sites/:siteId
 * Get detailed information about a specific site
 */
router.get('/:siteId', async (req, res) => {
    try {
        const { siteId } = req.params;
        const site = await siteService.getSite(siteId);
        
        if (!site) {
            return res.status(404).json({
                success: false,
                error: `Site ${siteId} not found`
            });
        }
        
        res.json({
            success: true,
            site: {
                siteId: site.siteId,
                siteName: site.siteName,
                location: site.location,
                classification: site.classification,
                departments: site.departments,
                maxClearanceLevel: site.maxClearanceLevel,
                specializations: site.specializations,
                personnelCount: site.personnelCount,
                isActive: site.isActive
            }
        });
        
    } catch (error) {
        console.error('Error fetching site:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/sites/:siteId/departments
 * Get departments for a specific site
 */
router.get('/:siteId/departments', async (req, res) => {
    try {
        const { siteId } = req.params;
        const departments = await siteService.getDepartments(siteId);
        
        if (!departments) {
            return res.status(404).json({
                success: false,
                error: `Site ${siteId} not found`
            });
        }
        
        res.json({
            success: true,
            siteId,
            departments: departments.map(dept => ({
                departmentId: dept.departmentId,
                name: dept.name,
                requiredClearance: dept.requiredClearance,
                headOfDepartment: dept.headOfDepartment,
                personnelCount: dept.personnelList ? dept.personnelList.length : 0,
                specialPermissions: dept.specialPermissions || []
            }))
        });
        
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * POST /api/sites
 * Create a new site (admin only - would require authentication in production)
 */
router.post('/', async (req, res) => {
    try {
        const siteData = req.body;
        
        // Basic validation
        if (!siteData.siteId || !siteData.siteName) {
            return res.status(400).json({
                success: false,
                error: 'Site ID and name are required'
            });
        }
        
        // Check if site already exists
        const existingSite = await siteService.getSite(siteData.siteId);
        if (existingSite) {
            return res.status(409).json({
                success: false,
                error: `Site ${siteData.siteId} already exists`
            });
        }
        
        const newSite = await siteService.createSite(siteData);
        
        res.status(201).json({
            success: true,
            site: newSite,
            message: `Site ${newSite.siteId} created successfully`
        });
        
    } catch (error) {
        console.error('Error creating site:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * PUT /api/sites/:siteId
 * Update an existing site (admin only - would require authentication in production)
 */
router.put('/:siteId', async (req, res) => {
    try {
        const { siteId } = req.params;
        const updateData = req.body;
        
        const updatedSite = await siteService.updateSite(siteId, updateData);
        
        if (!updatedSite) {
            return res.status(404).json({
                success: false,
                error: `Site ${siteId} not found`
            });
        }
        
        res.json({
            success: true,
            site: updatedSite,
            message: `Site ${siteId} updated successfully`
        });
        
    } catch (error) {
        console.error('Error updating site:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/sites/:siteId/statistics
 * Get statistics for a specific site
 */
router.get('/:siteId/statistics', async (req, res) => {
    try {
        const { siteId } = req.params;
        const stats = await siteService.getSiteStatistics(siteId);
        
        if (!stats) {
            return res.status(404).json({
                success: false,
                error: `Site ${siteId} not found`
            });
        }
        
        res.json({
            success: true,
            statistics: stats
        });
        
    } catch (error) {
        console.error('Error fetching site statistics:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * POST /api/sites/:siteId/departments
 * Add a new department to a site
 */
router.post('/:siteId/departments', async (req, res) => {
    try {
        const { siteId } = req.params;
        const departmentData = req.body;
        
        // Basic validation
        if (!departmentData.departmentId || !departmentData.name) {
            return res.status(400).json({
                success: false,
                error: 'Department ID and name are required'
            });
        }
        
        const department = await siteService.addDepartment(siteId, departmentData);
        
        if (!department) {
            return res.status(404).json({
                success: false,
                error: `Site ${siteId} not found`
            });
        }
        
        res.status(201).json({
            success: true,
            department,
            message: `Department ${department.name} added to ${siteId}`
        });
        
    } catch (error) {
        console.error('Error adding department:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * POST /api/sites/validate-assignment
 * Validate a personnel assignment (site + department + clearance)
 */
router.post('/validate-assignment', async (req, res) => {
    try {
        const { siteId, departmentId, clearanceLevel } = req.body;
        
        if (!siteId || !clearanceLevel) {
            return res.status(400).json({
                success: false,
                error: 'Site ID and clearance level are required'
            });
        }
        
        const validation = await siteService.validatePersonnelAssignment(siteId, departmentId, clearanceLevel);
        
        res.json({
            success: true,
            validation
        });
        
    } catch (error) {
        console.error('Error validating assignment:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/sites/search
 * Search sites by criteria
 */
router.get('/search', async (req, res) => {
    try {
        const criteria = {
            type: req.query.type,
            minClearance: req.query.minClearance ? parseInt(req.query.minClearance) : undefined,
            maxClearance: req.query.maxClearance ? parseInt(req.query.maxClearance) : undefined,
            hasSpecialization: req.query.hasSpecialization === 'true',
            searchTerm: req.query.q
        };
        
        const sites = await siteService.searchSites(criteria);
        
        res.json({
            success: true,
            sites: sites.map(site => ({
                siteId: site.siteId,
                siteName: site.siteName,
                type: site.type,
                specialization: site.specialization,
                maxClearanceLevel: site.maxClearanceLevel,
                personnelCount: site.personnelCount,
                isActive: site.isActive
            })),
            count: sites.length
        });
        
    } catch (error) {
        console.error('Error searching sites:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/sites/mtf
 * Get all Mobile Task Forces
 */
router.get('/mtf', async (req, res) => {
    try {
        const mtfs = await siteService.getAllMTFs();
        
        res.json({
            success: true,
            mtfs: mtfs.map(mtf => ({
                siteId: mtf.siteId,
                siteName: mtf.siteName,
                specialization: mtf.specialization,
                departments: mtf.departments.map(dept => ({
                    departmentId: dept.departmentId,
                    name: dept.name,
                    requiredClearance: dept.requiredClearance
                })),
                maxClearanceLevel: mtf.maxClearanceLevel,
                personnelCount: mtf.personnelCount,
                isActive: mtf.isActive
            }))
        });
        
    } catch (error) {
        console.error('Error fetching MTFs:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/sites/validate-all
 * Validate integrity of all sites (admin endpoint)
 */
router.get('/validate-all', async (req, res) => {
    try {
        const validation = await siteService.validateAllSites();
        
        res.json({
            success: true,
            validation
        });
        
    } catch (error) {
        console.error('Error validating all sites:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

module.exports = router;