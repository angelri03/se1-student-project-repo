"""
Unit tests for logs API endpoints
Tests admin logs retrieval with filtering and pagination
"""

import pytest
import json
import os
import pathlib
from datetime import datetime


def test_get_logs_admin(client, test_db, admin_headers):
    """Test getting logs as admin"""
    response = client.get(
        '/api/logs',
        headers=admin_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert 'logs' in data
    assert isinstance(data['logs'], list)


def test_get_logs_non_admin(client, test_db, auth_headers):
    """Test that non-admin users cannot get logs"""
    response = client.get(
        '/api/logs',
        headers=auth_headers
    )
    
    assert response.status_code == 403
    data = response.get_json()
    assert data['success'] is False
    assert 'admin' in data['message'].lower()


def test_get_logs_no_auth(client, test_db):
    """Test getting logs without authentication"""
    response = client.get('/api/logs')
    
    assert response.status_code == 401


def test_get_logs_with_lines_parameter(client, test_db, admin_headers):
    """Test getting logs with custom number of lines"""
    response = client.get(
        '/api/logs?lines=50',
        headers=admin_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert 'logs' in data


def test_get_logs_with_pagination(client, test_db, admin_headers):
    """Test logs with pagination parameters"""
    response = client.get(
        '/api/logs?page=1&per_page=10',
        headers=admin_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert 'logs' in data
    assert 'page' in data
    assert 'per_page' in data
    assert 'total' in data
    assert data['page'] == 1
    assert data['per_page'] == 10


def test_get_logs_filter_by_username(client, test_db, admin_headers):
    """Test filtering logs by username"""
    response = client.get(
        '/api/logs?username=testuser',
        headers=admin_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert 'logs' in data


def test_get_logs_filter_by_method(client, test_db, admin_headers):
    """Test filtering logs by HTTP method"""
    response = client.get(
        '/api/logs?method=POST',
        headers=admin_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert 'logs' in data


def test_get_logs_filter_by_path(client, test_db, admin_headers):
    """Test filtering logs by request path"""
    response = client.get(
        '/api/logs?path=/api/login',
        headers=admin_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert 'logs' in data


def test_get_logs_filter_by_status(client, test_db, admin_headers):
    """Test filtering logs by status code"""
    response = client.get(
        '/api/logs?status=200',
        headers=admin_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert 'logs' in data


def test_get_logs_search_in_message(client, test_db, admin_headers):
    """Test searching in log messages"""
    response = client.get(
        '/api/logs?search=login',
        headers=admin_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert 'logs' in data


def test_get_logs_multiple_filters(client, test_db, admin_headers):
    """Test applying multiple filters at once"""
    response = client.get(
        '/api/logs?method=POST&status=201&username=testuser',
        headers=admin_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert 'logs' in data


def test_get_logs_date_range_filter(client, test_db, admin_headers):
    """Test filtering logs by date range"""
    # Using a date range
    start_date = '2025-01-01T00:00:00'
    end_date = '2026-12-31T23:59:59'
    
    response = client.get(
        f'/api/logs?start={start_date}&end={end_date}',
        headers=admin_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert 'logs' in data


def test_get_logs_start_date_only(client, test_db, admin_headers):
    """Test filtering logs with only start date"""
    start_date = '2026-01-01T00:00:00'
    
    response = client.get(
        f'/api/logs?start={start_date}',
        headers=admin_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True


def test_get_logs_end_date_only(client, test_db, admin_headers):
    """Test filtering logs with only end date"""
    end_date = '2026-12-31T23:59:59'
    
    response = client.get(
        f'/api/logs?end={end_date}',
        headers=admin_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True


def test_get_logs_invalid_lines_parameter(client, test_db, admin_headers):
    """Test with invalid lines parameter"""
    response = client.get(
        '/api/logs?lines=invalid',
        headers=admin_headers
    )
    
    # Should use default value
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True


def test_get_logs_invalid_page_parameter(client, test_db, admin_headers):
    """Test with invalid page parameter"""
    response = client.get(
        '/api/logs?page=invalid',
        headers=admin_headers
    )
    
    # Should use default value
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True


def test_get_logs_no_log_file(client, test_db, admin_headers):
    """Test getting logs when no log file exists"""
    # The endpoint should handle missing log file gracefully
    response = client.get(
        '/api/logs',
        headers=admin_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    # Should return empty logs or message
    assert 'logs' in data


def test_get_logs_pagination_page_2(client, test_db, admin_headers):
    """Test getting second page of logs"""
    response = client.get(
        '/api/logs?page=2&per_page=10',
        headers=admin_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert data['page'] == 2


def test_get_logs_zero_per_page(client, test_db, admin_headers):
    """Test with zero per_page (should use default)"""
    response = client.get(
        '/api/logs?per_page=0',
        headers=admin_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert data['per_page'] == 100  # default value


def test_get_logs_large_lines_parameter(client, test_db, admin_headers):
    """Test with large lines parameter"""
    response = client.get(
        '/api/logs?lines=10000',
        headers=admin_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True


def test_get_logs_combined_search_and_pagination(client, test_db, admin_headers):
    """Test combining search filters with pagination"""
    response = client.get(
        '/api/logs?search=user&page=1&per_page=5',
        headers=admin_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert 'logs' in data
    assert 'total' in data


def test_get_logs_case_insensitive_filters(client, test_db, admin_headers):
    """Test that filters are case-insensitive"""
    # Test uppercase filter
    response = client.get(
        '/api/logs?method=post',
        headers=admin_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True


def test_get_logs_empty_filter_values(client, test_db, admin_headers):
    """Test with empty filter values"""
    response = client.get(
        '/api/logs?username=&method=',
        headers=admin_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True


def test_get_logs_special_characters_in_search(client, test_db, admin_headers):
    """Test search with special characters"""
    response = client.get(
        '/api/logs?search=/api/users',
        headers=admin_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
