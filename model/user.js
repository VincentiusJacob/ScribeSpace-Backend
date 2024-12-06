import { v4 as uuidv4 } from "uuid";
import supabase from "../supabaseClient.js";

// Create User
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
    .single(); // `.single()` to return a single row of data

  if (error) {
    throw error;
  }

  return data;
};

// Find User by Email
const findUserByEmail = async (email) => {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single(); // `.single()` returns a single result or null

  if (error) {
    throw error;
  }

  return data;
};

// Find User by ID
const findUserById = async (userId) => {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("user_id", userId)
    .single(); // `.single()` returns a single result or null

  if (error) {
    throw error;
  }

  return data;
};

// Update User Profile
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

export { createUser, findUserByEmail, findUserById, updateUserProfile };
