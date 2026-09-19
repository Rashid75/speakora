import type { Topic } from '@/types';

const base = {
  categoryId: 'exams_and_interviews',
  source: 'builtin',
} as const;

export const EXAMS_AND_INTERVIEWS_TOPICS: readonly Topic[] = [
  {
    ...base,
    id: 'exam_ielts_part1',
    title: 'IELTS Speaking Part 1',
    summary: 'Familiar questions, short confident answers.',
    emoji: '1️⃣',
    suggestedDifficulty: 'intermediate',
    estimatedMinutes: 12,
    scenario:
      'You are an IELTS examiner running Part 1. You ask short questions about familiar topics - home, work, study, hobbies - and you move briskly between them. You stay neutral and professional, you do not give feedback mid-test, and you do not let an answer run too long.',
    talkingPoints: [
      'Where you live and what it is like',
      'Work or study',
      'Free time and routine',
      'Extending a short answer with a reason',
    ],
    usefulPhrases: [
      'I would say ..., mainly because ...',
      'It depends, really - on weekdays I ..., but at weekends ...',
      'Not particularly, no. I would rather ...',
      'That is a good question - I suppose ...',
    ],
    openingLines: [
      'Good morning. This is the speaking test. Can you tell me your full name, please? And where are you from?',
      'Good afternoon. Before we begin, could you confirm your full name and show me your identification? Thank you. Now, let us talk about where you live. Do you live in a house or a flat?',
      'Hello, and welcome. Can I have your full name, please? Thank you. In this first part I am going to ask you some questions about yourself. Let us start with your work. Do you work, or are you a student?',
    ],
  },
  {
    ...base,
    id: 'exam_ielts_part2',
    title: 'IELTS Speaking Part 2',
    summary: 'The long turn: speak alone for two minutes.',
    emoji: '2️⃣',
    suggestedDifficulty: 'upper_intermediate',
    estimatedMinutes: 12,
    scenario:
      'You are an IELTS examiner running the Part 2 long turn. You give a cue card topic with three bullet points, tell them they have one minute to prepare and should speak for one to two minutes, and then you listen without interrupting. At the end you ask one short rounding-off question.',
    talkingPoints: [
      'Structuring a two-minute monologue',
      'Covering every bullet point',
      'Using fillers to buy thinking time naturally',
      'Finishing cleanly rather than trailing off',
    ],
    usefulPhrases: [
      'I am going to talk about ...',
      'The reason I chose this is ...',
      'What made it memorable was ...',
      'So overall, that is why ...',
    ],
    openingLines: [
      'Now I am going to give you a topic and I would like you to talk about it for one to two minutes. Here is your topic: describe a skill you would like to learn. You should say what the skill is, why you want to learn it, and how you would go about it. You have one minute to think. Tell me when you are ready.',
      'In this part I will give you a topic to speak about for one to two minutes. Your topic is: describe a journey that did not go as planned. You should say where you were going, what went wrong, and how you felt about it afterwards. You have one minute to prepare.',
      'Here is your cue card. I would like you to describe a person who has influenced you. You should say who they are, how you know them, and what it is about them that has stayed with you. You have one minute to make notes, and then I would like you to speak for one to two minutes.',
    ],
  },
  {
    ...base,
    id: 'exam_ielts_part3',
    title: 'IELTS Speaking Part 3',
    summary: 'Abstract discussion - the part that separates B2 from C1.',
    emoji: '3️⃣',
    suggestedDifficulty: 'advanced',
    estimatedMinutes: 18,
    scenario:
      'You are an IELTS examiner running Part 3. You ask abstract, analytical questions that move away from personal experience towards society, trends and speculation. You follow up on their answers and sometimes challenge them to consider the opposite view.',
    talkingPoints: [
      'Speculating about the future',
      'Comparing past and present',
      'Weighing advantages and disadvantages',
      'Generalising beyond your own experience',
    ],
    usefulPhrases: [
      'On the whole, I would argue that ...',
      'There is a tendency for people to ...',
      'It is difficult to say, but I imagine ...',
      'That said, you could equally argue ...',
    ],
    openingLines: [
      'We have been talking about learning new skills, and I would like to widen the discussion. Why do you think adults often find it harder to learn new things than children do?',
      'Let us move on to some more general questions about travel. Do you think tourism brings more benefits or more problems to a country?',
      "I would like to broaden the discussion now. We talked about people who influence us - how much do you think a person's character is shaped by the people around them, rather than by their own choices?",
    ],
  },
  {
    ...base,
    id: 'exam_job_interview_general',
    title: 'General Job Interview',
    summary: 'Strengths, weaknesses, gaps and "why us".',
    emoji: '👔',
    suggestedDifficulty: 'upper_intermediate',
    estimatedMinutes: 20,
    scenario:
      'You are a recruiter running a first-round interview for a role they applied to. You are warm but you are assessing. You ask the standard questions, you notice when an answer avoids the question, and you follow up on anything vague.',
    talkingPoints: [
      'Why this role and this company',
      'Strengths with evidence',
      'A weakness answered honestly',
      'Questions to ask the interviewer',
    ],
    usefulPhrases: [
      'What drew me to the role specifically was ...',
      'One thing I have had to work on is ...',
      'A concrete example of that would be ...',
      'Can I ask you something about the team?',
    ],
    openingLines: [
      'Thanks for coming in. This first conversation is fairly informal - I mostly want to understand your background and what you are looking for. So let us start with the obvious one: why this role?',
      'Good to meet you. I have got about half an hour and a fairly standard set of questions, so let us get into it. Tell me a bit about what you are doing at the moment and why you are looking to move.',
      'Thanks for making the time. Before I tell you about us, I would rather hear from you. What made you apply? And be specific - I get a lot of answers about company culture.',
    ],
  },
  {
    ...base,
    id: 'exam_salary_negotiation',
    title: 'Salary Negotiation',
    summary: 'Ask for more money without apologising for it.',
    emoji: '💷',
    suggestedDifficulty: 'advanced',
    estimatedMinutes: 15,
    scenario:
      'You are the hiring manager with a real budget constraint. You make an offer below what they want. You do not immediately improve it - you ask them to justify the number. If they hold firm and make a reasoned case, you find some movement, but not unlimited.',
    talkingPoints: [
      'Naming a number without flinching',
      'Justifying your value with evidence',
      'Handling "that is above our range"',
      'Negotiating non-salary items',
    ],
    usefulPhrases: [
      'Based on my experience and the market, I was looking for ...',
      'Is there any flexibility on that?',
      'Could we look at the other elements of the package?',
      'I would be comfortable at ...',
    ],
    openingLines: [
      'Good news - we would like to make you an offer. The team were really positive. The number we have landed on is a little below what you mentioned at the start, so I wanted to talk it through with you directly rather than just send it over.',
      'So, we want you. I will not keep you in suspense. The package is at the lower end of the band you gave us, and before you react, I would like to explain why and hear what you think.',
      'Right, offer conversation. I have got a number, you have got a number, and they are not the same number. Shall we do this the straightforward way? Tell me what you were expecting and why.',
    ],
  },
  {
    ...base,
    id: 'exam_presentation_qa',
    title: 'Presentation Q&A',
    summary: 'The five minutes after the slides, when it gets real.',
    emoji: '🙋',
    suggestedDifficulty: 'advanced',
    estimatedMinutes: 15,
    scenario:
      'You are an audience member at a talk they have just given. You ask sharp questions, including one you know they probably cannot answer. You are not hostile, but you are not letting anything slide either.',
    talkingPoints: [
      'Answering a question you do not know the answer to',
      'Handling a hostile or loaded question',
      'Clarifying a misunderstanding',
      'Keeping an answer short',
    ],
    usefulPhrases: [
      'That is a really good question.',
      'I do not have that figure to hand, but I can follow up.',
      'I think there may be a misunderstanding - what I meant was ...',
      'Short answer: yes. Slightly longer answer ...',
    ],
    openingLines: [
      'Thanks for the talk, that was interesting. I have got one question though. You showed the results from a fairly small sample - what makes you confident that scales to a much larger population?',
      'Good talk. Can I ask about the bit you skipped over? You mentioned the approach failed the first time round and then moved straight on. What actually went wrong?',
      'Thanks, that was clear. I want to push on the conclusion though. Everything you showed is consistent with your explanation, but it is also consistent with a much duller one. How would you tell the two apart?',
    ],
  },
];
