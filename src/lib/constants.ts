export type LocationId = "goa" | "dharamkot";
export type BrandId = "nomadgao" | "hotpot";
export type SizeId = "story" | "post" | "square";

export const LOCATIONS: Record<
  LocationId,
  { id: LocationId; name: string; place: string; region: string; venues: string[]; greeting: string[]; hashtags: string[] }
> = {
  goa: {
    id: "goa",
    name: "Goa",
    place: "Anjuna, Goa",
    region: "North Goa",
    venues: ["NomadGao Villa Nova, Anjuna"],
    greeting: ["Hello coconuts! 🥥", "Goa fam 🌴", "Hey Anjuna 🌅", "Hello coconuts 🌴"],
    hashtags: ["#AnjunaGoa", "#GoaEvents", "#NorthGoa", "#ThingsToDoInGoa"],
  },
  dharamkot: {
    id: "dharamkot",
    name: "Dharamkot",
    place: "Dharamkot, Himachal",
    region: "McLeod Ganj",
    venues: ["The Hotpot House, Dharamkot", "NomadGao Dharamkot"],
    greeting: ["Hello mountain people! 🏔️", "Dharamkot fam 🌲", "Hey from the hills ⛰️", "Namaste, mountain friends 🙏"],
    hashtags: ["#Dharamkot", "#McLeodGanj", "#Dharamshala", "#HimachalDiaries"],
  },
};

export const SIZES: Record<SizeId, { id: SizeId; label: string; w: number; h: number; hint: string }> = {
  story: { id: "story", label: "Story", w: 1080, h: 1920, hint: "9:16 · Instagram & WhatsApp status" },
  post: { id: "post", label: "Post", w: 1080, h: 1350, hint: "4:5 · Instagram feed" },
  square: { id: "square", label: "Square", w: 1080, h: 1080, hint: "1:1 · WhatsApp groups" },
};

export const BRANDS: Record<BrandId, { id: BrandId; name: string; handle: string; hashtag: string }> = {
  nomadgao: { id: "nomadgao", name: "NomadGao", handle: "@nomad.gao", hashtag: "#NomadGao" },
  hotpot: { id: "hotpot", name: "The Hotpot House", handle: "@thehotpothouse", hashtag: "#TheHotpotHouse" },
};

export interface EventType {
  slug: string;
  name: string;
  emoji: string;
  hashtag: string;
  hooks: string[];
}

export const EVENT_TYPES: EventType[] = [
  { slug: "game-night", name: "Game Night", emoji: "🎲", hashtag: "#BoardGameNight", hooks: ["Dice, cards and a little friendly rivalry.", "Bring your poker face (or don't).", "Winner gets bragging rights till next week."] },
  { slug: "karaoke", name: "Karaoke", emoji: "🎤", hashtag: "#KaraokeNight", hooks: ["Be your silliest. Sing your loudest.", "Shower singers, this is your stage.", "No talent required, just lungs."] },
  { slug: "bonfire", name: "Bonfire & BBQ", emoji: "🔥", hashtag: "#BonfireNight", hooks: ["Fire, food and stories that go late.", "Grab a seat around the fire.", "Marshmallows optional, good company guaranteed."] },
  { slug: "hotpot-social", name: "Hotpot Social", emoji: "🍲", hashtag: "#HotpotNight", hooks: ["One pot, many friends.", "Pull up a chair, the broth is bubbling.", "Strangers in, friends out. That's the hotpot rule."] },
  { slug: "potluck", name: "Potluck", emoji: "🥘", hashtag: "#PotluckDinner", hooks: ["Bring a dish, leave with a full heart.", "Everyone cooks, everyone eats.", "Your grandma's recipe has fans waiting."] },
  { slug: "hike", name: "Hike", emoji: "🥾", hashtag: "#WeekendHike", hooks: ["Laces tight, views wide.", "Trade the laptop for a trail.", "Fresh air, sore legs, zero regrets."] },
  { slug: "workshop", name: "Workshop", emoji: "🎨", hashtag: "#CreativeWorkshop", hooks: ["Learn something new with your hands.", "Make something you'll actually keep.", "No experience needed, just curiosity."] },
  { slug: "sip-paint", name: "Sip & Paint", emoji: "🖌️", hashtag: "#SipAndPaint", hooks: ["A brush in one hand, a drink in the other.", "Picasso who? Just paint.", "Canvas, colours and good vibes."] },
  { slug: "talk", name: "Nomadic Connect Talk", emoji: "🎙️", hashtag: "#NomadicConnect", hooks: ["One nomad, one big idea, one evening.", "Learn from the people you cowork with.", "Ideas worth sharing over chai."] },
  { slug: "meetup", name: "Community Meetup", emoji: "🤝", hashtag: "#CommunityMeetup", hooks: ["New in town? This is your sign.", "Find your tribe.", "Come for the chat, stay for the people."] },
  { slug: "movie", name: "Movie Night", emoji: "🎬", hashtag: "#MovieNight", hooks: ["Lights low, popcorn high.", "Blankets, snacks and a good film.", "Grab a comfy spot."] },
  { slug: "watch-party", name: "Watch Party", emoji: "🏏", hashtag: "#WatchParty", hooks: ["Big screen, bigger cheers.", "Pick a side, bring the noise.", "Every ball, together."] },
  { slug: "music", name: "Live Music / Jam", emoji: "🎸", hashtag: "#OpenMic", hooks: ["Bring your instrument or just your ears.", "Strings, songs and sunset.", "Jam session, everyone's invited."] },
  { slug: "wellness", name: "Yoga & Wellness", emoji: "🧘", hashtag: "#MindfulLiving", hooks: ["Breathe in. Slow down.", "A reset for body and mind.", "Mats out, phones away."] },
  { slug: "food-walk", name: "Food Walk", emoji: "🍜", hashtag: "#FoodWalk", hooks: ["Come hungry, leave happy.", "Eat your way through the neighbourhood.", "Local bites, local stories."] },
  { slug: "party", name: "Party", emoji: "🎉", hashtag: "#PartyNight", hooks: ["Dress up, show up.", "The kind of night you'll talk about.", "Good music, better people."] },
  { slug: "other", name: "Community Event", emoji: "✨", hashtag: "#CommunityEvents", hooks: ["Something good is happening.", "Come say hi.", "Your week just got better."] },
];

export const COMMUNITY_TAG = "#DigitalNomadIndia";

export function eventType(slug: string): EventType {
  return (
    EVENT_TYPES.find((t) => t.slug === slug) ?? {
      slug,
      name: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      emoji: "✨",
      hashtag: "#CommunityEvents",
      hooks: ["Something good is happening.", "Come say hi."],
    }
  );
}

export function slugify(s: string) {
  return s.toLowerCase().trim().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
