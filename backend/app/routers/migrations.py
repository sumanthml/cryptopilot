"""Migrations router: plan CRUD, experiment creation and results."""

from __future__ import annotations

import json
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.security import get_current_user, get_or_create_user
from app.db.database import get_db
from app.db.models.models import (
    BenchmarkResult,
    MigrationExperiment,
    MigrationPlan,
    Project,
    TestResult,
    User,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class MigrationPlanCreate(BaseModel):
    project_id: int
    finding_id: int | None = None
    title: str
    description: str = ""
    from_algorithm: str
    to_algorithm: str
    priority: str = "MEDIUM"
    effort_estimate: str = ""
    patch_code: str = ""


class MigrationPlanOut(BaseModel):
    id: int
    project_id: int
    finding_id: int | None
    title: str
    description: str
    from_algorithm: str
    to_algorithm: str
    status: str
    priority: str
    effort_estimate: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ExperimentCreate(BaseModel):
    patch_code: str = ""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_user(firebase_uid: str, db: Session) -> User:
    return get_or_create_user(firebase_uid, db)


def _get_plan(plan_id: int, user: User, db: Session) -> MigrationPlan:
    plan = (
        db.query(MigrationPlan)
        .join(Project, MigrationPlan.project_id == Project.id)
        .filter(MigrationPlan.id == plan_id, (Project.owner_id == user.id) | (Project.is_demo == True))
        .first()
    )
    if not plan:
        plan = db.query(MigrationPlan).filter(MigrationPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Migration plan not found")
    return plan


def _get_experiment(exp_id: int, user: User, db: Session) -> MigrationExperiment:
    exp = (
        db.query(MigrationExperiment)
        .join(MigrationPlan, MigrationExperiment.plan_id == MigrationPlan.id)
        .join(Project, MigrationPlan.project_id == Project.id)
        .filter(MigrationExperiment.id == exp_id, (Project.owner_id == user.id) | (Project.is_demo == True))
        .first()
    )
    if not exp:
        exp = db.query(MigrationExperiment).filter(MigrationExperiment.id == exp_id).first()
    if not exp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Experiment not found")
    return exp


# ---------------------------------------------------------------------------
# Background task
# ---------------------------------------------------------------------------

def _run_experiment(exp_id: int, patch_code: str) -> None:
    from app.db.database import SessionLocal
    from app.services.migration.lab import run_experiment

    db = SessionLocal()
    try:
        exp = db.query(MigrationExperiment).filter(MigrationExperiment.id == exp_id).first()
        if not exp:
            return
        exp.status = "running"
        db.commit()

        result = run_experiment(patch_code)

        exp.stdout = result.get("stdout", "")
        exp.stderr = result.get("stderr", "")
        exp.return_code = result.get("return_code", -1)
        exp.duration_seconds = result.get("duration_seconds", 0.0)
        exp.status = "passed" if result.get("return_code", -1) == 0 else "failed"
        exp.completed_at = datetime.now()

        for tr in result.get("test_results", []):
            db.add(TestResult(
                experiment_id=exp_id,
                test_name=tr["test_name"],
                outcome=tr["outcome"],
                duration_seconds=tr.get("duration_seconds", 0.0),
                message=tr.get("message", ""),
            ))

        for br in result.get("benchmark_results", []):
            db.add(BenchmarkResult(
                experiment_id=exp_id,
                phase=br.get("phase", "after"),
                metric=br["metric"],
                value=br["value"],
                unit=br.get("unit", "s"),
                environment=json.dumps(br.get("environment", {})),
            ))

        db.commit()
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/migrations", response_model=MigrationPlanOut, status_code=status.HTTP_201_CREATED)
def create_migration(
    body: MigrationPlanCreate,
    firebase_uid: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(firebase_uid, db)
    project = db.query(Project).filter(Project.id == body.project_id, Project.owner_id == user.id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    plan = MigrationPlan(
        project_id=body.project_id,
        finding_id=body.finding_id,
        title=body.title,
        description=body.description,
        from_algorithm=body.from_algorithm,
        to_algorithm=body.to_algorithm,
        priority=body.priority,
        effort_estimate=body.effort_estimate,
        patch_code=body.patch_code,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.get("/migrations/{plan_id}", response_model=MigrationPlanOut)
def get_migration(
    plan_id: int,
    firebase_uid: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(firebase_uid, db)
    return _get_plan(plan_id, user, db)


@router.get("/projects/{project_id}/migrations", response_model=list[MigrationPlanOut])
def list_project_migrations(
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
    return db.query(MigrationPlan).filter(MigrationPlan.project_id == project_id).all()


@router.post("/migrations/{plan_id}/experiment", status_code=status.HTTP_201_CREATED)
def create_experiment(
    plan_id: int,
    body: ExperimentCreate | None = None,
    firebase_uid: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(firebase_uid, db)
    plan = _get_plan(plan_id, user, db)
    patch_applied = (body.patch_code if body and body.patch_code else "") or plan.patch_code

    exp = MigrationExperiment(
        plan_id=plan.id,
        patch_applied=patch_applied,
    )
    db.add(exp)
    db.commit()
    db.refresh(exp)
    return {"experiment_id": exp.id, "status": "pending"}


@router.post("/experiments/{exp_id}/run", status_code=status.HTTP_202_ACCEPTED)
def run_experiment_endpoint(
    exp_id: int,
    background_tasks: BackgroundTasks,
    firebase_uid: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(firebase_uid, db)
    exp = _get_experiment(exp_id, user, db)
    background_tasks.add_task(_run_experiment, exp.id, exp.patch_applied)
    return {"experiment_id": exp_id, "status": "running"}


@router.get("/experiments/{exp_id}/results")
def get_experiment_results(
    exp_id: int,
    firebase_uid: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(firebase_uid, db)
    exp = _get_experiment(exp_id, user, db)

    test_results = db.query(TestResult).filter(TestResult.experiment_id == exp_id).all()
    bench_results = db.query(BenchmarkResult).filter(BenchmarkResult.experiment_id == exp_id).all()

    return {
        "experiment_id": exp_id,
        "status": exp.status,
        "return_code": exp.return_code,
        "duration_seconds": exp.duration_seconds,
        "stdout": exp.stdout,
        "stderr": exp.stderr,
        "test_results": [
            {
                "test_name": tr.test_name,
                "outcome": tr.outcome,
                "duration_seconds": tr.duration_seconds,
                "message": tr.message,
            }
            for tr in test_results
        ],
        "benchmark_results": [
            {
                "phase": br.phase,
                "metric": br.metric,
                "value": br.value,
                "unit": br.unit,
                "environment": json.loads(br.environment or "{}"),
            }
            for br in bench_results
        ],
    }
