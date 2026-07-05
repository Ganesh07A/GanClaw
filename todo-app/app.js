document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('todo-form');
    const input = document.getElementById('todo-input');
    const list = document.getElementById('todo-list');

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const text = input.value.trim();
        if (text === '') return;

        const li = document.createElement('li');
        li.className = 'todo-item';

        const todoText = document.createElement('span');
        todoText.className = 'todo-text';
        todoText.textContent = text;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'Delete';

        li.appendChild(todoText);
        li.appendChild(deleteBtn);

        list.appendChild(li);
        input.value = '';

        deleteBtn.addEventListener('click', function() {
            li.remove();
        });
    });
});