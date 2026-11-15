"""Full SQLAlchemy 2.0 ORM models for CryptoPilot with firebase_uid on User."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# User & settings
# ---------------------------------------------------------------------------

class User(Base):
    """Registered CryptoPilot user, identified by Firebase UID."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    firebase_uid: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String(128), default="", nullable=False)
    photo_url: Mapped[str] = mapped_column(String(512), default="", nullable=False)
    role: Mapped[str] = mapped_column(String(32), default="developer", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    settings: Mapped[UserSettings | None] = relationship(
        "UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    projects: Mapped[list[Project]] = relationship(
        "Project", back_populates="owner", cascade="all, delete-orphan"
    )


class UserSettings(Base):
    """Per-user preferences and optional AI configuration."""

    __tablename__ = "user_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    theme: Mapped[str] = mapped_column(String(16), default="dark", nullable=False)
    ai_provider: Mapped[str] = mapped_column(String(32), default="auto", nullable=False)
    groq_model: Mapped[str] = mapped_column(String(64), default="llama-3.3-70b-versatile", nullable=False)
    encrypted_groq_api_key: Mapped[str] = mapped_column(Text, default="", nullable=False)
    ollama_base_url: Mapped[str] = mapped_column(String(255), default="http://localhost:11434", nullable=False)
    ollama_model: Mapped[str] = mapped_column(String(64), default="llama3.2", nullable=False)
    auto_match_advisories: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    risk_weights_json: Mapped[str] = mapped_column(Text, default="{}", nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    user: Mapped[User] = relationship("User", back_populates="settings")


# ---------------------------------------------------------------------------
# Projects & Scans
# ---------------------------------------------------------------------------

class Project(Base):
    """A software project registered by a Firebase-authenticated user."""

    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    source_type: Mapped[str] = mapped_column(String(32), nullable=False)  # upload | local_demo | workspace
    source_path: Mapped[str] = mapped_column(String(512), default="", nullable=False)
    language: Mapped[str] = mapped_column(String(32), default="python", nullable=False)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    owner: Mapped[User] = relationship("User", back_populates="projects")
    scans: Mapped[list[Scan]] = relationship(
        "Scan", back_populates="project", cascade="all, delete-orphan", order_by="Scan.started_at.desc()"
    )
    dependencies: Mapped[list[Dependency]] = relationship(
        "Dependency", back_populates="project", cascade="all, delete-orphan"
    )
    migrations: Mapped[list[MigrationPlan]] = relationship(
        "MigrationPlan", back_populates="project", cascade="all, delete-orphan"
    )
    drift_events: Mapped[list[DriftEvent]] = relationship(
        "DriftEvent", back_populates="project", cascade="all, delete-orphan"
    )
    audit_events: Mapped[list[AuditEvent]] = relationship(
        "AuditEvent", back_populates="project", cascade="all, delete-orphan"
    )


class Scan(Base):
    """A single point-in-time cryptographic discovery scan of a project."""

    __tablename__ = "scans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)  # pending|running|completed|failed
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error_message: Mapped[str] = mapped_column(Text, default="", nullable=False)
    total_findings: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    scanner_version: Mapped[str] = mapped_column(String(32), default="1.0.0", nullable=False)
    metadata_json: Mapped[str] = mapped_column(Text, default="{}", nullable=False)

    project: Mapped[Project] = relationship("Project", back_populates="scans")
    findings: Mapped[list[CryptoFinding]] = relationship(
        "CryptoFinding", back_populates="scan", cascade="all, delete-orphan"
    )
    risk_assessments: Mapped[list[RiskAssessment]] = relationship(
        "RiskAssessment", back_populates="scan", cascade="all, delete-orphan"
    )


class CryptoFinding(Base):
    """A single cryptographic usage detected in scanned source code."""

    __tablename__ = "crypto_findings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    scan_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("scans.id", ondelete="CASCADE"), nullable=False, index=True
    )
    algorithm: Mapped[str] = mapped_column(String(64), nullable=False)
    operation: Mapped[str] = mapped_column(String(64), nullable=False)  # hash|encrypt|sign|verify|derive|random
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    line_number: Mapped[int] = mapped_column(Integer, nullable=False)
    function_name: Mapped[str] = mapped_column(String(128), nullable=False)
    library: Mapped[str] = mapped_column(String(64), nullable=False)
    detection_method: Mapped[str] = mapped_column(String(32), nullable=False)  # import|call|string|attr
    confidence: Mapped[float] = mapped_column(Float, default=0.9, nullable=False)
    evidence: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(16), default="MEDIUM", nullable=False)  # LOW|MEDIUM|HIGH|CRITICAL
    status: Mapped[str] = mapped_column(String(32), default="open", nullable=False)  # open|acknowledged|mitigated|false_positive
    quantum_safe: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    nist_status: Mapped[str] = mapped_column(String(32), default="unknown", nullable=False)  # approved|deprecated|broken|unknown
    recommendation: Mapped[str] = mapped_column(Text, default="", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    scan: Mapped[Scan] = relationship("Scan", back_populates="findings")
    risk_assessment: Mapped[RiskAssessment | None] = relationship(
        "RiskAssessment", back_populates="finding", uselist=False
    )


# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------

class Dependency(Base):
    """A third-party library/package detected in a project."""

    __tablename__ = "dependencies"
    __table_args__ = (UniqueConstraint("project_id", "name", "version", name="uq_dep_project_name_version"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    version: Mapped[str] = mapped_column(String(64), default="", nullable=False)
    ecosystem: Mapped[str] = mapped_column(String(32), default="pypi", nullable=False)
    crypto_relevant: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    license: Mapped[str] = mapped_column(String(64), default="", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    project: Mapped[Project] = relationship("Project", back_populates="dependencies")
    relations_as_source: Mapped[list[DependencyRelation]] = relationship(
        "DependencyRelation",
        foreign_keys="[DependencyRelation.source_id]",
        back_populates="source",
        cascade="all, delete-orphan",
    )
    relations_as_target: Mapped[list[DependencyRelation]] = relationship(
        "DependencyRelation",
        foreign_keys="[DependencyRelation.target_id]",
        back_populates="target",
        cascade="all, delete-orphan",
    )


class DependencyRelation(Base):
    """Directed edge in the dependency graph (source depends on target)."""

    __tablename__ = "dependency_relations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    source_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("dependencies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    target_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("dependencies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    relation_type: Mapped[str] = mapped_column(String(32), default="depends_on", nullable=False)

    source: Mapped[Dependency] = relationship("Dependency", foreign_keys=[source_id], back_populates="relations_as_source")
    target: Mapped[Dependency] = relationship("Dependency", foreign_keys=[target_id], back_populates="relations_as_target")


# ---------------------------------------------------------------------------
# Risk Assessment
# ---------------------------------------------------------------------------

class RiskAssessment(Base):
    """Deterministic risk score computed for a CryptoFinding in a Scan."""

    __tablename__ = "risk_assessments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    scan_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("scans.id", ondelete="CASCADE"), nullable=False, index=True
    )
    finding_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("crypto_findings.id", ondelete="CASCADE"), nullable=True, index=True
    )
    risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(16), nullable=False)  # LOW|MEDIUM|HIGH|CRITICAL
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    factors_json: Mapped[str] = mapped_column(Text, default="{}", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    scan: Mapped[Scan] = relationship("Scan", back_populates="risk_assessments")
    finding: Mapped[CryptoFinding | None] = relationship("CryptoFinding", back_populates="risk_assessment")


# ---------------------------------------------------------------------------
# Migration Plans & Experiments
# ---------------------------------------------------------------------------

class MigrationPlan(Base):
    """A planned migration from a vulnerable/deprecated crypto primitive."""

    __tablename__ = "migration_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    finding_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("crypto_findings.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    from_algorithm: Mapped[str] = mapped_column(String(64), nullable=False)
    to_algorithm: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="draft", nullable=False)  # draft|in_progress|completed|abandoned
    priority: Mapped[str] = mapped_column(String(16), default="MEDIUM", nullable=False)
    effort_estimate: Mapped[str] = mapped_column(String(32), default="", nullable=False)
    patch_code: Mapped[str] = mapped_column(Text, default="", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    project: Mapped[Project] = relationship("Project", back_populates="migrations")
    experiments: Mapped[list[MigrationExperiment]] = relationship(
        "MigrationExperiment", back_populates="plan", cascade="all, delete-orphan"
    )


class MigrationExperiment(Base):
    """An isolated test run of a migration patch inside a sandbox."""

    __tablename__ = "migration_experiments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    plan_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("migration_plans.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)  # pending|running|passed|failed
    patch_applied: Mapped[str] = mapped_column(Text, default="", nullable=False)
    stdout: Mapped[str] = mapped_column(Text, default="", nullable=False)
    stderr: Mapped[str] = mapped_column(Text, default="", nullable=False)
    return_code: Mapped[int] = mapped_column(Integer, default=-1, nullable=False)
    duration_seconds: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    plan: Mapped[MigrationPlan] = relationship("MigrationPlan", back_populates="experiments")
    test_results: Mapped[list[TestResult]] = relationship(
        "TestResult", back_populates="experiment", cascade="all, delete-orphan"
    )
    benchmark_results: Mapped[list[BenchmarkResult]] = relationship(
        "BenchmarkResult", back_populates="experiment", cascade="all, delete-orphan"
    )


class TestResult(Base):
    """Individual pytest test outcome from a MigrationExperiment."""

    __tablename__ = "test_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    experiment_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("migration_experiments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    test_name: Mapped[str] = mapped_column(String(255), nullable=False)
    outcome: Mapped[str] = mapped_column(String(16), nullable=False)  # passed|failed|error|skipped
    duration_seconds: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    message: Mapped[str] = mapped_column(Text, default="", nullable=False)

    experiment: Mapped[MigrationExperiment] = relationship("MigrationExperiment", back_populates="test_results")


class BenchmarkResult(Base):
    """Performance benchmark metric from a MigrationExperiment (before or after)."""

    __tablename__ = "benchmark_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    experiment_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("migration_experiments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    phase: Mapped[str] = mapped_column(String(16), default="after", nullable=False)  # before | after
    metric: Mapped[str] = mapped_column(String(128), nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(32), nullable=False)
    environment: Mapped[str] = mapped_column(Text, nullable=False)  # JSON

    experiment: Mapped[MigrationExperiment] = relationship("MigrationExperiment", back_populates="benchmark_results")


# ---------------------------------------------------------------------------
# Advisories & Monitoring
# ---------------------------------------------------------------------------

class Advisory(Base):
    """Cryptographic advisory, deprecation notice, or CVE from external sources."""

    __tablename__ = "advisories"
    __table_args__ = (UniqueConstraint("source", "external_id", name="uq_advisory_source_external_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    source: Mapped[str] = mapped_column(String(64), nullable=False)  # NIST|CISA|OSV|GitHub|PyPI
    external_id: Mapped[str] = mapped_column(String(128), nullable=False)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    url: Mapped[str] = mapped_column(String(512), default="", nullable=False)
    severity: Mapped[str] = mapped_column(String(16), default="MEDIUM", nullable=False)
    standard_status: Mapped[str] = mapped_column(String(32), default="Advisory", nullable=False)
    affected_technology: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    published_at: Mapped[str] = mapped_column(String(64), default="", nullable=False)
    retrieved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="Active", nullable=False)
    summary: Mapped[str] = mapped_column(Text, default="", nullable=False)


class ProjectAdvisoryMatch(Base):
    """Links an Advisory to a user project and the matching finding or dependency."""

    __tablename__ = "project_advisory_matches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    advisory_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("advisories.id", ondelete="CASCADE"), nullable=False
    )
    matched_target: Mapped[str] = mapped_column(String(255), nullable=False)
    match_reason: Mapped[str] = mapped_column(Text, nullable=False)
    acknowledged: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    advisory: Mapped[Advisory] = relationship("Advisory")


# ---------------------------------------------------------------------------
# Drift & Audit
# ---------------------------------------------------------------------------

class DriftEvent(Base):
    """Cryptographic change detected between consecutive scans."""

    __tablename__ = "drift_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    previous_scan_id: Mapped[int] = mapped_column(Integer, ForeignKey("scans.id", ondelete="CASCADE"), nullable=False)
    current_scan_id: Mapped[int] = mapped_column(Integer, ForeignKey("scans.id", ondelete="CASCADE"), nullable=False)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)  # new_finding|removed_finding|severity_change|algorithm_change
    description: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(16), default="MEDIUM", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    project: Mapped[Project] = relationship("Project", back_populates="drift_events")


class AuditEvent(Base):
    """Immutable append-only audit log for every security and migration action."""

    __tablename__ = "audit_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True
    )
    user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    action: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    actor: Mapped[str] = mapped_column(String(128), nullable=False)
    details: Mapped[str] = mapped_column(Text, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    project: Mapped[Project | None] = relationship("Project", back_populates="audit_events")
