const searchInput = document.querySelector('#search');
const employeeList = document.querySelector('#employee-list');
let employees = [];

function makeCard(employee) {
    const card = document.createElement('article');
    card.className = 'employee-card';

    const avatar = document.createElement('div');
    avatar.className = 'employee-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = employee.name.split(/\s+/).map(part => part[0]).slice(0, 2).join('');

    const name = document.createElement('h3');
    name.textContent = employee.name;

    const title = document.createElement('p');
    title.textContent = employee.title;

    const department = document.createElement('p');
    department.className = 'employee-department';
    department.textContent = employee.department;

    const email = document.createElement('a');
    email.href = 'mailto:' + employee.email;
    email.textContent = employee.email;

    card.append(avatar, name, title, department, email);
    return card;
}

function renderEmployees() {
    const query = searchInput.value.trim().toLowerCase();
    const matches = employees.filter(employee =>
        [employee.name, employee.title, employee.department, employee.email]
            .some(value => value.toLowerCase().includes(query))
    );

    employeeList.replaceChildren();
    if (matches.length === 0) {
        const message = document.createElement('p');
        message.className = 'empty-state';
        message.textContent = 'No employees found. Try another search.';
        employeeList.append(message);
        return;
    }

    employeeList.append(...matches.map(makeCard));
}

searchInput.addEventListener('input', renderEmployees);

fetch('employees.json')
    .then(response => {
        if (!response.ok) throw new Error('Could not load employee data');
        return response.json();
    })
    .then(data => {
        if (!Array.isArray(data)) throw new Error('Employee data must be a list');
        employees = data;
        renderEmployees();
    })
    .catch(() => {
        employeeList.textContent = 'Employee data could not load. Open this project with Live Server and try again.';
    });
