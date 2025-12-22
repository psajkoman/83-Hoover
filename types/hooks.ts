import { DiscordMember, DiscordRole, DiscordChannel } from './discord';

export interface GuildData {
  members: DiscordMember[];
  roles: DiscordRole[];
  channels: DiscordChannel[];
  timestamp: string;
}

export interface UseGuildDataReturn {
  data: GuildData | null;
  isLoading: boolean;
  error: Error | null;
  getMemberRoles: (member: DiscordMember) => DiscordRole[];
  getRoleById: (id: string) => DiscordRole | undefined;
  refetch: () => Promise<void>;
}
