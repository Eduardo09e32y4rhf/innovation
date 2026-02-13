from sqlalchemy.orm import Session
from datetime import datetime
from ..models.onboarding import Onboarding
from ..models.leave_request import LeaveRequest
from ..models.performance_review import PerformanceReview
import json

class RHService:
    @staticmethod
    def process_document_ocr(db: Session, onboarding_id: int, file_content: str):
        # Aqui integraríamos com o Gemini Vision para extrair dados
        # Por enquanto, simulamos uma extração bem-sucedida
        mock_data = {
            "full_name": "João Silva",
            "document_number": "123.456.789-00",
            "birth_date": "1990-05-15",
            "address": "Rua das Flores, 123"
        }
        
        onboarding = db.query(Onboarding).filter(Onboarding.id == onboarding_id).first()
        if onboarding:
            onboarding.document_ocr_data = json.dumps(mock_data)
            onboarding.docs_verified = True
            onboarding.status = "in_progress"
            db.commit()
            db.refresh(onboarding)
        return mock_data

    @staticmethod
    def approve_leave_request(db: Session, request_id: int, manager_notes: str):
        request = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
        if request:
            request.status = "approved"
            request.manager_notes = manager_notes
            db.commit()
            db.refresh(request)
        return request

    @staticmethod
    def add_performance_review(db: Session, employee_id: int, reviewer_id: int, score: float, feedback: str):
        review = PerformanceReview(
            employee_id=employee_id,
            reviewer_id=reviewer_id,
            score=score,
            feedback=feedback,
            period="Q1-2026" # Dinâmico
        )
        db.add(review)
        db.commit()
        db.refresh(review)
        return review

rh_service = RHService()
