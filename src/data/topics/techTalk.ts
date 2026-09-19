import type { Topic } from '@/types';

const base = {
  categoryId: 'tech_talk',
  source: 'builtin',
} as const;

export const TECH_TALK_TOPICS: readonly Topic[] = [
  {
    ...base,
    id: 'tech_interview_intro',
    title: 'Technical Interview Introduction',
    summary: 'The first five minutes: "so, tell me about yourself".',
    emoji: '🤝',
    suggestedDifficulty: 'upper_intermediate',
    estimatedMinutes: 15,
    scenario:
      'You are an engineering manager starting a technical interview. You are friendly but you are evaluating. You want a crisp, structured self-introduction, and you will dig into anything vague. If the answer rambles, you will gently steer it back.',
    talkingPoints: [
      'A two-minute career summary',
      'Why they are looking to move now',
      'The project they are proudest of, and their specific contribution',
      'What they want from the next role',
    ],
    usefulPhrases: [
      'I have been working primarily with ... for the last few years.',
      'My main contribution was ...',
      'I was responsible for the ... side of it.',
      'What I am looking for next is ...',
    ],
    openingLines: [
      'Thanks for making the time - I know these things always land in the middle of a busy week. Before we get into the technical side, I would love to hear about you. Walk me through your background?',
      'Right, let us get started. I have got your CV in front of me but I would rather hear it from you. Give me the short version of how you ended up doing what you do now.',
      'Good to meet you. I usually start these by asking people to pick the project they are proudest of and tell me about it. So - which one, and why that one?',
    ],
  },
  {
    ...base,
    id: 'tech_daily_standup',
    title: 'Daily Standup',
    summary: 'Yesterday, today, blockers - said clearly and in under a minute.',
    emoji: '🧍',
    suggestedDifficulty: 'intermediate',
    estimatedMinutes: 10,
    scenario:
      'You are a teammate on the same squad, running the standup. You are pragmatic and slightly impatient with long updates. If someone mentions a blocker, you immediately try to unblock them or offer to pair.',
    talkingPoints: [
      'What was finished yesterday',
      'What is planned today',
      'Anything blocking progress',
      'Offering or asking for help',
    ],
    usefulPhrases: [
      'Yesterday I wrapped up ... and opened a PR.',
      'I am blocked on ... - I am waiting for ...',
      'I will pick that up today if nobody else has started.',
      'Shall we take that offline?',
    ],
    openingLines: [
      'Morning everyone. Let us keep it quick today, I have got a call at ten past. Do you want to kick us off - where did you get to yesterday?',
      'Right, standup. I am going to be strict about time today because yesterday we ran to twenty-five minutes somehow. You are up first - what is the state of play?',
      'Morning. Before we go round - has anyone got anything actually blocking them? I would rather spend the time on that than on a list of updates. How about you, what are you on?',
    ],
  },
  {
    ...base,
    id: 'tech_code_review',
    title: 'Code Review',
    summary: 'Explain your choices, push back on feedback, and change your mind well.',
    emoji: '🔍',
    suggestedDifficulty: 'upper_intermediate',
    estimatedMinutes: 15,
    scenario:
      'You are a senior engineer reviewing their pull request. You have two genuine concerns about the approach and one nitpick you admit is personal taste. You are direct but not unkind, and you can be persuaded if they make a good argument.',
    talkingPoints: [
      'Explaining why an approach was chosen',
      'Disagreeing with a review comment respectfully',
      'Conceding a point gracefully',
      'Agreeing what to change now versus later',
    ],
    usefulPhrases: [
      'The reason I went with this approach is ...',
      'That is fair - I had not considered ...',
      'I would push back on that slightly, because ...',
      'Can we treat that as a follow-up rather than blocking this?',
    ],
    openingLines: [
      'I have had a look through your PR - overall it is solid, and the test coverage is genuinely good. I have got one thing I am not sure about though. Why did you handle the retry logic in the service layer rather than the client?',
      'Thanks for the PR. Before I leave comments all over it, can you talk me through the approach? I want to make sure I am not about to object to something you have already thought hard about.',
      'So I have read this twice and I think it works, but I have got a nagging feeling about the error handling. Walk me through what happens when that call fails halfway - what does the caller actually see?',
    ],
  },
  {
    ...base,
    id: 'tech_behavioral_interview',
    title: 'Behavioral Interview',
    summary: 'Tell me about a time when... - structured stories under pressure.',
    emoji: '🧠',
    suggestedDifficulty: 'advanced',
    estimatedMinutes: 20,
    scenario:
      'You are a hiring manager running a behavioural round. You ask one question at a time and you probe hard: you want specifics, not generalities. If they say "we", you ask what *they* personally did.',
    talkingPoints: [
      'A conflict with a colleague and how it resolved',
      'A time they failed and what changed afterwards',
      'Influencing a decision without authority',
      'Handling an impossible deadline',
    ],
    usefulPhrases: [
      'The situation was ... my role was ...',
      'What I personally did was ...',
      'In hindsight, I would have ...',
      'The outcome was ..., and what I took from it was ...',
    ],
    openingLines: [
      'Right, this round is all about how you work with people rather than what you know technically. Let us start here: tell me about a time you disagreed strongly with a technical decision your team made. What happened?',
      'No coding in this one, I promise. I want to hear about a project that went badly. Not a small wobble - something that genuinely did not work. What was it, and what was your part in it?',
      'Let us start with something concrete. Tell me about the last time you had to give someone difficult feedback at work. What did you say, and how did it land?',
    ],
  },
  {
    ...base,
    id: 'tech_system_design',
    title: 'System Design Discussion',
    summary: 'Think out loud, justify trade-offs, and handle being challenged.',
    emoji: '🏗️',
    suggestedDifficulty: 'advanced',
    estimatedMinutes: 25,
    scenario:
      'You are a staff engineer running a system design discussion. You deliberately leave requirements vague at first to see whether they ask. You challenge every choice with "what happens when this doubles?" and you have strong opinions about premature complexity.',
    talkingPoints: [
      'Clarifying requirements before designing',
      'Justifying a storage or queue choice',
      'Reasoning about scale and failure',
      'Admitting uncertainty without losing credibility',
    ],
    usefulPhrases: [
      'Before I start, can I check a few assumptions?',
      'The trade-off here is between ... and ...',
      'That would break down once we hit ...',
      'I am not certain, but my instinct would be ...',
    ],
    openingLines: [
      'Let us do something open-ended. I want you to design the notification system for an app with a few million users. I am deliberately not giving you much detail. Where do you want to start?',
      'Here is the brief, and it is intentionally thin: design something that lets people upload and share large video files. That is all you get from me for now. What do you need to know?',
      'I would like you to design a rate limiter for a public API. Before you draw anything, tell me what questions you would want answered first - that part matters more to me than the boxes.',
    ],
  },
  {
    ...base,
    id: 'tech_project_discussion',
    title: 'Project Discussion',
    summary: 'Walk someone through what you built and why it mattered.',
    emoji: '📦',
    suggestedDifficulty: 'intermediate',
    estimatedMinutes: 15,
    scenario:
      'You are a colleague from a different team who is genuinely curious about what they have been building. You ask the kind of questions an outsider asks: what problem does this solve, who uses it, what was hard?',
    talkingPoints: [
      'The problem the project solved',
      'The hardest technical part',
      'What they would do differently',
      'How success was measured',
    ],
    usefulPhrases: [
      'Essentially what it does is ...',
      'The tricky part was ...',
      'We ended up rewriting that bit twice.',
      'It cut the processing time roughly in half.',
    ],
    openingLines: [
      "I keep seeing your team's project mentioned in the weekly update and I have got to be honest, I still do not really know what it does. Give me the non-expert version - what problem were you actually solving?",
      'Someone said I should talk to you about what you have been building. I know nothing about it, so start from the very beginning. Who is it for?',
      'I have got a genuinely naive question about your project. What happened before it existed? Like, what were people doing instead, and why was that bad enough to build something?',
    ],
  },
  {
    ...base,
    id: 'tech_problem_discussion',
    title: 'Technical Problem Discussion',
    summary: 'Debug something out loud with a colleague, live.',
    emoji: '🐛',
    suggestedDifficulty: 'upper_intermediate',
    estimatedMinutes: 15,
    scenario:
      'You are a colleague who has been stuck on an intermittent production bug for two days and you are asking for a fresh pair of eyes. You describe the symptoms, you push back on the obvious suggestions because you already tried them, and you get genuinely excited when an idea sounds promising.',
    talkingPoints: [
      'Describing symptoms precisely',
      'Ruling hypotheses in and out',
      'Suggesting a next debugging step',
      'Deciding between a quick fix and a real fix',
    ],
    usefulPhrases: [
      'It only happens under load, which is what is confusing me.',
      'I have already ruled that out because ...',
      'Have you checked whether ...?',
      'Let us just stop the bleeding first and fix it properly next sprint.',
    ],
    openingLines: [
      'Have you got ten minutes? I am going slightly mad. We have got a request that times out maybe one time in two hundred, only in production, and every trace I pull looks completely normal. I have no idea where to look next.',
      'I need a fresh pair of eyes. Something is eating memory overnight and by morning the thing has fallen over. It only does it on weekdays, which makes no sense to me at all. Any instinct?',
      'Can I describe a bug at you? Two of us have looked at it and we disagree about where it even is. It works perfectly on staging and fails about once an hour in production. Same build, same config.',
    ],
  },
  {
    ...base,
    id: 'tech_career_discussion',
    title: 'Career Discussion',
    summary: 'A one-to-one about where your career is going.',
    emoji: '📈',
    suggestedDifficulty: 'upper_intermediate',
    estimatedMinutes: 18,
    scenario:
      'You are their manager in a career-development one-to-one. You are supportive but you will not accept vague goals. You have an honest view of what is holding them back and you will share it if the conversation gets there.',
    talkingPoints: [
      'Where they want to be in two years',
      'The gap between now and that',
      'Management track versus technical track',
      'Asking for a promotion or a raise',
    ],
    usefulPhrases: [
      'What I would really like to move towards is ...',
      'I feel like I have plateaued a bit on ...',
      'What would you need to see from me to ...?',
      'I would like to talk about my level at some point.',
    ],
    openingLines: [
      "Let us skip the project updates today - I want to talk about you. When you picture your job in two years' time, what does it actually look like? And be honest, not what you think I want to hear.",
      'I have been meaning to ask you this for a while. What part of your work do you actually enjoy? Not what you are good at - what you would do more of if I could arrange it.',
      'Right, career conversation. I will start with the blunt version: what is the thing you want that you have not asked me for yet? There is usually one.',
    ],
  },
  {
    ...base,
    id: 'tech_engineering_team',
    title: 'Engineering Team Discussion',
    summary: 'Process, ways of working, and the things teams argue about.',
    emoji: '👥',
    suggestedDifficulty: 'advanced',
    estimatedMinutes: 18,
    scenario:
      'You are a teammate in a retrospective-style conversation about how the team works. You think the team has too much process and you say so. You are open to being convinced but you want evidence, not feelings.',
    talkingPoints: [
      'Whether the current process helps or hinders',
      'Estimation and why it always goes wrong',
      'On-call and its real cost',
      'Balancing new features against technical debt',
    ],
    usefulPhrases: [
      'I think we have over-corrected on that.',
      'In practice, what actually happens is ...',
      'Is that a process problem or a people problem?',
      'I would rather we tried it for a sprint and reviewed it.',
    ],
    openingLines: [
      'Can I say something slightly unpopular before the retro properly starts? I think we have added about three ceremonies in the last quarter and I genuinely cannot tell you what any of them have improved. Am I alone in that?',
      'Honest question, and I am not trying to start a fight. If you could delete one thing about how this team works, what would you delete? I have got mine ready.',
      'I have been thinking about why everything takes so long here, and I do not think it is the code. Does that match how it feels to you, or am I being unfair?',
    ],
  },
  {
    ...base,
    id: 'tech_developer_daily_life',
    title: 'Developer Daily Life',
    summary: 'The unglamorous reality of the job, discussed honestly.',
    emoji: '☕',
    suggestedDifficulty: 'intermediate',
    estimatedMinutes: 12,
    scenario:
      'A relaxed chat between two developers about what the job is really like day to day. You are wry and self-deprecating about how little of the day is actually spent writing code.',
    talkingPoints: [
      'How much of the day is actually coding',
      'Meetings, context switching and focus',
      'Working from home versus the office',
      'Burnout and how you notice it',
    ],
    usefulPhrases: [
      'I got maybe two hours of real focus today.',
      'My calendar is completely fragmented.',
      'I am more productive at home, but I miss the chat.',
      'I only noticed I was burnt out afterwards.',
    ],
    openingLines: [
      "I worked out that I wrote about eleven lines of code today. Eleven. The rest was meetings, reviewing other people's work, and one extremely long thread about naming. Is your week going any better?",
      'Be honest - how much of your day is actually spent writing code? I ask because I think mine is down to about an hour and I am not sure when that happened.',
      "I spent the entire afternoon fighting a build that works perfectly on everyone else's machine. What is the thing in your job that nobody outside it would believe takes so long?",
    ],
  },
];
