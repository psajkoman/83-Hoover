export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  nickname?: string | null;
}

export interface PKEntry {
  id: string;
  player_name: string;
  faction: 'FRIEND' | 'ENEMY';
  discord_id: string | null;
  kill_count: number;
  last_killed_at: string;
  added_via: string;
  added_by_user: {
    username: string;
    discord_id: string;
  };
  discord_user?: DiscordUser | null;
}

export interface War {
  id: string;
  enemy_faction: string;
  status: 'PENDING' | 'ACTIVE' | 'ENDED' | 'CANCELLED';
  started_at: string;
  ended_at: string | null;
  war_type: string;
  war_level?: string;
  regulations: any;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string | null;
}

export interface WarLog {
  id: string;
  date_time: string;
  log_type: 'ATTACK' | 'DEFENSE' | 'OTHER';
  members_involved: string[];
  friends_involved: string[];
  players_killed: string[];
  notes: string | null;
  evidence_url: string | null;
  submitted_by: string;
  edited_by: string | null;
  edited_at: string | null;
  created_at: string;
  submitted_by_user: {
    username: string;
    discord_id: string;
    avatar: string | null;
  };
  edited_by_user?: {
    username: string;
    discord_id: string;
    avatar: string | null;
  } | null;
}

export interface WarStats {
  logCounts: Record<string, number>;
  topDeaths: Array<[string, number]>;
  topSubmitters: Array<[string, number]>;
  winner: 'FRIEND' | 'ENEMY' | 'DRAW';
  friendKills: number;
  enemyKills: number;
}
