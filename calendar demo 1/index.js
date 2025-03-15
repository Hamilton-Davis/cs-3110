// server.js (Backend)
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const tasksFile = path.join(__dirname, 'tasks.json');

// Helper function to read tasks
const readTasks = () => {
    if (!fs.existsSync(tasksFile)) return {};
    return JSON.parse(fs.readFileSync(tasksFile, 'utf8'));
};

// Helper function to write tasks
const writeTasks = (tasks) => {
    fs.writeFileSync(tasksFile, JSON.stringify(tasks, null, 2));
};

// Authentication Middleware
const authenticate = (req, res, next) => {
    const { username, password } = req.body;
    if (username === 'Admin' && password === 'Password') {
        return next(); // Bypass authentication for universal credentials
    }
    // Implement additional authentication logic if needed
    res.status(401).json({ error: 'Unauthorized' });
};

// Fetch tasks
app.get('/api/tasks', (req, res) => {
    res.json(readTasks());
});

// Add a task
app.post('/api/tasks', (req, res) => {
    const { date, name } = req.body;
    let tasks = readTasks();
    if (!tasks[date]) tasks[date] = [];
    tasks[date].push(name);
    writeTasks(tasks);
    res.json({ success: true });
});

// Delete a specific task
app.delete('/api/tasks/:date/:index', (req, res) => {
    const { date, index } = req.params;
    let tasks = readTasks();
    if (tasks[date]) {
        tasks[date].splice(index, 1);
        if (tasks[date].length === 0) delete tasks[date];
        writeTasks(tasks);
    }
    res.json({ success: true });
});

// Clear all tasks
app.delete('/api/tasks', (req, res) => {
    writeTasks({});
    res.json({ success: true });
});

// Login endpoint
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'Admin' && password === 'Password') {
        return res.json({ success: true, message: 'Universal login successful' });
    }
    res.status(401).json({ error: 'Invalid credentials' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
