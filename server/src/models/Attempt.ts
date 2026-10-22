import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

export const ATTEMPT_STATUSES = ['in_progress', 'submitted', 'expired'] as const;
export type AttemptStatus = (typeof ATTEMPT_STATUSES)[number];

const answerSchema = new Schema(
  {
    questionKey: { type: String, required: true },
    selectedIndex: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const attemptSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    quiz: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
    status: { type: String, enum: ATTEMPT_STATUSES, default: 'in_progress' },
    startedAt: { type: Date, required: true, default: Date.now },
    submittedAt: { type: Date },

    // Filled in by the server on submit. The client never sends a score.
    answers: { type: [answerSchema], default: [] },
    correctCount: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    durationSec: { type: Number, default: 0 },
    xpAwarded: { type: Number, default: 0 },

    // True only on the one attempt that earned this quiz's rewards.
    rewarded: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// The database itself guarantees a student is rewarded at most once per quiz,
// even if two submissions arrive at the same moment.
attemptSchema.index(
  { user: 1, quiz: 1, rewarded: 1 },
  { unique: true, partialFilterExpression: { rewarded: true }, name: 'one_reward_per_quiz' },
);

// At most one open attempt per student per quiz, so "start" cannot be spammed.
attemptSchema.index(
  { user: 1, quiz: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'in_progress' }, name: 'one_open_attempt_per_quiz' },
);

// Attempt history, newest first.
attemptSchema.index({ user: 1, submittedAt: -1 });

export type Attempt = InferSchemaType<typeof attemptSchema>;
export type AttemptDocument = HydratedDocument<Attempt>;
export const AttemptModel = model('Attempt', attemptSchema);
