/**
 * NomadGao's voice for the ready-made captions: warm, community-first, a little cheeky.
 * Rule for everything in here: no facts. Nothing about price, food, drinks, freebies or times —
 * those come only from the event itself, so a caption can never promise something that isn't true.
 * Edit freely; every line is picked at random per poster (and re-picked on Shuffle).
 */
import type { LocationId } from "./constants";

/** 2–3 sentences on why this kind of event is worth showing up for. Keyed by event type slug. */
export const STORIES: Record<string, string[]> = {
  "game-night": [
    "Tables get loud, alliances get broken, and someone always swears they've never played before (they have). It's the easiest way to go from \"hi, I'm new\" to inside jokes in one evening.",
    "Bring your competitive streak or leave it at the door. Either way you'll end up laughing with people you only knew by their laptop stickers.",
    "There's something about a deck of cards that gets everyone talking. Pull up a chair, learn a new game, and lose gracefully. Or don't.",
  ],
  karaoke: [
    "Nobody here is judging your pitch. We're judging your commitment. Pick the song you only sing in the shower and give it everything.",
    "The rule is simple: the worse the singing, the louder the cheering. Come for one song, stay for the duets you didn't plan.",
    "Power ballads, Bollywood classics, that one song everyone knows the chorus to. Grab the mic or just be the loudest backup singer in the room.",
  ],
  bonfire: [
    "There's a reason people have gathered around fires forever. Phones go down, stories come out, and the night stretches longer than anyone planned.",
    "Warm hands, full plates and the kind of conversations you don't have over Slack. Pull up a seat around the fire.",
    "Some of our best friendships started next to a fire. Come and see who you end up talking to till late.",
  ],
  "hotpot-social": [
    "Everyone cooking and sharing from the same pot in the middle of the table. It's impossible to stay strangers when you're passing the tofu.",
    "Hotpot was made for this: slow eating, long conversations, and a table full of people who were strangers an hour ago.",
    "Pull up a chair and dip in. The broth does the talking at first, and then everyone else does.",
  ],
  potluck: [
    "Everyone brings a dish from home, wherever home is, and we pass plates around till the table is a little map of the world.",
    "It's dinner, but it's also the easiest way to hear everyone's story. Bring something you love to cook (or love to eat) and a big appetite.",
    "Your signature dish, your mum's recipe or a brave experiment: all welcome. The best potlucks are the ones with surprises.",
  ],
  hike: [
    "Swap the screen for a trail for a few hours. Good legs, fresh air and conversations that only happen walking side by side.",
    "Friendly pace, no one left behind. Bring water, comfy shoes and a camera for the view at the top.",
    "Some of the best ideas come halfway up a trail. Come walk with us and see where the conversation goes.",
  ],
  workshop: [
    "Learn something new with your hands, alongside people who are just as new to it as you. No experience needed, only curiosity.",
    "A couple of hours away from the laptop to make something real. You'll leave with a new skill and a few new friends.",
    "The best way to learn is with a room full of curious people. Come try something you've always wanted to.",
  ],
  "sip-paint": [
    "Just a canvas, a few colours and a room full of people trying their best (and laughing at their worst).",
    "The goal isn't a masterpiece. It's a slow, happy evening with something to take home and a story about how it turned out.",
    "Paint the view, paint your mood, paint whatever happens. Nobody's grading.",
  ],
  talk: [
    "Our community is full of people doing interesting things. Nomadic Connect is where one of them shares what they've learned, and the rest of us ask too many questions.",
    "Pull up a chair for a real conversation, not a lecture. Bring your questions, your doubts and your own stories.",
    "The best part of coworking is the people at the next desk. This is your chance to hear what they're actually working on.",
  ],
  meetup: [
    "New in town? Been here for months? Either way, this is the easiest way to meet the people you'll be getting chai with all week.",
    "No agenda, no name tags, just a room full of nomads, locals and travellers saying hi. Come as you are.",
    "Every big friendship in this community started with a small hello. Come say yours.",
  ],
  movie: [
    "Lights low, a good film and a room full of people. Come for the movie, stay for the arguments about the ending.",
    "There's nothing quite like watching a film with a room full of people who react out loud. Grab a comfy spot early.",
    "A slow evening, a good film and good company. Bring a blanket if you get cold easily.",
  ],
  "watch-party": [
    "Big screen, bigger reactions. Pick a side, wear the colours, and celebrate (or suffer) together.",
    "It's always more fun with a room full of people shouting at the screen. Come cheer with us.",
    "Fans, casual watchers and people who just came for the company: everyone's on the same team tonight.",
  ],
  music: [
    "Bring an instrument, a song you love, or just your ears. Some of our favourite nights started with one guitar and a few brave voices.",
    "Open to everyone, from the seasoned musician to the person who knows three chords. Play, sing along, or just soak it in.",
    "Music has a way of turning a room of strangers into a crowd of friends. Come and see for yourself.",
  ],
  wellness: [
    "A little time to slow down, stretch out and breathe. Beginners are more than welcome; every body is.",
    "Leave the inbox for later. This is time for your body and mind, in good company.",
    "Whether you practise every day or haven't touched a mat in years, there's a spot for you.",
  ],
  "food-walk": [
    "The best way to know a place is through its food. Come hungry, ask questions, and taste your way through the neighbourhood with us.",
    "Small plates, local stories and a group that keeps getting bigger at every stop. Wear comfy shoes.",
    "We'll eat where the locals eat and hear the stories behind the dishes. Bring an appetite and an open mind.",
  ],
  party: [
    "Dress up, dance, and celebrate the people who make this place feel like home.",
    "Good music, good people and a dance floor that fills up faster than you'd think. Come as you are.",
    "It's a party, but it's our party, so expect lots of familiar faces and a few new ones to meet.",
  ],
  other: [
    "Something good is happening and you're invited. Come say hi and meet the community.",
    "The best way to feel at home somewhere is to show up. This is a great place to start.",
    "Whether you're staying with us or just passing through, there's a warm welcome waiting.",
  ],
};

