
const express = require('express');
const cors = require('cors');
const { DatabaseSync } = require('node:sqlite');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to the SQLite database.
// The tasks.db file will be created automatically.
const db = new DatabaseSync('./tasks.db');

// Create the tasks table if it doesn't already exist.
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL CHECK(length(title) <= 100),
    description TEXT NOT NULL DEFAULT '',
    domain TEXT NOT NULL DEFAULT '',
    priority TEXT NOT NULL DEFAULT 'Medium'
      CHECK(priority IN ('Low', 'Medium', 'High')),
    due_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending'
      CHECK(status IN ('Pending', 'In Progress', 'Completed')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

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
app.get('/api/tasks', (req, res) => {
  try {
    const tasks = db
      .prepare('SELECT * FROM tasks ORDER BY id DESC')
      .all();

    res.json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not retrieve tasks.' });
  }
});

// POST: Create a new task.
app.post('/api/tasks', (req, res) => {
  try {
    const error = validateTask(req.body);

    if (error) {
      return res.status(400).json({ error });
    }

    const task = req.body;

    const result = db.prepare(`
      INSERT INTO tasks
        (title, description, domain, priority, due_date, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      task.title.trim(),
      (task.description ?? '').trim(),
      (task.domain ?? '').trim(),
      task.priority ?? 'Medium',
      task.due_date,
      task.status ?? 'Pending'
    );

    const createdTask = db
      .prepare('SELECT * FROM tasks WHERE id = ?')
      .get(Number(result.lastInsertRowid));

    res.status(201).json(createdTask);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not create task.' });
  }
});
app.put('/api/tasks/:id', (req, res) => {
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

    const result = db.prepare(`
      UPDATE tasks
      SET title = ?, description = ?, domain = ?,
          priority = ?, due_date = ?, status = ?
      WHERE id = ?
    `).run(
      task.title.trim(),
      (task.description ?? '').trim(),
      (task.domain ?? '').trim(),
      task.priority ?? 'Medium',
      task.due_date,
      task.status ?? 'Pending',
      id
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const updatedTask = db
      .prepare('SELECT * FROM tasks WHERE id = ?')
      .get(id);

    res.json(updatedTask);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not update task.' });
  }
});

// DELETE: Remove a task.
app.delete('/api/tasks/:id', (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid task ID.' });
    }

    const result = db
      .prepare('DELETE FROM tasks WHERE id = ?')
      .run(id);

    if (result.changes === 0) {
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

// Start the backend server.
app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
