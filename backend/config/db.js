import mongoose from "mongoose";
import { env } from "./env.js";

mongoose.set("strictQuery", true);

export async function connectDB(uri = env.MONGO_URI) {
  mongoose.connection.on("disconnected", () => console.warn("[db] MongoDB disconnected"));
  mongoose.connection.on("reconnected", () => console.log("[db] MongoDB reconnected"));
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    console.log(`[db] Connected to "${mongoose.connection.name}" @ ${mongoose.connection.host}`);
  } catch (err) {
    console.error("[db] Could not connect to MongoDB:", err.message);
    console.error("[db] Is MongoDB running? Check MONGO_URI in backend/.env");
    throw err;
  }
}
