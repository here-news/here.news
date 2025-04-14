# MVP 0.1

(please always refer to PDD.md for high-level overview of the project)


## 0. Backlogs for upcoming implementation based on the PDD below (current stage: MVP 0.1)

### 0.1. Backend
- [ ] Leverage existing authentication mechanisms from the legacy system to bootstrap user authentication and registration.
- [ ] Adapt existing API endpoints for user management to align with MVP requirements.
- [ ] Implement basic JWT-based security for public and private data access.
- [ ] Use Redis for caching top content and set up a cron job to refresh the list every 5 minutes, focusing on highly invested and trending publications. Also provide new endpoints for the frontend to access this data.

### 0.2. Frontend
- [ ] Reuse legacy components for displaying publications on the homepage, adapting them to the new "publications" terminology.
- [ ] Implement minimal changes to support both mobile and desktop views for the homepage.

