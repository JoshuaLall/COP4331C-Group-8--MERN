# OurPlace

OurPlace is a household chore management system with:
- a web app (React + TypeScript)
- a mobile app (Flutter)
- a shared backend API (Node.js + Express)
- a MongoDB data store

It is designed so households can create, assign, complete, and track chores, including recurring chores.

## What This Project Is

This repository contains a multi-client full-stack application:
- `frontend/`: web client built with React and Vite
- `mobile/`: Flutter mobile client
- `backend/`: REST API and business logic

Both clients use the same backend endpoints and data model.

## Problem It Solves / Project Purpose

Households often manage chores in ad-hoc ways (text messages, whiteboards, memory), which creates friction:
- unclear ownership
- missed recurring tasks
- weak visibility into completion
- no shared source of truth for members

OurPlace provides a centralized system where users can:
- create one-time and recurring chores
- assign chores to specific members
- claim and complete chores
- view chores by category (open, assigned, mine, completed, recurring)
- manage household membership and invites
- manage account settings and password updates

## How It Was Developed

The project was developed as a full-stack monorepo with a shared API contract:
1. Backend routes were created for auth, users, households, chores, and recurring chores.
2. The React app implemented page-based workflows for desktop web usage.
3. The Flutter app was built as a companion mobile experience using the same API.
4. Features were expanded iteratively (registration, household creation/joining, recurring task generation, settings, password and email flows).
5. Ongoing updates have focused on consistency between clients and improving edge-case behavior (for example, leaving/deleting empty households and recurring assignment updates).

## Important Implementation Details

### Auth and session model
- API auth uses JWT bearer tokens.
- The frontend stores token/user identifiers in local storage.
- Protected backend routes are mounted behind auth middleware.

### Household model
- Users belong to a household via `HouseholdID`.
- Households maintain `MemberIDs` and an `InviteCode`.
- Users can join by invite code.
- Household names can be renamed from settings.

### Leave-household behavior
- If a member leaves and other members remain, only membership and related assignments are updated.
- If the last member leaves, the household and household-scoped chores/templates are deleted.

### Recurring chores
- Recurring templates are stored separately from chore instances.
- Generation logic creates chore instances from active templates.
- Editing recurring assignment updates template defaults and active recurring instances.

### Web/mobile API model
- Web uses Vite proxy from `/api` to backend port 5000.
- Mobile uses a configurable API base URL and defaults to Android emulator localhost bridge (`10.0.2.2`).

## High-Level Architecture

```text
[React Web]        [Flutter Mobile]
      |                   |
      +-------- HTTP/JSON +
                  |
             [Express API]
        (auth, users, households,
         chores, recurring chores)
                  |
              [MongoDB]
```

## Technology Stack

### Backend
- Node.js
- Express 5
- MongoDB Node Driver
- JWT (`jsonwebtoken`) for auth
- Password hashing (`bcryptjs`, `bcrypt`)
- Email providers/utilities (`nodemailer`, `resend`)
- `dotenv` for environment configuration
- `nodemon` for local development

### Frontend (Web)
- React 19
- TypeScript
- React Router
- Vite
- ESLint + TypeScript ESLint

### Mobile
- Flutter (Dart)
- `http` for API calls
- `shared_preferences` for local session persistence
- `intl` for date formatting
- `google_fonts` for typography

### Database
- MongoDB Atlas-compatible schema and collections:
  - `Users`
  - `Households`
  - `Chores`
  - `RecurringChores`
  - `ActivityLog` (model present)

## Technologies Used and Why

- React + TypeScript: fast UI iteration with stronger type safety for page/state-heavy flows.
- Flutter: single codebase mobile app with good Material support and API integration.
- Express: lightweight and flexible routing layer for rapid feature development.
- MongoDB: document model fits evolving app objects (users, chores, templates, invite workflows).
- JWT: straightforward stateless auth for multiple clients.
- Vite: fast local dev/HMR and simple proxy configuration.

## Additional Tools Beyond Typical Course Requirements

Current repo evidence shows use of:
- Vite dev server and proxy for local full-stack integration
- Nodemon for backend hot reload
- Resend and Nodemailer for transactional email workflows
- MongoDB Atlas connection support

## Setup and Run

## Prerequisites
- Node.js 18+
- npm
- Flutter SDK (for mobile)
- Access to MongoDB instance

## 1) Backend

```bash
cd backend
npm install
npm run dev
```

API runs on `http://localhost:5000`.

Recommended environment variables:
- `JWT_SECRET`
- `RESEND_API_KEY`
- `EMAIL_USER`
- `EMAIL_PASS`
- `MONGODB_URI` (recommended improvement)

## 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Web app runs on `http://localhost:5173` and proxies `/api` to backend.

## 3) Mobile

```bash
cd mobile
flutter pub get
flutter run
```

For Android emulator, default API base should resolve to:
- `http://10.0.2.2:5000/api`

For physical device, pass an explicit host:

```bash
flutter run --dart-define=OURPLACE_API_BASE=http://YOUR_COMPUTER_IP:5000/api
```

## Feature Summary

- Authentication (register, login, email verification support, password reset flow)
- Household creation and joining via invite code
- Household settings (rename household, invite members, leave household)
- Chore management (create, edit, assign, claim, complete)
- Recurring chore templates and generation/update flows
- Cross-client behavior (web + mobile using shared backend)

## AI Disclosure

This project used AI-assisted development tools for parts of implementation and maintenance.

AI-assisted tasks included:
- refactoring UI
- helping with debugging and edge-case handling
- generating and improving technical documentation
- suggesting implementation approaches and quick validation steps

All AI-generated or AI-assisted changes were reviewed and integrated by the development team.

## Repository Structure

```text
backend/
frontend/
mobile/
```
