const GlobalFilter = require('../models/globalFilter');
const { apiResponse } = require('../utils/apiResponse');

// Create a new global filter
const createGlobalFilter = async (req, res) => {
  console.log('=== createGlobalFilter called ===');
  console.log('Request body:', req.body);
  
  try {
    const filterData = req.body;
    console.log('Filter data to create:', filterData);
    
    // Check if filter with same key already exists
    const existingFilter = await GlobalFilter.findOne({ key: filterData.key });
    if (existingFilter) {
      console.log('Filter with key already exists:', existingFilter._id);
      return res.status(400).json(apiResponse(400, false, 'Filter with this key already exists'));
    }

    console.log('Filter key is unique, proceeding with creation');
    const globalFilter = new GlobalFilter(filterData);
    console.log('New global filter instance created:', globalFilter);
    
    await globalFilter.save();
    console.log('Global filter saved successfully:', globalFilter._id);

    res.status(201).json(apiResponse(201, true, 'Global filter created successfully', globalFilter));
  } catch (error) {
    console.error('Error creating global filter:', error);
    res.status(500).json(apiResponse(500, false, 'Failed to create global filter', error.message));
  }
};

// Get all global filters (admin)
const getAllGlobalFilters = async (req, res) => {
  console.log('=== getAllGlobalFilters called ===');
  console.log('Query parameters:', req.query);
  
  try {
    const { page = 1, limit = 10, sortBy = 'sortOrder', sortOrder = 1, isActive, category } = req.query;
    console.log('Parsed parameters - page:', page, 'limit:', limit, 'sortBy:', sortBy, 'sortOrder:', sortOrder, 'isActive:', isActive, 'category:', category);
    
    const query = {};
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
      console.log('Added isActive filter:', query.isActive);
    }
    if (category) {
      query.category = category;
      console.log('Added category filter:', category);
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { [sortBy]: parseInt(sortOrder) }
    };
    console.log('Query options:', options);

    const filters = await GlobalFilter.find(query)
      .populate('category', 'name description image')
      .sort(options.sort)
      .limit(options.limit)
      .skip((options.page - 1) * options.limit);
    console.log('Retrieved filters count:', filters.length);

    const total = await GlobalFilter.countDocuments(query);
    console.log('Total filters count:', total);

    res.json(apiResponse(200, true, 'Global filters retrieved successfully', {
      filters,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        pages: Math.ceil(total / options.limit)
      }
    }));
  } catch (error) {
    console.error('Error fetching global filters:', error);
    res.status(500).json(apiResponse(500, false, 'Failed to fetch global filters', error.message));
  }
};

// Get global filter by ID
const getGlobalFilterById = async (req, res) => {
  console.log('=== getGlobalFilterById called ===');
  console.log('Filter ID:', req.params.id);
  
  try {
    const globalFilter = await GlobalFilter.findById(req.params.id)
      .populate('category', 'name description image');

    if (!globalFilter) {
      console.log('Global filter not found:', req.params.id);
      return res.status(404).json(apiResponse(404, false, 'Global filter not found'));
    }

    console.log('Global filter found:', globalFilter._id);
    res.json(apiResponse(200, true, 'Global filter retrieved successfully', globalFilter));
  } catch (error) {
    console.error('Error fetching global filter:', error);
    res.status(500).json(apiResponse(500, false, 'Failed to fetch global filter', error.message));
  }
};

