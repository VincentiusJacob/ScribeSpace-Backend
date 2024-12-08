import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import supabase from "./supabaseClient.js";
import multer from "multer";
import bcrypt from "bcrypt";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "https://scribe-space-frotend.vercel.app",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

const storage = multer.memoryStorage();

const uploadFile = multer({ storage });

// users routes

const createUser = async (username, email, hashedPassword) => {
  const userId = uuidv4();
  const createdAt = new Date();
  const updatedAt = new Date();

  const { data, error } = await supabase
    .from("users")
    .insert([
      {
        user_id: userId,
        username: username,
        email: email,
        password: hashedPassword,
        created_at: createdAt,
        updated_at: updatedAt,
      },
    ])
    .single();

  if (error) {
    throw error;
  }

  return data;
};

const findUserByEmail = async (email) => {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (error) {
    throw error;
  }

  return data;
};

const findUserById = async (userId) => {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    throw error;
  }

  return data;
};

const updateUserProfile = async (userId, updateData) => {
  const { data, error } = await supabase
    .from("users")
    .update({
      username: updateData.username,
      profile_picture: updateData.profile_picture.publicUrl || null,
      updated_at: new Date(),
    })
    .eq("user_id", userId)
    .single();

  if (error) {
    throw error;
  }

  return data;
};

