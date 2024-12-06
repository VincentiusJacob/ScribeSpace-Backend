import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/userRoutes.js";
import articleRoutes from "./routes/articleRoutes.js";

dotenv.config();

const app = express();

// Middleware untuk menangani CORS
app.use(
  cors({
    origin: "https://scribe-space-frontend.vercel.app",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Tangani preflight request (OPTIONS)
app.options("*", (req, res) => {
  console.log("Preflight OPTIONS request received");
  res.sendStatus(200); // Respond with 200 OK for preflight requests
});
// Pastikan CORS menangani preflight request

app.use(express.json()); // Untuk parsing application/json

// Routes
app.use("/api/users", userRoutes);
app.use("/api/articles", articleRoutes);

// Start Server
const port = process.env.PORT || 6543;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
