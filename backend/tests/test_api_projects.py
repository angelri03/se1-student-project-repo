"""
Unit tests for project API endpoints
Tests project upload, download, search, and management
"""

import pytest
import json
import os
from io import BytesIO
from api.auth import create_token


def test_upload_project_success(client, test_db, auth_headers):
    """Test successful project upload"""
    # Create a fake zip file
    data = {
        'name': 'Test Project',
        'description': 'Test description',
        'tags': 'python, web',
        'file': (BytesIO(b'fake zip content'), 'test.zip')
    }
    
    response = client.post(
        '/api/projects',
        data=data,
        content_type='multipart/form-data',
        headers=auth_headers
    )
    
    assert response.status_code == 201
    data = response.get_json()
    assert data['success'] is True
    assert 'project' in data
    assert data['project']['name'] == 'Test Project'


def test_upload_project_no_file(client, test_db, auth_headers):
    """Test project upload without file"""
    response = client.post(
        '/api/projects',
        data={'name': 'Test Project'},
        content_type='multipart/form-data',
        headers=auth_headers
    )
    
    assert response.status_code == 400
    data = response.get_json()
    assert data['success'] is False
    assert 'file' in data['message'].lower()


def test_upload_project_no_name(client, test_db, auth_headers):
    """Test project upload without name"""
    data = {
        'file': (BytesIO(b'fake zip content'), 'test.zip')
    }
    
    response = client.post(
        '/api/projects',
        data=data,
        content_type='multipart/form-data',
        headers=auth_headers
    )
    
    assert response.status_code == 400
    data = response.get_json()
    assert data['success'] is False
    assert 'name' in data['message'].lower()


def test_upload_project_invalid_extension(client, test_db, auth_headers):
    """Test project upload with invalid file extension"""
    data = {
        'name': 'Test Project',
        'file': (BytesIO(b'fake content'), 'test.txt')
    }
    
    response = client.post(
        '/api/projects',
        data=data,
        content_type='multipart/form-data',
        headers=auth_headers
    )
    
    assert response.status_code == 400
    data = response.get_json()
    assert data['success'] is False
    assert 'zip' in data['message'].lower()


def test_upload_project_no_auth(client, test_db):
    """Test project upload without authentication"""
    data = {
        'name': 'Test Project',
        'file': (BytesIO(b'fake zip content'), 'test.zip')
    }
    
    response = client.post(
        '/api/projects',
        data=data,
        content_type='multipart/form-data'
    )
    
    assert response.status_code == 401


def test_get_all_projects(client, test_db):
    """Test getting all approved projects (public endpoint)"""
    response = client.get('/api/projects')
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert 'data' in data
    assert isinstance(data['data'], list)


def test_get_project_by_id(client, test_db, auth_headers):
    """Test getting a specific project by ID"""
    # First upload a project
    upload_data = {
        'name': 'Test Project',
        'description': 'Test description',
        'file': (BytesIO(b'fake zip content'), 'test.zip')
    }
    
    upload_response = client.post(
        '/api/projects',
        data=upload_data,
        content_type='multipart/form-data',
        headers=auth_headers
    )
    
    project_id = upload_response.get_json()['project']['id']
    
    # Now get the project
    response = client.get(f'/api/projects/{project_id}')
    
    # Project might not be visible if not approved
    assert response.status_code in [200, 404]


def test_get_project_not_found(client, test_db):
    """Test getting a non-existent project"""
    response = client.get('/api/projects/99999')
    
    assert response.status_code == 404
    data = response.get_json()
    assert data['success'] is False


def test_approve_project_admin(client, test_db, admin_headers):
    """Test approving a project as admin"""
    # First upload a project
    upload_data = {
        'name': 'Test Project',
        'description': 'Test description',
        'file': (BytesIO(b'fake zip content'), 'test.zip')
    }
    
    upload_response = client.post(
        '/api/projects',
        data=upload_data,
        content_type='multipart/form-data',
        headers=admin_headers
    )
    
    project_id = upload_response.get_json()['project']['id']
    
    # Approve the project
    response = client.post(
        f'/api/projects/{project_id}/approve',
        headers=admin_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True


def test_approve_project_non_admin(client, test_db, auth_headers):
    """Test that non-admin users cannot approve projects"""
    response = client.post(
        '/api/projects/1/approve',
        headers=auth_headers
    )
    
    assert response.status_code == 403
    data = response.get_json()
    assert data['success'] is False
    assert 'admin' in data['message'].lower()


def test_get_all_projects_admin(client, test_db, admin_headers):
    """Test getting all projects including unapproved (admin only)"""
    response = client.get(
        '/api/projects/all',
        headers=admin_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True


def test_get_all_projects_non_admin(client, test_db, auth_headers):
    """Test that non-admin users cannot get all projects"""
    response = client.get(
        '/api/projects/all',
        headers=auth_headers
    )
    
    assert response.status_code == 403


def test_rate_project_invalid_rating(client, test_db, auth_headers):
    """Test rating a project with invalid rating"""
    response = client.post(
        '/api/projects/1/rate',
        json={'rating': 10},  # Invalid: must be 1-5
        headers=auth_headers
    )
    
    assert response.status_code in [400, 404]


def test_delete_project(client, test_db, auth_headers):
    """Test deleting a project"""
    # First upload a project
    upload_data = {
        'name': 'Test Project',
        'description': 'Test description',
        'file': (BytesIO(b'fake zip content'), 'test.zip')
    }
    
    upload_response = client.post(
        '/api/projects',
        data=upload_data,
        content_type='multipart/form-data',
        headers=auth_headers
    )
    
    project_id = upload_response.get_json()['project']['id']
    
    # Delete the project
    response = client.delete(
        f'/api/projects/{project_id}',
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True


def test_delete_project_unauthorized(client, test_db, auth_headers):
    """Test that users cannot delete projects they don't own"""
    # Create another user and their project
    register_response = client.post('/api/register', json={
        'username': 'otheruser',
        'password': 'password123',
        'email': 'other@example.com'
    })
    
    other_token = register_response.get_json()['token']
    other_headers = {'Authorization': f'Bearer {other_token}'}
    
    # Other user uploads a project
    upload_data = {
        'name': 'Other User Project',
        'file': (BytesIO(b'fake zip content'), 'test.zip')
    }
    
    upload_response = client.post(
        '/api/projects',
        data=upload_data,
        content_type='multipart/form-data',
        headers=other_headers
    )
    
    project_id = upload_response.get_json()['project']['id']
    
    # Try to delete with first user's token
    response = client.delete(
        f'/api/projects/{project_id}',
        headers=auth_headers
    )
    
    assert response.status_code in [403, 404]
