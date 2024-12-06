import express from "express";
import {
  signUp,
  loginUser,
  getUsernameById,
  updateProfile,
} from "../controllers/userController.js";
import multer from "multer";

const storage = multer.memoryStorage();

const router = express.Router();
const uploadFile = multer({ storage });

router.post("/createUser", signUp);
router.post("/login", loginUser);
router.get("/getUserById/:userId", getUsernameById);
router.put(
  "/profile/:userId",
  uploadFile.single("profile_picture"),
  updateProfile
);

export default router;
