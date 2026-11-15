"""Risk router: project risks, finding assessment, and dashboard."""

from __future__ import annotations

import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.security import get_current_user, get_or_create_user
from app.db.database import get_db
from app.db.models.models import CryptoFinding, Project, RiskAssessment, Scan, User

router = APIRouter()


class RiskOut(BaseModel):
    id: int
    scan_id: int
    finding_id: int | None
    risk_score: float
    risk_level: str
    explanation: str
    factors: dict
    created_at: datetime

    model_config = {"from_attributes": True}


def _get_user(firebase_uid: str, db: Session) -> User:
    return get_or_create_user(firebase_uid, db)


def _get_project(project_id: int, user: User, db: Session) -> Project:
    project = (
        db.query(Project)
        .filter(Project.id == project_id, (Project.owner_id == user.id) | (Project.is_demo == True))
        .first()
    )
    if not project:
        project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


@router.get("/projects/{project_id}/risks")
def get_project_risks(
    project_id: int,
    firebase_uid: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(firebase_uid, db)
    _get_project(project_id, user, db)

    latest_scan = (
        db.query(Scan)
        .filter(Scan.project_id == project_id, Scan.status == "completed")
        .order_by(Scan.started_at.desc())
        .first()
    )
    if not latest_scan:
        return {"scan_id": None, "risks": [], "total": 0}

    assessments = db.query(RiskAssessment).filter(RiskAssessment.scan_id == latest_scan.id).all()
    return {
        "scan_id": latest_scan.id,
        "risks": [
            {
                "id": a.id,
                "finding_id": a.finding_id,
                "risk_score": a.risk_score,
                "risk_level": a.risk_level,
                "explanation": a.explanation,
                "factors": json.loads(a.factors_json or "{}"),
            }
            for a in assessments
        ],
        "total": len(assessments),
    }


@router.post("/risk/assess/{finding_id}")
def assess_finding(
    finding_id: int,
    firebase_uid: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.services.risk.engine import compute_risk

    finding = (
        db.query(CryptoFinding)
        .join(Scan, CryptoFinding.scan_id == Scan.id)
        .join(Project, Scan.project_id == Project.id)
        .join(User, Project.owner_id == User.id)
        .filter(CryptoFinding.id == finding_id, User.firebase_uid == firebase_uid)
        .first()
    )
    if not finding:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found")

    finding_dict = {
        "algorithm": finding.algorithm,
        "severity": finding.severity,
        "quantum_safe": finding.quantum_safe,
        "nist_status": finding.nist_status,
        "confidence": finding.confidence,
        "operation": finding.operation,
        "library": finding.library,
    }
    risk = compute_risk(finding_dict)

    existing = db.query(RiskAssessment).filter(RiskAssessment.finding_id == finding_id).first()
    if existing:
        existing.risk_score = risk["risk_score"]
        existing.risk_level = risk["risk_level"]
        existing.explanation = risk["explanation"]
        existing.factors_json = json.dumps(risk["factors"])
        db.commit()
        db.refresh(existing)
        assessment = existing
    else:
        assessment = RiskAssessment(
            scan_id=finding.scan_id,
            finding_id=finding.id,
            risk_score=risk["risk_score"],
            risk_level=risk["risk_level"],
            explanation=risk["explanation"],
            factors_json=json.dumps(risk["factors"]),
        )
        db.add(assessment)
        db.commit()
        db.refresh(assessment)

    return {
        "finding_id": finding_id,
        "risk_score": risk["risk_score"],
        "risk_level": risk["risk_level"],
        "explanation": risk["explanation"],
        "factors": risk["factors"],
    }


@router.get("/risk/dashboard/{project_id}")
def risk_dashboard(
    project_id: int,
    firebase_uid: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(firebase_uid, db)
    _get_project(project_id, user, db)

    scans = (
        db.query(Scan)
        .filter(Scan.project_id == project_id, Scan.status == "completed")
        .order_by(Scan.started_at.desc())
        .limit(1)
        .all()
    )
    if not scans:
        return {
            "project_id": project_id,
            "total_findings": 0,
            "critical": 0,
            "high": 0,
            "medium": 0,
            "low": 0,
            "average_risk_score": 0.0,
            "top_risks": [],
        }

    scan = scans[0]
    findings = db.query(CryptoFinding).filter(CryptoFinding.scan_id == scan.id).all()
    assessments = db.query(RiskAssessment).filter(RiskAssessment.scan_id == scan.id).all()

    severity_counts: dict[str, int] = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for f in findings:
        key = f.severity.upper()
        if key in severity_counts:
            severity_counts[key] += 1

    scores = [a.risk_score for a in assessments]
    avg_score = sum(scores) / len(scores) if scores else 0.0

    top = sorted(assessments, key=lambda a: a.risk_score, reverse=True)[:5]
    top_risks = [
        {"finding_id": a.finding_id, "risk_score": a.risk_score, "risk_level": a.risk_level, "explanation": a.explanation}
        for a in top
    ]

    return {
        "project_id": project_id,
        "scan_id": scan.id,
        "total_findings": len(findings),
        "critical": severity_counts["CRITICAL"],
        "high": severity_counts["HIGH"],
        "medium": severity_counts["MEDIUM"],
        "low": severity_counts["LOW"],
        "average_risk_score": round(avg_score, 2),
        "top_risks": top_risks,
    }
