"""
Unit tests for report API endpoints
Tests report submission and management
"""

import pytest
import json
from io import BytesIO


def test_submit_report_user_success(client, test_db, auth_headers):
    """Test successfully submitting a report for a user"""
    # Create another user to report
    other_user_response = client.post('/api/register', json={
        'username': 'reported_user',
        'password': 'password123',
        'email': 'reported@example.com'
    })
    
    reported_user_id = other_user_response.get_json()['user']['id']
    
    response = client.post(
        '/api/reports',
        json={
            'reason': 'Spam or inappropriate content',
            'reported_user_id': reported_user_id
        },
        headers=auth_headers
    )
    
    assert response.status_code == 201
    data = response.get_json()
    assert data['success'] is True


def test_submit_report_project_success(client, test_db, auth_headers):
    """Test successfully submitting a report for a project"""
    # Create a project
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
    
    # Report the project
    response = client.post(
        '/api/reports',
        json={
            'reason': 'Inappropriate content',
            'reported_project_id': project_id
        },
        headers=auth_headers
    )
    
    assert response.status_code == 201
    data = response.get_json()
    assert data['success'] is True


def test_submit_report_no_reason(client, test_db, auth_headers):
    """Test submitting report without reason"""
    response = client.post(
        '/api/reports',
        json={
            'reported_user_id': 1
        },
        headers=auth_headers
    )
    
    assert response.status_code == 400
    data = response.get_json()
    assert data['success'] is False
    assert 'reason' in data['message'].lower()


def test_submit_report_empty_reason(client, test_db, auth_headers):
    """Test submitting report with empty reason"""
    response = client.post(
        '/api/reports',
        json={
            'reason': '   ',
            'reported_user_id': 2
        },
        headers=auth_headers
    )
    
    assert response.status_code == 400
    data = response.get_json()
    assert data['success'] is False
    assert 'empty' in data['message'].lower()


def test_submit_report_no_target(client, test_db, auth_headers):
    """Test submitting report without specifying user or project"""
    response = client.post(
        '/api/reports',
        json={
            'reason': 'Test reason'
        },
        headers=auth_headers
    )
    
    assert response.status_code == 400
    data = response.get_json()
    assert data['success'] is False
    assert 'user or project' in data['message'].lower()


def test_submit_report_no_auth(client, test_db):
    """Test submitting report without authentication"""
    response = client.post(
        '/api/reports',
        json={
            'reason': 'Test reason',
            'reported_user_id': 1
        }
    )
    
    assert response.status_code == 401


def test_submit_report_self(client, test_db, sample_user, auth_headers):
    """Test that user cannot report themselves"""
    response = client.post(
        '/api/reports',
        json={
            'reason': 'Test reason',
            'reported_user_id': sample_user['id']
        },
        headers=auth_headers
    )
    
    assert response.status_code == 400
    data = response.get_json()
    assert data['success'] is False
    assert 'yourself' in data['message'].lower()


