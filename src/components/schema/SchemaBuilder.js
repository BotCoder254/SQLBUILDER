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
  updateEdge,
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
  FiGrid,
  FiLayers,
  FiCopy,
  FiDroplet,
  FiEdit2,
  FiDatabase,
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import TableNode from './TableNode';
import ColorChooserNode from './nodes/ColorChooserNode';
import { useAuth } from '../../contexts/AuthContext';
import { db, rtdb } from '../../firebase/config';
import { ref, onValue, set, get, remove } from 'firebase/database';
import { collection, addDoc, updateDoc, doc, getDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import ExportModal from './ExportModal';
import toast from 'react-hot-toast';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import { ref as rtdbRef } from 'firebase/database';

const nodeTypes = {
  tableNode: TableNode,
  colorChooser: ColorChooserNode,
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
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [userSchemas, setUserSchemas] = useState([]);
  
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { pushState, undo, redo, canUndo, canRedo } = useUndoRedo(nodes, edges);

  // Load user's schemas
  useEffect(() => {
    const loadUserSchemas = async () => {
      if (!currentUser) return;

      try {
        const schemasRef = collection(db, 'schemas');
        const q = query(schemasRef, where('userId', '==', currentUser.uid));
        const querySnapshot = await getDocs(q);
        
        const schemas = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setUserSchemas(schemas);
      } catch (error) {
        console.error('Error loading schemas:', error);
        toast.error('Failed to load schemas');
      }
    };

    loadUserSchemas();
  }, [currentUser]);

  // Load schema from Firebase on mount or when schema ID changes
  useEffect(() => {
    const loadSchema = async () => {
      if (!currentUser) return;

      try {
        let schemaId = location.state?.schema?.id || currentSchemaId;
        
        if (schemaId) {
          const realtimeRef = ref(rtdb, `schemas/${currentUser.uid}/${schemaId}`);
          const snapshot = await get(realtimeRef);
          
          if (snapshot.exists()) {
            const schemaData = snapshot.val();
            setNodes(Array.isArray(schemaData.nodes) ? schemaData.nodes : []);
            setEdges(Array.isArray(schemaData.edges) ? schemaData.edges : []);
            setSchemaName(schemaData.name || 'Untitled Schema');
            setCurrentSchemaId(schemaId);
          } else {
            const schemaDoc = await getDoc(doc(db, 'schemas', schemaId));
            if (schemaDoc.exists()) {
              const schemaData = schemaDoc.data();
              setNodes(Array.isArray(schemaData.nodes) ? schemaData.nodes : []);
              setEdges(Array.isArray(schemaData.edges) ? schemaData.edges : []);
              setSchemaName(schemaData.name || 'Untitled Schema');
              setCurrentSchemaId(schemaId);

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
        
        // Validate and clean nodes data
        const safeNodes = nodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            label: node.data?.label || 'Untitled',
            columns: Array.isArray(node.data?.columns) 
              ? node.data.columns.map(column => ({
                  name: column?.name || '',
                  type: column?.type || 'varchar',
                  isPrimary: Boolean(column?.isPrimary),
                  isForeignKey: Boolean(column?.isForeignKey),
                  referencedTable: column?.referencedTable || null,
                }))
              : node.type === 'tableNode' 
                ? [{ 
                    name: 'id', 
                    type: 'integer', 
                    isPrimary: true,
                    isForeignKey: false,
                    referencedTable: null 
                  }]
                : [],
            color: node.data?.color || '#4D55CC',
          },
        }));

        // Validate and clean edges data
        const safeEdges = edges.map(edge => ({
          id: edge.id || `edge-${Date.now()}`,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle || null,
          targetHandle: edge.targetHandle || null,
          type: edge.type || 'default',
          animated: edge.animated || false,
          style: edge.style || { stroke: '#4D55CC' },
        }));

        const schemaData = {
          userId: currentUser.uid,
          name: schemaName || 'Untitled Schema',
          nodes: safeNodes,
          edges: safeEdges,
          lastModified: new Date().toISOString(),
          lastModifiedBy: currentUser.uid,
        };

        await set(ref(rtdb, `schemas/${currentUser.uid}/${currentSchemaId}`), schemaData);
        await updateDoc(doc(db, 'schemas', currentSchemaId), schemaData);

        toast.success('Changes saved successfully', {
          duration: 2000,
          position: 'bottom-right',
        });

        pushState(safeNodes, safeEdges);
      } catch (error) {
        console.error('Error auto-saving schema:', error);
        toast.error('Failed to save changes', {
          duration: 3000,
          position: 'bottom-right',
        });
      } finally {
        setIsSaving(false);
      }
    };

    const timeoutId = setTimeout(autoSave, 2000);
    return () => clearTimeout(timeoutId);
  }, [nodes, edges, schemaName, currentUser, currentSchemaId, isSaving, pushState]);

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
          { 
            name: 'id', 
            type: 'integer', 
            isPrimary: true,
            isForeignKey: false,
            referencedTable: null
          },
          { 
            name: 'created_at', 
            type: 'timestamp', 
            isPrimary: false,
            isForeignKey: false,
            referencedTable: null
          },
        ],
      },
    };

    setNodes((nds) => [...nds, newNode]);
  }, [nodes]);

  const handleAddColorChooser = useCallback(() => {
    const newNode = {
      id: `color-${nodes.length + 1}`,
      type: 'colorChooser',
      position: {
        x: Math.random() * 500,
        y: Math.random() * 500,
      },
      data: {
        color: '#4D55CC',
        onColorChange: (color) => {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === `color-${nodes.length + 1}`
                ? { ...node, data: { ...node.data, color } }
                : node
            )
          );
        },
      },
    };

    setNodes((nds) => [...nds, newNode]);
  }, [nodes]);

  const handleDuplicateNode = useCallback(() => {
    if (!selectedNode) return;

    const newNode = {
      ...selectedNode,
      id: `${selectedNode.type}-${nodes.length + 1}`,
      position: {
        x: selectedNode.position.x + 50,
        y: selectedNode.position.y + 50,
      },
    };

    setNodes((nds) => [...nds, newNode]);
  }, [selectedNode, nodes]);

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

  const handleUndo = useCallback(() => {
    const prevState = undo();
    if (prevState) {
      setNodes(prevState.nodes);
      setEdges(prevState.edges);
    }
  }, [undo, setNodes, setEdges]);

  const handleRedo = useCallback(() => {
    const nextState = redo();
    if (nextState) {
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
    }
  }, [redo, setNodes, setEdges]);

  const handleDeleteSchema = useCallback(async (schemaId) => {
    if (!currentUser || !schemaId) return;
    
    try {
      // Delete from Firestore
      await deleteDoc(doc(db, 'schemas', schemaId));
      // Delete from Realtime Database
      await remove(ref(rtdb, `schemas/${currentUser.uid}/${schemaId}`));
      
      toast.success('Schema deleted successfully');
      navigate('/');
    } catch (error) {
      console.error('Error deleting schema:', error);
      toast.error('Failed to delete schema');
    }
  }, [currentUser, navigate]);

  const handleRenameSchema = useCallback(async (newName) => {
    if (!currentUser || !currentSchemaId) return;
    setSchemaName(newName);
  }, [currentUser, currentSchemaId]);

  const onEdgeUpdate = useCallback((oldEdge, newConnection) => {
    setEdges((els) => updateEdge(oldEdge, newConnection, els));
  }, [setEdges]);

  return (
    <div className="h-screen flex">
      {/* Sidebar */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col h-full overflow-y-auto"
      >
        {/* Header Section */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-[#211c84] mb-4 hover:text-[#4D55CC] transition-colors px-2 py-1 rounded-lg hover:bg-gray-50 w-full"
          >
            <FiHome className="mr-2" />
            Back to Dashboard
          </button>
          <div className="flex items-center justify-between mb-4 px-2">
            <input
              type="text"
              value={schemaName}
              onChange={(e) => handleRenameSchema(e.target.value)}
              className="w-full text-xl font-bold text-[#211c84] py-1 border-b border-gray-200 focus:outline-none focus:border-[#4D55CC] mr-2"
              placeholder="Schema Name"
            />
            {currentSchemaId && (
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this schema?')) {
                    handleDeleteSchema(currentSchemaId);
                  }
                }}
                className="text-red-500 hover:text-red-600 transition-colors p-1 rounded-lg hover:bg-red-50"
                title="Delete Schema"
              >
                <FiTrash2 />
              </button>
            )}
          </div>
        </div>

        {/* Actions Section */}
        <div className="space-y-2 mb-6">
          <button
            onClick={handleAddNewTable}
            className="w-full flex items-center justify-center bg-[#4D55CC] text-white px-4 py-2 rounded-lg hover:bg-[#211c84] transition-colors duration-300 shadow-sm"
          >
            <FiPlus className="mr-2" />
            Add Table
          </button>
          <button
            onClick={handleAddColorChooser}
            className="w-full flex items-center justify-center bg-[#4D55CC] text-white px-4 py-2 rounded-lg hover:bg-[#211c84] transition-colors duration-300 shadow-sm"
          >
            <FiDroplet className="mr-2" />
            Add Color Chooser
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            className="w-full flex items-center justify-center bg-[#4D55CC] text-white px-4 py-2 rounded-lg hover:bg-[#211c84] transition-colors duration-300 shadow-sm"
          >
            <FiDownload className="mr-2" />
            Export
          </button>
        </div>

        {/* Selected Node Properties */}
        {selectedNode && (
          <div className="mb-6 bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-[#211c84] mb-4 flex items-center">
              <FiEdit2 className="mr-2" />
              Node Properties
            </h3>
            <div className="space-y-4">
              <input
                type="text"
                value={selectedNode.data.label}
                onChange={(e) => handleTableNameChange(selectedNode.id, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4D55CC] bg-white"
              />
              <div className="flex space-x-2">
                <button
                  onClick={handleDuplicateNode}
                  className="flex-1 flex items-center justify-center bg-[#4D55CC] text-white px-4 py-2 rounded-lg hover:bg-[#211c84] transition-colors duration-300 shadow-sm"
                >
                  <FiCopy className="mr-2" />
                  Duplicate
                </button>
                <button
                  onClick={() => {
                    setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
                    setEdges((eds) => eds.filter(
                      (edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id
                    ));
                    setSelectedNode(null);
                  }}
                  className="flex-1 flex items-center justify-center bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors duration-300 shadow-sm"
                >
                  <FiTrash2 className="mr-2" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User's Schemas */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-[#211c84] mb-4 flex items-center px-2">
            <FiDatabase className="mr-2" />
            Your Schemas
          </h3>
          <div className="space-y-2">
            {userSchemas.map((schema) => (
              <button
                key={schema.id}
                onClick={() => navigate('/schema-builder', { state: { schema } })}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className="font-medium text-[#211c84] group-hover:text-[#4D55CC]">{schema.name}</div>
                <div className="text-xs text-gray-500">
                  Last modified: {new Date(schema.lastModified).toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Collaborators */}
        <div className="mt-auto">
          <h3 className="text-lg font-semibold text-[#211c84] mb-4 flex items-center px-2">
            <FiUsers className="mr-2" />
            Collaborators
          </h3>
          <div className="space-y-2">
            {collaborators.map((user) => (
              <div
                key={user.id}
                className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 rounded-lg bg-gray-50"
              >
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="truncate">{user.email}</span>
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
          onEdgeUpdate={onEdgeUpdate}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          snapToGrid={snapToGrid}
          snapGrid={[15, 15]}
          minZoom={0.1}
          maxZoom={4}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          {showGrid && <Background />}
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              switch (node.type) {
                case 'tableNode':
                  return '#4D55CC';
                case 'colorChooser':
                  return node.data.color;
                default:
                  return '#fff';
              }
            }}
          />
          
          {/* Floating Toolbar */}
          <Panel position="top-center" className="bg-white rounded-lg shadow-lg p-2">
            <div className="flex space-x-2">
              <button
                onClick={handleUndo}
                disabled={!canUndo}
                className="p-2 text-gray-600 hover:text-[#4D55CC] disabled:opacity-50"
                title="Undo"
              >
                <FiRotateCcw />
              </button>
              <button
                onClick={handleRedo}
                disabled={!canRedo}
                className="p-2 text-gray-600 hover:text-[#4D55CC] disabled:opacity-50"
                title="Redo"
              >
                <FiRotateCw />
              </button>
              <div className="w-px bg-gray-200" />
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
              <div className="w-px bg-gray-200" />
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`p-2 ${showGrid ? 'text-[#4D55CC]' : 'text-gray-600'} hover:text-[#4D55CC]`}
                title="Toggle Grid"
              >
                <FiGrid />
              </button>
              <button
                onClick={() => setSnapToGrid(!snapToGrid)}
                className={`p-2 ${snapToGrid ? 'text-[#4D55CC]' : 'text-gray-600'} hover:text-[#4D55CC]`}
                title="Toggle Snap to Grid"
              >
                <FiLayers />
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