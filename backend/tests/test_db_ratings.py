"""
Unit tests for rating database operations
Tests project rating CRUD operations and calculations
"""

import pytest
from database import db_ratings
from database.db_ratings import (
    rate_project, get_user_rating, get_project_rating,
    delete_rating, get_all_ratings_for_project
)


def test_rate_project_success(test_db, sample_user, sample_project):
    """Test successfully rating a project"""
    result = rate_project(
        project_id=sample_project['id'],
        user_id=sample_user['id'],
        rating=5
    )
    
    assert result['success'] is True
    assert 'added' in result['message'].lower()


def test_rate_project_invalid_rating_too_low(test_db, sample_user, sample_project):
    """Test rating with value too low"""
    result = rate_project(
        project_id=sample_project['id'],
        user_id=sample_user['id'],
        rating=0
    )
    
    assert result['success'] is False
    assert 'between 1 and 5' in result['message'].lower()


def test_rate_project_invalid_rating_too_high(test_db, sample_user, sample_project):
    """Test rating with value too high"""
    result = rate_project(
        project_id=sample_project['id'],
        user_id=sample_user['id'],
        rating=6
    )
    
    assert result['success'] is False
    assert 'between 1 and 5' in result['message'].lower()


def test_rate_project_update_existing(test_db, sample_user, sample_project):
    """Test updating an existing rating"""
    # Rate first time
    rate_project(sample_project['id'], sample_user['id'], 3)
    
    # Update rating
    result = rate_project(sample_project['id'], sample_user['id'], 5)
    
    assert result['success'] is True
    assert 'updated' in result['message'].lower()
    
    # Verify the update
    user_rating = get_user_rating(sample_project['id'], sample_user['id'])
    assert user_rating == 5


def test_get_user_rating_exists(test_db, sample_user, sample_project):
    """Test getting user's rating when it exists"""
    rate_project(sample_project['id'], sample_user['id'], 4)
    
    rating = get_user_rating(sample_project['id'], sample_user['id'])
    
    assert rating == 4


def test_get_user_rating_not_exists(test_db, sample_user, sample_project):
    """Test getting user's rating when it doesn't exist"""
    rating = get_user_rating(sample_project['id'], sample_user['id'])
    
    assert rating is None


def test_get_project_rating_no_ratings(test_db, sample_project):
    """Test getting project rating when no ratings exist"""
    result = get_project_rating(sample_project['id'])
    
    assert result['success'] is True
    assert result['average'] == 0
    assert result['count'] == 0


def test_get_project_rating_single_rating(test_db, sample_user, sample_project):
    """Test getting project rating with one rating"""
    rate_project(sample_project['id'], sample_user['id'], 4)
    
    result = get_project_rating(sample_project['id'])
    
    assert result['success'] is True
    assert result['average'] == 4.0
    assert result['count'] == 1


def test_get_project_rating_multiple_ratings(test_db, sample_project):
    """Test calculating average from multiple ratings"""
    import database
    
    # Create multiple users and rate
    user1 = database.create_user('user1', 'password123', 'user1@example.com')
    user2 = database.create_user('user2', 'password123', 'user2@example.com')
    user3 = database.create_user('user3', 'password123', 'user3@example.com')
    
    rate_project(sample_project['id'], user1['id'], 5)
    rate_project(sample_project['id'], user2['id'], 4)
    rate_project(sample_project['id'], user3['id'], 3)
    
    result = get_project_rating(sample_project['id'])
    
    assert result['success'] is True
    assert result['average'] == 4.0
    assert result['count'] == 3


def test_get_project_rating_average_rounded(test_db, sample_project):
    """Test that average is rounded to 1 decimal place"""
    import database
    
    user1 = database.create_user('user1', 'password123', 'user1@example.com')
    user2 = database.create_user('user2', 'password123', 'user2@example.com')
    
    rate_project(sample_project['id'], user1['id'], 5)
    rate_project(sample_project['id'], user2['id'], 4)
    
    result = get_project_rating(sample_project['id'])
    
    assert result['success'] is True
    # Average of 5 and 4 is 4.5
    assert result['average'] == 4.5


def test_delete_rating_success(test_db, sample_user, sample_project):
    """Test successfully deleting a rating"""
    # Add rating
    rate_project(sample_project['id'], sample_user['id'], 5)
    
    # Delete it
    result = delete_rating(sample_project['id'], sample_user['id'])
    
    assert result['success'] is True
    assert 'deleted' in result['message'].lower()
    
    # Verify deletion
    rating = get_user_rating(sample_project['id'], sample_user['id'])
    assert rating is None


