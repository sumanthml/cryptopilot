"""CycloneDX v1.6 Cryptographic Bill of Materials (CBOM) generator."""

from __future__ import annotations

import datetime
import uuid
from typing import Any


def generate_cbom(project_name: str, findings: list[dict[str, Any]]) -> dict[str, Any]:
    """Generate a CycloneDX v1.6 CBOM compliant JSON document."""
    bom_serial = f"urn:uuid:{uuid.uuid4()}"
    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()

    components = []
    dependencies = []

    # Root project component
    root_ref = f"pkg:generic/{project_name.lower().replace(' ', '-')}"
    root_component = {
        "bom-ref": root_ref,
        "type": "application",
        "name": project_name,
        "version": "1.0.0",
        "scope": "required",
    }
    components.append(root_component)
    root_depends_on = []

    for i, f in enumerate(findings):
        algo = f.get("algorithm", "UNKNOWN")
        op = f.get("operation", "unknown")
        lib = f.get("library", "stdlib")
        severity = f.get("severity", "MEDIUM")
        file_path = f.get("file_path", "")
        line_num = f.get("line_number", 1)
        quantum_safe = f.get("quantum_safe", False)
        nist_status = f.get("nist_status", "unknown")

        comp_ref = f"crypto:{algo.lower()}:{i}"
        root_depends_on.append(comp_ref)

        crypto_properties: dict[str, Any] = {
            "assetType": "algorithm",
            "algorithmProperties": {
                "primitive": op,
                "parameterSetIdentifier": algo,
                "executionEnvironment": "software-plain-text",
                "implementationPlatform": "platform-independent",
                "certificationLevel": ["none"],
                "cryptoFunctions": [op],
                "classicalSecurityLevel": 128 if algo in ("AES", "SHA256") else 80,
                "nistQuantumSecurityLevel": 1 if quantum_safe else 0,
            },
            "oid": f"1.3.6.1.4.1.{1000 + i}",
        }

        component: dict[str, Any] = {
            "bom-ref": comp_ref,
            "type": "cryptographic-asset",
            "name": algo,
            "version": "1.0",
            "description": f"Cryptographic {op} using {algo} ({lib})",
            "evidence": {
                "occurrences": [
                    {
                        "location": f"{file_path}#L{line_num}",
                    }
                ]
            },
            "cryptoProperties": crypto_properties,
            "properties": [
                {"name": "cryptopilot:library", "value": lib},
                {"name": "cryptopilot:severity", "value": severity},
                {"name": "cryptopilot:quantum_safe", "value": str(quantum_safe).lower()},
                {"name": "cryptopilot:nist_status", "value": nist_status},
                {"name": "cryptopilot:file", "value": file_path},
                {"name": "cryptopilot:line", "value": str(line_num)},
            ],
        }
        components.append(component)

    dependencies.append({
        "ref": root_ref,
        "dependsOn": root_depends_on,
    })

    return {
        "bomFormat": "CycloneDX",
        "specVersion": "1.6",
        "serialNumber": bom_serial,
        "version": 1,
        "metadata": {
            "timestamp": timestamp,
            "tools": {
                "components": [
                    {
                        "type": "application",
                        "name": "CryptoPilot",
                        "version": "1.0.0",
                        "vendor": "CryptoPilot Security",
                    }
                ]
            },
            "component": root_component,
        },
        "components": components,
        "dependencies": dependencies,
    }
