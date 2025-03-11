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
        
        const schemas = querySnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
        
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
            color: node.data?.color || '#4D55CC',
            columns: node.type === 'tableNode' 
              ? (Array.isArray(node.data?.columns) 
                  ? node.data.columns.map(column => ({
                      name: column?.name || '',
                      type: column?.type || 'varchar',
                      isPrimary: Boolean(column?.isPrimary),
                      isForeignKey: Boolean(column?.isForeignKey),
                      referencedTable: column?.referencedTable || null,
                    }))
                  : [{ 
                      name: 'id', 
                      type: 'integer', 
                      isPrimary: true,
                      isForeignKey: false,
                      referencedTable: null 
                    }]
              )
              : [],
          },
          style: node.type === 'tableNode' 
            ? { ...node.style, backgroundColor: node.style?.backgroundColor || '#ffffff' }
            : node.style,
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
        label: `Color ${nodes.length + 1}`,
        color: '#4D55CC',
        onColorChange: (color) => {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === `color-${nodes.length + 1}`
                ? { ...node, data: { ...node.data, color } }
                : node.type === 'tableNode'
                ? { ...node, style: { ...node.style, backgroundColor: color } }
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

  const onConnect = useCallback((params) => {
    const sourceNode = nodes.find(node => node.id === params.source);
    const targetNode = nodes.find(node => node.id === params.target);

    if (sourceNode?.type === 'colorChooser' && targetNode?.type === 'tableNode') {
      const updatedNodes = nodes.map(node => {
        if (node.id === targetNode.id) {
          return {
            ...node,
            data: {
              ...node.data,
              borderColor: sourceNode.data.color
            }
          };
        }
        return node;
      });
      setNodes(updatedNodes);
    }

    setEdges((eds) => addEdge(params, eds));
  }, [nodes, setNodes]);

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

  // Update collaborators section
  const loadCollaborators = useCallback(async () => {
    if (!currentUser || !currentSchemaId) return;

    try {
      const schemaRef = doc(db, 'schemas', currentSchemaId);
      const schemaDoc = await getDoc(schemaRef);
      
      if (schemaDoc.exists()) {
        const collaboratorIds = schemaDoc.data().collaborators || [];
        const collaboratorData = await Promise.all(
          collaboratorIds.map(async (userId) => {
            const userDoc = await getDoc(doc(db, 'users', userId));
            return userDoc.exists() ? { id: userId, ...userDoc.data() } : null;
          })
        );
        
        setCollaborators(collaboratorData.filter(Boolean));
      }
    } catch (error) {
      console.error('Error loading collaborators:', error);
    }
  }, [currentUser, currentSchemaId]);

  useEffect(() => {
    loadCollaborators();
  }, [loadCollaborators]);

  return (
    <div className="flex h-screen">
      {/* Left Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FiDatabase className="text-indigo-600" />
            Schema Builder
          </h2>
          <div className="space-y-2">
            <button
              onClick={handleAddNewTable}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Add Table
            </button>
            <button
              onClick={handleAddColorChooser}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Add Color Chooser
            </button>
          </div>
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          fitView
        >
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              if (node.type === 'tableNode') {
                return node.data.borderColor || '#4D55CC';
              }
              return '#eee';
            }}
          />
          <Background />
        </ReactFlow>
      </div>

      {/* Right Sidebar */}
      <div className="w-64 bg-white border-l border-gray-200 p-4 overflow-y-auto">
        {selectedNode && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Node Properties</h3>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Label
                <input
                  type="text"
                  value={selectedNode.data.label || ''}
                  onChange={(e) => {
                    const updatedNodes = nodes.map((node) =>
                      node.id === selectedNode.id
                        ? { ...node, data: { ...node.data, label: e.target.value } }
                        : node
                    );
                    setNodes(updatedNodes);
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </label>
              {selectedNode.type === 'colorChooser' && (
                <label className="block text-sm font-medium text-gray-700">
                  Color
                  <input
                    type="color"
                    value={selectedNode.data.color || '#4D55CC'}
                    onChange={(e) => {
                      const updatedNodes = nodes.map((node) =>
                        node.id === selectedNode.id
                          ? { ...node, data: { ...node.data, color: e.target.value } }
                          : node
                      );
                      setNodes(updatedNodes);
                    }}
                    className="mt-1 block w-full h-8 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </label>
              )}
            </div>
          </div>
        )}
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Collaborators</h3>
          {collaborators.map((collaborator) => (
            <div
              key={collaborator.id}
              className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-md"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                {collaborator.name.charAt(0)}
              </div>
              <span className="text-sm">{collaborator.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 