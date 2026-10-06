export const GAME_CREATOR_BADGE_ID = "game-creator";

export interface CommunityAward {
  badgeId: typeof GAME_CREATOR_BADGE_ID;
  gameId: string;
  awardedAt: string;
}

export interface CommunityNotification {
  id: string;
  kind: "game-published";
  gameId: string;
  createdAt: string;
  readAt: string | null;
}

export interface CommunityRewards {
  configured: boolean;
  awards: CommunityAward[];
  notifications: CommunityNotification[];
}