// Update global filter
const updateGlobalFilter = async (req, res) => {
  console.log('=== updateGlobalFilter called ===');
  console.log('Filter ID:', req.params.id);
  console.log('Update data:', req.body);
  
  try {
    const globalFilter = await GlobalFilter.findById(req.params.id);
    
    if (!globalFilter) {
      console.log('Global filter not found for update:', req.params.id);
      return res.status(404).json(apiResponse(404, false, 'Global filter not found'));
    }

    console.log('Global filter found for update:', globalFilter._id);

    // Check if key is being changed and if new key already exists
    if (req.body.key && req.body.key !== globalFilter.key) {
      console.log('Key is being changed from:', globalFilter.key, 'to:', req.body.key);
      const existingFilter = await GlobalFilter.findOne({ key: req.body.key });
      if (existingFilter) {
        console.log('Filter with new key already exists:', existingFilter._id);
        return res.status(400).json(apiResponse(400, false, 'Filter with this key already exists'));
      }
      console.log('New key is unique, proceeding with update');
    }

    Object.keys(req.body).forEach(key => {
      if (key !== '_id' && globalFilter.schema.paths[key]) {
        globalFilter[key] = req.body[key];
        console.log('Updated field:', key, 'to:', req.body[key]);
      }
    });

    await globalFilter.save();
    console.log('Global filter updated and saved successfully');
    
    // Refresh the filter data
    const updatedFilter = await GlobalFilter.findById(req.params.id)
      .populate('category', 'name description image');
    console.log('Refreshed filter data');

    res.json(apiResponse(200, true, 'Global filter updated successfully', updatedFilter));
  } catch (error) {
    console.error('Error updating global filter:', error);
    res.status(500).json(apiResponse(500, false, 'Failed to update global filter', error.message));
  }
};

// Delete global filter
const deleteGlobalFilter = async (req, res) => {
  console.log('=== deleteGlobalFilter called ===');
  console.log('Filter ID:', req.params.id);
  
  try {
    const globalFilter = await GlobalFilter.findById(req.params.id);
    
    if (!globalFilter) {
      console.log('Global filter not found for deletion:', req.params.id);
      return res.status(404).json(apiResponse(404, false, 'Global filter not found'));
    }

    console.log('Global filter found for deletion:', globalFilter._id);
    await globalFilter.remove();
    console.log('Global filter deleted successfully');
    
    res.json(apiResponse(200, true, 'Global filter deleted successfully'));
  } catch (error) {
    console.error('Error deleting global filter:', error);
    res.status(500).json(apiResponse(500, false, 'Failed to delete global filter', error.message));
  }
};

// Toggle global filter status
const toggleGlobalFilterStatus = async (req, res) => {
  console.log('=== toggleGlobalFilterStatus called ===');
  console.log('Filter ID:', req.params.id);
  
  try {
    const globalFilter = await GlobalFilter.findById(req.params.id);
    
    if (!globalFilter) {
      console.log('Global filter not found for status toggle:', req.params.id);
      return res.status(404).json(apiResponse(404, false, 'Global filter not found'));
    }

    console.log('Global filter found, current status:', globalFilter.isActive);
    globalFilter.isActive = !globalFilter.isActive;
    await globalFilter.save();
    console.log('Global filter status toggled successfully');

    res.json(apiResponse(200, true, 'Global filter status toggled successfully', globalFilter));
  } catch (error) {
    console.error('Error toggling global filter status:', error);
    res.status(500).json(apiResponse(500, false, 'Failed to toggle global filter status', error.message));
  }
};

// Get active global filters (public)
const getActiveGlobalFilters = async (req, res) => {
  console.log('=== getActiveGlobalFilters called ===');
  
  try {
    const filters = await GlobalFilter.getActiveFilters();
    console.log('Retrieved active filters count:', filters.length);
    
    res.json(apiResponse(200, true, 'Active global filters retrieved successfully', filters));
  } catch (error) {
    console.error('Error fetching active global filters:', error);
    res.status(500).json(apiResponse(500, false, 'Failed to fetch active global filters', error.message));
  }
};

// Get global filters by category
const getGlobalFiltersByCategory = async (req, res) => {
  console.log('=== getGlobalFiltersByCategory called ===');
  console.log('Category ID:', req.params.categoryId);
  
  try {
    const { categoryId } = req.params;
    const filters = await GlobalFilter.getByCategory(categoryId);
    console.log('Retrieved filters by category count:', filters.length);
    
    res.json(apiResponse(200, true, 'Global filters by category retrieved successfully', filters));
  } catch (error) {
    console.error('Error fetching global filters by category:', error);
    res.status(500).json(apiResponse(500, false, 'Failed to fetch global filters by category', error.message));
  }
};

