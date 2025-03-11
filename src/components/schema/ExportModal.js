import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiDownload, FiCopy } from 'react-icons/fi';
import { generateSQL, generateJSON, downloadFile } from '../../utils/schemaExport';

export default function ExportModal({ isOpen, onClose, nodes, edges, schemaName }) {
  const [format, setFormat] = useState('sql');
  const [copied, setCopied] = useState(false);

  const getExportContent = () => {
    return format === 'sql' ? generateSQL(nodes, edges) : generateJSON(nodes, edges);
  };

  const handleDownload = () => {
    const content = getExportContent();
    const extension = format === 'sql' ? 'sql' : 'json';
    downloadFile(content, `${schemaName}.${extension}`);
  };

  const handleCopy = async () => {
    const content = getExportContent();
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-[#211c84]">Export Schema</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-center space-x-4 mb-4">
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4D55CC]"
            >
              <option value="sql">SQL</option>
              <option value="json">JSON</option>
            </select>
            <button
              onClick={handleDownload}
              className="flex items-center px-4 py-2 bg-[#4D55CC] text-white rounded-lg hover:bg-[#211c84] transition-colors"
            >
              <FiDownload className="mr-2" />
              Download
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center px-4 py-2 border border-[#4D55CC] text-[#4D55CC] rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FiCopy className="mr-2" />
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 h-96 overflow-auto">
            <pre className="text-sm font-mono whitespace-pre-wrap">
              {getExportContent()}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
} 