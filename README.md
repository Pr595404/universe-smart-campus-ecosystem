# UniVerse ? The Smart Campus Ecosystem

**Your Campus. Your Community. Your Universe.**

UniVerse is a full-stack smart-campus platform that brings student life, campus activities, academic resources, and student services together in one place. This repository contains a locally runnable academic project; it is not a hosted service.

## Features

- **Campus Pulse:** student posts and community activity.
- **Campus Events:** browse events and register.
- **StudyHub:** share and browse study resources.
- **Smart Buddy:** campus-aware assistant with a clearly labeled local demo response when no AI key is configured.
- **SkillSphere:** student skills, project ideas, and collaboration.
- **Campus Quest:** quests, XP, badges, and leaderboard.
- **Lost & Found:** post and recover campus items.
- **Student Marketplace:** browse and message about listings.
- **Anonymous Voice:** submit campus feedback and follow its status.
- **Admin Dashboard:** campus analytics and moderation tools for administrator accounts.
- **Campus arrival experience:** responsive Three.js scene with reduced-motion support.

## Technology

- Frontend: HTML, CSS, vanilla JavaScript, Bootstrap, Three.js, Motion, and GSAP/ScrollTrigger.
- Backend: Node.js, Express, REST endpoints, Multer, bcryptjs, and jsonwebtoken.
- Database: SQLite using Node.js `node:sqlite`.

## Run locally

Prerequisites: Node.js 22.13 or newer (the project uses the built-in `node:sqlite` module) and npm.

1. Clone the repository and enter its folder.
2. Install packages with `npm install`.
3. Copy `.env.example` to `.env`.
4. Set `JWT_SECRET` in `.env` to a unique random value with at least 32 characters. Keep `.env` private; it is excluded from Git. Add AI provider keys only if you want to use those services.
5. Start the app with `npm start`. The server initializes the local database and sample campus content on first run.
6. Open `http://localhost:5000`.
7. Create your own local student account using **Register**, then sign in. No shared demo password is published or required.

For local teacher/admin testing, optional `DEMO_TEACHER_PASSWORD` and `DEMO_ADMIN_PASSWORD` values can be set in `.env` before the database is initialized for the first time. These are local-only values; do not commit or share them. A clean database is created automatically in a fresh clone.

## Project structure

```text
backend/       Express server, routes, controllers, SQLite schema and seed data
database/      Local SQLite database files (generated and ignored by Git)
docs/          Project presentation material
frontend/      Static pages, styles, and browser JavaScript
.env.example   Safe environment-variable template
```

## Screenshots

Screenshots can be added here when captured from a running local build. No screenshots are included yet.

## Future improvements

- Add automated backend and accessibility tests.
- Add deployment-independent production configuration and database backups.
- Improve account recovery and role-management workflows.
- Add captured screenshots from the current application.

## Author and credits

Author: _Add your preferred name or handle._

Built with open-source Node.js, Express, SQLite, Bootstrap, Three.js, Motion, and GSAP libraries.
