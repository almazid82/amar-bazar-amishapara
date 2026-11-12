import { requireSupabase } from "./supabase";

function assertE164(phone: string) {
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error("PHONE_MUST_BE_E164");
}

/** Sends the customer a phone OTP. Order approval remains a separate action. */
export async function requestPhoneOtp(phone: string) {
  assertE164(phone);
  const { error } = await requireSupabase().auth.signInWithOtp({ phone });
  if (error) throw error;
}

/** Verifies a Supabase Auth SMS code and establishes the customer session. */
export async function verifyPhoneOtp(phone: string, token: string) {
  assertE164(phone);
  if (!/^\d{4,8}$/.test(token)) throw new Error("INVALID_OTP_FORMAT");
  const { data, error } = await requireSupabase().auth.verifyOtp({ phone, token, type: "sms" });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await requireSupabase().auth.signOut();
  if (error) throw error;
}