// Get global filter by key
const getGlobalFilterByKey = async (req, res) => {
  console.log('=== getGlobalFilterByKey called ===');
  console.log('Filter key:', req.params.key);
  
  try {
    const { key } = req.params;
    const filter = await GlobalFilter.getByKey(key);
    
    if (!filter) {
      console.log('Global filter not found by key:', key);
      return res.status(404).json(apiResponse(404, false, 'Global filter not found'));
    }

    console.log('Global filter found by key:', filter._id);
    res.json(apiResponse(200, true, 'Global filter retrieved successfully', filter));
  } catch (error) {
    console.error('Error fetching global filter by key:', error);
    res.status(500).json(apiResponse(500, false, 'Failed to fetch global filter by key', error.message));
  }
};

// Get popular values for a filter
const getPopularValues = async (req, res) => {
  console.log('=== getPopularValues called ===');
  console.log('Filter key:', req.params.key);
  console.log('Limit:', req.query.limit);
  
  try {
    const { key } = req.params;
    const { limit = 10 } = req.query;
    
    const values = await GlobalFilter.getPopularValues(key, parseInt(limit));
    
    if (!values) {
      console.log('Global filter not found for popular values:', key);
      return res.status(404).json(apiResponse(404, false, 'Global filter not found'));
    }

    console.log('Retrieved popular values count:', values.length);
    res.json(apiResponse(200, true, 'Popular values retrieved successfully', values));
  } catch (error) {
    console.error('Error fetching popular values:', error);
    res.status(500).json(apiResponse(500, false, 'Failed to fetch popular values', error.message));
  }
};

// Add value to global filter
const addValueToFilter = async (req, res) => {
  console.log('=== addValueToFilter called ===');
  console.log('Filter ID:', req.params.id);
  console.log('Value data:', req.body);
  
  try {
    const { id } = req.params;
    const { value, displayName, sortOrder } = req.body;
    
    const globalFilter = await GlobalFilter.findById(id);
    if (!globalFilter) {
      console.log('Global filter not found for adding value:', id);
      return res.status(404).json(apiResponse(404, false, 'Global filter not found'));
    }

    console.log('Global filter found, adding value:', value);
    await globalFilter.addValue(value, displayName, sortOrder);
    console.log('Value added to filter successfully');
    
    // Refresh the filter data
    const updatedFilter = await GlobalFilter.findById(id)
      .populate('category', 'name description image');
    console.log('Refreshed filter data');

    res.json(apiResponse(200, true, 'Value added to filter successfully', updatedFilter));
  } catch (error) {
    console.error('Error adding value to filter:', error);
    res.status(500).json(apiResponse(500, false, 'Failed to add value to filter', error.message));
  }
};

// Update value in global filter
const updateFilterValue = async (req, res) => {
  console.log('=== updateFilterValue called ===');
  console.log('Filter ID:', req.params.id);
  console.log('Update data:', req.body);
  
  try {
    const { id } = req.params;
    const { oldValue, newValue, newDisplayName } = req.body;
    
    const globalFilter = await GlobalFilter.findById(id);
    if (!globalFilter) {
      console.log('Global filter not found for updating value:', id);
      return res.status(404).json(apiResponse(404, false, 'Global filter not found'));
    }

    console.log('Global filter found, updating value from:', oldValue, 'to:', newValue);
    await globalFilter.updateValue(oldValue, newValue, newDisplayName);
    console.log('Filter value updated successfully');
    
    // Refresh the filter data
    const updatedFilter = await GlobalFilter.findById(id)
      .populate('category', 'name description image');
    console.log('Refreshed filter data');

    res.json(apiResponse(200, true, 'Filter value updated successfully', updatedFilter));
  } catch (error) {
    console.error('Error updating filter value:', error);
    res.status(500).json(apiResponse(500, false, 'Failed to update filter value', error.message));
  }
};