app.post("/api/users/createUser", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const { user, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const dbUser = await createUser(username, email, hashedPassword);
    return res.status(201).json({
      message: "User created successfully",
      user: dbUser,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error creating user" });
  }
});

app.post("/api/users/login", async (req, res) => {
  const { email, password } = req.body;
  console.log("user email: ", email);
  console.log("user pass: ", password);

  try {
    const { data: user, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const dbUser = await findUserByEmail(email);

    if (!dbUser) {
      return res.status(404).json({ message: "User not found in database" });
    }

    const { password: _, ...userData } = dbUser;
    return res.status(200).json(userData);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/users/getUserById/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await findUserById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    console.error("Error fetching username:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.put(
  "/api/users/profile/:userId",
  uploadFile.single("profile_picture"),
  async (req, res) => {
    const userId = req.params.userId;
    console.log("userID: ", userId);

    try {
      const { username } = req.body;
      const updateData = { username };

      console.log("file: ", req.file);

      if (req.file) {
        const fileExtension = req.file.mimetype.split("/")[1];
        const fileName = `${Date.now()}.${fileExtension}`;
        const filePath = `public/${fileName}`;

        const { data, error: uploadError } = await supabase.storage
          .from("media")
          .upload(filePath, req.file.buffer, {
            cacheControl: "3600",
            upsert: true,
          });

        console.log("data: ", data);

        if (uploadError) {
          console.error("Error uploading file to Supabase:", uploadError);
          return res
            .status(500)
            .json({ message: "Error uploading file to Supabase" });
        }

        const { data: urlData, error: urlError } = supabase.storage
          .from("media")
          .getPublicUrl(filePath);

        if (urlError) {
          console.error("Error getting public URL:", urlError);
          return res.status(500).json({ message: "Error getting public URL" });
        }

        console.log("publicURL: ", urlData);

        updateData.profile_picture = urlData;
      }

      console.log("updatedData: ", updateData);

      const updatedUser = await updateUserProfile(userId, updateData);

      return res.status(200).json({
        message: "Profile updated successfully",
        user: updatedUser,
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Article Routes

const createArticle = async (title, content, userId, tags) => {
  const articleId = uuidv4();
  const createdAt = new Date().toISOString();

  const { data: articleData, error: articleError } = await supabase
    .from("articles")
    .insert([
      {
        article_id: articleId,
        title,
        content,
        user_id: userId,
        created_at: createdAt,
        updated_at: createdAt,
        views: 0,
      },
    ])
    .select();

  if (articleError) {
    throw new Error("Error creating article: " + articleError.message);
  }

  for (const tag of tags) {
    const tagId = await getOrCreateTagId(tag);
    if (tagId) {
      const { error: articleTagError } = await supabase
        .from("article_tags")
        .insert([{ article_id: articleId, tag_id: tagId }]);

      if (articleTagError) {
        throw new Error(
          "Error adding article-tag relation: " + articleTagError.message
        );
      }
    }
  }

  return { articleId, title, content, userId, tags, createdAt };
};

const getOrCreateTagId = async (tagName) => {
  const { data: existingTag, error: selectError } = await supabase
    .from("tags")
    .select("tag_id")
    .eq("name", tagName)
    .single();

  if (selectError && selectError.code !== "PGRST116") {
    throw new Error("Error checking tag: " + selectError.message);
  }

  if (existingTag) {
    return existingTag.tag_id;
  }

  const { data: newTag, error: insertError } = await supabase
    .from("tags")
    .insert([{ name: tagName }])
    .select()
    .single();

  if (insertError) {
    throw new Error("Error creating tag: " + insertError.message);
  }

  return newTag.tag_id;
};

const fetchArticle = async () => {
  const { data: articles, error } = await supabase.from("articles").select(`
      article_id,
      title,
      content,
      user_id,
      created_at,
      updated_at,
      image_url,
      views,
      article_tags (
        tags (
          name
        )
      )
    `);

  if (error) {
    throw new Error("Error fetching articles: " + error.message);
  }

  return articles;
};

const fetchArticleById = async (articleId) => {
  const { data: article, error } = await supabase
    .from("articles")
    .select(
      `
      article_id,
      title,
      content,
      user_id,
      created_at,
      updated_at,
      image_url,
      views,
      article_tags (
        tags (
          name
        )
      )
    `
    )
    .eq("article_id", articleId)
    .single();

  if (error) {
    throw new Error("Error fetching article: " + error.message);
  }

  return article;
};

const fetchArticlesByTags = async (tags, excludeArticleId) => {
  if (!excludeArticleId) {
    throw new Error("excludeArticleId is required");
  }

  const { data: articles, error } = await supabase
    .from("articles")
    .select(
      `
      article_id,
      title,
      content,
      user_id,
      created_at,
      updated_at,
      image_url,
      views,
      article_tags (
        tags (
          name
        )
      )
    `
    )
    .in("article_tags.tags.name", tags)
    .neq("article_id", excludeArticleId)
    .limit(6);

  if (error) {
    throw new Error("Error fetching articles by tags: " + error.message);
  }

  if (!articles || articles.length === 0) {
    console.log("No articles found matching the tags");
    return [];
  }

  articles.forEach((article) => {
    article.article_tags = article.article_tags.filter(
      (tagWrapper) => tagWrapper.tags && tagWrapper.tags.name
    );
  });

  return articles;
};

const updateArticleImageUrl = async (articleId, imageUrl) => {
  const { data, error } = await supabase
    .from("articles")
    .update({ image_url: imageUrl })
    .eq("article_id", articleId)
    .select()
    .single();

  if (error) {
    throw new Error("Error updating article image URL: " + error.message);
  }

  return data;
};

const incrementViews = async (articleId) => {
  const { data: article, error: fetchError } = await supabase
    .from("articles")
    .select("views")
    .eq("article_id", articleId)
    .single();

  if (fetchError) {
    throw new Error("Error fetching article views: " + fetchError.message);
  }

  const newViewsCount = (article?.views || 0) + 1;

  const { data, error: updateError } = await supabase
    .from("articles")
    .update({ views: newViewsCount })
    .eq("article_id", articleId)
    .select()
    .single();

  if (updateError) {
    throw new Error("Error updating article views: " + updateError.message);
  }

  return data;
};

const fetchArticlesByUserId = async (userId) => {
  const { data: articles, error } = await supabase
    .from("articles")
    .select(
      `
      article_id,
      title,
      content,
      user_id,
      created_at,
      updated_at,
      image_url,
      views,
      article_tags (
        tags (
          name
        )
      )
    `
    )
    .eq("user_id", userId);

  if (error) {
    throw new Error("Error fetching articles by user ID: " + error.message);
  }

  return articles;
};

app.post("/api/articles/publish", async (req, res) => {
  const { title, content, userId, tags } = req.body;

  try {
    const article = await createArticle(
      title,
      JSON.stringify(content),
      userId,
      tags
    );
    res.status(200).json(article);
  } catch (error) {
    res.status(500).json({ message: "Error publishing article", error });
  }
});

app.get("/api/articles/getArticles", async (req, res) => {
  try {
    const articles = await fetchArticle();
    res.status(200).json(articles);
  } catch (error) {
    console.error("Error getting articles:", error.message);
    res.status(500).json({ message: "Error getting articles", error });
  }
});

app.get("/api/articles/getArticle/:id", async (req, res) => {
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
});

app.post(
  "/api/articles/uploadMedia",
  uploadFile.single("file"),
  async (req, res) => {
    try {
      const file = req.file;
      const { articleId, userId } = req.body;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const filePath = `${articleId}/${uuidv4()}_${file.originalname}`;

      const { data, error } = await supabase.storage
        .from("media")
        .upload(filePath, file.buffer, {
          upsert: true,
          contentType: file.mimetype,
        });

      if (error) {
        throw new Error("Error uploading file: " + error.message);
      }

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
  }
);

app.post("/api/articles/getRecommendations", async (req, res) => {
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
});

app.put("/api/articles//updateImageUrl/:articleId", async (req, res) => {
  const { articleId } = req.params;
  const { image_url } = req.body;

  try {
    const updatedArticle = await updateArticleImageUrl(articleId, image_url);

    if (!updatedArticle) {
      return res.status(404).json({ message: "Article not found" });
    }

    res.status(200).json(updatedArticle);
  } catch (error) {
    console.error("Error updating image URL:", error.message);
    res.status(500).json({ message: "Error updating image URL", error });
  }
});

app.put("/api/articles/incrementViews/:articleId", async (req, res) => {
  const { articleId } = req.params;

  try {
    const updatedArticle = await incrementViews(articleId);

    res.status(200).json({
      message: "Views updated successfully",
      views: updatedArticle.views,
    });
  } catch (error) {
    console.error("Error updating views:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/articles/user/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const articles = await fetchArticlesByUserId(userId);

    if (!articles || articles.length === 0) {
      return res
        .status(404)
        .json({ message: "No articles found for this user" });
    }

    return res.status(200).json(articles);
  } catch (error) {
    console.error("Error fetching articles by user ID:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

app.get("/", (req, res) => {
  res.send("Welcome");
});

const port = process.env.PORT || 6543;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
