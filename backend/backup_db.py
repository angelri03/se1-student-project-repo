"""
Database Backup Script
Duplicates the database and manages backup retention (60 days)
To enable automatic backups, schedule this script to run periodically using an OS scheduler.

"""

import sqlite3
import shutil
import os
from datetime import datetime, timedelta
from pathlib import Path

DATABASE_NAME = 'se1.db' # replace with whatever name the database uses
BACKUP_DIR = 'backups'
RETENTION_DAYS = 60


def create_backup():
    """Create a timestamped backup of the database"""
    backup_path = Path(BACKUP_DIR)
    backup_path.mkdir(exist_ok=True)
    
    if not os.path.exists(DATABASE_NAME):
        print(f"Error: Database '{DATABASE_NAME}' not found!")
        return False
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_filename = f"se1_backup_{timestamp}.db"
    backup_filepath = backup_path / backup_filename
    
    try:
        # Create backup using SQLite's backup API
        source_conn = sqlite3.connect(DATABASE_NAME)
        backup_conn = sqlite3.connect(str(backup_filepath))
        
        source_conn.backup(backup_conn)
        
        backup_conn.close()
        source_conn.close()
        
        backup_size = os.path.getsize(backup_filepath)
        backup_size_mb = backup_size / (1024 * 1024)
        
        print(f"Backup created successfully: {backup_filename}")
        print(f"  Size: {backup_size_mb:.2f} MB")
        print(f"  Location: {backup_filepath.absolute()}")
        
        return True
        
    except Exception as e:
        print(f"Backup failed: {str(e)}")
        return False


def cleanup_old_backups():
    """Remove backups older than RETENTION_DAYS"""
    backup_path = Path(BACKUP_DIR)
    
    if not backup_path.exists():
        return
    
    # Calculate cutoff date
    cutoff_date = datetime.now() - timedelta(days=RETENTION_DAYS)
    
    removed_count = 0
    total_freed_mb = 0
    
    for backup_file in backup_path.glob('se1_backup_*.db'):
        try:
            file_time = datetime.fromtimestamp(backup_file.stat().st_mtime)
            
            # Remove if older than retention period
            if file_time < cutoff_date:
                file_size = backup_file.stat().st_size
                backup_file.unlink()
                removed_count += 1
                total_freed_mb += file_size / (1024 * 1024)
                print(f"  Removed old backup: {backup_file.name} (Age: {(datetime.now() - file_time).days} days)")
        
        except Exception as e:
            print(f"  Warning: Could not process {backup_file.name}: {str(e)}")
    
    if removed_count > 0:
        print(f"\nCleaned up {removed_count} old backup(s), freed {total_freed_mb:.2f} MB")
    else:
        print("\nNo old backups to remove!")


def list_backups():
    """List all existing backups"""
    backup_path = Path(BACKUP_DIR)
    
    if not backup_path.exists() or not any(backup_path.glob('se1_backup_*.db')):
        print("No backups found!")
        return
    
    print("\nExisting backups:")
    backups = sorted(backup_path.glob('se1_backup_*.db'), key=lambda x: x.stat().st_mtime, reverse=True)
    
    for backup_file in backups:
        file_time = datetime.fromtimestamp(backup_file.stat().st_mtime)
        file_size_mb = backup_file.stat().st_size / (1024 * 1024)
        age_days = (datetime.now() - file_time).days
        
        print(f"  • {backup_file.name}")
        print(f"    Created: {file_time.strftime('%Y-%m-%d %H:%M:%S')} ({age_days} days ago)")
        print(f"    Size: {file_size_mb:.2f} MB")


def main():
    """Main backup execution"""
    print("=" * 60)
    print("Database Backup Script")
    print(f"Retention Policy: {RETENTION_DAYS} days")
    print("=" * 60)
    print()
    
    print("Creating database backup...")
    success = create_backup()
    
    if success:
        print("\nCleaning up old backups...")
        cleanup_old_backups()
        
        list_backups()
        
        print("\n" + "=" * 60)
        print("Backup process completed successfully!")
        print("=" * 60)
    else:
        print("\n" + "=" * 60)
        print("Backup process failed!")
        print("=" * 60)


if __name__ == '__main__':
    main()
