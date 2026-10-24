import type { Metadata } from "next";
import { credits } from "@/config/media";
export const metadata: Metadata = { title: "Policies & Credits" };
export default function PoliciesPage() {
  return (
    <article className="card prose-sm space-y-6 p-5 leading-relaxed">
      <header><h1 className="text-2xl">Policies</h1><p className="text-sm text-muted">Pebble is a demo platform. All seeded users, posts, photos and messages are fictional test data.</p></header>
      <section><h2 className="text-lg">Community guidelines</h2><ul className="list-disc space-y-1 pl-5 text-sm"><li>Be kind. No harassment, hate, or threats.</li><li>No spam, scams, or unlabeled promotions.</li><li>Only share what you have the right to share. Credit photographers.</li><li>Respect privacy: no doxxing, no sharing private messages.</li><li>You must be at least 16 (or the age of digital consent where you live).</li></ul></section>
      <section><h2 className="text-lg">Moderation & appeals</h2><p className="text-sm">Reports are reviewed by humans. If your content is removed you'll be told exactly why and can appeal from the post itself. Every moderation action is recorded in an audit log.</p></section>
      <section><h2 className="text-lg">Privacy</h2><p className="text-sm">You can export all of your data as JSON and delete your account (14-day grace period) from Settings → Data. Private accounts, blocks and private circles are enforced on every feed, search, notification and real-time event.</p></section>
      <section id="credits"><h2 className="text-lg">Credits</h2><ul className="space-y-1 text-sm">{credits.map((c) => <li key={c.name}><a className="font-semibold text-coral-deep hover:underline dark:text-peach" href={c.url}>{c.name}</a> — {c.license}</li>)}</ul></section>
    </article>
  );
}
