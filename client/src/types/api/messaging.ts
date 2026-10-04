export type MessagingMessage = {
  id: number;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_own: boolean;
};

export type MessagingConversation = {
  id: string;
  my_role: "guest" | "host";
  hebergement: {
    id: string;
    name: string;
    city: string;
    image_url: string;
  } | null;
  other_participant: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  } | null;
  last_message: MessagingMessage | null;
  unread_count: number;
  last_message_at: string;
};
