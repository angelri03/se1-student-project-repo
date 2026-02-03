# Backend Unit Tests

This directory contains comprehensive unit tests for the SE1 project backend API and database operations.

## Test Structure

### API Tests
- `test_api_bookmarks.py` - Bookmark operations (add, remove, list, check)
- `test_api_courses.py` - Course management (CRUD operations, admin-only)
- `test_api_logs.py` - Admin log viewing with filtering and pagination
- `test_api_notifications.py` - User notification management
- `test_api_projects.py` - Project operations (create, update, delete, browse)
- `test_api_reports.py` - Report submission and admin management
- `test_api_topics.py` - Topic management (CRUD operations, admin-only)
- `test_api_users.py` - User authentication and account management

### Database Tests
- `test_db_bookmarks.py` - Bookmark database operations
- `test_db_notifications.py` - Notification database functions
- `test_db_projects.py` - Project database operations
- `test_db_ratings.py` - Rating system database functions
- `test_db_reports.py` - Report database operations
- `test_db_users.py` - User database functions

### Configuration
- `conftest.py` - Shared pytest fixtures including test database setup, authentication helpers, and sample data

## Running Tests

### Run all tests
```bash
cd backend
pytest -v
```

### Run specific test file
```bash
pytest tests/test_api_users.py -v
```

### Run specific test function
```bash
pytest tests/test_api_users.py::test_register_success -v
```