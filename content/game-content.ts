// ═════════════════════════════════════════════════════════════
//  NEXT STOP: TEL AVIV — the one content file.
//
//  Prompts, accepted answers, aliases, rarity, roadside facts,
//  finale factors, competencies, sources and team roles all live here.
//
//  Rarity is a designer-assigned game ranking: how obvious an answer
//  feels. It is NOT survey data and NOT based on what the room picks.
//
//  Editing tips
//   • Matching ignores case, accents, punctuation, "a/an/the/my",
//     and simple plurals — you don't need aliases for those.
//   • An alias must not appear under two answers in the same round
//     (`npm test` checks this for you).
//   • Every factual line keeps its source URL right beside it.
// ═════════════════════════════════════════════════════════════
import type { AnswerDef, Competency, Factor, RoundDef, Tier } from '../shared/types';

export const GAME = {
  title: 'Next Stop: Tel Aviv',
  tagline: 'The rarer your answer, the further you go.',
  destinationKm: 300,
  question: 'Why is the Israeli startup ecosystem so effective?',
};

export const RARITY: Record<Tier, { label: string; km: number; symbol: string; blurb: string }> = {
  common: { label: 'Common', km: 10, symbol: '●', blurb: 'Everybody packed this.' },
  uncommon: { label: 'Uncommon', km: 20, symbol: '◆', blurb: 'Solid detour.' },
  rare: { label: 'Rare', km: 35, symbol: '★', blurb: 'Off the beaten path.' },
  gem: { label: 'Hidden gem', km: 50, symbol: '✦', blurb: 'Nobody saw that exit coming.' },
};

// ─────────────────────────────────────────────────────────────
//  SIX ROUNDS
// ─────────────────────────────────────────────────────────────
const c = (label: string, ...aliases: string[]): AnswerDef => ({ label, tier: 'common', aliases });
const u = (label: string, ...aliases: string[]): AnswerDef => ({ label, tier: 'uncommon', aliases });
const r = (label: string, ...aliases: string[]): AnswerDef => ({ label, tier: 'rare', aliases });
const g = (label: string, ...aliases: string[]): AnswerDef => ({ label, tier: 'gem', aliases });

