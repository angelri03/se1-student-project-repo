"""
Unit tests for bookmark database operations
Tests bookmark add, remove, get, and check operations
"""

import pytest
from database import db_bookmarks
from database.db_bookmarks import (
    add_bookmark, remove_bookmark, get_user_bookmarks, 
    is_bookmarked, get_bookmark_count
)


def test_add_bookmark_success(test_db, sample_user, sample_project):
    """Test successfully adding a bookmark"""
    result = add_bookmark(sample_user['id'], sample_project['id'])
    
    assert result['success'] is True
    assert 'added' in result['message'].lower()


def test_add_bookmark_duplicate(test_db, sample_user, sample_project):
    """Test adding duplicate bookmark"""
    # Add first time
    add_bookmark(sample_user['id'], sample_project['id'])
    
    # Try to add again
    result = add_bookmark(sample_user['id'], sample_project['id'])
    
    assert result['success'] is False
    assert 'already' in result['message'].lower()


def test_add_bookmark_invalid_project(test_db, sample_user):
    """Test adding bookmark for non-existent project"""
    result = add_bookmark(sample_user['id'], 99999)
    
    assert result['success'] is False
    assert 'not found' in result['message'].lower()


def test_remove_bookmark_success(test_db, sample_user, sample_project):
    """Test successfully removing a bookmark"""
    # First add a bookmark
    add_bookmark(sample_user['id'], sample_project['id'])
    
    # Then remove it
    result = remove_bookmark(sample_user['id'], sample_project['id'])
    
    assert result['success'] is True
    assert 'removed' in result['message'].lower()


def test_remove_bookmark_not_exists(test_db, sample_user, sample_project):
    """Test removing bookmark that doesn't exist"""
    result = remove_bookmark(sample_user['id'], sample_project['id'])
    
    assert result['success'] is False
    assert 'not found' in result['message'].lower()


def test_get_user_bookmarks_empty(test_db, sample_user):
    """Test getting bookmarks when user has none"""
    result = get_user_bookmarks(sample_user['id'])
    
    assert result['success'] is True
    assert isinstance(result['data'], list)
    assert len(result['data']) == 0


def test_get_user_bookmarks_with_data(test_db, sample_user, sample_project):
    """Test getting bookmarks when user has bookmarks"""
    # Add a bookmark
    add_bookmark(sample_user['id'], sample_project['id'])
    
    result = get_user_bookmarks(sample_user['id'])
    
    assert result['success'] is True
    assert isinstance(result['data'], list)
    assert len(result['data']) > 0
    
    # Check project details are included
    bookmark = result['data'][0]
    assert 'id' in bookmark
    assert 'name' in bookmark
    assert bookmark['id'] == sample_project['id']


def test_get_user_bookmarks_multiple(test_db, sample_user):
    """Test getting multiple bookmarks"""
    # Create multiple projects and bookmark them
    import database
    
    project1 = database.create_project(
        name='Project 1',
        description='First project',
        file_path='/path/1.zip',
        file_size=1024,
        creator_user_id=sample_user['id']
    )
    
    project2 = database.create_project(
        name='Project 2',
        description='Second project',
        file_path='/path/2.zip',
        file_size=2048,
        creator_user_id=sample_user['id']
    )
    
    add_bookmark(sample_user['id'], project1['id'])
    add_bookmark(sample_user['id'], project2['id'])
    
    result = get_user_bookmarks(sample_user['id'])
    
    assert result['success'] is True
    assert len(result['data']) == 2


def test_is_bookmarked_true(test_db, sample_user, sample_project):
    """Test checking if project is bookmarked (true)"""
    add_bookmark(sample_user['id'], sample_project['id'])
    
    is_bookmarked_result = is_bookmarked(sample_user['id'], sample_project['id'])
    
    assert is_bookmarked_result is True


def test_is_bookmarked_false(test_db, sample_user, sample_project):
    """Test checking if project is bookmarked (false)"""
    is_bookmarked_result = is_bookmarked(sample_user['id'], sample_project['id'])
    
    assert is_bookmarked_result is False


def test_get_bookmark_count_zero(test_db, sample_project):
    """Test getting bookmark count when project has no bookmarks"""
    count = get_bookmark_count(sample_project['id'])
    
    assert count == 0


