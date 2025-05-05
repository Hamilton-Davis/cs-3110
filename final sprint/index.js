#!/usr/bin/env node

const http = require('http');
const WebSocket = require('ws');


const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = 3000;

// const app = express();
// const PORT = 3000;
const TASKS_FILE = path.join(__dirname, 'tasks.json');
const USERS_FILE = path.join(__dirname, 'users.json');
const SHARES_FILE = path.join(__dirname, 'shares.json');

let tasks = {};   // tasks[username][date] = [{ name, priority, completed }]
let users = {};
let shares = {};  // shares[recipient] = [ sharer1, sharer2, ... ]

// Load users
if (fs.existsSync(USERS_FILE)) {
  users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}
const saveUsers = () =>
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

// Load tasks
if (fs.existsSync(TASKS_FILE)) {
  tasks = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
}
const saveTasks = () =>
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));

// Load shares
if (fs.existsSync(SHARES_FILE)) {
  shares = JSON.parse(fs.readFileSync(SHARES_FILE, 'utf8'));
}
const saveShares = () =>
  fs.writeFileSync(SHARES_FILE, JSON.stringify(shares, null, 2));

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// GET tasks (own + shared)
app.get('/api/tasks', (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Username is required' });

  let result = {};
  if (tasks[username]) result = { ...tasks[username] };

  if (shares[username]) {
    shares[username].forEach(sharer => {
      if (tasks[sharer]) {
        Object.entries(tasks[sharer]).forEach(([date, list]) => {
          result[date] = result[date] || [];
          const withOwner = list.map(t => ({ ...t, owner: sharer }));
          result[date].push(...withOwner);
        });
      }
    });
  }

  res.json(result);
});

// Create a task
app.post('/api/tasks', (req, res) => {
  const { username, date, name, priority } = req.body;
  if (!username || !date || !name || !priority) {
    return res.status(400).json({ error: 'Username, date, task name, and priority are required' });
  }
  tasks[username] = tasks[username] || {};
  tasks[username][date] = tasks[username][date] || [];
  tasks[username][date].push({ name, priority, completed: false });
  saveTasks();
  broadcastTaskUpdate({ username, date });
  res.status(201).json({ username, date, name, priority, completed: false });
});

// Delete a specific task
app.delete('/api/tasks/:username/:date/:taskIndex', (req, res) => {
  const { username, date, taskIndex } = req.params;
  if (tasks[username]?.[date]?.[taskIndex] != null) {
    tasks[username][date].splice(taskIndex, 1);
    if (!tasks[username][date].length) delete tasks[username][date];
    broadcastTaskUpdate({ username, date });

    saveTasks();
    broadcastTaskUpdate({ username, date });
    return res.json({ message: 'Deleted' });
  }
  res.status(404).json({ error: 'Task not found' });
});

// Clear all tasks on a date
app.delete('/api/tasks/:username/:date', (req, res) => {
  const { username, date } = req.params;
  if (tasks[username]?.[date]) {
    delete tasks[username][date];

    saveTasks();
    broadcastTaskUpdate({ username, date });
    return res.json({ message: `Tasks for ${date} cleared` });
  }
  res.status(404).json({ error: 'No tasks found for that date' });
});

// Update / complete a task
app.put('/api/tasks/:username/:date/:taskIndex', (req, res) => {
  const { username, date, taskIndex } = req.params;
  const { name, priority, completed, editor } = req.body;
  if (!editor) return res.status(400).json({ error: 'Editor is required' });

  const isOwner = editor === username;
  const isSharedEditor = shares[editor]?.includes(username);
  if (!(isOwner || isSharedEditor)
      || tasks[username]?.[date]?.[taskIndex] == null) {
    return res.status(403).json({ error: 'Permission denied or task not found' });
  }

  // merge updates
  const old = tasks[username][date][taskIndex];
  tasks[username][date][taskIndex] = {
    name: name ?? old.name,
    priority: priority ?? old.priority,
    completed: completed ?? old.completed
  };
  saveTasks();
  broadcastTaskUpdate({ username, date });
  res.json({ message: 'Task updated' });
});

// Register user
app.post('/api/users', async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  if (users[username]) {
    return res.status(400).json({ error: 'Username already exists' });
  }
  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    users[username] = { password: hash, role: role || 'user' };
    saveUsers();
    res.status(201).json({ message: 'User created successfully' });
  } catch {
    res.status(500).json({ error: 'Error hashing password' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });
  if (!users[username]) return res.status(401).json({ error: 'Invalid credentials' });
  try {
    const ok = await bcrypt.compare(password, users[username].password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ message: 'Login successful', username, role: users[username].role });
  } catch {
    res.status(500).json({ error: 'Error comparing passwords' });
  }
});

// Share calendar
app.post('/api/share', (req, res) => {
  const { sharer, recipient } = req.body;
  if (!sharer || !recipient) {
    return res.status(400).json({ error: 'Both sharer and recipient are required' });
  }
  if (!users[recipient]) {
    return res.status(400).json({ error: 'Recipient user does not exist' });
  }
  shares[recipient] = shares[recipient] || [];
  if (!shares[recipient].includes(sharer)) {
    shares[recipient].push(sharer);
    saveShares();
  }
  res.json({ message: `Calendar shared from ${sharer} to ${recipient}` });
});

function broadcastTaskUpdate(data) {
  const msg = JSON.stringify({ type: "update", data });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}


// app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));










