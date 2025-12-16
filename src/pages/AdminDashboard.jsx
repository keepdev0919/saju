import React, { useEffect, useState } from 'react';
import { getPaymentStats, getDashboardActivity } from '../utils/adminApi';
import { TrendingUp, Users, DollarSign, Activity, Shield, CreditCard, LogIn, User } from 'lucide-react';

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsData, activityData] = await Promise.all([
                    getPaymentStats(),
                    getDashboardActivity()
                ]);
                console.log('📊 Stats:', statsData, '📜 Activities:', activityData);
                setStats(statsData.stats || statsData);
                setActivities(activityData.activities || []);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const getActivityIcon = (action) => {
        switch (action) {
            case 'LOGIN': return <LogIn size={16} className="text-blue-500" />;
            case 'REFUND': return <CreditCard size={16} className="text-red-500" />; // Or specific refund icon
            case 'UPDATE_PROFILE':
            case 'CHANGE_PASSWORD': return <Shield size={16} className="text-orange-500" />;
            default: return <Activity size={16} className="text-gray-500" />;
        }
    };

    const getActivityMessage = (log) => {
        const time = new Date(log.created_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const name = log.name || log.username || 'Admin';

        switch (log.action) {
            case 'LOGIN': return `${name}님이 로그인했습니다.`;
            case 'REFUND':
                try {
                    const details = JSON.parse(log.details || '{}');
                    return `${name}님이 ${parseInt(details.amount || 0).toLocaleString()}원을 환불 처리했습니다.`;
                } catch (e) { return `${name}님이 환불 처리했습니다.`; }
            case 'UPDATE_PROFILE': return `${name}님이 프로필을 수정했습니다.`;
            case 'CHANGE_PASSWORD': return `${name}님이 비밀번호를 변경했습니다.`;
            default: return `${name}님이 ${log.action} 활동을 했습니다.`;
        }
    };

    if (loading) return <div>로딩 중...</div>;
    if (error) return <div className="text-red-500">에러: {error}</div>;

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">대시보드</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* ... (Existing Stats Cards) ... */}
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-500 font-medium">총 결제 건수</h3>
                        <div className="p-2 bg-blue-100 rounded-full">
                            <Users size={20} className="text-blue-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-800">
                        {stats?.total?.total_count || 0}건
                    </p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-500 font-medium">총 매출</h3>
                        <div className="p-2 bg-green-100 rounded-full">
                            <DollarSign size={20} className="text-green-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-800">
                        ₩{parseInt(stats?.total?.total_revenue || 0).toLocaleString()}
                    </p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-500 font-medium">평균 객단가</h3>
                        <div className="p-2 bg-purple-100 rounded-full">
                            <TrendingUp size={20} className="text-purple-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-800">
                        ₩{stats?.total?.paid_count ? Math.round(stats.total.total_revenue / stats.total.paid_count).toLocaleString() : 0}
                    </p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Activity size={20} />
                    최근 운영 활동
                </h3>
                <div className="space-y-4">
                    {activities.length === 0 ? (
                        <p className="text-gray-500 text-sm">아직 활동 내역이 없습니다.</p>
                    ) : (
                        activities.map((log) => (
                            <div key={log.id} className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors border-b last:border-0 border-gray-100">
                                <div className="mt-1 p-2 bg-gray-100 rounded-full">
                                    {getActivityIcon(log.action)}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-800">
                                        {getActivityMessage(log)}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-gray-400">
                                            {new Date(log.created_at).toLocaleString('ko-KR')}
                                        </span>
                                        {log.details && !log.details.includes('{') && (
                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                                {log.details.substring(0, 30)}...
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
