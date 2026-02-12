"""
Serviço de integração com Google Calendar
"""
import os
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Configurações OAuth
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback")

SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
]


class CalendarService:
    """Serviço para integração com Google Calendar"""
    
    def __init__(self):
        self.client_config = {
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uris": [GOOGLE_REDIRECT_URI],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token"
            }
        }
    
    def get_authorization_url(self, state: str = None) -> str:
        """Gera URL para OAuth 2.0"""
        if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
            raise ValueError("Google OAuth não configurado. Configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET")
        
        flow = Flow.from_client_config(
            self.client_config,
            scopes=SCOPES,
            redirect_uri=GOOGLE_REDIRECT_URI
        )
        
        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent'
        )
        
        return authorization_url
    
    def exchange_code_for_token(self, code: str) -> Dict[str, Any]:
        """Troca código de autorização por token de acesso"""
        flow = Flow.from_client_config(
            self.client_config,
            scopes=SCOPES,
            redirect_uri=GOOGLE_REDIRECT_URI
        )
        
        flow.fetch_token(code=code)
        credentials = flow.credentials
        
        return {
            'token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'token_uri': credentials.token_uri,
            'client_id': credentials.client_id,
            'client_secret': credentials.client_secret,
            'scopes': credentials.scopes
        }
    
    def _get_service(self, token_data: Dict[str, Any]):
        """Cria serviço do Google Calendar"""
        credentials = Credentials(
            token=token_data.get('token'),
            refresh_token=token_data.get('refresh_token'),
            token_uri=token_data.get('token_uri'),
            client_id=token_data.get('client_id'),
            client_secret=token_data.get('client_secret'),
            scopes=token_data.get('scopes')
        )
        
        return build('calendar', 'v3', credentials=credentials)
    
    def create_interview_event(
        self,
        token_data: Dict[str, Any],
        summary: str,
        description: str,
        start_time: datetime,
        duration_hours: int = 1,
        attendees: list = None,
        location: str = None
    ) -> Optional[str]:
        """
        Cria evento de entrevista no Google Calendar
        
        Returns:
            event_id: ID do evento criado ou None se falhar
        """
        try:
            service = self._get_service(token_data)
            
            end_time = start_time + timedelta(hours=duration_hours)
            
            event = {
                'summary': summary,
                'description': description,
                'start': {
                    'dateTime': start_time.isoformat(),
                    'timeZone': 'America/Sao_Paulo',
                },
                'end': {
                    'dateTime': end_time.isoformat(),
                    'timeZone': 'America/Sao_Paulo',
                },
                'reminders': {
                    'useDefault': False,
                    'overrides': [
                        {'method': 'email', 'minutes': 24 * 60},  # 24h antes
                        {'method': 'popup', 'minutes': 60},        # 1h antes
                    ],
                },
            }
            
            if location:
                event['location'] = location
            
            if attendees:
                event['attendees'] = [{'email': email} for email in attendees]
                event['guestsCanModify'] = False
                event['guestsCanInviteOthers'] = False
                event['guestsCanSeeOtherGuests'] = True
            
            created_event = service.events().insert(
                calendarId='primary',
                body=event,
                sendUpdates='all'  # Envia emails para todos os participantes
            ).execute()
            
            print(f"✅ Evento criado: {created_event.get('htmlLink')}")
            return created_event.get('id')
            
        except HttpError as error:
            print(f"❌ Erro ao criar evento: {error}")
            return None
        except Exception as e:
            print(f"❌ Erro inesperado: {str(e)}")
            return None
    
    def update_event(
        self,
        token_data: Dict[str, Any],
        event_id: str,
        updates: Dict[str, Any]
    ) -> bool:
        """Atualiza evento existente"""
        try:
            service = self._get_service(token_data)
            
            event = service.events().get(
                calendarId='primary',
                eventId=event_id
            ).execute()
            
            event.update(updates)
            
            service.events().update(
                calendarId='primary',
                eventId=event_id,
                body=event,
                sendUpdates='all'
            ).execute()
            
            print(f"✅ Evento atualizado: {event_id}")
            return True
            
        except HttpError as error:
            print(f"❌ Erro ao atualizar evento: {error}")
            return False
    
    def delete_event(
        self,
        token_data: Dict[str, Any],
        event_id: str
    ) -> bool:
        """Deleta evento do calendário"""
        try:
            service = self._get_service(token_data)
            
            service.events().delete(
                calendarId='primary',
                eventId=event_id,
                sendUpdates='all'
            ).execute()
            
            print(f"✅ Evento deletado: {event_id}")
            return True
            
        except HttpError as error:
            print(f"❌ Erro ao deletar evento: {error}")
            return False
    
    def list_upcoming_events(
        self,
        token_data: Dict[str, Any],
        max_results: int = 10
    ) -> list:
        """Lista próximos eventos do calendário"""
        try:
            service = self._get_service(token_data)
            
            now = datetime.utcnow().isoformat() + 'Z'
            
            events_result = service.events().list(
                calendarId='primary',
                timeMin=now,
                maxResults=max_results,
                singleEvents=True,
                orderBy='startTime'
            ).execute()
            
            return events_result.get('items', [])
            
        except HttpError as error:
            print(f"❌ Erro ao listar eventos: {error}")
            return []


# Instância global do serviço
calendar_service = CalendarService()
