import React from 'react';

const VMTable = ({ vms, onSort, onAssign }) => {
  const renderSortArrow = (field) => {
    // Implementation for sort arrow
  };

  return (
    <table className="min-w-full bg-white">
      <thead>
        <tr>
          <th className="py-2 px-4 border-b cursor-pointer" onClick={() => onSort('name')}>
            Name {renderSortArrow('name')}
          </th>
          <th className="py-2 px-4 border-b">IP Address</th>
          <th className="py-2 px-4 border-b cursor-pointer" onClick={() => onSort('status')}>
            Status {renderSortArrow('status')}
          </th>
          <th className="py-2 px-4 border-b">Assigned To</th>
          <th className="py-2 px-4 border-b">Actions</th>
        </tr>
      </thead>
      <tbody>
        {vms && vms.map((vm) => (
          <tr key={vm.id}>
            <td className="py-2 px-4 border-b">{vm.name}</td>
            <td className="py-2 px-4 border-b">{vm.ip_address}</td>
            <td className="py-2 px-4 border-b">{vm.status}</td>
            <td className="py-2 px-4 border-b">
              {vm.assigned_to ? `${vm.assigned_to.name} (${vm.assigned_to.email})` : 'Unassigned'}
            </td>
            <td className="py-2 px-4 border-b">
              <button
                onClick={() => onAssign(vm)}
                className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
              >
                {vm.assigned_to ? 'Reassign' : 'Assign'}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default VMTable;
