import express from "express";
import {
  publishArticle,
  getArticles,
  uploadMedia,
  getArticleById,
  getRecommendedArticles,
  updateImageUrl,
  incrementViewsController,
  getArticlesByUserId,
} from "../controllers/articlesController.js";
import multer from "multer";

const storage = multer.memoryStorage();

const router = express.Router();
const uploadFile = multer({ storage });

router.post("/publish", publishArticle);
router.get("/getArticles", getArticles);
router.get("/getArticle/:id", getArticleById);
router.post("/uploadMedia", uploadFile.single("file"), uploadMedia);
router.post("/getRecommendations", getRecommendedArticles);
router.put("/updateImageUrl/:articleId", updateImageUrl);
router.put("/incrementViews/:articleId", incrementViewsController);
router.get("/user/:userId", getArticlesByUserId);

export default router;
