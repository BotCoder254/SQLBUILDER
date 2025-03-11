import { Handle, Position } from 'reactflow';
import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FiDroplet } from 'react-icons/fi';

export default function ColorChooserNode({ data, isConnectable }) {
  const [color, setColor] = useState(data.color || '#4D55CC');

  const handleColorChange = useCallback((event) => {
    const newColor = event.target.value;
    setColor(newColor);
    data.color = newColor;
    if (data.onColorChange) {
      data.onColorChange(newColor);
    }
  }, [data]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-lg shadow-lg p-4"
      style={{ 
        borderWidth: '2px',
        borderStyle: 'solid',
        borderColor: color
      }}
    >
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: color }}
        isConnectable={isConnectable}
      />
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: color }}
        isConnectable={isConnectable}
      />
      
      <div className="flex flex-col items-center">
        <div className="flex items-center mb-2">
          <FiDroplet className="mr-2" style={{ color }} />
          <span className="text-sm font-medium text-gray-700">Color Picker</span>
        </div>
        <input
          type="color"
          value={color}
          onChange={handleColorChange}
          className="w-full h-8 cursor-pointer rounded border border-gray-300"
        />
        <div className="mt-2 text-xs text-gray-500">{color}</div>
      </div>
    </motion.div>
  );
} 