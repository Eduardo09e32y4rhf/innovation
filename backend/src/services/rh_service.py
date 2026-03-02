from sqlalchemy.orm import Session
from datetime import datetime
from domain.models.onboarding import Onboarding
from domain.models.leave_request import LeaveRequest
from domain.models.attendance import Attendance
from domain.models.performance_review import PerformanceReview
from domain.models.compliance import PulseSurvey
from .ai_ats import ai_ats_service
import json


class RHService:
    @staticmethod
    async def generate_contract_draft(db: Session, employee_id: int):
        from domain.models.user import User

        user = db.query(User).filter(User.id == employee_id).first()
        if not user:
            return "Usuário não encontrado"

        contract = await ai_ats_service.generate_contract(
            user.full_name, "Colaborador", "R$ 5.000,00"
        )
        return contract

    @staticmethod
    def register_pulse(db: Session, user_id: int, score: int, comment: str = None):
        pulse = PulseSurvey(user_id=user_id, mood_score=score, comment=comment)
        db.add(pulse)
        db.commit()
        db.refresh(pulse)
        return pulse

    @staticmethod
    def process_document_ocr(db: Session, onboarding_id: int, file_content: str):
        # Aqui integraríamos com o Gemini Vision para extrair dados
        # Por enquanto, simulamos uma extração bem-sucedida
        mock_data = {
            "full_name": "João Silva",
            "document_number": "123.456.789-00",
            "birth_date": "1990-05-15",
            "address": "Rua das Flores, 123",
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
    def add_performance_review(
        db: Session, employee_id: int, reviewer_id: int, score: float, feedback: str
    ):
        review = PerformanceReview(
            employee_id=employee_id,
            reviewer_id=reviewer_id,
            score=score,
            feedback=feedback,
            period="Q1-2026",  # Dinâmico
        )
        db.add(review)
        db.commit()
        db.refresh(review)
        return review

    @staticmethod
    def create_leave_request(
        db: Session, employee_id: int, start_date: str, end_date: str, reason: str
    ):
        from domain.models.leave_request import LeaveRequest
        from datetime import datetime

        leave = LeaveRequest(
            employee_id=employee_id,
            start_date=datetime.fromisoformat(start_date),
            end_date=datetime.fromisoformat(end_date),
            reason=reason,
            status="pending",
        )
        db.add(leave)
        db.commit()
        db.refresh(leave)
        return leave

    @staticmethod
    def list_leave_requests(db: Session, user_id: int, user_role: str):
        from domain.models.leave_request import LeaveRequest

        if user_role in ["admin", "company"]:
            return db.query(LeaveRequest).all()
        return db.query(LeaveRequest).filter(LeaveRequest.employee_id == user_id).all()

    @staticmethod
    async def process_biometric_punch(
        db: Session, 
        user_id: int, 
        photo_base64: str, 
        lat: float, 
        lng: float, 
        accuracy: float, 
        fingerprint: str
    ):
        # 1. Validação de GPS (Geo-fencing simplificado / Anti-Mock)
        # Em um cenário real, cruzaríamos com as coordenadas da empresa
        is_suspicious = False
        if accuracy > 100: # Precisão pior que 100m é suspeita para ponto desktop/mobile moderno
            is_suspicious = True
        
        # 2. IA Validation (Simulado por enquanto, pode expandir para ai_ats_service)
        # Aqui chamaríamos ai_ats_service.validate_biometric_photo(photo_base64)
        ai_verification = "verified" if not is_suspicious else "suspicious"

        # 3. Persistência
        now = datetime.now()
        attendance = Attendance(
            user_id=user_id,
            date=now.date(),
            entry_time=now.time() if not db.query(Attendance).filter(Attendance.user_id == user_id, Attendance.date == now.date()).first() else None,
            exit_time=now.time() if db.query(Attendance).filter(Attendance.user_id == user_id, Attendance.date == now.date()).first() else None,
            latitude=lat,
            longitude=lng,
            gps_accuracy=accuracy,
            photo_url="storage://biometrics/" + fingerprint + ".jpg", # Placeholder para upload real
            device_fingerprint=fingerprint,
            is_verified=ai_verification,
            record_type="biometric"
        )
        
        db.add(attendance)
        db.commit()
        db.refresh(attendance)
        
        return {
            "status": "success",
            "message": "Ponto registrado com sucesso",
            "verification": ai_verification,
            "timestamp": now.isoformat()
        }


rh_service = RHService()
