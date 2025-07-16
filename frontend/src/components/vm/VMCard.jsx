import React, { useEffect, useState } from 'react';
import { Card, Badge } from '../ui';
import { vmService } from '../../services/vmService';

const VMCard = ({ vm }) => {
  const [sessionStats, setSessionStats] = useState({
    totalSessions: 0,
    totalHours: 0,
    lastSessionTime: null
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const stats = await vmService.getSessionStats(vm.id);
        setSessionStats(stats);
      } catch (error) {
        console.error('Error fetching session stats:', error);
      }
    };
    fetchStats();
  }, [vm.id]);

  return (
    <Card className="p-4 mb-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold">{vm.name}</h3>
          <p className="text-gray-600">{vm.ipAddress}</p>
        </div>
        <Badge
          color={vm.status === 'online' ? 'green' : 'gray'}
          text={vm.status}
        />
      </div>
      
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-600">Total Sessions</p>
          <p className="text-lg font-semibold">{sessionStats.totalSessions}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Total Hours</p>
          <p className="text-lg font-semibold">{sessionStats.totalHours}</p>
        </div>
      </div>

      {sessionStats.lastSessionTime && (
        <div className="mt-4">
          <p className="text-sm text-gray-600">Last Used</p>
          <p className="text-base">
            {new Date(sessionStats.lastSessionTime).toLocaleDateString()}
          </p>
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          onClick={() => vmService.connect(vm.id)}
        >
          Connect
        </button>
      </div>
    </Card>
  );
};

export default VMCard;
