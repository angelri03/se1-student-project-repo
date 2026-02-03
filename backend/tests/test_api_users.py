"""
Unit tests for user API endpoints
Tests registration, login, account management, and profile endpoints
"""

import pytest
import json
from api.auth import create_token

def test_register_success(client, test_db):
    """Test successful user registration"""
    response = client.post('/api/register', json={
        'username': 'newuser',
        'password': 'password123',
        'email': 'new@example.com'
    })
    
    assert response.status_code == 201
    data = response.get_json()
    assert data['success'] is True
    assert 'token' in data
    assert 'user' in data
    assert data['user']['username'] == 'newuser'
    assert data['user']['email'] == 'new@example.com'

def test_register_missing_fields(client, test_db):
    """Test registration with missing required fields"""
    response = client.post('/api/register', json={
        'username': 'newuser'
        # Missing password and email
    })
    
    assert response.status_code == 400
    data = response.get_json()
    assert data['success'] is False
    assert 'required' in data['message'].lower()

def test_register_short_password(client, test_db):
    """Test registration with password too short"""
    response = client.post('/api/register', json={
        'username': 'newuser',
        'password': 'short',
        'email': 'new@example.com'
    })
    
    assert response.status_code == 400
    data = response.get_json()
    assert data['success'] is False
    assert 'password' in data['message'].lower()

def test_register_invalid_email(client, test_db):
    """Test registration with invalid email"""
    response = client.post('/api/register', json={
        'username': 'newuser',
        'password': 'password123',
        'email': 'invalidemail'
    })
    
    assert response.status_code == 400
    data = response.get_json()
    assert data['success'] is False
    assert 'email' in data['message'].lower()

def test_register_duplicate_username(client, test_db, sample_user):
    """Test registration with existing username"""
    response = client.post('/api/register', json={
        'username': sample_user['username'],
        'password': 'password123',
        'email': 'different@example.com'
    })
    
    assert response.status_code == 400
    data = response.get_json()
    assert data['success'] is False
    assert 'exists' in data['message'].lower()

def test_register_duplicate_email(client, test_db, sample_user):
    """Test registration with existing email"""
    response = client.post('/api/register', json={
        'username': 'differentuser',
        'password': 'password123',
        'email': sample_user['email']
    })
    
    assert response.status_code == 400
    data = response.get_json()
    assert data['success'] is False
    assert 'exists' in data['message'].lower()

def test_login_success(client, test_db, sample_user):
    """Test successful login"""
    response = client.post('/api/login', json={
        'email': sample_user['username'],
        'password': sample_user['password']
    })
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert 'token' in data
    assert 'user' in data
    assert data['user']['username'] == sample_user['username']

def test_login_missing_credentials(client, test_db):
    """Test login with missing credentials"""
    response = client.post('/api/login', json={
        'email': 'testuser'
        # Missing password
    })
    
    assert response.status_code == 400
    data = response.get_json()
    assert data['success'] is False

def test_login_invalid_username(client, test_db):
    """Test login with non-existent username"""
    response = client.post('/api/login', json={
        'email': 'nonexistent',
        'password': 'password123'
    })
    
    assert response.status_code == 401
    data = response.get_json()
    assert data['success'] is False
    assert 'invalid' in data['message'].lower()

def test_login_wrong_password(client, test_db, sample_user):
    """Test login with incorrect password"""
    response = client.post('/api/login', json={
        'email': sample_user['username'],
        'password': 'wrongpassword'
    })
    
    assert response.status_code == 401
    data = response.get_json()
    assert data['success'] is False
    assert 'invalid' in data['message'].lower()

def test_delete_account_success(client, test_db, sample_user, auth_token):
    """Test successful account deletion"""
    response = client.delete('/api/account', 
        headers={
            'Authorization': f'Bearer {auth_token}'
        },
        json={
            'password': sample_user['password']
        }
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    
    # Verify account is deleted (login should fail)
    login_response = client.post('/api/login', json={
        'email': sample_user['username'],
        'password': sample_user['password']
    })
    assert login_response.status_code == 401

def test_delete_account_without_token(client, test_db):
    """Test account deletion without authentication"""
    response = client.delete('/api/account')
    
    assert response.status_code == 401
    data = response.get_json()
    assert data['success'] is False

def test_delete_account_invalid_token(client, test_db):
    """Test account deletion with invalid token"""
    response = client.delete('/api/account', headers={
        'Authorization': 'Bearer invalid.token.here'
    })
    
    assert response.status_code == 401
    data = response.get_json()
    assert data['success'] is False


