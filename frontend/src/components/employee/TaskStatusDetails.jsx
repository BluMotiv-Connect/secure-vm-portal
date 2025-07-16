import React, { useEffect, useState } from 'react';
import { apiClient } from '../../services/apiClient';
import { CheckCircle, Clock, AlertCircle, PlayCircle } from 'lucide-react';

const TaskStatusDetails = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/employee/dashboard/task-status');
        if (response?.data) {
          setData(response.data);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in-progress':
        return <PlayCircle className="h-5 w-5 text-blue-500" />;
      case 'blocked':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'blocked':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Loading task data...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">Error loading task data: {error}</div>;
  }

  if (!data) {
    return <div className="p-4 text-center text-gray-500">No task data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
          <Clock className="h-6 w-6 text-gray-400 mb-2" />
          <span className="text-2xl font-bold text-gray-900">
            {data.totalTasks || 0}
          </span>
          <span className="text-sm text-gray-500">Total Tasks</span>
        </div>
        <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
          <CheckCircle className="h-6 w-6 text-green-500 mb-2" />
          <span className="text-2xl font-bold text-gray-900">
            {data.completedTasks || 0}
          </span>
          <span className="text-sm text-gray-500">Completed</span>
        </div>
        <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
          <PlayCircle className="h-6 w-6 text-blue-500 mb-2" />
          <span className="text-2xl font-bold text-gray-900">
            {data.inProgressTasks || 0}
          </span>
          <span className="text-sm text-gray-500">In Progress</span>
        </div>
      </div>

      {/* Recent Tasks List */}
      <div className="space-y-2">
        {data.recentTasks?.map((task) => (
          <div key={task.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getStatusIcon(task.status)}
                <div>
                  <h3 className="font-medium text-gray-900">{task.task_name}</h3>
                  <p className="text-sm text-gray-500">{task.project_name}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                {task.status}
              </span>
            </div>
            {task.status_description && (
              <p className="mt-2 text-sm text-gray-600">{task.status_description}</p>
            )}
            <div className="mt-2 text-xs text-gray-500">
              Last updated: {new Date(task.updated_at).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskStatusDetails; 