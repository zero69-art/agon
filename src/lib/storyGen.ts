import { mulberry32, pick } from './rng';

export type Genre = 'fantasy' | 'scifi' | 'mystery' | 'romance' | 'horror' | 'fable' | 'adventure' | 'comedy';
export type Tone = 'hopeful' | 'dark' | 'whimsical' | 'dramatic';
export type Length = 'short' | 'medium' | 'long' | 'epic';

export interface StoryOptions {
  genre: Genre | 'random';
  tone: Tone;
  length: Length;
  hero?: string;
  spark?: string;
  seed?: number;
}

export interface StoryResult {
  title: string;
  text: string;
  genre: Genre;
  seed: number;
  paragraphs: number;
  words: number;
}

export const GENRES: { id: Genre; label: string; emoji: string }[] = [
  { id: 'fantasy', label: 'Fantasy', emoji: '🗝️' },
  { id: 'scifi', label: 'Sci-Fi', emoji: '🛰️' },
  { id: 'mystery', label: 'Mystery', emoji: '🕯️' },
  { id: 'romance', label: 'Romance', emoji: '🌹' },
  { id: 'horror', label: 'Horror', emoji: '🕳️' },
  { id: 'fable', label: 'Fable', emoji: '🐌' },
  { id: 'adventure', label: 'Adventure', emoji: '🧭' },
  { id: 'comedy', label: 'Comedy', emoji: '🦙' },
];

export const TONES: { id: Tone; label: string }[] = [
  { id: 'hopeful', label: 'Hopeful' },
  { id: 'dramatic', label: 'Dramatic' },
  { id: 'whimsical', label: 'Whimsical' },
  { id: 'dark', label: 'Dark' },
];

export const LENGTHS: { id: Length; label: string; hint: string }[] = [
  { id: 'short', label: 'Short', hint: '~7 scenes' },
  { id: 'medium', label: 'Medium', hint: '~12 scenes' },
  { id: 'long', label: 'Long', hint: '~17 scenes' },
  { id: 'epic', label: 'Epic', hint: '~24 scenes' },
];

interface Ally {
  full: string;
  short: string;
}

interface Bank {
  heroes: string[];
  heroDesc: string[];
  settings: string[];
  places: string[];
  objects: string[];
  villains: string[];
  allies: Ally[];
  allyTraits: string[];
  openings: string[];
  incidents: string[];
  decisions: string[];
  journeys: string[];
  meetings: string[];
  setbacks: string[];
  twists: string[];
  climaxes: string[];
  resolutions: string[];
  titles: string[];
}

const TIMES = ['morning', 'evening', 'night', 'autumn afternoon', 'midsummer dawn', 'grey Tuesday', 'rainy dusk'];

const TONE_BANK: Record<Tone, { closings: string[]; adj: string[]; weather: string[] }> = {
  hopeful: {
    closings: [
      'And if you listen, on quiet nights in {setting}, you can still hear {hero} laughing at how afraid they had once been.',
      'Some stories end. This one simply learned how to breathe.',
      '{hero} never did find out what came next. For the first time, that felt like a gift.',
      'The light in {setting} was different after that. Not brighter — kinder.',
    ],
    adj: ['golden', 'bright', 'gentle', 'warm', 'unhurried'],
    weather: ['soft rain and sudden sunshine', 'a wind that smelled of oranges', 'a slow, forgiving fog', 'the first honest sunlight in weeks'],
  },
  dark: {
    closings: [
      'The lights in {setting} came back on, eventually. Not all of them.',
      '{hero} told no one. Some doors close better when no one knows they were open.',
      'Somewhere, very quietly, {object} began to hum again.',
      'They say {hero} still lives in {setting}. They say it carefully.',
    ],
    adj: ['hollow', 'bruised', 'sour', 'iron-grey', 'unblinking'],
    weather: ['a fog that tasted of copper', 'rain that fell upward for a moment', 'a silence with weight to it', 'a cold that came from inside the walls'],
  },
  whimsical: {
    closings: [
      'And that is why, to this very day, nobody in {setting} trusts a Tuesday.',
      'The end. Mostly. {allyShort} would like it noted that it was mostly their idea.',
      '{hero} put the kettle on. Some adventures deserve tea.',
      'Everyone agreed it was the strangest week in the history of {setting}, which was saying something.',
    ],
    adj: ['ridiculous', 'polka-dotted', 'improbable', 'slightly sticky', 'enthusiastic'],
    weather: ['an inexplicable drizzle of confetti', 'weather that could not make up its mind', 'a breeze with opinions', 'sunshine wearing a hat'],
  },
  dramatic: {
    closings: [
      'The wind carried the last of it away, and {hero} let it.',
      'History would remember {place}. It would take longer to remember {hero}, but it would.',
      '{hero} stood at the edge of {setting} and, at last, did not look back.',
      'It was over. It had cost everything it was always going to cost.',
    ],
    adj: ['burning', 'thunderous', 'vast', 'unforgiving', 'ancient'],
    weather: ['a storm that had been waiting all year', 'a sky the color of old bronze', 'wind that tore the words from every mouth', 'a heat that pressed like a hand'],
  },
};

