import { Handle } from 'reactflow';
import { FiPlus, FiKey, FiTrash2, FiLink, FiMoreVertical } from 'react-icons/fi';
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TableNode({ data, isConnectable, id, onTableNameChange }) {
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnType, setNewColumnType] = useState('varchar');
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [isPrimaryKey, setIsPrimaryKey] = useState(false);
  const [isForeignKey, setIsForeignKey] = useState(false);
  const [referencedTable, setReferencedTable] = useState('');
  const [tableName, setTableName] = useState(data.label);

  const dataTypes = [
    'varchar',
    'integer',
    'text',
    'boolean',
    'timestamp',
    'float',
    'json',
    'uuid',
    'date',
    'time',
    'decimal',
    'bigint',
  ];

  const handleTableNameChange = (e) => {
    const newName = e.target.value;
    setTableName(newName);
    data.label = newName;
    if (onTableNameChange) {
      onTableNameChange(id, newName);
    }
  };

  const handleAddColumn = useCallback(() => {
    if (newColumnName.trim()) {
      const updatedColumns = [...data.columns, {
        name: newColumnName.trim(),
        type: newColumnType,
        isPrimary: isPrimaryKey,
        isForeignKey,
        referencedTable: isForeignKey ? referencedTable : undefined,
      }];
      
      data.columns = updatedColumns;
      
      setNewColumnName('');
      setIsPrimaryKey(false);
      setIsForeignKey(false);
      setReferencedTable('');
      setShowAddColumn(false);
    }
  }, [data, newColumnName, newColumnType, isPrimaryKey, isForeignKey, referencedTable]);

  const handleDeleteColumn = useCallback((index) => {
    const updatedColumns = [...data.columns];
    updatedColumns.splice(index, 1);
    data.columns = updatedColumns;
  }, [data]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-lg shadow-lg p-4 min-w-[250px]"
    >
      <Handle
        type="target"
        position="left"
        style={{ background: '#4D55CC' }}
        isConnectable={isConnectable}
      />
      <Handle
        type="source"
        position="right"
        style={{ background: '#4D55CC' }}
        isConnectable={isConnectable}
      />

      {/* Table Header */}
      <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-2">
        <input
          type="text"
          value={tableName}
          onChange={handleTableNameChange}
          className="font-bold text-[#211c84] text-lg bg-transparent border-none focus:outline-none focus:ring-0 w-full"
        />
        <div className="drag-handle cursor-move">
          <FiMoreVertical className="text-gray-400" />
        </div>
      </div>

      {/* Columns */}
      <div className="space-y-2">
        {data.columns.map((column, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center justify-between text-sm py-1 group hover:bg-gray-50 rounded px-2"
          >
            <div className="flex items-center space-x-2">
              {column.isPrimary && (
                <FiKey className="text-[#4D55CC]" title="Primary Key" />
              )}
              {column.isForeignKey && (
                <FiLink className="text-[#4D55CC]" title="Foreign Key" />
              )}
              <span className="font-medium">{column.name}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-600">{column.type}</span>
              <button
                onClick={() => handleDeleteColumn(index)}
                className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 transition-opacity"
                title="Delete Column"
              >
                <FiTrash2 size={14} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add Column Form */}
      <AnimatePresence>
        {showAddColumn ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 space-y-2"
          >
            <input
              type="text"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              placeholder="Column name"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#4D55CC]"
            />
            <select
              value={newColumnType}
              onChange={(e) => setNewColumnType(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#4D55CC]"
            >
              {dataTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={isPrimaryKey}
                  onChange={(e) => setIsPrimaryKey(e.target.checked)}
                  className="text-[#4D55CC] rounded focus:ring-[#4D55CC]"
                />
                <span>Primary Key</span>
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={isForeignKey}
                  onChange={(e) => setIsForeignKey(e.target.checked)}
                  className="text-[#4D55CC] rounded focus:ring-[#4D55CC]"
                />
                <span>Foreign Key</span>
              </label>
            </div>
            {isForeignKey && (
              <input
                type="text"
                value={referencedTable}
                onChange={(e) => setReferencedTable(e.target.value)}
                placeholder="Referenced table"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#4D55CC]"
              />
            )}
            <div className="flex space-x-2">
              <button
                onClick={handleAddColumn}
                className="flex-1 bg-[#4D55CC] text-white text-sm px-3 py-1 rounded hover:bg-[#211c84] transition-colors duration-300"
              >
                Add
              </button>
              <button
                onClick={() => setShowAddColumn(false)}
                className="flex-1 bg-gray-200 text-gray-700 text-sm px-3 py-1 rounded hover:bg-gray-300 transition-colors duration-300"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        ) : (
          <button
            onClick={() => setShowAddColumn(true)}
            className="mt-4 w-full flex items-center justify-center text-sm text-[#4D55CC] hover:text-[#211c84] transition-colors duration-300"
          >
            <FiPlus className="mr-1" />
            Add Column
          </button>
        )}
      </AnimatePresence>
    </motion.div>
  );
} 