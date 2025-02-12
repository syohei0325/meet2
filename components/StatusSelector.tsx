import { useState } from 'react';
import { supabase } from '@/utils/supabaseClient';

const STATUS_OPTIONS = [
  { type: 'online', label: 'オンライン' },
  { type: 'lunch', label: 'ランチ可能' },
  { type: 'meeting', label: '会議中' },
  { type: 'busy', label: '取り込み中' },
  { type: 'offline', label: 'オフライン' }
];

export default function StatusSelector() {
  const [currentStatus, setCurrentStatus] = useState('online');

  const updateStatus = async (statusType: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          status_type: statusType,
          status: STATUS_OPTIONS.find(s => s.type === statusType)?.label,
          last_active: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      setCurrentStatus(statusType);
    } catch (error) {
      console.error('ステータスの更新に失敗:', error);
    }
  };

  return (
    <div className="relative inline-block">
      <select
        value={currentStatus}
        onChange={(e) => updateStatus(e.target.value)}
        className="block w-full px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.type} value={option.type}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
} 