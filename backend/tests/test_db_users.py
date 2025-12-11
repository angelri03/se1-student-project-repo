"""
Unit tests for user database operations
Tests user CRUD operations, password hashing, and authentication
"""

import pytest
import bcrypt
from database import db_users
from database.db_users import hash_password, verify_password, create_user, get_user_by_username, get_user_by_id, update_user, delete_user

def test_hash_password():
    """Test password hashing"""
    password = 'testpassword123'
    hashed = hash_password(password)
    
    assert isinstance(hashed, str)
    assert len(hashed) > 0
    assert hashed != password
    
    # Verify the hash works with bcrypt
    assert bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def test_verify_password_correct():
    """Test password verification with correct password"""
    password = 'testpassword123'
    hashed = hash_password(password)
    
    assert verify_password(password, hashed) is True

def test_verify_password_incorrect():
    """Test password verification with incorrect password"""
    password = 'testpassword123'
    wrong_password = 'wrongpassword'
    hashed = hash_password(password)
    
    assert verify_password(wrong_password, hashed) is False

def test_create_user_success(test_db):
    """Test creating a new user successfully"""
    result = create_user('newuser', 'password123', 'new@example.com')
    
    assert result['success'] is True
    assert 'id' in result
    assert result['id'] > 0
    assert result['message'] == 'User created successfully'

def test_create_user_duplicate_username(test_db):
    """Test creating a user with duplicate username"""
    create_user('duplicate', 'password123', 'user1@example.com')
    result = create_user('duplicate', 'password456', 'user2@example.com')
    
    assert result['success'] is False
    assert 'already exists' in result['message'].lower()

def test_create_user_duplicate_email(test_db):
    """Test creating a user with duplicate email"""
    create_user('user1', 'password123', 'duplicate@example.com')
    result = create_user('user2', 'password456', 'duplicate@example.com')
    
    assert result['success'] is False
    assert 'already exists' in result['message'].lower()

def test_get_user_by_username_exists(test_db, sample_user):
    """Test getting a user by username when user exists"""
    user = get_user_by_username(sample_user['username'])
    
    assert user is not None
    assert user['id'] == sample_user['id']
    assert user['username'] == sample_user['username']
    assert user['email'] == sample_user['email']
    assert 'password' in user

def test_get_user_by_username_not_exists(test_db):
    """Test getting a user by username when user doesn't exist"""
    user = get_user_by_username('nonexistent')
    
    assert user is None

def test_get_user_by_id_exists(test_db, sample_user):
    """Test getting a user by ID when user exists"""
    user = get_user_by_id(sample_user['id'])
    
    assert user is not None
    assert user['id'] == sample_user['id']
    assert user['username'] == sample_user['username']
    assert user['email'] == sample_user['email']

def test_get_user_by_id_not_exists(test_db):
    """Test getting a user by ID when user doesn't exist"""
    user = get_user_by_id(99999)
    
    assert user is None

def test_update_user_email(test_db, sample_user):
    """Test updating a user's email"""
    new_email = 'newemail@example.com'
    result = update_user(sample_user['id'], email=new_email)
    
    assert result['success'] is True
    
    # Verify the update
    user = get_user_by_id(sample_user['id'])
    assert user['email'] == new_email

def test_update_user_password(test_db, sample_user):
    """Test updating a user's password"""
    new_password = 'newpassword456'
    result = update_user(sample_user['id'], password=new_password)
    
    assert result['success'] is True
    
    # Verify the password was hashed and works
    user = get_user_by_id(sample_user['id'])
    assert verify_password(new_password, user['password'])

def test_update_user_bio(test_db, sample_user):
    """Test updating a user's bio"""
    new_bio = 'This is my new bio'
    result = update_user(sample_user['id'], bio=new_bio)
    
    assert result['success'] is True
    
    # Verify the update
    user = get_user_by_id(sample_user['id'])
    assert user['bio'] == new_bio

def test_update_user_multiple_fields(test_db, sample_user):
    """Test updating multiple user fields at once"""
    new_email = 'updated@example.com'
    new_bio = 'Updated bio'
    
    result = update_user(sample_user['id'], email=new_email, bio=new_bio)
    
    assert result['success'] is True
    
    # Verify all updates
    user = get_user_by_id(sample_user['id'])
    assert user['email'] == new_email
    assert user['bio'] == new_bio

def test_update_user_not_exists(test_db):
    """Test updating a user that doesn't exist"""
    result = update_user(99999, email='test@example.com')
    
    assert result['success'] is False

def test_delete_user_success(test_db, sample_user):
    """Test deleting a user successfully"""
    result = delete_user(sample_user['id'])
    
    assert result['success'] is True
    assert result['message'] == 'User deleted successfully'
    
    # Verify user is deleted
    user = get_user_by_id(sample_user['id'])
    assert user is None

def test_delete_user_not_exists(test_db):
    """Test deleting a user that doesn't exist"""
    result = delete_user(99999)
    
    assert result['success'] is False

def test_password_is_hashed_on_creation(test_db):
    """Test that password is hashed when creating a user"""
    plain_password = 'plainpassword123'
    result = create_user('hashtest', plain_password, 'hash@example.com')
    
    user = get_user_by_id(result['id'])
    
    # Password should not be stored in plain text
    assert user['password'] != plain_password
    # But should verify correctly
    assert verify_password(plain_password, user['password'])

def test_user_created_at_timestamp(test_db):
    """Test that created_at timestamp is set automatically"""
    result = create_user('timetest', 'password123', 'time@example.com')
    user = get_user_by_id(result['id'])
    
    assert 'created_at' in user
    assert user['created_at'] is not None