def test_get_bookmark_count_multiple(test_db, sample_project):
    """Test getting bookmark count with multiple bookmarks"""
    import database
    
    # Create multiple users
    user1 = database.create_user('user1', 'password123', 'user1@example.com')
    user2 = database.create_user('user2', 'password123', 'user2@example.com')
    user3 = database.create_user('user3', 'password123', 'user3@example.com')
    
    # Multiple users bookmark the same project
    add_bookmark(user1['id'], sample_project['id'])
    add_bookmark(user2['id'], sample_project['id'])
    add_bookmark(user3['id'], sample_project['id'])
    
    count = get_bookmark_count(sample_project['id'])
    
    assert count == 3


def test_bookmark_isolation_between_users(test_db, sample_project):
    """Test that bookmarks are isolated between users"""
    import database
    
    user1 = database.create_user('user1', 'password123', 'user1@example.com')
    user2 = database.create_user('user2', 'password123', 'user2@example.com')
    
    # User1 bookmarks project
    add_bookmark(user1['id'], sample_project['id'])
    
    # Check user1 has bookmark
    assert is_bookmarked(user1['id'], sample_project['id']) is True
    
    # Check user2 doesn't have bookmark
    assert is_bookmarked(user2['id'], sample_project['id']) is False
    
    # Check get_user_bookmarks returns correct data
    user1_bookmarks = get_user_bookmarks(user1['id'])
    user2_bookmarks = get_user_bookmarks(user2['id'])
    
    assert len(user1_bookmarks['data']) == 1
    assert len(user2_bookmarks['data']) == 0


def test_add_remove_add_bookmark_cycle(test_db, sample_user, sample_project):
    """Test adding, removing, and re-adding a bookmark"""
    # Add bookmark
    result1 = add_bookmark(sample_user['id'], sample_project['id'])
    assert result1['success'] is True
    
    # Remove bookmark
    result2 = remove_bookmark(sample_user['id'], sample_project['id'])
    assert result2['success'] is True
    
    # Add again - should succeed
    result3 = add_bookmark(sample_user['id'], sample_project['id'])
    assert result3['success'] is True


def test_bookmarks_ordered_by_created_at(test_db, sample_user):
    """Test that bookmarks are returned in correct order"""
    import database
    import time
    
    # Create and bookmark multiple projects
    project1 = database.create_project(
        name='Old Project',
        description='Created first',
        file_path='/path/1.zip',
        file_size=1024,
        creator_user_id=sample_user['id']
    )
    
    add_bookmark(sample_user['id'], project1['id'])
    time.sleep(1.1)  # Sleep > 1 second to ensure different CURRENT_TIMESTAMP
    
    project2 = database.create_project(
        name='New Project',
        description='Created second',
        file_path='/path/2.zip',
        file_size=1024,
        creator_user_id=sample_user['id']
    )
    
    add_bookmark(sample_user['id'], project2['id'])
    
    result = get_user_bookmarks(sample_user['id'])
    
    # Newer bookmarks should come first (DESC order)
    assert result['success'] is True
    assert len(result['data']) == 2
    assert result['data'][0]['id'] == project2['id']
    assert result['data'][1]['id'] == project1['id']


def test_get_user_bookmarks_includes_project_details(test_db, sample_user, sample_project):
    """Test that get_user_bookmarks returns complete project information"""
    add_bookmark(sample_user['id'], sample_project['id'])
    
    result = get_user_bookmarks(sample_user['id'])
    
    assert result['success'] is True
    assert len(result['data']) > 0
    
    bookmark = result['data'][0]
    # Should include key project fields
    assert bookmark['id'] == sample_project['id']
    assert bookmark['name'] == sample_project['name']
    assert bookmark['description'] == sample_project['description']
    assert bookmark['file_path'] == sample_project['file_path']
    assert bookmark['file_size'] == sample_project['file_size']


def test_bookmark_count_after_removal(test_db, sample_user, sample_project):
    """Test that bookmark count decreases after removal"""
    # Add bookmark
    add_bookmark(sample_user['id'], sample_project['id'])
    count1 = get_bookmark_count(sample_project['id'])
    assert count1 == 1
    
    # Remove bookmark
    remove_bookmark(sample_user['id'], sample_project['id'])
    count2 = get_bookmark_count(sample_project['id'])
    assert count2 == 0