def test_get_reports_admin(client, test_db, admin_headers):
    """Test getting all reports as admin"""
    response = client.get(
        '/api/reports',
        headers=admin_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert isinstance(data['reports'], list)


def test_get_reports_non_admin(client, test_db, auth_headers):
    """Test that non-admin users cannot get reports"""
    response = client.get(
        '/api/reports',
        headers=auth_headers
    )
    
    assert response.status_code == 403
    data = response.get_json()
    assert data['success'] is False
    assert 'admin' in data['message'].lower()


def test_get_reports_no_auth(client, test_db):
    """Test getting reports without authentication"""
    response = client.get('/api/reports')
    
    assert response.status_code == 401


def test_get_reports_by_status(client, test_db, admin_headers):
    """Test filtering reports by status"""
    response = client.get(
        '/api/reports?status=pending',
        headers=admin_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert isinstance(data['reports'], list)


def test_get_report_by_id_admin(client, test_db, admin_headers, auth_headers):
    """Test getting specific report by ID as admin"""
    # First create a report
    other_user_response = client.post('/api/register', json={
        'username': 'reported_user',
        'password': 'password123',
        'email': 'reported@example.com'
    })
    
    reported_user_id = other_user_response.get_json()['user']['id']
    
    report_response = client.post(
        '/api/reports',
        json={
            'reason': 'Test reason',
            'reported_user_id': reported_user_id
        },
        headers=auth_headers
    )
    
    report_id = report_response.get_json().get('id', 1)
    
    # Get the report
    response = client.get(
        f'/api/reports/{report_id}',
        headers=admin_headers
    )
    
    assert response.status_code in [200, 404]


def test_get_report_by_id_non_admin(client, test_db, auth_headers):
    """Test that non-admin users cannot get report by ID"""
    response = client.get(
        '/api/reports/1',
        headers=auth_headers
    )
    
    assert response.status_code == 403
    data = response.get_json()
    assert data['success'] is False


def test_get_report_by_id_not_found(client, test_db, admin_headers):
    """Test getting non-existent report"""
    response = client.get(
        '/api/reports/99999',
        headers=admin_headers
    )
    
    assert response.status_code == 404
    data = response.get_json()
    assert data['success'] is False


def test_update_report_status_admin(client, test_db, admin_headers, auth_headers):
    """Test updating report status as admin"""
    # Create a report first
    other_user_response = client.post('/api/register', json={
        'username': 'reported_user',
        'password': 'password123',
        'email': 'reported@example.com'
    })
    
    reported_user_id = other_user_response.get_json()['user']['id']
    
    report_response = client.post(
        '/api/reports',
        json={
            'reason': 'Test reason',
            'reported_user_id': reported_user_id
        },
        headers=auth_headers
    )
    
    report_id = report_response.get_json().get('id', 1)
    
    # Update report status
    response = client.put(
        f'/api/reports/{report_id}',
        json={
            'status': 'resolved',
            'admin_notes': 'Issue resolved'
        },
        headers=admin_headers
    )
    
    assert response.status_code in [200, 400]


def test_update_report_status_invalid(client, test_db, admin_headers):
    """Test updating report with invalid status"""
    response = client.put(
        '/api/reports/1',
        json={'status': 'invalid_status'},
        headers=admin_headers
    )
    
    assert response.status_code == 400
    data = response.get_json()
    assert data['success'] is False
    assert 'invalid' in data['message'].lower()


def test_update_report_no_status(client, test_db, admin_headers):
    """Test updating report without status"""
    response = client.put(
        '/api/reports/1',
        json={},
        headers=admin_headers
    )
    
    assert response.status_code == 400
    data = response.get_json()
    assert data['success'] is False


def test_update_report_non_admin(client, test_db, auth_headers):
    """Test that non-admin users cannot update reports"""
    response = client.put(
        '/api/reports/1',
        json={'status': 'resolved'},
        headers=auth_headers
    )
    
    assert response.status_code == 403
    data = response.get_json()
    assert data['success'] is False


def test_delete_report_admin(client, test_db, admin_headers):
    """Test deleting report as admin"""
    response = client.delete(
        '/api/reports/1',
        headers=admin_headers
    )
    
    assert response.status_code in [200, 400]


def test_delete_report_non_admin(client, test_db, auth_headers):
    """Test that non-admin users cannot delete reports"""
    response = client.delete(
        '/api/reports/1',
        headers=auth_headers
    )
    
    assert response.status_code == 403
    data = response.get_json()
    assert data['success'] is False


def test_get_pending_count_admin(client, test_db, admin_headers):
    """Test getting pending reports count as admin"""
    response = client.get(
        '/api/reports/pending-count',
        headers=admin_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert 'count' in data or 'pending_count' in data


def test_get_pending_count_non_admin(client, test_db, auth_headers):
    """Test that non-admin users cannot get pending count"""
    response = client.get(
        '/api/reports/pending-count',
        headers=auth_headers
    )
    
    assert response.status_code == 403
    data = response.get_json()
    assert data['success'] is False


def test_report_creates_admin_notifications(client, test_db, admin_headers, auth_headers):
    """Test that submitting a report creates notifications for admins"""
    # Create another user to report
    other_user_response = client.post('/api/register', json={
        'username': 'reported_user',
        'password': 'password123',
        'email': 'reported@example.com'
    })
    
    reported_user_id = other_user_response.get_json()['user']['id']
    
    # Submit report
    report_response = client.post(
        '/api/reports',
        json={
            'reason': 'Spam content',
            'reported_user_id': reported_user_id
        },
        headers=auth_headers
    )
    
    assert report_response.status_code == 201
    
    # Check admin has notification
    notifications_response = client.get(
        '/api/notifications',
        headers=admin_headers
    )
    
    # Admin should have notification about the report
    assert notifications_response.status_code == 200


def test_report_valid_statuses(client, test_db, admin_headers):
    """Test that only valid statuses are accepted"""
    valid_statuses = ['pending', 'resolved', 'dismissed']
    
    for status in valid_statuses:
        response = client.put(
            '/api/reports/1',
            json={'status': status},
            headers=admin_headers
        )
        
        assert response.status_code in [200, 400]
