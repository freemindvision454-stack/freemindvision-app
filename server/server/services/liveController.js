import { generateUserSig } from "../services/generateUserSig.js";
import { uploadLiveThumbnail } from "../services/cloudinaryService.js";
import { supabase } from "../db.js";

export const createLive = async (req, res) => {
  const { userId, title } = req.body;

  try {
    const roomId = Math.floor(Math.random() * 999999).toString();

    const { data, error } = await supabase
      .from("lives")
      .insert([{ userId, roomId, title, status: "live" }])
      .select()
      .single();

    if (error) return res.status(400).json(error);

    const sig = generateUserSig(userId);

    res.json({
      roomId,
      userSig: sig,
      live: data,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getLiveUserSig = (req, res) => {
  const { userId } = req.params;
  return res.json(generateUserSig(userId));
};