const BANKS: Record<Genre, Bank> = {
  fantasy: {
    heroes: ['Elowen', 'Tamsin', 'Orin', 'Bramble', 'Isolde', 'Cassian', 'Wren', 'Thistle', 'Maren', 'Fenwick'],
    heroDesc: [
      'a mapmaker who had never left the village',
      'an apprentice with more questions than spells',
      'a shepherd who could hear the wind speak',
      "a baker's child with ink-stained hands",
      'the lantern-keeper of the old bridge',
      'a thief who only stole things that were already lost',
    ],
    settings: [
      'the moss-covered kingdom of Aldermere',
      'a village at the edge of the Whispering Woods',
      'the floating markets of Skyhollow',
      'a valley where the rivers ran uphill',
      'the last lighthouse on the Sea of Glass',
    ],
    places: ['the Hollow Mountain', 'the Court of Thorns', 'the Sunken Library', 'the Bridge of Sighs', 'the Glass Orchard'],
    objects: [
      'a compass that pointed toward lost things',
      'a key carved from moonlight',
      'the last seed of the Silver Tree',
      'a song that could wake stone',
      'a lantern that burned without oil',
    ],
    villains: ['the Hollow King', 'a sorceress who collected shadows', 'the Quiet, a hunger that ate names', 'a dragon made entirely of regret', 'the Marquess of Rust'],
    allies: [
      { full: 'a fox who spoke only in riddles', short: 'the fox' },
      { full: 'a retired knight named Dorrel', short: 'Dorrel' },
      { full: 'a girl made of paper and stubbornness', short: 'the paper girl' },
      { full: 'a grumpy river spirit', short: 'the river spirit' },
      { full: 'a librarian with a sword hidden in her cane', short: 'the librarian' },
    ],
    allyTraits: [
      'knew every shortcut and every trap between here and {place}',
      'had once served {villain} and regretted every day of it',
      'could not tell a lie, which turned out to be a problem',
      'carried a map drawn in disappearing ink',
      "owed {hero}'s grandmother a very old favor",
    ],
    openings: [
      'In {setting}, there lived {heroDesc} named {hero}.',
      '{hero} was {heroDesc}, and in {setting} that had always been enough. Until the {time} it wasn’t.',
      'Every story in {setting} begins with a warning. {hero}’s began with {object}.',
      'Long before the first frost, in {setting}, {hero} — {heroDesc} — found a door that had not been there the night before.',
    ],
    incidents: [
      'One {time}, {object} appeared on {hero}’s doorstep, wrapped in a letter written in a hand they almost recognized.',
      'Then the bells of {setting} rang backward, and {villain} stepped out of the mist to claim {object}.',
      'It began when the river stopped. The elders blamed the weather. {hero} blamed {villain}.',
      'A messenger arrived at {time} with news: {place} had gone silent, and {object} was the only thing that could wake it.',
    ],
    decisions: [
      '{hero} packed bread, a knife, and a stubbornness inherited from three generations, and set out for {place}.',
      'No one asked {hero} to go. That, {hero} decided, was exactly why they had to.',
      '“Someone should do something,” said the mayor. {hero} looked around, realized they were the only someone left, and sighed.',
    ],
    journeys: [
      'The road to {place} wound through {weather}, and {hero} learned that {object} hummed whenever danger was near.',
      'At a crossroads inn, {hero} traded a story for a night’s shelter and overheard travelers whisper that {villain} was gathering an army of {adj} things.',
      'The Whispering Woods lived up to their name. Every branch murmured a different path, and only one of them was telling the truth.',
      '{hero} crossed a bridge guarded by a troll who demanded a riddle. {hero} offered a recipe instead. The troll, unexpectedly, wept.',
      'For three days the mountains gave nothing but wind. On the fourth, they gave a door.',
      'In a village of glassblowers, {hero} watched the sky itself being repaired, one pane at a time.',
      'The river spirit demanded a toll: one true memory. {hero} paid with the smell of their mother’s kitchen, and the road grew lighter.',
      'Under a sky the color of {adj} bruises, {hero} slept in the roots of a tree that dreamed out loud.',
      'A caravan of tinkers carried {hero} as far as the salt flats, where the horizon bent like a bow and the stars sat low enough to touch.',
      'At the edge of the marsh, {hero} found a village where everyone had forgotten their own name, and {object} grew warm in their hands.',
    ],
    meetings: [
      'Along the way, {hero} met {ally}, who {allyTrait}.',
      'It was {ally} who found {hero} first, half-frozen and fully lost. {allyShort} {allyTrait}, and agreed to help — for a price to be named later.',
    ],
    setbacks: [
      'Then {villain} struck. {object} was taken in the night, and with it, the last of {hero}’s certainty.',
      'At the gates of {place}, the guards laughed. No one, they said, had entered in a hundred years. No one, they said, had come back.',
      '{hero} chose the wrong path in the fog and lost two days — and very nearly {allyShort}.',
    ],
    twists: [
      'The truth waited at {place}: {villain} had once been {heroDesc}, too. The same road. The same {object}. A different choice.',
      '{object} was never a weapon. It was a mirror, and {hero} finally understood what it had been trying to show them.',
      'The letter that started it all had been written by {hero} — years from now, in a future that was quietly falling apart.',
    ],
    climaxes: [
      'In the heart of {place}, {hero} faced {villain} with nothing but {object} and a voice that shook only a little. {hero} did not fight. {hero} offered a name — the one {villain} had lost — and the shadows remembered how to be a person.',
      'The final door would only open for someone willing to leave something behind. {hero} set down {object}, and the door, surprised, opened anyway.',
      '{villain}’s army broke against a single truth spoken aloud: that {hero} was afraid, and had come anyway.',
    ],
    resolutions: [
      '{hero} came home to {setting} to find the river running, the bells ringing forward, and {allyShort} waiting at the gate with one last riddle.',
      '{place} woke slowly, the way a house does when someone finally opens the windows. {hero} stayed long enough to see the first light in, and no longer.',
      'They did not call {hero} a hero in {setting}. They called them by name, which {hero} found was better.',
    ],
    titles: ['The Lantern-Keeper’s Road', 'What the River Remembered', 'A Key Carved from Moonlight', 'The Quiet Kingdom', '{hero} and the Hollow Door', 'The Last Seed of Aldermere'],
  },

  scifi: {
    heroes: ['Juno Vale', 'Kit Amari', 'Solen', 'Idris Okafor', 'Pavel Rune', 'Nia Sato', 'Ash Delacroix', 'Remy Tal'],
    heroDesc: [
      'a salvage pilot with a debt on three moons',
      'a maintenance tech who talked to the ship more than the crew',
      'the last cartographer in a galaxy that had stopped exploring',
      'a botanist tending the only tree on the station',
      'an archivist who was not supposed to read the files',
    ],
    settings: [
      'Meridian Station, spinning slow above a dying star',
      'the ice-mining colony of Tethys-9',
      'a generation ship four hundred years from anywhere',
      'the neon sprawl of New Kowloon Orbital',
      'the terraforming outpost on Kepler’s Drift',
    ],
    places: ['the Silent Array', 'the derelict Ascension', 'the core of the Dyson lattice', 'the forbidden deck', 'the last unmapped jump gate'],
    objects: [
      'a signal repeating from a dead sector',
      'a seed vault with a countdown',
      'a memory core that remembered a future',
      'an AI that had learned to lie',
      'a star chart drawn by no human hand',
    ],
    villains: ['the Consortium', 'a rogue swarm called Choir', 'Director Halvorsen', 'the ship’s own navigation intelligence', 'the entity in the Array'],
    allies: [
      { full: 'a decommissioned service drone named Button', short: 'Button' },
      { full: 'Captain Osei, who had lost a ship to this before', short: 'Osei' },
      { full: 'a smuggler who charged by the lie', short: 'the smuggler' },
      { full: 'a child who could read machine code by ear', short: 'the child' },
      { full: 'the station’s grumpy hydroponics AI', short: 'the AI' },
    ],
    allyTraits: [
      'had a plan and a much worse backup plan',
      'had been listening to {object} for years without telling anyone',
      'trusted no one, which made the trust they finally gave heavier',
      'could rewire anything with a paperclip and spite',
    ],
    openings: [
      'On {setting}, {hero} was {heroDesc}. It was not a glamorous life, but the air was mostly breathable.',
      '{hero} had exactly one rule on {setting}: never open a channel you can’t close. {heroDesc} learns that early.',
      'The thing about {setting} is that nothing ever happens there. {hero}, {heroDesc}, had counted on that.',
    ],
    incidents: [
      'At {time}, ship-time, {object} lit up every console on the deck. Nobody had touched anything.',
      'The message came in on a frequency that had been decommissioned for a century. It knew {hero}’s name.',
      'Then {villain} sealed the docks, and the official reason was “routine.” Nothing on {setting} had ever been routine.',
      '{hero} found {object} in a crate marked FOOD, and it was very much not food.',
    ],
    decisions: [
      'Protocol said report it. {hero} thought about who would be reading the report, and quietly disabled the log.',
      'There was a shuttle, a window of eleven minutes, and a very bad idea. {hero} took all three.',
      '{hero} told the ship it was a maintenance run. The ship, to its credit, pretended to believe it.',
    ],
    journeys: [
      'The jump to {place} took nine hours and most of {hero}’s nerve. Outside, the stars smeared into {adj} lines.',
      'In the dark between waypoints, {object} started answering questions {hero} had not asked out loud.',
      '{hero} docked with a station that had been abandoned so long the plants had learned to run the airlocks.',
      'A debris field forced a detour through {weather}, or what passed for it in vacuum: a storm of frozen fuel and old regrets.',
      'The ship’s corridors were lined with photographs of a crew that had never existed. {hero} did not look at them twice.',
      'Somewhere past the third relay, gravity forgot itself for a while and {hero} drifted, watching {object} pulse like a slow heart.',
      'The colony on Mirren-4 traded {hero} fuel for stories. They had not heard a new one in sixty years.',
      'A wall of the Array turned transparent as {hero} passed. Beyond it, something enormous turned its attention, slowly, like a lighthouse.',
      'For two days the only sound was the hull ticking as it cooled, and {hero} learned to sleep inside that rhythm.',
    ],
    meetings: [
      'On the way, {hero} picked up {ally}, who {allyTrait}.',
      'The distress beacon turned out to be {ally}. {allyShort} {allyTrait}, and refused to be left behind.',
    ],
    setbacks: [
      '{villain} was waiting at the relay. The shuttle lost an engine, half its air, and every plan {hero} had made.',
      'The core rejected {hero}’s access. Then it rejected {hero}’s existence, which was a new kind of error.',
      'Life support dropped to eleven percent. {allyShort} did the math twice and then stopped doing the math.',
    ],
    twists: [
      '{object} was not sending a message. It was recording one. And it had been recording {hero} all along.',
      'The entity at {place} was not alien. It was the sum of every crew log ever deleted, and it had missed people terribly.',
      '{villain} had been trying to stop the signal because it was a warning — about the thing that came after.',
    ],
    climaxes: [
      'At {place}, with the alarms screaming and {allyShort} holding the hatch, {hero} did the one thing no protocol covered: they answered honestly. The Array went quiet, then warm.',
      '{hero} rerouted every watt on the ship into a single broadcast — not a weapon, a hello — and {villain}’s fleet listened.',
      'The countdown reached zero. Nothing exploded. Instead, {object} opened like a flower, and inside it was a map home.',
    ],
    resolutions: [
      '{hero} came back to {setting} with one engine, no permits, and a passenger the manifest could not describe.',
      'The docks reopened at dawn. Officially, nothing had happened. Unofficially, every console on the station now said good morning.',
      '{hero} planted the seed from the vault in the only tree on the station. It would take a hundred years to know if it worked. That felt right.',
    ],
    titles: ['Signal From a Dead Sector', 'Eleven Minutes to Meridian', 'The Cartographer’s Last Jump', 'What the Array Remembered', '{hero} and the Silent Deck', 'A Hello Across the Dark'],
  },

  mystery: {
    heroes: ['Mara Quill', 'Inspector Halloway', 'Ines Farrow', 'Theo Marsh', 'Ada Lockwood', 'Benedict Crane'],
    heroDesc: [
      'a detective who noticed everything and forgave nothing',
      'a librarian who solved crimes on her lunch break',
      'a retired inspector who could not stay retired',
      'a journalist with one last favor to call in',
      'a locksmith who had never met a door that kept a secret',
    ],
    settings: [
      'the fog-bound harbor town of Greywater',
      'a grand hotel where every guest had a secret',
      'a sleeping village in the hills',
      'the rain-slick streets of a city that never slept but often lied',
    ],
    places: ['the Whitlock estate', 'the abandoned observatory', 'the shuttered Rialto theater', 'the lighthouse on Cutter’s Point', 'the sealed east wing'],
    objects: [
      'a pocket watch stopped at 3:14',
      'a letter that was never sent',
      'a photograph with one face scratched out',
      'a ledger written in two different hands',
      'a single left-handed glove, still warm',
    ],
    villains: ['the mayor’s charming brother', 'the widow Ashcombe', 'a man calling himself Mr. Wren', 'the family solicitor', 'someone who had been in the room all along'],
    allies: [
      { full: 'Sergeant Ofori, who asked good questions', short: 'Ofori' },
      { full: 'a barmaid with a memory like a vault', short: 'the barmaid' },
      { full: 'an elderly clockmaker named Pell', short: 'Pell' },
      { full: 'a stray cat that led the way twice', short: 'the cat' },
    ],
    allyTraits: [
      'kept the town’s secrets and, occasionally, sold them',
      'had seen the victim the night before and lied about it exactly once',
      'owed {hero} a life and knew it',
      'knew everyone’s routine down to the minute',
    ],
    openings: [
      '{hero} had come to {setting} to rest. {setting} had other plans.',
      'There was {weather} the {time} {hero} arrived in {setting}, and {hero} — {heroDesc} — noticed that nobody would meet their eye.',
      'There are two kinds of quiet in {setting}. {hero} knew, within an hour, that this was the wrong kind.',
    ],
    incidents: [
      'The body was found at {place} at {time}. Beside it: {object}. Nobody could explain either.',
      'Then Lord Whitlock vanished from a locked room, leaving behind {object} and a glass of wine still cold.',
      'A note slipped under {hero}’s door read: “Ask about {object}. Then leave.” {hero} did neither.',
    ],
    decisions: [
      'The constable said it was an accident. {hero} said nothing, which is how {hero} said no.',
      '{hero} ordered another coffee, opened a notebook, and wrote a single name at the top of the page. Then crossed it out.',
      'Officially, {hero} had no jurisdiction. Unofficially, {hero} had {object} in one pocket and a list of questions in the other.',
    ],
    journeys: [
      'At {place}, {hero} found the dust disturbed in exactly one place — where someone had knelt to hide {object}.',
      'The housekeeper swore she had heard nothing. But her hands trembled when {hero} mentioned {time}.',
      '{villain} was charming over tea, and charming people, {hero} had learned, were usually rehearsing something.',
      'The clock in the hall ran fourteen minutes slow. Every clock in the house ran fourteen minutes slow. Someone had wanted it that way.',
      'In the town records, a page had been razored out so neatly it could only have been done by someone who loved paper.',
      'The tide charts told {hero} what the witnesses would not: at {time}, the causeway had been under six feet of water.',
      '{hero} walked the route from {place} to the station in {weather}, counting steps. It took eleven minutes. The alibi claimed four.',
      'A second letter arrived, in the same hand as the first. This one said only: “You are looking at the wrong hand.”',
    ],
    meetings: [
      '{hero} found an unlikely partner in {ally}, who {allyTrait}.',
      'It was {ally} who first mentioned the east wing. {allyShort} {allyTrait}, and that made {allyShort} either invaluable or dangerous.',
    ],
    setbacks: [
      'The chief inspector arrived from the city and closed the case in an afternoon. {hero} was asked, politely, to leave {setting}.',
      '{object} disappeared from the evidence room. The log said {hero} had signed it out.',
      'The only witness recanted. Then the only witness left town. Then the only witness’s house burned down.',
    ],
    twists: [
      'The watch had not stopped at 3:14. It had been set there — because 3:14 was the moment the real crime had been committed, years earlier.',
      'The face scratched out of the photograph was not the victim’s. It was {hero}’s.',
      'There had never been a murder. There had been two, and the second was staged to hide how ordinary the first one was.',
    ],
    climaxes: [
      '{hero} gathered them all in the drawing room of {place} — a cliché, {hero} admitted, but clichés exist because they work. Then {hero} laid {object} on the table and watched exactly one face go pale.',
      'The confession came in the rain, on the causeway, with the tide rising around both their ankles. {villain} did not run. There was, by then, nowhere left in {setting} to run to.',
      '{hero} said the second name aloud, and {villain} laughed — right up until {allyShort} produced the glove.',
    ],
    resolutions: [
      '{setting} went back to its quiet. The right kind, this time. {hero} stayed one more night, out of spite, and slept beautifully.',
      'Justice, {hero} reflected on the train home, was mostly just paying attention for longer than anyone expected you to.',
      'The case was closed. The file was thin. {hero} kept {object} anyway, as a reminder that clocks can be made to lie.',
    ],
    titles: ['The Watch That Stopped at 3:14', 'Fourteen Minutes Slow', 'What the Tide Knew', 'The Left-Handed Glove', 'A Quiet of the Wrong Kind', '{hero} and the Sealed Wing'],
  },

  romance: {
    heroes: ['Elena', 'Marcus', 'Priya', 'Jonah', 'Amara', 'Theo', 'Lucía', 'Sam'],
    heroDesc: [
      'a pastry chef who believed in recipes, not fate',
      'a cartographer who had never once been lost',
      'a florist who had stopped keeping flowers at home',
      'a night-shift radio host with a voice for strangers',
      'an architect who fixed everything except the roof over their own head',
    ],
    settings: [
      'a seaside town that closed every winter',
      'the narrow, lantern-lit streets of the old quarter',
      'a bookshop that doubled as a bus stop when it rained',
      'a city that was always half under construction',
    ],
    places: ['the old pier', 'the rooftop garden', 'the last train of the night', 'the flower market at dawn', 'the lighthouse steps'],
    objects: ['a borrowed umbrella', 'a mixtape with no track list', 'a library book two decades overdue', 'a single unsent postcard', 'a scarf left on a train'],
    villains: ['a job offer in another country', 'a long-held secret', 'a well-meaning family', 'the memory of someone else', 'a lease that ended in spring'],
    allies: [
      { full: 'a bookseller named Ravi', short: 'Ravi' },
      { full: 'a lighthouse keeper called June', short: 'June' },
      { full: 'the chef who kept sending back reviews', short: 'the chef' },
      { full: 'a violinist who played the same corner every Thursday', short: 'the violinist' },
      { full: 'the new neighbor with far too many plants', short: 'the neighbor' },
    ],
    allyTraits: [
      'laughed at exactly the wrong moments and made them the right ones',
      'remembered every small thing {hero} said and none of the big ones',
      'was leaving in spring, and had not mentioned it yet',
      'had a habit of showing up whenever it rained',
    ],
    openings: [
      '{hero} was {heroDesc}, which is to say {hero} had a system, and the system worked. In {setting}, that passed for happiness.',
      'In {setting}, everyone knew {hero} — {heroDesc} — and nobody knew {hero} at all.',
      '{hero} did not believe in signs. So when {object} turned up three times in one week, {hero} called it coincidence, firmly, out loud.',
    ],
    incidents: [
      'One {time}, in {weather}, {hero} collided with {ally} at {place}, and {object} ended up in the wrong hands.',
      'It started with {object}. {hero} meant to return it. {hero} kept not returning it.',
      'The stranger at {place} ordered the same thing {hero} always ordered, sat in {hero}’s seat, and looked up. That was {ally}.',
    ],
    decisions: [
      '{hero} told themself it was only polite to return {object}. {hero} changed shirts twice before doing so.',
      'There was a version of the evening where {hero} went home. {hero} did not choose that version.',
      '“Just coffee,” {hero} said. It was, historically, the most dangerous phrase in {setting}.',
    ],
    journeys: [
      'They walked the length of {place} arguing about nothing, and {hero} noticed the argument had lasted four hours.',
      '{allyShort} {allyTrait}. {hero} began, without permission, to look forward to the rain.',
      'On the last train of the night, {allyShort} fell asleep on {hero}’s shoulder, and {hero} missed their stop on purpose.',
      'They made a game of {object}: whoever had it owed the other a story. The stories got longer. The {adj} truth got closer.',
      'At the flower market, {allyShort} bought a single stem and pretended it was for someone else. {hero} pretended to believe it.',
      '{hero} cooked. {allyShort} critiqued. It was the best meal either of them had ever eaten, and it was slightly burnt.',
      'One {time}, {hero} caught themself humming, and could not remember the last time that had happened.',
      'They found the old pier lit up for no reason at all, and danced badly, and did not stop when the lights went out.',
    ],
    meetings: [
      '{allyShort}, it turned out, {allyTrait}.',
      'What {hero} had not known about {allyShort}: they {allyTrait}.',
    ],
    setbacks: [
      'Then {villain} arrived, the way weather does, and {hero} said the practical thing instead of the true one.',
      '{allyShort} left {object} on {hero}’s doorstep with no note. {hero} understood it as goodbye. It was not.',
      'The words came out wrong at {place}, and {allyShort} walked home in {weather}, and {hero} let them.',
    ],
    twists: [
      'The postcard {hero} never sent had been written to {allyShort} — years ago, before they had ever met, to a stranger {hero} had once seen on a train.',
      '{allyShort} had known about {villain} all along, and had been trying to give {hero} a way out. {hero} did not want one.',
      'The mixtape had a track list after all, written on the inside of the case. Every song was one {hero} had once sung at {place}, alone.',
    ],
    climaxes: [
      '{hero} ran — actually ran, which {hero} never did — through {weather} to {place}, and said the true thing, badly, all at once. {allyShort} laughed, then didn’t, then said it back.',
      'The train was already moving. {hero} did not chase it. {hero} went home, sat down, and wrote the postcard. It arrived before the train did.',
      '{hero} returned {object} at last. Inside it was a note in {allyShort}’s handwriting: “Keep it. Keep me.”',
    ],
    resolutions: [
      'They stayed in {setting}, mostly. {villain} turned out to be smaller than it looked, the way most things do from close up.',
      'The bookshop still doubles as a bus stop when it rains. Two people, now, are always there when it does.',
      '{hero} kept the system. {hero} just made room in it.',
    ],
    titles: ['A Borrowed Umbrella', 'The Last Train Home', 'Just Coffee', 'What {hero} Kept', 'Slightly Burnt', 'The Unsent Postcard'],
  },

  horror: {
    heroes: ['Nell', 'Caleb', 'Rosa', 'Ezra', 'June', 'Tobias'],
    heroDesc: [
      'a night-shift nurse who did not believe in ghosts',
      'a house-sitter with a strict no-questions policy',
      'a podcaster chasing one last story',
      'a substitute teacher at a school with a locked wing',
      'a surveyor sent to measure a house that kept changing size',
    ],
    settings: [
      'the Blackwood Sanatorium',
      'a farmhouse at the end of Route 9',
      'a town where the streetlights hummed a lullaby',
      'an apartment building whose elevator visited a floor that did not exist',
    ],
    places: ['the basement', 'the room behind the wallpaper', 'the drained reservoir', 'the cellar door that was always found open', 'the thirteenth floor'],
    objects: [
      'a music box that played by itself',
      'a recording of a voice that had not been born yet',
      'a child’s drawing of the house with one extra window',
      'a mirror that ran two seconds slow',
      'a guest book signed in the same hand for ninety years',
    ],
    villains: ['the thing in the walls', 'the Smiling Man', 'whatever wore Grandmother’s face', 'the congregation', 'the house itself'],
    allies: [
      { full: 'a librarian who kept the town’s missing-persons file', short: 'the librarian' },
      { full: 'the old caretaker, Mr. Voss', short: 'Voss' },
      { full: 'a stray dog that refused to go inside', short: 'the dog' },
      { full: 'a stranger online who knew far too much', short: 'the stranger' },
    ],
    allyTraits: [
      'had survived this before, in a way that did not look like surviving',
      'kept a list of every window in {setting}, and the list was one number too long',
      'would not say {villain}’s name after dark',
      'had been waiting for {hero} specifically, and could not explain why',
    ],
    openings: [
      '{hero} took the job at {setting} because it paid well and asked no questions. {hero}, {heroDesc}, appreciated the symmetry.',
      'The listing for {setting} said “quiet.” It did not say what kind. {hero} — {heroDesc} — would learn.',
      'There was nothing wrong with {setting}. {hero} repeated that on the first night, and the second, and stopped repeating it on the third.',
    ],
    incidents: [
      'On the first {time}, {hero} found {object} on the kitchen table. The kitchen had been locked. The kitchen was always locked.',
      'At 3:33 the lights dimmed, and somewhere below, {object} began — softly, patiently — to play.',
      'The neighbors did not wave. The neighbors, {hero} realized, were all facing the house.',
    ],
    decisions: [
      '{hero} should have left. Everyone in these stories should leave. {hero} made tea instead, and checked the locks, and stayed.',
      'The road out was flooded by {weather}. {hero} told themself that was the reason.',
      '{hero} decided to document it. That was the mistake. Things that are watched like to be watched back.',
    ],
    journeys: [
      'The drawing appeared again, on the fridge this time. The extra window had a face in it now. The face was {hero}’s.',
      '{hero} counted the doors on the second floor: seven. In the morning: eight. {hero} did not open the new one. Yet.',
      'The mirror in the hall showed {hero} two seconds late — long enough to watch their own reflection notice something over their shoulder.',
      'Down in {place}, the walls were warm. Not damp. Warm, like something breathing on the other side.',
      'The music box played a lullaby {hero}’s mother used to sing. {hero}’s mother had made it up. Nobody else had ever heard it.',
      '{villain} was polite at first. A knock, a pause, a knock. Always at {time}. Always one knock more than the night before.',
      'The town’s records listed {setting} as demolished in 1961. {hero} was standing in it.',
      'For one hour, the phone worked. Every number {hero} called was answered by {hero}’s own voice, a little older, saying: “Don’t.”',
    ],
    meetings: [
      'The only person who would talk was {ally}, who {allyTrait}.',
      '{ally} found {hero} at {place}. {allyShort} {allyTrait}, which made their warning very hard to dismiss.',
    ],
    setbacks: [
      'The stairs down to {place} were longer on the way back. {hero} counted. Forty steps became sixty. Sixty became a place with no light.',
      '{allyShort} stopped answering. The last message said only: “It knows your name now. Don’t let it say it.”',
      '{hero} woke standing at the cellar door, hand on the latch, with no memory of walking there.',
    ],
    twists: [
      'The guest book’s ninety years of signatures were all {hero}’s. The most recent was dated tomorrow.',
      'The house was not haunted. The house was hiding {hero} from what was outside. It had been doing so for a very long time.',
      '{villain} had never been in the walls. {villain} had been the person {hero} kept seeing in the mirror, two seconds behind.',
    ],
    climaxes: [
      'In {place}, {hero} finally opened the eighth door. Behind it was the kitchen — the same kitchen, the same table, {object} waiting — and {hero} understood that the house had no outside anymore.',
      '{hero} played the music box backward. The house screamed. Then, for the first time in ninety years, it was silent.',
      'The Smiling Man said {hero}’s name at last, gently, like an old friend. {hero} did not turn around. {hero} walked to the door and kept walking, and did not stop for three towns.',
    ],
    resolutions: [
      '{hero} lives somewhere with no basement now. {hero} does not own a mirror. On some nights, when it rains, the music box plays anyway.',
      'The listing for {setting} is up again. It says “quiet.” It has one more window than it did.',
      '{hero} made it out. That is what the report says. The report is in {hero}’s handwriting. {hero} does not remember writing it.',
    ],
    titles: ['One Window Too Many', 'The Eighth Door', 'Two Seconds Slow', 'Route 9', 'What the House Kept', 'The Guest Book'],
  },

  fable: {
    heroes: ['Pip the Mouse', 'Bram the Tortoise', 'Marigold the Hare', 'Ink the Crow', 'Fennel the Fox', 'Juniper the Hedgehog'],
    heroDesc: [
      'the smallest in a family of twelve',
      'who wanted, more than anything, to fly',
      'known throughout the meadow for asking “why?”',
      'who had never once been on time',
      'who kept a collection of interesting pebbles and one very boring one',
    ],
    settings: ['the Great Meadow beyond the stone wall', 'a hollow oak at the heart of Bramblewood', 'the pond where the moon came to drink', 'a farm at the very end of the lane'],
    places: ['the Far Hill', 'the Owl’s Court', 'the Singing Orchard', 'the other side of the river', 'the top of the Tall Tree'],
    objects: ['a golden acorn', 'the Sun’s lost button', 'a feather that belonged to the wind', 'the last strawberry of summer', 'a very small, very heavy secret'],
    villains: ['a vain peacock named Sir Plume', 'the winter itself', 'a greedy badger', 'a shadow that stole naps', 'a rumor with legs'],
    allies: [
      { full: 'a patient snail named Dot', short: 'Dot' },
      { full: 'a bumblebee who hummed only in questions', short: 'the bumblebee' },
      { full: 'a wise old goose', short: 'the goose' },
      { full: 'the smallest cloud in the sky', short: 'the little cloud' },
    ],
    allyTraits: [
      'was slow, but had never once been lost',
      'knew the names of all the stars and had made half of them up',
      'had crossed the river before, backwards, by accident',
      'could not keep a secret but could keep a promise',
    ],
    openings: [
      'Once, in {setting}, there lived {hero}, {heroDesc}.',
      'Everyone in {setting} knew {hero}. {hero} was {heroDesc}, and that is where this story starts.',
      'In {setting}, one {time} under {weather}, {hero} — {heroDesc} — woke up with an idea.',
    ],
    incidents: [
      'One {time}, {object} rolled right up to {hero}’s door. It did not roll up to anyone else’s.',
      'Then {villain} came to {setting} and declared that {object} belonged to whoever was biggest.',
      'The old goose said {place} was too far for someone so small. {hero} decided to find out.',
    ],
    decisions: [
      '{hero} packed three seeds, one pebble, and a great deal of courage, and set off toward {place}.',
      '“Someone small can’t do that,” said everyone. “Then I shall do it smally,” said {hero}.',
      '{hero} did not know the way. {hero} decided that not knowing was simply the first part of finding out.',
    ],
    journeys: [
      'The grass was tall as a forest, and {hero} learned that when you cannot see over something, you can often see under it.',
      'At the river, {hero} could not swim. So {hero} asked. A leaf, it turned out, had been waiting all day to be a boat.',
      'On the Far Hill, the wind tried to blow {hero} home. {hero} sat down and waited. The wind, having no patience, gave up first.',
      '{hero} met a caterpillar who was very worried about becoming something else. “Me too,” said {hero}, and they felt better together.',
      'The Singing Orchard sang only for those who listened first. {hero} listened for a whole afternoon, and the apples fell for them.',
      'Under a sky of {adj} stars, {hero} shared the last strawberry with a stranger, and it tasted twice as sweet.',
      '{hero} got lost. Properly, gloriously lost. And discovered, in the getting, a shortcut that no one in {setting} had ever known.',
      'A puddle showed {hero} their own reflection. “You’re smaller than I thought,” said {hero}. “So are you,” said the puddle.',
    ],
    meetings: [
      'On the way, {hero} met {ally}, who {allyTrait}.',
      'It was {ally} who offered to come along. {allyShort} {allyTrait}, and that turned out to matter enormously.',
    ],
    setbacks: [
      'Then {villain} blocked the path and laughed, and {hero} felt exactly as small as everyone had said.',
      '{object} rolled down the hill and into the brambles, and it grew dark, and {hero} sat down to cry — just a little.',
      'The bridge was gone. Just gone. {allyShort} said nothing, which was the kindest thing to say.',
    ],
    twists: [
      '{object} had never been the treasure. The treasure was that {hero} now knew the way — and could show it to someone else.',
      '{villain}, up close, was not big at all. {villain} was simply standing very near, and very loudly.',
      'The Owl at {place} had sent {object} on purpose. Not to be found, but to be followed.',
    ],
    climaxes: [
      'At {place}, {hero} stood before {villain} and did not grow bigger. Instead, {hero} asked a question so good that {villain} had to sit down and think, and while {villain} thought, everyone else went home.',
      '{hero} could not lift {object} alone. So {hero} did not. {allyShort} pushed, the bumblebee pulled, the wind — apologizing — helped, and it moved.',
      '{hero} gave {object} back to the sky. The sky, being polite, said thank you, and the whole meadow turned {adj} for a moment.',
    ],
    resolutions: [
      '{hero} came home to {setting} no bigger than before, and everyone noticed anyway.',
      'The moral, said the goose, is that small things go far. The moral, said {hero}, is that you have to start.',
      'From then on, whenever someone in {setting} said “too far,” someone else said “{hero},” and that settled it.',
    ],
    titles: ['The Very Small Traveler', 'What the Puddle Said', 'Smally', 'The Sun’s Lost Button', '{hero} Goes Far', 'The Leaf That Was a Boat'],
  },

  adventure: {
    heroes: ['Lira Voss', 'Jack Halloran', 'Zuri Okonkwo', 'Mateo Reyes', 'Sable Finch', 'Ada Winter'],
    heroDesc: [
      'a treasure hunter who had never actually found treasure',
      'a cartographer with a fear of heights',
      'a river guide with one map and a great deal of nerve',
      'an archaeologist who refused to stay in the museum',
      'a pilot whose plane was older than most countries',
    ],
    settings: ['a port city at the edge of the known charts', 'the highlands of Karrak', 'a jungle basin no satellite could see', 'a frozen strait where ships went to vanish'],
    places: ['the Lost City of Oyo', 'the Temple of Nine Winds', 'the Sunken Fleet', 'the summit of Mount Veil', 'the Cavern of Echoes'],
    objects: ['a map inked in three languages', 'the Compass of Saint Elmo', 'a key to a door in the ice', 'a journal with the last page torn out', 'a brass astrolabe that pointed down'],
    villains: ['Baron Kessler and his hired guns', 'a rival expedition led by an old friend', 'the river itself', 'the Company', 'a storm with a name'],
    allies: [
      { full: 'a mule named Constance', short: 'Constance' },
      { full: 'a smuggler called Two-Knives', short: 'Two-Knives' },
      { full: 'a local guide who knew the mountain’s moods', short: 'the guide' },
      { full: 'a brilliant, nervous engineer named Wick', short: 'Wick' },
    ],
    allyTraits: [
      'had been to {place} once and come back with fewer fingers',
      'could fix an engine with a boot and a prayer',
      'did not trust {hero}, and said so, hourly',
      'owed money in four ports and favors in six',
    ],
    openings: [
      '{hero} was {heroDesc}, which in {setting} made {hero} either a legend or a cautionary tale, depending on the bar.',
      'In {setting}, {hero} — {heroDesc} — had a rule: never take a job that begins with “you won’t believe this.”',
      'The letter found {hero} in {setting}, three weeks late and smelling of salt. {hero} read it twice, then bought a ticket.',
    ],
    incidents: [
      'A dying man pressed {object} into {hero}’s hands at {time} and said one word: “{place}.”',
      'Then {villain} burned down the only other copy, and {object} became the most valuable thing in {setting}.',
      '{object} arrived in a crate with no return address. The crate had been shot at. Twice.',
    ],
    decisions: [
      '{hero} had exactly enough money for a boat, a guide, and no mistakes. {hero} bought the boat.',
      'The smart move was to sell {object}. {hero} unrolled it on the table instead and started planning.',
      '“It can’t be done,” said the harbormaster. {hero} was already loading supplies.',
    ],
    journeys: [
      'The river narrowed into a throat of stone, and {hero} learned to read the water the way others read faces.',
      'Above the tree line, the air went thin and {adj}, and every step toward {place} cost two breaths.',
      'They crossed the strait at night in {weather}, engines off, listening for the ice.',
      'The jungle took the tents on the third night and the radio on the fourth. It left the map. The map, {hero} suspected, was why it let them live.',
      'In a village at the foot of Mount Veil, an old woman looked at {object} and closed her door. Then opened it again and handed {hero} a coat.',
      'A rope bridge, a gorge, a cartographer with a fear of heights. {hero} crossed it anyway, eyes shut, counting to four hundred.',
      'The Sunken Fleet lay in water so clear it seemed to float. Between the wrecks, something with a lot of teeth patrolled lazily.',
      'Kessler’s men were half a day behind. {hero} could see their fires. {hero} lit none.',
    ],
    meetings: [
      'In {setting}, {hero} hired {ally}, who {allyTrait}.',
      '{ally} was not part of the plan. {allyShort} {allyTrait}, and turned out to be the best part of it.',
    ],
    setbacks: [
      'The rope snapped. The supplies went into the gorge. {hero} kept the map and {allyShort}, and for one long night that did not feel like enough.',
      '{villain} reached {place} first. {hero} arrived to find the door already open and the guards already bored.',
      'The journal’s last page was in {villain}’s pocket. It had been there since the beginning.',
    ],
    twists: [
      '{place} was not lost. It had been hidden — by the people who lived there still, and who had been watching {hero} since the river.',
      'The treasure was water. A spring, clean and endless, in a valley that had been dying of thirst. {villain} had known, and wanted to sell it.',
      'The map was not a map of {place}. It was a map of the way home, drawn by the last person who had never made it.',
    ],
    climaxes: [
      'At the summit, in {weather}, {hero} faced {villain} with the astrolabe pointing straight down — and understood, finally, that the door had been beneath their feet the whole time.',
      '{hero} gave {villain} the map. All of it. Then {hero} took the other road — the one that wasn’t on it — and reached {place} while {villain} was still reading.',
      'The temple sealed behind them with a sound like a held breath. Inside, {object} fit the door as if it had been waiting. It had.',
    ],
    resolutions: [
      '{hero} came back to {setting} with no treasure, one mule, and a story nobody believed. {hero} found that was enough.',
      'They left the spring where it was. {hero} drew the map wrong on purpose, and slept well for the first time in years.',
      '{hero} still has {object}. It still points down. {hero} has learned to take that as encouragement.',
    ],
    titles: ['The Compass That Pointed Down', 'Four Hundred Steps', 'The Way Home Is Not on the Map', 'What the River Let Us Keep', 'Mount Veil', '{hero} and the Ninth Wind'],
  },

  comedy: {
    heroes: ['Gary', 'Beatrix Plum', 'Dev', 'Nancy from Accounting', 'Todd', 'Marguerite'],
    heroDesc: [
      'a man who had never once won an argument with a printer',
      'an event planner with a paralyzing fear of balloons',
      'a substitute mascot for a team that had already left town',
      'the world’s least intimidating bouncer',
      'a life coach who had never finished a single thing',
    ],
    settings: ['a suburb where the HOA had its own navy', 'the third-worst pizza place in town', 'an office park with an ominously friendly HR department', 'a cruise ship that had run aground in a parking lot'],
    places: ['the regional finals', 'the HOA annual meeting', 'the birthday party of a very judgmental seven-year-old', 'the DMV', 'the mall fountain'],
    objects: ['a cursed karaoke machine', 'a coupon for one free wish (some restrictions apply)', 'a llama named Doug', 'the last parking space', 'a trophy engraved with the wrong name'],
    villains: ['Karen from the HOA', 'a very smug goose', 'their own reflection, which had started giving notes', 'the algorithm', 'a rival with better hair'],
    allies: [
      { full: 'a barista who knew everyone’s order and everyone’s business', short: 'the barista' },
      { full: 'a retired stuntman with a bad hip and a good heart', short: 'the stuntman' },
      { full: 'an intern with no fear and no permissions', short: 'the intern' },
      { full: 'a llama named Doug', short: 'Doug' },
    ],
    allyTraits: [
      'had a plan involving a forklift and did not want to discuss it',
      'was banned from three counties for reasons that were, technically, heroic',
      'believed in {hero} with a confidence that was frankly unearned',
      'could not be reasoned with, only redirected',
    ],
    openings: [
      '{hero} was {heroDesc}. In {setting}, this was considered a career.',
      'Everyone in {setting} liked {hero}, {heroDesc}, in the way one likes a rug: warmly, and without ever thinking about it.',
      'It was a {time} like any other in {setting} when {hero} — {heroDesc} — made the fatal mistake of saying “How hard could it be?”',
    ],
    incidents: [
      'Then {object} arrived, unrequested, and {villain} announced there would be a competition. There was always a competition.',
      'At {time}, {hero} accidentally won {object}. {hero} had not been aware of entering.',
      'A misunderstanding at {place} — involving {object}, a microphone, and the phrase “hold my drink” — put {hero} in charge of everything.',
    ],
    decisions: [
      '{hero} weighed the options: dignity, or {object}. It was not close.',
      '“I’m not doing that,” said {hero}, already doing that.',
      '{hero} made a list titled PLAN. Under it, {hero} wrote “1.” and then stared at it for forty minutes. Then {hero} went anyway.',
    ],
    journeys: [
      'The first attempt involved {object} and ended with {hero} being politely asked to leave {place} by a man wearing a lanyard the size of a bib.',
      '{villain} sent a strongly worded letter. {hero} sent a strongly worded reply. Both were, on reflection, about a hedge.',
      'At the DMV, {hero} took a number. The number was 4. The screen said “Now Serving: B.” {hero} sat down to think about that.',
      '{hero} attempted a disguise. The disguise was a hat. Everyone recognized {hero} immediately, but complimented the hat.',
      'Things escalated at {place}, as things do when a llama is involved and nobody has thought to ask why.',
      'The plan required silence. {hero} had brought {allyShort}. {allyShort} had brought a kazoo.',
      'For one shining moment at {place}, {hero} was winning. Then the sprinklers came on, in {weather}, indoors.',
      '{hero} tried to reason with {villain}. {villain} tried to reason with {hero}. A bystander filmed it. It has eleven million views.',
    ],
    meetings: [
      '{hero} teamed up with {ally}, who {allyTrait}.',
      'Help arrived in the form of {ally}. {allyShort} {allyTrait}, which was either a strength or a lawsuit waiting to happen.',
    ],
    setbacks: [
      'It all fell apart at {place}, when {object} malfunctioned during the anthem and {hero} was blamed for a goose.',
      '{villain} filed a complaint. Then a counter-complaint. Then, somehow, a patent.',
      '{hero} lost. Publicly. On a stage. To a child. The child was gracious about it, which was worse.',
    ],
    twists: [
      'The trophy had said the wrong name all along because it was never meant for {hero}. It was meant for {allyShort}, who had been carrying {hero} the entire time and was too polite to mention it.',
      '{villain} was not the enemy. {villain} was just lonely, and terrible at showing it, and also — this was confirmed later — a goose.',
      'The coupon’s restrictions, read in full, said only: “Must be used on someone else.” {hero} had not read it in full. Nobody ever does.',
    ],
    climaxes: [
      'At {place}, with the whole of {setting} watching, {hero} plugged in {object}, chose the one song {hero} actually knew, and sang it so badly and so sincerely that {villain} — undone — began to cry, and then to harmonize.',
      '{hero} did not win the competition. {hero} won the raffle, which nobody had known was happening, and the prize was the deed to {setting}.',
      'In the end, {hero} simply said sorry — to {villain}, to the goose, to {allyShort}, to the fountain — and the whole {adj} mess resolved itself out of sheer surprise.',
    ],
    resolutions: [
      '{hero} is still {heroDesc}. But now {hero} has {object}, a nemesis who waves, and a llama with a parking space.',
      'The HOA disbanded its navy. {villain} kept the hat. {hero} kept everything else, including, unexpectedly, the goose.',
      'There is a plaque at {place} now. It says the wrong name. {hero} has decided that is fine.',
    ],
    titles: ['How Hard Could It Be', 'Now Serving: B', 'Doug', 'Some Restrictions Apply', 'The Hat Was Complimented', '{hero} vs. the Goose'],
  },
};

