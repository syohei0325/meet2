import { supabase } from './supabaseClient';

export const updateUserLocation = async (latitude: number, longitude: number) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .rpc('update_user_location', {
        user_id: user.id,
        lat: latitude,
        lng: longitude
      });

    if (error) throw error;
  } catch (error) {
    console.error('位置情報の更新に失敗:', error);
    throw error;
  }
}; 