const searchInput = document.querySelector('#search');
const employeeList = document.querySelector('#employee-list');
const icons = {
    linkedin : "img/logo/linkedInLogo.png",
    github : "img/logo/gitHubLogo.png",
    portfolio : "img/logo/websiteLogo.png"
}
let employees = [];

function makeCard(employee) {
    const card = document.createElement('article');
    card.className = 'employee-card';

    const avatar = document.createElement('div');
    avatar.className = 'employee-avatar';

    const socialLinks = document.createElement('div');
    socialLinks.className = 'social-links';


    if (employee.name === 'Omid Ahmadi') {
    avatar.classList.add('omid-avatar');
    }
    
    if (employee.image) {
        avatar.style.backgroundImage = `url(${employee.image})`;
    } else {
        avatar.textContent = employee.name.split(/\s+/).map(part => part[0]).slice(0, 2).join('');
    }

    const name = document.createElement('h3');
    name.textContent = employee.name;

    const title = document.createElement('p');
    title.textContent = employee.title;

    const department = document.createElement('p');
    department.className = 'department-badge ' + employee.department.toLowerCase();
    department.textContent = employee.department;

    const email = document.createElement('a');
    email.href = 'mailto:' + employee.email;
    email.textContent = employee.email;

    if (employee.linkedin) {
        const linkedin = document.createElement('a');
        linkedin.href = employee.linkedin;
        linkedin.target = '_blank';
        linkedin.rel = 'noopener noreferrer';
        
        const linkedinImg = document.createElement('img');
        linkedinImg.src = icons.linkedin;
        linkedinImg.alt = 'LinkedIn';
        linkedin.appendChild(linkedinImg);
        socialLinks.appendChild(linkedin);
    }
    if (employee.github) {
        const github = document.createElement('a');
        github.href = employee.github;
        github.target = '_blank';
        github.rel = 'noopener noreferrer';
        
        const githubImg = document.createElement('img');
        githubImg.src = icons.github;
        githubImg.alt = 'GitHub';

        github.appendChild(githubImg);
        socialLinks.appendChild(github);
    }
    if (employee.portfolio) {
        const portfolio = document.createElement('a');
        portfolio.href = employee.portfolio;
        portfolio.target = '_blank';
        portfolio.rel = 'noopener noreferrer';

        const portfolioImg = document.createElement('img');
        portfolioImg.src = icons.portfolio;
        portfolioImg.alt = 'Portfolio';
        portfolio.appendChild(portfolioImg);
        socialLinks.appendChild(portfolio);
    }

    card.append(avatar, name, title, department, email, socialLinks);
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
