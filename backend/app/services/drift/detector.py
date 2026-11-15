"""Crypto drift detection between consecutive scans."""

from __future__ import annotations

from typing import Any
from sqlalchemy.orm import Session

from app.db.models.models import CryptoFinding, DriftEvent


def detect_drift(prev_scan_id: int, curr_scan_id: int, project_id: int, db: Session) -> list[DriftEvent]:
    """Compare previous scan findings with current scan findings and record drift events."""
    prev_findings = db.query(CryptoFinding).filter(CryptoFinding.scan_id == prev_scan_id).all()
    curr_findings = db.query(CryptoFinding).filter(CryptoFinding.scan_id == curr_scan_id).all()

    prev_algos = {f.algorithm for f in prev_findings}
    curr_algos = {f.algorithm for f in curr_findings}

    new_algos = curr_algos - prev_algos
    removed_algos = prev_algos - curr_algos

    events: list[DriftEvent] = []

    # Check for newly introduced algorithms
    for algo in new_algos:
        # Find sample finding
        sample = next((f for f in curr_findings if f.algorithm == algo), None)
        sev = sample.severity if sample else "MEDIUM"
        event = DriftEvent(
            project_id=project_id,
            previous_scan_id=prev_scan_id,
            current_scan_id=curr_scan_id,
            event_type="algorithm_added",
            description=f"New cryptographic algorithm detected: {algo} in {sample.file_path if sample else 'codebase'}",
            severity=sev,
        )
        db.add(event)
        events.append(event)

    # Check for removed algorithms
    for algo in removed_algos:
        event = DriftEvent(
            project_id=project_id,
            previous_scan_id=prev_scan_id,
            current_scan_id=curr_scan_id,
            event_type="algorithm_removed",
            description=f"Cryptographic algorithm no longer detected: {algo}",
            severity="LOW",
        )
        db.add(event)
        events.append(event)

    # Check for new high/critical findings on existing algorithms
    prev_by_algo_file = {(f.algorithm, f.file_path) for f in prev_findings}
    for f in curr_findings:
        if (f.algorithm, f.file_path) not in prev_by_algo_file and f.algorithm not in new_algos:
            event = DriftEvent(
                project_id=project_id,
                previous_scan_id=prev_scan_id,
                current_scan_id=curr_scan_id,
                event_type="new_location",
                description=f"Existing algorithm {f.algorithm} added in new location: {f.file_path}:{f.line_number}",
                severity=f.severity,
            )
            db.add(event)
            events.append(event)

    if events:
        db.commit()

    return events
