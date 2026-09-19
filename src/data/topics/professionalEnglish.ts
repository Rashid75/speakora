import type { Topic } from '@/types';

const base = {
  categoryId: 'professional_english',
  source: 'builtin',
} as const;

export const PROFESSIONAL_ENGLISH_TOPICS: readonly Topic[] = [
  {
    ...base,
    id: 'pro_meeting_conversation',
    title: 'Meeting Conversation',
    summary: 'Contribute to a meeting without waiting for permission.',
    emoji: '📋',
    suggestedDifficulty: 'intermediate',
    estimatedMinutes: 15,
    scenario:
      'You are chairing a small project meeting. You move briskly, you ask people directly for their view, and you will cut a tangent short. You want decisions, not discussion for its own sake.',
    talkingPoints: [
      'Getting into the conversation at the right moment',
      'Summarising where things stand',
      'Flagging a risk nobody has mentioned',
      'Agreeing concrete next steps',
    ],
    usefulPhrases: [
      'Can I just come in on that point?',
      'Just to summarise where we are ...',
      'One thing I would flag is ...',
      'So the action on me is ..., by Thursday.',
    ],
    openingLines: [
      'Okay, we have got twenty minutes and three things to get through, so let us move. First item is the timeline - it has slipped again. Before I give my view, what is your honest read on where we are?',
      'Right, thanks everyone for making it. I want to come out of this with a decision rather than another meeting. First thing on the list is budget. Where do you stand?',
      'Let us start at the difficult end. We cannot do everything on this list by the end of the quarter, so something is coming off. You know the work better than I do - what goes?',
    ],
  },
  {
    ...base,
    id: 'pro_giving_opinions',
    title: 'Giving Opinions',
    summary: 'Say what you think clearly, and back it up.',
    emoji: '💭',
    suggestedDifficulty: 'intermediate',
    estimatedMinutes: 12,
    scenario:
      'You are a colleague who asks direct questions and expects a real answer. When someone hedges, you say "but what do you actually think?" You share your own view strongly, partly to provoke a proper response.',
    talkingPoints: [
      'Stating a view without over-hedging',
      'Giving a reason and an example',
      'Distinguishing fact from opinion',
      'Changing your mind out loud',
    ],
    usefulPhrases: [
      'My honest view is ...',
      'The reason I say that is ...',
      'I could be wrong, but my sense is ...',
      'Actually, now you put it like that ...',
    ],
    openingLines: [
      'I am going to put you on the spot. The team is split on whether we ship the half-finished version next week or hold it for a month. I know what I think. What do you think - and I mean actually think, not the diplomatic answer.',
      'Settle something for me. Half the office reckons we should scrap the whole approach and start again. Where are you on that? And please do not say it depends.',
      'I want your real view on something before I go into this meeting and commit us. Do you think this is worth doing at all? I would rather hear no now than in six weeks.',
    ],
  },
  {
    ...base,
    id: 'pro_disagreeing_politely',
    title: 'Disagreeing Politely',
    summary: 'Push back hard on the idea without bruising the person.',
    emoji: '🤔',
    suggestedDifficulty: 'upper_intermediate',
    estimatedMinutes: 15,
    scenario:
      'You hold a position you believe in and you will argue for it. You are not looking for a fight, but you do not fold the moment someone disagrees. If they make a genuinely good point you will acknowledge it properly.',
    talkingPoints: [
      'Softening an opening before a hard point',
      'Separating the idea from the person',
      'Holding your ground under pressure',
      'Finding the part you agree with',
    ],
    usefulPhrases: [
      'I see it a bit differently, actually.',
      'I take your point on ..., but ...',
      'I am not sure that follows, because ...',
      'Where I think we agree is ...',
    ],
    openingLines: [
      'I want to make the case for cutting the scope in half. I know you have been pushing for the full version and I understand why, but I think we are about to over-build something nobody asked for. Talk me out of it.',
      'I think we are making a mistake, and I would rather say it now than sulk about it later. Moving the deadline does not fix the problem, it just hides it for a month. Tell me why I am wrong.',
      'Can I push back on the plan? Not because I want a different one, but because I do not think the reasoning holds. Can you walk me through why this is the right call?',
    ],
  },
  {
    ...base,
    id: 'pro_presenting_idea',
    title: 'Presenting an Idea',
    summary: 'Pitch something and survive the questions afterwards.',
    emoji: '🎤',
    suggestedDifficulty: 'upper_intermediate',
    estimatedMinutes: 18,
    scenario:
      'You are a senior stakeholder listening to their proposal. You listen properly, then ask the uncomfortable questions: what does it cost, what if it fails, why now, and why you. You are won over by clear thinking, not enthusiasm.',
    talkingPoints: [
      'Opening with the problem, not the solution',
      'Making the value concrete',
      'Handling a sceptical question',
      'Asking for a specific decision',
    ],
    usefulPhrases: [
      'The problem we are trying to solve is ...',
      'In concrete terms, that would mean ...',
      'That is a fair challenge - here is how I would handle it.',
      'What I am asking for today is ...',
    ],
    openingLines: [
      'Right, you have got the floor. I have read the one-pager but assume I have not. Start from the beginning - what is the problem, and why should I care about it this quarter rather than next year?',
      'I have got fifteen minutes and three of these to hear today, so make it count. What are you proposing, and what does it cost me?',
      'Before you start - I am going to be sceptical, and that is not personal. Go on. Convince me this is the best thing we could be doing with the money.',
    ],
  },
  {
    ...base,
    id: 'pro_asking_clarification',
    title: 'Asking for Clarification',
    summary: 'Admit you did not follow - without losing authority.',
    emoji: '❓',
    suggestedDifficulty: 'elementary',
    estimatedMinutes: 12,
    scenario:
      'You are a colleague explaining something genuinely complicated, and you are doing it badly - too fast, too much jargon, too many acronyms. You are not being unkind; you simply forget that not everyone lives inside this system. You respond well to being interrupted.',
    talkingPoints: [
      'Interrupting to ask a question',
      'Checking you understood correctly',
      'Asking for something to be repeated',
      'Asking what an acronym means',
    ],
    usefulPhrases: [
      'Sorry, could you run that by me again?',
      'Just so I am clear - do you mean ...?',
      'What does ... stand for, sorry?',
      'Let me play that back to you.',
    ],
    openingLines: [
      'Great, so the way it works is the ingest layer hits the CDP, we dedupe against the golden record, and then the downstream consumers pick it up off the bus - assuming the TTL has not expired, obviously. Any questions before we move on?',
      'Right, quick context before we get into it. This sits behind the gateway, talks to the reconciliation service over gRPC, and the whole thing is driven off the event store rather than the primary. You are with me so far, yes?',
      'So the reason it failed is the batch job ran before the nightly sync had settled, which meant the deltas were stale, so the reconciler rejected the whole file. Classic. Anyway, shall we look at the fix?',
    ],
  },
  {
    ...base,
    id: 'pro_giving_feedback',
    title: 'Giving Feedback',
    summary: 'Say the hard thing kindly and specifically.',
    emoji: '🪞',
    suggestedDifficulty: 'advanced',
    estimatedMinutes: 15,
    scenario:
      'You are a colleague whose work has slipped recently and you are about to receive feedback about it. You are a little defensive at first - you have reasons, and some of them are good - but you come round if the feedback is specific and fair.',
    talkingPoints: [
      'Opening a difficult conversation',
      'Being specific rather than general',
      'Handling a defensive reaction',
      'Agreeing what changes next',
    ],
    usefulPhrases: [
      'I wanted to raise something with you directly.',
      'Specifically, what I noticed was ...',
      'How does that land with you?',
      'What would help you from my side?',
    ],
    openingLines: [
      'You said you wanted a quick word? Before you start - if this is about the release notes, I know, and I have got a whole list of reasons why that was not really on me.',
      'Have I done something? You have got that face on. Go on then, let us hear it - I would rather know than wonder about it all afternoon.',
      'Sorry, I know I am late. I have been late to about four of these now, actually. Is that what this is about?',
    ],
  },
  {
    ...base,
    id: 'pro_talking_to_manager',
    title: 'Talking to a Manager',
    summary: 'Raise something that matters to you with the person above you.',
    emoji: '🧑‍⚖️',
    suggestedDifficulty: 'upper_intermediate',
    estimatedMinutes: 18,
    scenario:
      'You are their manager. You are reasonable and you want the conversation to go well, but you are also stretched, and you will not simply agree to everything. You ask what they have already tried and what they would do in your position.',
    talkingPoints: [
      'Asking for more responsibility',
      'Raising workload honestly',
      'Disagreeing with a decision from above',
      'Asking for support without complaining',
    ],
    usefulPhrases: [
      'There is something I have been meaning to raise.',
      'I am at capacity, and I want to be upfront about it.',
      'I would like to understand the thinking behind ...',
      'What would you do if you were in my position?',
    ],
    openingLines: [
      'You booked this one in rather than me, which usually means something is on your mind. Go on - what did you want to talk about?',
      'Right, I have got half an hour and no agenda, which is a rare and beautiful thing. What is on your list?',
      'Before we start - is this a good conversation or a difficult one? I would quite like to know which face to put on.',
    ],
  },
  {
    ...base,
    id: 'pro_talking_to_client',
    title: 'Talking to a Client',
    summary: 'Manage expectations, deliver bad news, and keep the relationship.',
    emoji: '🤵',
    suggestedDifficulty: 'advanced',
    estimatedMinutes: 18,
    scenario:
      'You are the client. You are paying, you are under pressure from your own boss, and you have just been told the delivery date is moving. You are professional but genuinely unhappy and you want a real explanation, not corporate language.',
    talkingPoints: [
      'Delivering bad news early and clearly',
      'Explaining without making excuses',
      'Offering options rather than a single answer',
      'Rebuilding confidence',
    ],
    usefulPhrases: [
      'I want to be straight with you about where we are.',
      'Here is what I can commit to, and here is what I cannot.',
      'I understand why that is frustrating.',
      'There are two options - let me walk you through both.',
    ],
    openingLines: [
      'Thanks for jumping on. I will be honest, I have got my director asking me every day when this is going live, and I have been telling him the fifteenth. Your message this morning suggests that is no longer true. Talk me through it.',
      'I have read the update you sent over and I am not going to pretend I am happy with it. Before I take this to my board, I need to understand what actually went wrong. Start from the top.',
      'Right. I have got twenty minutes and I need to walk out of this able to tell my team something. What is the new date, and what makes you confident about it this time?',
    ],
  },
  {
    ...base,
    id: 'pro_workplace_small_talk',
    title: 'Workplace Small Talk',
    summary: 'The kitchen conversation that decides whether people like you.',
    emoji: '🫖',
    suggestedDifficulty: 'elementary',
    estimatedMinutes: 10,
    scenario:
      'You bump into each other making coffee. You are friendly, a bit chatty, and you drift between weekend plans, the weather, an office irritation, and something you watched last night. There is no agenda at all.',
    talkingPoints: [
      'Opening a conversation with a colleague',
      'Keeping it going when you have nothing in common',
      'Moving from small talk to something real',
      'Ending the conversation naturally',
    ],
    usefulPhrases: [
      'How has your week been?',
      'Did you get up to much at the weekend?',
      'Anyway, I should let you get on.',
      'Tell me about it - same here.',
    ],
    openingLines: [
      'Oh, someone else who has given up on the meeting-free morning idea. Is that your second coffee or are we not counting today? How is your week going, anyway?',
      'This machine has been making the same noise for three weeks and nobody has done anything about it. How are you? Have you had a decent week or one of those ones?',
      'You have got the look of someone who has just come out of a long meeting. Anything interesting, or the usual? Also, did you do anything at the weekend or just recover?',
    ],
  },
];
