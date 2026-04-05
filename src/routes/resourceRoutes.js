const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getAllResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource,
  getResourceCategories
} = require('../controllers/resourceController');

router.get('/', protect, getAllResources);
router.get('/categories', protect, getResourceCategories);
router.get('/:id', protect, getResourceById);
router.post('/', protect, authorize('admin', 'therapist'), createResource);
router.put('/:id', protect, authorize('admin', 'therapist'), updateResource);
router.delete('/:id', protect, authorize('admin'), deleteResource);

module.exports = router;