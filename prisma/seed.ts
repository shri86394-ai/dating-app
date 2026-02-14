import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL!,
});
const adapter = new PrismaPg(pool);
const prisma = new (PrismaClient as any)({ adapter });

async function main() {
  console.log("Seeding database...");

  // ─── Create Question Bank ────────────────────────────
  const questions = [
    // Multiple Choice
    {
      questionText: "What's your ideal Saturday night?",
      questionType: "MULTIPLE_CHOICE" as const,
      options: [
        "A cozy night in with a good movie",
        "Going out to a trendy restaurant",
        "Dancing at a club or live music venue",
        "A quiet dinner party with close friends",
      ],
    },
    {
      questionText: "How do you handle disagreements in a relationship?",
      questionType: "MULTIPLE_CHOICE" as const,
      options: [
        "Talk it out immediately",
        "Take some time to cool off first",
        "Write down my thoughts before discussing",
        "Seek a compromise right away",
      ],
    },
    {
      questionText: "What's your love language?",
      questionType: "MULTIPLE_CHOICE" as const,
      options: [
        "Words of affirmation",
        "Quality time",
        "Physical touch",
        "Acts of service",
      ],
    },
    {
      questionText: "What role does humor play in your relationships?",
      questionType: "MULTIPLE_CHOICE" as const,
      options: [
        "It's essential — I need someone who makes me laugh",
        "Important but not the top priority",
        "Nice to have, but depth matters more",
        "I prefer someone who's more serious",
      ],
    },
    {
      questionText: "How do you prefer to spend your vacations?",
      questionType: "MULTIPLE_CHOICE" as const,
      options: [
        "Adventurous trips — hiking, surfing, exploring",
        "Relaxing on a beach or at a resort",
        "Cultural trips — museums, history, food tours",
        "Staycation — there's no place like home",
      ],
    },
    {
      questionText: "What's most important to you in a partner?",
      questionType: "MULTIPLE_CHOICE" as const,
      options: [
        "Ambition and drive",
        "Kindness and empathy",
        "Sense of adventure",
        "Intelligence and curiosity",
      ],
    },
    {
      questionText: "How do you feel about pets?",
      questionType: "MULTIPLE_CHOICE" as const,
      options: [
        "I love them and have/want pets",
        "I like them but don't need my own",
        "I'm neutral — take them or leave them",
        "I prefer a pet-free home",
      ],
    },
    {
      questionText: "What's your communication style?",
      questionType: "MULTIPLE_CHOICE" as const,
      options: [
        "I text throughout the day",
        "I prefer longer, fewer conversations",
        "Phone and video calls over texting",
        "I like a mix of everything",
      ],
    },

    // Scale questions
    {
      questionText: "How adventurous are you?",
      questionType: "SCALE" as const,
      options: null,
    },
    {
      questionText: "How important is alone time to you?",
      questionType: "SCALE" as const,
      options: null,
    },
    {
      questionText: "How spontaneous are you?",
      questionType: "SCALE" as const,
      options: null,
    },
    {
      questionText: "How important is physical fitness to you?",
      questionType: "SCALE" as const,
      options: null,
    },
    {
      questionText: "How much do you value career success?",
      questionType: "SCALE" as const,
      options: null,
    },
    {
      questionText: "How social are you on a scale of 1-5?",
      questionType: "SCALE" as const,
      options: null,
    },
    {
      questionText: "How important is shared political views in a relationship?",
      questionType: "SCALE" as const,
      options: null,
    },
    {
      questionText: "How much do you enjoy trying new foods?",
      questionType: "SCALE" as const,
      options: null,
    },

    // Short text
    {
      questionText: "Describe your perfect day in one sentence.",
      questionType: "SHORT_TEXT" as const,
      options: null,
    },
    {
      questionText: "What's one thing you can't live without?",
      questionType: "SHORT_TEXT" as const,
      options: null,
    },
    {
      questionText: "What makes you feel most alive?",
      questionType: "SHORT_TEXT" as const,
      options: null,
    },
    {
      questionText: "What's the most interesting thing about you?",
      questionType: "SHORT_TEXT" as const,
      options: null,
    },
    {
      questionText: "If you could change one thing about the world, what would it be?",
      questionType: "SHORT_TEXT" as const,
      options: null,
    },
    {
      questionText: "What's a deal-breaker for you in a relationship?",
      questionType: "SHORT_TEXT" as const,
      options: null,
    },
    {
      questionText: "What does your ideal Sunday morning look like?",
      questionType: "SHORT_TEXT" as const,
      options: null,
    },
    {
      questionText: "What are you most passionate about right now?",
      questionType: "SHORT_TEXT" as const,
      options: null,
    },
  ];

  for (const q of questions) {
    await prisma.questionBank.upsert({
      where: {
        id: q.questionText.slice(0, 20).replace(/\s/g, "-").toLowerCase(),
      },
      update: {},
      create: {
        questionText: q.questionText,
        questionType: q.questionType,
        options: q.options,
        active: true,
      },
    });
  }

  console.log(`Seeded ${questions.length} questions to the question bank.`);

  // ─── Create Admin User ───────────────────────────────
  const admin = await prisma.user.upsert({
    where: { phone: "+10000000000" },
    update: {},
    create: {
      phone: "+10000000000",
      name: "Admin",
      status: "ACTIVE",
      role: "ADMIN",
      bio: "Blackout App Administrator",
      interests: [],
      photos: [],
    },
  });

  console.log(`Admin user created: ${admin.id} (phone: +10000000000)`);

  // ─── Create Test Users ───────────────────────────────
  const testUsers = [
    {
      phone: "+11111111111",
      name: "Alex Rivera",
      gender: "MALE" as const,
      preference: "FEMALE" as const,
      bio: "Coffee enthusiast, weekend hiker, and amateur chef. Always looking for the next adventure.",
      location: "San Francisco, CA",
      latitude: 37.7749,
      longitude: -122.4194,
      interests: ["hiking", "cooking", "photography", "travel", "coffee"],
    },
    {
      phone: "+12222222222",
      name: "Jordan Chen",
      gender: "FEMALE" as const,
      preference: "MALE" as const,
      bio: "Book lover and yoga instructor. I believe in deep conversations and spontaneous road trips.",
      location: "San Francisco, CA",
      latitude: 37.7849,
      longitude: -122.4094,
      interests: ["reading", "fitness", "travel", "music", "nature"],
    },
    {
      phone: "+13333333333",
      name: "Sam Patel",
      gender: "MALE" as const,
      preference: "EVERYONE" as const,
      bio: "Tech nerd by day, musician by night. Let's grab tacos and talk about life.",
      location: "Oakland, CA",
      latitude: 37.8044,
      longitude: -122.2712,
      interests: ["tech", "music", "food", "gaming", "movies"],
    },
    {
      phone: "+14444444444",
      name: "Taylor Kim",
      gender: "NON_BINARY" as const,
      preference: "EVERYONE" as const,
      bio: "Artist, plant parent, and sunset chaser. I make a mean latte.",
      location: "Berkeley, CA",
      latitude: 37.8716,
      longitude: -122.2727,
      interests: ["art", "nature", "cooking", "photography", "fashion"],
    },
  ];

  for (const userData of testUsers) {
    await prisma.user.upsert({
      where: { phone: userData.phone },
      update: {},
      create: {
        ...userData,
        dateOfBirth: new Date("1995-06-15"),
        status: "ACTIVE",
        role: "USER",
        photos: [],
      },
    });
  }

  console.log(`Seeded ${testUsers.length} test users.`);
  console.log("\nSeed complete! You can log in with:");
  console.log("  Admin: +10000000000 (OTP: 123456)");
  console.log("  Users: +11111111111 through +14444444444 (OTP: 123456)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
