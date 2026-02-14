from __future__ import annotations

from sqlalchemy.orm import Session

from core.plans import PlanFeature
from domain.models.company import Company
from domain.models.plan import Plan
from domain.models.subscription import Subscription


def _normalize_features(features: str | None) -> set[str]:
    if not features:
        return set()
    raw_items = [item.strip().lower() for item in features.split(",")]
    return {item for item in raw_items if item}


def get_company_plan(db: Session, company_id: int) -> Plan | None:
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company or not company.plan_id:
        return None
    return db.query(Plan).filter(Plan.id == company.plan_id).first()


def get_subscription_plan(
    db: Session, subscription: Subscription | None
) -> Plan | None:
    if not subscription:
        return None
    return db.query(Plan).filter(Plan.id == subscription.plan_id).first()


def has_plan_feature(plan: Plan | None, feature: PlanFeature) -> bool:
    if not plan:
        return False
    features = _normalize_features(plan.features)
    return feature.value in features


def has_any_services_feature(plan: Plan | None) -> bool:
    if not plan:
        return False
    features = _normalize_features(plan.features)
    return bool(
        {PlanFeature.SERVICES_VALIDATION.value, PlanFeature.SERVICES_FULL.value}
        & features
    )