// Remove value from global filter
const removeFilterValue = async (req, res) => {
  console.log('=== removeFilterValue called ===');
  console.log('Filter ID:', req.params.id);
  console.log('Value to remove:', req.body.value);
  
  try {
    const { id } = req.params;
    const { value } = req.body;
    
    const globalFilter = await GlobalFilter.findById(id);
    if (!globalFilter) {
      console.log('Global filter not found for removing value:', id);
      return res.status(404).json(apiResponse(404, false, 'Global filter not found'));
    }

    console.log('Global filter found, removing value:', value);
    await globalFilter.removeValue(value);
    console.log('Filter value removed successfully');
    
    // Refresh the filter data
    const updatedFilter = await GlobalFilter.findById(id)
      .populate('category', 'name description image');
    console.log('Refreshed filter data');

    res.json(apiResponse(200, true, 'Filter value removed successfully', updatedFilter));
  } catch (error) {
    console.error('Error removing filter value:', error);
    res.status(500).json(apiResponse(500, false, 'Failed to remove filter value', error.message));
  }
};

// Toggle value status in global filter
const toggleValueStatus = async (req, res) => {
  console.log('=== toggleValueStatus called ===');
  console.log('Filter ID:', req.params.id);
  console.log('Value to toggle:', req.body.value);
  
  try {
    const { id } = req.params;
    const { value } = req.body;
    
    const globalFilter = await GlobalFilter.findById(id);
    if (!globalFilter) {
      console.log('Global filter not found for toggling value status:', id);
      return res.status(404).json(apiResponse(404, false, 'Global filter not found'));
    }

    console.log('Global filter found, toggling value status:', value);
    await globalFilter.toggleValueStatus(value);
    console.log('Filter value status toggled successfully');
    
    // Refresh the filter data
    const updatedFilter = await GlobalFilter.findById(id)
      .populate('category', 'name description image');
    console.log('Refreshed filter data');

    res.json(apiResponse(200, true, 'Filter value status toggled successfully', updatedFilter));
  } catch (error) {
    console.error('Error toggling filter value status:', error);
    res.status(500).json(apiResponse(500, false, 'Failed to toggle filter value status', error.message));
  }
};

// Update value count in global filter
const updateValueCount = async (req, res) => {
  console.log('=== updateValueCount called ===');
  console.log('Filter ID:', req.params.id);
  console.log('Count update data:', req.body);
  
  try {
    const { id } = req.params;
    const { value, count } = req.body;
    
    const globalFilter = await GlobalFilter.findById(id);
    if (!globalFilter) {
      console.log('Global filter not found for updating value count:', id);
      return res.status(404).json(apiResponse(404, false, 'Global filter not found'));
    }

    console.log('Global filter found, updating count for value:', value, 'to:', count);
    await globalFilter.updateValueCount(value, parseInt(count));
    console.log('Filter value count updated successfully');
    
    // Refresh the filter data
    const updatedFilter = await GlobalFilter.findById(id)
      .populate('category', 'name description image');
    console.log('Refreshed filter data');

    res.json(apiResponse(200, true, 'Filter value count updated successfully', updatedFilter));
  } catch (error) {
    console.error('Error updating filter value count:', error);
    res.status(500).json(apiResponse(500, false, 'Failed to update filter value count', error.message));
  }
};

// Increment value count in global filter
const incrementValueCount = async (req, res) => {
  console.log('=== incrementValueCount called ===');
  console.log('Filter ID:', req.params.id);
  console.log('Value to increment:', req.body.value);
  
  try {
    const { id } = req.params;
    const { value } = req.body;
    
    const globalFilter = await GlobalFilter.findById(id);
    if (!globalFilter) {
      console.log('Global filter not found for incrementing value count:', id);
      return res.status(404).json(apiResponse(404, false, 'Global filter not found'));
    }

    console.log('Global filter found, incrementing count for value:', value);
    await globalFilter.incrementValueCount(value);
    console.log('Filter value count incremented successfully');
    
    // Refresh the filter data
    const updatedFilter = await GlobalFilter.findById(id)
      .populate('category', 'name description image');
    console.log('Refreshed filter data');

    res.json(apiResponse(200, true, 'Filter value count incremented successfully', updatedFilter));
  } catch (error) {
    console.error('Error incrementing filter value count:', error);
    res.status(500).json(apiResponse(500, false, 'Failed to increment filter value count', error.message));
  }
};

