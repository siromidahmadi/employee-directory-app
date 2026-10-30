# The People — Employee Directory

An employee directory built by LA Tech Rising interns with project guidance from Omid Ahmadi. The app helps people find teammates, explore departments, and connect through public profiles.

[Open the live website](https://siromidahmadi.github.io/employee-directory-app/)

## Pages

| Page | What it provides |
| --- | --- |
| [Directory](https://siromidahmadi.github.io/employee-directory-app/index.html#directory) | Default view with employee cards, search, filters, statistics, and a table view. |
| [Departments](https://siromidahmadi.github.io/employee-directory-app/index.html#Departments) | Department cards, member counts, and expandable team information. |
| [About](https://siromidahmadi.github.io/employee-directory-app/index.html#About) | Project introduction and team values. |
| [Contact](https://siromidahmadi.github.io/employee-directory-app/index.html#Contact) | Project contact information and LinkedIn link. |
| [Add Teammate](https://siromidahmadi.github.io/employee-directory-app/admin.html) | Particle introduction, approved-admin sign-in, and teammate management. Scroll down to reach the workspace. |

Directory, Departments, About, and Contact are separate hash-selected views in `index.html`. Add Teammate uses `admin.html`.

## Current features

### Find and explore teammates

- Search by name, role, email, department, or skill.
- Combine search with a department filter and quick department pills.
- Sort names A–Z or Z–A, clear filters, and switch between Grid and Table.
- View employee photos or initials, role and department information, location, and up to three skill badges on each card.
- Open a profile with Overview, Contact, Skills, and Projects sections visible together. Empty project lists show a placeholder.
- Use email links, copy-email controls, and available professional profile links.
- Save individual cards with browser-local bookmarks.
- See total employees, departments, roles, and new employees this month. The last figure uses available joining dates.
- See a compact local clock beneath a card's location, using its saved time zone where provided.

### Appearance and interactions

- The People branding and a Los Angeles photo banner.
- Compact liquid-style navigation with an integrated sun/moon theme control.
- Saved light/dark preference, rainbow-outline Add Teammate link, rolling statistics and search terms, and card hover effects.
- Responsive styles, keyboard focus states, and reduced-motion handling in supported interactions.
- A canvas particle introduction on the Add Teammate page. Its current implementation is inline in `admin.html`.

### Admin management

Approved admins can add, edit, and remove teammates. The form includes:

- Name, public email, role, and department.
- Photo upload: JPG, PNG, or WebP, up to 2 MB.
- City/location, country/territory, state/province/region, and named time zone.
- Joining date, bio, skills, LinkedIn, GitHub, and portfolio.
- Live profile preview, required-field readiness, and a browser-local draft.

Country choices cover 249 ISO countries/territories. City suggestions are a curated international list, not an exhaustive worldwide address search. Other cities and regions can be entered manually. Select the appropriate time zone when a city is not suggested; named zones let the browser apply its local time-zone rules.

Saved profiles are shared through Supabase. Other visitors see updates when they load or refresh the directory. Drafts, bookmarks, view preferences, and theme preferences stay in the current browser.

### Departments summary and openings

The Departments page shows live department and employee totals, a separate Grid/List preference, header people search, Quick Invite (the existing approved-admin Add Teammate flow), and department openings details. The department toolbar and card contents remain independent of these additions.

Open roles are maintained in `department-openings.json`, keyed by department name (case insensitive). An absent department means its openings are **not provided**, while an empty array means **no open roles listed**. The file starts empty; it does not contain the reference screenshot's sample vacancies. To add actual approved roles, use this structure:

```json
{
  "your department name": [
    { "title": "Your approved role title", "location": "Your role location" }
  ]
}
```

The overall openings total is marked incomplete when some departments have no openings data. Updating this file requires a normal reviewed code change; it is not part of the employee Admin form. Guild membership requests and proposals continue to use their existing browser-local behavior.

## Technology

- HTML, CSS, and vanilla JavaScript.
- Supabase Database, Authentication, and Storage.
- Pinned Supabase browser SDK: `2.118.0`.
- GitHub Pages for static hosting.
- Node.js and jsdom for the existing development checks.

The deployed website has no React, TypeScript, Tailwind, or shadcn dependency and needs no frontend build step. Reference-inspired UI effects are implemented in native web code.

## Run locally

1. Clone the repository:

   ```bash
   git clone https://github.com/siromidahmadi/employee-directory-app.git
   cd employee-directory-app
   ```

2. Serve the project over HTTP. Use VS Code Live Server, or run:

   ```bash
   python -m http.server 8000
   ```

3. Open [http://localhost:8000](http://localhost:8000).

The public directory needs access to the configured Supabase project. Local changes to HTML, CSS, or JavaScript do not publish themselves to GitHub Pages. Saving an employee through the configured admin page writes to the shared database, even when the page is served locally.

## Project files

| File or folder | Purpose |
| --- | --- |
| `index.html` | Public page structure and navigation views. |
| `directory.js`, `directory.css` | Current Directory rendering, search, filters, profiles, department views, and styles. |
| `admin.html`, `admin.js`, `admin.css` | Particle introduction, login, form, preview, and employee management. |
| `employee-store.js` | Shared database, authentication, and photo-storage access. |
| `supabase-config.js` | Browser Supabase URL and publishable key. |
| `supabase-2.118.0.js`, `SUPABASE-LICENSE` | Pinned browser SDK and its license. |
| `location-picker.js`, `location-picker.css` | Country, region, city-suggestion, and time-zone controls. |
| `card-local-time.js` | Local-time formatting and clock updates. |
| `liquid-navigation.js`, `liquid-navigation.css` | Moving navigation highlight and compact bar styles. |
| `theme-changer.css` | Sun/moon icon-button styles. |
| `kinetic-text.js`, `kinetic-nav.css` | Rolling search-term effect and related styles; the CSS also retains earlier MonoNav rules. |
| `img/`, `the-people-logo.png`, `skyphoto2.png` | Local photos, icons, logo, and banner image. |
| `data/employees.sample.json` | Reference employee data; not the live database. |
| `employee-directory.sql` | Database setup, constraints, access policies, and storage configuration. |
| `add-employee-location.sql`, `employee-worldwide-location.sql` | Records of the applied location-related database changes. |
| `admin.test.cjs`, `departments.test.cjs` | Existing admin and department tests. |
| `docs/CHANGELOG.md` | Earlier development notes. |

The duplicate project-copy folder and identified unused assets have been removed. Earlier versions remain in Git history.

## Data and administrator access

Employee profiles and photos are public. Only enter information intended for the public directory.

- Employee records are stored in the `employees` table.
- Approved administrators are listed in `directory_admins`.
- Photos use the `employee-photos` storage bucket.
- Database row-level security restricts writes to approved admins.
- Updates and deletes use the saved `updated_at` value to detect stale records.

For an existing deployment, use its configured backend. The SQL changes in this repository have already been applied to the connected project; do not rerun the full schema or sample backfills against an existing database without reviewing them.

To approve an administrator, the project owner creates an authentication user in Supabase and adds that user's UUID:

```sql
insert into public.directory_admins (user_id)
values ('YOUR_AUTH_USER_UUID')
on conflict do nothing;
```

Open `admin.html` and sign in with that approved account. There is no public admin registration. Remove the membership in `directory_admins` to revoke admin authorization.

The browser publishable key is expected in the client configuration. Never commit a service-role key, secret key, database password, or personal login credentials.

## Development checks

Install development dependencies and run the existing checks:

```bash
npm ci
npm run check
npm test
```

The department and profile tests execute the active `directory.js`. The syntax-check command checks `directory.js`, `employee-store.js`, and `admin.js`. Automated tests do not replace browser checks for visual layout and real backend interactions.

Before merging, also review the current Directory search/filter combinations, profile links, empty states, navigation, phone layout, keyboard interactions, themes, clocks, and admin form behavior. Use an isolated backend for disposable test records.

## Contributing

1. Check your Jira assignment and coordinate shared markup/data fields in Slack.
2. Pull the latest `main` and create a branch for your task.
3. Keep changes focused on your assigned feature.
4. Review your diff and complete the relevant checks.
5. Stage only the intended files, commit, and push your branch.
6. Open a pull request with the change summary and verification notes.
7. Share the PR in Slack and wait for review before merging.

Avoid committing passwords, local environment files, editor metadata, or another copy of the project folder.

## Work still in progress

The detailed Week 6 Departments & Teams design remains an implementation target. Its expanded team search, division filter, Create Team flow, openings details, guild proposals/membership, and Quick Invite are not all implemented in the current page. Treat task images and planning notes as design references, not a list of completed features.

GitHub Pages deployment success confirms publishing completed; it does not replace functional or visual testing.
