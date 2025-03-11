import { useState, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Panel,
  addEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  FiPlus,
  FiSave,
  FiTrash2,
  FiZoomIn,
  FiZoomOut,
  FiRotateCcw,
  FiRotateCw,
  FiUsers,
  FiDownload,
  FiHome,
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import TableNode from './TableNode';
import { useAuth } from '../../contexts/AuthContext';
import { db, rtdb } from '../../firebase/config';
import { ref, onValue, set, get } from 'firebase/database';
import { collection, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
import ExportModal from './ExportModal';
import toast from 'react-hot-toast';

const nodeTypes = {
  tableNode: TableNode,
};

export default function SchemaBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [schemaName, setSchemaName] = useState('Untitled Schema');
  const [currentSchemaId, setCurrentSchemaId] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [collaborators, setCollaborators] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [zoom, setZoom] = useState(1);
  
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Load schema from Firebase on mount or when schema ID changes
  useEffect(() => {
    const loadSchema = async () => {
      if (!currentUser) return;

      try {
        let schemaId = location.state?.schema?.id || currentSchemaId;
        
        if (schemaId) {
          // First try to get real-time data
          const realtimeRef = ref(rtdb, `schemas/${currentUser.uid}/${schemaId}`);
          const snapshot = await get(realtimeRef);
          
          if (snapshot.exists()) {
            const schemaData = snapshot.val();
            setNodes(Array.isArray(schemaData.nodes) ? schemaData.nodes : []);
            setEdges(Array.isArray(schemaData.edges) ? schemaData.edges : []);
            setSchemaName(schemaData.name || 'Untitled Schema');
            setCurrentSchemaId(schemaId);
          } else {
            // Fallback to Firestore
            const schemaDoc = await getDoc(doc(db, 'schemas', schemaId));
            if (schemaDoc.exists()) {
              const schemaData = schemaDoc.data();
              setNodes(Array.isArray(schemaData.nodes) ? schemaData.nodes : []);
              setEdges(Array.isArray(schemaData.edges) ? schemaData.edges : []);
              setSchemaName(schemaData.name || 'Untitled Schema');
              setCurrentSchemaId(schemaId);

              // Initialize real-time data
              await set(realtimeRef, {
                ...schemaData,
                nodes: Array.isArray(schemaData.nodes) ? schemaData.nodes : [],
                edges: Array.isArray(schemaData.edges) ? schemaData.edges : [],
                lastModified: new Date().toISOString(),
                lastModifiedBy: currentUser.uid,
              });
            }
          }
        }
      } catch (error) {
        console.error('Error loading schema:', error);
        toast.error('Failed to load schema');
      }
    };

    loadSchema();
  }, [currentUser, location.state, currentSchemaId]);

  // Auto-save changes to Firebase
  useEffect(() => {
    const autoSave = async () => {
      if (!currentUser || !currentSchemaId || isSaving) return;

      try {
        setIsSaving(true);
        const schemaData = {
          userId: currentUser.uid,
          name: schemaName,
          nodes,
          edges,
          lastModified: new Date().toISOString(),
          lastModifiedBy: currentUser.uid,
        };

        // Save to Realtime Database for real-time updates
        await set(ref(rtdb, `schemas/${currentUser.uid}/${currentSchemaId}`), schemaData);

        // Save to Firestore for persistence
        await updateDoc(doc(db, 'schemas', currentSchemaId), schemaData);

        // Log the save
        await addDoc(collection(db, 'logs'), {
          userId: currentUser.uid,
          type: 'save',
          schemaId: currentSchemaId,
          timestamp: new Date().toISOString(),
          message: `Schema "${schemaName}" saved successfully`,
        });
      } catch (error) {
        console.error('Error auto-saving schema:', error);
        await addDoc(collection(db, 'logs'), {
          userId: currentUser.uid,
          type: 'error',
          schemaId: currentSchemaId,
          timestamp: new Date().toISOString(),
          message: `Failed to save schema: ${error.message}`,
        });
      } finally {
        setIsSaving(false);
      }
    };

    const timeoutId = setTimeout(autoSave, 2000);
    return () => clearTimeout(timeoutId);
  }, [nodes, edges, schemaName, currentUser, currentSchemaId, isSaving]);

  const handleTableNameChange = useCallback((nodeId, newName) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, label: newName } }
          : node
      )
    );
  }, []);

  const handleAddNewTable = useCallback(() => {
    const newNode = {
      id: `table-${nodes.length + 1}`,
      type: 'tableNode',
      position: {
        x: Math.random() * 500,
        y: Math.random() * 500,
      },
      data: {
        label: `Table ${nodes.length + 1}`,
        columns: [
          { name: 'id', type: 'integer', isPrimary: true },
          { name: 'created_at', type: 'timestamp', isPrimary: false },
        ],
      },
    };

    setNodes((nds) => [...nds, newNode]);
  }, [nodes]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  const onNodeClick = (event, node) => {
    setSelectedNode(node);
  };

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + 0.2, 4));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - 0.2, 0.1));
  }, []);

  return (
    <div className="h-screen flex">
      {/* Sidebar */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-64 bg-white border-r border-gray-200 p-4"
      >
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-[#211c84] mb-4 hover:text-[#4D55CC] transition-colors"
          >
            <FiHome className="mr-2" />
            Back to Dashboard
          </button>
          <input
            type="text"
            value={schemaName}
            onChange={(e) => setSchemaName(e.target.value)}
            className="w-full text-xl font-bold text-[#211c84] mb-4 px-2 py-1 border-b border-gray-200 focus:outline-none focus:border-[#4D55CC]"
          />
          <button
            onClick={handleAddNewTable}
            className="w-full flex items-center justify-center bg-[#4D55CC] text-white px-4 py-2 rounded-lg hover:bg-[#211c84] transition-colors duration-300 mb-2"
          >
            <FiPlus className="mr-2" />
            Add Table
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center justify-center bg-[#4D55CC] text-white px-4 py-2 rounded-lg hover:bg-[#211c84] transition-colors duration-300"
            >
              <FiDownload className="mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Selected Node Properties */}
        {selectedNode && (
          <div>
            <h3 className="text-lg font-semibold text-[#211c84] mb-2">
              Table Properties
            </h3>
            <div className="space-y-4">
              <input
                type="text"
                value={selectedNode.data.label}
                onChange={(e) => handleTableNameChange(selectedNode.id, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4D55CC]"
              />
              <button
                onClick={() => {
                  setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
                  setEdges((eds) => eds.filter(
                    (edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id
                  ));
                  setSelectedNode(null);
                }}
                className="w-full flex items-center justify-center bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors duration-300"
              >
                <FiTrash2 className="mr-2" />
                Delete Table
              </button>
            </div>
          </div>
        )}

        {/* Collaborators */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-[#211c84] mb-2 flex items-center">
            <FiUsers className="mr-2" />
            Collaborators
          </h3>
          <div className="space-y-2">
            {collaborators.map((user) => (
              <div
                key={user.id}
                className="flex items-center space-x-2 text-sm text-gray-600"
              >
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>{user.email}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Flow Canvas */}
      <div className="flex-1 h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          snapToGrid={true}
          snapGrid={[15, 15]}
          minZoom={0.1}
          maxZoom={4}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              switch (node.type) {
                case 'tableNode':
                  return '#4D55CC';
                default:
                  return '#fff';
              }
            }}
          />
          
          {/* Floating Toolbar */}
          <Panel position="top-center" className="bg-white rounded-lg shadow-lg p-2">
            <div className="flex space-x-2">
              <button
                onClick={handleZoomIn}
                className="p-2 text-gray-600 hover:text-[#4D55CC]"
                title="Zoom In"
              >
                <FiZoomIn />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-2 text-gray-600 hover:text-[#4D55CC]"
                title="Zoom Out"
              >
                <FiZoomOut />
              </button>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        nodes={nodes}
        edges={edges}
        schemaName={schemaName}
      />
    </div>
  );
} 