const SHAPES: Record<Length, { journeys: number; allies: number; setbacks: number; twist: boolean }> = {
  short: { journeys: 1, allies: 0, setbacks: 0, twist: false },
  medium: { journeys: 3, allies: 1, setbacks: 1, twist: true },
  long: { journeys: 6, allies: 1, setbacks: 2, twist: true },
  epic: { journeys: 11, allies: 2, setbacks: 3, twist: true },
};

function capitalizeSentences(s: string): string {
  return s.replace(/(^|[.!?…]\s+)([a-z])/g, (_, p, c: string) => p + c.toUpperCase());
}

function shortName(full: string): string {
  const words = full.trim().split(/\s+/);
  if (words.length === 1) return full;
  if (/^(inspector|detective|captain|dr\.?|doctor|sir|lady|old|professor|nurse)$/i.test(words[0])) return words[words.length - 1];
  return words[0];
}

export function generateStory(opts: StoryOptions): StoryResult {
  const seed = opts.seed ?? Math.floor(Math.random() * 2 ** 31);
  const rng = mulberry32(seed);
  const genre: Genre = opts.genre === 'random' ? pick(rng, GENRES).id : opts.genre;
  const bank = BANKS[genre];
  const tone = TONE_BANK[opts.tone];
  const shape = SHAPES[opts.length];

  const ally = pick(rng, bank.allies);
  const ally2 = pick(rng, bank.allies.filter((a) => a !== ally));
  const vars: Record<string, string> = {
    hero: opts.hero?.trim() || pick(rng, bank.heroes),
    heroDesc: pick(rng, bank.heroDesc),
    setting: pick(rng, bank.settings),
    place: pick(rng, bank.places),
    object: opts.spark?.trim() || pick(rng, bank.objects),
    villain: pick(rng, bank.villains),
    ally: ally.full,
    allyShort: ally.short,
    allyTrait: pick(rng, bank.allyTraits),
    adj: pick(rng, tone.adj),
    weather: pick(rng, tone.weather),
    time: pick(rng, TIMES),
  };

  const fill = (tpl: string, extra: Record<string, string> = {}): string => {
    // fresh flavour words on every paragraph so the prose doesn't echo itself
    const fresh: Record<string, string> = { time: pick(rng, TIMES), adj: pick(rng, tone.adj), weather: pick(rng, tone.weather), ...extra };
    let out = tpl;
    for (let i = 0; i < 3; i++) out = out.replace(/\{(\w+)\}/g, (m, k: string) => fresh[k] ?? vars[k] ?? m);
    return capitalizeSentences(out);
  };

  const take = <T>(arr: readonly T[], n: number): T[] => {
    const pool = [...arr];
    const out: T[] = [];
    while (out.length < n) {
      if (!pool.length) pool.push(...arr);
      const i = Math.floor(rng() * pool.length);
      out.push(pool.splice(i, 1)[0]);
    }
    return out;
  };

  const paragraphs: string[] = [];
  paragraphs.push(fill(pick(rng, bank.openings)));
  // after the introduction, refer to the hero by their short name
  const fullHero = vars.hero;
  const fullSetting = vars.setting;
  vars.hero = shortName(fullHero);
  vars.setting = fullSetting.split(',')[0];
  paragraphs.push(fill(pick(rng, bank.incidents)));
  paragraphs.push(fill(pick(rng, bank.decisions)));

  const journeys = take(bank.journeys, shape.journeys);
  const setbacks = take(bank.setbacks, shape.setbacks);
  const meetings = take(bank.meetings, Math.min(2, shape.allies));

  // interleave: journeys, then meeting, journeys, setback...
  const middle: string[] = [];
  let j = 0;
  const pushJourney = () => {
    if (j < journeys.length) middle.push(fill(journeys[j++], { adj: pick(rng, tone.adj), weather: pick(rng, tone.weather), time: pick(rng, TIMES) }));
  };
  pushJourney();
  if (meetings[0]) middle.push(fill(meetings[0]));
  pushJourney();
  pushJourney();
  if (setbacks[0]) middle.push(fill(setbacks[0]));
  pushJourney();
  if (meetings[1]) middle.push(fill(meetings[1], { ally: ally2.full, allyShort: ally2.short, allyTrait: pick(rng, bank.allyTraits) }));
  pushJourney();
  pushJourney();
  if (setbacks[1]) middle.push(fill(setbacks[1]));
  while (j < journeys.length) {
    pushJourney();
    pushJourney();
    if (setbacks[2] && j >= journeys.length - 1) {
      middle.push(fill(setbacks[2]));
      setbacks.length = 2;
    }
  }
  paragraphs.push(...middle);

  if (shape.twist) paragraphs.push(fill(pick(rng, bank.twists)));
  paragraphs.push(fill(pick(rng, bank.climaxes)));
  paragraphs.push(fill(pick(rng, bank.resolutions)));
  paragraphs.push(fill(pick(rng, tone.closings)));

  vars.hero = fullHero;
  vars.setting = fullSetting;
  const title = fill(pick(rng, bank.titles));
  const text = paragraphs.join('\n\n');
  return {
    title,
    text,
    genre,
    seed,
    paragraphs: paragraphs.length,
    words: text.split(/\s+/).filter(Boolean).length,
  };
}
