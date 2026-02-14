// Icebreaker conversation starters for Blackout matches
export const icebreakers: string[] = [
  "If you could have dinner with anyone, living or dead, who would it be?",
  "What's the most spontaneous thing you've ever done?",
  "What's your go-to comfort food after a long day?",
  "If you could travel anywhere tomorrow, where would you go?",
  "What's a skill you've always wanted to learn?",
  "What's the best book, movie, or show you've experienced recently?",
  "Do you prefer sunrises or sunsets? Why?",
  "What's your most unpopular opinion?",
  "If your life had a theme song, what would it be?",
  "What's one thing on your bucket list you haven't done yet?",
  "Are you more of a planner or a go-with-the-flow type?",
  "What's your favorite way to spend a lazy Sunday?",
  "If you could instantly master one musical instrument, which would it be?",
  "What's the best piece of advice you've ever received?",
  "Coffee or tea — and how do you take it?",
  "What's a hidden talent you have that most people don't know about?",
  "If you could live in any era, which would you choose?",
  "What's the last thing that made you genuinely laugh out loud?",
  "Mountains or beach for your ideal getaway?",
  "What do you think is the key to a great conversation?",
];

export function getRandomIcebreakers(count: number = 3): string[] {
  const shuffled = [...icebreakers].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
