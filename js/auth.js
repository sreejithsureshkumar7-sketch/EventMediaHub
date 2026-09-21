window.EMH = window.EMH || {};

EMH.auth = {
  async user() {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
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
    const redirectTo = `${location.origin}/events.html`;
    const { error } = await window.supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo }
    });
    if (error) throw error;
  },

  async signInEmail(email, password) {
    const { data, error } = await window.supabaseClient.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  },

  async signUpEmail(fullName, email, password) {
    const { data, error } = await window.supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        },
        emailRedirectTo: `${location.origin}/events.html`
      }
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    await window.supabaseClient.auth.signOut();
    location.href = "login.html";
  },

  async profile() {
    const user = await this.user();
    if (!user) return null;
    const { data, error } = await window.supabaseClient
      .from("profiles").select("*").eq("id", user.id).single();
    if (error) throw error;
    return data;
  }
};

window.supabaseClient.auth.onAuthStateChange((_event, session) => {
  window.dispatchEvent(new CustomEvent("emh-auth", { detail: session }));
});
