import { useState, useEffect } from 'react';
import { apiClient, checkBackendHealth } from '../services/api';
import { Activity, AlertTriangle, CheckCircle, Clock, Plus, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

interface Build {
  id: string;
  name: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  estimatedTime: number;
}

export function AppBuilder() {
  const [builds, setBuilds] = useState<Build[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Start as loading
  const [error, setError] = useState<string | null>(null);
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null);

  // Check backend connectivity on component mount
  useEffect(() => {
    const checkConnectivity = async () => {
      try {
        const isConnected = await checkBackendHealth();
        setBackendConnected(isConnected);
        
        // If not connected, use mock data immediately
        if (!isConnected) {
          console.log('Backend not connected, using mock data');
          useMockData();
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error checking backend health:', err);
        setBackendConnected(false);
        useMockData();
        setIsLoading(false);
      }
    };
    
    checkConnectivity();
  }, []); // Only run once on mount

  const fetchBuilds = async () => {
    if (isLoading && builds.length > 0) {
      // Don't fetch if we're already loading and have data
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Only try to fetch from the backend API if we're connected
      if (backendConnected) {
        console.log('Fetching builds from API...');
        const response = await apiClient.get('/v1/builds');
        
        if (response.data && response.data.success) {
          // If API call is successful, use the actual data
          const buildsData = response.data.data.builds.map((build: any) => ({
            id: build.id,
            name: build.config.appName,
            status: build.status,
            progress: build.progress,
            estimatedTime: build.estimatedTimeRemaining || 0
          }));
          
          setBuilds(buildsData);
          setBackendConnected(true);
        } else {
          // If API call returns an error, use mock data
          console.log('API returned an error, using mock data');
          useMockData();
        }
      } else {
        // If we know we're not connected, use mock data
        console.log('Using mock data (backend not connected)');
        useMockData();
      }
    } catch (err: any) {
      console.error('Error fetching builds:', err);
      
      // If API call fails, use mock data
      useMockData();
      
      if (err.response) {
        setError(`Failed to fetch builds: ${err.response.data?.error || err.message}`);
      } else if (err.request) {
        setError('Failed to connect to the server. Please check your connection.');
        setBackendConnected(false);
      } else {
        setError(`Error: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const useMockData = () => {
    console.log('Setting mock build data');
    // Mock data for development/testing
    setBuilds([
      {
        id: 'build-1',
        name: 'Mobile App v2.1.0',
        status: 'running',
        progress: 65,
        estimatedTime: 120
      },
      {
        id: 'build-2',
        name: 'Web Dashboard v1.5.3',
        status: 'queued',
        progress: 0,
        estimatedTime: 180
      },
      {
        id: 'build-3',
        name: 'API Gateway v3.0.0',
        status: 'completed',
        progress: 100,
        estimatedTime: 0
      },
      {
        id: 'build-4',
        name: 'Analytics Service v1.2.1',
        status: 'failed',
        progress: 45,
        estimatedTime: 0
      }
    ]);
  };

  // Separate useEffect for initial fetch
  useEffect(() => {
    // Only fetch if backend connectivity has been determined
    if (backendConnected !== null) {
      // If not connected to backend, we already have mock data from the first useEffect
      if (backendConnected) {
        fetchBuilds();
      }
    }
  }, [backendConnected]); // Only run when backendConnected changes

  // Separate useEffect for interval refresh
  useEffect(() => {
    // Only set up interval if connected to backend
    if (backendConnected === true) {
      const interval = setInterval(fetchBuilds, 10000);
      return () => clearInterval(interval);
    }
  }, [backendConnected]); // Only run when backendConnected changes

  const handleCreateBuild = async () => {
    if (!backendConnected) {
      alert('Cannot create build: Backend server is not connected.');
      return;
    }
    
    try {
      // In a real implementation, this would open a form to collect build details
      const buildConfig = {
        partnerId: 'demo_partner',
        config: {
          partnerName: 'Demo Partner',
          appName: 'Demo Money Transfer',
          packageName: 'com.demopartner.moneytransfer',
          primaryColor: '#1E3A8A',
          secondaryColor: '#F59E0B',
          features: {
            transactionHistory: true,
            customerSupport: true,
            pushNotifications: true,
            biometricLogin: true
          }
        }
      };
      
      const response = await apiClient.post('/v1/builds/create', buildConfig);
      
      if (response.data && response.data.success) {
        alert(`Build created successfully! Build ID: ${response.data.data.buildId}`);
        fetchBuilds();
      } else {
        alert('Failed to create build. Please try again.');
      }
    } catch (err: any) {
      console.error('Error creating build:', err);
      alert(`Failed to create build: ${err.response?.data?.error || err.message}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'running': return 'text-blue-600 bg-blue-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle size={16} />;
      case 'running': return <Activity size={16} />;
      case 'failed': return <AlertTriangle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">App Builder</h1>
        <div className="flex space-x-4">
          <button 
            onClick={fetchBuilds}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </button>
          <button 
            onClick={handleCreateBuild}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={backendConnected === false}
          >
            <Plus size={16} className="mr-2" />
            New Build
          </button>
        </div>
      </div>

      {backendConnected === false && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Backend Connectivity Issue</h3>
              <div className="mt-2 text-sm text-yellow-700">
                Could not connect to the backend server. Using mock data instead.
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading && builds.length === 0 && (
        <div className="text-center py-12">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
          <p className="text-gray-600">Loading builds...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading builds</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {!isLoading && builds.length === 0 && !error && (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-600 mb-4">No builds found. Create your first build to get started.</p>
          <button 
            onClick={handleCreateBuild}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={backendConnected === false}
          >
            <Plus size={16} className="mr-2" />
            Create Build
          </button>
        </div>
      )}

      {builds.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Build Queue</h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage and monitor your app builds
            </p>
          </div>
          <div className="divide-y divide-gray-200">
            {builds.map((build) => (
              <motion.div 
                key={build.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-full ${getStatusColor(build.status)}`}>
                    {getStatusIcon(build.status)}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{build.name}</h3>
                    <p className="text-sm text-gray-500">
                      {build.status === 'running' 
                        ? `${build.estimatedTime}s remaining` 
                        : build.status.charAt(0).toUpperCase() + build.status.slice(1)
                      }
                    </p>
                  </div>
                </div>
                
                {build.status === 'running' && (
                  <div className="w-64">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <motion.div
                        className="h-2 bg-blue-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${build.progress}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    <p className="text-xs text-right text-gray-500 mt-1">
                      {build.progress}%
                    </p>
                  </div>
                )}
                
                <div className="flex space-x-2">
                  <button className="text-sm text-blue-600 hover:text-blue-800">
                    Details
                  </button>
                  {build.status === 'completed' && (
                    <button className="text-sm text-green-600 hover:text-green-800">
                      Download
                    </button>
                  )}
                  {(build.status === 'queued' || build.status === 'running') && backendConnected && (
                    <button 
                      className="text-sm text-red-600 hover:text-red-800"
                      onClick={async () => {
                        if (confirm('Are you sure you want to cancel this build?')) {
                          try {
                            await apiClient.delete(`/v1/builds/${build.id}/cancel`);
                            fetchBuilds();
                          } catch (err) {
                            console.error('Error cancelling build:', err);
                            alert('Failed to cancel build');
                          }
                        }
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 