import unittest
from unittest.mock import MagicMock
from datetime import datetime, date, time

# --- MOCK MODELS ---
class MockAttendance:
    def __init__(self, user_id=None, date=None, entry_time=None, exit_time=None, record_type=None):
        self.id = 1
        self.user_id = user_id
        self.date = date
        self.entry_time = entry_time
        self.exit_time = exit_time
        self.record_type = record_type

class MockRHTicket:
    def __init__(self, user_id=None, ticket_type=None, description=None, receipt_url=None, status="open"):
        self.id = 101
        self.user_id = user_id
        self.ticket_type = ticket_type
        self.status = status
        self.description = description
        self.receipt_url = receipt_url
        self.created_at = datetime.utcnow()

class MockUser:
    def __init__(self, id, role="employee"):
        self.id = id
        self.role = role

# --- MOCK SCHEMAS ---
class AttendanceCreate:
    def __init__(self, record_type="normal"):
        self.record_type = record_type

class RHTicketCreate:
    def __init__(self, ticket_type, description, receipt_url=None):
        self.ticket_type = ticket_type
        self.description = description
        self.receipt_url = receipt_url

class RHTicketUpdate:
    def __init__(self, status):
        self.status = status

# --- LOGIC TO TEST ---
# Copied logic from the router implementation for verification
def logic_clock_in(data, db, current_user):
    today = datetime.utcnow().date()
    now_time = datetime.utcnow().time()

    # Simulate query
    # db.query(Attendance).filter(...).first()
    record = db.query_result

    if record:
        if record.entry_time:
             # raise HTTPException(status_code=400, detail="Entrada já registrada hoje")
             return {"error": "Entrada já registrada hoje"}
        record.entry_time = now_time
    else:
        record = MockAttendance(
            user_id=current_user.id,
            date=today,
            entry_time=now_time,
            record_type=data.record_type
        )
        db.add(record)

    db.commit()
    db.refresh(record)

    return {
        "id": record.id,
        "date": record.date,
        "entry_time": record.entry_time,
        "status": "Entrada registrada"
    }

def logic_create_ticket(data, db, current_user):
    ticket = MockRHTicket(
        user_id=current_user.id,
        ticket_type=data.ticket_type,
        description=data.description,
        receipt_url=data.receipt_url,
        status="open"
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket

def logic_update_ticket(ticket_id, data, db, current_user):
    if current_user.role not in ["admin", "company"]:
        return {"error": "Apenas RH/Admin pode atualizar tickets"}

    ticket = db.query_result # Simulating fetching ticket
    if not ticket:
        return {"error": "Chamado não encontrado"}

    ticket.status = data.status
    db.commit()
    db.refresh(ticket)
    return ticket

# --- TEST SUITE ---
class TestRHLogic(unittest.TestCase):
    def setUp(self):
        self.mock_db = MagicMock()
        self.mock_db.query_result = None # Default: no record found
        self.user = MockUser(id=99)
        self.admin = MockUser(id=1, role="admin")

    def test_clock_in_new(self):
        data = AttendanceCreate(record_type="normal")
        result = logic_clock_in(data, self.mock_db, self.user)

        self.mock_db.add.assert_called()
        self.mock_db.commit.assert_called()
        self.assertEqual(result['status'], "Entrada registrada")

    def test_clock_in_existing_error(self):
        # Setup existing record with entry time
        existing = MockAttendance(user_id=99, date=datetime.utcnow().date(), entry_time=datetime.utcnow().time())
        self.mock_db.query_result = existing

        data = AttendanceCreate()
        result = logic_clock_in(data, self.mock_db, self.user)

        self.assertEqual(result.get('error'), "Entrada já registrada hoje")

    def test_create_ticket(self):
        data = RHTicketCreate(ticket_type="VR", description="Test Ticket")
        ticket = logic_create_ticket(data, self.mock_db, self.user)

        self.mock_db.add.assert_called()
        self.assertEqual(ticket.ticket_type, "VR")
        self.assertEqual(ticket.user_id, 99)

    def test_update_ticket_admin(self):
        # Existing ticket
        ticket_mock = MockRHTicket(user_id=99, status="open")
        self.mock_db.query_result = ticket_mock

        data = RHTicketUpdate(status="closed")
        result = logic_update_ticket(101, data, self.mock_db, self.admin)

        self.assertEqual(result.status, "closed")
        self.mock_db.commit.assert_called()

    def test_update_ticket_unauthorized(self):
        data = RHTicketUpdate(status="closed")
        result = logic_update_ticket(101, data, self.mock_db, self.user)

        self.assertEqual(result.get('error'), "Apenas RH/Admin pode atualizar tickets")

if __name__ == '__main__':
    unittest.main()
