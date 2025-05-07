# Contributing to Memory Graph Interface

This document provides guidelines and instructions for setting up a development environment for Memory Graph Interface.

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/aaronsb/memory-graph-interface.git
   cd memory-graph-interface
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

4. Edit the `.env` file to set your database path or use the included test database.

5. Start the development server:
   ```bash
   npm run dev
   ```

This will start the server and webpack in watch mode, automatically rebuilding when files change.

## npm Scripts

We've organized the npm scripts into logical categories:

### Development

- `npm run dev` - Start the development server with hot reloading (builds JS first)
- `npm run watch` - Run webpack in watch mode to rebuild on file changes
- `npm run server` - Start the Express server without rebuilding JS

### Production

- `npm run start` - Build JS and start the server for production use
- `npm run build` - Build JS in production mode (minified)

### Build Tools

- `npm run build:js` - Build the JavaScript bundle in development mode
- `npm run build:js:prod` - Build the JavaScript bundle in production mode
- `npm run extract-modules` - Extract module information (for development)

### Docker Tools

- `npm run docker:build` - Build the Docker image
- `npm run docker:start` - Start the Docker container using docker-compose
- `npm run docker:stop` - Stop the Docker container
- `npm run docker:logs` - View logs from the Docker container

## Project Structure

- `/public` - Static files and client-side code
  - `/js` - JavaScript source files
    - `/modules-v2` - Modular components
    - `/dist` - Built JavaScript files
- `/docs` - Documentation files
- `/scripts` - Utility scripts
- `server.js` - Main server file

## Database Schema

The application requires a specific database schema. See [docs/database-schema.md](docs/database-schema.md) for details on the required tables and fields.

## Code Style

- Use camelCase for JavaScript variables and functions
- Use PascalCase for class names
- Document functions and methods with JSDoc comments
- Format code with reasonable spacing and indentation
- Keep functions focused on a single responsibility

## Pull Request Process

1. Fork the repository
2. Create a branch for your feature/fix
3. Make your changes
4. Test your changes
5. Submit a pull request

## License

By contributing to this project, you agree that your contributions will be licensed under the project's MIT License.