## Checklist

#### Frontend
- [ ] Registration/Login page
- [ ] Upload project page
- [ ] Explore projects page
	- [ ] Include filtering by topics/classes/etc.
- [ ] Manage project page (for own projects and for admins)
	- [ ] Allow editing data
	- [ ] Allow deleting project
	- [ ] Allow the owner to invite and remove collaborators
	- [ ] Allow uploading media attachments
- [ ] View profile page
	- [ ] Allow editing on own profile page
- [ ] Admins approve project before it becomes publicly visible
- [ ] Course management page for admins

#### Backend
- [x] General CRUD operations in database
- [x] API endpoints for testing
- [x] Users table
- [ ] API endpoints for registration (and optionally account deletion?)
- [ ] Projects table
	- [ ] Also handle file uploading, either by hosting the files
 somewhere externally or by allowing direct upload
	- [ ] Allow mapping multiple users to the same project
- [ ] Require validation for project uploads
- [ ] API endpoints for new project, delete project, edit project
- [ ] Courses table
- [ ] API endpoints for managing courses, only accessible by admin
- [ ] Topics table (or just topics list ?)
- [ ] Some method to manage, only accessible by admins, based on the data type we choose