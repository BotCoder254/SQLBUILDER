import { Handle, Position } from 'reactflow';
import { useState } from 'react';

export default function ColorChooserNode({ data, isConnectable }) {
  const [color, setColor] = useState(data.color || '#4D55CC');

  const handleColorChange = (event) => {
    const newColor = event.target.value;
    setColor(newColor);
    if (data.onColorChange) {
      data.onColorChange(newColor);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4" style={{ borderColor: color }}>
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="w-3 h-3"
      />
      <div className="flex flex-col items-center">
        <label className="text-sm font-medium text-gray-700 mb-2">Color Picker</label>
        <input
          type="color"
          value={color}
          onChange={handleColorChange}
          className="w-full h-8 cursor-pointer rounded border border-gray-300"
        />
        <div className="mt-2 text-xs text-gray-500">{color}</div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="w-3 h-3"
      />
    </div>
  );
} 