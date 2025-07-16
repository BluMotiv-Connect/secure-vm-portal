import React, { useEffect, useState } from 'react';
import { useAuth } from '@hooks/useAuth';
import LoadingSpinner from '../common/LoadingSpinner';
import VMUsageDetails from './VMUsageDetails';
import ProjectDistributionDetails from './ProjectDistributionDetails';
import TaskStatusDetails from './TaskStatusDetails';
import { employeeDashboardService } from '@services/employeeDashboardService';

const EmployeeProductivityDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    currentWeek: null,
    vmUsage: [],
    taskStats: null,
    projectTime: []
  });

  useEffect(() => {
    let mounted = true;
    let timeoutId = null;

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Add a small delay to prevent rapid successive calls
        await new Promise(resolve => {
          timeoutId = setTimeout(resolve, 100);
        });
        
        if (!mounted) return;
        
        // Fetch current week first as it's most important
        try {
          const currentWeek = await employeeDashboardService.getCurrentWeekOverview();
          if (!mounted) return;
          
          setDashboardData(prev => ({
            ...prev,
            currentWeek
          }));
        } catch (error) {
          console.warn('Failed to fetch current week data:', error.message);
        }

        // Fetch VM usage and task stats together with error handling
        try {
          const [vmUsage, taskStats] = await Promise.allSettled([
            employeeDashboardService.getVMUsagePatterns(30),
            employeeDashboardService.getTaskCompletionStats(30)
          ]);
          
          if (!mounted) return;

          setDashboardData(prev => ({
            ...prev,
            vmUsage: vmUsage.status === 'fulfilled' && Array.isArray(vmUsage.value) ? vmUsage.value : [],
            taskStats: taskStats.status === 'fulfilled' ? taskStats.value : null
          }));
        } catch (error) {
          console.warn('Failed to fetch VM/task data:', error.message);
        }

        // Finally fetch project time
        try {
          const projectTime = await employeeDashboardService.getProjectTimeDistribution(30);
          if (!mounted) return;

          setDashboardData(prev => ({
            ...prev,
            projectTime: Array.isArray(projectTime) ? projectTime : []
          }));
        } catch (error) {
          console.warn('Failed to fetch project time data:', error.message);
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        if (mounted) {
          setError(error.message || 'Failed to load dashboard data');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Only fetch if user exists and component is mounted
    if (user && mounted) {
      fetchDashboardData();
    }

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center max-w-lg">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { currentWeek } = dashboardData;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Your Productivity Dashboard</h1>
          <div className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleString()}
          </div>
        </div>
        

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* VM Usage */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">VM Usage Summary</h2>
            <VMUsageDetails />
          </div>


          {/* Project Distribution */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Distribution</h2>
            <ProjectDistributionDetails />
          </div>

          {/* Task Status */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Task Status</h2>
            <TaskStatusDetails />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeProductivityDashboard;
