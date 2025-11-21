# Changelog

All notable changes to the "Guardian Nexus" project will be documented in this file.

## [Unreleased]

## [0.1.0] - 2025-11-21

### Added
- **Project Foundation**: Initialized React + Vite project with Tailwind CSS.
- **Manifest System**: Implemented automated downloading and parsing of the Destiny 2 Manifest (SQLite) in `api/services/manifestService.js`.
- **Authentication**: Implemented Bungie.net OAuth 2.0 flow in `api/routes/auth.js`.
- **Dashboard**: Created a basic Dashboard component to display User Characters and Light Level.
- **Vercel Support**: Configured `vercel.json` and refactored backend to `api/index.js` for Serverless deployment.

### Changed
- **Backend Architecture**: Migrated from a stateful Express server (MongoDB) to a stateless Vercel Serverless architecture using `cookie-session`.
- **Manifest Storage**: Updated manifest service to use `/tmp` directory for compatibility with Vercel's ephemeral file system.
- **API Routing**: Updated frontend to use relative paths (`/api/...`) for seamless integration with the serverless backend.

### Fixed
- **Vercel 404 Errors**: Fixed routing issues by adding explicit rewrites in `vercel.json` for `/auth/callback`.
- **Public Client Auth**: Modified `authService.js` to support Public Clients by making `client_secret` optional (ignoring placeholders).
- **Profile Fetch Error**: Fixed 500 error by correctly fetching `destinyMembershipId` and `membershipType` (Steam/Xbox/PSN) instead of using the generic Bungie account ID.

### Security
- **Environment Variables**: Removed unused `MONGODB_URI`. Ensured sensitive keys are loaded from process.env.
