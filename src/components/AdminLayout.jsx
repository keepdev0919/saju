import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import { LayoutDashboard, CreditCard, LogOut, User, Settings } from 'lucide-react';

const AdminLayout = () => {
    const { logout, admin } = useAdmin();
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <aside className="w-64 bg-white shadow-md">
                <div className="p-6 border-b">
                    <h1 className="text-xl font-bold text-gray-800">관리자 페이지</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        환영합니다, {admin?.name || '관리자'}님
                    </p>
                </div>
                <nav className="mt-6 px-4">
                    <ul className="space-y-2">
                        <li>
                            <Link
                                to="/admin/dashboard"
                                className={`flex items - center px - 4 py - 3 rounded - lg transition - colors ${isActive('/admin/dashboard')
                                        ? 'bg-blue-50 text-blue-600'
                                        : 'text-gray-600 hover:bg-gray-50'
                                    } `}
                            >
                                <LayoutDashboard size={20} className="mr-3" />
                                대시보드
                            </Link>
                        </li>
                        <li>
                            <Link
                                to="/admin/payments"
                                className={`flex items - center px - 4 py - 3 rounded - lg transition - colors ${isActive('/admin/payments')
                                        ? 'bg-blue-50 text-blue-600'
                                        : 'text-gray-600 hover:bg-gray-50'
                                    } `}
                            >
                                <CreditCard size={20} className="mr-3" />
                                결제 관리
                            </Link>
                        </li>
                        <li>
                            <Link
                                to="/admin/users"
                                className={`flex items - center px - 4 py - 3 rounded - lg transition - colors ${isActive('/admin/users')
                                        ? 'bg-blue-50 text-blue-600'
                                        : 'text-gray-600 hover:bg-gray-50'
                                    } `}
                            >
                                <User size={20} className="mr-3" />
                                회원 관리
                            </Link>
                        </li>
                        <li>
                            <Link
                                to="/admin/profile"
                                className={`flex items - center px - 4 py - 3 rounded - lg transition - colors ${isActive('/admin/profile')
                                        ? 'bg-blue-50 text-blue-600'
                                        : 'text-gray-600 hover:bg-gray-50'
                                    } `}
                            >
                                <Settings size={20} className="mr-3" />
                                설정
                            </Link>
                        </li>
                    </ul>
                </nav>
                <div className="absolute bottom-0 w-64 p-4 border-t bg-gray-50">
                    <button
                        onClick={logout}
                        className="flex items-center w-full px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <LogOut size={20} className="mr-3" />
                        로그아웃
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto p-8">
                <div className="max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
