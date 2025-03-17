#!/usr/bin/env node

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
    const { date, name, priority } = req.body;  // Now we get the priority too
    if (!date || !name || !priority) {  // Ensure priority is included
        return res.status(400).json({ error: 'Date, task name, and priority are required' });
    }

    // Initialize the date entry if it doesn't exist
    if (!tasks[date]) {
        tasks[date] = [];
    }

    // Push the task with both name and priority
    tasks[date].push({ name, priority });
    saveTasks();
    res.status(201).json({ date, name, priority });
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
