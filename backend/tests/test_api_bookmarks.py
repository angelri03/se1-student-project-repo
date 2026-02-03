"""
Unit tests for bookmark API endpoints
Tests adding, removing, and retrieving bookmarks
"""

import pytest
import json
from io import BytesIO


def test_add_bookmark_success(client, test_db, auth_headers):
    """Test successfully adding a bookmark"""
    # First create a project
    upload_data = {
        'name': 'Test Project',
        'description': 'Test description',
        'file': (BytesIO(b'zip content'), 'test.zip')
    }
    
    upload_response = client.post(
        '/api/projects',
        data=upload_data,
        content_type='multipart/form-data',
        headers=auth_headers
    )
    
    project_id = upload_response.get_json()['project']['id']
    
    # Add bookmark
    response = client.post(
        '/api/bookmarks',
        json={'project_id': project_id},
        headers=auth_headers
    )
    
    assert response.status_code == 201
    data = response.get_json()
    assert data['success'] is True


def test_add_bookmark_no_project_id(client, test_db, auth_headers):
    """Test adding bookmark without project_id"""
    response = client.post(
        '/api/bookmarks',
        json={},
        headers=auth_headers
    )
    
    assert response.status_code == 400
    data = response.get_json()
    assert data['success'] is False
    assert 'project_id' in data['message'].lower()


def test_add_bookmark_no_auth(client, test_db):
    """Test adding bookmark without authentication"""
    response = client.post(
        '/api/bookmarks',
        json={'project_id': 1}
    )
    
    assert response.status_code == 401


def test_add_bookmark_invalid_project(client, test_db, auth_headers):
    """Test adding bookmark for non-existent project"""
    response = client.post(
        '/api/bookmarks',
        json={'project_id': 99999},
        headers=auth_headers
    )
    
    assert response.status_code == 400
    data = response.get_json()
    assert data['success'] is False


def test_add_bookmark_duplicate(client, test_db, auth_headers):
    """Test adding same bookmark twice"""
    # Create project
    upload_data = {
        'name': 'Test Project',
        'file': (BytesIO(b'zip content'), 'test.zip')
    }
    
    upload_response = client.post(
        '/api/projects',
        data=upload_data,
        content_type='multipart/form-data',
        headers=auth_headers
    )
    
    project_id = upload_response.get_json()['project']['id']
    
    # Add bookmark first time
    client.post(
        '/api/bookmarks',
        json={'project_id': project_id},
        headers=auth_headers
    )
    
    # Try adding again
    response = client.post(
        '/api/bookmarks',
        json={'project_id': project_id},
        headers=auth_headers
    )
    
    assert response.status_code in [201, 400]


