import React, { useState } from 'react';
import { uploadImage } from '../utils/uploadImage';
import { supabase } from '../utils/supabaseClient';

interface ProfileEditProps {
  onUpdate?: (url: string) => void;
}

export default function ProfileEdit({ onUpdate }: ProfileEditProps) {
  const [imageUrl, setImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;

    try {
      setIsUploading(true);
      const file = e.target.files[0];
      
      console.log('選択されたファイル:', {
        name: file.name,
        size: file.size,
        type: file.type
      });

      // 古い画像の削除（オプション）
      if (imageUrl) {
        const oldFilePath = imageUrl.split('/').pop();
        if (oldFilePath) {
          await supabase.storage
            .from('avatars')
            .remove([oldFilePath]);
        }
      }

      const url = await uploadImage(file);
      console.log('アップロード後のURL:', url);
      setImageUrl(url);

      const { data: { user } } = await supabase.auth.getUser();
      console.log('現在のユーザー:', user);

      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ avatar_url: url })
          .eq('id', user.id);

        if (error) {
          console.error('プロフィール更新エラー:', error);
          throw error;
        }
        
        console.log('プロフィール更新成功');
        onUpdate?.(url);
      }
    } catch (error) {
      console.error('画像アップロードに失敗しました:', error);
      // エラーメッセージをユーザーに表示
      alert(error instanceof Error ? error.message : '画像のアップロードに失敗しました');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">
          プロフィール画像
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="mt-1 block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-violet-50 file:text-violet-700
            hover:file:bg-violet-100"
        />
        {isUploading && <p className="mt-2 text-sm text-gray-500">アップロード中...</p>}
        {imageUrl && (
          <img
            src={imageUrl}
            alt="プロフィール画像"
            className="w-32 h-32 rounded-full object-cover mt-2"
          />
        )}
      </div>
      {/* 他のプロフィール編集フィールド */}
    </div>
  );
} 