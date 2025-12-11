# Frontend Web Application

React-based user interface for the student project repository platform.

## Quick Start

### Prerequisites
- Node.js 18+ and npm

### Installation

1. **Navigate to frontend directory**
   ```sh
   cd frontend
   ```

2. **Install dependencies**
   ```sh
   npm install
   ```

3. **Start development server**
   ```sh
   npm run dev
   ```

The application will be available at `http://localhost:3000`

## Features

### Pages
- **Home/Explore** - Browse and search projects
- **Project Details** - View individual project information
- **Upload Project** - Submit new projects (requires authentication)
- **Login/Register** - User authentication
- **Profile** - User profile management

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Development Notes

### Testing the Upload Functionalities

**Note:** Uploaded projects require manual approval before appearing on the explore page.

To approve a project after uploading:
```sh
cd backend
python -c "from database import db_projects; db_projects.approve_project(PROJECT_ID)"
```

To delete a test project:
```sh
cd backend
python -c "from database import db_projects; db_projects.delete_project(PROJECT_ID)"
```

Replace `PROJECT_ID` with the numeric ID of the project.
