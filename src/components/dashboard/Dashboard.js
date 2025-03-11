import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiDatabase,
  FiUsers,
  FiActivity,
  FiAlertCircle,
  FiSun,
  FiMoon,
  FiPieChart,
  FiShare2,
  FiClock,
  FiEdit,
  FiLogOut,
  FiAlertTriangle,
  FiCheckCircle,
  FiUserPlus,
  FiPlus,
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { db, rtdb } from '../../firebase/config';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  addDoc,
} from 'firebase/firestore';
import { ref, onValue, set } from 'firebase/database';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { setNodes, setEdges, setCurrentSchemaId, setSchemaName } from '../../store/schemaSlice';

const COLORS = ['#4D55CC', '#7a73d1', '#b5a8d5', '#211c84'];

export default function Dashboard() {
  const [darkMode, setDarkMode] = useState(false);
  const [stats, setStats] = useState({
    totalSchemas: 0,
    sharedSchemas: 0,
    totalTables: 0,
    totalRelationships: 0,
  });
  const [activities, setActivities] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [logs, setLogs] = useState([]);
  const [errorLogs, setErrorLogs] = useState([]);
  const [saveLogs, setSaveLogs] = useState([]);
  const [activityData, setActivityData] = useState([]);
  const [showErrorLogs, setShowErrorLogs] = useState(false);
  const { currentUser, logout } = useAuth();
  const dispatch = useDispatch();
  const { currentSchemaId } = useSelector((state) => state.schema);
  const navigate = useNavigate();

  // Fetch schema statistics
  useEffect(() => {
    if (!currentUser) return;

    const schemasRef = collection(db, 'schemas');
    const q = query(schemasRef, where('userId', '==', currentUser.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let totalTables = 0;
      let totalRelationships = 0;
      let sharedCount = 0;

      snapshot.docs.forEach((doc) => {
        const schema = doc.data();
        totalTables += schema.nodes?.length || 0;
        totalRelationships += schema.edges?.length || 0;
        if (schema.collaborators?.length > 0) {
          sharedCount++;
        }
      });

      setStats({
        totalSchemas: snapshot.size,
        sharedSchemas: sharedCount,
        totalTables,
        totalRelationships,
      });
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Fetch activity logs
  useEffect(() => {
    if (!currentUser) return;

    const logsRef = collection(db, 'logs');
    const q = query(
      logsRef,
      where('userId', '==', currentUser.uid),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newLogs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setLogs(newLogs);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Track live collaborators
  useEffect(() => {
    if (!currentUser) return;

    const activeUsersRef = ref(rtdb, 'activeUsers');
    const unsubscribe = onValue(activeUsersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const activeCollaborators = Object.values(data).filter(
          (user) => user.id !== currentUser.uid
        );
        setCollaborators(activeCollaborators);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Fetch error and save logs
  useEffect(() => {
    if (!currentUser) return;

    const logsRef = collection(db, 'logs');
    const errorQuery = query(
      logsRef,
      where('userId', '==', currentUser.uid),
      where('type', '==', 'error'),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    const saveQuery = query(
      logsRef,
      where('userId', '==', currentUser.uid),
      where('type', '==', 'save'),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    const unsubscribeErrors = onSnapshot(errorQuery, (snapshot) => {
      const newErrors = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setErrorLogs(newErrors);
    });

    const unsubscribeSaves = onSnapshot(saveQuery, (snapshot) => {
      const newSaves = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSaveLogs(newSaves);
    });

    return () => {
      unsubscribeErrors();
      unsubscribeSaves();
    };
  }, [currentUser]);

  // Track activity data for charts
  useEffect(() => {
    if (!currentUser) return;

    const activityRef = collection(db, 'activity');
    const q = query(
      activityRef,
      where('userId', '==', currentUser.uid),
      orderBy('timestamp', 'desc'),
      limit(7)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const data = snapshot.docs.map((doc) => ({
          date: new Date(doc.data().timestamp).toLocaleDateString(),
          actions: doc.data().actions || 0,
        }));
        setActivityData(data.reverse());
      } catch (error) {
        console.error('Error processing activity data:', error);
        // Provide default data if there's an error
        setActivityData([
          { date: new Date().toLocaleDateString(), actions: 0 }
        ]);
      }
    }, (error) => {
      console.error('Error fetching activity data:', error);
      // Provide default data on error
      setActivityData([
        { date: new Date().toLocaleDateString(), actions: 0 }
      ]);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      toast.error('Failed to log out');
    }
  };

  const handleCreateNewSchema = async () => {
    try {
      // Create a new schema document in Firestore
      const schemaData = {
        userId: currentUser.uid,
        name: 'Untitled Schema',
        nodes: [],
        edges: [],
        lastModified: new Date().toISOString(),
        lastModifiedBy: currentUser.uid,
        collaborators: [],
      };

      const docRef = await addDoc(collection(db, 'schemas'), schemaData);

      // Initialize real-time data
      await set(ref(rtdb, `schemas/${currentUser.uid}/${docRef.id}`), schemaData);

      // Update Redux state
      dispatch(setNodes([]));
      dispatch(setEdges([]));
      dispatch(setCurrentSchemaId(docRef.id));
      dispatch(setSchemaName('Untitled Schema'));

      // Navigate to schema builder
      navigate('/schema-builder', { state: { schema: { id: docRef.id } } });
    } catch (error) {
      console.error('Error creating new schema:', error);
      toast.error('Failed to create new schema');
    }
  };

  const handleEditSchema = (schema) => {
    dispatch(setNodes(schema.nodes || []));
    dispatch(setEdges(schema.edges || []));
    dispatch(setCurrentSchemaId(schema.id));
    dispatch(setSchemaName(schema.name || 'Untitled Schema'));
    navigate('/schema-builder');
  };

  // Add a function to log activity without requiring an index
  const logActivity = async (action) => {
    if (!currentUser) return;

    try {
      await addDoc(collection(db, 'activity'), {
        userId: currentUser.uid,
        timestamp: new Date().toISOString(),
        action,
        schemaId: currentSchemaId || null
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  const StatCard = ({ icon: Icon, title, value, color }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{title}</p>
          <h3 className="text-3xl font-bold text-[#211c84] dark:text-white mt-2">
            {value}
          </h3>
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header with Create Schema Button */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-[#211c84] dark:text-white">
                Dashboard
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                Welcome back, {currentUser?.email}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleCreateNewSchema}
                className="flex items-center px-4 py-2 bg-[#4D55CC] text-white rounded-lg hover:bg-[#211c84] transition-colors"
              >
                <FiPlus className="mr-2" />
                New Schema
              </button>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg"
              >
                {darkMode ? (
                  <FiSun className="w-5 h-5 text-yellow-500" />
                ) : (
                  <FiMoon className="w-5 h-5 text-gray-500" />
                )}
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                <FiLogOut className="mr-2" />
                Logout
              </button>
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              icon={FiDatabase}
              title="Total Schemas"
              value={stats.totalSchemas}
              color="bg-blue-500"
            />
            <StatCard
              icon={FiShare2}
              title="Shared Schemas"
              value={stats.sharedSchemas}
              color="bg-green-500"
            />
            <StatCard
              icon={FiPieChart}
              title="Total Tables"
              value={stats.totalTables}
              color="bg-purple-500"
            />
            <StatCard
              icon={FiActivity}
              title="Relationships"
              value={stats.totalRelationships}
              color="bg-red-500"
            />
          </div>

          {/* Enhanced Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Activity Timeline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
            >
              <h2 className="text-xl font-semibold text-[#211c84] dark:text-white mb-4">
                Activity Timeline
              </h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="actions"
                      stroke="#4D55CC"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Schema Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
            >
              <h2 className="text-xl font-semibold text-[#211c84] dark:text-white mb-4">
                Schema Distribution
              </h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Active', value: stats.totalSchemas },
                        { name: 'Shared', value: stats.sharedSchemas },
                        { name: 'Tables', value: stats.totalTables },
                        { name: 'Relations', value: stats.totalRelationships },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          {/* Logs Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Error Logs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-[#211c84] dark:text-white">
                  Error Logs
                </h2>
                <button
                  onClick={() => setShowErrorLogs(!showErrorLogs)}
                  className="text-gray-500 hover:text-[#4D55CC]"
                >
                  {showErrorLogs ? 'Hide' : 'Show'}
                </button>
              </div>
              {showErrorLogs && (
                <div className="space-y-3">
                  {errorLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start space-x-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg"
                    >
                      <FiAlertTriangle className="text-red-500 mt-1" />
                      <div>
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {log.message}
                        </p>
                        <p className="text-xs text-red-400">
                          {new Date(log.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Save Logs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
            >
              <h2 className="text-xl font-semibold text-[#211c84] dark:text-white mb-4">
                Recent Saves
              </h2>
              <div className="space-y-3">
                {saveLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
                  >
                    <FiCheckCircle className="text-green-500 mt-1" />
                    <div>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        {log.message}
                      </p>
                      <p className="text-xs text-green-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Live Collaboration Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
          >
            <h2 className="text-xl font-semibold text-[#211c84] dark:text-white mb-4">
              Live Collaboration
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {collaborators.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-[#4D55CC] flex items-center justify-center text-white">
                      {user.email[0].toUpperCase()}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-white dark:border-gray-800" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      {user.email}
                    </p>
                    <p className="text-xs text-gray-400">
                      {user.action || 'Viewing'} {user.schemaName}
                    </p>
                  </div>
                </div>
              ))}
              <button
                onClick={() => navigate('/schema-builder')}
                className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-[#4D55CC] dark:hover:border-[#4D55CC] transition-colors"
              >
                <FiUserPlus className="w-6 h-6 text-gray-400" />
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
} 