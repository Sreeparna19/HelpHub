import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import PrivateRoute from './utils/PrivateRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import HelpRequest from './pages/HelpRequest';
import VolunteerDashboard from './pages/VolunteerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import CreateRequest from './pages/CreateRequest';
import RequestDetails from './pages/RequestDetails';
import NotFound from './pages/NotFound';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Protected routes */}
              <Route path="/help-request" element={
                <PrivateRoute>
                  <HelpRequest />
                </PrivateRoute>
              } />
              
              <Route path="/volunteer-dashboard" element={
                <PrivateRoute allowedRoles={['volunteer']}>
                  <VolunteerDashboard />
                </PrivateRoute>
              } />
              
              <Route path="/admin-dashboard" element={
                <PrivateRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </PrivateRoute>
              } />
              
              <Route path="/chat" element={
                <PrivateRoute>
                  <Chat />
                </PrivateRoute>
              } />
              
              <Route path="/chat/:chatId" element={
                <PrivateRoute>
                  <Chat />
                </PrivateRoute>
              } />
              
              <Route path="/profile" element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              } />
              
              <Route path="/create-request" element={
                <PrivateRoute allowedRoles={['needy']}>
                  <CreateRequest />
                </PrivateRoute>
              } />
              
              <Route path="/request/:id" element={
                <PrivateRoute>
                  <RequestDetails />
                </PrivateRoute>
              } />
              
              {/* 404 route */}
              <Route path="/404" element={<NotFound />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
