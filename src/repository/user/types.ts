export interface User {
  id: string;
  username: string; // Discord-wide username
  displayName: string | null; // Guild-specific username
  avatarUrl: string | null;
}

export interface UserDbo extends User {
  // Allows querying all users in a given guild
  pk1: `guild#${string}`;
  sk1: `user#${User["id"]}`;
}
