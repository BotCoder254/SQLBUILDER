import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiPlus, FiEdit2, FiTrash2, FiFolder } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';

export default function SchemaDashboard() {
  const [schemas, setSchemas] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadSchemas();
  }, [currentUser]);

  const loadSchemas = async () => {
    if (!currentUser) return;

    try {
      const schemasRef = collection(db, 'schemas');
      const q = query(schemasRef, where('userId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      
      const loadedSchemas = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setSchemas(loadedSchemas);
    } catch (error) {
      console.error('Error loading schemas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (schemaId) => {
    if (!window.confirm('Are you sure you want to delete this schema?')) return;

    try {
      await deleteDoc(doc(db, 'schemas', schemaId));
      setSchemas(schemas.filter(schema => schema.id !== schemaId));
    } catch (error) {
      console.error('Error deleting schema:', error);
    }
  };

  const handleEdit = (schema) => {
    navigate('/schema-builder', { state: { schema } });
  };

  const handleCreate = () => {
    navigate('/schema-builder');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#211c84] to-[#b5a8d5] py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">My Schemas</h1>
          <button
            onClick={handleCreate}
            className="flex items-center bg-white text-[#211c84] px-4 py-2 rounded-lg hover:bg-[#7a73d1] hover:text-white transition-colors duration-300"
          >
            <FiPlus className="mr-2" />
            New Schema
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        ) : schemas.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center">
            <FiFolder className="mx-auto text-4xl text-[#4D55CC] mb-4" />
            <h2 className="text-xl font-semibold text-[#211c84] mb-2">No Schemas Yet</h2>
            <p className="text-gray-600 mb-4">Create your first schema to get started</p>
            <button
              onClick={handleCreate}
              className="bg-[#4D55CC] text-white px-6 py-2 rounded-lg hover:bg-[#211c84] transition-colors duration-300"
            >
              Create Schema
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {schemas.map((schema) => (
              <motion.div
                key={schema.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-lg p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold text-[#211c84]">{schema.name}</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(schema)}
                      className="text-[#4D55CC] hover:text-[#211c84] transition-colors"
                      title="Edit Schema"
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      onClick={() => handleDelete(schema.id)}
                      className="text-red-500 hover:text-red-600 transition-colors"
                      title="Delete Schema"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  Last modified: {new Date(schema.lastModified).toLocaleDateString()}
                </p>
                <div className="text-sm text-gray-500">
                  {schema.nodes?.length || 0} tables • {schema.edges?.length || 0} relationships
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 