from __future__ import annotations

from enum import Enum


class PlanFeature(str, Enum):
    SERVICES_VALIDATION = "services_validation"
    SERVICES_FULL = "services_full"

