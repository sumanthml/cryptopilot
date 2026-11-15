"""Graph builder for React Flow cryptographic dependency visualization."""

from __future__ import annotations

from typing import Any
import networkx as nx


def build_dependency_graph(findings: list[dict[str, Any]]) -> dict[str, Any]:
    """Build nodes and edges compatible with @xyflow/react."""
    g = nx.DiGraph()

    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []

    seen_nodes: set[str] = set()
    seen_edges: set[str] = set()

    for idx, f in enumerate(findings):
        algo = f.get("algorithm", "UNKNOWN")
        lib = f.get("library", "stdlib")
        file_path = f.get("file_path", "unknown.py")
        file_name = file_path.split("/")[-1].split("\\")[-1]
        severity = f.get("severity", "MEDIUM")
        op = f.get("operation", "crypto")

        algo_id = f"algo_{algo.lower().replace('-', '_')}"
        lib_id = f"lib_{lib.lower().replace('-', '_')}"
        file_id = f"file_{file_name.lower().replace('.', '_')}_{idx}"

        # Algorithm node
        if algo_id not in seen_nodes:
            seen_nodes.add(algo_id)
            nodes.append({
                "id": algo_id,
                "type": "algorithmNode",
                "data": {
                    "label": algo,
                    "operation": op,
                    "severity": severity,
                    "type": "algorithm",
                },
                "position": {"x": 100 + (len(seen_nodes) * 40) % 300, "y": 80 + (len(seen_nodes) * 50) % 250},
            })

        # Library node
        if lib_id not in seen_nodes:
            seen_nodes.add(lib_id)
            nodes.append({
                "id": lib_id,
                "type": "libraryNode",
                "data": {
                    "label": lib,
                    "type": "library",
                },
                "position": {"x": 350 + (len(seen_nodes) * 30) % 250, "y": 150 + (len(seen_nodes) * 40) % 200},
            })

        # File node
        if file_id not in seen_nodes:
            seen_nodes.add(file_id)
            nodes.append({
                "id": file_id,
                "type": "fileNode",
                "data": {
                    "label": file_name,
                    "path": file_path,
                    "type": "file",
                },
                "position": {"x": 600 + (len(seen_nodes) * 20) % 200, "y": 100 + (len(seen_nodes) * 45) % 300},
            })

        # Edge: algo -> lib (Confirmed)
        edge_algo_lib = f"e_{algo_id}_{lib_id}"
        if edge_algo_lib not in seen_edges:
            seen_edges.add(edge_algo_lib)
            edges.append({
                "id": edge_algo_lib,
                "source": algo_id,
                "target": lib_id,
                "label": "implemented_by",
                "type": "confirmed",
                "animated": severity in ("HIGH", "CRITICAL"),
            })

        # Edge: lib -> file (Confirmed)
        edge_lib_file = f"e_{lib_id}_{file_id}"
        if edge_lib_file not in seen_edges:
            seen_edges.add(edge_lib_file)
            edges.append({
                "id": edge_lib_file,
                "source": lib_id,
                "target": file_id,
                "label": "imported_in",
                "type": "confirmed",
            })

    return {"nodes": nodes, "edges": edges}