type DayPart = "morning" | "afternoon" | "evening" | "any";

/** A line of place, matched to the time of day so it never says "sunset" at 9 AM. */
const PLACE: Record<LocationId, Record<DayPart, string[]>> = {
  goa: {
    morning: ["Start the day the Anjuna way: slow, sunny and with good people.", "Before the laptops open and the heat kicks in, come spend the morning with us."],
    afternoon: ["Take a break from the laptop. Anjuna afternoons are made for this.", "The work can wait an hour or two. The community's hanging out."],
    evening: ["Close the laptop. The sun's going down over Anjuna and the evening is ours.", "After a day of deep work, this is how Goa evenings should feel.", "Golden hour in Anjuna, then good company till late."],
    any: ["This is what living and working in Goa should feel like.", "Anjuna is better with people around you."],
  },
  dharamkot: {
    morning: ["Mountain mornings are best shared. Come join us before the day gets busy.", "Fresh air, the Dhauladhars in view and good people to start the day with."],
    afternoon: ["Step away from the desk. The mountains are right there.", "Afternoon light on the deodars, and a reason to take a break."],
    evening: ["When the sun dips behind the Dhauladhars, the hills get cosy and so do we.", "Evenings in Dharamkot are for warm people and slow conversations.", "Close the laptop. The mountains are turning pink and the community's gathering."],
    any: ["This is what life in the hills is all about.", "Dharamkot is better with people around you."],
  },
};

const WELCOME_OPEN = [
  "Coming solo? Perfect. Most people do, and that's how most NomadGao friendships start.",
  "New in town, staying with us, or just passing through: there's a seat for you.",
  "Bring a friend, or come alone and leave with a few.",
  "No cliques, no pressure. Just good people and a reason to say hi.",
  "Nomads, locals and travellers all welcome. You don't need to be staying with us.",
];

const WELCOME_RESIDENTS = [
  "This one's just for our NomadGao family, a little time together away from the desks.",
  "Residents only this time: a chance to get to know the people you share the house with.",
];

const SIGNOFF: Record<LocationId | "hotpot", string[]> = {
  goa: ["See you there, coconuts 🥥", "Can't wait to see you 🌴", "Tag the friend you're bringing 🌅", "Come as you are. See you there 🌴"],
  dharamkot: ["See you in the hills 🏔️", "Tag the friend you're bringing 🌲", "Come as you are. See you up the mountain ⛰️", "Can't wait to see you 🏔️"],
  hotpot: ["Pull up a chair, the pot's waiting 🍲", "See you at The Hotpot House 🍲", "Bring your appetite (and a friend) 🍲"],
};

export function dayPart(start: string | null | undefined): DayPart {
  if (!start) return "any";
  const h = Number(start.slice(0, 2));
  if (Number.isNaN(h)) return "any";
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
}

export const voice = {
  story: (slug: string) => STORIES[slug] ?? STORIES.other,
  place: (loc: LocationId, start: string | null | undefined) => PLACE[loc][dayPart(start)],
  welcome: (residents: boolean) => (residents ? WELCOME_RESIDENTS : WELCOME_OPEN),
  signoff: (loc: LocationId, hotpotOnly: boolean) => (hotpotOnly ? SIGNOFF.hotpot : SIGNOFF[loc]),
};

/** Weekly calendar intros and closers. */
export const WEEK = {
  intro: {
    both: [
      "Two homes, one community. Here's what's on in Anjuna and Dharamkot this week. Pick your favourites, bring a friend, and come say hi.",
      "Beach or mountains, the week ahead is full of reasons to close the laptop and hang out. Here's everything happening at NomadGao.",
    ],
    goa: [
      "Here's what's happening in Anjuna this week. Work hard, then come hang out with the people who make this place feel like home.",
      "A full week of good company in Goa. Save the dates, bring your friends, and come as you are.",
    ],
    dharamkot: [
      "Here's what's happening up in Dharamkot this week. Plenty of reasons to step away from the desk and spend time with the community.",
      "A week of mountain evenings and good people. Save the dates and come say hi.",
    ],
  },
  close: [
    "Whether you've been with us for months or just landed, there's something here for you.",
    "Coming solo? Most people do. You won't be solo for long.",
    "Nomads, locals and travellers all welcome. You don't need to be staying with us.",
  ],
  save: [
    "Save this post and send it to the friend who keeps saying they'll come next time 😉",
    "Save this so you don't miss a thing, and tag who you're bringing 👇",
  ],
};
