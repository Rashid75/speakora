import type { Topic } from '@/types';

const base = {
  categoryId: 'daily_conversation',
  source: 'builtin',
} as const;

export const DAILY_CONVERSATION_TOPICS: readonly Topic[] = [
  {
    ...base,
    id: 'daily_introducing_yourself',
    title: 'Introducing Yourself',
    summary: 'Meet someone new and get past the first two minutes.',
    emoji: '👋',
    suggestedDifficulty: 'beginner',
    estimatedMinutes: 10,
    scenario:
      'You have just been introduced to each other at a language exchange meetup in a cafe. Neither of you knows anything about the other. You are genuinely curious about who this person is, where they are from and what they do, and you are happy to talk about yourself too.',
    talkingPoints: [
      'Where you each grew up and how that shaped you',
      'What you do for work or study, and whether you enjoy it',
      'How you ended up learning English / at this meetup',
      'Something surprising about yourself',
    ],
    usefulPhrases: [
      'Nice to meet you - how did you hear about this?',
      'Whereabouts are you from originally?',
      'What do you do, if you do not mind me asking?',
      'Oh really? How did you get into that?',
    ],
    openingLine:
      'Hey! I do not think we have met - I am grabbing a seat before this place fills up. I am Maya. Is this your first time at one of these?',
  },
  {
    ...base,
    id: 'daily_weekend_plans',
    title: 'Weekend Plans',
    summary: 'Compare weekends, make plans, and argue about how to spend a Saturday.',
    emoji: '🗓️',
    suggestedDifficulty: 'elementary',
    estimatedMinutes: 12,
    scenario:
      'It is Thursday evening and you are chatting with a friend about the weekend. You have your own half-formed plans that you are slightly unsure about, and you are fishing for a better idea.',
    talkingPoints: [
      'What each of you has planned, and what you would rather be doing',
      'A weekend that went badly wrong',
      'Whether weekends should be for rest or for doing things',
      'Making an actual plan together',
    ],
    usefulPhrases: [
      'I was thinking of ... but I am not sure yet.',
      'Do you fancy joining?',
      'I might just take it easy, honestly.',
      'That sounds way better than what I had planned.',
    ],
    openingLine:
      'Right, so I have zero plans this weekend and I am weirdly stressed about it. What are you up to? Tell me you have something good so I can steal the idea.',
  },
  {
    ...base,
    id: 'daily_hobbies',
    title: 'Hobbies',
    summary: 'Talk about what you do for fun - and defend why it is worth the time.',
    emoji: '🎨',
    suggestedDifficulty: 'elementary',
    estimatedMinutes: 12,
    scenario:
      'You are talking about how you each spend your free time. You have a hobby you are slightly obsessive about and you are a little defensive about how much time it takes.',
    talkingPoints: [
      'How you got started and why you stuck with it',
      'How much time it realistically takes',
      'A hobby you gave up on, and why',
      'Whether hobbies need to be productive',
    ],
    usefulPhrases: [
      'I have been into it for about three years now.',
      'It started as a way to switch off after work.',
      'I gave it up because I could never find the time.',
      'Does it not get repetitive after a while?',
    ],
    openingLine:
      'So I finally admitted to myself that I have spent more hours on my hobby this month than on sleep. Please tell me you have something equally unreasonable that you are into.',
  },
  {
    ...base,
    id: 'daily_travel',
    title: 'Travel',
    summary: 'Swap travel stories - the great trips and the disasters.',
    emoji: '✈️',
    suggestedDifficulty: 'intermediate',
    estimatedMinutes: 15,
    scenario:
      'You are both people who travel when you can. You have strong opinions about how to travel - you think most people over-plan and miss the point - and you enjoy a good travel-disaster story.',
    talkingPoints: [
      'The best trip either of you has taken, and why',
      'Something that went badly wrong while travelling',
      'Planning everything versus improvising',
      'A place you would never go back to',
    ],
    usefulPhrases: [
      'We ended up missing the connection entirely.',
      'It was completely off the beaten track.',
      'I am more of a "book nothing and figure it out" person.',
      'That sounds like a nightmare - what did you do?',
    ],
    openingLine:
      'I saw a photo from a trip I took four years ago this morning and now I cannot concentrate on anything. Where is the last place you went that actually stuck with you?',
  },
  {
    ...base,
    id: 'daily_food',
    title: 'Food',
    summary: 'Cooking, eating out, and the food opinions people get irrationally heated about.',
    emoji: '🍜',
    suggestedDifficulty: 'elementary',
    estimatedMinutes: 12,
    scenario:
      'A relaxed conversation about food. You love cooking but you are honest that you do it badly about half the time. You have at least one food opinion you will defend enthusiastically.',
    talkingPoints: [
      'What you actually cook on a normal weeknight',
      'A dish from your country that foreigners get wrong',
      'Eating out versus cooking at home',
      'Something you refuse to eat',
    ],
    usefulPhrases: [
      'I throw it together in about ten minutes.',
      'It is an acquired taste, to be fair.',
      'That is not how you are supposed to make it!',
      'I could eat that every single day.',
    ],
    openingLine:
      'I have just eaten the same pasta for the fourth night running and I have hit a wall. What do you actually cook when you cannot be bothered?',
  },
  {
    ...base,
    id: 'daily_movies_tv',
    title: 'Movies and TV',
    summary: 'Recommend, disagree, and argue about an ending.',
    emoji: '🎬',
    suggestedDifficulty: 'intermediate',
    estimatedMinutes: 12,
    scenario:
      'You are talking about what you have been watching. You have specific taste and you are not shy about saying a popular show is overrated. You genuinely want a recommendation.',
    talkingPoints: [
      'What you are watching right now',
      'A film everyone loves that you did not',
      'Whether an ending ruined a whole series',
      'Subtitles versus dubbing',
    ],
    usefulPhrases: [
      'It completely fell apart in the last season.',
      'It is a bit of a slow burn, but stick with it.',
      'I know everyone loves it, but I just did not get it.',
      'No spoilers - I am only three episodes in!',
    ],
    openingLine:
      'Okay, controversial opinion to start: I think the show everyone is obsessed with right now is genuinely not that good. Go on, defend it - or tell me what I should be watching instead.',
  },
  {
    ...base,
    id: 'daily_shopping',
    title: 'Shopping',
    summary: 'Buying things, returning things, and talking to shop staff.',
    emoji: '🛍️',
    suggestedDifficulty: 'elementary',
    estimatedMinutes: 10,
    scenario:
      'A conversation about shopping habits that drifts into a story about something you bought and regretted. You are the type who researches everything for weeks and still buys the wrong thing.',
    talkingPoints: [
      'Online versus in a shop',
      'Something you bought and immediately regretted',
      'Haggling and getting a good deal',
      'Returning something difficult',
    ],
    usefulPhrases: [
      'It was a complete waste of money.',
      'I had my eye on it for months.',
      'Do you have this in a larger size?',
      'I would like to return this, I still have the receipt.',
    ],
    openingLine:
      'I just spent forty minutes reading reviews for a nine-pound phone charger. Forty minutes. Are you a researcher or do you just grab the first thing you see?',
  },
  {
    ...base,
    id: 'daily_work_career',
    title: 'Work and Career',
    summary: 'What you do, whether you like it, and where it is all going.',
    emoji: '🧑‍💼',
    suggestedDifficulty: 'intermediate',
    estimatedMinutes: 15,
    scenario:
      'A casual but fairly honest conversation about work. You changed career once and it was messy, so you have real opinions about whether people should follow their passion or be practical.',
    talkingPoints: [
      'What your day actually looks like',
      'The best and worst parts of the job',
      'Whether you would change career',
      'Work-life balance, honestly assessed',
    ],
    usefulPhrases: [
      'It is not what I imagined when I started.',
      'I am at a bit of a crossroads, to be honest.',
      'The money is fine, but the hours are brutal.',
      'Do you see yourself doing this in five years?',
    ],
    openingLine:
      'Someone asked me today whether I actually like my job and I gave this long waffly non-answer. Which probably means no? What about you - do you like what you do, honestly?',
  },
  {
    ...base,
    id: 'daily_friends_family',
    title: 'Friends and Family',
    summary: 'The people in your life, and how those relationships change.',
    emoji: '🏡',
    suggestedDifficulty: 'intermediate',
    estimatedMinutes: 12,
    scenario:
      'A warm, slightly personal conversation. You live far from your family and you have complicated feelings about it. You are close to a small number of friends rather than having a big circle.',
    talkingPoints: [
      'Who you are closest to and why',
      'Staying in touch across distance',
      'How friendships change in your thirties',
      'Family traditions you kept or dropped',
    ],
    usefulPhrases: [
      'We have drifted apart a bit, to be honest.',
      'She is the one I call when something goes wrong.',
      'We only see each other once a year, but it does not matter.',
      'I miss them more than I expected to.',
    ],
    openingLine:
      'I had a two-hour call with my sister last night and I realised we had not properly spoken in about four months. Are you good at keeping in touch with people, or are you like me?',
  },
  {
    ...base,
    id: 'daily_routine',
    title: 'Daily Routine',
    summary: 'Mornings, habits, and whether any routine survives contact with real life.',
    emoji: '⏰',
    suggestedDifficulty: 'beginner',
    estimatedMinutes: 10,
    scenario:
      'A simple, friendly conversation about how you each structure your day. You have tried and abandoned about six different morning routines and you find the whole optimisation culture a bit silly.',
    talkingPoints: [
      'What your morning actually looks like',
      'A habit you tried to build and failed at',
      'Morning person versus night owl',
      'How your routine changes at the weekend',
    ],
    usefulPhrases: [
      'I hit snooze about four times.',
      'I am useless before my first coffee.',
      'I keep meaning to start, but I never do.',
      'It completely falls apart by Wednesday.',
    ],
    openingLine:
      'I set my alarm for six this morning with big plans. I got up at half past eight. So - are you one of those people who actually has a routine, or shall we suffer together?',
  },
];
