const HIDDEN_CONVERSATIONS_KEY = 'xmtp-hidden-conversations';

export interface HiddenConversation {
  topic: string;
  peerAddress: string;
  hiddenAt: string;
}

export const xmtpConversationManager = {
  getHiddenConversations(): HiddenConversation[] {
    try {
      const stored = localStorage.getItem(HIDDEN_CONVERSATIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading hidden conversations:', error);
      return [];
    }
  },

  hideConversation(topic: string, peerAddress: string): void {
    try {
      const hidden = this.getHiddenConversations();
      const newHidden: HiddenConversation = {
        topic,
        peerAddress,
        hiddenAt: new Date().toISOString()
      };
      
      // Don't add duplicates
      if (!hidden.find(h => h.topic === topic)) {
        hidden.push(newHidden);
        localStorage.setItem(HIDDEN_CONVERSATIONS_KEY, JSON.stringify(hidden));
      }
    } catch (error) {
      console.error('Error hiding conversation:', error);
    }
  },

  unhideConversation(topic: string): void {
    try {
      const hidden = this.getHiddenConversations();
      const filtered = hidden.filter(h => h.topic !== topic);
      localStorage.setItem(HIDDEN_CONVERSATIONS_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error unhiding conversation:', error);
    }
  },

  isConversationHidden(topic: string): boolean {
    const hidden = this.getHiddenConversations();
    return hidden.some(h => h.topic === topic);
  },

  clearHiddenConversations(): void {
    try {
      localStorage.removeItem(HIDDEN_CONVERSATIONS_KEY);
    } catch (error) {
      console.error('Error clearing hidden conversations:', error);
    }
  }
};
