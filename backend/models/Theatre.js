import mongoose from "mongoose";

// A seat category occupies one or more rows of a screen, e.g. { name: "Recliner", price: 450, rows: ["J","K"] }.
export const seatCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: [0, "Price cannot be negative"] },
    rows: {
      type: [String],
      validate: { validator: (v) => Array.isArray(v) && v.length > 0 && v.every((r) => /^[A-Z]$/.test(r)), message: "Rows must be single capital letters (A-Z)" },
    },
  },
  { _id: false }
);

export const layoutSchema = new mongoose.Schema(
  {
    categories: {
      type: [seatCategorySchema],
      validate: { validator: (v) => Array.isArray(v) && v.length > 0, message: "A screen needs at least one seat category" },
    },
    seatsPerRow: { type: Number, required: true, min: 1, max: 40 },
    aisleAfter: { type: [Number], default: [] }, // a gap is drawn after these seat numbers
  },
  { _id: false }
);

const screenSchema = new mongoose.Schema({
  name: { type: String, required: [true, "Screen name is required"], trim: true },
  formats: { type: [String], default: ["2D"] },
  layout: { type: layoutSchema, required: true },
});

const theatreSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Theatre name is required"], trim: true, maxlength: 120 },
    city: { type: String, required: [true, "City is required"], trim: true, index: true },
    address: { type: String, required: [true, "Address is required"], trim: true },
    amenities: { type: [String], default: [] },
    screens: {
      type: [screenSchema],
      validate: { validator: (v) => Array.isArray(v) && v.length > 0, message: "Add at least one screen" },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

theatreSchema.index({ name: 1, city: 1 }, { unique: true });

// Validate that a row letter is not used by two categories in the same screen.
theatreSchema.path("screens").validate(function uniqueRows(screens) {
  return screens.every((s) => {
    const rows = s.layout.categories.flatMap((c) => c.rows);
    return new Set(rows).size === rows.length;
  });
}, "A row can only belong to one seat category per screen");

export default mongoose.models.Theatre || mongoose.model("Theatre", theatreSchema);
