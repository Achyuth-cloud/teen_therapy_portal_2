const { pool } = require('../config/database');

class Resource {
  // Create resource
  static async create(resourceData) {
    const { title, description, type, link = null, content = null, created_by } = resourceData;
    
    const [result] = await pool.query(
      `INSERT INTO resources (title, description, type, link, content, created_by, is_active)
       VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
      [title, description, type, link, content, created_by]
    );
    
    return result.insertId;
  }

  // Find resource by ID
  static async findById(resourceId) {
    const [rows] = await pool.query(
      `SELECT r.*, u.full_name as creator_name
       FROM resources r
       LEFT JOIN users u ON r.created_by = u.user_id
       WHERE r.resource_id = ?`,
      [resourceId]
    );
    return rows[0];
  }

  // Get all resources
  static async findAll(options = {}) {
    const { 
      type = null, 
      search = null, 
      is_active = true,
      limit = 10, 
      offset = 0,
      orderBy = 'created_at',
      orderDir = 'DESC'
    } = options;
    
    let query = `
      SELECT r.*, u.full_name as creator_name
      FROM resources r
      LEFT JOIN users u ON r.created_by = u.user_id
      WHERE 1=1
    `;
    const params = [];
    
    if (is_active !== null) {
      query += ' AND r.is_active = ?';
      params.push(is_active);
    }
    
    if (type && type !== 'all') {
      query += ' AND r.type = ?';
      params.push(type);
    }
    
    if (search) {
      query += ' AND (r.title LIKE ? OR r.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ` ORDER BY r.${orderBy} ${orderDir} LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    const [rows] = await pool.query(query, params);
    return rows;
  }

  // Update resource
  static async update(resourceId, updates) {
    const fields = [];
    const values = [];
    
    const allowedFields = ['title', 'description', 'type', 'link', 'content', 'is_active'];
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(updates[field]);
      }
    }
    
    if (fields.length === 0) return false;
    
    values.push(resourceId);
    const [result] = await pool.query(
      `UPDATE resources SET ${fields.join(', ')} WHERE resource_id = ?`,
      values
    );
    
    return result.affectedRows > 0;
  }

  // Increment view count
  static async incrementViews(resourceId) {
    const [result] = await pool.query(
      'UPDATE resources SET views = views + 1 WHERE resource_id = ?',
      [resourceId]
    );
    return result.affectedRows > 0;
  }

  // Delete resource
  static async delete(resourceId) {
    const [result] = await pool.query('DELETE FROM resources WHERE resource_id = ?', [resourceId]);
    return result.affectedRows > 0;
  }

  // Get resources by type
  static async getByType(type, limit = 10) {
    const [rows] = await pool.query(
      `SELECT * FROM resources 
       WHERE type = ? AND is_active = TRUE 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [type, limit]
    );
    return rows;
  }

  // Get popular resources
  static async getPopular(limit = 10) {
    const [rows] = await pool.query(
      `SELECT * FROM resources 
       WHERE is_active = TRUE 
       ORDER BY views DESC 
       LIMIT ?`,
      [limit]
    );
    return rows;
  }

  // Get resource statistics by type
  static async getStats() {
    const [rows] = await pool.query(
      `SELECT 
         type,
         COUNT(*) as count,
         SUM(views) as total_views
       FROM resources
       WHERE is_active = TRUE
       GROUP BY type`
    );
    return rows;
  }

  // Search resources
  static async search(query, options = {}) {
    const { limit = 20, offset = 0 } = options;
    
    const [rows] = await pool.query(
      `SELECT * FROM resources 
       WHERE is_active = TRUE 
       AND (title LIKE ? OR description LIKE ?)
       ORDER BY 
         CASE 
           WHEN title LIKE ? THEN 1
           WHEN description LIKE ? THEN 2
           ELSE 3
         END,
         created_at DESC
       LIMIT ? OFFSET ?`,
      [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, limit, offset]
    );
    return rows;
  }

  // Get resource categories
  static async getCategories() {
    const [rows] = await pool.query(
      `SELECT 
         type as category,
         COUNT(*) as count
       FROM resources
       WHERE is_active = TRUE
       GROUP BY type`
    );
    return rows;
  }
}

module.exports = Resource;