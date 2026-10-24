/**
 * Every external media / data-source URL used by Pebble, grouped by page & section.
 * All photos are free-license (Unsplash License / Picsum). Swap freely.
 * Every image rendered through <SmartImage /> falls back to a peach→lilac gradient with a pebble icon.
 */
const u = (id: string, w = 1200) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

export const media = {
  landing: {
    heroCollage: [u("1511632765486-a01980e01a18", 600), u("1500530855697-b586d89ba3ee", 600), u("1518791841217-8f162f1e1131", 600)],
    // Optional muted/looping background video (Pexels, free). Poster used on data-saver / mobile.
    video: {
      src: "https://videos.pexels.com/video-files/3129957/3129957-hd_1280_720_25fps.mp4",
      poster: u("1500530855697-b586d89ba3ee", 1600),
    },
  },
  posts: {
    friendsPicnic: [u("1511632765486-a01980e01a18"), u("1529156069898-49953e39b3ac"), u("1530103862676-de8c9debad1d")],
    sunsetRooftop: [u("1477959858617-67f85cf4f1df"), u("1449824913935-59a10b8d2000"), u("1500530855697-b586d89ba3ee")],
    coffeeJournal: [u("1495474472287-4d71bcdd2085"), u("1517487881594-2787fef5ebf7"), u("1483058712412-4245e9b90334")],
    streetFood: [u("1504674900247-0877df9cc836"), u("1555939594-58d7cb561ad1"), u("1540189549336-e6e99c3679fe")],
    hikingTrail: [u("1551632811-561732d1e306"), u("1551698618-1dfe5d97d256"), u("1464822759023-fed622ff2c3b"), u("1506905925346-21bda4d32df4")],
    pets: [u("1518791841217-8f162f1e1131"), u("1543852786-1cf6624b9987"), u("1425082661705-1834bfd09dca")],
    deskSetup: [u("1498036882173-b41c28a8ba34"), u("1593642632559-0c6d3fc62b89"), u("1515378791036-0648a3ef77b2")],
    concert: [u("1459749411175-04bf5292ceea"), u("1470229722913-7c0e2dbbafd3"), u("1517457373958-b7bdd4587205")],
    beach: [u("1507525428034-b723cf961d3e"), u("1506744038136-46273834b3fb"), u("1469474968028-56623f02e42e")],
    artStudio: [u("1513364776144-60967b0f800f"), u("1460661419201-fd4cecdf8a8b")],
    bookstore: [u("1481627834876-b7833e8f5570"), u("1507842217343-583bb7270b66")],
    nature: [u("1441974231531-c6227db76b6e"), u("1519681393784-d120267933ba"), u("1447752875215-b2761acb3c5d"), u("1433086966358-54859d0ed716"), u("1472214103451-9374bd1c798e")],
  },
  circles: {
    covers: {
      "trail-crew": u("1551632811-561732d1e306", 1600),
      "desk-nerds": u("1498036882173-b41c28a8ba34", 1600),
      "late-night-readers": u("1481627834876-b7833e8f5570", 1600),
      "film-photo-club": u("1452587925148-ce544e77e70d", 1600),
      "pet-parents": u("1543852786-1cf6624b9987", 1600),
      "secret-supper-club": u("1514933651103-005eec06c04b", 1600),
    },
  },
  profiles: {
    banners: [u("1500530855697-b586d89ba3ee", 1600), u("1493246507139-91e8fad9978e", 1600), u("1470071459604-3b5ec3a7fe05", 1600), u("1507525428034-b723cf961d3e", 1600), u("1519681393784-d120267933ba", 1600)],
  },
  avatars: {
    /** DiceBear v9 — free, no key. Styles: notionists, adventurer, fun-emoji, thumbs, lorelei */
    dicebear: (style: string, seed: string) => `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=ffdfbf,ffd5dc,d1d4f9,c0aede`,
    styles: ["notionists", "adventurer", "fun-emoji", "thumbs", "lorelei", "bottts-neutral"],
  },
  sounds: {
    // CC0 sounds — optional, OFF by default. Add files to /public/sounds to enable.
    pop: "/sounds/pop.mp3",
    ping: "/sounds/ping.mp3",
  },
  picsum: (seed: string, w = 800, h = 600) => `https://picsum.photos/seed/${seed}/${w}/${h}`,
};

export const credits = [
  { name: "Unsplash", url: "https://unsplash.com", license: "Unsplash License (free for commercial & non-commercial use)" },
  { name: "Pexels", url: "https://www.pexels.com", license: "Pexels License (free to use)" },
  { name: "Picsum Photos", url: "https://picsum.photos", license: "Free placeholder images" },
  { name: "DiceBear Avatars", url: "https://www.dicebear.com", license: "Avatar styles licensed CC BY 4.0 / CC0 per style" },
  { name: "Phosphor Icons", url: "https://phosphoricons.com", license: "MIT" },
  { name: "Google Fonts: Bricolage Grotesque, Figtree, Caveat", url: "https://fonts.google.com", license: "SIL Open Font License" },
  { name: "Pixabay Audio / Freesound", url: "https://pixabay.com/sound-effects/", license: "CC0 (optional sounds, off by default)" },
];
