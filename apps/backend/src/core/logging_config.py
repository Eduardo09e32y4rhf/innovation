import logging
import sys


def setup_logging():
    """Configurar logging para toda aplicação"""

    # Formato de log
    log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    # Configurar handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(log_format))

    # Configurar logger root
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    logger.addHandler(handler)

    return logger
