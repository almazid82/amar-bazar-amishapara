// Public browser configuration only. Never put service-role or Meta API secrets here.
// Set these two values for a local/staging Supabase project before enabling live ordering.
export const webConfig = {
  supabaseUrl: "",
  supabasePublishableKey: "",
  // Confirm the WhatsApp Business number with the owner; digits only, e.g. 8801XXXXXXXXX.
  whatsappBusinessNumber: "8801884989479",
  // Existing owner-supplied WhatsApp short link, used for support/fallback only.
  whatsappSupportLink: "https://wa.me/message/HZWKCZLY65VXN1",
  supportPhone: "01884989479",
};
