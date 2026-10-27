# plmb_website

[![qa](https://github.com/PLMB-CPA/plmb_website/actions/workflows/qa.yml/badge.svg?branch=main)](https://github.com/PLMB-CPA/plmb_website/actions/workflows/qa.yml)
[![dev](https://github.com/PLMB-CPA/plmb_website/actions/workflows/dev.yml/badge.svg?branch=develop)](https://github.com/PLMB-CPA/plmb_website/actions/workflows/dev.yml)

**Po Lao Marquez Benedictos & Co. Online Portal** — CSSWENG Project Group 8 (S08)

---

## Tech Stack
- **Frontend:** React.js + Vite (`client/`)
- **Backend:** Node.js + Express.js (`server.js`, `src/`)
- **Database:** MongoDB with Mongoose
- **Testing & Quality:** Oxlint, Jest, Vitest + React Testing Library, Supertest + `mongodb-memory-server`, Playwright
- **CI/CD:** GitHub Actions (`.github/workflows/dev.yml`, `qa.yml`, `release.yml`) + Render

---

## Development & CI Commands

```bash
# Install dependencies
npm ci
npm ci --prefix client

# Lint frontend (Oxlint)
npm run lint --prefix client

# Build frontend (Vite -> client/dist)
npm run build --prefix client

# Run backend unit tests (Jest)
npm run test:unit -- --ci

# Run frontend unit tests (Vitest)
npm test --prefix client

# Run API & DB integration tests (Supertest + mongodb-memory-server)
npm run test:integration -- --ci

# Run end-to-end tests (Playwright)
npm run test:e2e
```

---

## Git Flow & Team Standards

| Branch | Purpose | Created From | Merges Into | Merge Strategy |
| :--- | :--- | :--- | :--- | :--- |
| `main` | Production-ready deployed code | — | — | — |
| `develop` | Integration branch for completed work | `main` | `main` | Merge commit |
| `feature/<id>-<short-name>` | One user story or feature | `develop` | `develop` | Squash and merge |
| `bugfix/<id>-<short-name>` | Non-urgent bug fixes | `develop` | `develop` | Squash and merge |
| `hotfix/<short-name>` | Urgent production fixes | `main` | `main` & `develop` | Merge commit |

### Day-to-Day Workflow
1. Pick a card on the Notion board and move it to **In Progress**.
2. Pull the latest `develop` and create a branch (`git checkout -b feature/F01-short-name develop`).
3. Commit changes using **Conventional Commits** (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`).
4. Push and open a Pull Request into `develop`.
5. Ensure all `dev.yml` CI checks pass and obtain **at least 2 peer approvals**.
6. **Squash and merge** into `develop` and delete the feature branch.
