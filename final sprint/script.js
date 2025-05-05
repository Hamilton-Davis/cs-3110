document.addEventListener("DOMContentLoaded", () => {
    const welcomeScreen    = document.getElementById("welcome-screen");
    const startButton      = document.getElementById("start-button");
    const mainApp          = document.getElementById("main-app");
    const header           = document.getElementById("app-header");
    const controls         = document.querySelector(".calendar-controls");
    const calendar         = document.getElementById("calendar");
    const monthLabel       = document.getElementById("month-label");
    const prevMonthBtn     = document.getElementById("prev-month");
    const nextMonthBtn     = document.getElementById("next-month");
    const toggleViewBtn    = document.getElementById("toggle-view");
    const taskModal        = document.getElementById("task-modal");
    const taskInput        = document.getElementById("task-input");
    const taskList         = document.getElementById("task-list");
    const saveTaskBtn      = document.getElementById("save-task");
    const clearAllBtn      = document.getElementById("clear-all");
    const closeModalBtn    = document.querySelector(".close");
    const insertBar        = document.getElementById("insert-bar");
    const insertTaskDesc   = document.getElementById("insert-task-desc");
    const insertDueDate    = document.getElementById("insert-due-date");
    const insertTaskPriority = document.getElementById("insert-task-priority");
    const insertTaskBtn    = document.getElementById("insert-task-btn");
    const shareSection     = document.getElementById("share-section");
    const shareUsername    = document.getElementById("share-username");
    const shareBtn         = document.getElementById("share-btn");
    const listView         = document.getElementById("list-view");
    const backToCalBtn     = document.getElementById("back-to-calendar");
    const urgentList       = document.getElementById("urgent-list");
    const allTasksList     = document.getElementById("all-tasks-list");

    let currentDate  = new Date();
    let selectedDate = null;
    let tasks        = {};

    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(`${protocol}://${location.host}/ws/`);
    socket.onmessage = event => {
      const msg = JSON.parse(event.data);
      if (msg.type === "update") {
        const currentUser = localStorage.getItem("username");
        if (msg.data.username === currentUser || tasks[msg.data.date]) {
          fetchTasks();  // refetch updated task data
        }
      }
    };

    // SHOW APP
    startButton.onclick = () => {
      welcomeScreen.style.display = "none";
      mainApp.style.display       = "block";
      fetchTasks();
    };

    function fetchTasks() {
      const user = localStorage.getItem("username");
      fetch(`/api/tasks?username=${user}`)
        .then(r => r.json())
        .then(data => { tasks = data; renderCalendar(); });
    }

    function renderCalendar() {
      calendar.innerHTML = "";
      monthLabel.textContent = currentDate.toLocaleDateString("en-US", {
        month: "long", year: "numeric"
      });

      const firstDay    = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
      const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth()+1, 0).getDate();

      for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement("div");
        empty.classList.add("empty");
        calendar.appendChild(empty);
      }

      for (let d = 1; d <= daysInMonth; d++) {
        const cell    = document.createElement("div");
        const key     = `${currentDate.getFullYear()}-${currentDate.getMonth()+1}-${d}`;
        cell.textContent  = d;
        cell.dataset.date = key;
        cell.classList.add("day");

        const dayTasks = tasks[key] || [];
        if (dayTasks.length) {
          cell.classList.add("has-task");
          // outline shared-day if any task has an owner
          if (dayTasks.some(t => t.owner)) {
            cell.classList.add("shared-day");
          }
          // indicator
          const span = document.createElement("span");
          span.textContent = ` - Tasks: ${dayTasks.filter(t=>!t.completed).length}`;
          cell.appendChild(span);

          // priority coloring
          const highest = dayTasks.reduce((m,t) => {
            if (t.priority==="high") return "high";
            if (t.priority==="medium" && m!=="high") return "medium";
            return m;
          }, "low");
          cell.classList.add(`${highest}-priority`);
        }

        cell.onclick = () => openModal(key);
        calendar.appendChild(cell);
      }
    }

    toggleViewBtn.onclick   = showListView;
    backToCalBtn.onclick    = showCalendarView;

    function showListView() {
      header.style.display = controls.style.display =
        calendar.style.display = insertBar.style.display =
        shareSection.style.display = "none";
      listView.style.display = "block";
      renderList();
    }
    function showCalendarView() {
      header.style.display = "block";
      controls.style.display = "flex";
      calendar.style.display = "grid";
      insertBar.style.display = "flex";
      shareSection.style.display = "flex";
      listView.style.display = "none";
    }

    function renderList() {
      urgentList.innerHTML = "";
      allTasksList.innerHTML = "";
      const now = new Date();
      const weekAway = new Date(now);
      weekAway.setDate(now.getDate()+7);

      Object.entries(tasks).forEach(([date,list]) => {
        list.forEach((t,i) => {
          const li = document.createElement("li");
          li.textContent = `${date}: ${t.name} (${t.priority})${t.owner?` from ${t.owner}`:""}`;
          if (t.owner) li.classList.add("shared-task");
          if (t.completed) li.classList.add("completed");

          // complete toggle
          const btn = document.createElement("button");
          btn.textContent = t.completed?"↺":"✓";

          btn.onclick = async () => {
            const user = localStorage.getItem("username");
            const response = await fetch(`/api/tasks/${t.owner||user}/${date}/${i}`, {
              method: "PUT",
              headers: {"Content-Type":"application/json"},
              body: JSON.stringify({
                name: t.name, priority: t.priority,
                completed: !t.completed, editor: user
              })
            });
            if (response.ok) {
              t.completed = !t.completed;
              li.classList.toggle("completed", t.completed);
              btn.textContent = t.completed ? "↺" : "✓";
            }
          };

          li.appendChild(btn);

          // delete own
          if (!t.owner) {
            const del = document.createElement("button");
            del.textContent = "❌";
            del.onclick = async () => {
              const res = await fetch(`/api/tasks/${localStorage.getItem("username")}/${date}/${i}`, {
                method: "DELETE"
              });
              if (res.ok) {
                li.remove(); // remove task from UI instantly
              }
            };
            li.appendChild(del);
          }

          const dt = new Date(date);
          if (dt >= now && dt <= weekAway) urgentList.appendChild(li);
          allTasksList.appendChild(li);
        });
      });
    }

    function openModal(date) {
      selectedDate = date;
      taskInput.value = "";
      taskList.innerHTML = "";
      const user = localStorage.getItem("username");

      (tasks[date]||[]).forEach((t,i) => {
        const li = document.createElement("li");
        li.textContent = `${t.name} (${t.priority})${t.owner?` from ${t.owner}`:""}`;
        if (t.owner) li.classList.add("shared-task");
        if (t.completed) li.classList.add("completed");

        // complete toggle
        const cb = document.createElement("button");
        cb.textContent = t.completed?"↺":"✓";
        cb.onclick = () => {
          fetch(`/api/tasks/${t.owner||user}/${date}/${i}`, {
            method: "PUT",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify({
              name: t.name, priority: t.priority,
              completed: !t.completed, editor: user
            })
          }).then(fetchTasks);
        };
        li.appendChild(cb);

        // edit shared
        if (t.owner && t.owner !== user) {
          const eb = document.createElement("button");
          eb.textContent = "✏️";
          eb.onclick = () => {
            const n = prompt("Name", t.name);
            const p = prompt("Priority", t.priority);
            if (n && p) {
              fetch(`/api/tasks/${t.owner}/${date}/${i}`, {
                method: "PUT",
                headers: {"Content-Type":"application/json"},
                body: JSON.stringify({ name: n, priority: p, editor: user })
              }).then(fetchTasks);
            }
          };
          li.appendChild(eb);
        }

        // delete own
        if (!t.owner) {
          const db = document.createElement("button");
          db.textContent = "❌";
          db.onclick = () => {
            fetch(`/api/tasks/${user}/${date}/${i}`, {method:"DELETE"})
              .then(fetchTasks);
          };
          li.appendChild(db);
        }

        taskList.appendChild(li);
      });

      taskModal.style.display = "block";
    }

    closeModalBtn.onclick = () => { taskModal.style.display = "none"; };
    saveTaskBtn.onclick   = () => {
      const user = localStorage.getItem("username");
      const name = taskInput.value.trim();
      const pri  = document.getElementById("task-priority").value;
      if (!name) return;
      fetch("/api/tasks", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          username: user,
          date: selectedDate,
          name, priority: pri
        })
      }).then(fetchTasks);
    };
    clearAllBtn.onclick = () => {
      fetch(`/api/tasks/${localStorage.getItem("username")}/${selectedDate}`, {method:"DELETE"})
        .then(fetchTasks);
    };

    prevMonthBtn.onclick = ()=>{ currentDate.setMonth(currentDate.getMonth()-1); renderCalendar(); };
    nextMonthBtn.onclick = ()=>{ currentDate.setMonth(currentDate.getMonth()+1); renderCalendar(); };
    insertTaskBtn.onclick = ()=> {
      const user = localStorage.getItem("username");
      const desc = insertTaskDesc.value.trim();
      const due  = insertDueDate.value;
      const pri  = insertTaskPriority.value;
      if (!desc||!due) return alert("Enter desc & date");
      fetch("/api/tasks", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ username: user, date: due, name: desc, priority: pri })
      }).then(()=>{
        fetchTasks();
        insertTaskDesc.value = "";
        insertDueDate.value  = "";
        insertTaskPriority.value = "low";
      });
    };
    shareBtn.onclick = ()=> {
      const s = localStorage.getItem("username");
      const r = shareUsername.value.trim();
      if (!r) return alert("Enter username");
      fetch("/api/share", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ sharer: s, recipient: r })
      }).then(r=>r.json()).then(j=>{
        if (j.error) alert(j.error);
        else { alert(j.message); shareUsername.value=""; }
      });
    };
  });