export const ROUNDS: RoundDef[] = [
  {
    id: 'beach',
    prompt: 'Name something you pack for a beach day.',
    factorId: 'global',
    competencyId: 'innovation',
    insight: {
      headline: 'Packing for scarce water',
      text: 'Netafim began in 1965 at Kibbutz Hatzerim in the Negev desert, turning Simcha Blass’s drip-irrigation idea into a product now used by farms worldwide.',
      sources: [
        { label: 'Negev Foundation — Simcha Blass & drip irrigation', url: 'https://www.negev.org/simcha-blass-drip-irrigation/' },
        { label: 'Times of Israel — What Israeli drips did for the world', url: 'https://www.timesofisrael.com/what-israeli-drips-did-for-the-world/' },
      ],
    },
    answers: [
      c('Towel', 'beach towel', 'towels', 'bath towel'),
      c('Sunscreen', 'sunblock', 'sun block', 'sun screen', 'suncream', 'sun cream', 'spf', 'sun lotion', 'suntan lotion', 'tanning lotion', 'sunscreen lotion'),
      c('Sunglasses', 'shades', 'sunnies', 'sun glasses'),
      c('Swimsuit', 'bathing suit', 'swimwear', 'bikini', 'trunks', 'swim trunks', 'swimming costume', 'board shorts', 'boardshorts', 'swimming suit', 'bathers', 'swim suit'),
      c('Water', 'water bottle', 'bottle of water', 'drinks', 'drink', 'bottle'),
      c('Snacks', 'snack', 'food', 'chips', 'sandwiches', 'sandwich', 'lunch', 'fruit', 'picnic'),
      c('Hat', 'sun hat', 'sunhat', 'cap', 'baseball cap', 'bucket hat', 'visor'),
      c('Flip-flops', 'flip flop', 'sandals', 'slippers', 'thongs', 'slides', 'water shoes', 'crocs'),
      u('Beach umbrella', 'umbrella', 'parasol', 'sun umbrella', 'beach tent', 'sun shade', 'canopy'),
      u('Beach chair', 'chair', 'folding chair', 'lawn chair', 'deck chair', 'beach chairs', 'camping chair'),
      u('Cooler', 'cooler bag', 'ice box', 'icebox', 'esky', 'cool box', 'ice', 'ice chest'),
      u('Speaker', 'bluetooth speaker', 'music speaker', 'portable speaker', 'music', 'radio', 'headphones', 'earbuds'),
      u('Book', 'novel', 'magazine', 'kindle', 'e reader', 'ereader', 'reading'),
      u('Beach bag', 'tote', 'tote bag', 'bag', 'backpack'),
      u('Phone', 'cellphone', 'cell phone', 'smartphone', 'mobile', 'iphone'),
      u('Beach ball', 'ball', 'inflatable ball'),
      u('Frisbee', 'flying disc', 'disc'),
      u('Change of clothes', 'spare clothes', 'dry clothes', 'extra clothes', 'cover up', 'coverup', 'sarong', 'clothes'),
      r('Snorkel', 'snorkel mask', 'snorkel set', 'snorkelling gear', 'snorkeling gear', 'dive mask', 'mask'),
      r('Bucket and spade', 'bucket', 'shovel', 'spade', 'sand toys', 'pail', 'bucket and shovel', 'pail and shovel', 'sandcastle kit'),
      r('Boogie board', 'bodyboard', 'body board', 'boogieboard'),
      r('Surfboard', 'surf board', 'surf', 'paddle board', 'paddleboard', 'sup'),
      r('Matkot paddles', 'matkot', 'matka', 'paddle ball', 'paddleball', 'beach paddles', 'beach tennis', 'paddles', 'racket', 'rackets', 'racquets'),
      r('Goggles', 'swim goggles', 'swimming goggles'),
      r('Aloe vera', 'aloe', 'after sun', 'aftersun', 'after sun lotion'),
      r('Beach blanket', 'blanket', 'picnic blanket', 'beach mat', 'mat', 'straw mat'),
      r('Wet wipes', 'baby wipes', 'wipes'),
      r('Kite'),
      r('Fins', 'flippers', 'swim fins'),
      r('Volleyball', 'beach volleyball', 'volley ball', 'net'),
      r('Inflatable', 'pool float', 'float', 'floatie', 'floaties', 'inner tube', 'tube', 'lilo', 'pool noodle', 'raft'),
      g('First-aid kit', 'first aid kit', 'first aid', 'band aids', 'bandaids', 'band aid', 'plasters', 'bandages', 'medkit', 'med kit'),
      g('Baby powder', 'talc', 'talcum powder', 'powder'),
      g('Dry bag', 'waterproof bag', 'ziplock bag', 'ziplock', 'zip lock', 'ziploc', 'plastic bag', 'zip bag'),
      g('Fitted sheet', 'sheet', 'bed sheet'),
      g('Power bank', 'portable charger', 'battery pack', 'charger', 'phone charger'),
      g('Hand fan', 'fan', 'handheld fan', 'misting fan', 'spray bottle', 'mister', 'water mister'),
      g('Lip balm', 'chapstick', 'chap stick', 'lip balm with spf', 'lip sunscreen'),
      g('Trash bag', 'garbage bag', 'rubbish bag', 'bin bag', 'bin liner'),
      g('Towel clips', 'clothespins', 'clothes pins', 'pegs', 'clothes pegs', 'clips'),
      g('Waterproof phone pouch', 'phone pouch', 'waterproof phone case', 'waterproof case', 'phone case'),
    ],
  },
  {
    id: 'phone',
    prompt: 'Name something your phone helps you do.',
    factorId: 'talent',
    competencyId: 'leadership',
    insight: {
      headline: 'A map drawn by its drivers',
      text: 'Waze, built in Israel, crowdsources live traffic from a community of drivers. When Google bought it in 2013, it said the product team would stay in Israel.',
      sources: [
        { label: 'Google — Google Maps and Waze, outsmarting traffic together (2013)', url: 'https://blog.google/products/maps/google-maps-and-waze-outsmarting/' },
      ],
    },
    answers: [
      c('Call people', 'call', 'calling', 'phone calls', 'make calls', 'phone call', 'make phone calls', 'talk'),
      c('Text', 'texting', 'message', 'messaging', 'send messages', 'sms', 'chat', 'whatsapp', 'imessage', 'send texts'),
      c('Take photos', 'photos', 'pictures', 'camera', 'take pictures', 'selfie', 'photography', 'take selfies'),
      c('Social media', 'instagram', 'tiktok', 'snapchat', 'facebook', 'scroll', 'scrolling', 'twitter', 'doomscroll', 'post'),
      c('Tell the time', 'time', 'clock', 'check the time', 'tell time'),
      c('Play games', 'games', 'gaming', 'game'),
      c('Listen to music', 'music', 'spotify', 'songs', 'listen to songs', 'apple music'),
      c('Navigate', 'maps', 'directions', 'gps', 'google maps', 'navigation', 'waze', 'get directions', 'find my way'),
      u('Email', 'emails', 'check email', 'mail', 'send emails', 'gmail'),
      u('Watch videos', 'videos', 'youtube', 'netflix', 'streaming', 'movies', 'shows', 'watch tv', 'tv', 'watch movies'),
      u('Set an alarm', 'alarm', 'wake up', 'alarm clock', 'timer', 'set a timer'),
      u('Search the web', 'google', 'browse', 'internet', 'search', 'look things up', 'research', 'browse the internet', 'web'),
      u('Pay for things', 'pay', 'payments', 'apple pay', 'google pay', 'mobile payment', 'venmo', 'payment', 'tap to pay', 'buy things'),
      u('Video call', 'facetime', 'zoom', 'video chat', 'video calls'),
      u('Calculate', 'calculator', 'math', 'maths', 'do math'),
      u('Check the weather', 'weather', 'forecast'),
      u('Shop online', 'shopping', 'online shopping', 'amazon', 'shop'),
      u('Banking', 'mobile banking', 'bank', 'check bank account', 'check my balance'),
      r('Translate', 'translation', 'google translate', 'translate languages', 'translator'),
      r('Track fitness', 'fitness', 'steps', 'count steps', 'step counter', 'workout tracking', 'health tracking', 'track steps', 'exercise', 'workouts', 'track workouts'),
      r('Scan QR codes', 'qr code', 'qr codes', 'scan qr', 'qr'),
      r('Flashlight', 'torch', 'light', 'flash light'),
      r('Order food', 'food delivery', 'doordash', 'uber eats', 'delivery', 'order takeout', 'takeout', 'wolt'),
      r('Get a ride', 'uber', 'lyft', 'ride share', 'rideshare', 'taxi', 'call a taxi', 'order a cab', 'hail a ride', 'gett'),
      r('Read the news', 'news', 'read news'),
      r('Take notes', 'notes', 'write notes', 'note taking', 'write', 'writing'),
      r('Keep a calendar', 'calendar', 'schedule', 'plan my day', 'appointments', 'reminders', 'reminder', 'organize', 'organise', 'to do list', 'todo list'),
      r('Learn a language', 'duolingo', 'language learning', 'learn languages', 'learn', 'study', 'studying', 'homework'),
      r('Record voice memos', 'voice memo', 'record audio', 'voice notes', 'record', 'voice recorder', 'record videos', 'film'),
      g('Find lost stuff', 'find my', 'find my phone', 'airtag', 'track items', 'find keys', 'find my keys', 'locate', 'find my friends', 'share location', 'location sharing'),
      g('Measure things', 'measure', 'ruler', 'measuring tape', 'level', 'spirit level', 'tape measure'),
      g('Identify plants', 'plant id', 'identify flowers', 'identify birds', 'plant identification', 'bird id', 'identify animals'),
      g('Meditate', 'meditation', 'breathing', 'mindfulness', 'calm', 'headspace', 'relax', 'sleep sounds'),
      g('Unlock doors', 'unlock car', 'smart lock', 'car key', 'digital key', 'open the door', 'unlock'),
      g('Control smart home', 'smart home', 'turn on lights', 'thermostat', 'control lights', 'home automation', 'remote control', 'tv remote'),
      g('Store tickets', 'tickets', 'digital tickets', 'boarding pass', 'concert tickets', 'wallet', 'digital wallet', 'id', 'digital id'),
      g('Identify songs', 'shazam', 'name that song', 'recognize music', 'recognise music', 'what song is this', 'song id'),
      g('Scan documents', 'scanner', 'scan', 'document scanner', 'scan receipts'),
      g('Magnify text', 'magnifier', 'magnify', 'magnifying glass', 'read small text', 'zoom in'),
    ],
  },
  {
    id: 'startup',
    prompt: 'Name something a new startup might need.',
    factorId: 'capital',
    competencyId: 'innovation',
    insight: {
      headline: 'Seeding the investors',
      text: 'Israel’s Yozma program (1993) used about $100M of public money to co-invest in ten new venture funds alongside private and foreign partners — most of whom later bought the government out.',
      sources: [
        { label: 'OECD — Benchmarking government support for venture capital: Israel', url: 'https://www.oecd.org/en/publications/benchmarking-government-support-for-venture-capital_82cd3fe1-en/israel_b5c8cc2e-en.html' },
        { label: 'Global Entrepreneurship Network — Yozma', url: 'https://www.genglobal.org/atlas/yozma' },
      ],
    },
    answers: [
      c('Money', 'funding', 'cash', 'capital', 'funds', 'investment', 'seed money', 'seed funding', 'budget'),
      c('An idea', 'idea', 'good idea', 'business idea', 'big idea', 'vision'),
      c('A team', 'team', 'employees', 'people', 'staff', 'workers', 'hires', 'talent', 'engineers', 'developers'),
      c('Customers', 'users', 'clients', 'buyers', 'customer'),
      c('Website', 'site', 'web site', 'landing page', 'app'),
      c('Office', 'office space', 'workspace', 'place to work', 'desk', 'garage', 'headquarters', 'hq'),
      c('Investors', 'investor', 'angel investor', 'angel', 'angels', 'vc', 'venture capital', 'vcs', 'venture capitalist'),
      c('Computers', 'computer', 'laptop', 'laptops'),
      u('Business plan', 'plan', 'strategy', 'roadmap', 'business model'),
      u('Logo', 'branding', 'brand', 'brand identity'),
      u('Marketing', 'ads', 'advertising', 'promotion', 'social media', 'social media marketing', 'advertisement'),
      u('Co-founder', 'cofounder', 'co founder', 'partner', 'business partner', 'founder'),
      u('Product', 'a product', 'service', 'something to sell'),
      u('Prototype', 'mvp', 'minimum viable product', 'demo', 'beta', 'first version'),
      u('Lawyer', 'legal advice', 'attorney', 'legal', 'incorporation', 'contracts', 'legal help', 'paperwork'),
      u('A name', 'name', 'company name', 'business name'),
      u('Wi-Fi', 'wifi', 'wi fi', 'internet', 'internet connection'),
      u('Coffee', 'caffeine', 'espresso', 'energy drinks', 'energy drink', 'snacks', 'pizza'),
      r('Mentor', 'mentors', 'adviser', 'advisor', 'advisors', 'advisers', 'guidance', 'coach', 'mentorship', 'advice'),
      r('Feedback', 'customer feedback', 'user feedback', 'reviews', 'user testing', 'testing'),
      r('Accountant', 'bookkeeper', 'accounting', 'bookkeeping', 'finance person', 'cfo'),
      r('Pitch deck', 'pitch', 'slides', 'deck', 'presentation', 'elevator pitch'),
      r('Patent', 'patents', 'intellectual property', 'ip', 'trademark'),
      r('Network', 'networking', 'connections', 'contacts'),
      r('Market research', 'research', 'survey', 'surveys', 'competitor research', 'competitive analysis', 'data'),
      r('Grant', 'grants', 'government grant', 'government funding', 'startup grant', 'government support'),
      r('Bank account', 'business bank account', 'bank'),
      r('Domain name', 'domain', 'url', 'web address'),
      r('Insurance', 'business insurance'),
      g('A real problem to solve', 'problem', 'a problem', 'problem to solve', 'pain point', 'real problem', 'a need', 'need', 'customer problem'),
      g('Patience', 'time', 'persistence', 'grit', 'perseverance', 'determination', 'resilience'),
      g('Luck', 'good luck', 'timing', 'good timing'),
      g('Sleep', 'rest', 'nap', 'naps', 'work life balance'),
      g('Whiteboard', 'white board', 'sticky notes', 'post its', 'post it notes', 'markers'),
      g('Incubator', 'accelerator', 'startup accelerator', 'startup incubator', 'y combinator', 'techstars'),
      g('Diverse perspectives', 'diversity', 'diverse team', 'different perspectives', 'fresh perspective'),
      g('Global market', 'international customers', 'export', 'exports', 'global expansion', 'go global', 'overseas customers', 'international market'),
      g('Culture', 'company culture', 'values', 'mission', 'team culture'),
      g('Support system', 'friends and family', 'family', 'friends', 'moral support', 'cheerleaders', 'community'),
    ],
  },
  {
    id: 'city',
    prompt: 'Name a way to get around a city.',
    factorId: 'research',
    competencyId: 'innovation',
    insight: {
      headline: 'From a university lab to the road',
      text: 'Mobileye grew from Prof. Amnon Shashua’s computer-vision research at the Hebrew University, licensed through its tech-transfer company Yissum (founded 1964). Intel acquired it in 2017.',
      sources: [
        { label: 'Mobileye — About & history', url: 'https://www.mobileye.com/about/' },
        { label: 'ISRAEL21c — 50 years of bringing ideas from lab to market (Yissum)', url: 'https://archive.israel21c.org/50-years-of-bringing-brilliant-ideas-from-lab-to-market/' },
      ],
    },
    answers: [
      c('Walk', 'walking', 'on foot', 'feet', 'by foot', 'stroll'),
      c('Car', 'drive', 'driving', 'by car', 'automobile', 'auto'),
      c('Bus', 'buses', 'public bus', 'city bus', 'coach'),
      c('Taxi', 'cab', 'taxi cab', 'uber', 'lyft', 'rideshare', 'ride share', 'gett'),
      c('Bike', 'bicycle', 'cycling', 'cycle', 'biking', 'bikes'),
      c('Subway', 'metro', 'underground', 'tube', 'subway train'),
      c('Train', 'trains', 'rail', 'commuter train', 'railway'),
      u('Scooter', 'e scooter', 'escooter', 'electric scooter', 'kick scooter', 'lime', 'bird'),
      u('Tram', 'streetcar', 'trolley', 'light rail', 'lightrail', 'red line'),
      u('Motorcycle', 'motorbike', 'moped', 'vespa', 'motor scooter', 'dirt bike'),
      u('Skateboard', 'skating', 'skate', 'longboard'),
      u('Rollerblades', 'inline skates', 'roller skates', 'rollerskates', 'roller skating', 'rollerblading'),
      u('Ferry', 'boat', 'water taxi', 'water bus'),
      u('Carpool', 'car pool', 'ride with friends', 'carpooling', 'get a lift', 'lift'),
      u('E-bike', 'ebike', 'e bike', 'electric bike', 'electric bicycle'),
      u('Bike share', 'shared bike', 'citibike', 'citi bike', 'city bike', 'bike rental', 'tel o fun', 'telofun', 'rent a bike'),
      u('Wheelchair', 'power chair', 'mobility scooter'),
      r('Shuttle', 'shuttle bus', 'minibus'),
      r('Sherut', 'shared taxi', 'share taxi', 'service taxi', 'sherut taxi'),
      r('Cable car', 'gondola', 'aerial tram', 'funicular', 'cable railway'),
      r('Rickshaw', 'tuk tuk', 'tuktuk', 'auto rickshaw', 'pedicab', 'cycle rickshaw'),
      r('Segway'),
      r('Run', 'running', 'jog', 'jogging', 'sprint'),
      r('Horse', 'horseback', 'horse and carriage', 'carriage', 'horse riding', 'ride a horse'),
      r('Hoverboard', 'onewheel', 'one wheel', 'electric skateboard', 'unicycle', 'electric unicycle'),
      r('Helicopter', 'chopper'),
      r('Monorail'),
      r('Hitchhike', 'hitchhiking', 'hitch a ride', 'thumb a ride'),
      g('Zipline', 'zip line', 'zip wire', 'zipwire'),
      g('Kayak', 'canoe', 'paddleboard', 'paddle board', 'sup', 'rowing', 'row boat', 'rowboat'),
      g('Hot air balloon', 'balloon', 'air balloon'),
      g('Parkour', 'free running', 'freerunning'),
      g('Pogo stick', 'pogo'),
      g('Piggyback ride', 'piggyback', 'piggy back', 'piggy back ride'),
      g('Swim', 'swimming'),
      g('Stilts'),
      g('Golf cart', 'golf buggy'),
      g('Seaplane', 'sea plane', 'float plane', 'floatplane'),
      g('Jetpack', 'jet pack'),
    ],
  },
  {
    id: 'flop',
    prompt: 'Your first attempt flopped. Name a useful next move.',
    factorId: 'learning',
    competencyId: 'resilience',
    insight: {
      headline: 'Love the problem, not your first fix',
      text: 'Waze co-founder Uri Levine openly counts failed ventures among his lessons, and advises founders to fall in love with the problem — not the first solution.',
      sources: [
        { label: 'Tel Aviv University — The Waze Forward', url: 'https://english.tau.ac.il/node/2156' },
        { label: 'VC Cafe — Uri Levine’s book: put the problem first', url: 'https://www.vccafe.com/uri-levines-new-book-is-a-reminder-for-founders-to-put-the-problem-first/' },
      ],
    },
    answers: [
      c('Try again', 'retry', 'again', 'keep trying', 'try harder', 'do it again', 'give it another go', 'another try', 'one more time', 'try try again', 'second attempt', 'redo', 'start over', 'restart'),
      c('Ask for help', 'get help', 'help', 'ask someone', 'ask a friend', 'ask friends', 'ask for advice'),
      c('Take a break', 'break', 'rest', 'step back', 'pause', 'breathe', 'chill', 'take a breath', 'step away'),
      c('Learn from mistakes', 'learn', 'learn from it', 'learn from failure', 'lessons learned', 'learn from your mistakes', 'learn from mistake', 'learn the lesson'),
      c('Practice', 'practise', 'practice more', 'train', 'training'),
      c('Change the plan', 'new plan', 'adjust', 'adapt', 'change strategy', 'make a new plan', 'tweak', 'rethink', 'change approach', 'new approach', 'try something different', 'try a different way', 'different approach', 'plan b'),
      c('Don’t give up', 'dont give up', 'do not give up', 'never give up', 'keep going', 'persist', 'persevere', 'push through', 'stay positive', 'keep at it'),
      u('Ask for feedback', 'feedback', 'get feedback', 'criticism', 'ask for criticism', 'constructive criticism'),
      u('Research', 'do research', 'study', 'look it up', 'read up', 'google it', 'investigate'),
      u('Pivot', 'pivoting', 'change direction'),
      u('Reflect', 'think', 'think about it', 'reflection', 'journal', 'review', 'self reflect', 'reflect on it'),
      u('Start small', 'smaller steps', 'small steps', 'break it down', 'simplify', 'baby steps', 'smaller goal'),
      u('Talk to customers', 'talk to users', 'interview users', 'ask customers', 'ask users', 'listen to customers'),
      u('Find a mentor', 'mentor', 'coach', 'ask a mentor', 'ask an expert', 'ask a teacher', 'expert', 'get a coach'),
      u('Brainstorm', 'brainstorming', 'new ideas', 'ideate', 'new idea', 'come up with ideas'),
      u('Sleep on it', 'sleep', 'get some sleep', 'nap'),
      u('Watch a tutorial', 'tutorial', 'youtube tutorial', 'watch videos', 'take a class', 'take a course', 'course'),
      r('Post-mortem', 'postmortem', 'post mortem', 'debrief', 'retro', 'retrospective', 'after action review', 'review what went wrong', 'analyze what went wrong', 'analyse what went wrong', 'figure out what went wrong', 'analyze', 'analyse'),
      r('Run an experiment', 'experiment', 'test', 'ab test', 'a b test', 'test again', 'testing', 'test it', 'run a test'),
      r('Build a prototype', 'prototype', 'mvp', 'mock up', 'mockup'),
      r('Team up', 'find a partner', 'collaborate', 'teamwork', 'partner up', 'get a team', 'team', 'collaboration', 'work together'),
      r('Find the root cause', 'ask why', '5 whys', 'five whys', 'root cause', 'figure out why', 'root cause analysis', 'diagnose'),
      r('Iterate', 'iteration', 'change one thing', 'small tweak', 'improve', 'refine', 'fix it', 'fix the problem', 'debug'),
      r('Laugh it off', 'laugh', 'humor', 'humour', 'smile', 'shake it off'),
      r('Write it down', 'make notes', 'notes', 'write a list', 'make a list', 'list', 'take notes'),
      r('Set a deadline', 'deadline', 'timeline', 'schedule', 'set a goal', 'new goal', 'set goals', 'goal'),
      r('Go for a walk', 'walk', 'exercise', 'workout', 'run', 'go for a run'),
      r('Look at competitors', 'study competitors', 'copy what works', 'see what others did', 'look at others', 'benchmark'),
      g('Share what you learned', 'teach others', 'share lessons', 'share the lesson', 'tell others', 'write about it', 'help others avoid it', 'share it', 'share your story', 'teach someone', 'share knowledge'),
      g('Fall in love with the problem', 'focus on the problem', 'revisit the problem', 'understand the problem', 'problem first', 'love the problem', 'redefine the problem', 'reframe the problem', 'reframe'),
      g('Celebrate the attempt', 'celebrate', 'celebrate effort', 'reward yourself', 'pat on the back', 'be proud', 'celebrate the failure'),
      g('Get fresh eyes', 'fresh eyes', 'outside perspective', 'new perspective', 'ask someone new', 'ask an outsider', 'ask a beginner', 'different perspective', 'ask a stranger'),
      g('Keep what worked', 'find what worked', 'what went right', 'focus on strengths', 'look at what worked', 'build on what worked'),
      g('Thank your team', 'thank people', 'gratitude', 'thank you', 'say thanks', 'thank everyone'),
      g('Sketch it out', 'draw it', 'map it out', 'diagram', 'whiteboard it', 'sketch', 'draw', 'mind map'),
      g('Rubber duck it', 'rubber duck', 'rubber ducking', 'explain it out loud', 'talk it through', 'talk it out'),
      g('Be kind to yourself', 'self compassion', 'forgive yourself', 'go easy on yourself', 'self care', 'selfcare', 'dont beat yourself up'),
    ],
  },
  {
    id: 'ideas',
    prompt: 'Name somewhere people find new ideas.',
    factorId: 'talent',
    competencyId: 'leadership',
    insight: {
      headline: 'Founders helping founders',
      text: 'Wix co-founder Avishai Abrahami wrote (2013) that Israeli founders who had been helped early often “pay it forward” with intros and advice. One founder’s view — but a common theme.',
      sources: [
        { label: 'Entrepreneur — Avishai Abrahami, The secret to Israel’s startup success (2013)', url: 'https://www.entrepreneur.com/article/228159' },
      ],
    },
    answers: [
      c('In the shower', 'shower', 'bath', 'bathtub', 'showers'),
      c('Books', 'book', 'reading', 'novels'),
      c('The internet', 'internet', 'online', 'google', 'web', 'websites', 'the web', 'chatgpt', 'ai'),
      c('Social media', 'instagram', 'tiktok', 'twitter', 'reddit', 'pinterest', 'linkedin'),
      c('School', 'class', 'classes', 'classroom', 'university', 'college', 'campus', 'lectures', 'lecture'),
      c('Conversations', 'talking', 'talking to friends', 'friends', 'conversation', 'chatting', 'talking to people', 'other people', 'people'),
      c('Dreams', 'dream', 'sleeping', 'in bed', 'bed'),
      c('Nature', 'outside', 'outdoors', 'the outdoors', 'hike', 'hiking', 'park', 'forest', 'woods', 'mountains', 'garden'),
      u('Library', 'libraries'),
      u('Museum', 'museums', 'art gallery', 'gallery', 'exhibition', 'art', 'art museum'),
      u('Travel', 'traveling', 'travelling', 'abroad', 'trips', 'trip', 'vacation', 'holiday', 'new places', 'road trip'),
      u('Coffee shop', 'cafe', 'coffee house', 'starbucks', 'coffee'),
      u('On a walk', 'walk', 'walking', 'going for a walk', 'walks'),
      u('Podcasts', 'podcast'),
      u('YouTube', 'videos', 'youtube videos', 'tv', 'movies', 'films'),
      u('At work', 'work', 'office', 'job', 'workplace'),
      u('Meetings', 'team meetings', 'meeting'),
      u('Brainstorming session', 'brainstorming', 'brainstorm', 'workshop', 'workshops', 'design sprint'),
      r('Hackathon', 'hackathons', 'coding competition', 'game jam'),
      r('Conferences', 'conference', 'events', 'summit', 'ted talks', 'ted talk', 'talks', 'meetups', 'meetup', 'networking events'),
      r('Incubator', 'accelerator', 'startup incubator', 'startup accelerator'),
      r('Coworking space', 'co working space', 'coworking', 'co working', 'shared office', 'wework'),
      r('The beach', 'beach', 'seaside', 'ocean', 'sea', 'by the sea'),
      r('The gym', 'gym', 'working out', 'exercise', 'workout', 'sports'),
      r('Mentors', 'mentor', 'mentorship', 'advisor', 'advisors', 'teachers', 'teacher', 'coach'),
      r('Customer feedback', 'customers', 'customer complaints', 'users', 'user feedback', 'feedback', 'reviews'),
      r('The kitchen', 'kitchen', 'cooking', 'while cooking', 'baking'),
      r('On the commute', 'commute', 'commuting', 'on the bus', 'on the train', 'in the car', 'driving', 'road trip car'),
      r('Music', 'concerts', 'concert', 'listening to music', 'playing music'),
      r('A lab', 'lab', 'laboratory', 'research lab', 'research', 'science lab', 'experiments'),
      g('Mistakes', 'failures', 'failure', 'failed projects', 'mistake', 'accidents', 'happy accidents'),
      g('Everyday problems', 'problems', 'frustrations', 'annoyances', 'pain points', 'complaints', 'things that annoy you'),
      g('Kids', 'children', 'little kids', 'talking to kids', 'playing with kids'),
      g('Other industries', 'different fields', 'other fields', 'cross industry', 'other countries', 'other cultures'),
      g('Boredom', 'being bored', 'doing nothing', 'daydreaming', 'daydream', 'idle time'),
      g('Grandparents', 'older people', 'elders', 'grandma', 'grandpa', 'grandparent', 'family stories'),
      g('A market', 'market', 'shuk', 'souk', 'bazaar', 'farmers market', 'carmel market', 'street market'),
      g('Thrift store', 'flea market', 'thrift shop', 'secondhand store', 'second hand store', 'antique shop', 'garage sale', 'yard sale'),
      g('Late at night', 'night', 'middle of the night', '3am', 'insomnia', 'midnight'),
      g('Old patents', 'patents', 'patent archives', 'history', 'history books', 'old ideas'),
    ],
  },
];

