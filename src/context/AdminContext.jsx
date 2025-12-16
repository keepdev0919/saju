import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginAdmin, getMe } from '../utils/adminApi';

const AdminContext = createContext(null);

export const AdminProvider = ({ children }) => {
    const [admin, setAdmin] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    // 초기 로딩 시 토큰 확인
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('adminToken');
            if (token) {
                try {
                    const userData = await getMe();
                    setAdmin(userData);
                    setIsAuthenticated(true);
                } catch (error) {
                    console.error('인증 실패:', error);
                    localStorage.removeItem('adminToken');
                    setAdmin(null);
                    setIsAuthenticated(false);
                }
            }
            setLoading(false);
        };

        checkAuth();
    }, []);

    const login = async (username, password) => {
        try {
            const { token, admin: adminData } = await loginAdmin(username, password);
            localStorage.setItem('adminToken', token);
            setAdmin(adminData);
            setIsAuthenticated(true);
            return true;
        } catch (error) {
            console.error('로그인 에러:', error);
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('adminToken');
        setAdmin(null);
        setIsAuthenticated(false);
        // window.location.href = '/admin/login'; // React Router 사용 시 navigate 권장
    };

    return (
        <AdminContext.Provider value={{ admin, isAuthenticated, loading, login, logout }}>
            {children}
        </AdminContext.Provider>
    );
};

export const useAdmin = () => {
    const context = useContext(AdminContext);
    if (!context) {
        throw new Error('useAdmin must be used within an AdminProvider');
    }
    return context;
};
