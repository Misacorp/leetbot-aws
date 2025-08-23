export interface User {
  id: string;
  username: string; // Discord-wide username
  displayName: string | null; // Guild-specific username
  avatarUrl: string | null;
}

export interface UserDbo extends User {
  pk1: `user#${User["id"]}`;
  sk1: `guild#${string}`;
}
