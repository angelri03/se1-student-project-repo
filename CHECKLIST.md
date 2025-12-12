## Checklist

#### Frontend
- [x] Registration/Login page
- [x] Upload project page
	- [x] Media Attachments
- [x] Explore projects page
	- [x] Include filtering by topics/classes/etc.
- [x] Manage project page for own projects
	- [x] Allow editing data
	- [x] Allow deleting project
	- [x] Allow the owner to invite and remove collaborators
	- [x] Allow uploading media attachments
  - [x] Allow all above operations also for admins
- [x] View profile page
	- [x] Allow editing on own profile page
	- [x] Semester/Programme Tag
	- [x] Organization Tag
		- [ ] View Organization (rather optional)
- [x] Admins approve project before it becomes publicly visible
- [x] Course management page for admins
	- [x] Course Info (including code, name, semester)
- [x] View Project Page
- [ ] View pending projects for admin ?

#### Backend
- [x] General CRUD operations in database
- [x] API endpoints for testing
- [x] Users table
  - [x] Users can be admins
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
	- [ ] Only admin can delete topics
- [ ] Unit Testing with PyTest
	- [ ] UT DB User/Projects/Courses
	- [ ] UT Authentication
	- [x] UT API User/Projects/Courses/Topics
- [x] Dummy Data

#### Optional Things (for future use)
- [ ] Bookmark Page
	- [ ] Bookmark Project Function
 	- [ ] Add to Database
- [ ] Project Details
	- [ ] Share Function
		- [ ] Project Link
	- [ ] Add Link to Project (for example if you are hosting it) -- OPTIONAL NOT REQUIRED
	- [ ] View Project Files
	- [ ] Add Personal Project Tags (should make a distinction)
- [x] Fix Rating on Project
- [x] Download button
- [x] Dynamically allocate projects based on name to profile
- [ ] Visual Changes
	- [ ] Custom Color Schemes (green)
	- [ ] Add Light Mode
	- [ ] Add Logo
	- [ ] Add Header? (maybe)
- Profile Details
	- [ ] Add Github Link for Profle
	- [ ] Add Profile Picture
- [ ] Little About section on the website?
- [ ] Potentially hosting the website


