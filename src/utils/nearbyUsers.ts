import { supabase } from './supabaseClient';

interface NearbyUsersOptions {
  latitude: number;
  longitude: number;
  radius: number;  // メートル単位
  status_type?: string;  // オプショナル：特定のステータスのみ検索
}

export const findNearbyUsers = async ({
  latitude,
  longitude,
  radius,
  status_type
}: NearbyUsersOptions) => {
  try {
    let query = supabase
      .rpc('nearby_users', {
        lat: latitude,
        lng: longitude,
        radius_meters: radius
      })
      .select(`
        id,
        username,
        avatar_url,
        status,
        status_type,
        distance
      `)
      .neq('id', (await supabase.auth.getUser()).data.user?.id) // 自分以外
      .gt('status_expires_at', new Date().toISOString()); // アクティブなステータスのみ

    if (status_type) {
      query = query.eq('status_type', status_type);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('近くのユーザー検索に失敗:', error);
    throw error;
  }
}; 