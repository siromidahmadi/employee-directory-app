const searchInput = document.querySelector('#search');
const icons = {
    linkedin : "img/logo/linkedInLogo.png",
    github : "img/logo/githubLogo.png",
    portfolio : "img/logo/websiteLogo.png"
}
const departmentFilter = document.querySelector('#department-filter');
const employeeList = document.querySelector('#employee-list');
const resultsCount = document.querySelector('#results-count');

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
        avatar.textContent = employee.name
            .split(/\s+/)
            .map(part => part[0])
            .slice(0, 2)
            .join('');
    }

    const name = document.createElement('h3');
    name.textContent = employee.name;

    const title = document.createElement('p');
    title.textContent = employee.title;

    const department = document.createElement('p');
    department.className =
        'department-badge ' + employee.department.toLowerCase();
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

    const copyButton = document.createElement('button');
    copyButton.className = 'copy-email';
    copyButton.textContent = 'Copy Email';

    copyButton.addEventListener('click', async () => {
        await navigator.clipboard.writeText(employee.email);

        copyButton.textContent = 'Copied ✓';

        setTimeout(() => {
            copyButton.textContent = 'Copy Email';
        }, 1500);
    });

    const profileButton = document.createElement('button');
    profileButton.className = 'profile-button';
    profileButton.textContent = 'View Profile';

    profileButton.addEventListener('click', () => {
        openProfile(employee);
    });

    card.append(avatar, name, title, department,
        email, copyButton, profileButton, socialLinks
    );

    return card;
}

function openProfile(employee) {
    const modal = document.createElement('div');
    modal.className = 'profile-modal';

    const content = document.createElement('div');
    content.className = 'profile-modal-content';

    const closeButton = document.createElement('button');
    closeButton.className = 'modal-close';
    closeButton.textContent = '×';
    closeButton.setAttribute('aria-label', 'Close profile');

    const image = document.createElement('img');
    image.src = employee.image;
    image.alt = employee.name;

    const name = document.createElement('h2');
    name.textContent = employee.name;

    const title = document.createElement('p');
    title.textContent = employee.title;

    const department = document.createElement('span');
    department.className =
        'department-badge ' + employee.department.toLowerCase();
    department.textContent = employee.department;

    const emailContainer = document.createElement('p');

    const emailLink = document.createElement('a');
    emailLink.href = 'mailto:' + employee.email;
    emailLink.textContent = employee.email;

    emailContainer.appendChild(emailLink);

    const socialLinks = document.createElement('div');
    socialLinks.className = 'social-links';

    const socialProfiles = [
        {
            name: 'LinkedIn',
            url: employee.linkedin || employee.socials?.linkedin
        },
        {
            name: 'GitHub',
            url: employee.github || employee.socials?.github
        },
        {
            name: 'Portfolio',
            url: employee.portfolio || employee.socials?.portfolio
        }
    ];

    socialProfiles.forEach(profile => {
        if (!profile.url) {
            return;
        }

        const link = document.createElement('a');
        link.href = profile.url;
        link.textContent = profile.name;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';

        socialLinks.appendChild(link);
    });

    content.append(
        closeButton,
        image,
        name,
        title,
        department,
        emailContainer,
        socialLinks
    );

    modal.appendChild(content);
    document.body.appendChild(modal);

    closeButton.addEventListener('click', () => {
        modal.remove();
    });

    modal.addEventListener('click', event => {
        if (event.target === modal) {
            modal.remove();
        }
    });

    document.addEventListener('keydown', function closeWithEscape(event) {
        if (event.key === 'Escape') {
            modal.remove();
            document.removeEventListener(
                'keydown',
                closeWithEscape
            );
        }
    });
}

function renderEmployees() {
    const query = searchInput.value.trim().toLowerCase();
    const selectedDepartment = departmentFilter.value;

    const matches = employees.filter(employee => {
        const matchesSearch = [
            employee.name,
            employee.title,
            employee.department,
            employee.email
        ].some(value =>
            value.toLowerCase().includes(query)
        );

        const matchesDepartment =
            selectedDepartment === 'all' ||
            employee.department.toLowerCase() === selectedDepartment;

        return matchesSearch && matchesDepartment;
    });

    resultsCount.textContent =
        `${matches.length} ${
            matches.length === 1 ? 'employee' : 'employees'
        } found.`;

    employeeList.replaceChildren();

    if (matches.length === 0) {
        const message = document.createElement('p');
        message.className = 'empty-state';
        message.textContent =
            'No employees found. Try another search.';

        employeeList.append(message);
        return;
    }

    employeeList.append(...matches.map(makeCard));
}

searchInput.addEventListener('input', renderEmployees);

fetch('employees.json')
    .then(response => {
        if (!response.ok) {
            throw new Error('Could not load employee data');
        }

        return response.json();
    })
    .then(data => {
        if (!Array.isArray(data)) {
            throw new Error('Employee data must be a list');
        }

        employees = data;

        const departments = [
            ...new Set(
                employees.map(employee => employee.department)
            )
        ];

        departments.forEach(department => {
            const option = document.createElement('option');

            option.value = department.toLowerCase();
            option.textContent = department;

            departmentFilter.appendChild(option);
        });

        renderEmployees();
    })
    .catch(() => {
        resultsCount.textContent = '';
        employeeList.textContent =
            'Employee data could not load. Open this project with Live Server and try again.';
    });
