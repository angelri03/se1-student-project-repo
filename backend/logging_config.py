import logging
from logging.handlers import RotatingFileHandler
import os


def ensure_logs_dir(path: str):
    os.makedirs(path, exist_ok=True)

def get_logger(log_dir: str = None):
    """Configure and return a logger for recording user actions.
    Logs are written to <backend>/logs/actions.log by default and rotated.
    """
    if log_dir is None:
        base_dir = os.path.dirname(__file__)
        log_dir = os.path.join(base_dir, 'logs')

    ensure_logs_dir(log_dir)
    log_path = os.path.join(log_dir, 'actions.log')
    log_path2 = os.path.join(log_dir, 'actions2.log')
    logger = logging.getLogger('actions')

    if logger.handlers:
        return logger

    logger.setLevel(logging.INFO)

    # primary rotating file
    handler1 = RotatingFileHandler(log_path, maxBytes=5 * 1024 * 1024, backupCount=5, encoding='utf-8')
    # secondary rotating file
    handler2 = RotatingFileHandler(log_path2, maxBytes=10 * 1024 * 1024, backupCount=10, encoding='utf-8')

    formatter = logging.Formatter('%(asctime)s | %(levelname)s | %(remote_addr)s | %(username)s | %(method)s | %(path)s | %(status)s | %(message)s')
    handler1.setFormatter(formatter)
    handler2.setFormatter(formatter)

    logger.addHandler(handler1)
    logger.addHandler(handler2)

    # avoid propagating to root logger (prevents duplicate output)
    logger.propagate = False

    return logger
