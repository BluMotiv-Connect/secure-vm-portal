import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { getVMs } from '../../services/vmService';
import VMTable from '../tables/VMTable';
import VMAssignment from './VMAssignment';
import Modal from '../common/Modal';

const VirtualMachines = () => {
  const [filters, setFilters] = useState({
    limit: 10,
    offset: 0,
    sortBy: 'created_at',
    sortOrder: 'DESC',
    status: '',
    assigned: '',
  });
  const [selectedVm, setSelectedVm] = useState(null);

  const { data: vms, isLoading, isError, error } = useQuery(['vms', filters], () => getVMs(filters), {
    keepPreviousData: true,
  });

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value, offset: 0 });
  };

  const handleSort = (field) => {
    const order = filters.sortBy === field && filters.sortOrder === 'ASC' ? 'DESC' : 'ASC';
    setFilters({ ...filters, sortBy: field, sortOrder: order });
  };

  const handleAssignClick = (vm) => {
    setSelectedVm(vm);
  };

  const closeModal = () => {
    setSelectedVm(null);
  };

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Virtual Machines</h1>
      <div className="flex space-x-4 mb-4">
        <select name="status" value={filters.status} onChange={handleFilterChange} className="border p-2 rounded">
          <option value="">All Statuses</option>
          <option value="running">Running</option>
          <option value="stopped">Stopped</option>
          <option value="pending">Pending</option>
        </select>
        <select name="assigned" value={filters.assigned} onChange={handleFilterChange} className="border p-2 rounded">
          <option value="">All</option>
          <option value="true">Assigned</option>
          <option value="false">Unassigned</option>
        </select>
      </div>
      <VMTable vms={vms} onSort={handleSort} onAssign={handleAssignClick} />
      {selectedVm && (
        <Modal isOpen={!!selectedVm} onClose={closeModal}>
          <VMAssignment vm={selectedVm} />
        </Modal>
      )}
    </div>
  );
};

export default VirtualMachines;
