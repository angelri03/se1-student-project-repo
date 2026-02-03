"""
Unit tests for report database operations
Tests report creation, retrieval, and status management
"""

import pytest
from database import db_reports
from database.db_reports import (
    create_report, get_all_reports, get_report_by_id,
    update_report_status, delete_report, get_pending_reports_count
)


def test_create_report_user_success(test_db, sample_user):
    """Test successfully creating a report for a user"""
    import database
    
    # Create another user to report
    reported_user = database.create_user('reported', 'password123', 'reported@example.com')
    
    result = create_report(
        reporter_id=sample_user['id'],
        reason='Spam or inappropriate behavior',
        reported_user_id=reported_user['id']
    )
    
    assert result['success'] is True
    assert 'report_id' in result
    assert result['report_id'] > 0


def test_create_report_project_success(test_db, sample_user, sample_project):
    """Test successfully creating a report for a project"""
    result = create_report(
        reporter_id=sample_user['id'],
        reason='Inappropriate content',
        reported_project_id=sample_project['id']
    )
    
    assert result['success'] is True
    assert 'report_id' in result


def test_create_report_no_target(test_db, sample_user):
    """Test creating report without specifying user or project"""
    result = create_report(
        reporter_id=sample_user['id'],
        reason='Test reason'
    )
    
    assert result['success'] is False
    assert 'must specify' in result['message'].lower()


def test_create_report_both_targets(test_db, sample_user, sample_project):
    """Test creating report with both user and project (invalid)"""
    import database
    
    reported_user = database.create_user('reported', 'password123', 'reported@example.com')
    
    result = create_report(
        reporter_id=sample_user['id'],
        reason='Test reason',
        reported_user_id=reported_user['id'],
        reported_project_id=sample_project['id']
    )
    
    assert result['success'] is False
    assert 'not both' in result['message'].lower()


def test_get_all_reports_empty(test_db):
    """Test getting all reports when none exist"""
    result = get_all_reports()
    
    assert result['success'] is True
    assert 'reports' in result
    assert isinstance(result['reports'], list)
    assert len(result['reports']) == 0


def test_get_all_reports_with_data(test_db, sample_user):
    """Test getting all reports when reports exist"""
    import database
    
    # Create a user to report
    reported_user = database.create_user('reported', 'password123', 'reported@example.com')
    
    # Create report
    create_report(
        reporter_id=sample_user['id'],
        reason='Test reason',
        reported_user_id=reported_user['id']
    )
    
    result = get_all_reports()
    
    assert result['success'] is True
    assert len(result['reports']) > 0
    
    report = result['reports'][0]
    assert report['reporter_id'] == sample_user['id']
    assert report['reason'] == 'Test reason'
    assert report['status'] == 'pending'


def test_get_all_reports_filter_by_status(test_db, sample_user):
    """Test filtering reports by status"""
    import database
    
    reported_user = database.create_user('reported', 'password123', 'reported@example.com')
    
    # Create pending report
    report1 = create_report(
        reporter_id=sample_user['id'],
        reason='Pending report',
        reported_user_id=reported_user['id']
    )
    
    # Create and resolve another report
    report2 = create_report(
        reporter_id=sample_user['id'],
        reason='Resolved report',
        reported_user_id=reported_user['id']
    )
    update_report_status(report2['report_id'], 'resolved', sample_user['id'])
    
    # Get only pending
    pending_result = get_all_reports(status='pending')
    assert pending_result['success'] is True
    assert len(pending_result['reports']) == 1
    assert pending_result['reports'][0]['status'] == 'pending'
    
    # Get only resolved
    resolved_result = get_all_reports(status='resolved')
    assert resolved_result['success'] is True
    assert len(resolved_result['reports']) == 1
    assert resolved_result['reports'][0]['status'] == 'resolved'


def test_get_report_by_id_exists(test_db, sample_user):
    """Test getting a specific report by ID"""
    import database
    
    reported_user = database.create_user('reported', 'password123', 'reported@example.com')
    
    result = create_report(
        reporter_id=sample_user['id'],
        reason='Test reason',
        reported_user_id=reported_user['id']
    )
    
    report_id = result['report_id']
    report = get_report_by_id(report_id)
    
    assert report is not None
    assert report['id'] == report_id
    assert report['reason'] == 'Test reason'
    assert report['reporter_id'] == sample_user['id']


def test_get_report_by_id_not_exists(test_db):
    """Test getting non-existent report"""
    report = get_report_by_id(99999)
    
    assert report is None


def test_update_report_status_to_resolved(test_db, sample_user):
    """Test updating report status to resolved"""
    import database
    
    reported_user = database.create_user('reported', 'password123', 'reported@example.com')
    
    result = create_report(
        reporter_id=sample_user['id'],
        reason='Test reason',
        reported_user_id=reported_user['id']
    )
    
    report_id = result['report_id']
    
    # Update status
    update_result = update_report_status(
        report_id=report_id,
        status='resolved',
        admin_id=sample_user['id'],
        admin_notes='Issue resolved'
    )
    
    assert update_result['success'] is True
    
    # Verify update
    report = get_report_by_id(report_id)
    assert report['status'] == 'resolved'
    assert report['admin_notes'] == 'Issue resolved'
    assert report['resolved_by'] == sample_user['id']
    assert report['resolved_at'] is not None


