## Checklist

#### Frontend
- [ ] Registration/Login page
- [x] Upload project page
	- [ ] Media Attachments
- [x] Explore projects page
	- [x] Include filtering by topics/classes/etc.
- [ ] Manage project page (for own projects and for admins)
	- [ ] Allow editing data
	- [ ] Allow deleting project
	- [ ] Allow the owner to invite and remove collaborators
	- [ ] Allow uploading media attachments
- [x] View profile page
	- [x] Allow editing on own profile page
- [ ] Admins approve project before it becomes publicly visible
- [ ] Course management page for admins
- [x] View Project Page

#### Backend
- [x] General CRUD operations in database
- [x] API endpoints for testing
- [x] Users table
- [x] API endpoints for registration and account deletion
- [x] Projects table
	- [x] Handle file uploading
	- [x] Allow mapping multiple users to the same project
	- [x] Allow mapping projects to topics (n-to-n)
- [x] Require validation for project uploads
- [x] API endpoints for new project, delete project, edit project
- [x] Courses table
- [x] API endpoints for managing courses
	- [ ] Only accessible by admin
- [x] Topics table
- [x] API endpoints for managing topics 
	- [ ] Only accessible by admin
- [ ] Unit Testing with PyTest
- [x] Dummy Data

#### Optional Things (for future use)
- [ ] Bookmark Page
	- [ ] Bookmark Project Function
 	- [ ] Add to Database
- [ ] Share Function
	- [ ] Project Link
- [ ] Add Link to Project (for example if you are hosting it) -- OPTIONAL NOT REQUIRED
- [ ] View Project Files
- [ ] Fix Rating on Project
- [ ] Download button
- [ ] Dynamically allocate projects based on name to profile
