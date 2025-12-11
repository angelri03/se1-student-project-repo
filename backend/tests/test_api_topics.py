"""
Unit tests for topic API endpoints
Tests topic CRUD operations
"""

import pytest
import json


def test_create_topic_success(client, test_db, auth_headers):
    """Test successful topic creation"""
    response = client.post(
        '/api/topics',
        json={
            'name': 'Web Development',
            'description': 'Topics related to web development'
        },
        headers=auth_headers
    )
    
    assert response.status_code == 201
    data = response.get_json()
    assert data['success'] is True
    assert 'id' in data


def test_create_topic_no_name(client, test_db, auth_headers):
    """Test topic creation without name"""
    response = client.post(
        '/api/topics',
        json={'description': 'Test description'},
        headers=auth_headers
    )
    
    assert response.status_code == 400
    data = response.get_json()
    assert data['success'] is False
    assert 'name' in data['message'].lower()


def test_create_topic_no_auth(client, test_db):
    """Test topic creation without authentication"""
    response = client.post(
        '/api/topics',
        json={'name': 'Test Topic'}
    )
    
    assert response.status_code == 401


def test_get_all_topics(client, test_db):
    """Test getting all topics"""
    response = client.get('/api/topics')
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert 'data' in data
    assert isinstance(data['data'], list)


def test_get_topic_by_id(client, test_db, auth_headers):
    """Test getting a specific topic by ID"""
    # First create a topic
    create_response = client.post(
        '/api/topics',
        json={'name': 'Test Topic', 'description': 'Test'},
        headers=auth_headers
    )
    
    topic_id = create_response.get_json()['id']
    
    # Now get the topic
    response = client.get(f'/api/topics/{topic_id}')
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert data['topic']['name'] == 'Test Topic'


def test_get_topic_not_found(client, test_db):
    """Test getting a non-existent topic"""
    response = client.get('/api/topics/99999')
    
    assert response.status_code == 404
    data = response.get_json()
    assert data['success'] is False


def test_update_topic(client, test_db, auth_headers):
    """Test updating a topic"""
    # First create a topic
    create_response = client.post(
        '/api/topics',
        json={'name': 'Test Topic'},
        headers=auth_headers
    )
    
    topic_id = create_response.get_json()['id']
    
    # Update the topic
    response = client.put(
        f'/api/topics/{topic_id}',
        json={
            'name': 'Updated Topic',
            'description': 'Updated description'
        },
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True


def test_update_topic_no_auth(client, test_db):
    """Test updating a topic without authentication"""
    response = client.put(
        '/api/topics/1',
        json={'name': 'Updated Topic'}
    )
    
    assert response.status_code == 401


def test_delete_topic(client, test_db, auth_headers):
    """Test deleting a topic"""
    # First create a topic
    create_response = client.post(
        '/api/topics',
        json={'name': 'Test Topic'},
        headers=auth_headers
    )
    
    topic_id = create_response.get_json()['id']
    
    # Delete the topic
    response = client.delete(
        f'/api/topics/{topic_id}',
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True


def test_delete_topic_no_auth(client, test_db):
    """Test deleting a topic without authentication"""
    response = client.delete('/api/topics/1')
    
    assert response.status_code == 401


def test_create_duplicate_topic(client, test_db, auth_headers):
    """Test creating a topic with duplicate name"""
    # Create first topic
    client.post(
        '/api/topics',
        json={'name': 'Duplicate Topic'},
        headers=auth_headers
    )
    
    # Try to create another with same name
    response = client.post(
        '/api/topics',
        json={'name': 'Duplicate Topic'},
        headers=auth_headers
    )
    
    # Should either succeed or fail with duplicate error
    assert response.status_code in [201, 400]
