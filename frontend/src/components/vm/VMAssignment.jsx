import React from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { getUsers } from '../../services/userService';
import { assignVM, unassignVM } from '../../services/vmService';

const VMAssignment = ({ vm }) => {
  const queryClient = useQueryClient();
  const { data: users, isLoading, isError } = useQuery('users', getUsers);

  const assignMutation = useMutation(assignVM, {
    onSuccess: () => {
      queryClient.invalidateQueries('vms');
      queryClient.invalidateQueries(['vm', vm.id]);
    },
  });

  const unassignMutation = useMutation(unassignVM, {
    onSuccess: () => {
      queryClient.invalidateQueries('vms');
      queryClient.invalidateQueries(['vm', vm.id]);
    },
  });

  const handleAssign = (userId) => {
    assignMutation.mutate({ vmId: vm.id, userId });
  };

  const handleUnassign = () => {
    unassignMutation.mutate(vm.id);
  };

  if (isLoading) return <div>Loading users...</div>;
  if (isError) return <div>Error fetching users</div>;

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">VM Assignment</h3>
      {vm.assigned_to ? (
        <div className="flex items-center justify-between">
          <p>
            Assigned to: <strong>{vm.assigned_to.name}</strong> ({vm.assigned_to.email})
          </p>
          <button
            onClick={handleUnassign}
            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
          >
            Unassign
          </button>
        </div>
      ) : (
        <div>
          <p className="mb-2">Not assigned</p>
          <ul className="max-h-48 overflow-y-auto border rounded p-2">
            {users.map((user) => (
              <li key={user.id} className="flex justify-between items-center p-1">
                <span>{user.name} ({user.email})</span>
                <button
                  onClick={() => handleAssign(user.id)}
                  className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                >
                  Assign
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default VMAssignment;
