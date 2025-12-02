import React from 'react';
import { MiniDB } from '../types';
import { loadSchema } from '../utils/localStorage';

interface RelationshipMapProps {
  db: MiniDB;
}

interface TableNode {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Relationship {
  from: string;
  to: string;
  field: string;
  refField: string;
}

export const RelationshipMap: React.FC<RelationshipMapProps> = ({ db }) => {
  const schema = loadSchema();
  const tables = Object.keys(db);

  // Build relationship graph
  const relationships: Relationship[] = [];
  const tableNodes: TableNode[] = [];
  
  // Calculate node positions in a grid
  const cols = Math.ceil(Math.sqrt(tables.length));
  const nodeWidth = 150;
  const nodeHeight = 80;
  const spacing = 200;

  tables.forEach((tableName, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    tableNodes.push({
      name: tableName,
      x: col * spacing + 100,
      y: row * spacing + 100,
      width: nodeWidth,
      height: nodeHeight,
    });

    // Find foreign keys
    const tableSchema = schema[tableName];
    if (tableSchema?.foreignKeys) {
      for (const fk of tableSchema.foreignKeys) {
        relationships.push({
          from: tableName,
          to: fk.references.table.toLowerCase(),
          field: fk.field,
          refField: fk.references.field,
        });
      }
    }
  });

  // Calculate SVG dimensions
  const maxX = Math.max(...tableNodes.map(n => n.x + n.width), 300);
  const maxY = Math.max(...tableNodes.map(n => n.y + n.height), 300);

  // Calculate arrow path
  const getArrowPath = (from: TableNode, to: TableNode): string => {
    // Calculate connection points
    const fromX = from.x + from.width / 2;
    const fromY = from.y + from.height / 2;
    const toX = to.x + to.width / 2;
    const toY = to.y + to.height / 2;

    // Calculate angle
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);

    // Arrow head size
    const arrowLength = 10;
    const arrowAngle = Math.PI / 6;

    // Calculate arrow head points
    const headX = toX - Math.cos(angle) * (to.width / 2 + 5);
    const headY = toY - Math.sin(angle) * (to.height / 2 + 5);

    const arrowX1 = headX - arrowLength * Math.cos(angle - arrowAngle);
    const arrowY1 = headY - arrowLength * Math.sin(angle - arrowAngle);
    const arrowX2 = headX - arrowLength * Math.cos(angle + arrowAngle);
    const arrowY2 = headY - arrowLength * Math.sin(angle + arrowAngle);

    // Create curved path
    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2;
    const controlX = midX + Math.sin(angle) * 30;
    const controlY = midY - Math.cos(angle) * 30;

    return `M ${fromX} ${fromY} Q ${controlX} ${controlY} ${headX} ${headY} L ${arrowX1} ${arrowY1} M ${headX} ${headY} L ${arrowX2} ${arrowY2}`;
  };

  if (tables.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <p className="text-lg">No tables in database</p>
          <p className="text-sm mt-2">Create tables to see relationships</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-4">
        <h2 className="text-2xl font-bold text-gray-800">Relationship Map</h2>
        <p className="text-sm text-gray-500 mt-1">
          Visual representation of foreign key relationships between tables
        </p>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded-lg shadow p-4">
          <svg
            width={maxX + 100}
            height={maxY + 100}
            className="border border-gray-200 rounded"
            style={{ minWidth: '100%', minHeight: '500px' }}
          >
            {/* Draw relationships (arrows) */}
            {relationships.map((rel, index) => {
              const fromNode = tableNodes.find(n => n.name === rel.from);
              const toNode = tableNodes.find(n => n.name === rel.to);
              if (!fromNode || !toNode) return null;

              return (
                <g key={`rel-${index}`}>
                  <path
                    d={getArrowPath(fromNode, toNode)}
                    stroke="#3b82f6"
                    strokeWidth="2"
                    fill="none"
                    markerEnd="url(#arrowhead)"
                  />
                  {/* Relationship label */}
                  <text
                    x={(fromNode.x + toNode.x) / 2}
                    y={(fromNode.y + toNode.y) / 2 - 10}
                    textAnchor="middle"
                    className="text-xs fill-gray-600"
                    fontSize="10"
                  >
                    {rel.field} → {rel.refField}
                  </text>
                </g>
              );
            })}

            {/* Arrow marker definition */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
              </marker>
            </defs>

            {/* Draw table nodes */}
            {tableNodes.map((node) => {
              const tableSchema = schema[node.name];
              const recordCount = db[node.name]?.length || 0;
              const hasPrimaryKey = !!tableSchema?.primaryKey;
              const foreignKeyCount = tableSchema?.foreignKeys?.length || 0;

              return (
                <g key={node.name}>
                  {/* Table box */}
                  <rect
                    x={node.x}
                    y={node.y}
                    width={node.width}
                    height={node.height}
                    fill="#ffffff"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    rx="4"
                  />
                  
                  {/* Table name */}
                  <text
                    x={node.x + node.width / 2}
                    y={node.y + 20}
                    textAnchor="middle"
                    className="font-semibold fill-gray-800"
                    fontSize="14"
                  >
                    {node.name}
                  </text>

                  {/* Primary key indicator */}
                  {hasPrimaryKey && (
                    <text
                      x={node.x + node.width / 2}
                      y={node.y + 38}
                      textAnchor="middle"
                      className="fill-blue-600"
                      fontSize="10"
                    >
                      🔑 PK: {tableSchema.primaryKey}
                    </text>
                  )}

                  {/* Record count */}
                  <text
                    x={node.x + node.width / 2}
                    y={node.y + 55}
                    textAnchor="middle"
                    className="fill-gray-600"
                    fontSize="10"
                  >
                    {recordCount} record(s)
                  </text>

                  {/* Foreign key count */}
                  {foreignKeyCount > 0 && (
                    <text
                      x={node.x + node.width / 2}
                      y={node.y + 70}
                      textAnchor="middle"
                      className="fill-orange-600"
                      fontSize="10"
                    >
                      {foreignKeyCount} FK(s)
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-600 bg-white rounded"></div>
              <span>Table</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-600">→</span>
              <span>Foreign Key Relationship</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-600">🔑</span>
              <span>Primary Key</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-orange-600">FK</span>
              <span>Foreign Key Count</span>
            </div>
          </div>

          {/* Relationship list */}
          {relationships.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Relationships:</h3>
              <div className="space-y-1">
                {relationships.map((rel, index) => (
                  <div key={index} className="text-sm text-gray-600">
                    <span className="font-medium">{rel.from}</span>
                    {' '}.<span className="text-blue-600">{rel.field}</span>
                    {' '}→{' '}
                    <span className="font-medium">{rel.to}</span>
                    {' '}.<span className="text-blue-600">{rel.refField}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {relationships.length === 0 && (
            <div className="mt-6 text-center text-gray-500 text-sm">
              No foreign key relationships defined
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

