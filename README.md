# Employee Directory App

A small web app built by the LA Tech Rising intern team. It displays employee cards and lets you search the directory by name, job title, department, or email.

The six employees in `employees.json` are fictional demo data.

## What works now

- Employee cards show a name, title, department, and email link.
- The search bar filters cards as you type, without regard to capitalization.
- An empty-state message appears when there are no matches.
- The card grid adjusts to smaller screens.

## Run it locally

1. Install [Git](https://git-scm.com/downloads), [VS Code](https://code.visualstudio.com/), and the **Live Server** extension in VS Code.
2. Clone the repository:

   ```bash
   git clone https://github.com/siromidahmadi/employee-directory-app.git
   cd employee-directory-app
   ```

3. Open the folder in VS Code.
4. Right-click `index.html` and choose **Open with Live Server**.
5. Type a name, title, department, or email into the search bar.

Use Live Server (or another local web server) because the page loads `employees.json` with `fetch()`. Opening `index.html` directly as a `file://` page may block that request.

## Project files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure and search input |
| `style.css` | Layout, cards, search bar, and responsive styles |
| `script.js` | Loads employees, creates cards, and filters search results |
| `employees.json` | Fictional employee records |
| `README.md` | Setup and contribution guide |

Each employee record needs `name`, `title`, `department`, and `email` fields. Use fictional names and `example.com` email addresses for demos.

## Contributing

Pick a Jira task and create a separate branch for that task. Edit the project files in your local VS Code folder, then open a pull request for review.

```bash
git switch main
git pull origin main
git switch -c feature/short-task-name
# Make your changes, then check them in Live Server.
git status
git diff
git add index.html style.css script.js employees.json
git commit -m "Describe the change"
git push -u origin feature/short-task-name
```

Only stage files you actually changed. On GitHub, open a pull request from your branch into `main` and describe what you changed and how you checked it. If someone else updates `main` while you are working, bring those changes into your branch before resolving conflicts. Do not edit or push directly to another intern's branch.

## Quick check before a pull request

- The page loads employee cards with Live Server.
- Search finds a matching name or department and shows the no-results message for an unmatched term.
- The layout remains usable on a narrow screen.
- The browser console has no new errors.
