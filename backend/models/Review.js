import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    movie: { type: mongoose.Schema.Types.ObjectId, ref: "Movie", required: true, index: true },
    rating: { type: Number, required: [true, "Rating is required"], min: [1, "Rating must be 1-10"], max: [10, "Rating must be 1-10"] },
    comment: { type: String, trim: true, maxlength: [600, "Review must be under 600 characters"], default: "" },
  },
  { timestamps: true }
);

reviewSchema.index({ user: 1, movie: 1 }, { unique: true }); // one review per user per movie

// Keeps Movie.userRating in sync after every change.
reviewSchema.statics.recalculate = async function recalculate(movieId) {
  const [agg] = await this.aggregate([
    { $match: { movie: new mongoose.Types.ObjectId(String(movieId)) } },
    { $group: { _id: "$movie", average: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  await mongoose.model("Movie").updateOne(
    { _id: movieId },
    { userRating: { average: agg ? Math.round(agg.average * 10) / 10 : 0, count: agg ? agg.count : 0 } }
  );
};

export default mongoose.models.Review || mongoose.model("Review", reviewSchema);
