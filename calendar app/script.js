// script.js (Frontend Logic)
document.addEventListener("DOMContentLoaded", () => {
  const welcomeScreen = document.getElementById("welcome-screen");
  const startButton = document.getElementById("start-button");
  const mainApp = document.getElementById("main-app");
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

  let currentDate = new Date();
  let selectedDate = null;
  let tasks = {}; 

  startButton.addEventListener("click", () => {
      welcomeScreen.classList.add("hidden");
      mainApp.classList.remove("hidden");
      fetchTasks();
  });

  function fetchTasks() {
      fetch("/api/tasks")
          .then(response => response.json())
          .then(data => {
              tasks = data;
              renderCalendar();
          })
          .catch(error => console.error("Error fetching tasks:", error));
  }

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
              taskIndicator.textContent = `📌 ${tasks[dateKey].length} tasks`;
              dayCell.appendChild(taskIndicator);
              dayCell.classList.add("has-task");
          }

          dayCell.addEventListener("click", () => openTaskModal(dateKey));
          calendar.appendChild(dayCell);
      }
  }

  function openTaskModal(date) {
      selectedDate = date;
      taskInput.value = "";
      taskList.innerHTML = "";
      
      if (tasks[date] && tasks[date].length > 0) {
          tasks[date].forEach((task, index) => {
              let taskItem = document.createElement("li");
              taskItem.textContent = task;
              taskItem.classList.add("task-item");
              
              let deleteBtn = document.createElement("button");
              deleteBtn.textContent = "❌";
              deleteBtn.onclick = () => deleteTask(date, index);
              taskItem.appendChild(deleteBtn);
              
              taskList.appendChild(taskItem);
          });
      }
      
      taskModal.classList.remove("hidden");
  }

  saveTaskBtn.onclick = () => {
      if (selectedDate) {
          let taskName = taskInput.value.trim();
          if (taskName) {
              fetch("/api/tasks", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ date: selectedDate, name: taskName })
              }).then(response => response.json())
                .then(() => {
                    fetchTasks();
                    taskInput.value = "";
                });
          }
      }
  };

  function deleteTask(date, index) {
      fetch(`/api/tasks/${date}/${index}`, {
          method: "DELETE"
      }).then(fetchTasks);
  }

  clearAllBtn.onclick = () => {
      fetch("/api/tasks", {
          method: "DELETE"
      }).then(fetchTasks);
  };

  closeModalBtn.onclick = () => taskModal.classList.add("hidden");

  prevMonthBtn.addEventListener("click", () => {
      currentDate.setMonth(currentDate.getMonth() - 1);
      renderCalendar();
  });

  nextMonthBtn.addEventListener("click", () => {
      currentDate.setMonth(currentDate.getMonth() + 1);
      renderCalendar();
  });
});
