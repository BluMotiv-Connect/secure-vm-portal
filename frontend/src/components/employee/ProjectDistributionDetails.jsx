import React, { useEffect, useState } from 'react';
import { apiClient } from '../../services/apiClient';
import { CheckCircle, Clock, Target, BarChart3 } from 'lucide-react';

const ProjectDistributionDetails = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/employee/dashboard/project-details');
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

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Loading project data...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">Error loading project data: {error}</div>;
  }

  if (!data) {
    return <div className="p-4 text-center text-gray-500">No project data available</div>;
  }

  const formatTime = (minutes) => {
    if (!minutes) return '0m';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
          <Target className="h-6 w-6 text-purple-500 mb-2" />
          <span className="text-2xl font-bold text-gray-900">
            {data.activeProjects || 0}
          </span>
          <span className="text-sm text-gray-500">Active Projects</span>
        </div>
        <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
          <BarChart3 className="h-6 w-6 text-blue-500 mb-2" />
          <span className="text-2xl font-bold text-gray-900">
            {formatTime(data.totalWorkMinutes)}
          </span>
          <span className="text-sm text-gray-500">Total Time</span>
        </div>
        <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
          <Clock className="h-6 w-6 text-green-500 mb-2" />
          <span className="text-2xl font-bold text-gray-900">
            {formatTime(data.avgMinutesPerProject)}
          </span>
          <span className="text-sm text-gray-500">Avg per Project</span>
        </div>
      </div>

      {/* Project List */}
      <div className="space-y-4">
        {data.projects?.map((project) => (
          <div key={project.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-medium text-gray-900">{project.name}</h3>
                <p className="text-sm text-gray-500">{project.description}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                project.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {project.status}
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="mb-3">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Progress</span>
                <span>{project.completedTasks} / {project.totalTasks} tasks</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${(project.completedTasks / project.totalTasks) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Time Stats */}
            <div className="flex justify-between text-sm text-gray-600">
              <span>Time Spent: {formatTime(project.totalMinutes)}</span>
              <span>Last Active: {new Date(project.lastActive).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectDistributionDetails; 