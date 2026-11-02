
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to Neon PostgreSQL.
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing. Check your server/.env file.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Create the tasks table.
async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title VARCHAR(100) NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      domain TEXT NOT NULL DEFAULT '',
      priority TEXT NOT NULL DEFAULT 'Medium'
        CHECK(priority IN ('Low', 'Medium', 'High')),
      due_date DATE NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending'
        CHECK(status IN ('Pending', 'In Progress', 'Completed')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('PostgreSQL database connected and initialized.');
}

const validPriorities = ['Low', 'Medium', 'High'];
const validStatuses = ['Pending', 'In Progress', 'Completed'];

// Validate incoming task data.
function validateTask(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return 'Request body must be a JSON object.';
  }

  if (typeof data.title !== 'string' || !data.title.trim()) {
    return 'Title is required.';
  }

  if (data.title.trim().length > 100) {
    return 'Title cannot exceed 100 characters.';
  }

  if (
    data.description !== undefined &&
    typeof data.description !== 'string'
  ) {
    return 'Description must be text.';
  }

  if (
    data.domain !== undefined &&
    typeof data.domain !== 'string'
  ) {
    return 'Domain must be text.';
  }

  if (!validPriorities.includes(data.priority ?? 'Medium')) {
    return 'Priority must be Low, Medium, or High.';
  }

  if (!validStatuses.includes(data.status ?? 'Pending')) {
    return 'Status must be Pending, In Progress, or Completed.';
  }

  if (
    typeof data.due_date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(data.due_date)
  ) {
    return 'A due date in YYYY-MM-DD format is required.';
  }

  const date = new Date(`${data.due_date}T00:00:00Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== data.due_date
  ) {
    return 'Due date is invalid.';
  }

  return null;
}

// GET: Retrieve all tasks.
app.get('/api/tasks', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM tasks ORDER BY id DESC'
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not retrieve tasks.' });
  }
});

// POST: Create a new task.
app.post('/api/tasks', async (req, res) => {
  try {
    const error = validateTask(req.body);

    if (error) {
      return res.status(400).json({ error });
    }

    const task = req.body;

    const result = await pool.query(
      `INSERT INTO tasks
        (title, description, domain, priority, due_date, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        task.title.trim(),
        (task.description ?? '').trim(),
        (task.domain ?? '').trim(),
        task.priority ?? 'Medium',
        task.due_date,
        task.status ?? 'Pending'
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not create task.' });
  }
});

// PUT: Update an existing task.
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid task ID.' });
    }

    const error = validateTask(req.body);

    if (error) {
      return res.status(400).json({ error });
    }

    const task = req.body;

    const result = await pool.query(
      `UPDATE tasks
       SET title = $1, description = $2, domain = $3,
           priority = $4, due_date = $5, status = $6
       WHERE id = $7
       RETURNING *`,
      [
        task.title.trim(),
        (task.description ?? '').trim(),
        (task.domain ?? '').trim(),
        task.priority ?? 'Medium',
        task.due_date,
        task.status ?? 'Pending',
        id
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not update task.' });
  }
});

// DELETE: Remove a task.
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid task ID.' });
    }

    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not delete task.' });
  }
});

// Handle malformed JSON and unexpected errors.
app.use((err, req, res, next) => {
  console.error(err.message);

  if (res.headersSent) {
    return next(err);
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body.' });
  }

  res.status(500).json({ error: 'Internal server error.' });
});

// Initialize database before starting the server.
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Database initialization failed:', error);
    process.exit(1);
  });

// Gracefully close database connections.
process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});
