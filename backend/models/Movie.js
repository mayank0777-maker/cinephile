import mongoose from "mongoose";
import { slugify } from "../utils/helpers.js";

const personSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, trim: true, default: "" }, // character name (cast) or job (crew)
    image: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

export const MOVIE_STATUSES = ["now_showing", "upcoming", "ended"];
export const CERTIFICATES = ["U", "UA", "A", "S"];

const movieSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, "Title is required"], trim: true, maxlength: 150 },
    slug: { type: String, unique: true, index: true },
    tagline: { type: String, trim: true, default: "", maxlength: 200 },
    description: { type: String, required: [true, "Description is required"], trim: true, maxlength: 3000 },
    genres: {
      type: [String],
      validate: { validator: (v) => Array.isArray(v) && v.length > 0, message: "Add at least one genre" },
    },
    languages: {
      type: [String],
      validate: { validator: (v) => Array.isArray(v) && v.length > 0, message: "Add at least one language" },
    },
    formats: { type: [String], default: ["2D"] },
    duration: { type: Number, required: [true, "Duration is required"], min: [1, "Duration must be positive"], max: 600 }, // minutes
    releaseDate: { type: Date, required: [true, "Release date is required"] },
    certificate: { type: String, enum: CERTIFICATES, default: "UA" },
    rating: { type: Number, min: 0, max: 10, default: 0 }, // critic rating out of 10
    userRating: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    poster: { type: String, required: [true, "Poster is required"], trim: true },
    backdrop: { type: String, trim: true, default: "" },
    trailerUrl: { type: String, trim: true, default: "" },
    cast: [personSchema],
    crew: [personSchema],
    status: { type: String, enum: MOVIE_STATUSES, default: "now_showing", index: true },
    isTrending: { type: Boolean, default: false },
    isPopular: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

movieSchema.index({ title: "text", description: "text", "cast.name": "text" });
movieSchema.index({ status: 1, releaseDate: -1 });
movieSchema.index({ genres: 1 });
movieSchema.index({ languages: 1 });

// Extracts the 11 char YouTube id from any common YouTube URL form.
movieSchema.virtual("trailerYoutubeId").get(function trailerId() {
  const m = String(this.trailerUrl || "").match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
  return m ? m[1] : null;
});

movieSchema.pre("validate", async function makeSlug(next) {
  if (!this.isModified("title") && this.slug) return next();
  const base = slugify(this.title || "movie") || "movie";
  let slug = base;
  let i = 2;
  // eslint-disable-next-line no-await-in-loop
  while (await mongoose.models.Movie.exists({ slug, _id: { $ne: this._id } })) slug = `${base}-${i++}`;
  this.slug = slug;
  next();
});

export default mongoose.models.Movie || mongoose.model("Movie", movieSchema);
