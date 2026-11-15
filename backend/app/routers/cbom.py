"""CBOM router: generate CycloneDX v1.6 CBOM for a project."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user, get_or_create_user
from app.db.database import get_db
from app.db.models.models import CryptoFinding, Project, Scan, User

router = APIRouter()


def _get_user(firebase_uid: str, db: Session) -> User:
    return get_or_create_user(firebase_uid, db)


@router.get("/cbom/{project_id}")
@router.get("/projects/{project_id}/cbom")
def get_cbom(
    project_id: int,
    firebase_uid: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.services.cbom.generator import generate_cbom

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

    latest_scan = (
        db.query(Scan)
        .filter(Scan.project_id == project_id, Scan.status == "completed")
        .order_by(Scan.started_at.desc())
        .first()
    )

    findings: list[CryptoFinding] = []
    if latest_scan:
        findings = db.query(CryptoFinding).filter(CryptoFinding.scan_id == latest_scan.id).all()

    finding_dicts = [
        {
            "algorithm": f.algorithm,
            "operation": f.operation,
            "file_path": f.file_path,
            "line_number": f.line_number,
            "function_name": f.function_name,
            "library": f.library,
            "severity": f.severity,
            "quantum_safe": f.quantum_safe,
            "nist_status": f.nist_status,
            "recommendation": f.recommendation,
        }
        for f in findings
    ]

    return generate_cbom(project.name, finding_dicts)
