import crypto from "crypto";

const sdkAppId = process.env.TRTC_SDK_APP_ID;
const secretKey = process.env.TRTC_SECRET_KEY;

/**
 * Génère un UserSig pour TRTC
 */
export function generateUserSig(userId) {
  const currTime = Math.floor(Date.now() / 1000);
  const expire = 86400; // 24h
  const sign = crypto
    .createHmac("sha256", secretKey)
    .update(`${sdkAppId}${userId}${currTime}${expire}`)
    .digest("hex");

  return {
    sdkAppId,
    userId,
    expire,
    currTime,
    sig: sign,
  };
}
