/**
 * Pebble seed — ALL DATA IS FICTIONAL. Names, handles, bios and messages are invented.
 * Run: npx tsx src/db/seed.ts   (also auto-runs on first boot when the users table is empty)
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { db } from "./index";
import * as s from "./schema";
import { media } from "../config/media";
import { INTERESTS } from "../config/site";
import { parseHashtags } from "../lib/utils";

// Deterministic RNG so the demo looks the same on every machine
let seedState = 42;
const rnd = () => {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296;
  return seedState / 4294967296;
};
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)];
const shuffle = <T>(arr: T[]) => [...arr].sort(() => rnd() - 0.5);
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);
const daysAgo = (d: number) => hoursAgo(d * 24);

const USERS: Array<{ username: string; name: string; bio: string; role?: s.Role; isPrivate?: boolean; style: string; interests: string[] }> = [
  { username: "maya_draws", name: "Maya Linden", bio: "Sketchbook person. Coffee first, lines second. 🎨", style: "notionists", interests: ["art", "coffee", "books"] },
  { username: "juno_quiet", name: "Juno Park", bio: "Private garden of thoughts. Plants, film photos, quiet mornings.", isPrivate: true, style: "lorelei", interests: ["plants", "film", "photography"] },
  { username: "sol_mod", name: "Sol Rivera", bio: "Community moderator for Pebble. Here to keep things kind.", role: "moderator", style: "adventurer", interests: ["music", "hiking"] },
  { username: "ada_admin", name: "Ada Okafor", bio: "Pebble admin. Building a calmer corner of the internet.", role: "admin", style: "notionists", interests: ["tech", "design"] },
  { username: "theo_trails", name: "Theo Marsh", bio: "Weekend hiker, weekday desk gremlin. ⛰️", style: "adventurer", interests: ["hiking", "travel", "photography"] },
  { username: "pip_bakes", name: "Pip Castellano", bio: "Sourdough experiments and street food maps.", style: "fun-emoji", interests: ["food", "travel"] },
  { username: "noor_reads", name: "Noor Haddad", bio: "Reading 3 books at once, finishing none. 📚", style: "lorelei", interests: ["books", "coffee", "film"] },
  { username: "kit_synth", name: "Kit Alvarez", bio: "Bedroom producer. Synths, pads, late nights.", style: "thumbs", interests: ["music", "tech"] },
  { username: "remy_film", name: "Remy Dubois", bio: "35mm only. Light is the subject.", style: "notionists", interests: ["film", "photography", "art"] },
  { username: "ines_plants", name: "Inés Moreno", bio: "Plant parent to 47 green roommates. 🌿", style: "lorelei", interests: ["plants", "design"] },
  { username: "ozzie_dog", name: "Ozzie Bennett", bio: "Dog dad to Biscuit. Park reviews and zoomies.", style: "fun-emoji", interests: ["pets", "hiking"] },
  { username: "lila_desk", name: "Lila Nakamura", bio: "Desk setups, keyboards, and tidy cables.", style: "thumbs", interests: ["tech", "design", "gaming"] },
  { username: "basil_beach", name: "Basil Thorne", bio: "Golden hour chaser. Salt in everything.", style: "adventurer", interests: ["travel", "photography"] },
  { username: "wren_writes", name: "Wren Adeyemi", bio: "Short stories, long walks.", style: "notionists", interests: ["books", "art"] },
  { username: "cass_coffee", name: "Cass Lindqvist", bio: "Pour-over evangelist. Journal every morning.", style: "lorelei", interests: ["coffee", "books"] },
  { username: "dev_dunes", name: "Dev Raman", bio: "Climbing, cooking, and the occasional sunrise.", style: "adventurer", interests: ["fitness", "food", "hiking"] },
  { username: "fern_fits", name: "Fern Olsen", bio: "Morning runs + evening stretches. Gentle fitness only.", style: "thumbs", interests: ["fitness", "music"] },
  { username: "gus_games", name: "Gus Petrov", bio: "Cozy games and board game nights. 🎲", style: "bottts-neutral", interests: ["gaming", "tech"] },
  { username: "hana_art", name: "Hana Kowalski", bio: "Ceramics studio on weekends. Glaze chemistry nerd.", style: "notionists", interests: ["art", "design"] },
  { username: "ivo_city", name: "Ivo Santos", bio: "Rooftops, trams and neon. City walker.", style: "adventurer", interests: ["photography", "travel", "music"] },
  { username: "mila_meals", name: "Mila Brandt", bio: "Meal prep but make it fun.", style: "fun-emoji", interests: ["food", "fitness"] },
  { username: "otis_owl", name: "Otis Fairweather", bio: "Night owl. Astronomy app addict. 🌙", style: "bottts-neutral", interests: ["tech", "photography"] },
  { username: "ruby_rides", name: "Ruby Chen", bio: "Bike commuter. Tiny bakery radar.", style: "lorelei", interests: ["fitness", "food", "travel"] },
  { username: "sami_sound", name: "Sami Khoury", bio: "Concert crowd photos & setlists.", style: "thumbs", interests: ["music", "photography"] },
  { username: "tova_tea", name: "Tova Eriksen", bio: "Tea over coffee. Fight me (kindly).", style: "notionists", interests: ["coffee", "books", "plants"] },
  { username: "uli_ultra", name: "Uli Fischer", bio: "Trail running and recovery naps.", style: "adventurer", interests: ["fitness", "hiking"] },
  { username: "vera_vinyl", name: "Vera Costa", bio: "Crate digger. Records > playlists.", style: "lorelei", interests: ["music", "art"] },
  { username: "yuki_yarn", name: "Yuki Tanaka", bio: "Knitting through every season.", style: "fun-emoji", interests: ["art", "design"] },
  { username: "zed_zine", name: "Zed Morales", bio: "Zine maker. Risograph dreams.", style: "thumbs", interests: ["art", "books", "design"] },
  { username: "bea_birds", name: "Bea Lindgren", bio: "Birdwatching with a thermos. 🐦", style: "notionists", interests: ["photography", "plants", "hiking"] },
];

const TEXT_POSTS = [
  "Morning light hit the desk just right today. Small joys. #coffee #slowmornings",
  "Finished a sketch I've been avoiding for weeks. Turns out the hard part was starting. #art",
  "Hot take: the best hikes are the ones where you forget to check the time. #hiking",
  "Anyone have a good sourdough starter name? Mine is currently 'Doughy Parton'. #baking #food",
  "Library smell > candle smell. No notes. #books",
  "Made a tiny synth loop that I can't stop playing. Send help (or a drummer). #music",
  "Shot a whole roll of film and remembered to load it this time. Growth. #film #photography",
  "Repotted the monstera. It has forgiven me. #plants",
  "Biscuit found a stick twice his size and carried it the whole walk. Hero. #pets",
  "New keyboard day. The thock is immaculate. #desksetup #tech",
  "Golden hour at the pier was unreasonably pretty. #beach #goldenhour",
  "Writing prompt: a lighthouse keeper who collects lost mittens. Go. #writing",
  "Pour-over ratio experiment #14: 1:16 wins again. #coffee",
  "Climbing gym was empty at 7am and it felt like a secret. #fitness",
  "Board game night recap: we lost to the game itself. Again. #gaming",
  "Glaze test tiles came out of the kiln and one is a perfect sea-glass green. #ceramics #art",
  "Rooftop evening, tram bells below, sky doing its thing. #city #sunset",
  "Meal prep done. Future me says thank you. #food #mealprep",
  "Saw four planets lined up before bed. The sky is showing off. #night #astronomy",
  "Bike route update: new bakery discovered 3km in. Dangerous. #cycling #food",
  "Concert last night: ears ringing, heart full. #music #live",
  "Tea tasting flight at home. Current favorite: roasted oolong. #tea",
  "Trail run pace: slow. Trail run vibes: unmatched. #trailrunning #fitness",
  "Found a 1974 pressing in the dollar bin. It crackles perfectly. #vinyl #music",
  "Cast on a new cardigan. See you in spring. #knitting #art",
  "Zine issue #3 is printed! Pastel risograph everything. #zine #design",
  "Spotted a kingfisher at the canal this morning. Tiny blue rocket. #birds #photography",
  "Reminder to drink water and text your friend back. That's the post. 💛",
  "Weekend plan: picnic blanket, too many snacks, zero agenda. #friends #picnic",
  "The bookstore cat judged my choices and honestly, fair. #books #pets",
  "Learned to fold a dumpling that doesn't leak. Tiny victory. #food",
  "Three hours in the studio and I have one good brushstroke. Worth it. #art #studio",
  "Playlist for rainy desk days is live. Mostly piano and one accidental banger. #music",
  "Hiked to the ridge; clouds came in; sat in a cloud. Would recommend. #hiking #nature",
  "Current read is so good that I'm rationing chapters. #books",
  "Desk plant count: 6. Desk plant goal: unclear. #plants #desksetup",
];

const MEDIA_SETS: Array<{ tag: keyof typeof media.posts; captions: string[] }> = [
  { tag: "friendsPicnic", captions: ["Picnic season is officially open. #friends #picnic", "Blanket, snacks, sun. Nothing else needed. #picnic"] },
  { tag: "sunsetRooftop", captions: ["Rooftop at dusk. The city hums. #city #sunset", "Sky gradient of the day. #sunset"] },
  { tag: "coffeeJournal", captions: ["Journal + coffee = the whole morning routine. #coffee #journal", "Café corner for the win. #coffee"] },
  { tag: "streetFood", captions: ["Street food crawl, round two. #food #streetfood", "Best bowl of the week. #food"] },
  { tag: "hikingTrail", captions: ["Trail day. Legs tired, brain quiet. #hiking #nature", "Up and over the ridge. #hiking"] },
  { tag: "pets", captions: ["The cat has claimed the box. #pets #cats", "Sunday nap supervisor. #pets"] },
  { tag: "deskSetup", captions: ["Desk reset day. Cables tamed. #desksetup #tech", "Minimal setup, maximal focus. #desksetup"] },
  { tag: "concert", captions: ["Front row energy. #music #live #concert", "Lights and crowd and that encore. #concert"] },
  { tag: "beach", captions: ["Golden hour walk. #beach #goldenhour", "Salt air therapy. #beach"] },
  { tag: "artStudio", captions: ["Studio mess = progress. #art #studio", "Palette after a good day. #art"] },
  { tag: "bookstore", captions: ["Got lost in the bookstore again. #books #bookstore", "Shelf goals. #books"] },
  { tag: "nature", captions: ["Forest bathing, literally. #nature #hiking", "Stars came out for us. #night #nature"] },
];

const POLLS = [
  { q: "Best way to spend a free Sunday?", options: ["Long hike", "Café + book", "Cook something new", "Nap, obviously"] },
  { q: "Coffee or tea for the group picnic?", options: ["Coffee", "Tea", "Both, we're adults"] },
  { q: "Next circle movie night theme?", options: ["Cozy animation", "90s thrillers", "Documentaries"] },
  { q: "Which plant should I adopt next?", options: ["Pothos", "Fiddle leaf fig", "Calathea", "Cactus"] },
  { q: "Ideal desk lighting?", options: ["Warm lamp", "Daylight bulb", "RGB chaos"] },
  { q: "Favorite hiking snack?", options: ["Trail mix", "Dried mango", "Sandwich", "Chocolate"] },
  { q: "Film or digital for the trip?", options: ["Film", "Digital", "Phone only"] },
  { q: "Best time for a group run?", options: ["Sunrise", "Lunch", "Sunset"] },
];

const COMMENTS = [
  "This is lovely 🥹",
  "Okay I need the recipe.",
  "Saving this for the weekend!",
  "The light in this is unreal.",
  "Tell me where this is immediately.",
  "Big agree.",
  "Biscuit is a legend.",
  "Adding to my list 📚",
  "Same energy as my Sunday.",
  "Proud of you for starting!",
  "That green is perfect.",
  "Can we do this as a circle meetup?",
  "Gorgeous frame.",
  "I felt this.",
  "This made my morning.",
];
const REPLIES = ["Thank you!! 💛", "Haha yes, let's plan it.", "Right?? I was so happy.", "Sending the recipe now.", "It's the little canal path by the market.", "Will do!"];

const CIRCLES = [
  { slug: "trail-crew", name: "Trail Crew", description: "Weekend hikes, trail runs and summit snacks. All paces welcome.", rules: "1. Leave no trace.\n2. Share routes, not exact home locations.\n3. Beginners are celebrated.", isPrivate: false, tags: ["hiking", "nature", "trailrunning"] },
  { slug: "desk-nerds", name: "Desk Nerds", description: "Keyboards, cable management, plants on desks.", rules: "1. Be nice about other people's setups.\n2. Tag affiliate links.\n3. No spam.", isPrivate: false, tags: ["desksetup", "tech"] },
  { slug: "late-night-readers", name: "Late Night Readers", description: "One more chapter. Monthly reads and spoiler-tagged threads.", rules: "1. Spoiler-tag everything.\n2. Any genre, any pace.", isPrivate: false, tags: ["books", "writing"] },
  { slug: "film-photo-club", name: "Film Photo Club", description: "35mm, 120, instant. Share rolls and lab tips.", rules: "1. Credit your lab.\n2. Ask before critique.", isPrivate: false, tags: ["film", "photography"] },
  { slug: "pet-parents", name: "Pet Parents", description: "Zoomies, naps, and vet-visit solidarity.", rules: "1. Pets only, no people pics.\n2. Kindness first.", isPrivate: false, tags: ["pets"] },
  { slug: "secret-supper-club", name: "Secret Supper Club", description: "Invite-only dinners and pop-up addresses. Members only.", rules: "1. Don't share addresses outside the circle.\n2. Bring a dish or a story.", isPrivate: true, tags: ["food"] },
];

const DM_SCRIPTS: string[][] = [
  ["Hey! Are you coming to the ridge hike Saturday?", "Yes!! What time are we meeting?", "7:30 at the trailhead. I'll bring the good snacks.", "Dried mango or it didn't happen 🥭", "Obviously. See you there!"],
  ["Your glaze tiles looked amazing 😍", "Thank you! The sea-glass one was a happy accident.", "Can I come by the studio sometime?", "Please do — Sunday afternoons are quiet.", "Perfect, I'll bring coffee."],
  ["Did you finish the book yet?", "Two chapters left and I'm rationing them.", "Ha, same. No spoilers in the circle thread please!", "Promise 🤐"],
  ["Group run Thursday sunrise?", "I'm in if we stop at the bakery after.", "That's the whole point of the run.", "Deal. 6:15?", "6:15 ✅"],
  ["Hey everyone, picnic plan: Sunday at the big park?", "I can bring a blanket and lemonade!", "I'll do sandwiches.", "I'll bring Biscuit (and a frisbee).", "This is going to be perfect ☀️"],
];

export async function seedDatabase() {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(s.users);
  if (count > 0) return { skipped: true };
  console.log("🌱 Seeding Pebble with fictional demo data...");
  const passwordHash = await bcrypt.hash("pebble123", 8);

  // Users
  const userRows = await db
    .insert(s.users)
    .values(
      USERS.map((u, i) => ({
        email: `${u.username.split("_")[0]}@pebble.demo`,
        passwordHash,
        username: u.username,
        displayName: u.name,
        avatarUrl: media.avatars.dicebear(u.style, u.username),
        bannerUrl: media.profiles.banners[i % media.profiles.banners.length],
        bio: u.bio,
        link: i % 3 === 0 ? "https://example.com" : null,
        role: u.role ?? "member",
        isPrivate: !!u.isPrivate,
        interests: u.interests,
        onboarded: true,
        emailVerified: true,
        createdAt: daysAgo(60 - i),
        lastActiveAt: i < 8 ? hoursAgo(rnd() * 0.5) : daysAgo(rnd() * 3),
      })),
    )
    .returning();
  const byName = Object.fromEntries(userRows.map((u) => [u.username, u]));
  const ids = userRows.map((u) => u.id);
  const maya = byName.maya_draws, juno = byName.juno_quiet, sol = byName.sol_mod, ada = byName.ada_admin;

  // Follows: everyone follows ~10 others; Maya follows most; Juno (private) approved a few
  const followPairs = new Set<string>();
  const addFollow = (a: string, b: string) => a !== b && followPairs.add(`${a}|${b}`);
  for (const u of userRows) for (const t of shuffle(ids).slice(0, 10)) if (t !== juno.id) addFollow(u.id, t);
  for (const t of ids.slice(0, 20)) addFollow(maya.id, t);
  for (const n of ["maya_draws", "ines_plants", "remy_film", "noor_reads", "sol_mod"]) addFollow(byName[n].id, juno.id), addFollow(juno.id, byName[n].id);
  await db.insert(s.follows).values([...followPairs].map((p) => ({ followerId: p.split("|")[0], followingId: p.split("|")[1], createdAt: daysAgo(rnd() * 40) })));
  await db.insert(s.followRequests).values([
    { requesterId: byName.theo_trails.id, targetId: juno.id },
    { requesterId: byName.pip_bakes.id, targetId: juno.id },
    { requesterId: byName.ozzie_dog.id, targetId: juno.id },
  ]);

  // Circles & members
  const circleRows = await db
    .insert(s.circles)
    .values(CIRCLES.map((c, i) => ({ slug: c.slug, name: c.name, description: c.description, rules: c.rules, coverUrl: media.circles.covers[c.slug as keyof typeof media.circles.covers], isPrivate: c.isPrivate, createdBy: ids[(i * 5) % ids.length], createdAt: daysAgo(50 - i) })))
    .returning();
  const memberRows: Array<typeof s.circleMembers.$inferInsert> = [];
  circleRows.forEach((c, i) => {
    const members = shuffle(ids).slice(0, c.isPrivate ? 6 : 12 + i);
    const owner = c.createdBy ?? ids[0];
    memberRows.push({ circleId: c.id, userId: owner, role: "owner" });
    members.filter((m) => m !== owner).forEach((m, j) => memberRows.push({ circleId: c.id, userId: m, role: j === 0 ? "moderator" : "member" }));
    if (!members.includes(maya.id) && owner !== maya.id && !c.isPrivate) memberRows.push({ circleId: c.id, userId: maya.id, role: "member" });
    if (c.isPrivate) {
      if (![owner, ...members].includes(maya.id)) memberRows.push({ circleId: c.id, userId: maya.id, role: "member" });
      memberRows.push({ circleId: c.id, userId: byName.gus_games.id, role: "member", status: "pending" });
    }
  });
  const dedup = new Map(memberRows.map((m) => [`${m.circleId}|${m.userId}`, m]));
  await db.insert(s.circleMembers).values([...dedup.values()]);

  // Posts (120): text, images, polls, circle posts, reposts, quotes
  type NewPost = typeof s.posts.$inferInsert;
  const postInserts: Array<{ post: NewPost; media?: { url: string; alt: string }[]; poll?: { options: string[]; hours: number }; tags: string[] }> = [];
  let h = 1;
  const nextTime = () => {
    h += 1.5 + rnd() * 6;
    return hoursAgo(h);
  };
  for (let i = 0; i < 48; i++) {
    const text = TEXT_POSTS[i % TEXT_POSTS.length];
    postInserts.push({ post: { authorId: pick(ids), text, createdAt: nextTime() }, tags: parseHashtags(text) });
  }
  for (let i = 0; i < 44; i++) {
    const set = MEDIA_SETS[i % MEDIA_SETS.length];
    const urls = media.posts[set.tag];
    const n = i % 5 === 0 ? Math.min(urls.length, 3) : i % 3 === 0 ? 2 : 1;
    const text = set.captions[i % set.captions.length];
    postInserts.push({ post: { authorId: pick(ids), text, createdAt: nextTime() }, media: shuffle([...urls]).slice(0, n).map((url) => ({ url, alt: `Photo: ${set.tag.replace(/([A-Z])/g, " $1").toLowerCase()}` })), tags: parseHashtags(text) });
  }
  for (let i = 0; i < 10; i++) {
    const p = POLLS[i % POLLS.length];
    postInserts.push({ post: { authorId: pick(ids), text: p.q + " #poll", createdAt: nextTime() }, poll: { options: p.options, hours: i < 3 ? 48 : i < 6 ? -2 : 0.05 }, tags: ["poll"] });
  }
  // Circle posts
  circleRows.forEach((c, ci) => {
    const def = CIRCLES[ci];
    for (let k = 0; k < 3; k++) {
      const text = `${["Weekly thread:", "Question for the circle:", "Sharing:"][k]} ${TEXT_POSTS[(ci * 3 + k) % TEXT_POSTS.length].split("#")[0].trim()} #${def.tags[0]}`;
      const members = [...dedup.values()].filter((m) => m.circleId === c.id && m.status !== "pending");
      postInserts.push({ post: { authorId: pick(members).userId as string, text, circleId: c.id, createdAt: nextTime() }, tags: parseHashtags(text) });
    }
  });
  // Make sure Maya & Juno have posts
  for (let i = 0; i < 6; i++) postInserts.push({ post: { authorId: maya.id, text: TEXT_POSTS[(i * 7) % TEXT_POSTS.length], createdAt: nextTime() }, tags: parseHashtags(TEXT_POSTS[(i * 7) % TEXT_POSTS.length]) });
  for (let i = 0; i < 3; i++) postInserts.push({ post: { authorId: juno.id, text: `Quiet morning notes #${i + 1}. The fig has a new leaf. #plants #slowmornings`, createdAt: nextTime() }, media: [{ url: media.posts.nature[i], alt: "Soft forest light" }], tags: ["plants", "slowmornings"] });

  const insertedPosts: Array<typeof s.posts.$inferSelect> = [];
  for (const item of postInserts) {
    const [row] = await db.insert(s.posts).values(item.post).returning();
    insertedPosts.push(row);
    if (item.media?.length) await db.insert(s.postMedia).values(item.media.map((m, order) => ({ postId: row.id, url: m.url, alt: m.alt, order })));
    if (item.tags.length) await db.insert(s.postHashtags).values(item.tags.map((tag) => ({ postId: row.id, tag })));
    if (item.poll) {
      const endsAt = new Date(row.createdAt.getTime() + (item.poll.hours > 0 ? item.poll.hours : 0) * 3_600_000);
      const ends = item.poll.hours === -2 ? hoursAgo(1) : item.poll.hours === 0.05 ? new Date(Date.now() + 3 * 60_000) : new Date(Date.now() + 36 * 3_600_000);
      void endsAt;
      const [poll] = await db.insert(s.polls).values({ postId: row.id, endsAt: ends, closed: ends < new Date() }).returning();
      const opts = await db.insert(s.pollOptions).values(item.poll.options.map((text, order) => ({ pollId: poll.id, text, order }))).returning();
      const voters = shuffle(ids).slice(0, 8 + Math.floor(rnd() * 12));
      await db.insert(s.pollVotes).values(voters.map((userId) => ({ pollId: poll.id, optionId: pick(opts).id, userId })));
    }
  }
  // Reposts & quotes (8)
  const popular = insertedPosts.filter((p) => !p.circleId).slice(0, 30);
  for (let i = 0; i < 8; i++) {
    const target = popular[i * 3];
    const [row] = await db
      .insert(s.posts)
      .values({ authorId: pick(ids.filter((x) => x !== target.authorId)), text: i % 2 === 0 ? "" : pick(["This. So much this. ✨", "Adding to the weekend plan.", "Could not agree more.", "Look at this!"]), repostOfId: target.id, createdAt: hoursAgo(rnd() * 20) })
      .returning();
    insertedPosts.push(row);
  }
  // One removed post for the transparency demo
  const removed = insertedPosts[5];
  await db.update(s.posts).set({ deletedAt: hoursAgo(5), removedReason: "Removed by moderators: contained an unlabeled affiliate link (Rule: tag sponsored links)." }).where(sql`${s.posts.id} = ${removed.id}`);

  // Reactions, comments, bookmarks
  const rTypes: s.ReactionType[] = ["love", "laugh", "wow", "hug", "fire", "clap"];
  const reactionRows: Array<typeof s.reactions.$inferInsert> = [];
  const commentRows: Array<typeof s.comments.$inferInsert> = [];
  const bookmarkRows: Array<typeof s.bookmarks.$inferInsert> = [];
  for (const p of insertedPosts) {
    const n = Math.floor(rnd() * rnd() * 18);
    for (const uid of shuffle(ids).slice(0, n)) reactionRows.push({ postId: p.id, userId: uid, type: rnd() < 0.5 ? "love" : pick(rTypes), createdAt: new Date(p.createdAt.getTime() + rnd() * 3_600_000 * 5) });
    if (rnd() < 0.25) bookmarkRows.push({ userId: maya.id, postId: p.id });
    if (rnd() < 0.15) bookmarkRows.push({ userId: pick(ids), postId: p.id });
  }
  await db.insert(s.reactions).values(reactionRows).onConflictDoNothing();
  const bm = new Map(bookmarkRows.map((b) => [`${b.userId}|${b.postId}`, b]));
  await db.insert(s.bookmarks).values([...bm.values()]);
  for (const p of insertedPosts.slice(0, 70)) {
    const n = Math.floor(rnd() * 4);
    for (let i = 0; i < n; i++) {
      const [c] = await db.insert(s.comments).values({ postId: p.id, authorId: pick(ids), text: pick(COMMENTS), createdAt: new Date(p.createdAt.getTime() + rnd() * 3_600_000 * 8) }).returning();
      if (rnd() < 0.5) {
        const [r] = await db.insert(s.comments).values({ postId: p.id, authorId: p.authorId, parentId: c.id, text: pick(REPLIES), createdAt: new Date(c.createdAt.getTime() + 600_000) }).returning();
        if (rnd() < 0.4) await db.insert(s.comments).values({ postId: p.id, authorId: c.authorId, parentId: r.id, text: pick(["🙌", "Perfect!", "Love that."]), createdAt: new Date(r.createdAt.getTime() + 600_000) });
      }
    }
  }
  void commentRows;

  // Stories (20) — a few expire within minutes to demo the worker
  const storyAuthors = shuffle(ids).slice(0, 14);
  const storyRows: Array<typeof s.stories.$inferInsert> = [];
  storyAuthors.forEach((authorId, i) => {
    const created = hoursAgo(rnd() * 20);
    const exp = i < 3 ? new Date(Date.now() + (2 + i * 2) * 60_000) : new Date(created.getTime() + 24 * 3_600_000);
    const allMedia = Object.values(media.posts).flat();
    storyRows.push({ authorId, type: "image", imageUrl: pick(allMedia), text: pick(["golden hour ✨", "trail day", "studio time", "", "coffee o'clock"]), expiresAt: exp, createdAt: created });
    if (i < 6) storyRows.push({ authorId, type: "text", text: pick(["tiny wins count too 💛", "who's up for a picnic?", "new zine drops friday!", "sunday reset mode", "the fig has a new leaf 🌱", "be gentle with yourself today"]), bgStyle: pick(["sunset", "ocean", "mint", "plum"]), expiresAt: new Date(created.getTime() + 24 * 3_600_000), createdAt: new Date(created.getTime() + 1_800_000) });
  });
  storyRows.push({ authorId: maya.id, type: "text", text: "testing stories on Pebble ✨", bgStyle: "sunset", expiresAt: new Date(Date.now() + 23 * 3_600_000), createdAt: hoursAgo(1) });
  const insertedStories = await db.insert(s.stories).values(storyRows).returning();
  const views: Array<typeof s.storyViews.$inferInsert> = [];
  for (const st of insertedStories) for (const v of shuffle(ids).slice(0, Math.floor(rnd() * 8))) if (v !== st.authorId) views.push({ storyId: st.id, viewerId: v });
  await db.insert(s.storyViews).values(views).onConflictDoNothing();

  // Conversations (5) — 4 DMs + 1 group; Maya is in all of them
  const partners = [byName.theo_trails, byName.hana_art, byName.noor_reads, byName.fern_fits];
  for (let i = 0; i < 5; i++) {
    const isGroup = i === 4;
    const members = isGroup ? [maya.id, byName.ozzie_dog.id, byName.pip_bakes.id, byName.cass_coffee.id] : [maya.id, partners[i].id];
    const [conv] = await db.insert(s.conversations).values({ isGroup, name: isGroup ? "Picnic Planning ☀️" : null, createdAt: daysAgo(10 - i), lastMessageAt: hoursAgo(i * 3 + 1) }).returning();
    await db.insert(s.conversationMembers).values(members.map((userId, j) => ({ conversationId: conv.id, userId, lastReadAt: j === 0 && i === 0 ? daysAgo(1) : new Date() })));
    const script = DM_SCRIPTS[i];
    const msgs = await db
      .insert(s.messages)
      .values(script.map((text, j) => ({ conversationId: conv.id, senderId: isGroup ? members[j % members.length] : j % 2 === 0 ? members[1] : members[0], text, createdAt: hoursAgo(i * 3 + 1 + (script.length - j) * 0.2) })))
      .returning();
    await db.insert(s.messageReactions).values({ messageId: msgs[0].id, userId: maya.id, emoji: "❤️" });
  }

  // Notifications of every type for Maya
  const mayaPosts = insertedPosts.filter((p) => p.authorId === maya.id);
  const targetPost = mayaPosts[0] ?? insertedPosts[0];
  const notifRows: Array<typeof s.notifications.$inferInsert> = [];
  shuffle(ids).filter((x) => x !== maya.id).slice(0, 6).forEach((actorId, i) => notifRows.push({ userId: maya.id, actorId, type: "reaction", postId: targetPost.id, createdAt: hoursAgo(i * 0.3 + 0.2) }));
  shuffle(ids).filter((x) => x !== maya.id).slice(0, 3).forEach((actorId, i) => notifRows.push({ userId: maya.id, actorId, type: "comment", postId: targetPost.id, createdAt: hoursAgo(2 + i * 0.2) }));
  notifRows.push({ userId: maya.id, actorId: byName.wren_writes.id, type: "mention", postId: insertedPosts[3].id, createdAt: hoursAgo(4) });
  shuffle(ids).filter((x) => x !== maya.id).slice(0, 4).forEach((actorId, i) => notifRows.push({ userId: maya.id, actorId, type: "follow", createdAt: hoursAgo(6 + i * 0.1) }));
  notifRows.push({ userId: maya.id, actorId: byName.ivo_city.id, type: "repost", postId: targetPost.id, createdAt: hoursAgo(8) });
  notifRows.push({ userId: maya.id, type: "poll_ended", postId: insertedPosts.find((p) => p.text.includes("#poll"))?.id ?? targetPost.id, createdAt: hoursAgo(9) });
  shuffle(ids).filter((x) => x !== maya.id).slice(0, 5).forEach((actorId, i) => notifRows.push({ userId: maya.id, actorId, type: "story_view", createdAt: hoursAgo(10 + i * 0.05), read: true }));
  notifRows.push({ userId: maya.id, actorId: juno.id, type: "follow_accepted", createdAt: daysAgo(2), read: true });
  notifRows.push({ userId: juno.id, actorId: byName.theo_trails.id, type: "follow_request", createdAt: hoursAgo(3) });
  notifRows.push({ userId: juno.id, actorId: byName.pip_bakes.id, type: "follow_request", createdAt: hoursAgo(5) });
  notifRows.push({ userId: removed.authorId, type: "moderation", postId: removed.id, meta: { message: "One of your posts was removed: unlabeled affiliate link. You can appeal." }, createdAt: hoursAgo(5) });
  await db.insert(s.notifications).values(notifRows);

  // Reports in different states, blocks, mutes, muted words
  const reporters = shuffle(ids);
  await db.insert(s.reports).values([
    { reporterId: reporters[0], targetType: "post", targetId: insertedPosts[10].id, reason: "Spam", details: "Looks like a repeated promo.", status: "open", createdAt: hoursAgo(2) },
    { reporterId: reporters[1], targetType: "comment", targetId: (await db.select({ id: s.comments.id }).from(s.comments).limit(1))[0].id, reason: "Harassment or bullying", details: "Unkind tone.", status: "open", createdAt: hoursAgo(6) },
    { reporterId: reporters[2], targetType: "user", targetId: byName.gus_games.id, reason: "Impersonation", details: "Username similar to another member.", status: "open", createdAt: hoursAgo(12) },
    { reporterId: reporters[3], targetType: "post", targetId: removed.id, reason: "Spam", details: "Affiliate link not labeled.", status: "resolved", resolution: "remove", resolvedBy: sol.id, resolvedAt: hoursAgo(5), createdAt: hoursAgo(7) },
    { reporterId: reporters[4], targetType: "post", targetId: insertedPosts[20].id, reason: "Misinformation", details: "", status: "dismissed", resolution: "dismiss", resolvedBy: ada.id, resolvedAt: daysAgo(1), createdAt: daysAgo(1.2) },
    { reporterId: reporters[5], targetType: "message", targetId: "demo-message", reason: "Spam", details: "Unsolicited link.", status: "resolved", resolution: "warn", resolvedBy: sol.id, resolvedAt: daysAgo(3), createdAt: daysAgo(3.1) },
  ]);
  await db.insert(s.appeals).values({ userId: removed.authorId, postId: removed.id, text: "The link was to my own small shop, not an affiliate. Happy to add a label.", status: "open" });
  await db.insert(s.auditLogs).values([
    { actorId: sol.id, action: "report.resolve", targetType: "post", targetId: removed.id, meta: { resolution: "remove" }, createdAt: hoursAgo(5) },
    { actorId: ada.id, action: "report.dismiss", targetType: "post", targetId: insertedPosts[20].id, createdAt: daysAgo(1) },
    { actorId: sol.id, action: "user.warn", targetType: "user", targetId: byName.otis_owl.id, meta: { reason: "Unsolicited links in DMs" }, createdAt: daysAgo(3) },
  ]);
  await db.insert(s.blocks).values([{ blockerId: byName.vera_vinyl.id, blockedId: byName.otis_owl.id }, { blockerId: maya.id, blockedId: byName.zed_zine.id }]);
  await db.insert(s.mutes).values([{ muterId: maya.id, mutedId: byName.uli_ultra.id }]);
  await db.insert(s.mutedWords).values([{ userId: maya.id, word: "spoiler" }]);
  await db.insert(s.recentSearches).values([{ userId: maya.id, query: "#hiking" }, { userId: maya.id, query: "theo" }]);

  // Trending tags & 6 weeks of daily stats (fictional activity history)
  const tagCounts = new Map<string, number>();
  for (const p of insertedPosts) if (p.createdAt > hoursAgo(24)) for (const t of parseHashtags(p.text)) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  await db.insert(s.trendingTags).values([...tagCounts.entries()].map(([tag, c]) => ({ tag, count24h: c, score: c * 2 + rnd() * 3 })));
  const stats: Array<typeof s.dailyStats.$inferInsert> = [];
  for (let d = 42; d >= 1; d--) {
    const day = daysAgo(d).toISOString().slice(0, 10);
    const wave = 1 + 0.3 * Math.sin(d / 3);
    stats.push({ day, activeUsers: Math.round(14 * wave + rnd() * 6), posts: Math.round(9 * wave + rnd() * 6), reactions: Math.round(60 * wave + rnd() * 30), comments: Math.round(18 * wave + rnd() * 10), reportsResolved: Math.round(rnd() * 3) });
  }
  await db.insert(s.dailyStats).values(stats).onConflictDoNothing();

  console.log(`✅ Seeded ${userRows.length} users, ${insertedPosts.length} posts, ${insertedStories.length} stories, ${circleRows.length} circles.`);
  return { skipped: false };
}

if (process.argv[1] && process.argv[1].endsWith("seed.ts")) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

export const INTEREST_LIST = INTERESTS;
