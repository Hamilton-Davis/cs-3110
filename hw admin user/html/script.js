let token = null;
let isAdmin = false;

async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const response = await fetch('/api/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ username, password })
    });

    const result = await response.json();
    document.getElementById('login-message').textContent = result.message;

    if (response.ok) {
        token = result.token;
        isAdmin = result.role === 'admin';
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('users-container').style.display = 'block';
        if (isAdmin) {
            document.getElementById('admin-container').style.display = 'block';
        }
        loadUsers();
    }
}

async function loadUsers() {
    const response = await fetch('/api/users');
    const users = await response.json();
    renderUserList(users);
}

function renderUserList(users) {
    const userList = document.getElementById('users-list');
    userList.innerHTML = '';
    users.forEach(user => {
        const li = document.createElement('li');
        li.textContent = `${user.username} - ${user.role}`;

        if (isAdmin && user.role !== 'admin') {
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Remove';
            deleteBtn.style.marginLeft = '10px';
            deleteBtn.onclick = () => deleteUser(user.username);
            li.appendChild(deleteBtn);
        }

        userList.appendChild(li);
    });
}

async function addUser() {
    const newUser = document.getElementById('new-username').value;
    const newPassword = document.getElementById('new-password').value;
    const newRole = document.getElementById('new-role').value;

    const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username: newUser, password: newPassword, role: newRole })
    });

    if (response.ok) {
        loadUsers();
    }
}

async function deleteUser(username) {
    const response = await fetch(`/api/users/${username}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (response.ok) loadUsers();
}

// Load tasks from the server (unauthenticated GET)
async function loadTasks() {
    try {
      const response = await fetch('/api/tasks');
      const tasks = await response.json();
      renderTasks(tasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  }
  
  // Render tasks with Edit and Delete buttons
  function renderTasks(tasks) {
    const tasksList = document.getElementById('tasks-list');
    tasksList.innerHTML = '';
    tasks.forEach(task => {
      const li = document.createElement('li');
      li.textContent = task.description;
  
      // Edit button
      const editBtn = document.createElement('button');
      editBtn.textContent = 'Edit';
      editBtn.style.marginLeft = '10px';
      editBtn.onclick = () => {
        const newDescription = prompt('Edit task description:', task.description);
        if (newDescription && newDescription !== task.description) {
          editTask(task.id, newDescription);
        }
      };
  
      // Delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.style.marginLeft = '10px';
      deleteBtn.onclick = () => {
        if (confirm('Are you sure you want to delete this task?')) {
          deleteTask(task.id);
        }
      };
  
      li.appendChild(editBtn);
      li.appendChild(deleteBtn);
      tasksList.appendChild(li);
    });
  }
  
  // Add a new task (authenticated POST)
  async function addTask() {
    const newTaskInput = document.getElementById('new-task');
    const description = newTaskInput.value;
    if (!description) return;
  
    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ description })
    });
  
    if (response.ok) {
      newTaskInput.value = '';
      loadTasks();
    } else {
      alert('Failed to add task. Make sure you are logged in.');
    }
  }
  
  // Edit an existing task (authenticated PUT)
  async function editTask(taskId, description) {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ description })
    });
  
    if (response.ok) {
      loadTasks();
    } else {
      alert('Failed to edit task. Make sure you are logged in.');
    }
  }
  
  // Delete a task (authenticated DELETE)
  async function deleteTask(taskId) {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (response.ok) {
      loadTasks();
    } else {
      alert('Failed to delete task. Make sure you are logged in.');
    }
  }
  
  // Load tasks on page load
  window.addEventListener('load', loadTasks);
  