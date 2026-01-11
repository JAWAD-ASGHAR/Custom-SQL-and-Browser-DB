import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { getAllTables } from '../database';

const nodeTypes = {
  table: ({ data }) => (
    <div className="bg-[#1e1e1e] border-2 border-[#3b82f6] rounded-lg shadow-lg" style={{ width: '220px' }}>
      {/* Connection handles on all sides */}
      <Handle type="source" position={Position.Top} style={{ background: '#8b5cf6' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#8b5cf6' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#8b5cf6' }} />
      <Handle type="source" position={Position.Left} style={{ background: '#8b5cf6' }} />
      <Handle type="target" position={Position.Top} style={{ background: '#10b981' }} />
      <Handle type="target" position={Position.Right} style={{ background: '#10b981' }} />
      <Handle type="target" position={Position.Bottom} style={{ background: '#10b981' }} />
      <Handle type="target" position={Position.Left} style={{ background: '#10b981' }} />
      
      <div className="bg-[#3b82f6] text-white px-4 py-2 font-semibold text-sm rounded-t-md">
        {data.label}
      </div>
      <div className="px-2 pt-2 pb-1 max-h-[300px] overflow-y-auto">
        <div className="space-y-1">
          {data.columns.map((col, idx) => (
            <div
              key={idx}
              className={`text-xs px-2 py-1 rounded ${
                col.isPrimary
                  ? 'bg-[#10b981] text-white font-semibold'
                  : col.isForeignKey
                  ? 'bg-[#8b5cf6] text-white'
                  : 'bg-[#2a2a2a] text-[#e0e0e0]'
              }`}
            >
              <span className="font-mono">
                {col.isPrimary && '🔑 '}
                {col.isForeignKey && '🔗 '}
                {col.name}
              </span>
              <span className="text-[#8b8b8b] ml-2 text-[10px]">
                {col.type}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
};

export default function RelationsDiagram({ onNodeClick, selectedTable, db }) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const tables = getAllTables();
    const tableNames = Object.keys(tables);
    
    if (tableNames.length === 0) {
      return { nodes: [], edges: [] };
    }

    const centerX = 600;
    const centerY = 500;
    const radius = Math.max(280, tableNames.length * 70);
    const angleStep = (2 * Math.PI) / tableNames.length;

    const nodes = tableNames.map((tableName, idx) => {
      const table = tables[tableName];
      const columns = Object.keys(table.schema.columns).map((colName) => {
        const isPrimary = colName === 'id';
        const isForeignKey = colName in table.schema.foreignKeys;
        return {
          name: colName,
          type: table.schema.columns[colName].type,
          isPrimary,
          isForeignKey,
        };
      });

      const angle = idx * angleStep - Math.PI / 2; 
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      return {
        id: tableName,
        type: 'table',
        position: { x, y },
        data: {
          label: tableName,
          columns,
        },
        width: 220,
        height: Math.min(400, 50 + columns.length * 28), 
        style: {
          background: selectedTable === tableName ? '#2a2a2a' : '#1e1e1e',
        },
      };
    });

    const edges = [];
    const edgeSet = new Set();

    tableNames.forEach((tableName) => {
      const table = tables[tableName];
      const foreignKeys = table.schema.foreignKeys || {};

      Object.keys(foreignKeys).forEach((fkColumn) => {
        const fk = foreignKeys[fkColumn];
        const [refTable] = fk.references.split('.');

        const edgeId = `${tableName}-${fkColumn}-${refTable}`;
        if (edgeSet.has(edgeId)) return;
        edgeSet.add(edgeId);

        if (tables[refTable]) {
          edges.push({
            id: edgeId,
            source: tableName,
            target: refTable,
            label: fkColumn,
            type: 'smoothstep',
            animated: true,
            style: {
              stroke: '#8b5cf6',
              strokeWidth: 2,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#8b5cf6',
              width: 20,
              height: 20,
            },
            labelStyle: {
              fill: '#8b5cf6',
              fontWeight: 600,
              fontSize: 11,
            },
            labelBgStyle: {
              fill: '#1e1e1e',
              fillOpacity: 0.8,
            },
            labelBgPadding: [4, 4],
            labelBgBorderRadius: 4,
          });
        }
      });
    });

    return { nodes, edges };
  }, [selectedTable, db]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onNodeClickHandler = useCallback(
    (event, node) => {
      if (onNodeClick) {
        onNodeClick(node.id);
      }
    },
    [onNodeClick]
  );

  if (initialNodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-[#1e1e1e]">
        <div className="text-center">
          <p className="text-[#8b8b8b] text-lg mb-2">No tables found</p>
          <p className="text-sm text-[#6b6b6b]">
            Create some tables to see the relationship diagram
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#1e1e1e]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClickHandler}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1.2, minZoom: 0.3 }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#8b5cf6', strokeWidth: 2 },
        }}
        connectionLineStyle={{ stroke: '#8b5cf6', strokeWidth: 2 }}
        attributionPosition="bottom-left"
        className="bg-[#1e1e1e]"
      >
        <Background color="#2a2a2a" gap={16} />
        <Controls className="bg-[#1a1a1a] border border-[#2a2a2a] [&_button]:bg-[#2a2a2a] [&_button]:text-white [&_button]:border-[#3a3a3a] [&_button:hover]:bg-[#3a3a3a]" />
        <MiniMap
          className="bg-[#1a1a1a] border border-[#2a2a2a]"
          nodeColor="#3b82f6"
          maskColor="rgba(0, 0, 0, 0.5)"
        />
      </ReactFlow>
    </div>
  );
}
