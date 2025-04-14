document.addEventListener("DOMContentLoaded", () => {  
  // Welcome
  const welcomeScreen = document.getElementById("welcome-screen");
  const startButton = document.getElementById("start-button");
  const mainApp = document.getElementById("main-app");

  // Calendar elements
  const calendar = document.getElementById("calendar");
  const monthLabel = document.getElementById("month-label");
  const prevMonthBtn = document.getElementById("prev-month");
  const nextMonthBtn = document.getElementById("next-month");
  const taskModal = document.getElementById("task-modal");
  const taskInput = document.getElementById("task-input");
  const taskList = document.getElementById("task-list");
  const saveTaskBtn = document.getElementById("save-task");
  const clearAllBtn = document.getElementById("clear-all");
  const closeModalBtn = document.querySelector(".close");

  // Insert Bar elements
  const insertTaskDesc = document.getElementById("insert-task-desc");
  const insertDueDate = document.getElementById("insert-due-date");
  const insertTaskPriority = document.getElementById("insert-task-priority");
  const insertTaskBtn = document.getElementById("insert-task-btn");

  // Share Section elements
  const shareUsernameInput = document.getElementById("share-username");
  const shareBtn = document.getElementById("share-btn");

  let currentDate = new Date();
  let selectedDate = null;
  let tasks = {};

  startButton.addEventListener("click", () => {
      welcomeScreen.classList.add("hidden");
      mainApp.classList.remove("hidden");
      fetchTasks();
  });

  // Fetch tasks for the logged-in user, including shared tasks
  function fetchTasks() {
    const username = localStorage.getItem("username");
    fetch(`/api/tasks?username=${username}`)
        .then(response => response.json())
        .then(data => {
            tasks = data;
            renderCalendar();
        })
        .catch(error => console.error("Error fetching tasks:", error));
  }

  // Render the calendar with days and task indicators
  function renderCalendar() {
      calendar.innerHTML = "";
      monthLabel.textContent = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

      let firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
      let daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

      for (let i = 0; i < firstDay; i++) {
          let emptyCell = document.createElement("div");
          emptyCell.classList.add("empty");
          calendar.appendChild(emptyCell);
      }

      for (let day = 1; day <= daysInMonth; day++) {
          let dayCell = document.createElement("div");
          let dateKey = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${day}`;
          dayCell.textContent = day;
          dayCell.dataset.date = dateKey;
          dayCell.classList.add("day");

          if (tasks[dateKey] && tasks[dateKey].length > 0) {
              let taskIndicator = document.createElement("span");
              taskIndicator.textContent = ` - Tasks: ${tasks[dateKey].length} `;
              dayCell.appendChild(taskIndicator);
              dayCell.classList.add("has-task");

              let highestPriority = tasks[dateKey].reduce((max, task) => {
                  if (task.priority == "high") return "high";
                  if (task.priority == "medium" && max != "high") return "medium";
                  return max;
              }, "low");

              if (highestPriority == "high") {
                  dayCell.classList.add("high-priority");
              } else if (highestPriority == "medium") {
                  dayCell.classList.add("medium-priority");
              } else {
                  dayCell.classList.add("low-priority");
              }
          }

          dayCell.addEventListener("click", () => openTaskModal(dateKey));
          calendar.appendChild(dayCell);
      }
  }

  // Open modal to view/add tasks for a selected date
  function openTaskModal(date) {
    selectedDate = date;
    taskInput.value = "";
    taskList.innerHTML = "";

    if (tasks[date] && tasks[date].length > 0) {
        tasks[date].forEach((task, index) => {
            let taskItem = document.createElement("li");
            taskItem.textContent = task.owner ? `${task.name} (Priority: ${task.priority}, from ${task.owner})` : `${task.name} (Priority: ${task.priority})`;

            // Only allow deletion if the task belongs to the logged-in user
            if (!task.owner) {
              let deleteBtn = document.createElement("button");
              deleteBtn.textContent = "❌";
              deleteBtn.onclick = () => deleteTask(date, index);
              taskItem.appendChild(deleteBtn);
            }
            taskList.appendChild(taskItem);
        });
    }

    taskModal.classList.remove("hidden");
  }

  closeModalBtn.addEventListener("click", () => {
    taskModal.classList.add("hidden");
  });

  // Save new task from modal
  saveTaskBtn.onclick = () => {
      const username = localStorage.getItem("username");
      if (selectedDate) {
          let taskName = taskInput.value.trim();
          let taskPriority = document.getElementById("task-priority").value;

          if (taskName) {
              fetch("/api/tasks", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ 
                      username,
                      date: selectedDate, 
                      name: taskName, 
                      priority: taskPriority 
                  })
              }).then(response => response.json())
                .then(() => {
                    fetchTasks();
                    taskInput.value = "";
                    document.getElementById("task-priority").value = "low";
                });
              renderCalendar();
          }
      }
  };

  // Delete a specific task (only for tasks owned by the logged-in user)
  function deleteTask(date, index) {
      const username = localStorage.getItem("username");
      fetch(`/api/tasks/${username}/${date}/${index}`, {
          method: "DELETE"
      }).then(fetchTasks);
  }

  // Clear all tasks for a specific date (only for the logged-in user's tasks)
  clearAllBtn.onclick = () => {
    if (selectedDate) {
        const username = localStorage.getItem("username");
        fetch(`/api/tasks/${username}/${selectedDate}`, {
            method: "DELETE"
        }).then(response => {
            if (!response.ok) {
                console.error("No tasks found for this date.");
            }
            fetchTasks();
        });
    }
  };

  prevMonthBtn.addEventListener("click", () => {
      currentDate.setMonth(currentDate.getMonth() - 1);
      renderCalendar();
  });

  nextMonthBtn.addEventListener("click", () => {
      currentDate.setMonth(currentDate.getMonth() + 1);
      renderCalendar();
  });

  // Helper function to format date key (from "YYYY-MM-DD" to "YYYY-M-D")
  function formatDateKey(dateString) {
    const parts = dateString.split('-');
    if (parts.length === 3) {
        return `${parseInt(parts[0])}-${parseInt(parts[1])}-${parseInt(parts[2])}`;
    }
    return dateString;
  }

  // Add task using the Insert Bar
  insertTaskBtn.addEventListener("click", () => {
    const username = localStorage.getItem("username");
    const desc = insertTaskDesc.value.trim();
    const dueDate = insertDueDate.value;
    const priority = insertTaskPriority.value;
    
    if (!desc || !dueDate) {
        alert("Please enter both a task description and a due date.");
        return;
    }
    
    const formattedDate = formatDateKey(dueDate);
    
    fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username,
            date: formattedDate,
            name: desc,
            priority: priority
        })
    })
    .then(response => response.json())
    .then(() => {
         fetchTasks();
         insertTaskDesc.value = "";
         insertDueDate.value = "";
         insertTaskPriority.value = "low";
    })
    .catch(error => console.error("Error adding task:", error));
  });

  // Share calendar: send a request to share the logged-in user's calendar with another user.
  shareBtn.addEventListener("click", () => {
    const sharer = localStorage.getItem("username");
    const recipient = shareUsernameInput.value.trim();

    if (!recipient) {
      alert("Please enter a username to share with.");
      return;
    }

    fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sharer, recipient })
    })
    .then(response => response.json())
    .then(result => {
      if (result.error) {
        alert("Error: " + result.error);
      } else {
        alert(result.message);
        shareUsernameInput.value = "";
      }
    })
    .catch(error => {
      alert("An error occurred while sharing the calendar.");
      console.error("Error sharing calendar:", error);
    });
  });

});
