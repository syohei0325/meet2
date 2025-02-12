import { useState, useCallback, useEffect } from 'react';
import { GoogleMap, LoadScript, Marker, Autocomplete, StandaloneSearchBox } from '@react-google-maps/api';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ChatRoom } from './ChatRoom';
import { useNavigate } from 'react-router-dom';

const mapContainerStyle = {
  width: '100%',
  height: '100vh'
};

// デフォルトの中心位置（東京）
const defaultCenter = {
  lat: 35.6762,
  lng: 139.6503
};

const libraries: ("places" | "drawing" | "geometry" | "localContext" | "visualization")[] = ["places"];

interface CreateCommunityForm {
  title: string;
  description: string;
  meetingTime: string;
  endTime: string;
  maxParticipants: number;
}

// コミュニティの型定義を追加
interface Community {
  id: string;
  title: string;
  description: string;
  meeting_time: string;
  end_time: string;
  max_participants: number;
  location_lat: number;
  location_lng: number;
  creator_id: string;
  created_at: string;
}

// LoadScriptをコンポーネントの外に移動
const loadScriptProps = {
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  libraries: libraries
};

export const MapView = () => {
  const { user } = useAuth();
  const [selectedLocation, setSelectedLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [communities, setCommunities] = useState<any[]>([]);
  const [center, setCenter] = useState(() => {
    // ローカルストレージから前回の位置を取得
    const savedCenter = localStorage.getItem('mapCenter');
    return savedCenter ? JSON.parse(savedCenter) : defaultCenter;
  });
  const [loading, setLoading] = useState(true);
  const [searchBox, setSearchBox] = useState<google.maps.places.Autocomplete | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [formData, setFormData] = useState<CreateCommunityForm>({
    title: '',
    description: '',
    meetingTime: '',
    endTime: '',
    maxParticipants: 0
  });
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(() => {
    // ローカルストレージから選択中のコミュニティを復元
    const saved = localStorage.getItem('selectedCommunity');
    return saved ? JSON.parse(saved) : null;
  });
  const [showChat, setShowChat] = useState(() => {
    // ローカルストレージからチャット表示状態を復元
    return localStorage.getItem('showChat') === 'true';
  });
  const [isParticipant, setIsParticipant] = useState(false);
  const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [participants, setParticipants] = useState<any[]>([]);
  const navigate = useNavigate();

  // マップのロード状態を管理
  const [mapLoaded, setMapLoaded] = useState(false);

  // centerが変更されたときにローカルストレージに保存
  useEffect(() => {
    localStorage.setItem('mapCenter', JSON.stringify(center));
  }, [center]);

  // 現在地を取得する処理を修正
  useEffect(() => {
    if ("geolocation" in navigator) {
      // ローカルストレージに保存された位置がある場合は現在地取得をスキップ
      if (localStorage.getItem('mapCenter')) {
        setLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCenter({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLoading(false);
        },
        (error) => {
          console.error("位置情報の取得に失敗しました:", error);
          setLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    } else {
      console.log("Geolocation is not supported by this browser.");
      setLoading(false);
    }
  }, []);

  // マップのロードが完了したときのハンドラ
  const handleLoadScript = () => {
    setMapLoaded(true);
  };

  // 選択中のコミュニティが変更されたらローカルストレージに保存
  useEffect(() => {
    if (selectedCommunity) {
      localStorage.setItem('selectedCommunity', JSON.stringify(selectedCommunity));
    } else {
      localStorage.removeItem('selectedCommunity');
    }
  }, [selectedCommunity]);

  // チャット表示状態が変更されたらローカルストレージに保存
  useEffect(() => {
    localStorage.setItem('showChat', showChat.toString());
  }, [showChat]);

  // GoogleMapのonLoadハンドラを修正
  const onMapLoad = useCallback((map: google.maps.Map) => {
    setPlacesService(new google.maps.places.PlacesService(map));
  }, []);

  // handleMapClickを修正
  const handleMapClick = useCallback((event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
      const newLocation = {
        lat: event.latLng.lat(),
        lng: event.latLng.lng()
      };
      setSelectedLocation(newLocation);
    }
  }, []);

  // 検索処理を更新
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;

    try {
      // Places APIを使用して検索
      const service = new google.maps.places.PlacesService(
        document.createElement('div')
      );

      const request = {
        query: searchInput,
        fields: ['name', 'geometry']
      };

      service.textSearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          const location = results[0].geometry?.location;
          if (location) {
            setCenter({
              lat: location.lat(),
              lng: location.lng()
            });
          }
        } else {
          alert('検索結果が見つかりませんでした');
        }
      });
    } catch (error) {
      console.error('Error searching location:', error);
      alert('検索中にエラーが発生しました');
    }
  };

  const onPlaceSelected = () => {
    if (searchBox) {
      const place = searchBox.getPlace();
      if (place.geometry && place.geometry.location) {
        setCenter({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        });
      }
    }
  };

  // コミュニティ一覧を取得する際に住所もまとめて取得
  const fetchCommunities = async () => {
    try {
      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        setCommunities(data);
        
        if (selectedCommunity) {
          const updatedCommunity = data.find(c => c.id === selectedCommunity.id);
          if (updatedCommunity) {
            setSelectedCommunity(updatedCommunity);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching communities:', error);
    }
  };

  // 定期的にコミュニティ一覧を更新
  useEffect(() => {
    fetchCommunities();
    
    // 1分ごとにコミュニティ一覧を更新
    const interval = setInterval(fetchCommunities, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocation || !user) return;

    try {
      const { data, error } = await supabase.from('communities').insert([
        {
          creator_id: user.id,
          title: formData.title,
          description: formData.description,
          location_lat: selectedLocation.lat,
          location_lng: selectedLocation.lng,
          meeting_time: formData.meetingTime,
          end_time: formData.endTime,
          max_participants: formData.maxParticipants,
          visibility: 'public'
        }
      ]).select().single();

      if (error) throw error;

      // 作成者を参加者として追加
      if (data) {
        await supabase.from('community_participants').insert([
          {
            community_id: data.id,
            user_id: user.id
          }
        ]);

        setSelectedCommunity(data);
        setIsParticipant(true);
        setShowChat(true);
      }

      // フォームをリセット
      setSelectedLocation(null);
      setFormData({
        title: '',
        description: '',
        meetingTime: '',
        endTime: '',
        maxParticipants: 0
      });

      // コミュニティ一覧を更新
      fetchCommunities();
    } catch (error) {
      console.error('Error creating community:', error);
      alert('コミュニティの作成に失敗しました');
    }
  };

  // 日時をフォーマットする関数
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 参加状態を確認する関数
  const checkParticipation = async (communityId: string) => {
    if (!user) return false;
    
    try {
      const { data, error } = await supabase
        .from('community_participants')
        .select('*')
        .eq('community_id', communityId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return !!data;
    } catch (error) {
      console.error('Error checking participation:', error);
      return false;
    }
  };

  // コミュニティ選択時に参加状態を確認
  useEffect(() => {
    if (selectedCommunity) {
      checkParticipation(selectedCommunity.id).then(setIsParticipant);
    }
  }, [selectedCommunity, user]);

  // 参加処理を更新
  const handleJoinCommunity = async (communityId: string) => {
    if (!user) return;

    try {
      // 現在の参加者数を確認
      const { data: participants, error: countError } = await supabase
        .from('community_participants')
        .select('*', { count: 'exact' })
        .eq('community_id', communityId);

      if (countError) throw countError;

      // 選択中のコミュニティの最大参加人数を取得
      const maxParticipants = selectedCommunity?.max_participants || 0;

      // 参加者数が上限に達しているかチェック
      if (participants && participants.length >= maxParticipants) {
        alert('このコミュニティは定員に達しています');
        return;
      }

      // 参加処理（joined_atは自動的に現在時刻が設定される）
      const { error } = await supabase
        .from('community_participants')
        .insert([
          {
            community_id: communityId,
            user_id: user.id
          }
        ]);

      if (error) throw error;

      setIsParticipant(true);
      setShowChat(true);
    } catch (error) {
      console.error('Error joining community:', error);
      alert('コミュニティへの参加に失敗しました');
    }
  };

  // コミュニティ削除処理を追加
  const handleDeleteCommunity = async (communityId: string) => {
    if (!user) return;

    const confirmed = window.confirm('このコミュニティを削除してもよろしいですか？\n※この操作は取り消せません。');
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('communities')
        .delete()
        .eq('id', communityId)
        .eq('creator_id', user.id); // 作成者のみが削除可能

      if (error) throw error;

      // 削除成功後の処理
      setSelectedCommunity(null);
      setShowChat(false);
      fetchCommunities(); // コミュニティ一覧を更新
      alert('コミュニティを削除しました');
    } catch (error) {
      console.error('Error deleting community:', error);
      alert('コミュニティの削除に失敗しました');
    }
  };

  // 参加者数を取得する関数
  const fetchParticipantCount = async (communityId: string) => {
    try {
      const { data, error } = await supabase
        .from('community_participants')
        .select('*', { count: 'exact' })
        .eq('community_id', communityId);

      if (error) throw error;
      setParticipantCount(data?.length || 0);
    } catch (error) {
      console.error('Error fetching participant count:', error);
    }
  };

  // コミュニティが選択されたときに参加者数を取得
  useEffect(() => {
    if (selectedCommunity) {
      fetchParticipantCount(selectedCommunity.id);
    }
  }, [selectedCommunity]);

  // 参加者一覧を取得する関数
  const fetchParticipants = async (communityId: string) => {
    try {
      const { data, error } = await supabase
        .from('community_participants')
        .select(`
          *,
          profiles:user_id (username)
        `)
        .eq('community_id', communityId);

      if (error) throw error;
      setParticipants(data || []);
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };

  // コミュニティが選択されたときに参加者一覧を取得
  useEffect(() => {
    if (selectedCommunity) {
      fetchParticipants(selectedCommunity.id);
    }
  }, [selectedCommunity]);

  // 退会処理を更新
  const handleLeaveCommunity = async (communityId: string) => {
    if (!user) return;

    // 主催者は退会できない
    if (selectedCommunity?.creator_id === user.id) {
      alert('主催者は退会できません');
      return;
    }

    const confirmed = window.confirm('このコミュニティから退会してもよろしいですか？');
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('community_participants')
        .delete()
        .eq('community_id', communityId)
        .eq('user_id', user.id);

      if (error) throw error;

      setIsParticipant(false);
      setShowChat(false);
      alert('コミュニティから退会しました');
    } catch (error) {
      console.error('Error leaving community:', error);
      alert('退会処理に失敗しました');
    }
  };

  // 主催者による参加者の退会処理を追加
  const handleRemoveParticipant = async (communityId: string, userId: string) => {
    if (!user) return;

    const confirmed = window.confirm('この参加者をコミュニティから退会させてもよろしいですか？');
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('community_participants')
        .delete()
        .eq('community_id', communityId)
        .eq('user_id', userId);

      if (error) throw error;

      // 参加者数を更新
      fetchParticipantCount(communityId);
      alert('参加者を退会させました');
    } catch (error) {
      console.error('Error removing participant:', error);
      alert('参加者の退会処理に失敗しました');
    }
  };

  // プロフィールページへの遷移関数を追加
  const handleUserClick = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">位置情報を取得中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen relative">
      <LoadScript {...loadScriptProps} onLoad={handleLoadScript}>
        {mapLoaded && (
          <>
            {/* 検索ボックス */}
            <div className="absolute top-4 left-4 right-4 z-10 max-w-md mx-auto">
              <form onSubmit={handleSearch} className="relative">
                <Autocomplete
                  onLoad={setSearchBox}
                  onPlaceChanged={() => {
                    if (searchBox) {
                      const place = searchBox.getPlace();
                      if (place.geometry && place.geometry.location) {
                        setCenter({
                          lat: place.geometry.location.lat(),
                          lng: place.geometry.location.lng()
                        });
                      }
                    }
                  }}
                  options={{
                    types: ['geocode', 'establishment'],
                    componentRestrictions: { country: 'jp' },
                    fields: ['geometry.location', 'formatted_address', 'name'],
                    language: 'ja'
                  }}
                >
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="場所を検索"
                      className="w-full px-4 py-2 pl-10 pr-20 rounded-lg shadow-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onChange={(e) => setSearchInput(e.target.value)}
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <button
                      type="submit"
                      className="absolute inset-y-0 right-0 px-4 py-2 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      検索
                    </button>
                  </div>
                </Autocomplete>
              </form>
            </div>

            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              zoom={14}
              center={center}
              onClick={handleMapClick}
              onLoad={onMapLoad}
              options={{
                zoomControl: true,
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false
              }}
            >
              {/* 現在地のマーカー */}
              <Marker
                position={center}
                icon={{
                  url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                }}
              />

              {/* コミュニティのマーカー */}
              {communities.map(community => (
                <Marker
                  key={community.id}
                  position={{
                    lat: community.location_lat,
                    lng: community.location_lng
                  }}
                  icon={{
                    url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
                  }}
                  onClick={() => {
                    setSelectedCommunity(community);
                  }}
                />
              ))}

              {/* 選択した位置のマーカー */}
              {selectedLocation && (
                <Marker
                  position={selectedLocation}
                  icon={{
                    url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
                  }}
                />
              )}
            </GoogleMap>
          </>
        )}
      </LoadScript>

      {/* コミュニティ詳細モーダル */}
      {selectedCommunity && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white p-6 rounded-lg shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-bold">{selectedCommunity.title}</h3>
            <div className="flex items-center space-x-2">
              {/* 作成者の場合は削除ボタンを表示 */}
              {user?.id === selectedCommunity.creator_id && (
                <button
                  onClick={() => handleDeleteCommunity(selectedCommunity.id)}
                  className="text-red-500 hover:text-red-700"
                  title="コミュニティを削除"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => setSelectedCommunity(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-500">説明</h4>
              <p className="mt-1">{selectedCommunity.description}</p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500">開始時間</h4>
              <p className="mt-1">{formatDateTime(selectedCommunity.meeting_time)}</p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500">終了時間</h4>
              <p className="mt-1">{formatDateTime(selectedCommunity.end_time)}</p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500">参加人数</h4>
              <p className="mt-1">{participantCount} / {selectedCommunity.max_participants} 人</p>
            </div>

            {user?.id === selectedCommunity.creator_id && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">参加者一覧</h4>
                <div className="mt-2 space-y-2">
                  {participants.map(participant => (
                    <div key={participant.user_id} className="flex justify-between items-center">
                      <button
                        onClick={() => handleUserClick(participant.user_id)}
                        className="text-blue-500 hover:text-blue-700 hover:underline text-left"
                      >
                        {participant.profiles.username}
                      </button>
                      {participant.user_id !== user.id && (
                        <button
                          onClick={() => handleRemoveParticipant(selectedCommunity.id, participant.user_id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          退会させる
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setSelectedCommunity(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                閉じる
              </button>
              {isParticipant ? (
                <div className="flex space-x-2">
                  {/* 主催者以外にのみ退会ボタンを表示 */}
                  {user?.id !== selectedCommunity.creator_id && (
                    <button
                      onClick={() => handleLeaveCommunity(selectedCommunity.id)}
                      className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50"
                    >
                      退会する
                    </button>
                  )}
                  <button
                    onClick={() => setShowChat(true)}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
                  >
                    チャットを開く
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleJoinCommunity(selectedCommunity.id)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                >
                  参加する
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* コミュニティ作成モーダル */}
      {selectedLocation && (
        <div className="absolute bottom-4 left-4 right-4 max-w-md mx-auto bg-white p-6 rounded-lg shadow-lg">
          <form onSubmit={handleCreateCommunity} className="space-y-4">
            <h3 className="text-xl font-bold mb-4">コミュニティを作成</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">タイトル</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">説明</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">開始時間</label>
                <input
                  type="datetime-local"
                  value={formData.meetingTime}
                  onChange={(e) => {
                    const newMeetingTime = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      meetingTime: newMeetingTime,
                      // 開始時間が終了時間より後の場合、終了時間を自動調整
                      endTime: prev.endTime && new Date(newMeetingTime) > new Date(prev.endTime) 
                        ? newMeetingTime 
                        : prev.endTime
                    }));
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">終了時間</label>
                <input
                  type="datetime-local"
                  value={formData.endTime}
                  min={formData.meetingTime} // 開始時間より前は選択できない
                  onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">最大参加人数</label>
              <input
                type="number"
                value={formData.maxParticipants}
                onChange={(e) => setFormData({...formData, maxParticipants: parseInt(e.target.value)})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                min="1"
                required
              />
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setSelectedLocation(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                作成
              </button>
            </div>
          </form>
        </div>
      )}

      {/* チャットルーム */}
      {showChat && selectedCommunity && isParticipant && (
        <div key={selectedCommunity.id}>
          <ChatRoom
            communityId={selectedCommunity.id}
            onClose={() => setShowChat(false)}
          />
        </div>
      )}
    </div>
  );
}; 