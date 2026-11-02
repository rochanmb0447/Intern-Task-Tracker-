
import { useState, useEffect } from 'react'
import './App.css'

const emptyForm = {
  title: '',
  description: '',
  domain: '',
  priority: 'Medium',
  due_date: '',
  status: 'Pending',
}

function App() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState(emptyForm)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [editingId, setEditingId] = useState(null)

  // GET: Fetch tasks from the backend
  useEffect(() => {
    async function fetchTasks() {
      try {
        setLoading(true)
        setError('')

        const response = await fetch(
          'https://intern-task-tracker-api.onrender.com'
        )

        if (!response.ok) {
          throw new Error('Failed to fetch tasks.')
        }

        const data = await response.json()
        setTasks(data)
      } catch (error) {
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()
  }, [])

  // Handle form input changes
  function handleChange(event) {
    const { name, value } = event.target

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }))
  }

  // POST: Create task and PUT: Update task
  async function handleSubmit(event) {
    event.preventDefault()

    if (!formData.title.trim()) {
      alert('Please enter a task title.')
      return
    }

    if (!formData.due_date) {
      alert('Please select a due date.')
      return
    }

    const taskData = {
      ...formData,
      title: formData.title.trim(),
      description: formData.description.trim(),
      domain: formData.domain.trim(),
    }

    try {
      setError('')

      if (editingId !== null) {
        // PUT: Update an existing task
        const response = await fetch(
          `https://intern-task-tracker-api.onrender.com/api/tasks/${editingId}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(taskData),
          }
        )

        const result = await response.json()

        if (!response.ok) {
          throw new Error(
            result.error || 'Failed to update task.'
          )
        }

        setTasks((previousTasks) =>
          previousTasks.map((task) =>
            task.id === editingId ? result : task
          )
        )

      } else {
        // POST: Create a new task
        const response = await fetch(
          'https://intern-task-tracker-api.onrender.com/api/tasks',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(taskData),
          }
        )

        const result = await response.json()

        if (!response.ok) {
          throw new Error(
            result.error || 'Failed to create task.'
          )
        }

        setTasks((previousTasks) => [
          ...previousTasks,
          result,
        ])
      }

      // Reset form after successful operation
      setFormData(emptyForm)
      setEditingId(null)

    } catch (error) {
      setError(error.message)
    }
  }

  // Load selected task into the form for editing
  function handleEdit(task) {
    setFormData({
      title: task.title,
      description: task.description || '',
      domain: task.domain || '',
      priority: task.priority,
      due_date: task.due_date,
      status: task.status,
    })

    setEditingId(task.id)

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  // DELETE: Remove task from the backend
  async function handleDelete(id) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this task?'
    )

    if (!confirmed) return

    try {
      setError('')

      const response = await fetch(
        `https://intern-task-tracker-api.onrender.com/api/tasks/${id}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        const result = await response.json()

        throw new Error(
          result.error || 'Failed to delete task.'
        )
      }

      // Update frontend only after successful deletion
      setTasks((previousTasks) =>
        previousTasks.filter((task) => task.id !== id)
      )

      if (editingId === id) {
        setEditingId(null)
        setFormData(emptyForm)
      }

    } catch (error) {
      setError(error.message)
    }
  }

  // Cancel editing
  function cancelEdit() {
    setEditingId(null)
    setFormData(emptyForm)
  }

  // Search and filter tasks
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title
      .toLowerCase()
      .includes(search.trim().toLowerCase())

    const matchesStatus =
      statusFilter === 'All' ||
      task.status === statusFilter

    const matchesPriority =
      priorityFilter === 'All' ||
      task.priority === priorityFilter

    return (
      matchesSearch &&
      matchesStatus &&
      matchesPriority
    )
  })

  // Dashboard calculations
  const totalTasks = tasks.length

  const pendingTasks = tasks.filter(
    (task) => task.status === 'Pending'
  ).length

  const inProgressTasks = tasks.filter(
    (task) => task.status === 'In Progress'
  ).length

  const completedTasks = tasks.filter(
    (task) => task.status === 'Completed'
  ).length

  return (
    <div className="app">

      {/* Header */}
      <header className="header">
        <h1>Intern Task Tracker</h1>
        <p>Organize your work. Track your progress.</p>
      </header>

      <main className="main-content">

        {/* Dashboard */}
        <section className="dashboard">
          <h2>Dashboard</h2>

          <div className="summary-cards">

            <article className="summary-card">
              <h3>Total Tasks</h3>
              <p>{totalTasks}</p>
            </article>

            <article className="summary-card">
              <h3>Pending</h3>
              <p>{pendingTasks}</p>
            </article>

            <article className="summary-card">
              <h3>In Progress</h3>
              <p>{inProgressTasks}</p>
            </article>

            <article className="summary-card">
              <h3>Completed</h3>
              <p>{completedTasks}</p>
            </article>

          </div>
        </section>

        {/* Create / Edit Task Form */}
        <section className="task-form-section">

          <h2>
            {editingId !== null
              ? 'Edit Task'
              : 'Create a Task'}
          </h2>

          <form onSubmit={handleSubmit}>

            <div className="form-group">
              <label htmlFor="title">
                Task Title *
              </label>

              <input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                maxLength={100}
                placeholder="e.g. Learn React basics"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">
                Description
              </label>

              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe your task"
                rows={3}
              />
            </div>

            <div className="form-group">
              <label htmlFor="domain">
                Domain
              </label>

              <input
                id="domain"
                name="domain"
                value={formData.domain}
                onChange={handleChange}
                placeholder="e.g. Frontend"
              />
            </div>

            <div className="form-row">

              <div className="form-group">
                <label htmlFor="priority">
                  Priority
                </label>

                <select
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="due_date">
                  Due Date *
                </label>

                <input
                  id="due_date"
                  name="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={handleChange}
                  required
                />
              </div>

            </div>

            <div className="form-group">
              <label htmlFor="status">
                Status
              </label>

              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">
                  In Progress
                </option>
                <option value="Completed">
                  Completed
                </option>
              </select>
            </div>

            <button type="submit">
              {editingId !== null
                ? 'Save Changes'
                : 'Create Task'}
            </button>

            {editingId !== null && (
              <button
                type="button"
                onClick={cancelEdit}
              >
                Cancel Edit
              </button>
            )}

          </form>
        </section>

        {/* My Tasks */}
        <section className="tasks-section">

          <div className="tasks-heading">
            <div>
              <h2>My Tasks</h2>
              <p>Manage and track your tasks.</p>
            </div>

            <span className="task-count">
              {filteredTasks.length} shown
            </span>
          </div>

          {/* Search and Filters */}
          <div className="task-filters">

            <input
              type="search"
              placeholder="Search tasks by title..."
              aria-label="Search tasks by title"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />

            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">
                In Progress
              </option>
              <option value="Completed">Completed</option>
            </select>

            <select
              aria-label="Filter by priority"
              value={priorityFilter}
              onChange={(event) =>
                setPriorityFilter(event.target.value)
              }
            >
              <option value="All">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>

          </div>

          {/* Task List */}
          <div className="task-list">

            {loading ? (
              <p>Loading tasks...</p>

            ) : error ? (
              <p role="alert">{error}</p>

            ) : filteredTasks.length === 0 ? (
              <p>
                No tasks found. Try changing your search
                or filters.
              </p>

            ) : (
              filteredTasks.map((task) => (

                <article
                  className="task-card"
                  key={task.id}
                >

                  <div className="task-card-heading">

                    <h3>{task.title}</h3>

                    <span
                      className={`status status-${task.status
                        .toLowerCase()
                        .replace(' ', '-')}`}
                    >
                      {task.status}
                    </span>

                  </div>

                  <p className="task-description">
                    {task.description ||
                      'No description provided.'}
                  </p>

                  <div className="task-details">

                    <span>
                      Domain: {task.domain || 'Not specified'}
                    </span>

                    <span
                      className={`priority priority-${task.priority.toLowerCase()}`}
                    >
                      {task.priority} Priority
                    </span>

                    <span>
                      Due: {task.due_date}
                    </span>

                  </div>

                  <div className="task-actions">

                    <button
                      type="button"
                      onClick={() => handleEdit(task)}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(task.id)}
                    >
                      Delete
                    </button>

                  </div>

                </article>

              ))
            )}

          </div>

        </section>

      </main>
    </div>
  )
}

export default App
