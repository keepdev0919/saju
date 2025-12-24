
import React, { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { updateResult } from '../../utils/adminApi';

/**
 * Result Content Editor Modal
 * Allows admins to edit the generated Saju result text.
 */
const ResultEditorModal = ({ result, onClose, onUpdateSuccess }) => {
    const [formData, setFormData] = useState({
        overall: result.overallFortune || '',
        wealth: result.wealthFortune || '',
        love: result.loveFortune || '',
        career: result.careerFortune || '',
        health: result.healthFortune || ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!result.id) return;

        setLoading(true);
        setError(null);

        try {
            await updateResult(result.id, formData);
            alert('수정이 완료되었습니다.');
            onUpdateSuccess(); // Refresh parent data
            onClose();
        } catch (err) {
            setError(err.message || '수정 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-700 shadow-2xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-800">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        ✏️ 사주 결과 내용 수정
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {error && (
                        <div className="bg-red-500/10 text-red-400 p-4 rounded-lg flex items-center gap-2 border border-red-500/20">
                            <AlertCircle size={20} />
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <Field
                            label="🌟 총평 (Overall)"
                            value={formData.overall}
                            onChange={val => setFormData({ ...formData, overall: val })}
                            rows={6}
                        />
                        <Field
                            label="💰 재물운 (Wealth)"
                            value={formData.wealth}
                            onChange={val => setFormData({ ...formData, wealth: val })}
                            rows={4}
                        />
                        <Field
                            label="❤️ 애정운 (Love)"
                            value={formData.love}
                            onChange={val => setFormData({ ...formData, love: val })}
                            rows={4}
                        />
                        <Field
                            label="💼 직장운 (Career)"
                            value={formData.career}
                            onChange={val => setFormData({ ...formData, career: val })}
                            rows={4}
                        />
                        <Field
                            label="💪 건강운 (Health)"
                            value={formData.health}
                            onChange={val => setFormData({ ...formData, health: val })}
                            rows={4}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3 rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-lg text-slate-300 font-medium hover:bg-slate-800 transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-blue-900/20"
                    >
                        {loading ? '저장 중...' : <><Save size={18} /> 저장하기</>}
                    </button>
                </div>

            </div>
        </div>
    );
};

// Helper Field Component
const Field = ({ label, value, onChange, rows }) => (
    <div>
        <label className="block text-sm font-bold text-slate-400 mb-2">{label}</label>
        <textarea
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all leading-relaxed"
            rows={rows}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="내용을 입력하세요..."
        />
    </div>
);

export default ResultEditorModal;
