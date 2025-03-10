const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');

app.use(cors());
app.use(bodyParser.json());

let tasks = [{ id: 1, name: "Sample Task" }];

// Serve static files locally
const path = require('path');
app.use(express.static(path.join(__dirname, '../html')));

app.get('/api', (req, res) => {
    res.json(tasks);
});

app.post('/api', (req, res) => {
    if (!req.body.name) {
        return res.status(400).json({ error: "Task name is required" });
    }
    const newTask = { id: Date.now(), name: req.body.name };
    tasks.push(newTask);
    res.json(newTask);
});

app.put('/api/:id', (req, res) => {
    const task = tasks.find(t => t.id == req.params.id);
    if (task) {
        if (!req.body.name) {
            return res.status(400).json({ error: "Task name is required" });
        }
        task.name = req.body.name;
        res.json(task);
    } else {
        res.status(404).send('Task not found');
    }
});

app.delete('/api/:id', (req, res) => {
    const initialLength = tasks.length;
    tasks = tasks.filter(t => t.id != req.params.id);
    
    if (tasks.length === initialLength) {
        return res.status(404).json({ error: "Task not found" });
    }
    
    res.json({ message: 'Deleted' });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running locally on http://localhost:${PORT}`));
