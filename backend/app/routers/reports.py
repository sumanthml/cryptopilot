"""Reports router: full structured project report."""

from __future__ import annotations

import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user, get_or_create_user
from app.db.database import get_db
from app.db.models.models import CryptoFinding, Project, RiskAssessment, Scan, User

router = APIRouter()


def _get_user(firebase_uid: str, db: Session) -> User:
    return get_or_create_user(firebase_uid, db)


@router.get("/reports/{project_id}")
def get_report(
    project_id: int,
    firebase_uid: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(firebase_uid, db)
    project = (
        db.query(Project)
        .filter(Project.id == project_id, (Project.owner_id == user.id) | (Project.is_demo == True))
        .first()
    )
    if not project:
        project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    scans = (
        db.query(Scan)
        .filter(Scan.project_id == project_id)
        .order_by(Scan.started_at.desc())
        .all()
    )

    latest_scan = next((s for s in scans if s.status == "completed"), None)
    findings = []
    assessments = []
    if latest_scan:
        findings = db.query(CryptoFinding).filter(CryptoFinding.scan_id == latest_scan.id).all()
        assessments = db.query(RiskAssessment).filter(RiskAssessment.scan_id == latest_scan.id).all()

    severity_breakdown: dict[str, int] = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for f in findings:
        key = f.severity.upper()
        if key in severity_breakdown:
            severity_breakdown[key] += 1

    scores = [a.risk_score for a in assessments]
    avg_risk = round(sum(scores) / len(scores), 2) if scores else 0.0
    max_risk = max(scores, default=0.0)

    algorithm_counts: dict[str, int] = {}
    for f in findings:
        algorithm_counts[f.algorithm] = algorithm_counts.get(f.algorithm, 0) + 1

    quantum_vulnerable = sum(1 for f in findings if not f.quantum_safe)
    deprecated_count = sum(1 for f in findings if f.nist_status in ("deprecated", "broken"))

    return {
        "report_generated_at": datetime.utcnow().isoformat() + "Z",
        "project": {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "language": project.language,
            "created_at": project.created_at.isoformat(),
        },
        "scan_summary": {
            "total_scans": len(scans),
            "latest_scan_id": latest_scan.id if latest_scan else None,
            "latest_scan_at": latest_scan.started_at.isoformat() if latest_scan else None,
            "latest_scan_status": latest_scan.status if latest_scan else "none",
        },
        "finding_summary": {
            "total": len(findings),
            "severity_breakdown": severity_breakdown,
            "algorithm_counts": algorithm_counts,
            "quantum_vulnerable": quantum_vulnerable,
            "deprecated_or_broken": deprecated_count,
        },
        "risk_summary": {
            "average_risk_score": avg_risk,
            "max_risk_score": round(max_risk, 2),
            "total_assessed": len(assessments),
        },
        "findings": [
            {
                "id": f.id,
                "algorithm": f.algorithm,
                "operation": f.operation,
                "file_path": f.file_path,
                "line_number": f.line_number,
                "severity": f.severity,
                "status": f.status,
                "quantum_safe": f.quantum_safe,
                "nist_status": f.nist_status,
                "recommendation": f.recommendation,
                "evidence": f.evidence,
            }
            for f in findings
        ],
        "risk_assessments": [
            {
                "finding_id": a.finding_id,
                "risk_score": a.risk_score,
                "risk_level": a.risk_level,
                "explanation": a.explanation,
                "factors": json.loads(a.factors_json or "{}"),
            }
            for a in assessments
        ],
    }
