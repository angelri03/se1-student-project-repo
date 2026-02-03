"""
Unit tests for notification database operations
Tests notification create, read, update, delete operations
"""

import pytest
from database import db_notifications
from database.db_notifications import (
    create_notification, get_user_notifications, mark_notification_as_read,
    mark_all_notifications_as_read, delete_notification, get_unread_count
)


def test_create_notification_success(test_db, sample_user, sample_project):
    """Test creating a notification successfully"""
    result = create_notification(
        user_id=sample_user['id'],
        project_id=sample_project['id'],
        type='approval',
        message='Your project was approved'
    )
    
    assert result['success'] is True
    assert 'id' in result
    assert result['id'] > 0


def test_create_notification_without_project(test_db, sample_user):
    """Test creating notification without project (project_id=None)"""
    result = create_notification(
        user_id=sample_user['id'],
        project_id=None,
        type='system',
        message='Welcome to the platform'
    )
    
    assert result['success'] is True
    assert 'id' in result


def test_get_user_notifications_empty(test_db, sample_user):
    """Test getting notifications when user has none"""
    result = get_user_notifications(sample_user['id'])
    
    assert result['success'] is True
    assert 'notifications' in result
    assert isinstance(result['notifications'], list)
    assert len(result['notifications']) == 0


def test_get_user_notifications_with_data(test_db, sample_user, sample_project):
    """Test getting notifications when user has notifications"""
    # Create a notification
    create_notification(
        user_id=sample_user['id'],
        project_id=sample_project['id'],
        type='approval',
        message='Project approved'
    )
    
    result = get_user_notifications(sample_user['id'])
    
    assert result['success'] is True
    assert len(result['notifications']) > 0
    
    notification = result['notifications'][0]
    assert notification['user_id'] == sample_user['id']
    assert notification['message'] == 'Project approved'
    assert notification['type'] == 'approval'


def test_get_user_notifications_unread_only(test_db, sample_user):
    """Test getting only unread notifications"""
    # Create unread notification
    notif1 = create_notification(
        user_id=sample_user['id'],
        project_id=None,
        type='system',
        message='Unread notification'
    )
    
    # Create and mark as read
    notif2 = create_notification(
        user_id=sample_user['id'],
        project_id=None,
        type='system',
        message='Read notification'
    )
    mark_notification_as_read(notif2['id'], sample_user['id'])
    
    # Get unread only
    result = get_user_notifications(sample_user['id'], unread_only=True)
    
    assert result['success'] is True
    assert len(result['notifications']) == 1
    assert result['notifications'][0]['message'] == 'Unread notification'


def test_mark_notification_as_read_success(test_db, sample_user):
    """Test marking notification as read"""
    # Create notification
    notif = create_notification(
        user_id=sample_user['id'],
        project_id=None,
        type='system',
        message='Test notification'
    )
    
    # Mark as read
    result = mark_notification_as_read(notif['id'], sample_user['id'])
    
    assert result['success'] is True
    assert 'read' in result['message'].lower()


def test_mark_notification_as_read_wrong_user(test_db):
    """Test that user cannot mark another user's notification as read"""
    import database
    
    user1 = database.create_user('user1', 'password123', 'user1@example.com')
    user2 = database.create_user('user2', 'password123', 'user2@example.com')
    
    # Create notification for user1
    notif = create_notification(
        user_id=user1['id'],
        project_id=None,
        type='system',
        message='User1 notification'
    )
    
    # Try to mark as read by user2
    result = mark_notification_as_read(notif['id'], user2['id'])
    
    assert result['success'] is False
    assert 'not found' in result['message'].lower() or 'access denied' in result['message'].lower()


def test_mark_notification_as_read_invalid_id(test_db, sample_user):
    """Test marking non-existent notification as read"""
    result = mark_notification_as_read(99999, sample_user['id'])
    
    assert result['success'] is False


def test_mark_all_notifications_as_read(test_db, sample_user):
    """Test marking all notifications as read"""
    # Create multiple notifications
    create_notification(sample_user['id'], None, 'system', 'Notification 1')
    create_notification(sample_user['id'], None, 'system', 'Notification 2')
    create_notification(sample_user['id'], None, 'system', 'Notification 3')
    
    # Mark all as read
    result = mark_all_notifications_as_read(sample_user['id'])
    
    assert result['success'] is True
    
    # Verify all are read
    unread = get_user_notifications(sample_user['id'], unread_only=True)
    assert len(unread['notifications']) == 0


def test_mark_all_notifications_no_effect_when_none(test_db, sample_user):
    """Test marking all as read when user has no notifications"""
    result = mark_all_notifications_as_read(sample_user['id'])
    
    assert result['success'] is True


def test_delete_notification_success(test_db, sample_user):
    """Test deleting a notification successfully"""
    # Create notification
    notif = create_notification(
        user_id=sample_user['id'],
        project_id=None,
        type='system',
        message='To be deleted'
    )
    
    # Delete it
    result = delete_notification(notif['id'], sample_user['id'])
    
    assert result['success'] is True
    
    # Verify it's deleted
    notifications = get_user_notifications(sample_user['id'])
    assert len(notifications['notifications']) == 0


