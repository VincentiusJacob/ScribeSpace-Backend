import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/userRoutes.js";
import articleRoutes from "./routes/articleRoutes.js";

dotenv.config();

const app = express();

// Middleware
app.use(
  cors({
    origin: "https://scribe-space-frotend.vercel.app",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.options("*", cors()); // Menangani preflight request

app.use(express.json()); // For parsing application/json

// Routes
app.use("/api/users", userRoutes);
app.use("/api/articles", articleRoutes);

// Start Server
const port = process.env.PORT || 6543;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