def test_remove_bookmark_success(client, test_db, auth_headers):
    """Test successfully removing a bookmark"""
    # Create project and add bookmark
    upload_data = {
        'name': 'Test Project',
        'file': (BytesIO(b'zip content'), 'test.zip')
    }
    
    upload_response = client.post(
        '/api/projects',
        data=upload_data,
        content_type='multipart/form-data',
        headers=auth_headers
    )
    
    project_id = upload_response.get_json()['project']['id']
    
    # Add bookmark
    client.post(
        '/api/bookmarks',
        json={'project_id': project_id},
        headers=auth_headers
    )
    
    # Remove bookmark
    response = client.delete(
        f'/api/bookmarks/{project_id}',
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True


def test_remove_bookmark_no_auth(client, test_db):
    """Test removing bookmark without authentication"""
    response = client.delete('/api/bookmarks/1')
    
    assert response.status_code == 401


def test_remove_bookmark_not_bookmarked(client, test_db, auth_headers):
    """Test removing a bookmark that doesn't exist"""
    response = client.delete(
        '/api/bookmarks/99999',
        headers=auth_headers
    )
    
    assert response.status_code == 400
    data = response.get_json()
    assert data['success'] is False


def test_get_bookmarks_empty(client, test_db, auth_headers):
    """Test getting bookmarks when user has none"""
    response = client.get(
        '/api/bookmarks',
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert isinstance(data['data'], list)
    assert len(data['data']) == 0


def test_get_bookmarks_with_data(client, test_db, auth_headers):
    """Test getting bookmarks when user has bookmarks"""
    # Create and bookmark a project
    upload_data = {
        'name': 'Test Project',
        'file': (BytesIO(b'fake zip content'), 'test.zip')
    }
    
    upload_response = client.post(
        '/api/projects',
        data=upload_data,
        content_type='multipart/form-data',
        headers=auth_headers
    )
    
    project_id = upload_response.get_json()['project']['id']
    
    client.post(
        '/api/bookmarks',
        json={'project_id': project_id},
        headers=auth_headers
    )
    
    # Get bookmarks
    response = client.get(
        '/api/bookmarks',
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert len(data['data']) > 0


def test_get_bookmarks_no_auth(client, test_db):
    """Test getting bookmarks without authentication"""
    response = client.get('/api/bookmarks')
    
    assert response.status_code == 401


def test_check_bookmark_true(client, test_db, auth_headers):
    """Test checking if project is bookmarked (true)"""
    # Create and bookmark a project
    upload_data = {
        'name': 'Test Project',
        'file': (BytesIO(b'fake zip content'), 'test.zip')
    }
    
    upload_response = client.post(
        '/api/projects',
        data=upload_data,
        content_type='multipart/form-data',
        headers=auth_headers
    )
    
    project_id = upload_response.get_json()['project']['id']
    
    client.post(
        '/api/bookmarks',
        json={'project_id': project_id},
        headers=auth_headers
    )
    
    # Check bookmark status
    response = client.get(
        f'/api/bookmarks/check/{project_id}',
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert data['is_bookmarked'] is True


def test_check_bookmark_false(client, test_db, auth_headers):
    """Test checking if project is bookmarked (false)"""
    # Create project without bookmarking
    upload_data = {
        'name': 'Test Project',
        'file': (BytesIO(b'fake zip content'), 'test.zip')
    }
    
    upload_response = client.post(
        '/api/projects',
        data=upload_data,
        content_type='multipart/form-data',
        headers=auth_headers
    )
    
    project_id = upload_response.get_json()['project']['id']
    
    # Check bookmark status
    response = client.get(
        f'/api/bookmarks/check/{project_id}',
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert data['is_bookmarked'] is False


def test_check_bookmark_no_auth(client, test_db):
    """Test checking bookmark without authentication"""
    response = client.get('/api/bookmarks/check/1')
    
    assert response.status_code == 401


def test_bookmark_isolation_between_users(client, test_db):
    """Test that bookmarks are isolated between different users"""
    # Create two users
    user1_response = client.post('/api/register', json={
        'username': 'user1',
        'password': 'password123',
        'email': 'user1@example.com'
    })
    user1_token = user1_response.get_json()['token']
    user1_headers = {'Authorization': f'Bearer {user1_token}'}
    
    user2_response = client.post('/api/register', json={
        'username': 'user2',
        'password': 'password123',
        'email': 'user2@example.com'
    })
    user2_token = user2_response.get_json()['token']
    user2_headers = {'Authorization': f'Bearer {user2_token}'}
    
    # User1 creates and bookmarks a project
    upload_data = {
        'name': 'Test Project',
        'file': (BytesIO(b'fake zip content'), 'test.zip')
    }
    
    upload_response = client.post(
        '/api/projects',
        data=upload_data,
        content_type='multipart/form-data',
        headers=user1_headers
    )
    
    project_id = upload_response.get_json()['project']['id']
    
    client.post(
        '/api/bookmarks',
        json={'project_id': project_id},
        headers=user1_headers
    )
    
    # Check user1 has bookmark
    response1 = client.get('/api/bookmarks', headers=user1_headers)
    assert len(response1.get_json()['data']) > 0
    
    # Check user2 has no bookmarks
    response2 = client.get('/api/bookmarks', headers=user2_headers)
    assert len(response2.get_json()['data']) == 0
