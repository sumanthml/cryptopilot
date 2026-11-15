"""Scans router: get scan metadata and paginated findings."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.security import get_current_user, get_or_create_user
from app.db.database import get_db
from app.db.models.models import CryptoFinding, Project, Scan, User

router = APIRouter()


class ScanOut(BaseModel):
    id: int
    project_id: int
    status: str
    started_at: datetime
    completed_at: datetime | None
    total_findings: int
    scanner_version: str
    error_message: str

    model_config = {"from_attributes": True}


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


class PaginatedFindingsOut(BaseModel):
    items: list[FindingOut]
    total: int
    page: int
    page_size: int


def _get_user(firebase_uid: str, db: Session) -> User:
    return get_or_create_user(firebase_uid, db)


def _get_scan(scan_id: int, user: User, db: Session) -> Scan:
    scan = (
        db.query(Scan)
        .join(Project, Scan.project_id == Project.id)
        .filter(Scan.id == scan_id, (Project.owner_id == user.id) | (Project.is_demo == True))
        .first()
    )
    if not scan:
        # Fallback: check if scan_id was passed as project_id
        scan = (
            db.query(Scan)
            .join(Project, Scan.project_id == Project.id)
            .filter(Scan.project_id == scan_id, (Project.owner_id == user.id) | (Project.is_demo == True))
            .order_by(Scan.started_at.desc())
            .first()
        )
    if not scan:
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        scan = db.query(Scan).filter(Scan.project_id == scan_id).order_by(Scan.started_at.desc()).first()
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found")
    return scan


class ScanStatusOut(BaseModel):
    id: int
    project_id: int
    status: str
    progress: int = 0
    step: str = ""
    total_findings: int = 0
    error_message: str = ""
    started_at: datetime
    completed_at: datetime | None = None


@router.get("/scans/{scan_id}/status", response_model=ScanStatusOut)
def get_scan_status(
    scan_id: int,
    firebase_uid: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    import json
    user = _get_user(firebase_uid, db)
    scan = _get_scan(scan_id, user, db)

    progress = 0
    step = "Scan queued..."
    if scan.status == "completed":
        progress = 100
        step = f"Scan complete ({scan.total_findings} findings detected)"
    elif scan.status == "failed":
        progress = 100
        step = f"Scan failed: {scan.error_message}"
    elif scan.status == "running":
        progress = 50
        step = "Analyzing cryptographic AST nodes..."

    try:
        if scan.metadata_json:
            meta = json.loads(scan.metadata_json)
            if "progress" in meta:
                progress = int(meta["progress"])
            if "step" in meta:
                step = str(meta["step"])
    except Exception:
        pass

    return ScanStatusOut(
        id=scan.id,
        project_id=scan.project_id,
        status=scan.status,
        progress=progress,
        step=step,
        total_findings=scan.total_findings,
        error_message=scan.error_message,
        started_at=scan.started_at,
        completed_at=scan.completed_at,
    )


@router.get("/scans/{scan_id}", response_model=ScanOut)
def get_scan(
    scan_id: int,
    firebase_uid: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(firebase_uid, db)
    return _get_scan(scan_id, user, db)


@router.get("/scans/{scan_id}/findings", response_model=PaginatedFindingsOut)
def get_scan_findings(
    scan_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    page: int | None = Query(None),
    page_size: int | None = Query(None),
    severity: str | None = Query(None),
    algorithm: str | None = Query(None),
    firebase_uid: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(firebase_uid, db)
    scan = _get_scan(scan_id, user, db)

    actual_limit = page_size or limit
    actual_skip = ((page - 1) * actual_limit) if page and page > 0 else skip

    q = db.query(CryptoFinding).filter(CryptoFinding.scan_id == scan.id)
    if severity and severity.upper() != "ALL":
        q = q.filter(CryptoFinding.severity == severity.upper())
    if algorithm:
        q = q.filter(CryptoFinding.algorithm.ilike(f"%{algorithm}%"))

    total = q.count()
    items = q.order_by(CryptoFinding.severity.desc(), CryptoFinding.id.asc()).offset(actual_skip).limit(actual_limit).all()

    return {
        "items": items,
        "total": total,
        "page": (actual_skip // actual_limit) + 1 if actual_limit > 0 else 1,
        "page_size": actual_limit,
    }


@router.get("/projects/{project_id}/findings", response_model=PaginatedFindingsOut)
def get_project_findings(
    project_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    page: int | None = Query(None),
    page_size: int | None = Query(None),
    severity: str | None = Query(None),
    algorithm: str | None = Query(None),
    firebase_uid: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_scan_findings(
        scan_id=project_id,
        skip=skip,
        limit=limit,
        page=page,
        page_size=page_size,
        severity=severity,
        algorithm=algorithm,
        firebase_uid=firebase_uid,
        db=db,
    )


class SnippetAnalysisRequest(BaseModel):
    code: str
    language: str = "python"


@router.post("/scans/analyze-snippet")
def analyze_snippet(body: SnippetAnalysisRequest):
    """Analyze arbitrary in-memory source code snippet for cryptographic calls."""
    import ast
    from app.services.discovery.python_scanner import _CryptoVisitor
    from app.services.risk.engine import compute_risk

    code = body.code or ""
    try:
        tree = ast.parse(code, filename="snippet.py")
        visitor = _CryptoVisitor("snippet.py")
        visitor.visit(tree)
        findings = visitor.findings
    except SyntaxError as e:
        return {"success": False, "error": f"Syntax error: {e}", "findings": []}
    except Exception as e:
        return {"success": False, "error": str(e), "findings": []}

    results = []
    for f in findings:
        risk = compute_risk(f)
        results.append({
            "algorithm": f.get("algorithm", "Unknown"),
            "operation": f.get("operation", "crypto"),
            "line_number": f.get("line_number", 1),
            "library": f.get("library", ""),
            "evidence": f.get("evidence", ""),
            "severity": f.get("severity", "MEDIUM"),
            "quantum_safe": f.get("quantum_safe", False),
            "nist_status": f.get("nist_status", "unknown"),
            "recommendation": f.get("recommendation", ""),
            "risk_score": risk["risk_score"],
            "risk_level": risk["risk_level"],
            "explanation": risk["explanation"],
        })

    return {
        "success": True,
        "total_detected": len(results),
        "findings": results,
    }
