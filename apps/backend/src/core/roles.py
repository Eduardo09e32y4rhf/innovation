from __future__ import annotations

from enum import Enum


class Role(str, Enum):
    COMPANY = "company"
    SERVICES = "services"
    SAC = "sac"
    ADM = "adm"


INTERNAL_ROLES = {Role.SERVICES, Role.SAC, Role.ADM}
COMPANY_ROLES = {Role.COMPANY}
