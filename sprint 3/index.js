#!/usr/bin/env node

// server.js (Backend)
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;

const app = express();
const PORT = 3000;
const TASKS_FILE = path.join(__dirname, 'tasks.json');
const USERS_FILE = path.join(__dirname, 'users.json');
const SHARES_FILE = path.join(__dirname, 'shares.json');

let tasks = {};   // tasks[username][date] = [{ name, priority }]
let users = {};
let shares = {};  // shares[recipient] = [ sharer1, sharer2, ... ]

// Load users if exists
if (fs.existsSync(USERS_FILE)) {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    users = JSON.parse(data);
}
const saveUsers = () => {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

// Load tasks if exists
if (fs.existsSync(TASKS_FILE)) {
    const data = fs.readFileSync(TASKS_FILE, 'utf8');
    tasks = JSON.parse(data);
}
const saveTasks = () => {
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
};

// Load shares if exists
if (fs.existsSync(SHARES_FILE)) {
    const data = fs.readFileSync(SHARES_FILE, 'utf8');
    shares = JSON.parse(data);
}
const saveShares = () => {
    fs.writeFileSync(SHARES_FILE, JSON.stringify(shares, null, 2));
};

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

/* 
 * GET tasks for a specific user.
 * This endpoint returns the user’s own tasks merged with any tasks
 * from calendars that have been shared with them.
 * Tasks from a shared calendar include an extra "owner" property.
 * Example: GET /api/tasks?username=john_doe
 */
app.get('/api/tasks', (req, res) => {
    const { username } = req.query;
    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }
    let result = {};

    // User's own tasks
    if (tasks[username]) {
        result = { ...tasks[username] };
    }
    // Merge tasks from calendars shared with this user
    if (shares[username]) {
        shares[username].forEach(sharer => {
            if (tasks[sharer]) {
                Object.keys(tasks[sharer]).forEach(date => {
                    if (!result[date]) {
                        result[date] = [];
                    }
                    // Append each shared task with an "owner" field
                    const tasksWithOwner = tasks[sharer][date].map(task => ({
                        ...task,
                        owner: sharer
                    }));
                    result[date] = result[date].concat(tasksWithOwner);
                });
            }
        });
    }
    res.json(result);
});

// Create a task for a specific user
app.post('/api/tasks', (req, res) => {
    const { username, date, name, priority } = req.body;
    if (!username || !date || !name || !priority) {
        return res.status(400).json({ error: 'Username, date, task name, and priority are required' });
    }

    if (!tasks[username]) {
        tasks[username] = {};
    }
    if (!tasks[username][date]) {
        tasks[username][date] = [];
    }

    tasks[username][date].push({ name, priority });
    saveTasks();
    res.status(201).json({ username, date, name, priority });
});

// Delete a specific task for a user
app.delete('/api/tasks/:username/:date/:taskIndex', (req, res) => {
    const { username, date, taskIndex } = req.params;
    if (tasks[username] && tasks[username][date] && tasks[username][date][taskIndex]) {
        tasks[username][date].splice(taskIndex, 1);
        if (tasks[username][date].length === 0) {
            delete tasks[username][date];
        }
        saveTasks();
        res.json({ message: 'Deleted' });
    } else {
        res.status(404).json({ error: 'Task not found' });
    }
});

// Delete all tasks for a specific date for a user
app.delete('/api/tasks/:username/:date', (req, res) => {
    const { username, date } = req.params;
    if (tasks[username] && tasks[username][date]) {
        delete tasks[username][date];
        saveTasks();
        res.json({ message: `Tasks for ${date} cleared` });
    } else {
        res.status(404).json({ error: 'No tasks found for that date' });
    }
});

// Update a specific task for a user
app.put('/api/tasks/:username/:date/:taskIndex', (req, res) => {
  const { username, date, taskIndex } = req.params;
  const { name, priority } = req.body;

  if (tasks[username] && tasks[username][date] && tasks[username][date][taskIndex]) {
      tasks[username][date][taskIndex] = { name, priority };
      saveTasks();
      res.json({ message: 'Task updated' });
  } else {
      res.status(404).json({ error: 'Task not found' });
  }
});

// Register a new user
app.post('/api/users', async (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    if (users[username]) {
        return res.status(400).json({ error: 'Username already exists' });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        users[username] = { password: hashedPassword, role: role || "user" };
        saveUsers();
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error hashing password' });
    }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    if (!users[username]) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    try {
        const validPassword = await bcrypt.compare(password, users[username].password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        res.json({ message: 'Login successful', username, role: users[username].role });
    } catch (error) {
        res.status(500).json({ error: 'Error comparing passwords' });
    }
});

/*
 * Share calendar endpoint.
 * A sharer can share their calendar with a recipient if the recipient exists.
 * Endpoint: POST /api/share
 * Request body should include: { sharer, recipient }
 */
app.post('/api/share', (req, res) => {
    const { sharer, recipient } = req.body;
    if (!sharer || !recipient) {
        return res.status(400).json({ error: 'Both sharer and recipient are required' });
    }
    if (!users[recipient]) {
        return res.status(400).json({ error: 'Recipient user does not exist' });
    }
    // Initialize recipient's share list if needed
    if (!shares[recipient]) {
        shares[recipient] = [];
    }
    // Prevent duplicate sharing
    if (!shares[recipient].includes(sharer)) {
        shares[recipient].push(sharer);
        saveShares();
    }
    res.status(200).json({ message: `Calendar shared from ${sharer} to ${recipient}` });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