def test_update_report_status_to_dismissed(test_db, sample_user):
    """Test updating report status to dismissed"""
    import database
    
    reported_user = database.create_user('reported', 'password123', 'reported@example.com')
    
    result = create_report(
        reporter_id=sample_user['id'],
        reason='Test reason',
        reported_user_id=reported_user['id']
    )
    
    report_id = result['report_id']
    
    # Update status
    update_result = update_report_status(
        report_id=report_id,
        status='dismissed',
        admin_id=sample_user['id'],
        admin_notes='Not a valid report'
    )
    
    assert update_result['success'] is True
    
    # Verify update
    report = get_report_by_id(report_id)
    assert report['status'] == 'dismissed'


def test_update_report_status_back_to_pending(test_db, sample_user):
    """Test updating report status back to pending"""
    import database
    
    reported_user = database.create_user('reported', 'password123', 'reported@example.com')
    
    result = create_report(
        reporter_id=sample_user['id'],
        reason='Test reason',
        reported_user_id=reported_user['id']
    )
    
    report_id = result['report_id']
    
    # First resolve it
    update_report_status(report_id, 'resolved', sample_user['id'])
    
    # Then set back to pending
    update_result = update_report_status(
        report_id=report_id,
        status='pending',
        admin_id=sample_user['id']
    )
    
    assert update_result['success'] is True
    
    report = get_report_by_id(report_id)
    assert report['status'] == 'pending'


def test_update_report_status_not_exists(test_db, sample_user):
    """Test updating non-existent report"""
    result = update_report_status(99999, 'resolved', sample_user['id'])
    
    assert result['success'] is False


def test_delete_report_success(test_db, sample_user):
    """Test successfully deleting a report"""
    import database
    
    reported_user = database.create_user('reported', 'password123', 'reported@example.com')
    
    result = create_report(
        reporter_id=sample_user['id'],
        reason='Test reason',
        reported_user_id=reported_user['id']
    )
    
    report_id = result['report_id']
    
    # Delete report
    delete_result = delete_report(report_id)
    
    assert delete_result['success'] is True
    
    # Verify deletion
    report = get_report_by_id(report_id)
    assert report is None


def test_delete_report_not_exists(test_db):
    """Test deleting non-existent report"""
    result = delete_report(99999)
    
    assert result['success'] is False


def test_get_pending_reports_count_zero(test_db):
    """Test getting pending count when no pending reports"""
    result = get_pending_reports_count()
    
    assert result['success'] is True
    assert 'count' in result
    assert result['count'] == 0


def test_get_pending_reports_count_with_reports(test_db, sample_user):
    """Test getting pending count with pending reports"""
    import database
    
    reported_user = database.create_user('reported', 'password123', 'reported@example.com')
    
    # Create pending reports
    create_report(sample_user['id'], 'Report 1', reported_user_id=reported_user['id'])
    create_report(sample_user['id'], 'Report 2', reported_user_id=reported_user['id'])
    create_report(sample_user['id'], 'Report 3', reported_user_id=reported_user['id'])
    
    result = get_pending_reports_count()
    
    assert result['success'] is True
    count = result.get('count') or result.get('pending_count')
    assert count == 3


def test_get_pending_reports_count_excludes_resolved(test_db, sample_user):
    """Test that pending count excludes resolved reports"""
    import database
    
    reported_user = database.create_user('reported', 'password123', 'reported@example.com')
    
    # Create reports
    report1 = create_report(sample_user['id'], 'Pending', reported_user_id=reported_user['id'])
    report2 = create_report(sample_user['id'], 'Resolved', reported_user_id=reported_user['id'])
    report3 = create_report(sample_user['id'], 'Pending 2', reported_user_id=reported_user['id'])
    
    # Resolve one
    update_report_status(report2['report_id'], 'resolved', sample_user['id'])
    
    result = get_pending_reports_count()
    
    assert result['success'] is True
    count = result.get('count') or result.get('pending_count')
    assert count == 2


def test_report_includes_usernames(test_db, sample_user):
    """Test that reports include reporter and reported usernames"""
    import database
    
    reported_user = database.create_user('reported', 'password123', 'reported@example.com')
    
    result = create_report(
        reporter_id=sample_user['id'],
        reason='Test reason',
        reported_user_id=reported_user['id']
    )
    
    report = get_report_by_id(result['report_id'])
    
    assert report is not None
    assert 'reporter_username' in report
    assert report['reporter_username'] == sample_user['username']
    assert 'reported_username' in report
    assert report['reported_username'] == 'reported'


def test_report_includes_project_name(test_db, sample_user, sample_project):
    """Test that reports include project name when applicable"""
    result = create_report(
        reporter_id=sample_user['id'],
        reason='Inappropriate project',
        reported_project_id=sample_project['id']
    )
    
    report = get_report_by_id(result['report_id'])
    
    assert report is not None
    assert 'reported_project_name' in report
    assert report['reported_project_name'] == sample_project['name']


def test_reports_ordered_by_created_at(test_db, sample_user):
    """Test that reports are ordered by created_at DESC"""
    import database
    import time
    
    reported_user = database.create_user('reported', 'password123', 'reported@example.com')
    
    # Create reports with delays
    create_report(sample_user['id'], 'First', reported_user_id=reported_user['id'])
    time.sleep(1.1)
    create_report(sample_user['id'], 'Second', reported_user_id=reported_user['id'])
    time.sleep(1.1)
    create_report(sample_user['id'], 'Third', reported_user_id=reported_user['id'])
    
    result = get_all_reports()
    
    # Newer reports should come first
    assert result['success'] is True
    assert len(result['reports']) == 3
    assert result['reports'][0]['reason'] == 'Third'
    assert result['reports'][1]['reason'] == 'Second'
    assert result['reports'][2]['reason'] == 'First'
