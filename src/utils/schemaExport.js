export function generateSQL(nodes, edges) {
  let sql = '';

  // First pass: Create tables
  nodes.forEach((node) => {
    sql += `CREATE TABLE ${node.data.label} (\n`;
    const columns = node.data.columns.map((column) => {
      let columnDef = `  ${column.name} ${column.type.toUpperCase()}`;
      if (column.isPrimary) {
        columnDef += ' PRIMARY KEY';
      }
      return columnDef;
    });
    sql += columns.join(',\n');
    sql += '\n);\n\n';
  });

  // Second pass: Add foreign key constraints
  edges.forEach((edge) => {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);
    if (sourceNode && targetNode) {
      const sourceColumn = sourceNode.data.columns.find((c) => c.isForeignKey);
      if (sourceColumn) {
        sql += `ALTER TABLE ${sourceNode.data.label}\n`;
        sql += `ADD FOREIGN KEY (${sourceColumn.name}) REFERENCES ${targetNode.data.label}(id);\n\n`;
      }
    }
  });

  return sql;
}

export function generateJSON(nodes, edges) {
  const schema = {
    tables: nodes.map((node) => ({
      name: node.data.label,
      columns: node.data.columns.map((column) => ({
        name: column.name,
        type: column.type,
        isPrimary: column.isPrimary,
        isForeignKey: column.isForeignKey,
        referencedTable: column.referencedTable,
      })),
    })),
    relationships: edges.map((edge) => ({
      sourceTable: nodes.find((n) => n.id === edge.source)?.data.label,
      targetTable: nodes.find((n) => n.id === edge.target)?.data.label,
      type: 'many-to-one', // Default relationship type
    })),
  };

  return JSON.stringify(schema, null, 2);
}

export function downloadFile(content, filename) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
} 