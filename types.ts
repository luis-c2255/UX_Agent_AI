
export interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
}

export interface GroundingSource {
    uri: string;
    title: string;
}
