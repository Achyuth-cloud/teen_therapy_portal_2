const Resource = require('../models/Resource');

// @desc    Get all resources
// @route   GET /api/resources
// @access  Private
const getAllResources = async (req, res) => {
  const { type, search } = req.query;
  
  try {
    const resources = await Resource.findAll({
      type,
      search,
      limit: 100,
      offset: 0
    });
    res.json(resources);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get resource by ID
// @route   GET /api/resources/:id
// @access  Private
const getResourceById = async (req, res) => {
  const { id } = req.params;
  
  try {
    await Resource.incrementViews(id);
    const resource = await Resource.findById(id);

    if (!resource || !resource.is_active) {
      return res.status(404).json({ message: 'Resource not found' });
    }
    
    res.json(resource);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create resource (Admin/Therapist)
// @route   POST /api/resources
// @access  Private (Admin/Therapist)
const createResource = async (req, res) => {
  const { title, description, type, link, content } = req.body;
  
  try {
    const resourceId = await Resource.create({
      title,
      description,
      type,
      link,
      content,
      created_by: req.user.user_id
    });
    
    res.status(201).json({
      message: 'Resource created successfully',
      resourceId
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update resource
// @route   PUT /api/resources/:id
// @access  Private (Admin/Therapist)
const updateResource = async (req, res) => {
  const { id } = req.params;
  const { title, description, type, link, content, is_active } = req.body;
  
  try {
    await Resource.update(id, { title, description, type, link, content, is_active });
    res.json({ message: 'Resource updated successfully' });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete resource
// @route   DELETE /api/resources/:id
// @access  Private (Admin)
const deleteResource = async (req, res) => {
  const { id } = req.params;
  
  try {
    await Resource.delete(id);
    res.json({ message: 'Resource deleted successfully' });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get resource categories
// @route   GET /api/resources/categories
// @access  Private
const getResourceCategories = async (req, res) => {
  try {
    const categories = await Resource.getCategories();
    res.json(categories);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAllResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource,
  getResourceCategories
};
