# Student Project Frontend

Frontend for the student project repository.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run development server:
```bash
npm run dev
```

The application will be available at http://localhost:3000

## Features

- Course Management page
- Explore projects page
- Manage project page
- Registration Page
- Upload Project Page
- View profile page


## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build


## FOR TESTING
if you want to add a project with the upload thingy,
you have to approve it for it to show up on the explore page
so, upload it, then run this command:
```sh
python -c "from database import db_projects; db_projects.approve_project(n); 
```

to delete the project:
```sh
python -c "from database import db_projects; result = db_projects.delete_project(n);"
```

n is the number of the project
