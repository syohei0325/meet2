import { supabase } from './supabaseClient';

export const uploadImage = async (file: File) => {
  try {
    // ファイル名をユニークに生成
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
    const filePath = fileName; // avatarsバケットに直接保存

    // ファイルの検証
    if (file.size > 2 * 1024 * 1024) {
      throw new Error('ファイルサイズは2MB以下にしてください');
    }

    if (!file.type.match(/^image\/(jpeg|png|gif)$/)) {
      throw new Error('JPG、PNG、GIF形式のみ対応しています');
    }

    console.log('アップロード開始:', filePath);

    // avatarsバケットに保存
    const { error: uploadError, data } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('アップロードエラー:', uploadError);
      throw uploadError;
    }

    console.log('アップロード成功:', data);

    // 公開URLを取得
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    console.log('公開URL:', urlData.publicUrl);

    return urlData.publicUrl;
  } catch (error) {
    console.error('画像アップロードエラー:', error);
    throw error;
  }
}; 