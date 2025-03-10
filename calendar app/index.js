// server.js (Backend)
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;
const TASKS_FILE = path.join(__dirname, 'tasks.json');

let tasks = {};

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Load tasks from file
if (fs.existsSync(TASKS_FILE)) {
    const data = fs.readFileSync(TASKS_FILE, 'utf8');
    tasks = JSON.parse(data);
}

const saveTasks = () => {
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
};

// Get all tasks
app.get('/api/tasks', (req, res) => {
    res.json(tasks);
});

// Create or update a task
app.post('/api/tasks', (req, res) => {
    const { date, name } = req.body;
    if (!date || !name) {
        return res.status(400).json({ error: 'Date and task name are required' });
    }
    if (!tasks[date]) {
        tasks[date] = [];
    }
    tasks[date].push(name);
    saveTasks();
    res.status(201).json({ date, name });
});

// Delete a task
app.delete('/api/tasks/:date/:taskIndex', (req, res) => {
    const { date, taskIndex } = req.params;
    if (tasks[date] && tasks[date][taskIndex]) {
        tasks[date].splice(taskIndex, 1);
        if (tasks[date].length === 0) {
            delete tasks[date];
        }
        saveTasks();
        res.json({ message: 'Deleted' });
    } else {
        res.status(404).json({ error: 'Task not found' });
    }
});

// Delete all tasks
app.delete('/api/tasks', (req, res) => {
    tasks = {};
    saveTasks();
    res.json({ message: 'All tasks cleared' });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
