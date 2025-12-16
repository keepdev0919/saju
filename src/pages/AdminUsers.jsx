import React, { useState, useEffect } from 'react';
import { getUsers, getUserDetail } from '../utils/adminApi';
import { Search, Users, FileText, CreditCard, X, Edit2 } from 'lucide-react';
import ResultEditorModal from '../components/admin/ResultEditorModal';

const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedUser, setSelectedUser] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [editTarget, setEditTarget] = useState(null); // Result to edit

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await getUsers({ page, limit: 10, search });
            setUsers(data.users);
            setTotalPages(data.pagination.totalPages);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [page]); // Search handled manually

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        fetchUsers();
    };

    const openUserDetail = async (id) => {
        setDetailLoading(true);
        try {
            const data = await getUserDetail(id);
            setSelectedUser(data);
        } catch (err) {
            alert(`상세 정보 로드 실패: ${err.message}`);
        } finally {
            setDetailLoading(false);
        }
    };

    const closeUserDetail = () => {
        setSelectedUser(null);
    };

    const handleEditResult = (result) => {
        setEditTarget(result);
    };

    const handleUpdateSuccess = () => {
        // Refresh detail view
        if (selectedUser) {
            openUserDetail(selectedUser.user.id);
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">회원 관리</h2>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="mb-6 flex gap-2">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="이름 또는 전화번호 검색..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    검색
                </button>
            </form>

            {/* User List */}
            {loading ? (
                <div className="text-center py-10">로딩 중...</div>
            ) : error ? (
                <div className="text-red-500 py-10">에러: {error}</div>
            ) : (
                <div className="bg-white shadow-sm rounded-lg border overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이름</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">전화번호</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">생년월일</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">가입일</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">결제/금액</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">관리</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">회원이 없습니다.</td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className={`${user.deleted_at ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'} transition-colors`}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {user.name}
                                            {user.deleted_at && (
                                                <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                                    탈퇴
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.phone}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {user.birth_date} ({user.calendar_type === 'solar' ? '양력' : '음력'})
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {user.payment_count}건 / ₩{parseInt(user.total_payment_amount || 0).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button
                                                onClick={() => openUserDetail(user.id)}
                                                className="text-blue-600 hover:text-blue-900"
                                            >
                                                상세보기
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                        <div className="flex-1 flex justify-between sm:hidden">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                            >
                                이전
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                            >
                                다음
                            </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    페이지 <span className="font-medium">{page}</span> / <span className="font-medium">{totalPages}</span>
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        이전
                                    </button>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        다음
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* User Detail Modal */}
            {detailLoading && (
                <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
                    <div className="bg-white p-4 rounded-lg shadow-lg">로딩 중...</div>
                </div>
            )}

            {selectedUser && !detailLoading && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="text-xl font-bold text-gray-800">회원 상세 정보</h3>
                            <button onClick={closeUserDetail} className="text-gray-500 hover:text-gray-700 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 space-y-8">
                            {/* Basic Info */}
                            <section>
                                <h4 className="flex items-center text-lg font-semibold text-gray-800 mb-4">
                                    <Users size={20} className="mr-2 text-blue-500" />
                                    기본 정보
                                </h4>
                                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                                    <div>
                                        <span className="text-sm text-gray-500 block">이름</span>
                                        <span className="font-medium">{selectedUser.user.name}</span>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-500 block">전화번호</span>
                                        <span className="font-medium">{selectedUser.user.phone}</span>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-500 block">생년월일</span>
                                        <span className="font-medium">{selectedUser.user.birth_date}</span>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-500 block">성별</span>
                                        <span className="font-medium">{selectedUser.user.gender === 'male' ? '남성' : '여성'}</span>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-500 block">가입일</span>
                                        <span className="font-medium">{new Date(selectedUser.user.created_at).toLocaleString()}</span>
                                    </div>
                                </div>
                            </section>

                            {/* Saju History */}
                            <section>
                                <h4 className="flex items-center text-lg font-semibold text-gray-800 mb-4">
                                    <FileText size={20} className="mr-2 text-green-500" />
                                    사주 분석 이력 ({selectedUser.sajuResults.length}건)
                                </h4>
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">일시</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">요약</th>
                                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">관리</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {selectedUser.sajuResults.length === 0 ? (
                                                <tr><td colSpan="3" className="p-4 text-center text-sm text-gray-500">이력이 없습니다.</td></tr>
                                            ) : (
                                                selectedUser.sajuResults.map(result => (
                                                    <tr key={result.id}>
                                                        <td className="px-4 py-2 text-sm text-gray-500">{new Date(result.created_at).toLocaleDateString()}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-900 truncate max-w-xs">{result.request_summary || '전체 풀이'}</td>
                                                        <td className="px-4 py-2 text-sm text-right">
                                                            <button
                                                                onClick={() => handleEditResult(result)}
                                                                className="text-blue-600 hover:text-blue-800 flex items-center justify-end gap-1 ml-auto text-xs font-bold border border-blue-200 bg-blue-50 px-2 py-1 rounded"
                                                            >
                                                                <Edit2 size={12} /> 수정
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            {/* Payment History */}
                            <section>
                                <h4 className="flex items-center text-lg font-semibold text-gray-800 mb-4">
                                    <CreditCard size={20} className="mr-2 text-purple-500" />
                                    결제 내역 ({selectedUser.payments.length}건)
                                </h4>
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">주문번호</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">금액</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">상태</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">일시</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {selectedUser.payments.length === 0 ? (
                                                <tr><td colSpan="4" className="p-4 text-center text-sm text-gray-500">결제 내역이 없습니다.</td></tr>
                                            ) : (
                                                selectedUser.payments.map(payment => (
                                                    <tr key={payment.id}>
                                                        <td className="px-4 py-2 text-sm text-gray-900">{payment.merchant_uid}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-900">₩{parseInt(payment.amount).toLocaleString()}</td>
                                                        <td className="px-4 py-2 text-sm">
                                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${payment.status === 'paid' ? 'bg-green-100 text-green-800' :
                                                                payment.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                                                                }`}>
                                                                {payment.status === 'paid' ? '결제완료' : payment.status === 'cancelled' ? '취소됨' : payment.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2 text-sm text-gray-500">{new Date(payment.created_at).toLocaleDateString()}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </div>

                        <div className="p-6 border-t bg-gray-50 flex justify-end">
                            <button
                                onClick={closeUserDetail}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Result Edit Modal */}
            {editTarget && (
                <ResultEditorModal
                    result={editTarget}
                    onClose={() => setEditTarget(null)}
                    onUpdateSuccess={handleUpdateSuccess}
                />
            )}
        </div>
    );
};

export default AdminUsers;
