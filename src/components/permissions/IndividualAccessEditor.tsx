import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, User } from 'lucide-react';
import { PermissionType, PermissionRule, GuildMember } from '@/hooks/useGuildPermissions';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface IndividualAccessEditorProps {
  permissions: PermissionRule[];
  members: GuildMember[];
  permissionTypes: { type: PermissionType; label: string }[];
  onChange: (permissions: PermissionRule[]) => void;
}

interface UserPermissions {
  userId: string;
  username: string;
  permissions: PermissionType[];
}

export const IndividualAccessEditor = ({
  permissions,
  members,
  permissionTypes,
  onChange,
}: IndividualAccessEditorProps) => {
  const { t } = useLanguage();
  const isFrench = t.common.loading === 'Chargement...';
  const [showAddUser, setShowAddUser] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  // Group permissions by user
  const userRules = permissions.filter(p => p.access_type === 'user');
  const rankRules = permissions.filter(p => p.access_type === 'rank');
  
  const userPermissionsMap = new Map<string, Set<PermissionType>>();
  userRules.forEach(rule => {
    if (rule.user_id) {
      if (!userPermissionsMap.has(rule.user_id)) {
        userPermissionsMap.set(rule.user_id, new Set());
      }
      userPermissionsMap.get(rule.user_id)!.add(rule.permission_type);
    }
  });
  
  const usersWithPermissions: UserPermissions[] = Array.from(userPermissionsMap.entries()).map(([userId, permsSet]) => {
    const member = members.find(m => m.user_id === userId);
    return {
      userId,
      username: member?.username || 'Unknown',
      permissions: Array.from(permsSet),
    };
  });

  // Users not yet added
  const availableUsers = members.filter(m => !userPermissionsMap.has(m.user_id));

  const handleAddUser = () => {
    if (!selectedUserId) return;
    
    // Add user with first permission type by default
    const newPermission: PermissionRule = {
      permission_type: permissionTypes[0].type,
      access_type: 'user',
      user_id: selectedUserId,
    };
    
    onChange([...permissions, newPermission]);
    setSelectedUserId('');
    setShowAddUser(false);
  };

  const handleRemoveUser = (userId: string) => {
    onChange(permissions.filter(p => !(p.access_type === 'user' && p.user_id === userId)));
  };

  const handleTogglePermission = (userId: string, permType: PermissionType, checked: boolean) => {
    if (checked) {
      // Add permission
      const newPermission: PermissionRule = {
        permission_type: permType,
        access_type: 'user',
        user_id: userId,
      };
      onChange([...permissions, newPermission]);
    } else {
      // Remove permission
      const filtered = permissions.filter(p => 
        !(p.access_type === 'user' && p.user_id === userId && p.permission_type === permType)
      );
      // If no more permissions for this user, they'll naturally disappear
      onChange(filtered);
    }
  };

  if (usersWithPermissions.length === 0 && !showAddUser) {
    return (
      <div className="border border-dashed border-border/50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {isFrench 
                ? 'Aucun accès individuel défini' 
                : 'No individual access defined'}
            </p>
            <p className="text-xs text-muted-foreground/70">
              {isFrench 
                ? 'Ajoutez des utilisateurs spécifiques pour leur donner des permissions supplémentaires' 
                : 'Add specific users to give them additional permissions'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddUser(true)}
            className="gap-1.5"
            disabled={availableUsers.length === 0}
          >
            <Plus className="h-3.5 w-3.5" />
            {isFrench ? 'Ajouter' : 'Add'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header with add button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <User className="h-3 w-3" />
          <span>{isFrench ? 'Accès individuels' : 'Individual access'}</span>
          {usersWithPermissions.length > 0 && (
            <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
              {usersWithPermissions.length}
            </span>
          )}
        </div>
        {!showAddUser && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAddUser(true)}
            className="h-6 text-xs gap-1"
            disabled={availableUsers.length === 0}
          >
            <Plus className="h-3 w-3" />
            {isFrench ? 'Ajouter' : 'Add'}
          </Button>
        )}
      </div>

      {/* Add user form */}
      {showAddUser && (
        <div className="flex items-center gap-2 p-2 border border-border/50 rounded-md bg-muted/20">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="flex-1 h-8 text-xs bg-card border-border">
              <SelectValue placeholder={isFrench ? 'Sélectionner un membre...' : 'Select a member...'} />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {availableUsers.map(member => (
                <SelectItem key={member.user_id} value={member.user_id} className="text-xs">
                  {member.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={handleAddUser}
            disabled={!selectedUserId}
            className="h-8 text-xs"
          >
            {isFrench ? 'Ajouter' : 'Add'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setShowAddUser(false); setSelectedUserId(''); }}
            className="h-8 text-xs"
          >
            {isFrench ? 'Annuler' : 'Cancel'}
          </Button>
        </div>
      )}

      {/* Users list */}
      {usersWithPermissions.map(user => (
        <div 
          key={user.userId} 
          className="flex items-center gap-3 p-2 border border-border/30 rounded-md bg-card/50"
        >
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
              {user.username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.username}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
              {permissionTypes.map(({ type, label }) => (
                <label 
                  key={type} 
                  htmlFor={`perm-${user.userId}-${type}`}
                  className="flex items-center gap-1.5 cursor-pointer"
                >
                  <Checkbox
                    id={`perm-${user.userId}-${type}`}
                    name={`perm-${user.userId}-${type}`}
                    checked={user.permissions.includes(type)}
                    onCheckedChange={(checked) => handleTogglePermission(user.userId, type, !!checked)}
                    className="h-3 w-3"
                  />
                  <span className="text-[10px] text-muted-foreground">{label}</span>
                </label>
              ))}
            </div>
          </div>
          
          <button
            onClick={() => handleRemoveUser(user.userId)}
            className="p-1.5 rounded hover:bg-destructive/10 transition-colors flex-shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </button>
        </div>
      ))}
    </div>
  );
};