import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { useState, useEffect } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow, Autocomplete } from '@react-google-maps/api';
import type { Libraries } from '@react-google-maps/api';
import StatusSelector from './StatusSelector';
import { findNearbyUsers } from '@/utils/nearbyUsers';
import { updateUserLocation } from '@/utils/location';
import { UserMarker } from './UserMarker';

// 型定義
interface User {
  id: string;
  user_metadata: {
    avatar_url?: string;
  };
  status?: string;
  status_type?: string;
}

interface NearbyUser {
  id: string;
  latitude: number;
  longitude: number;
  status: string;
  status_type: string;
  user_metadata: {
    avatar_url?: string;
  };
}

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const center = {
  lat: 35.6762,  // 東京
  lng: 139.6503
};

const libraries: Libraries = ['places'];

export default function MapView() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      showNotification('このブラウザは位置情報に対応していません');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await updateUserLocation(
            position.coords.latitude,
            position.coords.longitude
          );
        } catch (error) {
          showNotification('位置情報の更新に失敗しました');
        }
      },
      (error) => {
        switch(error.code) {
          case error.PERMISSION_DENIED:
            showNotification('位置情報の使用を許可してください');
            break;
          case error.POSITION_UNAVAILABLE:
            showNotification('位置情報を取得できません');
            break;
          default:
            showNotification('位置情報の取得に失敗しました');
        }
      }
    );
  }, []);

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000); // 3秒後に通知を消す
  };

  const searchNearbyUsers = async () => {
    setIsLoading(true);
    try {
      if (!navigator.geolocation) {
        showNotification('位置情報が利用できません');
        return;
      }

      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          const users = await findNearbyUsers({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            radius: 5000,
            status_type: selectedStatus,
            onlyVisible: true
          });
          setNearbyUsers(users);
        } catch (error) {
          console.error('検索エラー:', error);
          showNotification('ユーザーの検索に失敗しました');
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlaceSelect = (place: google.maps.places.PlaceResult) => {
    if (place.geometry?.location) {
      // 処理を追加
    }
  };

  return (
    <div className="relative h-screen bg-gray-100 flex">
      {/* 通知 */}
      {notification && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded shadow-lg">
          {notification}
        </div>
      )}

      {/* サイドバー */}
      <div 
        className={`h-full bg-white shadow-lg transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-80' : 'w-16'}`}
      >
        {/* ヘッダー部分 */}
        <div className="p-4 border-b flex items-center">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <svg
              className="w-6 h-6 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          {isSidebarOpen && (
            <span className="ml-4 text-lg font-semibold text-gray-700">
              メニュー
            </span>
          )}
        </div>

        {/* プロフィール部分 */}
        <div className={`p-4 ${isSidebarOpen ? 'block' : 'hidden'}`}>
          <div className="flex items-center space-x-4">
            {user?.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt="プロフィール"
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
            )}
            <div>
              <div className="text-sm text-gray-600">ようこそ</div>
              <StatusSelector />
              <button
                onClick={() => {
                  navigate(`/profile/${user?.id}`);
                  showNotification('プロフィールページに移動しました');
                }}
                className="mt-2 text-blue-600 hover:text-blue-800 font-medium text-sm"
              >
                プロフィールを見る
              </button>
            </div>
          </div>
        </div>

        {/* フィルター部分を追加 */}
        <div className={`p-4 ${isSidebarOpen ? 'block' : 'hidden'}`}>
          <div className="space-y-4">
            <h3 className="font-medium text-gray-700">近くのユーザーを探す</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setSelectedStatus('lunch');
                  searchNearbyUsers();
                }}
                className={`px-4 py-2 rounded-full text-sm ${
                  selectedStatus === 'lunch'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                ランチ仲間を探す
              </button>
              {/* 他のフィルターボタン */}
            </div>
          </div>
        </div>
      </div>

      {/* Google Maps */}
      <div className="flex-1">
        <LoadScript
          googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
          libraries={libraries}
        >
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={13}
          >
            {nearbyUsers.map(user => (
              <UserMarker
                key={user.id}
                user={user}
                position={{
                  lat: user.latitude,
                  lng: user.longitude
                }}
              />
            ))}
          </GoogleMap>
        </LoadScript>
      </div>

      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg">
            <p>検索中...</p>
          </div>
        </div>
      )}

      <Autocomplete
        onLoad={(autocomplete) => {
          // 必要な処理があれば追加
        }}
        onPlaceChanged={handlePlaceSelect}
        options={{
          componentRestrictions: { country: 'jp' }
        }}
      >
        <input
          type="text"
          placeholder="場所を検索"
          className="w-full p-2 border rounded"
        />
      </Autocomplete>
    </div>
  );
} 