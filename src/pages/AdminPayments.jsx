import React, { useState, useEffect } from 'react';
import { getPayments, refundPayment } from '../utils/adminApi';
import { Search, RotateCcw, AlertCircle, CheckCircle } from 'lucide-react';

const AdminPayments = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [refundReason, setRefundReason] = useState('');
    const [selectedPayment, setSelectedPayment] = useState(null); // For refund modal

    const fetchPayments = async () => {
        setLoading(true);
        try {
            const data = await getPayments({ page, limit: 10, search });
            setPayments(data.payments);
            setTotalPages(data.pagination.totalPages);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayments();
    }, [page]); // Search is handled by button or enter

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        fetchPayments();
    };

    const handleRefund = async () => {
        if (!selectedPayment || !refundReason) return;

        if (!confirm('정말로 환불 처리하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

        try {
            await refundPayment(selectedPayment.id, refundReason);
            alert('환불 처리가 완료되었습니다.');
            setSelectedPayment(null);
            setRefundReason('');
            fetchPayments(); // Refresh list
        } catch (err) {
            alert(`환불 실패: ${err.message}`);
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">결제 관리</h2>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="mb-6 flex gap-2">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="주문번호, 사용자명 검색..."
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

            {loading ? (
                <div className="text-center py-10">로딩 중...</div>
            ) : error ? (
                <div className="text-red-500 py-10">에러: {error}</div>
            ) : (
                <div className="bg-white shadow-sm rounded-lg border overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">주문번호</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">사용자</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">금액</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">일시</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">관리</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {payments.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">결제 내역이 없습니다.</td>
                                </tr>
                            ) : (
                                payments.map((payment) => (
                                    <tr key={payment.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{payment.merchant_uid}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{payment.user_name || '비회원'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₩{parseInt(payment.amount).toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${payment.status === 'paid' ? 'bg-green-100 text-green-800' :
                                                    payment.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {payment.status === 'paid' ? '결제완료' : payment.status === 'cancelled' ? '취소됨' : payment.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(payment.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            {payment.status === 'paid' && (
                                                <button
                                                    onClick={() => setSelectedPayment(payment)}
                                                    className="text-red-600 hover:text-red-900 flex items-center"
                                                >
                                                    <RotateCcw size={16} className="mr-1" />
                                                    환불
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* Pagination settings */}
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

            {/* Refund Modal */}
            {selectedPayment && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <h3 className="text-lg font-bold mb-4">환불 처리</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            주문번호: {selectedPayment.merchant_uid}<br />
                            금액: ₩{parseInt(selectedPayment.amount).toLocaleString()}
                        </p>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                환불 사유
                            </label>
                            <textarea
                                value={refundReason}
                                onChange={(e) => setRefundReason(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                rows="3"
                                placeholder="환불 사유를 입력하세요 (예: 고객 요청)"
                            ></textarea>
                        </div>

                        <div className="flex justify-end space-x-2">
                            <button
                                onClick={() => {
                                    setSelectedPayment(null);
                                    setRefundReason('');
                                }}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleRefund}
                                disabled={!refundReason.trim()}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                                환불하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPayments;
