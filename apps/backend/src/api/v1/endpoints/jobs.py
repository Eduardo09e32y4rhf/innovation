from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from infrastructure.database.sql.dependencies import get_db
from core.dependencies import get_current_user
from domain.models.job import Job
from domain.models.user import User
from services.ai_image import AIImageService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/
