document.addEventListener("DOMContentLoaded", function () {
  const tasksList = document.getElementById("tasksList");
  const taskForm = document.getElementById("taskForm");
  const taskName = document.getElementById("taskName");

  function fetchTasks() {
      fetch("/api")
          .then(response => response.json())
          .then(data => {
              tasksList.innerHTML = "";
              data.forEach(task => {
                  const li = document.createElement("li");
                  li.innerHTML = `
                      <span>${task.name}</span>
                      <button class="edit-btn" data-id="${task.id}">Edit</button>
                      <button class="delete-btn" data-id="${task.id}">Delete</button>
                  `;
                  tasksList.appendChild(li);
              });

              document.querySelectorAll(".edit-btn").forEach(button => {
                  button.addEventListener("click", () => editTask(button.dataset.id));
              });

              document.querySelectorAll(".delete-btn").forEach(button => {
                  button.addEventListener("click", () => deleteTask(button.dataset.id));
              });
          });
  }

  taskForm.addEventListener("submit", function (e) {
      e.preventDefault();
      fetch("/api", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: taskName.value })
      }).then(response => response.json())
        .then(() => {
            taskName.value = "";
            fetchTasks();
        });
  });

  function editTask(id) {
      const newName = prompt("Enter new task name:");
      if (newName) {
          fetch(`/api/${id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: newName })
          }).then(fetchTasks);
      }
  }

  function deleteTask(id) {
      fetch(`/api/${id}`, {
          method: "DELETE"
      }).then(fetchTasks);
  }

  fetchTasks();
});
