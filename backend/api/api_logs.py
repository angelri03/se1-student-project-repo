"""Logs API

Provides an endpoint for moderators/admins to fetch action logs.
"""
from flask import Blueprint, request, jsonify
from api.auth import admin_required
import pathlib
import os
from datetime import datetime

logs_bp = Blueprint('logs_bp', __name__)


def _logs_file_path():
    # backend/api -> parents[1] -> backend
    repo_backend = pathlib.Path(__file__).resolve().parents[1]
    log_file = repo_backend / 'logs' / 'actions.log'
    return str(log_file)


def tail_lines(path: str, lines: int = 100):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return f.readlines()[-lines:]
    except Exception:
        return []


def _parse_log_line(line: str):
    """Parse a log line into a dict according to the format:
    %(asctime)s | %(levelname)s | %(remote_addr)s | %(username)s | %(method)s | %(path)s | %(status)s | %(message)s
    Returns None if parsing fails.
    """
    parts = line.rstrip('\n').split(' | ', 7)
    if len(parts) < 8:
        return None
    asctime, level, remote_addr, username, method, path, status, message = parts
    ts = None
    try:
        ts = datetime.fromisoformat(asctime)
    except Exception:
        try:
            ts = datetime.strptime(asctime, '%Y-%m-%d %H:%M:%S,%f')
        except Exception:
            ts = None

    return {
        'timestamp': asctime,
        'level': level,
        'remote_addr': remote_addr,
        'username': username,
        'method': method,
        'path': path,
        'status': status,
        'message': message,
        '_ts': ts
    }


@logs_bp.route('/api/logs', methods=['GET'])
@admin_required
def get_logs(current_user_id=None, current_username=None):
    """Return parsed logs. Supports filtering query params:
    - lines: number of lines to read (default 200)
    - username, method, path, status: filter substrings (case-insensitive)
    - search: search in message
    """
    try:
        lines = int(request.args.get('lines', 200))
    except Exception:
        lines = 200

    username_q = request.args.get('username')
    method_q = request.args.get('method')
    path_q = request.args.get('path')
    status_q = request.args.get('status')
    search_q = request.args.get('search')

    # date range filtering
    start_q = request.args.get('start')
    end_q = request.args.get('end')
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 100))
    except Exception:
        page = 1
        per_page = 100

    path = _logs_file_path()
    if not os.path.exists(path):
        return jsonify({'success': True, 'logs': [], 'message': 'No logs yet'}), 200

    raw_lines = tail_lines(path, lines)
    parsed = []
    
    # exclude from logs
    excluded_paths = ['/api/login', '/api/register', '/api/change-password']
    
    for l in raw_lines:
        p = _parse_log_line(l)
        if not p:
            continue
        
        log_path = p.get('path', '')
        if any(excluded in log_path for excluded in excluded_paths):
            continue

        # apply filters
        if username_q and username_q.lower() not in (p.get('username') or '').lower():
            continue
        if method_q and method_q.lower() not in (p.get('method') or '').lower():
            continue
        if path_q and path_q.lower() not in (p.get('path') or '').lower():
            continue
        if status_q and status_q.lower() not in (p.get('status') or '').lower():
            continue
        if search_q and search_q.lower() not in (p.get('message') or '').lower():
            continue

        # date-range filtering using parsed timestamp
        ts = p.get('_ts')
        if (start_q or end_q) and ts is None:
            continue

        def _parse_query_dt(q: str):
            if not q:
                return None
            try:
                # 'YYYY-MM-DDTHH:MM' or 'YYYY-MM-DD HH:MM' or full ISO
                q2 = q.replace(' ', 'T')
                if ',' in q2 and 'T' in q2:
                    q2 = q2.replace(',', '.')
                return datetime.fromisoformat(q2)
            except Exception:
                try:
                    return datetime.strptime(q, '%Y-%m-%d %H:%M:%S')
                except Exception:
                    return None

        start_dt = _parse_query_dt(start_q)
        end_dt = _parse_query_dt(end_q)
        if start_dt and ts and ts < start_dt:
            continue
        if end_dt and ts and ts > end_dt:
            continue

        # remove internal timestamps before returning
        item = {k: v for k, v in p.items() if k != '_ts'}
        parsed.append(item)

    total = len(parsed)
    if per_page <= 0:
        per_page = 100
    start_index = (page - 1) * per_page
    end_index = start_index + per_page
    page_items = parsed[start_index:end_index]

    return jsonify({'success': True, 'logs': page_items, 'page': page, 'per_page': per_page, 'total': total}), 200