// ─────────────────────────────────────────────────────────────
//  FINALE — five factors (the answer to the TAMID question)
//  Keep `short` brief: it sits on a road sign on the finale screen.
// ─────────────────────────────────────────────────────────────
export const FACTORS: Factor[] = [
  {
    id: 'talent',
    title: 'Connected talent & networks',
    short: 'Dense networks where founders help founders.',
    detail:
      'In a small country, founders, engineers, investors and researchers often already know each other. Some founders describe a “pay it forward” habit of sharing intros and advice. This is one founder’s account and a common theme, not a rule for everyone.',
    sources: [
      { label: 'Entrepreneur — Avishai Abrahami (Wix), 2013', url: 'https://www.entrepreneur.com/article/228159' },
      { label: 'Google — Waze acquisition post, 2013', url: 'https://blog.google/products/maps/google-maps-and-waze-outsmarting/' },
    ],
  },
  {
    id: 'learning',
    title: 'Learning & adaptation',
    short: 'A failed first try is treated as data, not the end.',
    detail:
      'Well-known founders such as Waze’s Uri Levine talk openly about failed ventures and about staying anchored to a real problem while changing the solution. That attitude varies from founder to founder; it is not universal.',
    sources: [
      { label: 'Tel Aviv University — The Waze Forward', url: 'https://english.tau.ac.il/node/2156' },
      { label: 'VC Cafe — Fall in love with the problem', url: 'https://www.vccafe.com/uri-levines-new-book-is-a-reminder-for-founders-to-put-the-problem-first/' },
    ],
  },
  {
    id: 'capital',
    title: 'Public support + private investment',
    short: 'Government money that pulled private money in.',
    detail:
      'Yozma (1993) put about $100M of public money into ten new venture funds alongside private and foreign partners, who could later buy the state out. A technological incubator program began in 1991 during a wave of immigration. Today Israel spends about 6.3% of GDP on R&D — the highest in the OECD in 2023 — and most of it is business-funded. Researchers see Yozma as one catalyst among several.',
    sources: [
      { label: 'OECD — Government support for venture capital: Israel', url: 'https://www.oecd.org/en/publications/benchmarking-government-support-for-venture-capital_82cd3fe1-en/israel_b5c8cc2e-en.html' },
      { label: 'Jewish Virtual Library — Technological incubators in Israel', url: 'https://www.jewishvirtuallibrary.org/technological-incubators-in-israel' },
      { label: 'SSTI — OECD R&D intensity data, 2023', url: 'https://ssti.org/index%2ephp/node/86669' },
    ],
  },
  {
    id: 'research',
    title: 'Research that becomes products',
    short: 'University labs with a path to market.',
    detail:
      'Universities run technology-transfer companies such as the Hebrew University’s Yissum (1964), which licensed research that led to Mobileye. Netafim turned a drip-irrigation invention into a global company from a Negev kibbutz.',
    sources: [
      { label: 'ISRAEL21c — Yissum at 50', url: 'https://archive.israel21c.org/50-years-of-bringing-brilliant-ideas-from-lab-to-market/' },
      { label: 'Mobileye — About', url: 'https://www.mobileye.com/about/' },
      { label: 'Negev Foundation — Simcha Blass', url: 'https://www.negev.org/simcha-blass-drip-irrigation/' },
    ],
  },
  {
    id: 'global',
    title: 'Thinking globally from day one',
    short: 'A small home market pushes startups to sell worldwide.',
    detail:
      'With roughly 10.2 million residents (end of 2025), Israel’s home market is small, so many startups design for global customers early. High-tech made up about 56% of Israel’s exports in 2024, according to the Israel Innovation Authority.',
    sources: [
      { label: 'JNS — CBS population estimate, end of 2025', url: 'https://www.jns.org/israels-population-hits-10178000/' },
      { label: 'Israel Innovation Authority — The Israeli high-tech sector (2025 report)', url: 'https://innovationisrael.org.il/en/report/the-israeli-high-tech-sector/' },
    ],
  },
];

