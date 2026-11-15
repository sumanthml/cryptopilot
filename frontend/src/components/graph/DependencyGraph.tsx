import React, { useState, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  NodeProps,
  EdgeProps,
  getBezierPath,
  Handle,
  Position,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Shield, Package, FileCode, Info } from 'lucide-react';
import type { GraphNode, GraphEdge, CryptoFinding } from '../../types';

// ─── Custom Node Types ──────────────────────────────────────────────────────

function AlgorithmNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`px-3 py-2 rounded-lg border min-w-[120px] ${
        selected
          ? 'bg-red-900/60 border-red-500'
          : 'bg-red-900/30 border-red-700'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-red-500" />
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-red-400 shrink-0" />
        <div>
          <div className="text-xs font-semibold text-red-300">{String(data.label)}</div>
          <div className="text-xs text-red-500">{String(data.operation || '')}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-red-500" />
    </div>
  );
}

function LibraryNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`px-3 py-2 rounded-lg border min-w-[120px] ${
        selected
          ? 'bg-indigo-900/60 border-indigo-500'
          : 'bg-indigo-900/30 border-indigo-700'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-indigo-500" />
      <div className="flex items-center gap-2">
        <Package className="w-4 h-4 text-indigo-400 shrink-0" />
        <div>
          <div className="text-xs font-semibold text-indigo-300">{String(data.label || 'Package')}</div>
          {data.version ? <div className="text-xs text-indigo-500">v{String(data.version)}</div> : null}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-indigo-500" />
    </div>
  );
}

function FileNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`px-3 py-2 rounded-lg border min-w-[150px] ${
        selected
          ? 'bg-green-900/60 border-green-500'
          : 'bg-green-900/30 border-green-700'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-green-500" />
      <div className="flex items-center gap-2">
        <FileCode className="w-4 h-4 text-green-400 shrink-0" />
        <div className="text-xs font-semibold text-green-300 truncate max-w-[120px]">
          {String(data.label)}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-green-500" />
    </div>
  );
}

// ─── Custom Edge Types ───────────────────────────────────────────────────────

function ConfirmedEdge({
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, markerEnd,
}: EdgeProps) {
  const [edgePath] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  return (
    <path
      d={edgePath}
      stroke="#6366f1"
      strokeWidth={2}
      fill="none"
      markerEnd={markerEnd}
    />
  );
}

function InferredEdge({
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, markerEnd,
}: EdgeProps) {
  const [edgePath] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  return (
    <path
      d={edgePath}
      stroke="#6b7280"
      strokeWidth={1.5}
      strokeDasharray="5,5"
      fill="none"
      markerEnd={markerEnd}
    />
  );
}

const nodeTypes = {
  algorithm: AlgorithmNode,
  library: LibraryNode,
  file: FileNode,
};

const edgeTypes = {
  confirmed: ConfirmedEdge,
  inferred: InferredEdge,
};

// ─── Simple dagre-like layout ────────────────────────────────────────────────

function layoutNodes(gnodes: GraphNode[]): Node[] {
  const layerMap: Record<string, number> = {
    file: 0,
    library: 1,
    algorithm: 2,
  };

  const layers: Record<number, GraphNode[]> = { 0: [], 1: [], 2: [] };
  gnodes.forEach((n) => {
    const layer = layerMap[n.type] ?? 1;
    layers[layer] = layers[layer] || [];
    layers[layer].push(n);
  });

  const nodes: Node[] = [];
  const layerYSpacing = 180;
  const nodeXSpacing = 200;

  Object.entries(layers).forEach(([layer, layerNodes]) => {
    layerNodes.forEach((n, idx) => {
      const x = idx * nodeXSpacing - ((layerNodes.length - 1) * nodeXSpacing) / 2;
      const y = parseInt(layer) * layerYSpacing;
      nodes.push({
        id: n.id,
        type: n.type,
        position: n.position || { x, y },
        data: { label: n.label, ...n.data },
      });
    });
  });

  return nodes;
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface DependencyGraphProps {
  graphNodes?: GraphNode[];
  graphEdges?: GraphEdge[];
  findings?: CryptoFinding[];
  className?: string;
}

export default function DependencyGraph({ graphNodes, graphEdges, findings, className }: DependencyGraphProps) {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Compute nodes and edges from findings if graphNodes not directly provided
  const resolvedNodes: GraphNode[] = useMemo(() => {
    if (graphNodes && graphNodes.length > 0) return graphNodes;
    if (!findings || findings.length === 0) return [];

    const fileMap = new Map<string, GraphNode>();
    const algoMap = new Map<string, GraphNode>();

    findings.forEach((f) => {
      const fileName = f.file_path ? f.file_path.split('\\').pop()?.split('/').pop() || f.file_path : 'source.py';
      const fileId = `file-${fileName}`;
      if (!fileMap.has(fileId)) {
        fileMap.set(fileId, {
          id: fileId,
          type: 'file',
          label: fileName,
          data: { label: fileName, path: f.file_path },
        });
      }

      const algoId = `algo-${f.algorithm}`;
      if (!algoMap.has(algoId)) {
        algoMap.set(algoId, {
          id: algoId,
          type: 'algorithm',
          label: f.algorithm,
          data: {
            label: f.algorithm,
            algorithm: f.algorithm,
            severity: f.severity,
            quantum_safe: f.quantum_safe,
            nist_status: f.nist_status,
          },
        });
      }
    });

    return [...Array.from(fileMap.values()), ...Array.from(algoMap.values())];
  }, [graphNodes, findings]);

  const resolvedEdges: GraphEdge[] = useMemo(() => {
    if (graphEdges && graphEdges.length > 0) return graphEdges;
    if (!findings || findings.length === 0) return [];

    const edgeSet = new Set<string>();
    const edges: GraphEdge[] = [];

    findings.forEach((f) => {
      const fileName = f.file_path ? f.file_path.split('\\').pop()?.split('/').pop() || f.file_path : 'source.py';
      const fileId = `file-${fileName}`;
      const algoId = `algo-${f.algorithm}`;
      const edgeKey = `${fileId}->${algoId}`;

      if (!edgeSet.has(edgeKey)) {
        edgeSet.add(edgeKey);
        edges.push({
          id: `e-${edgeKey}`,
          source: fileId,
          target: algoId,
          type: 'confirmed',
          label: f.operation || 'uses',
        });
      }
    });

    return edges;
  }, [graphEdges, findings]);

  const initialNodes = layoutNodes(resolvedNodes);
  const initialEdges: Edge[] = resolvedEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: e.type,
    label: e.label,
    markerEnd: { type: MarkerType.ArrowClosed, color: e.type === 'confirmed' ? '#6366f1' : '#6b7280' },
  }));

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  return (
    <div className={`relative bg-gray-900 rounded-xl border border-gray-700 ${className || 'h-96'}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={onNodeClick}
        fitView
        className="bg-gray-900"
        defaultEdgeOptions={{ type: 'confirmed' }}
      >
        <Background color="#374151" gap={20} />
        <Controls className="!bg-gray-800 !border-gray-700 !rounded-lg" />
        <MiniMap
          className="!bg-gray-800 !border-gray-700 !rounded-lg"
          nodeColor={(n) => {
            if (n.type === 'algorithm') return '#ef4444';
            if (n.type === 'library') return '#6366f1';
            return '#22c55e';
          }}
        />
      </ReactFlow>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 border border-gray-700 text-xs space-y-1.5">
        <div className="flex items-center gap-2 text-red-400">
          <Shield className="w-3 h-3" /> Algorithm
        </div>
        <div className="flex items-center gap-2 text-indigo-400">
          <Package className="w-3 h-3" /> Library
        </div>
        <div className="flex items-center gap-2 text-green-400">
          <FileCode className="w-3 h-3" /> File
        </div>
        <hr className="border-gray-600" />
        <div className="flex items-center gap-2 text-gray-400">
          <span className="w-6 border-t-2 border-indigo-500 inline-block" /> Confirmed
        </div>
        <div className="flex items-center gap-2 text-gray-400">
          <span className="w-6 border-t border-dashed border-gray-500 inline-block" /> Inferred
        </div>
      </div>

      {/* Node Detail Panel */}
      {selectedNode && (
        <div className="absolute top-4 right-4 bg-gray-800/95 backdrop-blur-sm rounded-lg p-4 border border-gray-700 w-56 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
              {String(selectedNode.type)} Detail
            </span>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-gray-500 hover:text-gray-300 text-lg leading-none"
            >×</button>
          </div>
          <div className="space-y-1 text-xs">
            {Object.entries(selectedNode.data).map(([k, v]) => (
              v != null && k !== 'label' && (
                <div key={k} className="flex justify-between gap-2">
                  <span className="text-gray-500 capitalize">{k}</span>
                  <span className="text-gray-200 text-right truncate max-w-[100px]">{String(v)}</span>
                </div>
              )
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
