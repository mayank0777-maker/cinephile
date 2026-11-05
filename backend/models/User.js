import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import validator from "validator";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Name is required"], trim: true, minlength: [2, "Name must be at least 2 characters"], maxlength: 60 },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: { validator: (v) => validator.isEmail(v), message: "Please enter a valid email address" },
    },
    phone: {
      type: String,
      trim: true,
      default: "",
      validate: { validator: (v) => !v || /^[+\d][\d\s-]{6,16}$/.test(v), message: "Please enter a valid phone number" },
    },
    password: { type: String, required: [true, "Password is required"], minlength: [6, "Password must be at least 6 characters"], select: false },
    role: { type: String, enum: ["user", "admin"], default: "user", index: true },
    city: { type: String, trim: true, default: "" },
    avatar: { type: String, default: "" },
    watchlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Movie" }],
    isBlocked: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

// Hash the password whenever it is set or changed (bcrypt, cost factor 10).
userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.models.User || mongoose.model("User", userSchema);
