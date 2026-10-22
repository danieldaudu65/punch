interface SeedQuestion {
  key: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface SeedQuiz {
  slug: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  accent: 'red' | 'gold' | 'violet';
  timeLimitSec: number;
  questions: SeedQuestion[];
}

export const seedQuizzes: SeedQuiz[] = [
  {
    slug: 'naija-know-it-all',
    title: 'Naija Know-It-All',
    description: 'How well do you know Nigeria? History, places and people.',
    category: 'General Knowledge',
    difficulty: 'easy',
    accent: 'red',
    timeLimitSec: 300,
    questions: [
      {
        key: 'naija-01',
        prompt: 'In what year did Nigeria gain independence?',
        options: ['1957', '1960', '1963', '1966'],
        correctIndex: 1,
        explanation: 'Nigeria became independent from Britain on 1 October 1960.',
      },
      {
        key: 'naija-02',
        prompt: 'What is the capital of Nigeria?',
        options: ['Lagos', 'Kano', 'Abuja', 'Ibadan'],
        correctIndex: 2,
        explanation: 'Abuja is the Federal Capital Territory and seat of government.',
      },
      {
        key: 'naija-03',
        prompt: 'How many states does Nigeria have?',
        options: ['30', '36', '37', '42'],
        correctIndex: 1,
        explanation: 'Nigeria has 36 states plus the Federal Capital Territory.',
      },
      {
        key: 'naija-04',
        prompt: 'Which city was Nigeria’s capital before Abuja?',
        options: ['Lagos', 'Enugu', 'Kaduna', 'Calabar'],
        correctIndex: 0,
        explanation: 'Lagos was the capital until the move to Abuja.',
      },
      {
        key: 'naija-05',
        prompt: 'In what year did Abuja officially become the capital?',
        options: ['1976', '1984', '1991', '1999'],
        correctIndex: 2,
        explanation: 'The seat of government moved to Abuja in December 1991.',
      },
      {
        key: 'naija-06',
        prompt: 'What are the colours of the Nigerian flag?',
        options: ['Green and white', 'Green and yellow', 'Red and white', 'Green, white and red'],
        correctIndex: 0,
        explanation: 'Green for the land and agriculture, white for peace and unity.',
      },
      {
        key: 'naija-07',
        prompt: 'What is the longest river in Nigeria?',
        options: ['Benue', 'Ogun', 'Cross River', 'Niger'],
        correctIndex: 3,
        explanation: 'The country takes its name from the River Niger.',
      },
      {
        key: 'naija-08',
        prompt: 'What is the official currency of Nigeria?',
        options: ['Cedi', 'Naira', 'Shilling', 'Rand'],
        correctIndex: 1,
        explanation: 'The naira replaced the Nigerian pound in 1973.',
      },
      {
        key: 'naija-09',
        prompt: 'What is the nickname of Nigeria’s men’s national football team?',
        options: ['Black Stars', 'Super Falcons', 'Super Eagles', 'Indomitable Lions'],
        correctIndex: 2,
        explanation: 'The Super Falcons are the women’s team; the men are the Super Eagles.',
      },
      {
        key: 'naija-10',
        prompt: 'Who wrote the novel "Things Fall Apart"?',
        options: ['Wole Soyinka', 'Chinua Achebe', 'Chimamanda Ngozi Adichie', 'Buchi Emecheta'],
        correctIndex: 1,
        explanation: 'Chinua Achebe published it in 1958.',
      },
    ],
  },
  {
    slug: 'digital-skills-101',
    title: 'Digital Skills 101',
    description: 'The internet, staying safe online and how computers work.',
    category: 'Technology',
    difficulty: 'medium',
    accent: 'violet',
    timeLimitSec: 300,
    questions: [
      {
        key: 'digital-01',
        prompt: 'What does URL stand for?',
        options: ['Universal Routing Link', 'Uniform Resource Locator', 'User Resource Login', 'Unified Remote Language'],
        correctIndex: 1,
        explanation: 'A URL is the address of a resource on the web.',
      },
      {
        key: 'digital-02',
        prompt: 'What does the "S" in HTTPS stand for?',
        options: ['Simple', 'Server', 'Secure', 'Speed'],
        correctIndex: 2,
        explanation: 'HTTPS encrypts the connection between your browser and the site.',
      },
      {
        key: 'digital-03',
        prompt: 'Which of these is the strongest password?',
        options: ['password123', '08012345678', 'T!ger_Moon_42_rain', 'myname2008'],
        correctIndex: 2,
        explanation: 'Long passwords mixing words, numbers and symbols are hardest to guess.',
      },
      {
        key: 'digital-04',
        prompt: 'What is phishing?',
        options: [
          'Fake messages that trick you into giving away personal details',
          'A way to speed up your internet connection',
          'Backing up files to the cloud',
          'A type of computer virus scanner',
        ],
        correctIndex: 0,
        explanation: 'Phishing messages pretend to be trusted senders to steal information.',
      },
      {
        key: 'digital-05',
        prompt: 'Which of these is a programming language?',
        options: ['Chrome', 'Python', 'Windows', 'Gmail'],
        correctIndex: 1,
        explanation: 'Python is a popular language for web, data and AI work.',
      },
      {
        key: 'digital-06',
        prompt: 'What does CPU stand for?',
        options: ['Central Processing Unit', 'Computer Power Unit', 'Core Program Utility', 'Central Print Unit'],
        correctIndex: 0,
        explanation: 'The CPU carries out a computer’s instructions.',
      },
      {
        key: 'digital-07',
        prompt: 'Which of these storage units is the largest?',
        options: ['Kilobyte', 'Megabyte', 'Gigabyte', 'Terabyte'],
        correctIndex: 3,
        explanation: 'A terabyte is roughly a thousand gigabytes.',
      },
      {
        key: 'digital-08',
        prompt: 'What does two-factor authentication add to your account?',
        options: [
          'A second password you must remember',
          'A second check, such as a code sent to your phone',
          'A backup copy of your data',
          'Faster login on new devices',
        ],
        correctIndex: 1,
        explanation: 'Even if someone steals your password, they still need the second check.',
      },
      {
        key: 'digital-09',
        prompt: 'What is HTML mainly used for?',
        options: [
          'Structuring the content of web pages',
          'Storing data in databases',
          'Editing photos',
          'Running a computer’s operating system',
        ],
        correctIndex: 0,
        explanation: 'HTML gives a page its structure; CSS styles it and JavaScript makes it interactive.',
      },
      {
        key: 'digital-10',
        prompt: 'A shocking news post is going viral. What should you do first?',
        options: [
          'Share it quickly so others know',
          'Check it against trusted news sources',
          'Comment on it to boost it',
          'Screenshot it for later',
        ],
        correctIndex: 1,
        explanation: 'Verifying first stops misinformation from spreading.',
      },
    ],
  },
  {
    slug: 'money-smart',
    title: 'Money Smart',
    description: 'Budgeting, saving and spotting scams before they get you.',
    category: 'Financial Literacy',
    difficulty: 'easy',
    accent: 'gold',
    timeLimitSec: 300,
    questions: [
      {
        key: 'money-01',
        prompt: 'What is a budget?',
        options: [
          'A plan for how you will spend and save your money',
          'A type of bank account',
          'Money you borrow from a friend',
          'A receipt from a shop',
        ],
        correctIndex: 0,
        explanation: 'A budget helps you decide where your money goes before you spend it.',
      },
      {
        key: 'money-02',
        prompt: 'Which of these is a need rather than a want?',
        options: ['New sneakers', 'Food', 'A game subscription', 'Concert tickets'],
        correctIndex: 1,
        explanation: 'Needs are things you cannot live without; wants are nice to have.',
      },
      {
        key: 'money-03',
        prompt: 'If you save ₦500 every week for 10 weeks, how much will you have?',
        options: ['₦1,000', '₦2,500', '₦5,000', '₦50,000'],
        correctIndex: 2,
        explanation: '₦500 × 10 weeks = ₦5,000.',
      },
      {
        key: 'money-04',
        prompt: 'Someone promises to double your money in one week. What is it most likely to be?',
        options: ['A great investment', 'A government grant', 'A scam', 'A savings account'],
        correctIndex: 2,
        explanation: 'Guaranteed, fast, huge returns are the classic sign of a Ponzi scheme.',
      },
      {
        key: 'money-05',
        prompt: 'Who should you share your bank OTP with?',
        options: ['Your bank’s customer care', 'A close friend', 'No one', 'Anyone who calls from the bank'],
        correctIndex: 2,
        explanation: 'Banks never ask for your OTP. Anyone asking for it is trying to take your money.',
      },
      {
        key: 'money-06',
        prompt: 'What does inflation mean?',
        options: [
          'Prices generally rising over time',
          'Your salary going up',
          'Banks giving out more loans',
          'The naira getting stronger',
        ],
        correctIndex: 0,
        explanation: 'With inflation, the same amount of money buys less over time.',
      },
      {
        key: 'money-07',
        prompt: 'What is an emergency fund for?',
        options: ['Holidays', 'Unexpected expenses like repairs or medical bills', 'Buying gifts', 'Lending to friends'],
        correctIndex: 1,
        explanation: 'It stops a surprise cost from pushing you into debt.',
      },
      {
        key: 'money-08',
        prompt: 'A ₦2,000 item is 25% off. How much do you pay?',
        options: ['₦500', '₦1,500', '₦1,750', '₦1,975'],
        correctIndex: 1,
        explanation: '25% of ₦2,000 is ₦500, so you pay ₦1,500.',
      },
      {
        key: 'money-09',
        prompt: 'What does it mean when a bank pays interest on your savings?',
        options: [
          'You pay the bank a fee to keep your money',
          'The bank pays you for keeping your money with them',
          'Your account is locked',
          'Your money is being taxed',
        ],
        correctIndex: 1,
        explanation: 'Interest is a reward for letting the bank hold your money.',
      },
      {
        key: 'money-10',
        prompt: 'Which of these is an asset?',
        options: ['A loan you owe', 'Unpaid phone bills', 'Money in a savings account', 'A credit card balance'],
        correctIndex: 2,
        explanation: 'Assets are things you own that have value; the others are debts.',
      },
    ],
  },
];