def test_delete_rating_not_exists(test_db, sample_user, sample_project):
    """Test deleting rating that doesn't exist"""
    result = delete_rating(sample_project['id'], sample_user['id'])
    
    assert result['success'] is False
    assert 'not found' in result['message'].lower()


def test_get_all_ratings_for_project_empty(test_db, sample_project):
    """Test getting all ratings when project has none"""
    result = get_all_ratings_for_project(sample_project['id'])
    
    assert result['success'] is True
    assert isinstance(result['data'], list)
    assert len(result['data']) == 0


def test_get_all_ratings_for_project_with_data(test_db, sample_project):
    """Test getting all ratings for a project"""
    import database
    
    user1 = database.create_user('user1', 'password123', 'user1@example.com')
    user2 = database.create_user('user2', 'password123', 'user2@example.com')
    
    rate_project(sample_project['id'], user1['id'], 5)
    rate_project(sample_project['id'], user2['id'], 3)
    
    result = get_all_ratings_for_project(sample_project['id'])
    
    assert result['success'] is True
    assert len(result['data']) == 2
    
    # Check rating data includes user info
    for rating_data in result['data']:
        assert 'rating' in rating_data
        assert 'user_id' in rating_data
        assert 'username' in rating_data


def test_rating_isolation_between_users(test_db, sample_project):
    """Test that ratings are isolated between users"""
    import database
    
    user1 = database.create_user('user1', 'password123', 'user1@example.com')
    user2 = database.create_user('user2', 'password123', 'user2@example.com')
    
    # Each user rates the same project
    rate_project(sample_project['id'], user1['id'], 5)
    rate_project(sample_project['id'], user2['id'], 3)
    
    # Check each user's rating is independent
    rating1 = get_user_rating(sample_project['id'], user1['id'])
    rating2 = get_user_rating(sample_project['id'], user2['id'])
    
    assert rating1 == 5
    assert rating2 == 3


def test_update_rating_affects_average(test_db, sample_project):
    """Test that updating a rating updates the project average"""
    import database
    
    user1 = database.create_user('user1', 'password123', 'user1@example.com')
    user2 = database.create_user('user2', 'password123', 'user2@example.com')
    
    # Initial ratings
    rate_project(sample_project['id'], user1['id'], 5)
    rate_project(sample_project['id'], user2['id'], 3)
    
    result1 = get_project_rating(sample_project['id'])
    assert result1['average'] == 4.0
    
    # User1 updates their rating
    rate_project(sample_project['id'], user1['id'], 1)
    
    result2 = get_project_rating(sample_project['id'])
    # New average should be (1 + 3) / 2 = 2.0
    assert result2['average'] == 2.0
    assert result2['count'] == 2  # Count should stay the same


def test_delete_rating_affects_average(test_db, sample_project):
    """Test that deleting a rating updates the project average"""
    import database
    
    user1 = database.create_user('user1', 'password123', 'user1@example.com')
    user2 = database.create_user('user2', 'password123', 'user2@example.com')
    
    # Add ratings
    rate_project(sample_project['id'], user1['id'], 5)
    rate_project(sample_project['id'], user2['id'], 3)
    
    # Delete one rating
    delete_rating(sample_project['id'], user1['id'])
    
    result = get_project_rating(sample_project['id'])
    
    # Only user2's rating of 3 remains
    assert result['average'] == 3.0
    assert result['count'] == 1


def test_rating_all_values_1_to_5(test_db, sample_project):
    """Test that all rating values from 1-5 work"""
    import database
    
    for rating_value in range(1, 6):
        user = database.create_user(
            f'user{rating_value}',
            'password123',
            f'user{rating_value}@example.com'
        )
        
        result = rate_project(sample_project['id'], user['id'], rating_value)
        assert result['success'] is True
        
        # Verify the rating was saved correctly
        saved_rating = get_user_rating(sample_project['id'], user['id'])
        assert saved_rating == rating_value


def test_add_delete_add_rating_cycle(test_db, sample_user, sample_project):
    """Test adding, deleting, and re-adding a rating"""
    # Add rating
    result1 = rate_project(sample_project['id'], sample_user['id'], 5)
    assert result1['success'] is True
    
    # Delete rating
    result2 = delete_rating(sample_project['id'], sample_user['id'])
    assert result2['success'] is True
    
    # Add again - should succeed
    result3 = rate_project(sample_project['id'], sample_user['id'], 4)
    assert result3['success'] is True
    
    # Verify new rating
    rating = get_user_rating(sample_project['id'], sample_user['id'])
    assert rating == 4
