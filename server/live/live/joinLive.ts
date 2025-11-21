
import { genUserSig } from "../config/tencentTRTC";

export function joinLive(userId: string, roomId: string) {
  const sig = genUserSig(userId);

  return {
    roomId,
    userSig: sig.userSig,
    sdkAppId: sig.sdkAppId
  };
}
