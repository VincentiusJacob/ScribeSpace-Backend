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
    origin: "https://scribe-space-frontend.vercel.app", // Pastikan domain frontend benar
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Menyertakan OPTIONS dalam methods
    allowedHeaders: ["Content-Type", "Authorization"], // Menyertakan headers yang diperlukan
    credentials: true, // Jika menggunakan cookies atau token dalam header
  })
);

// Tangani preflight request (OPTIONS)
app.options("*", cors()); // Pastikan CORS menangani preflight request

app.use(express.json()); // Untuk parsing application/json

// Routes
app.use("/api/users", userRoutes);
app.use("/api/articles", articleRoutes);

// Start Server
const port = process.env.PORT || 6543;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
