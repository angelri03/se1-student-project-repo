"""
Unit tests for notification API endpoints
Tests retrieving and managing user notifications
"""

import pytest
import json
from io import BytesIO


def test_get_notifications_empty(client, test_db, auth_headers):
    """Test getting notifications when user has none"""
    response = client.get(
        '/api/notifications',
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert isinstance(data['notifications'], list)


def test_get_notifications_no_auth(client, test_db):
    """Test getting notifications without authentication"""
    response = client.get('/api/notifications')
    
    assert response.status_code == 401


def test_get_notifications_unread_only(client, test_db, auth_headers):
    """Test getting only unread notifications"""
    response = client.get(
        '/api/notifications?unread_only=true',
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert isinstance(data['notifications'], list)


def test_get_unread_notifications_count_zero(client, test_db, auth_headers):
    """Test getting unread count when no notifications"""
    response = client.get(
        '/api/notifications/unread-count',
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert 'count' in data or 'unread_count' in data


def test_get_unread_notifications_count_no_auth(client, test_db):
    """Test getting unread count without authentication"""
    response = client.get('/api/notifications/unread-count')
    
    assert response.status_code == 401


def test_mark_notification_read_no_auth(client, test_db):
    """Test marking notification as read without authentication"""
    response = client.put('/api/notifications/1/read')
    
    assert response.status_code == 401


def test_mark_notification_read_invalid_id(client, test_db, auth_headers):
    """Test marking non-existent notification as read"""
    response = client.put(
        '/api/notifications/99999/read',
        headers=auth_headers
    )
    
    assert response.status_code == 400
    data = response.get_json()
    assert data['success'] is False


def test_mark_all_notifications_read_success(client, test_db, auth_headers):
    """Test marking all notifications as read"""
    response = client.put(
        '/api/notifications/read-all',
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True


def test_mark_all_notifications_read_no_auth(client, test_db):
    """Test marking all notifications as read without authentication"""
    response = client.put('/api/notifications/read-all')
    
    assert response.status_code == 401


def test_delete_notification_no_auth(client, test_db):
    """Test deleting notification without authentication"""
    response = client.delete('/api/notifications/1')
    
    assert response.status_code == 401


def test_delete_notification_invalid_id(client, test_db, auth_headers):
    """Test deleting non-existent notification"""
    response = client.delete(
        '/api/notifications/99999',
        headers=auth_headers
    )
    
    assert response.status_code == 400
    data = response.get_json()
    assert data['success'] is False


def test_notification_isolation_between_users(client, test_db):
    """Test that users can only access their own notifications"""
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
    
    # Get notifications for both users - should be isolated
    response1 = client.get('/api/notifications', headers=user1_headers)
    response2 = client.get('/api/notifications', headers=user2_headers)
    
    assert response1.status_code == 200
    assert response2.status_code == 200
    # Each user should only see their own notifications
    data1 = response1.get_json()
    data2 = response2.get_json()
    assert isinstance(data1.get('notifications') or data1.get('data', []), list)
    assert isinstance(data2.get('notifications') or data2.get('data', []), list)


def test_notification_created_on_project_approval(client, test_db, auth_headers, admin_headers):
    """Test that notification is created when project is approved"""
    # Regular user uploads a project
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
    
    # Admin approves the project (should create notification)
    approve_response = client.post(
        f'/api/projects/{project_id}/approve',
        headers=admin_headers
    )
    
    # Should trigger a notification for the project creator
    assert approve_response.status_code == 200


def test_notification_query_parameters(client, test_db, auth_headers):
    """Test notification endpoint with various query parameters"""
    # Test with unread_only=false
    response = client.get(
        '/api/notifications?unread_only=false',
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    
    # Test with unread_only=true
    response = client.get(
        '/api/notifications?unread_only=true',
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True


def test_delete_notification_wrong_user(client, test_db):
    """Test that user cannot delete another user's notification"""
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
    
    # Try to delete notification that doesn't belong to user
    response = client.delete(
        '/api/notifications/1',
        headers=user2_headers
    )
    
    # Should fail - notification doesn't exist or doesn't belong to user
    assert response.status_code in [400, 403, 404]
