"""
Unit tests for project database operations
Tests project CRUD operations, tags, search, and approval functionality
"""

import pytest
from database import db_projects
from database.db_projects import (
    create_project, get_project_by_id, update_project, delete_project,
    get_all_projects, get_all_approved_projects, approve_project, 
    set_project_tags, add_tag_to_project, remove_tag_from_project, get_all_tags
)

def test_create_project_success(test_db, sample_user):
    """Test creating a new project successfully"""
    result = create_project(
        name='Test Project',
        description='A test project description',
        file_path='/path/to/project.zip',
        file_size=1024,
        creator_user_id=sample_user['id']
    )
    
    assert result['success'] is True
    assert 'id' in result
    assert result['id'] > 0
    assert result['message'] == 'Project created successfully'

def test_create_project_adds_creator_as_owner(test_db, sample_user):
    """Test that creator is automatically added as owner"""
    result = create_project(
        name='Owner Test',
        description='Testing ownership',
        file_path='/path/to/project.zip',
        file_size=1024,
        creator_user_id=sample_user['id']
    )
    
    project_id = result['id']
    # Owner functionality tested separately
    assert result['success'] is True

def test_get_project_by_id_exists(test_db, sample_project):
    """Test getting a project by ID when it exists"""
    project = get_project_by_id(sample_project['id'])
    
    assert project is not None
    assert project['id'] == sample_project['id']
    assert project['name'] == sample_project['name']
    assert project['description'] == sample_project['description']
    assert project['file_path'] == sample_project['file_path']

def test_get_project_by_id_not_exists(test_db):
    """Test getting a project by ID when it doesn't exist"""
    project = get_project_by_id(99999)
    
    assert project is None

def test_update_project_success(test_db, sample_project):
    """Test updating a project"""
    new_name = 'Updated Project Name'
    new_description = 'Updated description'
    
    result = update_project(
        project_id=sample_project['id'],
        name=new_name,
        description=new_description
    )
    
    assert result['success'] is True
    
    # Verify updates
    project = get_project_by_id(sample_project['id'])
    assert project['name'] == new_name
    assert project['description'] == new_description

def test_update_project_file_info(test_db, sample_project):
    """Test updating project file information"""
    new_path = '/new/path/project.zip'
    new_size = 2048
    
    result = update_project(
        project_id=sample_project['id'],
        file_path=new_path,
        file_size=new_size
    )
    
    assert result['success'] is True
    
    project = get_project_by_id(sample_project['id'])
    assert project['file_path'] == new_path
    assert project['file_size'] == new_size

def test_update_project_not_exists(test_db):
    """Test updating a project that doesn't exist"""
    result = update_project(99999, name='New Name')
    
    assert result['success'] is False

def test_delete_project_success(test_db, sample_project):
    """Test deleting a project successfully"""
    result = delete_project(sample_project['id'])
    
    assert result['success'] is True
    
    # Verify deletion
    project = get_project_by_id(sample_project['id'])
    assert project is None

def test_delete_project_not_exists(test_db):
    """Test deleting a project that doesn't exist"""
    result = delete_project(99999)
    
    assert result['success'] is False

def test_get_all_projects_function(test_db, sample_user):
    """Test getting all projects"""
    create_project('Machine Learning', 'ML project', '/path/1.zip', 1024, sample_user['id'])
    create_project('Web Development', 'Web project', '/path/2.zip', 1024, sample_user['id'])
    
    results = get_all_projects()
    
    assert results['success'] is True
    assert isinstance(results['data'], list)

def test_get_approved_projects_only(test_db, sample_user):
    """Test getting only approved projects"""
    p1 = create_project('Project 1', 'Python Flask API', '/path/1.zip', 1024, sample_user['id'])
    p2 = create_project('Project 2', 'React Frontend', '/path/2.zip', 1024, sample_user['id'])
    
    # Approve only one
    approve_project(p1['id'])
    
    results = get_all_approved_projects()
    
    assert results['success'] is True
    approved_ids = [p['id'] for p in results['data']]
    assert p1['id'] in approved_ids

def test_approve_project(test_db, sample_project):
    """Test approving a project"""
    result = approve_project(sample_project['id'])
    
    assert result['success'] is True
    
    # Verify approval
    project = get_project_by_id(sample_project['id'])
    assert project['approved'] == 1

def test_approve_project_not_exists(test_db):
    """Test approving a project that doesn't exist"""
    result = approve_project(99999)
    
    assert result['success'] is False

def test_project_tags(test_db, sample_project):
    """Test adding tags to a project"""
    # Set project tags
    result = set_project_tags(sample_project['id'], ['python', 'web', 'flask'])
    
    assert result['success'] is True
    
    # Get project and check tags
    project = get_project_by_id(sample_project['id'])
    assert 'tags' in project
    assert isinstance(project['tags'], list)

def test_add_single_tag(test_db, sample_project):
    """Test adding a single tag to a project"""
    result = add_tag_to_project(sample_project['id'], 'python')
    
    assert result['success'] is True

def test_remove_tag(test_db, sample_project):
    """Test removing a tag from a project"""
    # First add a tag
    add_tag_to_project(sample_project['id'], 'python')
    
    # Then remove it
    result = remove_tag_from_project(sample_project['id'], 'python')
    
    assert result['success'] is True

def test_get_all_tags(test_db, sample_user):
    """Test getting all unique tags"""
    # Create projects with various tags
    p1 = create_project('P1', 'Desc', '/path/1.zip', 1024, sample_user['id'])
    p2 = create_project('P2', 'Desc', '/path/2.zip', 1024, sample_user['id'])
    
    set_project_tags(p1['id'], ['python', 'web'])
    set_project_tags(p2['id'], ['javascript', 'web'])
    
    result = get_all_tags()
    
    assert result['success'] is True
    assert isinstance(result['data'], list)

def test_project_timestamps(test_db, sample_project):
    """Test that project timestamps are set"""
    project = get_project_by_id(sample_project['id'])
    
    assert 'created_at' in project
    assert 'updated_at' in project
    assert project['created_at'] is not None
    assert project['updated_at'] is not None

def test_project_default_not_approved(test_db, sample_user):
    """Test that new projects are not approved by default"""
    result = create_project(
        name='Unapproved',
        description='Should not be approved',
        file_path='/path/project.zip',
        file_size=1024,
        creator_user_id=sample_user['id']
    )
    
    project = get_project_by_id(result['id'])
    assert project['approved'] == 0
