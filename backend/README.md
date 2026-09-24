# Career Space API

NestJS backend for the Career Space Angular application.

MongoDB is connected through NestJS Mongoose. The API reads its settings from
`backend/.env`. Keep `.env` private and never commit it.

## Getting started

```sh
cd backend
npm install
npm run start:dev
```

The API listens on port `3000` by default. Set `PORT` to change it. Check `GET /health` for a basic service status response.

## Authentication and profiles

The API stores login credentials in the `users` collection and the profile
fields in a separate `userprofiles` collection. Passwords are scrypt hashed.
Login returns a JWT; profile routes require it as a Bearer token.

Register with `POST /auth/register` or sign in with `POST /auth/login` using
`{ "email": "...", "password": "..." }`. Read and update the signed-in
user's profile at `GET /profiles/me` and `PATCH /profiles/me`.

To provision the initial local account, set `SEED_USER_EMAIL`,
`SEED_USER_PASSWORD`, and `SEED_USER_NAME` in `.env`, then run `npm run seed:user`.
The seed command hashes the password before storing it and can be rerun safely.

Projects are stored in the `projects` collection and belong to the authenticated
user. The Angular My projects page uses these protected endpoints:

- `GET /projects/mine` loads the signed-in user's projects.
- `POST /projects` creates a project.
- `PATCH /projects/:id` updates a project.
- `DELETE /projects/:id` deletes a project.

From the repository root, use `npm run backend:start` to start the API in watch mode or `npm run backend:build` to build it.
