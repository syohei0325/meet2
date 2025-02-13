import { supabase } from './supabaseClient';

export type NotificationType = 'message' | 'community_created' | 'community_joined';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  content: string;
  link?: string;
  senderId?: string;
  communityId?: string;
}

export const createNotification = async ({
  userId,
  type,
  content,
  link,
  senderId,
  communityId
}: CreateNotificationParams) => {
  const { error } = await supabase
    .from('notifications')
    .insert([
      {
        user_id: userId,
        type,
        content,
        link,
        sender_id: senderId,
        community_id: communityId
      }
    ]);

  if (error) throw error;
};

export const markNotificationAsRead = async (notificationId: string) => {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);

  if (error) throw error;
};

export const getUnreadNotifications = async () => {
  const { data, error } = await supabase
    .from('notifications')
    .select(`
      *,
      sender:sender_id(id, username, avatar_url),
      community:community_id(id, name)
    `)
    .eq('read', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}; 