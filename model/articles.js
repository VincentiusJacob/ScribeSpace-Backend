import { v4 as uuidv4 } from "uuid";
import supabase from "../supabaseClient.js"; // Import the Supabase client

export const createArticle = async (title, content, userId, tags) => {
  const articleId = uuidv4();
  const createdAt = new Date().toISOString();

  // Tambahkan artikel ke dalam tabel `articles`
  const { data: articleData, error: articleError } = await supabase
    .from("articles")
    .insert([
      {
        article_id: articleId,
        title,
        content, // Konten berupa JSON string
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

  // Tambahkan tag ke tabel `tags` dan relasi ke `article_tags`
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

// Helper function to get or create tag ID by name
const getOrCreateTagId = async (tagName) => {
  // Periksa apakah tag sudah ada
  const { data: existingTag, error: selectError } = await supabase
    .from("tags")
    .select("tag_id")
    .eq("name", tagName)
    .single();

  if (selectError && selectError.code !== "PGRST116") {
    // Jika error bukan karena tag tidak ditemukan
    throw new Error("Error checking tag: " + selectError.message);
  }

  if (existingTag) {
    // Jika tag sudah ada, kembalikan `tag_id`
    return existingTag.tag_id;
  }

  // Jika tag tidak ada, tambahkan tag baru
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

export const fetchArticle = async () => {
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

export const fetchArticleById = async (articleId) => {
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
    .single(); // Ambil satu artikel berdasarkan article_id

  if (error) {
    throw new Error("Error fetching article: " + error.message);
  }

  return article;
};

export const fetchArticlesByTags = async (tags, excludeArticleId) => {
  if (!excludeArticleId) {
    throw new Error("excludeArticleId is required");
  }

  // Query ke database Supabase
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
    .in("article_tags.tags.name", tags) // Filter berdasarkan tags
    .neq("article_id", excludeArticleId) // Jangan ambil artikel yang sedang dilihat
    .limit(6); // Batasi jumlah artikel yang diambil

  // Tangani error dari Supabase
  if (error) {
    throw new Error("Error fetching articles by tags: " + error.message);
  }

  // Pastikan data artikel yang dikembalikan valid
  if (!articles || articles.length === 0) {
    console.log("No articles found matching the tags");
    return []; // Kembalikan array kosong jika tidak ada artikel yang ditemukan
  }

  // Filter tags yang valid
  articles.forEach((article) => {
    article.article_tags = article.article_tags.filter(
      (tagWrapper) => tagWrapper.tags && tagWrapper.tags.name
    );
  });

  return articles; // Kembalikan artikel yang ditemukan
};

export const updateArticleImageUrl = async (articleId, imageUrl) => {
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

export const incrementViews = async (articleId) => {
  // Retrieve the current article's views from the database
  const { data: article, error: fetchError } = await supabase
    .from("articles")
    .select("views")
    .eq("article_id", articleId)
    .single(); // We expect to fetch one article

  if (fetchError) {
    throw new Error("Error fetching article views: " + fetchError.message);
  }

  // Increment the views count
  const newViewsCount = (article?.views || 0) + 1;

  // Update the article's views in the database
  const { data, error: updateError } = await supabase
    .from("articles")
    .update({ views: newViewsCount })
    .eq("article_id", articleId)
    .select()
    .single();

  if (updateError) {
    throw new Error("Error updating article views: " + updateError.message);
  }

  // Return the updated article data with the new view count
  return data;
};

export const fetchArticlesByUserId = async (userId) => {
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
    .eq("user_id", userId); // Menambahkan filter berdasarkan user_id

  if (error) {
    throw new Error("Error fetching articles by user ID: " + error.message);
  }

  return articles;
};
