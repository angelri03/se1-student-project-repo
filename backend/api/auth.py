"""
JWT Authentication utilities
Handles token creation, verification, and the @token_required decorator
"""

import jwt
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify
from config import SECRET_KEY, JWT_EXPIRATION

def create_token(user_id: int, username: str) -> str:
    """Create a JWT token for a user"""
    payload = {
        'user_id': user_id,
        'username': username,
        'exp': datetime.utcnow() + timedelta(seconds=JWT_EXPIRATION),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')

def decode_token(token: str) -> dict:
    """Decode and verify a JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return {'success': True, 'payload': payload}
    except jwt.ExpiredSignatureError:
        return {'success': False, 'message': 'Token has expired'}
    except jwt.InvalidTokenError:
        return {'success': False, 'message': 'Invalid token'}

def token_required(f):
    """
    Decorator to protect routes that require authentication
    Adds 'current_user_id' and 'current_username' to the route function
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Check if token is in the Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                # Expected format: "Bearer <token>"
                token = auth_header.split(' ')[1]
            except IndexError:
                return jsonify({'success': False, 'message': 'Invalid token format'}), 401
        
        if not token:
            return jsonify({'success': False, 'message': 'Authentication token is missing'}), 401
        
        # Decode and verify the token
        result = decode_token(token)
        
        if not result['success']:
            return jsonify({'success': False, 'message': result['message']}), 401
        
        # Add user info to kwargs so the route function can access it
        kwargs['current_user_id'] = result['payload']['user_id']
        kwargs['current_username'] = result['payload']['username']
        
        return f(*args, **kwargs)
    
    return decorated