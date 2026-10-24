import type { NotificationType } from "@/db/schema";

export type NotifActor = { id: string; username: string; displayName: string; avatarUrl: string };
export type NotifRow = {
  id: string;
  type: NotificationType;
  postId: string | null;
  commentId: string | null;
  meta: Record<string, string> | null;
  read: boolean;
  createdAt: Date;
  actor: NotifActor | null;
};
export type NotifGroup = {
  key: string;
  type: NotificationType;
  postId: string | null;
  actors: NotifActor[];
  count: number;
  read: boolean;
  latest: Date;
  ids: string[];
  meta: Record<string, string> | null;
};

/**
 * Groups notifications of the same type on the same target within a 24h window
 * so the UI can render "Maya and 5 others reacted to your post".
 */
export function groupNotifications(rows: NotifRow[]): NotifGroup[] {
  const groups: NotifGroup[] = [];
  const groupable: NotificationType[] = ["reaction", "comment", "follow", "story_view", "repost"];
  for (const n of rows) {
    const bucket = Math.floor(new Date(n.createdAt).getTime() / 86_400_000);
    const key = groupable.includes(n.type) ? `${n.type}:${n.postId ?? "none"}:${bucket}` : n.id;
    let g = groups.find((x) => x.key === key);
    if (!g) {
      g = { key, type: n.type, postId: n.postId, actors: [], count: 0, read: true, latest: n.createdAt, ids: [], meta: n.meta };
      groups.push(g);
    }
    if (n.actor && !g.actors.some((a) => a.id === n.actor!.id)) g.actors.push(n.actor);
    g.count += 1;
    g.ids.push(n.id);
    if (!n.read) g.read = false;
    if (new Date(n.createdAt) > new Date(g.latest)) g.latest = n.createdAt;
  }
  return groups.sort((a, b) => new Date(b.latest).getTime() - new Date(a.latest).getTime());
}

export function groupLabel(g: NotifGroup) {
  const names = g.actors.map((a) => a.displayName);
  const who = names.length === 0 ? "Someone" : names.length === 1 ? names[0] : names.length === 2 ? `${names[0]} and ${names[1]}` : `${names[0]} and ${names.length - 1} others`;
  switch (g.type) {
    case "reaction":
      return `${who} reacted to your post`;
    case "comment":
      return `${who} commented on your post`;
    case "mention":
      return `${who} mentioned you`;
    case "follow":
      return `${who} started following you`;
    case "follow_request":
      return `${who} requested to follow you`;
    case "follow_accepted":
      return `${who} accepted your follow request`;
    case "poll_ended":
      return `Your poll has ended — see the results`;
    case "story_view":
      return `${who} viewed your story`;
    case "repost":
      return `${who} reposted your post`;
    case "moderation":
      return g.meta?.message ?? "A moderation update on your content";
    default:
      return "New activity";
  }
}
