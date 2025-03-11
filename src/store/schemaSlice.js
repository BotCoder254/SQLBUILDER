import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  nodes: [],
  edges: [],
  currentSchemaId: null,
  schemaName: 'Untitled Schema',
  collaborators: [],
  history: [],
  historyIndex: -1,
  isSaving: false,
};

export const schemaSlice = createSlice({
  name: 'schema',
  initialState,
  reducers: {
    setNodes: (state, action) => {
      state.nodes = Array.isArray(action.payload) ? action.payload : [];
    },
    setEdges: (state, action) => {
      state.edges = Array.isArray(action.payload) ? action.payload : [];
    },
    setCurrentSchemaId: (state, action) => {
      state.currentSchemaId = action.payload;
    },
    setSchemaName: (state, action) => {
      state.schemaName = action.payload;
    },
    setCollaborators: (state, action) => {
      state.collaborators = Array.isArray(action.payload) ? action.payload : [];
    },
    addHistoryState: (state, action) => {
      state.history = [...state.history.slice(0, state.historyIndex + 1), action.payload];
      state.historyIndex += 1;
    },
    setHistoryIndex: (state, action) => {
      state.historyIndex = action.payload;
    },
    setIsSaving: (state, action) => {
      state.isSaving = action.payload;
    },
    updateTableName: (state, action) => {
      const { nodeId, newName } = action.payload;
      state.nodes = state.nodes.map(node =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, label: newName } }
          : node
      );
    },
    addNewTable: (state, action) => {
      const currentNodes = Array.isArray(state.nodes) ? state.nodes : [];
      state.nodes = [...currentNodes, action.payload];
    },
    deleteTable: (state, action) => {
      const nodeId = action.payload;
      const currentNodes = Array.isArray(state.nodes) ? state.nodes : [];
      const currentEdges = Array.isArray(state.edges) ? state.edges : [];
      
      state.nodes = currentNodes.filter(node => node.id !== nodeId);
      state.edges = currentEdges.filter(edge => 
        edge.source !== nodeId && edge.target !== nodeId
      );
    },
  },
});

export const {
  setNodes,
  setEdges,
  setCurrentSchemaId,
  setSchemaName,
  setCollaborators,
  addHistoryState,
  setHistoryIndex,
  setIsSaving,
  updateTableName,
  addNewTable,
  deleteTable,
} = schemaSlice.actions;

export default schemaSlice.reducer; 