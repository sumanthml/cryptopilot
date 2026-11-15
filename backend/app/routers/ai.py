"""AI router: POST /api/ai/ask with project finding contextualization."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.ai import ask_ai
from app.core.security import get_current_user, get_or_create_user
from app.db.database import get_db
from app.db.models.models import CryptoFinding, Project, Scan

router = APIRouter()


class AskRequest(BaseModel):
    question: str
    context: str = ""
    project_id: int | None = None


class AskResponse(BaseModel):
    answer: str
    provider: str
    project_context_attached: bool = False


@router.post("/ask", response_model=AskResponse)
async def ask_question(
    body: AskRequest,
    firebase_uid: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = get_or_create_user(firebase_uid, db)
    enhanced_context = body.context
    attached = False

    # If project_id provided, inject the latest scan findings of that project
    if body.project_id:
        project = (
            db.query(Project)
            .filter(Project.id == body.project_id, Project.owner_id == user.id)
            .first()
        )
        if project:
            latest_scan = (
                db.query(Scan)
                .filter(Scan.project_id == project.id, Scan.status == "completed")
                .order_by(Scan.started_at.desc())
                .first()
            )
            if latest_scan:
                findings = (
                    db.query(CryptoFinding)
                    .filter(CryptoFinding.scan_id == latest_scan.id)
                    .limit(20)
                    .all()
                )
                if findings:
                    attached = True
                    finding_summaries = [
                        f"- [{f.severity}] {f.algorithm} in {f.file_path}:{f.line_number} ({f.function_name}) -> {f.recommendation}"
                        for f in findings
                    ]
                    findings_text = "\n".join(finding_summaries)
                    enhanced_context += (
                        f"\n\nCURRENT USER PROJECT FINDINGS ({project.name}):\n"
                        f"Total findings: {len(findings)}\n"
                        f"{findings_text}\n"
                        f"Provide targeted refactoring diffs and NIST compliance advice for these exact findings."
                    )

    result = await ask_ai(body.question, enhanced_context)
    return AskResponse(
        answer=result["answer"],
        provider=result["provider"],
        project_context_attached=attached,
    )
