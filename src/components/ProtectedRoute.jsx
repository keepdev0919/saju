import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';

const ProtectedRoute = () => {
    const { isAuthenticated, loading } = useAdmin();

    if (loading) {
        return <div className="flex justify-center items-center h-screen">로딩 중...</div>;
    }

    return isAuthenticated ? <Outlet /> : <Navigate to="/admin/login" replace />;
};

export default ProtectedRoute;