// Decrement value count in global filter
const decrementValueCount = async (req, res) => {
  console.log('=== decrementValueCount called ===');
  console.log('Filter ID:', req.params.id);
  console.log('Value to decrement:', req.body.value);
  
  try {
    const { id } = req.params;
    const { value } = req.body;
    
    const globalFilter = await GlobalFilter.findById(id);
    if (!globalFilter) {
      console.log('Global filter not found for decrementing value count:', id);
      return res.status(404).json(apiResponse(404, false, 'Global filter not found'));
    }

    console.log('Global filter found, decrementing count for value:', value);
    await globalFilter.decrementValueCount(value);
    console.log('Filter value count decremented successfully');
    
    // Refresh the filter data
    const updatedFilter = await GlobalFilter.findById(id)
      .populate('category', 'name description image');
    console.log('Refreshed filter data');

    res.json(apiResponse(200, true, 'Filter value count decremented successfully', updatedFilter));
  } catch (error) {
    console.error('Error decrementing filter value count:', error);
    res.status(500).json(apiResponse(500, false, 'Failed to decrement filter value count', error.message));
  }
};

// Reorder values in global filter
const reorderFilterValues = async (req, res) => {
  console.log('=== reorderFilterValues called ===');
  console.log('Filter ID:', req.params.id);
  console.log('Value order:', req.body.valueOrder);
  
  try {
    const { id } = req.params;
    const { valueOrder } = req.body;
    
    const globalFilter = await GlobalFilter.findById(id);
    if (!globalFilter) {
      console.log('Global filter not found for reordering values:', id);
      return res.status(404).json(apiResponse(404, false, 'Global filter not found'));
    }

    console.log('Global filter found, reordering values');
    await globalFilter.reorderValues(valueOrder);
    console.log('Filter values reordered successfully');
    
    // Refresh the filter data
    const updatedFilter = await GlobalFilter.findById(id)
      .populate('category', 'name description image');
    console.log('Refreshed filter data');

    res.json(apiResponse(200, true, 'Filter values reordered successfully', updatedFilter));
  } catch (error) {
    console.error('Error reordering filter values:', error);
    res.status(500).json(apiResponse(500, false, 'Failed to reorder filter values', error.message));
  }
};

// Search global filters
const searchGlobalFilters = async (req, res) => {
  console.log('=== searchGlobalFilters called ===');
  console.log('Search query:', req.query.q);
  console.log('Pagination:', req.query.page, req.query.limit);
  console.log('Category filter:', req.query.category);
  
  try {
    const { q, page = 1, limit = 10, category } = req.query;
    
    const query = { isActive: true };
    if (category) {
      query.category = category;
      console.log('Added category filter:', category);
    }
    if (q) {
      query.$or = [
        { key: { $regex: q, $options: 'i' } },
        { displayName: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ];
      console.log('Added search query:', q);
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { sortOrder: 1, key: 1 }
    };
    console.log('Search options:', options);

    const filters = await GlobalFilter.find(query)
      .populate('category', 'name description image')
      .sort(options.sort)
      .limit(options.limit)
      .skip((options.page - 1) * options.limit);
    console.log('Search results count:', filters.length);

    const total = await GlobalFilter.countDocuments(query);
    console.log('Total search results:', total);

    res.json(apiResponse(200, true, 'Global filters search completed successfully', {
      filters,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        pages: Math.ceil(total / options.limit)
      }
    }));
  } catch (error) {
    console.error('Error searching global filters:', error);
    res.status(500).json(apiResponse(500, false, 'Failed to search global filters', error.message));
  }
};

module.exports = {
  createGlobalFilter,
  getAllGlobalFilters,
  getGlobalFilterById,
  updateGlobalFilter,
  deleteGlobalFilter,
  toggleGlobalFilterStatus,
  getActiveGlobalFilters,
  getGlobalFiltersByCategory,
  getGlobalFilterByKey,
  getPopularValues,
  addValueToFilter,
  updateFilterValue,
  removeFilterValue,
  toggleValueStatus,
  updateValueCount,
  incrementValueCount,
  decrementValueCount,
  reorderFilterValues,
  searchGlobalFilters
};
