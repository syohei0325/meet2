import { supabase } from './supabaseClient';

export const logError = async (
  error: Error,
  context: string,
  userId?: string
) => {
  try {
    await supabase
      .from('error_logs')
      .insert([{
        error_message: error.message,
        error_stack: error.stack,
        context,
        user_id: userId,
        created_at: new Date().toISOString()
      }]);
  } catch (e) {
    console.error('エラーログの保存に失敗:', e);
  }
}; 