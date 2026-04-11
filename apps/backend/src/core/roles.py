from __future__ import annotations

from enum import Enum


class Role(str, Enum):
    COMPANY = "COMPANY"
    SERVICES = "SERVICES"
    SAC = "SAC"
    ADM = "ADM"


INTERNAL_ROLES = {Role.SERVICES, Role.SAC, Role.ADM}
COMPANY_ROLES = {Role.COMPANY}
