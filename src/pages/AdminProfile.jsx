import React, { useState, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext';
import { updateAdminProfile } from '../utils/adminApi';
import { User, Lock, Save, AlertCircle } from 'lucide-react';

const AdminProfile = () => {
    const { admin, login } = useAdmin(); // login needed to refresh context if name changes
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (admin) {
            setFormData(prev => ({
                ...prev,
                name: admin.name || '',
                email: admin.email || ''
            }));
        }
    }, [admin]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        // 유효성 검사
        if (!formData.currentPassword) {
            setMessage({ type: 'error', text: '정보를 수정하려면 현재 비밀번호를 입력해야 합니다.' });
            return;
        }

        if (formData.newPassword) {
            if (formData.newPassword !== formData.confirmNewPassword) {
                setMessage({ type: 'error', text: '새 비밀번호가 일치하지 않습니다.' });
                return;
            }
            if (formData.newPassword.length < 6) {
                setMessage({ type: 'error', text: '새 비밀번호는 최소 6자 이상이어야 합니다.' });
                return;
            }
        }

        setLoading(true);
        try {
            await updateAdminProfile({
                name: formData.name,
                email: formData.email,
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword || undefined
            });

            setMessage({ type: 'success', text: '정보가 성공적으로 수정되었습니다.' });

            // 폼 초기화 (비밀번호 필드 비우기)
            setFormData(prev => ({
                ...prev,
                currentPassword: '',
                newPassword: '',
                confirmNewPassword: ''
            }));

        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.error || err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">계정 설정</h2>

            <div className="bg-white rounded-lg shadow-sm border p-8">
                {message.text && (
                    <div className={`mb-6 p-4 rounded-lg flex items-center ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                        }`}>
                        <AlertCircle size={20} className="mr-2" />
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* 기본 정보 섹션 */}
                    <section>
                        <h3 className="flex items-center text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                            <User size={20} className="mr-2 text-blue-500" />
                            계정 정보
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">관리자 아이디</label>
                                <input
                                    type="text"
                                    value={admin?.username || ''}
                                    disabled
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    * 아이디는 보안상 변경할 수 없습니다.
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">표시 이름</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                />
                            </div>
                        </div>
                    </section>

                    {/* 비밀번호 변경 섹션 */}
                    <section className="pt-4">
                        <h3 className="flex items-center text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                            <Lock size={20} className="mr-2 text-purple-500" />
                            비밀번호 변경
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    현재 비밀번호 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="password"
                                    name="currentPassword"
                                    value={formData.currentPassword}
                                    onChange={handleChange}
                                    placeholder="정보 수정을 위해 필수입니다"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호 (선택)</label>
                                    <input
                                        type="password"
                                        name="newPassword"
                                        value={formData.newPassword}
                                        onChange={handleChange}
                                        placeholder="변경 시에만 입력"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호 확인</label>
                                    <input
                                        type="password"
                                        name="confirmNewPassword"
                                        value={formData.confirmNewPassword}
                                        onChange={handleChange}
                                        placeholder="한 번 더 입력"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="flex justify-end pt-6">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${loading ? 'opacity-70 cursor-not-allowed' : ''
                                }`}
                        >
                            {loading ? (
                                '저장 중...'
                            ) : (
                                <>
                                    <Save size={20} className="mr-2" />
                                    변경사항 저장
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminProfile;
