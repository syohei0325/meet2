import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid';

interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface Community {
  id: string;
  title: string;
  description: string;
  meeting_time: string;
  end_time: string;
  max_participants: number;
  creator_id: string;
  location_lat: number;
  location_lng: number;
}

interface FollowStats {
  followers_count: number;
  following_count: number;
  is_following: boolean;
}

export const ProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    username: '',
    full_name: '',
    bio: '',
    avatar_url: ''
  });
  const [stats, setStats] = useState({
    createdCount: 0,
    participatingCount: 0
  });
  const [editingCommunity, setEditingCommunity] = useState<Community | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [followStats, setFollowStats] = useState<FollowStats>({
    followers_count: 0,
    following_count: 0,
    is_following: false
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // プロフィール情報を取得
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profileError) throw profileError;
        setProfile(profileData);
        setEditForm({
          username: profileData.username || '',
          full_name: profileData.full_name || '',
          bio: profileData.bio || '',
          avatar_url: profileData.avatar_url || ''
        });

        // 作成したコミュニティを取得
        const { data: createdCommunities, error: createdError } = await supabase
          .from('communities')
          .select('*')
          .eq('creator_id', userId)
          .order('created_at', { ascending: false });

        if (createdError) throw createdError;
        setCommunities(createdCommunities || []);

        // 作成したコミュニティの総数を取得（削除されたものも含む）
        const { count: totalCreatedCount, error: countError } = await supabase
          .from('communities')
          .select('*', { count: 'exact' })
          .eq('creator_id', userId);

        if (countError) throw countError;

        // 参加中のコミュニティ数を取得
        const { count: participatingCount, error: participatingError } = await supabase
          .from('community_participants')
          .select('*', { count: 'exact' })
          .eq('user_id', userId);

        if (participatingError) throw participatingError;

        setStats({
          createdCount: totalCreatedCount || 0,  // 総作成数を使用
          participatingCount: participatingCount || 0
        });

      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  // フォロー状態を取得する関数
  const fetchFollowStats = async () => {
    if (!userId || !user) return;

    try {
      // フォロワー数を取得
      const { count: followersCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact' })
        .eq('following_id', userId);

      // フォロー中の数を取得
      const { count: followingCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact' })
        .eq('follower_id', userId);

      // 現在のユーザーがフォローしているかチェック
      const { data: followData } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .single();

      setFollowStats({
        followers_count: followersCount || 0,
        following_count: followingCount || 0,
        is_following: !!followData
      });
    } catch (error) {
      console.error('Error fetching follow stats:', error);
    }
  };

  // プロフィール取得時にフォロー状態も取得
  useEffect(() => {
    fetchFollowStats();
  }, [userId, user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      // プロフィールを更新
      const { error } = await supabase
        .from('profiles')
        .update({
          username: editForm.username,
          full_name: editForm.full_name,
          bio: editForm.bio,
          avatar_url: editForm.avatar_url
        })
        .eq('id', user.id);

      if (error) throw error;

      // プロフィール情報を再取得
      const { data: updatedProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) throw fetchError;

      setProfile(updatedProfile);
      setIsEditing(false);
      alert('プロフィールを更新しました');

    } catch (error) {
      console.error('Error updating profile:', error);
      alert('プロフィールの更新に失敗しました');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      // ファイルサイズチェックを5MBに設定
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > MAX_FILE_SIZE) {
        alert(`ファイルサイズは5MB以下にしてください（現在: ${(file.size / 1024 / 1024).toFixed(2)}MB）`);
        return;
      }

      // 画像の圧縮を追加
      const compressedFile = await compressImage(file);

      // 画像ファイルかチェック
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(compressedFile.type)) {
        alert('JPG, PNG, GIF形式の画像のみアップロード可能です');
        return;
      }

      // ファイル名を一意にする
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // 新しい画像をアップロード
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, compressedFile, {
          cacheControl: '0',
          contentType: compressedFile.type
        });

      if (uploadError) throw uploadError;

      // 画像のURLを取得
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // プロフィールを即座に更新
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // フォームとプロフィールの状態を更新
      setEditForm(prev => ({
        ...prev,
        avatar_url: publicUrl
      }));

      setProfile(prev => prev ? {
        ...prev,
        avatar_url: publicUrl
      } : null);

    } catch (error) {
      console.error('Error uploading image:', error);
      alert('画像のアップロードに失敗しました');
    }
  };

  // 画像圧縮用の関数を更新
  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // アバター画像用に小さいサイズに制限（400x400px）
          const MAX_SIZE = 400;
          if (width > height) {
            if (width > MAX_SIZE) {
              height = (height * MAX_SIZE) / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = (width * MAX_SIZE) / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // より強い圧縮率を設定（0.6）
          canvas.toBlob(
            (blob) => {
              if (blob) {
                // 圧縮後のサイズをチェック
                if (blob.size > 5 * 1024 * 1024) {
                  // さらに圧縮が必要な場合は、より強い圧縮を試みる
                  canvas.toBlob(
                    (reBlob) => {
                      if (reBlob) {
                        resolve(reBlob);
                      } else {
                        reject(new Error('画像の圧縮に失敗しました'));
                      }
                    },
                    file.type,
                    0.4 // より強い圧縮率
                  );
                } else {
                  resolve(blob);
                }
              } else {
                reject(new Error('画像の圧縮に失敗しました'));
              }
            },
            file.type,
            0.6
          );
        };
        img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
      reader.readAsDataURL(file);
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // コミュニティ削除処理を修正
  const handleDeleteCommunity = async (communityId: string) => {
    try {
      // 参加者を削除
      const { error: participantsError } = await supabase
        .from('community_participants')
        .delete()
        .eq('community_id', communityId);

      if (participantsError) throw participantsError;

      // コミュニティを削除
      const { error: communityError } = await supabase
        .from('communities')
        .delete()
        .eq('id', communityId);

      if (communityError) throw communityError;

      // 画面を更新（コミュニティ一覧のみを更新し、統計は保持）
      setCommunities(communities.filter(c => c.id !== communityId));
      setShowDeleteConfirm(null);
      alert('コミュニティを削除しました');

    } catch (error) {
      console.error('Error deleting community:', error);
      alert('コミュニティの削除に失敗しました');
    }
  };

  // コミュニティ更新処理
  const handleUpdateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCommunity) return;

    try {
      const { error } = await supabase
        .from('communities')
        .update({
          title: editingCommunity.title,
          description: editingCommunity.description,
          meeting_time: editingCommunity.meeting_time,
          end_time: editingCommunity.end_time,
          max_participants: editingCommunity.max_participants
        })
        .eq('id', editingCommunity.id);

      if (error) throw error;

      // 画面を更新
      setCommunities(communities.map(c => 
        c.id === editingCommunity.id ? editingCommunity : c
      ));
      setEditingCommunity(null);
      alert('コミュニティを更新しました');

    } catch (error) {
      console.error('Error updating community:', error);
      alert('コミュニティの更新に失敗しました');
    }
  };

  // フォロー/アンフォロー処理
  const handleFollowToggle = async () => {
    if (!user || !userId || user.id === userId) return;

    try {
      if (followStats.is_following) {
        // アンフォロー
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);

        if (error) throw error;
      } else {
        // フォロー
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: userId
          });

        if (error) throw error;
      }

      // 統計を更新
      await fetchFollowStats();
    } catch (error) {
      console.error('Error toggling follow:', error);
      alert('操作に失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-gray-600">プロフィールが見つかりません</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          ホームに戻る
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center text-gray-600 hover:text-gray-800"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          戻る
        </button>
        {user?.id === userId && (
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-blue-500 hover:text-blue-700"
          >
            {isEditing ? 'キャンセル' : 'プロフィールを編集'}
          </button>
        )}
      </div>

      {/* プロフィール情報 */}
      <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
        {isEditing ? (
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="flex items-center space-x-8">
              <div className="relative">
                <img
                  key={editForm.avatar_url}
                  src={editForm.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg'}
                  alt={editForm.username}
                  className="w-32 h-32 rounded-full object-cover bg-gray-100"
                />
                <label className="absolute bottom-0 right-0 bg-blue-500 text-white p-2 rounded-full cursor-pointer hover:bg-blue-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </label>
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">ユーザー名</label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">フルネーム</label>
                  <input
                    type="text"
                    value={editForm.full_name || ''}
                    onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">自己紹介</label>
              <textarea
                value={editForm.bio || ''}
                onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                rows={4}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                保存
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div className="flex items-start space-x-8">
              <img
                key={profile.avatar_url}
                src={profile.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg'}
                alt={profile.username}
                className="w-32 h-32 rounded-full object-cover bg-gray-100"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <h1 className="text-2xl font-bold">{profile.username}</h1>
                    {profile.full_name && (
                      <span className="text-gray-600">({profile.full_name})</span>
                    )}
                  </div>
                  {user && user.id !== userId && (
                    <button
                      onClick={handleFollowToggle}
                      className={`px-4 py-2 rounded-md text-sm font-medium ${
                        followStats.is_following
                          ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {followStats.is_following ? 'フォロー中' : 'フォローする'}
                    </button>
                  )}
                </div>
                <div className="flex space-x-8 mb-4">
                  <div>
                    <span className="font-bold">{stats.createdCount}</span>
                    <span className="text-gray-600 ml-2">作成したコミュニティ</span>
                  </div>
                  <div>
                    <span className="font-bold">{stats.participatingCount}</span>
                    <span className="text-gray-600 ml-2">参加中のコミュニティ</span>
                  </div>
                  <div>
                    <span className="font-bold">{followStats.followers_count}</span>
                    <span className="text-gray-600 ml-2">フォロワー</span>
                  </div>
                  <div>
                    <span className="font-bold">{followStats.following_count}</span>
                    <span className="text-gray-600 ml-2">フォロー中</span>
                  </div>
                </div>
                {profile.bio && (
                  <p className="text-gray-700 whitespace-pre-wrap">{profile.bio}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 作成したコミュニティ一覧 */}
      <div>
        <h2 className="text-xl font-bold mb-4">作成したコミュニティ</h2>
        {communities.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {communities.map(community => (
              <div key={community.id} className="bg-white rounded-lg shadow p-4">
                {editingCommunity?.id === community.id ? (
                  <form onSubmit={handleUpdateCommunity} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">タイトル</label>
                      <input
                        type="text"
                        value={editingCommunity.title}
                        onChange={(e) => setEditingCommunity({
                          ...editingCommunity,
                          title: e.target.value
                        })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">説明</label>
                      <textarea
                        value={editingCommunity.description}
                        onChange={(e) => setEditingCommunity({
                          ...editingCommunity,
                          description: e.target.value
                        })}
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">開始時間</label>
                        <input
                          type="datetime-local"
                          value={editingCommunity.meeting_time.slice(0, 16)}
                          onChange={(e) => setEditingCommunity({
                            ...editingCommunity,
                            meeting_time: e.target.value
                          })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">終了時間</label>
                        <input
                          type="datetime-local"
                          value={editingCommunity.end_time.slice(0, 16)}
                          onChange={(e) => setEditingCommunity({
                            ...editingCommunity,
                            end_time: e.target.value
                          })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">定員</label>
                      <input
                        type="number"
                        value={editingCommunity.max_participants}
                        onChange={(e) => setEditingCommunity({
                          ...editingCommunity,
                          max_participants: parseInt(e.target.value)
                        })}
                        min={1}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setEditingCommunity(null)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        キャンセル
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                      >
                        更新
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-lg mb-2">{community.title}</h3>
                      {user?.id === community.creator_id && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setEditingCommunity(community)}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(community.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            削除
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-gray-600 mb-2">{community.description}</p>
                    <div className="text-sm text-gray-500">
                      <p>開始: {formatDateTime(community.meeting_time)}</p>
                      <p>終了: {formatDateTime(community.end_time)}</p>
                      <p>定員: {community.max_participants}人</p>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">作成したコミュニティはありません</p>
        )}

        {/* 削除確認モーダル */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full">
              <h3 className="text-lg font-bold mb-4">コミュニティを削除しますか？</h3>
              <p className="text-gray-600 mb-4">この操作は取り消せません。</p>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={() => handleDeleteCommunity(showDeleteConfirm)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  削除
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 