import React, { useEffect, useState } from 'react';
import { useApi } from '@hooks/useApi';
import { useAuth } from '@hooks/useAuth';
import VMCard from './VMCard';
import LoadingSpinner from '../common/LoadingSpinner';

const VMList = () => {
  const { user } = useAuth();
  const api = useApi();
  const [vms, setVMs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usageStats, setUsageStats] = useState({});

  useEffect(() => {
    const fetchVMsAndUsage = async () => {
      try {
        setLoading(true);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Fetch VMs and their usage stats
        const [vmsResponse, usageResponse] = await Promise.all([
          api.get('/virtual-machines'),
          api.get(`/vm/usage/user/${user.id}?days=30`)
        ]);

        const vmList = vmsResponse.data;
        const usageData = usageResponse.data;

        // Create a map of VM usage stats
        const usageMap = {};
        usageData.forEach(stat => {
          usageMap[stat.vmId] = {
            totalSessions: stat.totalSessions,
            totalHours: stat.totalHours,
            lastUsed: stat.lastUsed
          };
        });

        setVMs(vmList);
        setUsageStats(usageMap);
      } catch (error) {
        console.error('Error fetching VMs:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchVMsAndUsage();
    }
  }, [user]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {vms.map(vm => (
        <VMCard
          key={vm.id}
          vm={vm}
          usage={usageStats[vm.id] || {
            totalSessions: 0,
            totalHours: 0,
            lastUsed: null
          }}
        />
      ))}
    </div>
  );
};

export default VMList;

