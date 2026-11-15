"""Projects router: CRUD + scan trigger."""

from __future__ import annotations

import json
import os
import shutil
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Request, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.security import get_current_user, get_or_create_user
from app.db.database import get_db
from app.db.models.models import AuditEvent, Project, Scan, User

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ProjectCreate(BaseModel):
    name: str
    description: str = ""
    source_type: str = "upload"
    source_path: str = ""
    language: str = "python"


class ProjectOut(BaseModel):
    id: int
    name: str
    description: str
    source_type: str
    source_path: str
    language: str
    is_demo: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_user(firebase_uid: str, db: Session) -> User:
    return get_or_create_user(firebase_uid, db)


def _get_project(project_id: int, user: User, db: Session) -> Project:
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.owner_id == user.id)
        .first()
    )
    if not project and user.firebase_uid == "demo-enterprise-admin":
        project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


def _audit(db: Session, user: User, project: Project, action: str, details: str) -> None:
    db.add(AuditEvent(
        project_id=project.id,
        user_id=user.id,
        action=action,
        actor=user.firebase_uid,
        details=details,
    ))


# ---------------------------------------------------------------------------
# Background scan task
# ---------------------------------------------------------------------------

def _run_scan(scan_id: int, project_source_path: str) -> None:
    """Background task: run python scanner and persist findings."""
    from app.db.database import SessionLocal
    from app.db.models.models import CryptoFinding, RiskAssessment, MigrationPlan
    from app.services.discovery.python_scanner import scan_directory
    from app.services.risk.engine import compute_risk

    db = SessionLocal()
    try:
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        if not scan:
            return
        scan.status = "running"
        scan.started_at = datetime.now(timezone.utc)
        scan.metadata_json = json.dumps({"progress": 15, "step": "Dissecting codebase file hierarchy..."})
        db.commit()

        try:
            scan.metadata_json = json.dumps({"progress": 40, "step": "Traversing Python AST nodes for cryptographic primitives..."})
            db.commit()
            findings = scan_directory(project_source_path)
        except Exception as exc:
            scan.status = "failed"
            scan.error_message = str(exc)
            scan.metadata_json = json.dumps({"progress": 100, "step": f"Scan failed: {str(exc)}"})
            scan.completed_at = datetime.now(timezone.utc)
            db.commit()
            return

        scan.metadata_json = json.dumps({"progress": 75, "step": f"Evaluating {len(findings)} detected calls against NIST SP 800-131A & PQC standards..."})
        db.commit()

        for f in findings:
            finding = CryptoFinding(
                scan_id=scan_id,
                algorithm=f.get("algorithm", "unknown"),
                operation=f.get("operation", "unknown"),
                file_path=f.get("file_path", ""),
                line_number=f.get("line_number", 0),
                function_name=f.get("function_name", ""),
                library=f.get("library", ""),
                detection_method=f.get("detection_method", "import"),
                confidence=f.get("confidence", 0.9),
                evidence=f.get("evidence", ""),
                severity=f.get("severity", "MEDIUM"),
                quantum_safe=f.get("quantum_safe", False),
                nist_status=f.get("nist_status", "unknown"),
                recommendation=f.get("recommendation", ""),
            )
            db.add(finding)
            db.flush()

            risk = compute_risk(f)
            db.add(RiskAssessment(
                scan_id=scan_id,
                finding_id=finding.id,
                risk_score=risk["risk_score"],
                risk_level=risk["risk_level"],
                explanation=risk["explanation"],
                factors_json=json.dumps(risk["factors"]),
            ))

        # Auto-synthesize migration plans for high/critical findings if project has none
        existing_plans_count = db.query(MigrationPlan).filter(MigrationPlan.project_id == scan.project_id).count()
        if existing_plans_count == 0:
            seen_algs = set()
            for finding in db.query(CryptoFinding).filter(CryptoFinding.scan_id == scan_id).all():
                if finding.severity in ("CRITICAL", "HIGH") and finding.algorithm not in seen_algs:
                    seen_algs.add(finding.algorithm)
                    target_alg = "SHA-256" if ("MD5" in finding.algorithm or "SHA1" in finding.algorithm) else ("AES-256-GCM" if ("DES" in finding.algorithm or "RC4" in finding.algorithm) else "ML-KEM-768 (FIPS 203)")
                    db.add(MigrationPlan(
                        project_id=scan.project_id,
                        finding_id=finding.id,
                        title=f"Migrate {finding.algorithm} to {target_alg}",
                        description=f"Modernize {finding.algorithm} in {finding.file_path}:{finding.line_number} to {target_alg} for post-quantum safety.",
                        from_algorithm=finding.algorithm,
                        to_algorithm=target_alg,
                        status="ready",
                        priority=finding.severity,
                        effort_estimate="1-3 days" if "RSA" in finding.algorithm else "2-4 hours",
                        patch_code=f"# Automated migration diff for {finding.file_path}\n# Replace legacy {finding.algorithm} with quantum-safe / NIST-approved {target_alg}\n- {finding.evidence}\n+ # Modernized replacement: {target_alg}\n",
                    ))

        scan.metadata_json = json.dumps({"progress": 95, "step": "Synthesizing explainable risk factors & CBOM inventory..."})
        db.commit()

        scan.status = "completed"
        scan.completed_at = datetime.now(timezone.utc)
        scan.total_findings = len(findings)
        scan.metadata_json = json.dumps({"progress": 100, "step": f"Scan completed. Found {len(findings)} cryptographic assets."})
        db.commit()
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/projects", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project(
    request: Request,
    firebase_uid: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(firebase_uid, db)
    content_type = request.headers.get("content-type", "")

    name = "Untitled Project"
    description = ""
    source_type = "upload"
    source_path = ""
    language = "python"
    upload_file: UploadFile | None = None

    if "multipart/form-data" in content_type:
        form = await request.form()
        name = str(form.get("name") or "Untitled Project")
        description = str(form.get("description") or "")
        source_path = str(form.get("source_path") or "")
        source_type = str(form.get("source_type") or ("local_path" if source_path else "upload"))
        language = str(form.get("language") or "python")
        f = form.get("file")
        if f and hasattr(f, "filename") and f.filename:
            upload_file = f
    else:
        try:
            body_json = await request.json()
            name = body_json.get("name", "Untitled Project")
            description = body_json.get("description", "")
            source_type = body_json.get("source_type", "upload")
            source_path = body_json.get("source_path", "")
            language = body_json.get("language", "python")
        except Exception:
            pass

    project = Project(
        owner_id=user.id,
        name=name,
        description=description,
        source_type=source_type,
        source_path=source_path,
        language=language,
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    # Handle file upload if provided
    if upload_file:
        upload_dir = Path("uploads") / f"project_{project.id}"
        upload_dir.mkdir(parents=True, exist_ok=True)
        saved_path = upload_dir / upload_file.filename
        content = await upload_file.read()
        saved_path.write_bytes(content)

        if upload_file.filename.endswith(".zip"):
            try:
                with zipfile.ZipFile(saved_path, "r") as zf:
                    zf.extractall(upload_dir)
                project.source_path = str(upload_dir.resolve())
            except Exception:
                project.source_path = str(upload_dir.resolve())
        else:
            project.source_path = str(upload_dir.resolve())

        project.source_type = "upload"
        db.commit()
        db.refresh(project)

    _audit(db, user, project, "project_created", f"Created project '{name}'")
    db.commit()
    return project


@router.get("/projects", response_model=list[ProjectOut])
def list_projects(
    firebase_uid: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(firebase_uid, db)
    return (
        db.query(Project)
        .filter(Project.owner_id == user.id)
        .order_by(Project.created_at.desc())
        .all()
    )


@router.post("/projects/sample-data", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
@router.post("/projects/sample", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def load_sample_project(
    firebase_uid: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Load or restore the sample enterprise financial project for the active user."""
    from app.db.seed import create_sample_project_for_user
    user = _get_user(firebase_uid, db)
    project = create_sample_project_for_user(user, db)
    _audit(db, user, project, "sample_loaded", f"Loaded sample project '{project.name}'")
    db.commit()
    return project


@router.delete("/projects/sample-data", status_code=status.HTTP_200_OK)
@router.delete("/projects/sample", status_code=status.HTTP_200_OK)
def remove_sample_project(
    firebase_uid: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove any sample demo project for the active user."""
    from app.db.seed import delete_sample_project_for_user
    user = _get_user(firebase_uid, db)
    delete_sample_project_for_user(user, db)
    return {"success": True, "message": "Sample data removed."}


@router.get("/projects/{project_id}", response_model=ProjectOut)
def get_project(
    project_id: int,
    firebase_uid: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(firebase_uid, db)
    return _get_project(project_id, user, db)


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    firebase_uid: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(firebase_uid, db)
    project = _get_project(project_id, user, db)
    db.delete(project)
    db.commit()


@router.post("/projects/{project_id}/scan", status_code=status.HTTP_202_ACCEPTED)
def trigger_scan(
    project_id: int,
    background_tasks: BackgroundTasks,
    firebase_uid: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(firebase_uid, db)
    project = _get_project(project_id, user, db)

    scan = Scan(project_id=project.id, status="pending")
    db.add(scan)
    db.commit()
    db.refresh(scan)

    _audit(db, user, project, "scan_triggered", f"Scan {scan.id} queued for project '{project.name}'")
    db.commit()

    background_tasks.add_task(_run_scan, scan.id, project.source_path)
    return {"scan_id": scan.id, "status": "pending", "project_id": project_id}



