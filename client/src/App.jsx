
import { useState, useEffect } from 'react'
import './App.css'

const API_URL = 'https://intern-task-tracker-api.onrender.com/api/tasks'

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

  // GET: Fetch tasks
  useEffect(() => {
    async function fetchTasks() {
      try {
        setLoading(true)
        setError('')

        const response = await fetch(API_URL)

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

  // Handle form changes
  function handleChange(event) {
    const { name, value } = event.target

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }))
  }

  // POST: Create task / PUT: Update task
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

      const isEditing = editingId !== null

      const response = await fetch(
        isEditing ? `${API_URL}/${editingId}` : API_URL,
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(taskData),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ||
          (isEditing ? 'Failed to update task.' : 'Failed to create task.')
        )
      }

      if (isEditing) {
        setTasks((previousTasks) =>
          previousTasks.map((task) =>
            task.id === editingId ? result : task
          )
        )
      } else {
        setTasks((previousTasks) => [
          result,
          ...previousTasks,
        ])
      }

      setFormData(emptyForm)
      setEditingId(null)

    } catch (error) {
      setError(error.message)
    }
  }

  // Load task into form for editing
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

  // DELETE: Delete task
  async function handleDelete(id) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this task?'
    )

    if (!confirmed) return

    try {
      setError('')

      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        let result = {}

        try {
          result = await response.json()
        } catch {
          // Ignore an empty error response
        }

        throw new Error(result.error || 'Failed to delete task.')
      }

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

  // Search and filter
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

    return matchesSearch && matchesStatus && matchesPriority
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

      {/* SIDEBAR */}
      <aside className="sidebar">

        <div className="brand">
          <span className="brand-icon">✓</span>
          <span>TaskFlow</span>
        </div>

        <p className="sidebar-label">WORKSPACE</p>

        <a className="nav-link active" href="#dashboard">
          ▦ Dashboard
        </a>

        <a className="nav-link" href="#create-task">
          ＋ Create Task
        </a>

        <a className="nav-link" href="#my-tasks">
          ☷ My Tasks
        </a>

        <div className="sidebar-bottom">
          <div className="profile-icon">R</div>
          <div>
            <strong>My Workspace</strong>
            <small>Personal task manager</small>
          </div>
        </div>

      </aside>

      {/* MAIN CONTENT */}
      <div className="app-content">

        {/* HEADER */}
        <header className="topbar">
          <div>
            <h1>Intern Task Tracker</h1>
            <p>Organize your work. Track your progress.</p>
          </div>

          <span className="workspace-badge">
            ● Workspace
          </span>
        </header>

        <main className="main-content">

          {/* WELCOME */}
          <section className="welcome-section" id="dashboard">
            <div>
              <p className="eyebrow">YOUR WORKSPACE</p>
              <h2>Welcome back! 👋</h2>
              <p>Here's an overview of your tasks and progress.</p>
            </div>
          </section>

          {/* DASHBOARD */}
          <section className="dashboard">

            <div className="section-heading">
              <div>
                <h2>Overview</h2>
                <span>All your tasks at a glance</span>
              </div>
            </div>

            <div className="summary-cards">

              <article className="summary-card total-card">
                <div className="stat-top">
                  <span>Total Tasks</span>
                  <span className="stat-icon">▦</span>
                </div>
                <p>{totalTasks}</p>
                <small>Tasks created</small>
              </article>

              <article className="summary-card pending-card">
                <div className="stat-top">
                  <span>Pending</span>
                  <span className="stat-icon">◷</span>
                </div>
                <p>{pendingTasks}</p>
                <small>Waiting to start</small>
              </article>

              <article className="summary-card progress-card">
                <div className="stat-top">
                  <span>In Progress</span>
                  <span className="stat-icon">↗</span>
                </div>
                <p>{inProgressTasks}</p>
                <small>Currently working</small>
              </article>

              <article className="summary-card completed-card">
                <div className="stat-top">
                  <span>Completed</span>
                  <span className="stat-icon">✓</span>
                </div>
                <p>{completedTasks}</p>
                <small>Successfully finished</small>
              </article>

            </div>
          </section>

          {/* CREATE / EDIT TASK */}
          <section className="task-form-section" id="create-task">

            <div className="section-heading">
              <div>
                <h2>
                  {editingId !== null ? 'Edit Task' : 'Create New Task'}
                </h2>
                <span>Fill in the details to manage your work.</span>
              </div>

              {editingId !== null && (
                <span className="editing-label">Editing task</span>
              )}
            </div>

            <form onSubmit={handleSubmit}>

              <div className="form-group">
                <label htmlFor="title">Task Title *</label>
                <input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  maxLength={100}
                  placeholder="e.g. Complete React project"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="What needs to be done?"
                  rows={3}
                />
              </div>

              <div className="form-row">

                <div className="form-group">
                  <label htmlFor="domain">Domain</label>
                  <input
                    id="domain"
                    name="domain"
                    value={formData.domain}
                    onChange={handleChange}
                    placeholder="e.g. Frontend"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="priority">Priority</label>
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
                  <label htmlFor="due_date">Due Date *</label>
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

              <div className="form-row form-bottom-row">

                <div className="form-group">
                  <label htmlFor="status">Status</label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div className="form-buttons">
                  <button type="submit" className="primary-button">
                    {editingId !== null ? 'Save Changes' : '+ Create Task'}
                  </button>

                  {editingId !== null && (
                    <button
                      type="button"
                      className="cancel-button"
                      onClick={cancelEdit}
                    >
                      Cancel
                    </button>
                  )}
                </div>

              </div>

            </form>
          </section>

          {/* TASK LIST */}
          <section className="tasks-section" id="my-tasks">

            <div className="section-heading">
              <div>
                <h2>My Tasks</h2>
                <span>Manage and track your work.</span>
              </div>

              <span className="task-count">
                {filteredTasks.length} tasks
              </span>
            </div>

            {/* SEARCH AND FILTERS */}
            <div className="task-filters">

              <input
                type="search"
                placeholder="⌕  Search tasks by title..."
                aria-label="Search tasks by title"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />

              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>

              <select
                aria-label="Filter by priority"
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
              >
                <option value="All">All Priorities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>

            </div>

            {/* TASK CARDS */}
            <div className="task-list">

              {loading ? (
                <p className="empty-state">Loading your tasks...</p>

              ) : error ? (
                <p className="error-state" role="alert">{error}</p>

              ) : filteredTasks.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">☷</span>
                  <h3>No tasks found</h3>
                  <p>Create a task or adjust your search and filters.</p>
                </div>

              ) : (
                filteredTasks.map((task) => (

                  <article className="task-card" key={task.id}>

                    <div className="task-card-heading">
                      <div>
                        <span className="task-domain">
                          {task.domain || 'GENERAL'}
                        </span>
                        <h3>{task.title}</h3>
                      </div>

                      <span
                        className={`status status-${task.status
                          .toLowerCase()
                          .replace(' ', '-')}`}
                      >
                        {task.status}
                      </span>
                    </div>

                    <p className="task-description">
                      {task.description || 'No description provided.'}
                    </p>

                    <div className="task-details">

                      <span className={`priority priority-${task.priority.toLowerCase()}`}>
                        ● {task.priority} Priority
                      </span>

                      <span>◷ Due: {task.due_date}</span>

                    </div>

                    <div className="task-actions">

                      <button
                        type="button"
                        className="edit-button"
                        onClick={() => handleEdit(task)}
                      >
                        ✎ Edit
                      </button>

                      <button
                        type="button"
                        className="delete-button"
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

          <footer className="footer">
            Intern Task Tracker <span>•</span> Built to organize your workflow
          </footer>

        </main>
      </div>
    </div>
  )
}

export default App
