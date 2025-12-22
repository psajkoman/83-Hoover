// types/discord.ts
export interface DiscordMember {
  id: string;
  username: string;
  display_name: string;
  discriminator: string;
  avatar: string | null;
  roles: string[];
  joined_at: string;
}

export interface DiscordRole {
  id: string;
  name: string;
  color: number;
  position: number;
  permissions: string;
  mentionable: boolean;
  hoist: boolean;
}

export type DiscordRoleMap = {
  [key: string]: DiscordRole;
};

export interface DiscordChannel {
  id: string;
  name: string;
  type: number;
  parent_id?: string;
  position: number;
}

export interface GuildData {
  members: DiscordMember[];
  roles: DiscordRole[];
  channels: DiscordChannel[];
  timestamp: string;
}