import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface ChatMessage {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string;
  };
}

interface ChatRoomProps {
  communityId: string;
  onClose: () => void;
}

export const ChatRoom = ({ communityId, onClose }: ChatRoomProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  // メッセージを取得
  useEffect(() => {
    let subscription: any;

    const fetchMessages = async () => {
      try {
        setIsLoading(true);

        // まず参加時刻を取得
        const { data: participantData, error: participantError } = await supabase
          .from('community_participants')
          .select('joined_at')
          .eq('community_id', communityId)
          .eq('user_id', user?.id)
          .single();

        if (participantError) throw participantError;

        // 参加時刻以降のメッセージのみを取得
        const { data: existingMessages, error: fetchError } = await supabase
          .from('chat_messages')
          .select(`
            *,
            profiles:user_id (username, avatar_url)
          `)
          .eq('community_id', communityId)
          .gte('created_at', participantData.joined_at) // 参加時刻以降のメッセージのみ
          .order('created_at', { ascending: true });

        if (fetchError) throw fetchError;
        setMessages(existingMessages || []);
        setIsLoading(false);

        // リアルタイム購読を設定
        subscription = supabase
          .channel(`chat:${communityId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'chat_messages',
              filter: `community_id=eq.${communityId}`
            },
            async (payload) => {
              // 参加時刻以降のメッセージのみを表示
              if (new Date(payload.new.created_at) >= new Date(participantData.joined_at)) {
                const { data: userData } = await supabase
                  .from('profiles')
                  .select('username, avatar_url')
                  .eq('id', payload.new.user_id)
                  .single();

                const newMessage = {
                  ...payload.new,
                  profiles: userData
                };

                setMessages(current => [...current, newMessage]);
              }
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(subscription);
        };
      } catch (error) {
        console.error('Error fetching messages:', error);
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [communityId, user?.id]);

  // 新しいメッセージが追加されたら自動スクロール
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    };

    scrollToBottom();
    // メッセージが更新されるたびにスクロール
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const messageContent = newMessage.trim();
    setNewMessage(''); // 即座に入力欄をクリア

    try {
      // 楽観的更新：メッセージを即座に表示
      const tempMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        content: messageContent,
        user_id: user.id,
        created_at: new Date().toISOString(),
        profiles: {
          username: user.email?.split('@')[0] || 'ユーザー',
          avatar_url: null
        }
      };
      setMessages(current => [...current, tempMessage]);

      // 実際のメッセージ送信
      const { error } = await supabase.from('chat_messages').insert([
        {
          community_id: communityId,
          user_id: user.id,
          content: messageContent
        }
      ]);

      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
      alert('メッセージの送信に失敗しました');
      // エラー時にメッセージを元に戻す
      setMessages(current => current.filter(msg => !msg.id.startsWith('temp-')));
    }
  };

  // メッセージの時間をフォーマット
  const formatMessageTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm', { locale: ja });
  };

  // デフォルトのアバター画像URL
  const getAvatarUrl = (profileAvatarUrl: string | null) => {
    return profileAvatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg';
  };

  if (isLoading) {
    return (
      <div className="fixed bottom-4 right-4 w-96 h-[500px] bg-white rounded-lg shadow-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[500px] bg-gray-100 rounded-lg shadow-lg flex flex-col">
      {/* ヘッダー */}
      <div className="p-4 bg-green-500 text-white rounded-t-lg flex justify-between items-center">
        <h3 className="font-bold">チャット</h3>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => {
          const isMyMessage = message.user_id === user?.id;
          const showAvatar = !isMyMessage && 
            (index === 0 || messages[index - 1].user_id !== message.user_id);

          return (
            <div key={message.id} className="flex flex-col space-y-1">
              {!isMyMessage && showAvatar && (
                <div className="flex items-center space-x-2">
                  <img
                    src={getAvatarUrl(message.profiles?.avatar_url)}
                    alt={message.profiles?.username}
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="text-sm text-gray-600">
                    {message.profiles?.username}
                  </span>
                </div>
              )}
              <div
                className={`flex items-end space-x-2 ${
                  isMyMessage ? 'justify-end' : 'justify-start'
                }`}
              >
                {!isMyMessage && !showAvatar && (
                  <div className="w-8" /> // アバターのスペース
                )}
                <div className="flex items-end space-x-1">
                  {!isMyMessage && (
                    <span className="text-xs text-gray-500 self-end mb-1">
                      {formatMessageTime(message.created_at)}
                    </span>
                  )}
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      isMyMessage
                        ? 'bg-green-500 text-white rounded-br-none'
                        : 'bg-white rounded-bl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  </div>
                  {isMyMessage && (
                    <span className="text-xs text-gray-500 self-end mb-1">
                      {formatMessageTime(message.created_at)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* メッセージ入力 */}
      <form onSubmit={handleSendMessage} className="p-4 bg-white rounded-b-lg">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="メッセージを入力..."
            className="flex-1 rounded-full border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            type="submit"
            className="bg-green-500 text-white rounded-full p-2 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}; 