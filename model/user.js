import { v4 as uuidv4 } from "uuid";
import supabase from "../supabaseClient.js";

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

export { createUser, findUserByEmail, findUserById, updateUserProfile };
