// articlesController.js
import {
  createArticle,
  fetchArticle,
  fetchArticleById,
  fetchArticlesByTags,
  updateArticleImageUrl,
  incrementViews,
  fetchArticlesByUserId,
} from "../model/articles.js";
import supabase from "../supabaseClient.js";
import { v4 as uuidv4 } from "uuid";

export const publishArticle = async (req, res) => {
  const { title, content, userId, tags } = req.body;

  try {
    const article = await createArticle(
      title,
      JSON.stringify(content), // Simpan sebagai JSON string
      userId,
      tags
    );
    res.status(200).json(article);
  } catch (error) {
    res.status(500).json({ message: "Error publishing article", error });
  }
};

export const getArticles = async (req, res) => {
  try {
    const articles = await fetchArticle();
    res.status(200).json(articles);
  } catch (error) {
    console.error("Error getting articles:", error.message);
    res.status(500).json({ message: "Error getting articles", error });
  }
};

export const uploadMedia = async (req, res) => {
  try {
    const file = req.file;
    const { articleId, userId } = req.body;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = `${articleId}/${uuidv4()}_${file.originalname}`;

    // Upload ke Supabase storage menggunakan service_role key
    const { data, error } = await supabase.storage
      .from("media")
      .upload(filePath, file.buffer, {
        upsert: true, // Optional: Ganti file jika sudah ada
        contentType: file.mimetype,
      });

    if (error) {
      throw new Error("Error uploading file: " + error.message);
    }

    // Dapatkan URL publik
    const { data: publicUrlData, error: urlError } = supabase.storage
      .from("media")
      .getPublicUrl(filePath);

    if (urlError) {
      throw new Error("Error getting public URL: " + urlError.message);
    }

    return res.status(200).json({ url: publicUrlData.publicUrl });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Failed to upload media" });
  }
};

export const getArticleById = async (req, res) => {
  const { id } = req.params;

  try {
    const article = await fetchArticleById(id);
    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }
    res.status(200).json(article);
  } catch (error) {
    console.error("Error getting article:", error.message);
    res.status(500).json({ message: "Error getting article", error });
  }
};

export const getRecommendedArticles = async (req, res) => {
  const { tags, excludeArticleID } = req.body;

  console.log("Tags:", tags);
  console.log("Exclude Article ID:", excludeArticleID);

  try {
    if (!tags || !excludeArticleID || tags.length === 0) {
      return res
        .status(400)
        .json({ message: "Tags and excludeArticleID are required" });
    }

    const recommendedArticles = await fetchArticlesByTags(
      tags,
      excludeArticleID
    );

    if (recommendedArticles.length === 0) {
      return res.status(404).json({ message: "No recommendations found" });
    }

    res.status(200).json(recommendedArticles);
  } catch (error) {
    console.error("Error getting recommended articles:", error.message);
    res
      .status(500)
      .json({ message: "Error getting recommended articles", error });
  }
};

export const updateImageUrl = async (req, res) => {
  const { articleId } = req.params;
  const { image_url } = req.body;

  try {
    // Update image_url di artikel berdasarkan articleId
    const updatedArticle = await updateArticleImageUrl(articleId, image_url);

    if (!updatedArticle) {
      return res.status(404).json({ message: "Article not found" });
    }

    res.status(200).json(updatedArticle);
  } catch (error) {
    console.error("Error updating image URL:", error.message);
    res.status(500).json({ message: "Error updating image URL", error });
  }
};

export const incrementViewsController = async (req, res) => {
  const { articleId } = req.params; // Get article ID from the request parameters

  try {
    const updatedArticle = await incrementViews(articleId); // Call the incrementViews function

    res.status(200).json({
      message: "Views updated successfully",
      views: updatedArticle.views, // Return the updated views count
    });
  } catch (error) {
    console.error("Error updating views:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getArticlesByUserId = async (req, res) => {
  const { userId } = req.params; // Ambil userId dari parameter

  try {
    const articles = await fetchArticlesByUserId(userId); // Ambil artikel berdasarkan userId

    if (!articles || articles.length === 0) {
      return res
        .status(404)
        .json({ message: "No articles found for this user" });
    }

    return res.status(200).json(articles); // Kembalikan data artikel
  } catch (error) {
    console.error("Error fetching articles by user ID:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
