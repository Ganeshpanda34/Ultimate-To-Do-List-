//   <!-- Main App Script -->
   
    document.addEventListener('DOMContentLoaded', function() {
        // Elements
        const elements = {
            todoInput: document.getElementById('todoInput'),
            prioritySelect: document.getElementById('prioritySelect'),
            dueDate: document.getElementById('dueDate'),
            addTodoBtn: document.getElementById('addTodoBtn'),
            todoList: document.getElementById('todoList'),
            emptyState: document.getElementById('emptyState'),
            itemsLeft: document.getElementById('itemsLeft'),
            completedCount: document.getElementById('completedCount'),
            clearCompleted: document.getElementById('clearCompleted'),
            filterAll: document.getElementById('filterAll'),
            filterActive: document.getElementById('filterActive'),
            filterCompleted: document.getElementById('filterCompleted'),
            themeToggle: document.getElementById('themeToggle'),
            viewToggle: document.getElementById('viewToggle'),
            listView: document.getElementById('listView'),
            taskBoardView: document.getElementById('taskBoardView'),
            taskBoardTodo: document.getElementById('taskBoardTodo'),
            taskBoardDone: document.getElementById('taskBoardDone'),
            pomodoroBtn: document.getElementById('pomodoroBtn'),
            pomodoroContainer: document.getElementById('pomodoroContainer'),
            pomodoroTimer: document.getElementById('pomodoroTimer'),
            pomodoroShortBreak: document.getElementById('pomodoroShortBreak'),
            pomodoroLongBreak: document.getElementById('pomodoroLongBreak'),
            productivityScore: document.getElementById('productivityScore'),
            showAnalytics: document.getElementById('showAnalytics'),
            analyticsModal: document.getElementById('analyticsModal'),
            analyticsModalBody: document.getElementById('analyticsModalBody')
        };

        // App State
        const state = {
            todos: JSON.parse(localStorage.getItem('todos') || '[]'),
            currentFilter: 'all',
            currentView: 'list',
            pomodoroRunning: false,
            pomodoroTimeLeft: 25 * 60,
            pomodoroInterval: null,
            editingTodoId: null
        };

        let analyticsModalInstance = null;
        if (window.bootstrap && elements.analyticsModal) {
            analyticsModalInstance = new bootstrap.Modal(elements.analyticsModal);
        }

        // Initialize App
        initTheme();
        renderTodos();
        updateStats();
        initSortable();

        // Event Listeners
        elements.addTodoBtn.addEventListener('click', addTodo);
        elements.todoInput.addEventListener('keypress', (e) => e.key === 'Enter' && addTodo());
        elements.clearCompleted.addEventListener('click', clearCompletedTodos);
        elements.filterAll.addEventListener('click', () => setFilter('all'));
        elements.filterActive.addEventListener('click', () => setFilter('active'));
        elements.filterCompleted.addEventListener('click', () => setFilter('completed'));
        elements.themeToggle.addEventListener('click', toggleTheme);
        elements.viewToggle.addEventListener('click', toggleView);
        elements.pomodoroBtn.addEventListener('click', togglePomodoro);
        elements.pomodoroShortBreak.addEventListener('click', () => startPomodoro(5 * 60));
        elements.pomodoroLongBreak.addEventListener('click', () => startPomodoro(15 * 60));
        elements.showAnalytics.addEventListener('click', showAnalytics);

        // Core Functions
        function addTodo() {
            const text = elements.todoInput.value.trim();
            const priority = elements.prioritySelect.value;
            const due = elements.dueDate.value;
            if (!text) return;
            if (state.editingTodoId) {
                state.todos = state.todos.map(todo => {
                    if (todo.id === state.editingTodoId) {
                        return { ...todo, text, priority, due: due || null };
                    }
                    return todo;
                });
                state.editingTodoId = null;
                elements.addTodoBtn.innerHTML = '<i class="bi bi-plus-lg"></i> Add';
                elements.addTodoBtn.classList.replace('btn-success', 'btn-primary');
            } else {
                const newTodo = {
                    id: Date.now(),
                    text, priority, due,
                    completed: false,
                    status: 'todo',
                    createdAt: new Date().toISOString(),
                    completedAt: null
                };
                state.todos.unshift(newTodo);
            }
            saveTodos();
            renderTodos();
            updateStats();
            elements.todoInput.value = '';
            elements.dueDate.value = '';
            elements.prioritySelect.value = 'medium';
            elements.todoInput.focus();
        }

        function renderTodos() {
            elements.todoList.innerHTML = '';
            elements.taskBoardTodo.innerHTML = '';
            elements.taskBoardDone.innerHTML = '';
            let filteredTodos = state.todos.filter(todo => {
                return state.currentFilter === 'all' ||
                    (state.currentFilter === 'active' && !todo.completed) ||
                    (state.currentFilter === 'completed' && todo.completed);
            });
            if (filteredTodos.length === 0) {
                elements.emptyState.style.display = 'block';
            } else {
                elements.emptyState.style.display = 'none';
                filteredTodos.forEach(todo => {
                    const todoItem = createTodoElement(todo);
                    if (state.currentView === 'list') {
                        elements.todoList.appendChild(todoItem);
                    } else {
                        const column =
                            todo.status === 'done' ? elements.taskBoardDone :
                            elements.taskBoardTodo;
                        column.appendChild(todoItem);
                    }
                });
            }
        }

        function createTodoElement(todo) {
            const todoItem = document.createElement('li');
            todoItem.className = `todo-item ${todo.completed ? 'completed' : ''} priority-${todo.priority}`;
            todoItem.dataset.id = todo.id;
            const dueBadge = todo.due ? `<span class="badge-due">${formatDueDate(todo.due)}</span>` : '';
            todoItem.innerHTML = `
                <div class="d-flex justify-content-between align-items-start">
                    <div class="form-check" style="flex-grow: 1;">
                        <input type="checkbox" class="form-check-input" id="check-${todo.id}" ${todo.completed ? 'checked' : ''}>
                        <label class="form-check-label" for="check-${todo.id}">
                            ${todo.text} ${dueBadge}
                        </label>
                    </div>
                    <div class="todo-actions">
                        <button class="btn btn-sm btn-outline-secondary me-1 edit-btn">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete-btn">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            const checkbox = todoItem.querySelector('.form-check-input');
            const deleteBtn = todoItem.querySelector('.delete-btn');
            const editBtn = todoItem.querySelector('.edit-btn');
            checkbox.addEventListener('change', () => toggleTodoComplete(todo.id));
            deleteBtn.addEventListener('click', () => deleteTodo(todo.id));
            editBtn.addEventListener('click', () => editTodo(todo));
            return todoItem;
        }

        function toggleTodoComplete(id) {
            state.todos = state.todos.map(todo => {
                if (todo.id === id) {
                    const updatedTodo = {
                        ...todo,
                        completed: !todo.completed,
                        completedAt: !todo.completed ? new Date().toISOString() : null,
                        status: !todo.completed ? 'done' : 'todo'
                    };
                    if (updatedTodo.completed) {
                        triggerConfetti();
                    }
                    return updatedTodo;
                }
                return todo;
            });
            saveTodos();
            renderTodos();
            updateStats();
        }

        function deleteTodo(id) {
            state.todos = state.todos.filter(todo => todo.id !== id);
            saveTodos();
            renderTodos();
            updateStats();
        }

        function editTodo(todo) {
            elements.todoInput.value = todo.text;
            elements.prioritySelect.value = todo.priority;
            elements.dueDate.value = todo.due || '';
            elements.todoInput.focus();
            state.editingTodoId = todo.id;
            elements.addTodoBtn.innerHTML = '<i class="bi bi-check-lg"></i> Update';
            elements.addTodoBtn.classList.replace('btn-primary', 'btn-success');
        }

        function clearCompletedTodos() {
            state.todos = state.todos.filter(todo => !todo.completed);
            saveTodos();
            renderTodos();
            updateStats();
        }

        function updateStats() {
            const activeCount = state.todos.filter(todo => !todo.completed).length;
            const completed = state.todos.length - activeCount;
            const completedToday = state.todos.filter(todo =>
                todo.completed && isToday(new Date(todo.completedAt))
            ).length;
            const tasksConsidered = activeCount + completedToday;
            const productivity = tasksConsidered > 0 ? Math.floor((completedToday / tasksConsidered) * 100) : 100;
            elements.itemsLeft.textContent = `${activeCount} ${activeCount === 1 ? 'task' : 'tasks'} left`;
            elements.completedCount.textContent = `${completed} completed`;
            elements.productivityScore.textContent = `Productivity: ${productivity}%`;
        }

        function isToday(date) {
            if (!date) return false;
            const today = new Date();
            return date.getDate() === today.getDate() &&
                date.getMonth() === today.getMonth() &&
                date.getFullYear() === today.getFullYear();
        }

        function setFilter(filter) {
            state.currentFilter = filter;
            elements.filterAll.classList.remove('active');
            elements.filterActive.classList.remove('active');
            elements.filterCompleted.classList.remove('active');
            document.getElementById(`filter${filter.charAt(0).toUpperCase() + filter.slice(1)}`).classList.add('active');
            renderTodos();
        }

        function saveTodos() {
            localStorage.setItem('todos', JSON.stringify(state.todos));
        }

        // Pomodoro Timer
        function togglePomodoro() {
            if (elements.pomodoroContainer.classList.contains('d-none')) {
                elements.pomodoroContainer.classList.remove('d-none');
                startPomodoro(25 * 60);
            } else {
                stopPomodoro();
                elements.pomodoroContainer.classList.add('d-none');
            }
        }

        function startPomodoro(seconds) {
            stopPomodoro();
            state.pomodoroTimeLeft = seconds;
            state.pomodoroRunning = true;
            updatePomodoroDisplay();
            state.pomodoroInterval = setInterval(() => {
                state.pomodoroTimeLeft--;
                updatePomodoroDisplay();
                if (state.pomodoroTimeLeft <= 0) {
                    stopPomodoro();
                    triggerConfetti();
                    alert('Time is up! Take a break.');
                }
            }, 1000);
        }

        function stopPomodoro() {
            clearInterval(state.pomodoroInterval);
            state.pomodoroRunning = false;
        }

        function updatePomodoroDisplay() {
            const minutes = Math.floor(state.pomodoroTimeLeft / 60);
            const seconds = state.pomodoroTimeLeft % 60;
            elements.pomodoroTimer.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        }

        // Task Board View
        function toggleView() {
            if (state.currentView === 'list') {
                state.currentView = 'task-board';
                elements.listView.classList.add('d-none');
                elements.taskBoardView.classList.remove('d-none');
                elements.viewToggle.innerHTML = '<i class="bi bi-list-task"></i> Switch to List';
            } else {
                state.currentView = 'list';
                elements.listView.classList.remove('d-none');
                elements.taskBoardView.classList.add('d-none');
                elements.viewToggle.innerHTML = '<i class="bi bi-kanban"></i> Switch to Task Board';
            }
            renderTodos();
        }

        function initSortable() {
            if (elements.taskBoardTodo) {
                new Sortable(elements.taskBoardTodo, {
                    group: 'task-board',
                    animation: 150,
                    onEnd: (evt) => handleTaskBoardDrop(evt, 'todo')
                });
                new Sortable(elements.taskBoardDone, {
                    group: 'task-board',
                    animation: 150,
                    onEnd: (evt) => handleTaskBoardDrop(evt, 'done')
                });
            }
        }

        function handleTaskBoardDrop(evt, newStatus) {
            const itemId = parseInt(evt.item.dataset.id);
            state.todos = state.todos.map(todo => {
                if (todo.id === itemId) {
                    const wasCompleted = todo.completed;
                    const isNowDone = newStatus === 'done';
                    if (isNowDone && !wasCompleted) {
                        triggerConfetti();
                    }
                    return {
                        ...todo,
                        status: newStatus,
                        completed: isNowDone,
                        completedAt: isNowDone ? new Date().toISOString() : null
                    };
                }
                return todo;
            });
            saveTodos();
            renderTodos();
            updateStats();
        }

        // Analytics
        function showAnalytics() {
            const completedToday = state.todos.filter(t => t.completed && isToday(new Date(t.completedAt))).length;
            const highPriority = state.todos.filter(t => t.priority === 'high' && !t.completed).length;
            const totalTasks = state.todos.length;
            const activeTasks = totalTasks - state.todos.filter(t => t.completed).length;
            const tasksAddedToday = state.todos.filter(t => isToday(new Date(t.createdAt))).length;
            const completedTasks = state.todos.filter(t => t.completed).length;
            // Average completion time (in hours)
            let avgCompletionTime = null;
            const completed = state.todos.filter(t => t.completed && t.completedAt && t.createdAt);
            if (completed.length > 0) {
                const totalTime = completed.reduce((sum, t) => {
                    const created = new Date(t.createdAt);
                    const completedAt = new Date(t.completedAt);
                    return sum + ((completedAt - created) / (1000 * 60 * 60)); // hours
                }, 0);
                avgCompletionTime = (totalTime / completed.length).toFixed(2);
            }
            // Completion rate
            const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            let analyticsHtml = `<ul class="list-unstyled mb-0">
                <li>✅ <strong>Completed today:</strong> ${completedToday}</li>
                <li>❗ <strong>High priority:</strong> ${highPriority}</li>
                <li>📅 <strong>Total tasks:</strong> ${totalTasks}</li>
                <li>🕒 <strong>Active tasks:</strong> ${activeTasks}</li>
                <li>➕ <strong>Added today:</strong> ${tasksAddedToday}</li>
                <li>📈 <strong>Completion rate:</strong> ${completionRate}%</li>
                <li>⏱️ <strong>Avg. completion time:</strong> ${avgCompletionTime ? avgCompletionTime + ' hrs' : 'N/A'}</li>
            </ul>`;
            if (elements.analyticsModalBody) {
                elements.analyticsModalBody.innerHTML = analyticsHtml;
                if (analyticsModalInstance) analyticsModalInstance.show();
            } else {
                alert(`📊 Analytics:\n\n✅ Completed today: ${completedToday}\n❗ High priority: ${highPriority}\n📅 Total tasks: ${totalTasks}\n🕒 Active tasks: ${activeTasks}\n➕ Added today: ${tasksAddedToday}\n📈 Completion rate: ${completionRate}%\n⏱️ Avg. completion time: ${avgCompletionTime ? avgCompletionTime + ' hrs' : 'N/A'}`);
            }
        }

        function formatDueDate(dateString) {
            const date = new Date(dateString + 'T00:00:00');
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = String(date.getFullYear()).slice(-2);
            return `${day}-${month}-${year}`;
        }

        function triggerConfetti() {
            if (window.confetti) {
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            }
        }

        function initTheme() {
            const savedTheme = localStorage.getItem('theme') || 'light';
            document.documentElement.setAttribute('data-theme', savedTheme);
            if (savedTheme === 'dark') {
                elements.themeToggle.innerHTML = '<i class="bi bi-sun-fill"></i>';
            } else {
                elements.themeToggle.innerHTML = '<i class="bi bi-moon-fill"></i>';
            }
        }

        function toggleTheme() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            if (newTheme === 'dark') {
                elements.themeToggle.innerHTML = '<i class="bi bi-sun-fill"></i>';
            } else {
                elements.themeToggle.innerHTML = '<i class="bi bi-moon-fill"></i>';
            }
        }
    });
   