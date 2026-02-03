"""
Pytest configs for backend tests
"""

import pytest
import sys
import os
import sqlite3
from pathlib import Path
import sqlite3
import gc

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# Import after adding to path
from main import app
import database

TEST_DB = 'test_se1.db'

@pytest.fixture(scope='function')
def test_db():
    """Create a fresh test database for each test"""
    # Set test database for all modules
    database.db_core.DATABASE_NAME = TEST_DB
    database.db_users.DATABASE_NAME = TEST_DB
    database.db_projects.DATABASE_NAME = TEST_DB
    database.db_courses.DATABASE_NAME = TEST_DB
    database.db_topics.DATABASE_NAME = TEST_DB
    database.db_ratings.DATABASE_NAME = TEST_DB
    database.db_media.DATABASE_NAME = TEST_DB
    database.db_project_owners.DATABASE_NAME = TEST_DB
    database.db_bookmarks.DATABASE_NAME = TEST_DB
    database.db_notifications.DATABASE_NAME = TEST_DB
    database.db_reports.DATABASE_NAME = TEST_DB
    
    # Remove existing test database
    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)
    
    # Initialize fresh database
    database.init_db()
    
    yield TEST_DB
    
    # Cleanup - close all database connections first
    gc.collect()

    try:
        conn = sqlite3.connect(TEST_DB)
        conn.close()
    except:
        pass
    
    if os.path.exists(TEST_DB):
        try:
            os.remove(TEST_DB)
        except PermissionError:
            import time
            time.sleep(0.1)
            try:
                os.remove(TEST_DB)
            except:
                pass

@pytest.fixture(scope='function')
def client(test_db):
    """Create a test client for Flask app"""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

@pytest.fixture(scope='function')
def sample_user(test_db):
    """Create a sample user for testing"""
    user_data = {
        'username': 'testuser',
        'password': 'testpass123',
        'email': 'test@example.com'
    }
    result = database.create_user(**user_data)
    return {
        'id': result['id'],
        'username': user_data['username'],
        'password': user_data['password'],
        'email': user_data['email']
    }

@pytest.fixture(scope='function')
def auth_token(client, sample_user):
    """Get an authentication token for a sample user"""
    response = client.post('/api/login', json={
        'email': sample_user['username'], 
        'password': sample_user['password']
    })
    data = response.get_json()
    if not data.get('success'):
        raise Exception(f"Login failed: {data.get('message')}")
    return data['token']

@pytest.fixture(scope='function')
def sample_project(test_db, sample_user):
    """Create a sample project for testing"""
    project_data = {
        'name': 'Test Project',
        'description': 'A test project',
        'file_path': '/test/path/project.zip',
        'file_size': 1024,
        'creator_user_id': sample_user['id']
    }
    result = database.create_project(**project_data)
    return {
        'id': result['id'],
        **project_data
    }

@pytest.fixture(scope='function')
def auth_headers(auth_token):
    """Create authentication headers with bearer token"""
    return {'Authorization': f'Bearer {auth_token}'}

@pytest.fixture(scope='function')
def admin_headers(client, test_db):
    """Create authentication headers for an admin user"""
    # Create admin user
    admin_data = {
        'username': 'adminuser',
        'password': 'password',
        'email': 'admin@example.com'
    }
    result = database.create_user(**admin_data)
    
    # Set admin flag directly in database
    conn = sqlite3.connect(TEST_DB)
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET admin = 1 WHERE id = ?", (result['id'],))
    conn.commit()
    conn.close()
    
    # Login as admin
    response = client.post('/api/login', json={
        'email': admin_data['username'],
        'password': admin_data['password']
    })
    data = response.get_json()
    if not data.get('success'):
        raise Exception(f"Admin login failed: {data.get('message')}")
    token = data['token']
    
    return {'Authorization': f'Bearer {token}'}
