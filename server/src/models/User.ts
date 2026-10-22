import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

const earnedBadgeSchema = new Schema(
  {
    key: { type: String, required: true },
    earnedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Never returned by default queries; login asks for it explicitly.
    passwordHash: { type: String, required: true, select: false },
    xp: { type: Number, default: 0, min: 0 },
    quizzesCompleted: { type: Number, default: 0, min: 0 },
    badges: { type: [earnedBadgeSchema], default: [] },
  },
  { timestamps: true },
);

// Leaderboard: highest XP first, earliest signup wins a tie.
userSchema.index({ xp: -1, createdAt: 1 });

userSchema.set('toJSON', {
  transform(_doc, ret: Record<string, unknown>) {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    return ret;
  },
});

export type User = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<User>;
export const UserModel = model('User', userSchema);
