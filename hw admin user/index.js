const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const users = [
    { username: 'admin', password: bcrypt.hashSync('admin123', 10), role: 'admin' },
    { username: 'author', password: bcrypt.hashSync('author123', 10), role: 'author' }
];

const secretKey = 'supersecretkey';

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username);

    if (user && bcrypt.compareSync(password, user.password)) {
        const token = jwt.sign({ username: user.username, role: user.role }, secretKey);
        return res.json({ message: 'Login successful', token, role: user.role });
    }
    res.status(401).json({ message: 'Invalid credentials' });
});

app.get('/api/users', (req, res) => {
    res.json(users.map(u => ({ username: u.username, role: u.role })));
});

app.post('/api/users', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(403).json({ message: 'No token provided' });

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, secretKey);
        if (decoded.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });

        const { username, password, role } = req.body;
        users.push({ username, password: bcrypt.hashSync(password, 10), role });
        res.json({ message: 'User added' });
    } catch {
        res.status(403).json({ message: 'Invalid token' });
    }
});

app.delete('/api/users/:username', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(403).json({ message: 'No token provided' });

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, secretKey);
        if (decoded.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });

        const index = users.findIndex(u => u.username === req.params.username);
        if (index !== -1) {
            users.splice(index, 1);
            res.json({ message: 'User deleted' });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch {
        res.status(403).json({ message: 'Invalid token' });
    }
});

// In-memory tasks list
let tasks = [
  { id: 1, description: 'Demo task one' },
  { id: 2, description: 'Demo task two' }
];

// GET endpoint that loads tasks without authentication
app.get('/api/tasks', (req, res) => {
  res.json(tasks);
});

// POST endpoint to create a new task (authenticated)
app.post('/api/tasks', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    jwt.verify(token, secretKey);
    const { description } = req.body;
    const newTask = { id: tasks.length ? tasks[tasks.length - 1].id + 1 : 1, description };
    tasks.push(newTask);
    res.status(200).json({ message: 'Task created', task: newTask });
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// PUT endpoint to update an existing task (authenticated)
app.put('/api/tasks/:id', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    jwt.verify(token, secretKey);
    const taskId = parseInt(req.params.id);
    const { description } = req.body;
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    task.description = description;
    res.json({ message: 'Task updated', task });
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// DELETE endpoint to remove a task (authenticated)
app.delete('/api/tasks/:id', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    jwt.verify(token, secretKey);
    const taskId = parseInt(req.params.id);
    const index = tasks.findIndex(t => t.id === taskId);
    if (index === -1) {
      return res.status(404).json({ message: 'Task not found' });
    }
    tasks.splice(index, 1);
    res.json({ message: 'Task deleted' });
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
});


app.listen(3000, () => console.log('Server running on port 3000'));