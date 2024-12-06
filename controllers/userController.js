import supabase from "../supabaseClient.js";
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUserProfile,
} from "../model/user.js";
import bcrypt from "bcrypt";

const signUp = async (req, res) => {
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
};

const loginUser = async (req, res) => {
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
};

const getUsernameById = async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await findUserById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Kirimkan username dari user yang ditemukan
    res.json({ user });
  } catch (error) {
    console.error("Error fetching username:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateProfile = async (req, res) => {
  const userId = req.params.userId; // Accessing userId from URL params
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

      // If file upload is successful, get the public URL
      const { data: urlData, error: urlError } = supabase.storage
        .from("media")
        .getPublicUrl(filePath);

      if (urlError) {
        console.error("Error getting public URL:", urlError);
        return res.status(500).json({ message: "Error getting public URL" });
      }

      // Access the publicURL correctly
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
};

export { signUp, loginUser, getUsernameById, updateProfile };
