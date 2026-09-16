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
    openingLine:
      'Good morning. My name is Adrian and this is the speaking test. Can you tell me your full name, please? And where are you from?',
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
    openingLine:
      'Now I am going to give you a topic and I would like you to talk about it for one to two minutes. Here is your topic: describe a skill you would like to learn. You should say what the skill is, why you want to learn it, and how you would go about it. You have one minute to think. Tell me when you are ready.',
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
    openingLine:
      'We have been talking about learning new skills, and I would like to widen the discussion. Why do you think adults often find it harder to learn new things than children do?',
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
    openingLine:
      'Thanks for coming in. This first conversation is fairly informal - I mostly want to understand your background and what you are looking for. So let us start with the obvious one: why this role?',
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
    openingLine:
      'Good news - we would like to make you an offer. The team were really positive. The number we have landed on is a little below what you mentioned at the start, so I wanted to talk it through with you directly rather than just send it over.',
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
    openingLine:
      'Thanks for the talk, that was interesting. I have got one question though. You showed the results from a fairly small sample - what makes you confident that scales to a much larger population?',
  },
];
