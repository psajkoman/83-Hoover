export interface DiscordRole {
  id: string;
  name: string;
  color: number;
  position: number;
  permissions: string;
  hoist: boolean;
  mentionable: boolean;
}

export interface DiscordRoleMap {
  [key: string]: DiscordRole;
}
