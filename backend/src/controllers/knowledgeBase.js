import db from '../config/database.js';

export const getArticles = async (req, res) => {
  try {
    const { categoryId, search, isAdmin } = req.query;
    
    let query = `
      SELECT a.*, c.name as category_name, u.full_name as author_name
      FROM knowledge_base_articles a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN users u ON a.created_by = u.id
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 0;

    if (isAdmin !== 'true') {
      paramCount++;
      query += ` AND a.is_published = $${paramCount}`;
      values.push(1);
    }

    if (categoryId) {
      paramCount++;
      query += ` AND a.category_id = $${paramCount}`;
      values.push(categoryId);
    }

    if (search) {
      paramCount++;
      query += ` AND (a.title LIKE $${paramCount} OR a.content LIKE $${paramCount})`;
      values.push(`%${search}%`);
    }

    query += ` ORDER BY a.created_at DESC`;

    const result = await db.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Get articles error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getArticleBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const query = `
      SELECT a.*, c.name as category_name, u.full_name as author_name
      FROM knowledge_base_articles a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN users u ON a.created_by = u.id
      WHERE a.slug = $1
    `;
    const result = await db.query(query, [slug]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Article not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get article error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createArticle = async (req, res) => {
  try {
    const { title, slug, content, category_id, is_published } = req.body;
    
    if (!title || !slug || !content) {
      return res.status(400).json({ message: 'Title, slug, and content are required' });
    }

    const query = `
      INSERT INTO knowledge_base_articles 
      (title, slug, content, category_id, is_published, created_by)
      OUTPUT inserted.*
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    
    const result = await db.query(query, [
      title, 
      slug, 
      content, 
      category_id || null, 
      is_published ? 1 : 0, 
      req.user.id
    ]);

    res.status(201).json({
      message: 'Article created successfully',
      article: result.rows[0]
    });
  } catch (error) {
    console.error('Create article error:', error);
    if (error.message && error.message.includes('UNIQUE KEY')) {
      return res.status(400).json({ message: 'Slug must be unique' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, slug, content, category_id, is_published } = req.body;

    const query = `
      UPDATE knowledge_base_articles 
      SET title = $1, slug = $2, content = $3, category_id = $4, is_published = $5, updated_at = GETDATE()
      OUTPUT inserted.*
      WHERE id = $6
    `;
    
    const result = await db.query(query, [
      title, 
      slug, 
      content, 
      category_id || null, 
      is_published ? 1 : 0, 
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Article not found' });
    }

    res.json({
      message: 'Article updated successfully',
      article: result.rows[0]
    });
  } catch (error) {
    console.error('Update article error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `DELETE FROM knowledge_base_articles WHERE id = $1`;
    const result = await db.query(query, [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Article not found' });
    }

    res.json({ message: 'Article deleted successfully' });
  } catch (error) {
    console.error('Delete article error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
