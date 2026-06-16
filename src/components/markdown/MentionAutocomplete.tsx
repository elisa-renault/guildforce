import { useState, useEffect, useCallback, useRef } from 'react';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { User } from 'lucide-react';

interface MentionUser {
  id: string;
  username: string;
  avatar_url: string | null;
}

interface MentionAutocompleteProps {
  query: string;
  position: { top: number; left: number };
  onSelect: (username: string) => void;
  onClose: () => void;
}

export const MentionAutocomplete = ({
  query,
  position,
  onSelect,
  onClose,
}: MentionAutocompleteProps) => {
  const { t } = useLanguage();
  const [users, setUsers] = useState<MentionUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Search users when query changes
  useEffect(() => {
    if (query.length < 1) {
      setUsers([]);
      return;
    }

    const searchUsers = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .ilike('username', `%${query}%`)
          .limit(5);
        
        setUsers(data || []);
        setSelectedIndex(0);
      } catch (error) {
        // Search error handled silently
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchUsers, 150);
    return () => clearTimeout(debounce);
  }, [query]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (users.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => (i + 1) % users.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => (i - 1 + users.length) % users.length);
        break;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        if (users[selectedIndex]) {
          onSelect(users[selectedIndex].username);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [users, selectedIndex, onSelect, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (users.length === 0 && !loading) return null;

  return (
    <div
      ref={containerRef}
      className="absolute z-50 bg-card border border-border rounded-lg shadow-lg overflow-hidden min-w-[200px]"
      style={{ top: position.top, left: position.left }}
    >
      {loading ? (
        <div className="px-3 py-2 text-sm text-muted-foreground">
          {t.common.loading}...
        </div>
      ) : (
        <ul className="py-1">
          {users.map((user, index) => (
            <li
              key={user.id}
              className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                index === selectedIndex ? 'bg-primary/20' : 'hover:bg-muted/50'
              }`}
              onClick={() => onSelect(user.username)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <Avatar className="h-6 w-6">
                {user.avatar_url ? (
                  <AvatarImage src={user.avatar_url} alt={user.username} />
                ) : (
                  <AvatarFallback className="bg-primary/20 text-primary text-xs">
                    <User className="h-3 w-3" />
                  </AvatarFallback>
                )}
              </Avatar>
              <span className="text-sm font-medium">@{user.username}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// Helper to render mentions in markdown content
export const renderMentions = (content: string): string => {
  // Replace @username with a styled span (handled in markdown rendering)
  return content.replace(
    /@(\w+)/g,
    '**[@$1](/profile/$1)**'
  );
};
