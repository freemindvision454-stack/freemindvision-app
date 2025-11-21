
import { supabaseAdmin } from "../config/supabase";
import { genUserSig } from "../config/tencentTRTC";

export async function startLive(userId: string, title: string) {
  const sig = genUserSig(userId);

  const { data, error } = await supabaseAdmin
    .from("live_rooms")
    .insert({
      host_id: userId,
      title: title,
      room_id: `room_${Date.now()}`,
      user_sig: sig.userSig
    })
    .select();

  if (error) throw error;

  return {
    roomId: data![0].room_id,
    userSig: sig.userSig,
    sdkAppId: sig.sdkAppId
  };
}
