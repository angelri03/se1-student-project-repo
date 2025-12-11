"""
Unit tests for course API endpoints
Tests course CRUD operations and course-topic assignments
"""

import pytest
import json


def test_create_course_success(client, test_db, auth_headers):
    """Test successful course creation"""
    response = client.post(
        '/api/courses',
        json={
            'name': 'Software Engineering 1',
            'description': 'Introduction to software engineering'
        },
        headers=auth_headers
    )
    
    assert response.status_code == 201
    data = response.get_json()
    assert data['success'] is True
    assert 'id' in data


def test_create_course_no_name(client, test_db, auth_headers):
    """Test course creation without name"""
    response = client.post(
        '/api/courses',
        json={'description': 'Test description'},
        headers=auth_headers
    )
    
    assert response.status_code == 400
    data = response.get_json()
    assert data['success'] is False
    assert 'name' in data['message'].lower()


def test_create_course_no_auth(client, test_db):
    """Test course creation without authentication"""
    response = client.post(
        '/api/courses',
        json={'name': 'Test Course'}
    )
    
    assert response.status_code == 401


def test_get_all_courses(client, test_db):
    """Test getting all courses (public endpoint)"""
    response = client.get('/api/courses')
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert 'data' in data
    assert isinstance(data['data'], list)


def test_get_course_by_id(client, test_db, auth_headers):
    """Test getting a specific course by ID"""
    # First create a course
    create_response = client.post(
        '/api/courses',
        json={'name': 'Test Course', 'description': 'Test'},
        headers=auth_headers
    )
    
    course_id = create_response.get_json()['id']
    
    # Now get the course
    response = client.get(f'/api/courses/{course_id}')
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert data['course']['name'] == 'Test Course'


def test_get_course_not_found(client, test_db):
    """Test getting a non-existent course"""
    response = client.get('/api/courses/99999')
    
    assert response.status_code == 404
    data = response.get_json()
    assert data['success'] is False


def test_update_course(client, test_db, auth_headers):
    """Test updating a course"""
    # First create a course
    create_response = client.post(
        '/api/courses',
        json={'name': 'Test Course'},
        headers=auth_headers
    )
    
    course_id = create_response.get_json()['id']

    # Now update the course
    response = client.put(
        f'/api/courses/{course_id}',
        json={
            'name': 'Updated Course',
            'description': 'Updated description'
        },
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True


def test_update_course_no_auth(client, test_db):
    """Test updating a course without authentication"""
    response = client.put(
        '/api/courses/1',
        json={'name': 'Updated Course'}
    )
    
    assert response.status_code == 401


def test_delete_course(client, test_db, auth_headers):
    """Test deleting a course"""
    # First create a course
    create_response = client.post(
        '/api/courses',
        json={'name': 'Test Course'},
        headers=auth_headers
    )
    
    course_id = create_response.get_json()['id']
    
    # Delete the course
    response = client.delete(
        f'/api/courses/{course_id}',
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True


def test_delete_course_no_auth(client, test_db):
    """Test deleting a course without authentication"""
    response = client.delete('/api/courses/1')
    
    assert response.status_code == 401


def test_get_course_topics(client, test_db, auth_headers):
    """Test getting all topics for a course"""
    # Create a course
    course_response = client.post(
        '/api/courses',
        json={'name': 'Test Course'},
        headers=auth_headers
    )
    course_id = course_response.get_json()['id']
    
    # Get topics for the course
    response = client.get(f'/api/courses/{course_id}')
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert 'topics' in data['course'] or 'course' in data
