import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../api/admin';
import { 
  Users, 
  Heart, 
  Shield, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Settings,
  UserCheck,
  Flag
} from 'lucide-react';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRequests: 0,
    pendingRequests: 0,
    completedRequests: 0,
    flaggedContent: 0,
    activeVolunteers: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getDashboardStats();
      const data = response.data.data;
      
      // Update stats
      setStats({
        totalUsers: data.overview?.totalUsers || 0,
        totalRequests: data.overview?.totalRequests || 0,
        pendingRequests: data.requestStats?.Pending || 0,
        completedRequests: data.requestStats?.Completed || 0,
        flaggedContent: 0, // This would come from flagged content API
        activeVolunteers: data.overview?.totalVolunteers || 0
      });

      // Update recent activity
      const activities = [];
      
      // Add recent requests
      if (data.recentActivity?.requests) {
        data.recentActivity.requests.forEach(request => {
          activities.push({
            id: request._id,
            type: 'request_created',
            message: `New help request: ${request.title}`,
            time: new Date(request.createdAt).toLocaleString(),
            icon: Heart,
            color: 'text-red-600'
          });
        });
      }

      // Add recent users
      if (data.recentActivity?.users) {
        data.recentActivity.users.forEach(user => {
          activities.push({
            id: user._id,
            type: 'user_registered',
            message: `New ${user.role} registered: ${user.name}`,
            time: new Date(user.createdAt).toLocaleString(),
            icon: Users,
            color: 'text-blue-600'
          });
        });
      }

      // Sort by time and take the most recent 10
      activities.sort((a, b) => new Date(b.time) - new Date(a.time));
      setRecentActivity(activities.slice(0, 10));
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Fallback to default stats if API fails
      setStats({
        totalUsers: 0,
        totalRequests: 0,
        pendingRequests: 0,
        completedRequests: 0,
        flaggedContent: 0,
        activeVolunteers: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      change: '+12%',
      changeType: 'positive'
    },
    {
      title: 'Total Requests',
      value: stats.totalRequests,
      icon: Heart,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      change: '+8%',
      changeType: 'positive'
    },
    {
      title: 'Pending Requests',
      value: stats.pendingRequests,
      icon: AlertTriangle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      change: '-5%',
      changeType: 'negative'
    },
    {
      title: 'Completed Requests',
      value: stats.completedRequests,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      change: '+15%',
      changeType: 'positive'
    },
    {
      title: 'Flagged Content',
      value: stats.flaggedContent,
      icon: Flag,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      change: '+2',
      changeType: 'neutral'
    },
    {
      title: 'Active Volunteers',
      value: stats.activeVolunteers,
      icon: UserCheck,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      change: '+20%',
      changeType: 'positive'
    }
  ];



  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="spinner w-8 h-8"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Admin Dashboard
          </h1>
          <p className="mt-2 text-gray-600">
            Welcome back, {user?.name}! Here's what's happening with HelpHub.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                      <p className="text-2xl font-semibold text-gray-900">{stat.value.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className={`text-sm font-medium ${
                    stat.changeType === 'positive' ? 'text-green-600' :
                    stat.changeType === 'negative' ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                    {stat.change}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts and Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Activity Chart */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentActivity.map((activity) => {
                  const Icon = activity.icon;
                  return (
                    <div key={activity.id} className="flex items-center space-x-3">
                      <div className={`w-8 h-8 ${activity.color} bg-gray-100 rounded-full flex items-center justify-center`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.message}
                        </p>
                        <p className="text-xs text-gray-500">{activity.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-4">
                <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <Users className="w-5 h-5 text-blue-600 mr-3" />
                  <div className="text-left">
                    <h3 className="font-medium text-gray-900">Manage Users</h3>
                    <p className="text-sm text-gray-500">View and manage user accounts</p>
                  </div>
                </button>
                
                <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <Flag className="w-5 h-5 text-orange-600 mr-3" />
                  <div className="text-left">
                    <h3 className="font-medium text-gray-900">Review Flagged Content</h3>
                    <p className="text-sm text-gray-500">Review and moderate flagged content</p>
                  </div>
                </button>
                
                <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <BarChart3 className="w-5 h-5 text-green-600 mr-3" />
                  <div className="text-left">
                    <h3 className="font-medium text-gray-900">View Analytics</h3>
                    <p className="text-sm text-gray-500">Detailed platform analytics</p>
                  </div>
                </button>
                
                <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <Settings className="w-5 h-5 text-gray-600 mr-3" />
                  <div className="text-left">
                    <h3 className="font-medium text-gray-900">Platform Settings</h3>
                    <p className="text-sm text-gray-500">Configure platform settings</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">System Status</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Database</p>
                  <p className="text-xs text-gray-500">Connected</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">API Server</p>
                  <p className="text-xs text-gray-500">Running</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">WebSocket</p>
                  <p className="text-xs text-gray-500">Active</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 