export const ECOSYSTEM_CAVEAT =
  'No single factor explains the ecosystem, and Israeli founders come from many different backgrounds. These are five forces that reinforce each other.';

// ─────────────────────────────────────────────────────────────
//  TAMID competencies shown in the game (3 of the 5 required)
// ─────────────────────────────────────────────────────────────
export const COMPETENCIES: Competency[] = [
  {
    id: 'innovation',
    title: 'Pursuing Innovation',
    definition: 'Finding fresh approaches and turning needs into useful ideas.',
    whereInGame: 'Every round rewards the less obvious answer — and Round 3 asks what a startup really needs.',
  },
  {
    id: 'resilience',
    title: 'Cultivating Resilience',
    definition: 'Responding constructively when an attempt fails.',
    whereInGame: 'Unrecognised answers can be retried before time runs out, and Round 5 is all about the next move after a flop.',
  },
  {
    id: 'leadership',
    title: 'Empowering Leadership',
    definition: 'Supporting others and sharing skills or knowledge.',
    whereInGame: 'Every reveal shares the whole class’s answers, and Round 6 ends on founders helping founders.',
  },
];

// ─────────────────────────────────────────────────────────────
//  TEAM — Group 3. Assign each name to the role they own.
// ─────────────────────────────────────────────────────────────
export const TEAM_ROLES = [
  { role: 'Research & content', name: 'Charlie', owns: 'Fact-checking, sources, answer bank' },
  { role: 'Game logic', name: 'Hudson', owns: 'Rules, scoring, multiplayer' },
  { role: 'Visual design', name: 'Carter', owns: 'Journey scene, branding' },
  { role: 'Narration & presentation', name: 'Sienna', owns: 'Host script, live hosting' },
];

