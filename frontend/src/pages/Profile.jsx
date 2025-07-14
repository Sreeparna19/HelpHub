import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api/auth';

const Profile = () => {
  const { user } = useAuth();
  const [newRole, setNewRole] = useState(user?.role);
  const [roleLoading, setRoleLoading] = useState(false);

  const handleRoleChange = async () => {
    setRoleLoading(true);
    try {
      await authAPI.updateRole(newRole);
      window.location.reload(); // Or refresh user context if you have a method
    } catch (err) {
      alert('Failed to update role');
    } finally {
      setRoleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="mt-2 text-gray-600">
            Manage your account information and preferences
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center mb-6">
            <img
              src={user?.avatar?.url || 'https://via.placeholder.com/120'}
              alt={user?.name}
              className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg mx-auto"
            />
            <h2 className="mt-4 text-xl font-semibold text-gray-900">
              {user?.name}
            </h2>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 mt-2">
              {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={user?.name || ''}
                disabled
                className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={user?.phone || ''}
                disabled
                className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              {user?.role !== 'admin' ? (
                <div className="flex items-center space-x-2">
                  <select
                    value={newRole}
                    onChange={e => setNewRole(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
                  >
                    <option value="needy">Needy</option>
                    <option value="volunteer">Volunteer</option>
                  </select>
                  <button
                    onClick={handleRoleChange}
                    disabled={roleLoading || newRole === user?.role}
                    className="px-3 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 text-sm"
                  >
                    {roleLoading ? 'Updating...' : 'Update'}
                  </button>
                </div>
              ) : (
                <input
                  type="text"
                  value={user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1) || ''}
                  disabled
                  className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
                />
              )}
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Profile editing functionality will be available soon.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile; 