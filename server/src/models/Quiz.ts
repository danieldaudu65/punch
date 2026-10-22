import { Schema, model, type InferSchemaType } from 'mongoose';

const questionSchema = new Schema(
  {
    // Stable id such as "naija-03". Answers refer to this, so re-seeding
    // quizzes never breaks old attempts.
    key: { type: String, required: true },
    prompt: { type: String, required: true },
    options: {
      type: [String],
      required: true,
      validate: {
        validator: (options: string[]) => options.length >= 2 && options.length <= 6,
        message: 'A question needs between 2 and 6 options',
      },
    },
    // Never sent to the client while a quiz is in progress.
    correctIndex: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator(this: { options: string[] }, value: number) {
          return value < this.options.length;
        },
        message: 'correctIndex must point at one of the options',
      },
    },
    explanation: { type: String, default: '' },
  },
  { _id: false },
);

const quizSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' },
    // Used by the client to colour the quiz card.
    accent: { type: String, enum: ['red', 'gold', 'violet'], default: 'red' },
    timeLimitSec: { type: Number, required: true, min: 30 },
    questions: {
      type: [questionSchema],
      validate: {
        validator: (questions: { key: string }[]) =>
          questions.length >= 1 && new Set(questions.map((q) => q.key)).size === questions.length,
        message: 'A quiz needs at least one question and question keys must be unique',
      },
    },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type Quiz = InferSchemaType<typeof quizSchema>;
export const QuizModel = model('Quiz', quizSchema);
