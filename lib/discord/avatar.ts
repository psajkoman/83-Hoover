export interface DiscordMember {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string | null;
  nickname?: string | null;
  joinedAt?: string;
  display_name?: string;
  roles?: string[];
  bot?: boolean;
}

export function getAvatarUrl(member: DiscordMember | undefined | null, size: number = 256): string | null {
  if (!member?.avatar) return null;
  
  const extension = member.avatar.startsWith('a_') ? '.gif' : '.png';
  return `https://cdn.discordapp.com/avatars/${member.id}/${member.avatar}${extension}?size=${size}`;
}

export function getDefaultAvatarUrl(discriminator: string): string {
  const defaultAvatarIndex = parseInt(discriminator) % 5;
  return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
}
