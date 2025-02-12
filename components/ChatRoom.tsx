interface ChatMessage {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  } | null;
}

// メッセージの型定義
const handleNewMessage = (newMessage: any) => {
  const formattedMessage: ChatMessage = {
    id: newMessage.id,
    content: newMessage.content,
    user_id: newMessage.user_id,
    created_at: newMessage.created_at,
    profiles: newMessage.profiles
  };
  
  setMessages(current => [...current, formattedMessage]);
}; 