// ─────────────────────────────────────────────────────────────
//  Flavour: roadside markers (pure fiction, no factual claims)
// ─────────────────────────────────────────────────────────────
export const ROAD_MARKERS: { km: number; text: string }[] = [
  { km: 0, text: 'Engine on. Snacks secured.' },
  { km: 40, text: 'First glimpse of the sea' },
  { km: 90, text: 'Beach paddles heard in the distance' },
  { km: 140, text: 'Halfway. Somebody needs a bathroom.' },
  { km: 190, text: 'Towers on the horizon' },
  { km: 240, text: 'Traffic. Of course there’s traffic.' },
  { km: 290, text: 'You can smell the shakshuka' },
  { km: 300, text: 'Welcome to Tel Aviv' },
];

export const ROOM_NAME_PARTS = {
  adjectives: ['Breezy', 'Salty', 'Sunny', 'Turbo', 'Golden', 'Lucky', 'Wandering', 'Sandy', 'Speedy', 'Cosmic', 'Rolling', 'Jolly'],
  nouns: ['Hoopoes', 'Pelicans', 'Flip-Flops', 'Navigators', 'Sea Turtles', 'Road Gulls', 'Pita Pilots', 'Beach Paddles', 'Tumbleweeds', 'Sunseekers', 'Dolphins', 'Hitchhikers'],
};

/** Fictional names for Demo Mode passengers. */
export const BOT_NAMES = [
  'Dune Buggy', 'Captain Sunscreen', 'Pita Pilot', 'Sandy Toes', 'Turbo Hoopoe', 'Flip-Flop Phil',
  'Roadtrip Rina', 'Matkot Max', 'Seaside Sam', 'Mapless Maya', 'Cruise Control', 'Lost Luggage',
  'Shakshuka Sid', 'GPS Gabi', 'Sunset Sasha', 'Wave Rider', 'Detour Dana', 'Tailwind Tal',
  'Backseat Ben', 'Snack Captain', 'Ziva Zoom', 'Pothole Pete', 'Noa Nomad', 'Highway Hila', 'Tidepool Tom',
];
