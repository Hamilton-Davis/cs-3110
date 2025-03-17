document.addEventListener("DOMContentLoaded", () => {  
    
    // Welcome
      const welcomeScreen = document.getElementById("welcome-screen");
      const startButton = document.getElementById("start-button");
      const mainApp = document.getElementById("main-app");
    
    // Calendar
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
    
            // Check if there are tasks and apply the appropriate priority color
            if (tasks[dateKey] && tasks[dateKey].length > 0) {
                let taskIndicator = document.createElement("span");
                taskIndicator.textContent = ` - Tasks: ${tasks[dateKey].length} `;
                dayCell.appendChild(taskIndicator);
                dayCell.classList.add("has-task");
    
                // Apply color based on the highest priority task
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
    
      // Display tasks with name and priority
function openTaskModal(date) {
    selectedDate = date;
    taskInput.value = "";
    taskList.innerHTML = "";

    if (tasks[date] && tasks[date].length > 0) {
        tasks[date].forEach((task, index) => {
            let taskItem = document.createElement("li");
            taskItem.textContent = `${task.name} (Priority: ${task.priority})`;  // Display task name and priority

            let deleteBtn = document.createElement("button");
            deleteBtn.textContent = "❌";
            deleteBtn.onclick = () => deleteTask(date, index);
            taskItem.appendChild(deleteBtn);

            taskList.appendChild(taskItem);
        });
    }

    taskModal.classList.remove("hidden");
}

// Close the modal when the close button is clicked
closeModalBtn.addEventListener("click", () => {
    taskModal.classList.add("hidden");  // Hide the modal by adding the "hidden" class
});

    
        saveTaskBtn.onclick = () => {
            if (selectedDate) {
                let taskName = taskInput.value.trim();
                let taskPriority = document.getElementById("task-priority").value;
    
                if (taskName) {
                    // Save task with priority
                    fetch("/api/tasks", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ 
                            date: selectedDate, 
                            name: taskName, 
                            priority: taskPriority 
                        })
                    }).then(response => response.json())
                        .then(() => {
                            fetchTasks();
                            taskInput.value = "";
                            document.getElementById("task-priority").value = "low";  // Reset priority
                        });
                    renderCalendar();
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
    


