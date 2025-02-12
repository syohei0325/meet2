export const getAuthErrorMessage = (error: any): string => {
  const errorCode = error?.message || error?.code || error?.error_description;
  
  const errorMessages: { [key: string]: string } = {
    // Supabaseの認証エラー
    'Invalid login credentials': 'メールアドレスまたはパスワードが正しくありません',
    'Email not confirmed': 'メールアドレスが確認されていません。メールをご確認ください',
    'User already registered': 'このメールアドレスは既に登録されています',
    'Password should be at least 6 characters': 'パスワードは6文字以上である必要があります',
    'Invalid email': '有効なメールアドレスを入力してください',
    'Email rate limit exceeded': 'メールの送信回数が制限を超えました。しばらく待ってから再試行してください',
    
    // Google認証エラー
    'popup_closed_by_user': '認証がキャンセルされました',
    'popup_blocked_by_browser': 'ポップアップがブラウザによってブロックされました。ポップアップを許可してください',
    
    // その他のエラー
    'network_error': 'ネットワークエラーが発生しました。インターネット接続を確認してください',
    'timeout': '接続がタイムアウトしました。再度お試しください',
  };

  return errorMessages[errorCode] || 'エラーが発生しました。しばらく待ってから再度お試しください';
}; 