def test_delete_notification_wrong_user(test_db):
    """Test that user cannot delete another user's notification"""
    import database
    
    user1 = database.create_user('user1', 'password123', 'user1@example.com')
    user2 = database.create_user('user2', 'password123', 'user2@example.com')
    
    # Create notification for user1
    notif = create_notification(
        user_id=user1['id'],
        project_id=None,
        type='system',
        message='User1 notification'
    )
    
    # Try to delete by user2
    result = delete_notification(notif['id'], user2['id'])
    
    assert result['success'] is False
    assert 'not found' in result['message'].lower() or 'access denied' in result['message'].lower()


def test_delete_notification_invalid_id(test_db, sample_user):
    """Test deleting non-existent notification"""
    result = delete_notification(99999, sample_user['id'])
    
    assert result['success'] is False


def test_get_unread_count_zero(test_db, sample_user):
    """Test getting unread count when user has no unread notifications"""
    result = get_unread_count(sample_user['id'])
    
    assert result['success'] is True
    assert result['count'] == 0 or result.get('unread_count') == 0


def test_get_unread_count_with_notifications(test_db, sample_user):
    """Test getting unread count with unread notifications"""
    # Create 3 unread notifications
    create_notification(sample_user['id'], None, 'system', 'Notification 1')
    create_notification(sample_user['id'], None, 'system', 'Notification 2')
    create_notification(sample_user['id'], None, 'system', 'Notification 3')
    
    result = get_unread_count(sample_user['id'])
    
    assert result['success'] is True
    count = result.get('count') or result.get('unread_count')
    assert count == 3


def test_get_unread_count_excludes_read(test_db, sample_user):
    """Test that unread count excludes read notifications"""
    # Create notifications
    notif1 = create_notification(sample_user['id'], None, 'system', 'Unread')
    notif2 = create_notification(sample_user['id'], None, 'system', 'To be read')
    notif3 = create_notification(sample_user['id'], None, 'system', 'Unread 2')
    
    # Mark one as read
    mark_notification_as_read(notif2['id'], sample_user['id'])
    
    result = get_unread_count(sample_user['id'])
    
    assert result['success'] is True
    count = result.get('count') or result.get('unread_count')
    assert count == 2


def test_notifications_ordered_by_created_at(test_db, sample_user):
    """Test that notifications are ordered by created_at DESC"""
    import time
    
    # Create notifications with delays
    notif1 = create_notification(sample_user['id'], None, 'system', 'First')
    time.sleep(1.1)
    notif2 = create_notification(sample_user['id'], None, 'system', 'Second')
    time.sleep(1.1)
    notif3 = create_notification(sample_user['id'], None, 'system', 'Third')
    
    result = get_user_notifications(sample_user['id'])
    
    # Newer notifications should come first
    assert result['success'] is True
    assert len(result['notifications']) == 3
    assert result['notifications'][0]['message'] == 'Third'
    assert result['notifications'][1]['message'] == 'Second'
    assert result['notifications'][2]['message'] == 'First'


def test_notification_isolation_between_users(test_db):
    """Test that users can only access their own notifications"""
    import database
    
    user1 = database.create_user('user1', 'password123', 'user1@example.com')
    user2 = database.create_user('user2', 'password123', 'user2@example.com')
    
    # Create notifications for each user
    create_notification(user1['id'], None, 'system', 'User1 notification')
    create_notification(user2['id'], None, 'system', 'User2 notification')
    
    # Get notifications for each user
    user1_notifs = get_user_notifications(user1['id'])
    user2_notifs = get_user_notifications(user2['id'])
    
    # Each user should only see their own
    assert len(user1_notifs['notifications']) == 1
    assert len(user2_notifs['notifications']) == 1
    assert user1_notifs['notifications'][0]['message'] == 'User1 notification'
    assert user2_notifs['notifications'][0]['message'] == 'User2 notification'


def test_notification_includes_project_name(test_db, sample_user, sample_project):
    """Test that notifications include project name when applicable"""
    create_notification(
        user_id=sample_user['id'],
        project_id=sample_project['id'],
        type='approval',
        message='Project approved'
    )
    
    result = get_user_notifications(sample_user['id'])
    
    assert result['success'] is True
    assert len(result['notifications']) > 0
    notification = result['notifications'][0]
    assert 'project_name' in notification
    assert notification['project_name'] == sample_project['name']


def test_notification_types(test_db, sample_user):
    """Test creating notifications with different types"""
    types = ['approval', 'report', 'system', 'comment', 'like']
    
    for notif_type in types:
        result = create_notification(
            user_id=sample_user['id'],
            project_id=None,
            type=notif_type,
            message=f'Test {notif_type} notification'
        )
        
        assert result['success'] is True
    
    # Verify all were created
    notifications = get_user_notifications(sample_user['id'])
    assert len(notifications['notifications']) == len(types)
