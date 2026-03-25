import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  createAsset, getAssets, getAssetById, updateAsset, deleteAsset,
  assignAsset, returnAsset,
  createMaintenance, updateMaintenance,
  getAssetHistory,
  getAssetCategories, getAssetSubcategories,
  getVendors, createVendor,
  getLocations,
  getAssetStats
} from '../controllers/assets.js';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(requireRole('IT', 'MANAGER'));

// Lookups
router.get('/categories', getAssetCategories);
router.get('/categories/:categoryId/subcategories', getAssetSubcategories);
router.get('/vendors', getVendors);
router.post('/vendors', requireRole('MANAGER'), createVendor);
router.get('/locations', getLocations);

// Dashboard stats (Manager/IT)
router.get('/stats/dashboard', getAssetStats);

// CRUD
router.get('/', getAssets);
router.post('/', createAsset);
router.get('/:id', getAssetById);
router.put('/:id', updateAsset);
router.delete('/:id', requireRole('MANAGER'), deleteAsset);

// Assignment
router.post('/:id/assign', assignAsset);
router.post('/:id/return', returnAsset);

// Maintenance
router.post('/:id/maintenance', createMaintenance);
router.patch('/maintenance/:maintenanceId', updateMaintenance);

// History / Audit Log
router.get('/:id/history', getAssetHistory);

export default router;
