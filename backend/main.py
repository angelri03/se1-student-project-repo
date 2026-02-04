"""
Main application entry point
Aggregates all blueprints and runs the Flask server
"""

from flask import Flask, jsonify, send_from_directory, request, g
from werkzeug.exceptions import RequestEntityTooLarge
from flask_cors import CORS
import database
from api import users_bp, projects_bp, courses_bp, topics_bp, bookmarks_bp, logs_bp, notifications_bp, reports_bp
from logging_config import get_logger
import time
from api import auth as auth_utils
import os

app = Flask(__name__)
CORS(app)

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500 MB max upload


# Return JSON for 413 errors instead of default HTML
@app.errorhandler(RequestEntityTooLarge)
def handle_file_too_large(e):
    return jsonify({'success': False, 'message': 'Uploaded file is too large. Maximum allowed size is 500MB.'}), 413

# Initialize the database when the server starts
database.init_db()

# Initialize action logger
actions_logger = get_logger()

@app.before_request
def _log_before_request():
    g.start_time = time.time()
    g.username = None
    # extract username from authorization header if present
    auth_header = request.headers.get('Authorization')
    if auth_header:
        try:
            token = auth_header.split(' ')[1]
            result = auth_utils.decode_token(token)
            if result.get('success'):
                g.username = result['payload'].get('username')
        except Exception:
            g.username = None


@app.after_request
def _log_after_request(response):
    try:
        # exclude login and authentication
        if request.path in ['/api/login', '/api/register', '/api/change-password']:
            return response
            
        remote_addr = request.headers.get('X-Forwarded-For', request.remote_addr)
        username = getattr(g, 'username', None) or 'anonymous'
        status = getattr(response, 'status_code', '')
        method = request.method
        path = request.path

        payload = None
        try:
            payload = request.get_json(silent=True)
        except Exception:
            payload = None

        if not payload:
            payload = request.values.to_dict()

        if isinstance(payload, dict):
            payload = payload.copy()
            sensitive_fields = ['password', 'old_password', 'new_password', 'token', 'access_token', 'refresh_token']
            for field in sensitive_fields:
                if field in payload:
                    payload[field] = '********'

        payload_str = str(payload)
        if len(payload_str) > 2000:
            payload_str = payload_str[:2000] + '...'

        actions_logger.info(payload_str, extra={
            'remote_addr': remote_addr,
            'username': username,
            'method': method,
            'path': path,
            'status': status,
        })
    except Exception:
        pass

    return response

# Register blueprints
app.register_blueprint(users_bp)
app.register_blueprint(projects_bp)
app.register_blueprint(courses_bp)
app.register_blueprint(topics_bp)
app.register_blueprint(bookmarks_bp)
app.register_blueprint(logs_bp)
app.register_blueprint(notifications_bp)
app.register_blueprint(reports_bp)

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    return jsonify({'status': 'ok', 'message': 'Server is running'}), 200

# Serve uploaded files
@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    """Serve uploaded files"""
    return send_from_directory('uploads', filename)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)