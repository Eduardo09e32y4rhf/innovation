import sys
import unittest
from unittest.mock import MagicMock
from datetime import datetime

# Adjust path to include backend source
sys.path.append("backend/src")

try:
    from api.v1.endpoints.analytics import get_analytics
    from domain.models.user import User
except ImportError:
    print("Skipping test due to missing dependencies in environment")
    sys.exit(0)


class TestAnalytics(unittest.TestCase):
    def test_get_analytics_structure(self):
        # Setup mocks
        mock_db = MagicMock()
        mock_user = MagicMock()
        mock_user.id = 1

        mock_query_group_by = MagicMock()
        mock_db.query.return_value = mock_query_group_by
        mock_query_group_by.filter.return_value = mock_query_group_by
        mock_query_group_by.group_by.return_value = mock_query_group_by

        # We will maintain an execution count to return the correct tuple shape
        # The endpoint expects:
        # 1. totals_query (returns (type, total))
        # 2. active_jobs (returns int from .count())
        # 3. total_candidates (returns int from .count())
        # 4. history_transactions_query (returns (year, month, type, total))

        self.call_count = 0

        def mock_all():
            self.call_count += 1
            if self.call_count == 1:
                return [("income", 1000.0), ("expense", 200.0)]
            elif self.call_count == 2:
                # Mocking history returning 4 elements per row
                return [(2024, 1, "income", 1000.0), (2024, 1, "expense", 200.0)]
            return []

        mock_query_group_by.all = mock_all
        mock_query_group_by.count.return_value = 5

        def filter_side_effect(*args, **kwargs):
            mock = MagicMock()
            mock.group_by.return_value.all.side_effect = mock_all
            mock.count.return_value = 5
            return mock

        mock_query_group_by.filter.side_effect = filter_side_effect
        mock_query_group_by.join.return_value = mock_query_group_by

        # Run the function
        result = get_analytics(db=mock_db, current_user=mock_user)

        # Assertions
        self.assertIn("summary", result)
        self.assertIn("history", result)

        self.assertEqual(result["summary"]["total_revenue"], 1000.0)
        self.assertEqual(result["summary"]["active_jobs"], 5)


if __name__ == "__main__":
    unittest.main()
