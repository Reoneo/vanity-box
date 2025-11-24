const HIDDEN_CONVERSATIONS_KEY = 'push-hidden-conversations';

export interface HiddenConversation {
  chatId: string;
  peerAddress: string;
  hiddenAt: string;
}

export const pushConversationManager = {
  getHiddenConversations(): HiddenConversation[] {
    try {
      const stored = localStorage.getItem(HIDDEN_CONVERSATIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading hidden conversations:', error);
      return [];
    }
  },

  hideConversation(chatId: string, peerAddress: string): void {
    try {
      const hidden = this.getHiddenConversations();
      const newHidden: HiddenConversation = {
        chatId,
        peerAddress,
        hiddenAt: new Date().toISOString()
      };
      
      // Don't add duplicates
      if (!hidden.find(h => h.chatId === chatId)) {
        hidden.push(newHidden);
        localStorage.setItem(HIDDEN_CONVERSATIONS_KEY, JSON.stringify(hidden));
      }
    } catch (error) {
      console.error('Error hiding conversation:', error);
    }
  },

  unhideConversation(chatId: string): void {
    try {
      const hidden = this.getHiddenConversations();
      const filtered = hidden.filter(h => h.chatId !== chatId);
      localStorage.setItem(HIDDEN_CONVERSATIONS_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error unhiding conversation:', error);
    }
  },

  isConversationHidden(chatId: string): boolean {
    const hidden = this.getHiddenConversations();
    return hidden.some(h => h.chatId === chatId);
  },

  clearHiddenConversations(): void {
    try {
      localStorage.removeItem(HIDDEN_CONVERSATIONS_KEY);
    } catch (error) {
      console.error('Error clearing hidden conversations:', error);
    }
  }
};
