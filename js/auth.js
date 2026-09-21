// EventMediaHub uses Supabase Anonymous Sign-In.
// There is NO visible login, Google login, or account creation flow.
window.EMH = window.EMH || {};

EMH.auth = {
  async user() {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    return user;
  },

  async ensureAnonymousUser() {
    let user = await this.user();
    if (user) return user;

    const { data, error } = await window.supabaseClient.auth.signInAnonymously({
      options: {
        data: { full_name: "Event Guest" }
      }
    });
    if (error) throw error;
    return data.user;
  },

  async requireUser() {
    return this.ensureAnonymousUser();
  },

  async profile() {
    const user = await this.ensureAnonymousUser();
    const { data, error } = await window.supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (error) throw error;
    return data;
  }
};

window.supabaseClient.auth.onAuthStateChange((_event, session) => {
  window.dispatchEvent(new CustomEvent("emh-auth", { detail: session }));
});
