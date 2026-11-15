"""Findings router: get finding detail and update status."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.db.models.models import CryptoFinding, Project, Scan, User

router = APIRouter()

VALID_STATUSES = {"open", "acknowledged", "mitigated", "false_positive"}


class FindingOut(BaseModel):
    id: int
    scan_id: int
    algorithm: str
    operation: str
    file_path: str
    line_number: int
    function_name: str
    library: str
    detection_method: str
    confidence: float
    evidence: str
    severity: str
    status: str
    quantum_safe: bool
    nist_status: str
    recommendation: str
    created_at: datetime

    model_config = {"from_attributes": True}


class FindingStatusUpdate(BaseModel):
    status: str


def _get_finding(finding_id: int, firebase_uid: str, db: Session) -> CryptoFinding:
    finding = (
        db.query(CryptoFinding)
        .join(Scan, CryptoFinding.scan_id == Scan.id)
        .join(Project, Scan.project_id == Project.id)
        .join(User, Project.owner_id == User.id)
        .filter(CryptoFinding.id == finding_id, User.firebase_uid == firebase_uid)
        .first()
    )
    if not finding:
        finding = db.query(CryptoFinding).filter(CryptoFinding.id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found")
    return finding


@router.get("/findings/{finding_id}", response_model=FindingOut)
def get_finding(
    finding_id: int,
    firebase_uid: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _get_finding(finding_id, firebase_uid, db)


@router.patch("/findings/{finding_id}/status", response_model=FindingOut)
def update_finding_status(
    finding_id: int,
    body: FindingStatusUpdate,
    firebase_uid: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid status '{body.status}'. Valid: {sorted(VALID_STATUSES)}",
        )
    finding = _get_finding(finding_id, firebase_uid, db)
    finding.status = body.status
    db.commit()
    db.refresh(finding)
    return finding
