import type { Topic } from '@/types';

const base = {
  categoryId: 'travel_and_life',
  source: 'builtin',
} as const;

export const TRAVEL_AND_LIFE_TOPICS: readonly Topic[] = [
  {
    ...base,
    id: 'life_airport_checkin',
    title: 'At the Airport',
    summary: 'Check-in, security and a flight that is no longer going to plan.',
    emoji: '🛫',
    suggestedDifficulty: 'elementary',
    estimatedMinutes: 12,
    scenario:
      'You are an airline agent at the desk. You are efficient and polite but you have a queue behind you. Partway through, you have to tell them their connection is now too tight and offer alternatives.',
    talkingPoints: [
      'Checking in and asking about baggage',
      'Asking about a seat change',
      'Reacting to a delay',
      'Sorting out a missed connection',
    ],
    usefulPhrases: [
      'Is there any chance of an aisle seat?',
      'Will my bag go straight through?',
      'What are my options if I miss the connection?',
      'How long is the delay likely to be?',
    ],
    openingLines: [
      'Good morning, travelling to Lisbon today? Can I take your passport - and are you checking anything into the hold, or is that all hand luggage?',
      'Hello there. Just the one bag? Pop it on the belt for me. And can I see your passport and booking reference, please.',
      'Morning. Where are you flying to today? Lovely. I will need your passport, and I should warn you the flight is showing a short delay at the moment.',
    ],
  },
  {
    ...base,
    id: 'life_doctor_visit',
    title: 'At the Doctor',
    summary: 'Describe a symptom clearly when you do not know the word for it.',
    emoji: '🩺',
    suggestedDifficulty: 'intermediate',
    estimatedMinutes: 12,
    scenario:
      'You are a GP. You are calm and unhurried. You ask open questions first, then narrow down. You never use a technical term without explaining it, and you check understanding before ending.',
    talkingPoints: [
      'Describing a symptom without the exact word',
      'Answering questions about history',
      'Asking what a treatment involves',
      'Checking you understood the instructions',
    ],
    usefulPhrases: [
      'It is a sort of dull ache, here.',
      'It has been going on for about a week.',
      'Sorry, what does that mean exactly?',
      'So I should take it twice a day, with food?',
    ],
    openingLines: [
      'Come in, have a seat. So, what brings you in today? Take your time - just tell me in your own words what has been going on.',
      'Hello, come and sit down. I can see it has been a little while since we last saw you. What has been the trouble?',
      'Right, take a seat. The notes say you rang on Monday about something that has been going on for a couple of weeks. Start from the beginning for me - when did you first notice it?',
    ],
  },
  {
    ...base,
    id: 'life_renting_flat',
    title: 'Renting a Flat',
    summary: 'View a place, ask the awkward questions, and negotiate.',
    emoji: '🔑',
    suggestedDifficulty: 'upper_intermediate',
    estimatedMinutes: 15,
    scenario:
      'You are a letting agent showing a flat. You are enthusiastic and you gloss over the downsides - the damp patch, the noisy road, the deposit terms - unless they ask directly. You will negotiate a little if pushed confidently.',
    talkingPoints: [
      'Asking what is included in the rent',
      'Raising a problem you noticed',
      'Asking about the contract and deposit',
      'Negotiating the price or the terms',
    ],
    usefulPhrases: [
      'Are bills included, or is that on top?',
      'I noticed some damp in the corner there.',
      'Would the landlord consider ...?',
      'How long is the minimum term?',
    ],
    openingLines: [
      'Here we are - and honestly, this one will not be on the market long. Lovely light in the mornings, brand new kitchen. Have a look around, and shout if anything comes to mind.',
      'Come in, come in. Mind the step. So this is the living room, obviously, and the bedroom is through there. What is it you are looking for, roughly - is it just you?',
      'Thanks for coming out. I will be straight with you, I have got two other viewings on this today. Have a wander and tell me what you think.',
    ],
  },
  {
    ...base,
    id: 'life_making_complaint',
    title: 'Making a Complaint',
    summary: 'Be firm, stay polite, and actually get it resolved.',
    emoji: '📣',
    suggestedDifficulty: 'upper_intermediate',
    estimatedMinutes: 15,
    scenario:
      'You work in customer service. You start out defensive and slightly scripted, offering the minimum. If they stay calm, specific and firm, you escalate and find a genuine solution. If they become vague or apologetic, you offer less.',
    talkingPoints: [
      'Stating the problem factually',
      'Refusing an inadequate offer',
      'Escalating without being rude',
      'Agreeing a resolution',
    ],
    usefulPhrases: [
      'I want to explain what happened, and then what I would like.',
      'I am afraid that does not really resolve it.',
      'Could I speak to someone who can authorise that?',
      'So to confirm, you will ... by Friday.',
    ],
    openingLines: [
      'Customer service, you are speaking with Sam. I can see there is a note on your account - can you just confirm your postcode for me, and then tell me what the issue is?',
      'Thanks for holding, sorry about the wait. Can I take your account number? Right, I have got you. So what is this regarding?',
      'Hello, you are through to customer support. Before we start, can I confirm I am speaking with the account holder? Lovely. And what can I help with today?',
    ],
  },
  {
    ...base,
    id: 'life_making_friends',
    title: 'Making Friends Abroad',
    summary: 'Turn a polite acquaintance into an actual friend.',
    emoji: '🫂',
    suggestedDifficulty: 'intermediate',
    estimatedMinutes: 15,
    scenario:
      'You are someone who has lived in this city for years and is genuinely open to new people, but you are busy and a bit guarded. You warm up considerably if they show real interest rather than just being polite.',
    talkingPoints: [
      'Moving past surface-level small talk',
      'Suggesting meeting up without it being awkward',
      'Talking about being an outsider somewhere',
      'Following up afterwards',
    ],
    usefulPhrases: [
      'We should do this properly sometime.',
      'How long did it take you to feel settled here?',
      'I still feel like a bit of an outsider, honestly.',
      'Are you free next week at all?',
    ],
    openingLines: [
      'You are the one who just moved here, right? Someone mentioned it. How are you finding it? And be honest - everyone says great, love it, for the first three months and then admits it is quite hard.',
      'We keep ending up at the same things and I have never actually said hello properly. So - hello. How long have you been in the city?',
      'I will be honest, I only came tonight because I have not left the house all week. Are you here on your own too, or do you know people?',
    ],
  },
  {
    ...base,
    id: 'life_bank_admin',
    title: 'Bank and Paperwork',
    summary: 'The bureaucratic conversations nobody prepares you for.',
    emoji: '🏦',
    suggestedDifficulty: 'intermediate',
    estimatedMinutes: 12,
    scenario:
      'You work at a bank branch. You are helpful but bound by rules, and you keep asking for a document they do not have. You genuinely try to find a way round it if they explain their situation clearly.',
    talkingPoints: [
      'Explaining what you need to do',
      'Dealing with a document you do not have',
      'Asking about fees and small print',
      'Confirming what happens next',
    ],
    usefulPhrases: [
      'I am trying to sort out ...',
      'I do not have that with me - is there an alternative?',
      'Are there any charges I should know about?',
      'How long will that take to go through?',
    ],
    openingLines: [
      'Hi there, take a seat. So you have come in about opening an account - have you got proof of address with you? It needs to be dated within the last three months, I am afraid.',
      'Morning, how can I help? Right, I can certainly look at that for you. Have you banked with us before, or would this be a new account?',
      'Come through. Before we start, I should say the system has been slow all morning, so do bear with me. What was it you needed sorting?',
    ],
  },
  {
    ...base,
    id: 'life_debate_topic',
    title: 'A Proper Debate',
    summary: 'Argue a position you may not even hold, and defend it.',
    emoji: '⚖️',
    suggestedDifficulty: 'advanced',
    estimatedMinutes: 20,
    scenario:
      'You deliberately take the opposite side of whatever position they take, and argue it seriously and well. You are not contrarian for fun - you construct real arguments, concede good points, and press hard on weak reasoning.',
    talkingPoints: [
      'Building an argument in stages',
      'Using evidence and examples',
      'Conceding a point without losing the argument',
      'Spotting a flaw in reasoning',
    ],
    usefulPhrases: [
      'My argument would be that ...',
      'That is true, but it does not follow that ...',
      'Let me give you a concrete example.',
      'I will grant you that, but ...',
    ],
    openingLines: [
      'I want to properly argue about something. Pick anything you actually have a view on - remote work, social media, whatever - tell me your position, and I will take the other side and genuinely try to beat you.',
      'Here is a game. Tell me something you believe that most people around you disagree with. Then I am going to argue against it as hard as I can, and we will see whose reasoning survives.',
      'Let us disagree about something on purpose. You choose the subject, but choose one you actually care about - it is no fun if you do not mind losing.',
    ],
  },
  {
    ...base,
    id: 'life_telling_story',
    title: 'Telling a Story',
    summary: 'Hold someone’s attention for two whole minutes.',
    emoji: '📖',
    suggestedDifficulty: 'upper_intermediate',
    estimatedMinutes: 15,
    scenario:
      'You are a great audience - you react, you ask "and then what?", you laugh. You also tell your own stories, and you model good storytelling: setting the scene, building up, landing the ending.',
    talkingPoints: [
      'Setting up a story properly',
      'Keeping tenses consistent',
      'Building to a point',
      'Reacting to someone else’s story',
    ],
    usefulPhrases: [
      'So this was about two years ago ...',
      'And the thing is, I had no idea that ...',
      'Long story short ...',
      'You are joking - what did you do?',
    ],
    openingLines: [
      'Tell me something that has happened to you that sounds made up. Everyone has one. I will go first if you want, but mine involves a wedding, a wrong train, and a suit I never got back.',
      'Right, best story you have got. Does not have to be dramatic - the funniest ones never are. What is the one you always end up telling?',
      'I want to hear about the worst day you have ever had that is now funny. There is always a gap of a few years before they become funny, so take your pick.',
    ],
  },
];
