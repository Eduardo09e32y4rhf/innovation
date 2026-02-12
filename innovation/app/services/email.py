"""
Serviço de envio de emails usando SendGrid
"""
import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content
from datetime import datetime
from typing import Optional

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY", "")
SENDGRID_FROM_EMAIL = os.getenv("SENDGRID_FROM_EMAIL", "noreply@innovation.ia")
SENDGRID_FROM_NAME = os.getenv("SENDGRID_FROM_NAME", "Innovation.ia")


class EmailService:
    """Serviço para envio de emails via SendGrid"""
    
    def __init__(self):
        self.client = None
        if SENDGRID_API_KEY:
            self.client = SendGridAPIClient(SENDGRID_API_KEY)
    
    def _send_email(self, to_email: str, subject: str, html_content: str) -> bool:
        """Método interno para enviar email"""
        if not self.client:
            print(f"⚠️  SendGrid não configurado. Email não enviado para {to_email}")
            return False
        
        try:
            message = Mail(
                from_email=Email(SENDGRID_FROM_EMAIL, SENDGRID_FROM_NAME),
                to_emails=To(to_email),
                subject=subject,
                html_content=Content("text/html", html_content)
            )
            
            response = self.client.send(message)
            print(f"✅ Email enviado para {to_email} - Status: {response.status_code}")
            return True
            
        except Exception as e:
            print(f"❌ Erro ao enviar email: {str(e)}")
            return False
    
    def send_interview_invitation(
        self,
        candidate_email: str,
        candidate_name: str,
        job_title: str,
        interview_date: datetime,
        interview_type: str,
        interview_location: str,
        company_name: str
    ) -> bool:
        """Envia convite de entrevista para candidato"""
        
        date_formatted = interview_date.strftime("%d/%m/%Y às %H:%M")
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #820AD1, #a855f7); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }}
                .info-box {{ background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #820AD1; border-radius: 5px; }}
                .button {{ display: inline-block; background: #820AD1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Você foi selecionado!</h1>
                </div>
                <div class="content">
                    <p>Olá <strong>{candidate_name}</strong>,</p>
                    
                    <p>Temos o prazer de informar que você foi selecionado para uma entrevista!</p>
                    
                    <div class="info-box">
                        <p><strong>📋 Vaga:</strong> {job_title}</p>
                        <p><strong>📅 Data e Horário:</strong> {date_formatted}</p>
                        <p><strong>💼 Tipo:</strong> {interview_type}</p>
                        <p><strong>📍 Local/Link:</strong> {interview_location}</p>
                    </div>
                    
                    <p>Este evento foi adicionado automaticamente ao seu Google Calendar.</p>
                    
                    <p>Por favor, confirme sua presença respondendo este email.</p>
                    
                    <p>Boa sorte!</p>
                    
                    <div class="footer">
                        <p>Atenciosamente,<br><strong>{company_name}</strong></p>
                        <p>Este é um email automático. Por favor, não responda.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        subject = f"Convite para Entrevista - {job_title}"
        return self._send_email(candidate_email, subject, html_content)
    
    def send_interview_confirmation(
        self,
        company_email: str,
        candidate_name: str,
        job_title: str,
        interview_date: datetime
    ) -> bool:
        """Envia confirmação de agendamento para empresa"""
        
        date_formatted = interview_date.strftime("%d/%m/%Y às %H:%M")
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #820AD1;">✅ Entrevista Agendada</h2>
                <p>Uma nova entrevista foi agendada com sucesso:</p>
                <ul>
                    <li><strong>Candidato:</strong> {candidate_name}</li>
                    <li><strong>Vaga:</strong> {job_title}</li>
                    <li><strong>Data:</strong> {date_formatted}</li>
                </ul>
                <p>O evento foi adicionado ao seu Google Calendar e o candidato recebeu um email de confirmação.</p>
            </div>
        </body>
        </html>
        """
        
        subject = f"Entrevista Agendada - {candidate_name}"
        return self._send_email(company_email, subject, html_content)
    
    def send_interview_reminder(
        self,
        email: str,
        name: str,
        job_title: str,
        interview_date: datetime,
        interview_location: str
    ) -> bool:
        """Envia lembrete 24h antes da entrevista"""
        
        date_formatted = interview_date.strftime("%d/%m/%Y às %H:%M")
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; background: #fff3cd; border-left: 4px solid #ffc107;">
                <h2 style="color: #856404;">⏰ Lembrete de Entrevista</h2>
                <p>Olá <strong>{name}</strong>,</p>
                <p>Este é um lembrete de que você tem uma entrevista agendada para <strong>amanhã</strong>:</p>
                <ul>
                    <li><strong>Vaga:</strong> {job_title}</li>
                    <li><strong>Data:</strong> {date_formatted}</li>
                    <li><strong>Local:</strong> {interview_location}</li>
                </ul>
                <p>Não se esqueça! Boa sorte! 🍀</p>
            </div>
        </body>
        </html>
        """
        
        subject = f"Lembrete: Entrevista amanhã - {job_title}"
        return self._send_email(email, subject, html_content)
    
    def send_status_update(
        self,
        candidate_email: str,
        candidate_name: str,
        job_title: str,
        new_status: str,
        message: Optional[str] = None
    ) -> bool:
        """Notifica candidato sobre mudança de status"""
        
        status_messages = {
            "approved": "✅ Parabéns! Você foi aprovado!",
            "rejected": "❌ Infelizmente, não seguiremos com sua candidatura.",
            "in_review": "🔍 Sua candidatura está em análise.",
            "interview_scheduled": "📅 Sua entrevista foi agendada!"
        }
        
        status_text = status_messages.get(new_status, "Status atualizado")
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #820AD1;">{status_text}</h2>
                <p>Olá <strong>{candidate_name}</strong>,</p>
                <p>Houve uma atualização no status da sua candidatura para a vaga de <strong>{job_title}</strong>.</p>
                {f'<p>{message}</p>' if message else ''}
                <p>Atenciosamente,<br>Equipe Innovation.ia</p>
            </div>
        </body>
        </html>
        """
        
        subject = f"Atualização de Candidatura - {job_title}"
        return self._send_email(candidate_email, subject, html_content)


# Instância global do serviço
email_service = EmailService()
