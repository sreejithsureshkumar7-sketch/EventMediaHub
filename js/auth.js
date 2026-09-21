window.EMH = window.EMH || {};

EMH.auth = {
  async user() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    return user;
  },

  async requireUser() {
    const user = await this.user();
    if (!user) {
      location.href = `login.html?redirect=${encodeURIComponent(location.pathname + location.search)}`;
      throw new Error("Authentication required");
    }
    return user;
  },

  async signInGoogle() {
    const redirectTo = `${location.origin}${location.pathname.includes("login.html") ? "/events.html" : location.pathname}`;
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo }
    });
    if (error) throw error;
  },

  async signOut() {
    await supabaseClient.auth.signOut();
    location.href = "login.html";
  },

  async profile() {
    const user = await this.user();
    if (!user) return null;
    const { data, error } = await supabaseClient
      .from("profiles").select("*").eq("id", user.id).single();
    if (error) throw error;
    return data;
  }
};

supabaseClient.auth.onAuthStateChange((_event, session) => {
  window.dispatchEvent(new CustomEvent("emh-auth", { detail: session }));
});
