import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { getUnreadNotifications, markNotificationAsRead } from '@/utils/notification';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    // 初期通知の取得
    fetchNotifications();

    // リアルタイム購読
    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          setNotifications(prev => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await getUnreadNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('通知の取得に失敗:', error);
    }
  };

  const handleNotificationClick = async (notificationId: string, link?: string) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(prev => 
        prev.filter(notification => notification.id !== notificationId)
      );
      if (link) {
        window.location.href = link;
      }
    } catch (error) {
      console.error('通知の既読処理に失敗:', error);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {notifications.length > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {notifications.length}
          </span>
        )}
      </button>

      {showNotifications && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-50">
          <div className="p-2">
            <h3 className="text-lg font-semibold mb-2">通知</h3>
            {notifications.length === 0 ? (
              <p className="text-gray-500 text-center py-4">新しい通知はありません</p>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification.id, notification.link)}
                    className="p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <p className="text-sm">{notification.content}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 