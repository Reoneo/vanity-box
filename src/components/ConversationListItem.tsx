import { useState, useRef, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConversationListItemProps {
  conversation: {
    id: string;
    peerAddress: string;
    lastMessage?: string;
    timestamp?: string;
    unreadCount?: number;
  };
  isSelected: boolean;
  onClick: () => void;
  onDelete: () => void;
}

export const ConversationListItem = ({
  conversation,
  isSelected,
  onClick,
  onDelete
}: ConversationListItemProps) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const DELETE_BUTTON_WIDTH = 80;
  const SWIPE_THRESHOLD = 60;

  useEffect(() => {
    // Reset swipe when conversation changes
    setSwipeOffset(0);
  }, [conversation.id]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;

    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const deltaX = touchStartX.current - touchX;
    const deltaY = Math.abs(touchStartY.current - touchY);

    // Only swipe if horizontal movement is dominant
    if (deltaY > 30) {
      // Too much vertical movement, cancel swipe
      setIsDragging(false);
      return;
    }

    // Only allow left swipe (positive deltaX)
    if (deltaX > 0) {
      const newOffset = Math.min(deltaX, DELETE_BUTTON_WIDTH);
      setSwipeOffset(newOffset);
    } else {
      setSwipeOffset(0);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);

    if (swipeOffset >= SWIPE_THRESHOLD) {
      // Snap to show delete button
      setSwipeOffset(DELETE_BUTTON_WIDTH);
    } else {
      // Snap back to closed
      setSwipeOffset(0);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  const handleContainerClick = () => {
    if (swipeOffset > 0) {
      // If swiped, close it
      setSwipeOffset(0);
    } else {
      // Otherwise, select conversation
      onClick();
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Delete button - positioned behind */}
      <div
        className="absolute right-0 top-0 bottom-0 flex items-center justify-center bg-destructive"
        style={{
          width: `${DELETE_BUTTON_WIDTH}px`,
          zIndex: 1
        }}
      >
        <button
          onClick={handleDeleteClick}
          className="h-full w-full flex items-center justify-center text-destructive-foreground hover:bg-destructive/90 transition-colors"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      {/* Conversation content - slides left to reveal delete */}
      <div
        className={cn(
          "relative bg-background border-b border-border p-4 cursor-pointer transition-colors hover:bg-accent/50",
          isSelected && "bg-accent"
        )}
        style={{
          transform: `translateX(-${swipeOffset}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
          zIndex: 2
        }}
        onClick={handleContainerClick}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium truncate">
                {conversation.peerAddress.slice(0, 6)}...{conversation.peerAddress.slice(-4)}
              </p>
              {conversation.unreadCount && conversation.unreadCount > 0 && (
                <span className="flex-shrink-0 h-5 min-w-[20px] px-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-full flex items-center justify-center">
                  {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                </span>
              )}
            </div>
            {conversation.lastMessage && (
              <p className="text-xs text-muted-foreground truncate">
                {conversation.lastMessage}
              </p>
            )}
          </div>
          {conversation.timestamp && (
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {new Date(conversation.timestamp).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
