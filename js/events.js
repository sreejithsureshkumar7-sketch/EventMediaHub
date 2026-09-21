window.EMH = window.EMH || {};

EMH.events = {
  async list() {
    const { data, error } = await supabaseClient
      .from("events").select("*").order("starts_at", {ascending:false});
    if (error) throw error;
    return data || [];
  },

  async byId(id) {
    const { data, error } = await supabaseClient.from("events").select("*").eq("id", id).single();
    if (error) throw error;
    return data;
  },

  async byCode(code) {
    const { data, error } = await supabaseClient.from("events").select("*").eq("join_code", code.toUpperCase()).single();
    if (error) throw error;
    return data;
  },

  async join(eventId) {
    const user = await EMH.auth.requireUser();
    const { error } = await supabaseClient.from("event_members").upsert({
      event_id: eventId,
      user_id: user.id,
      device_label: navigator.userAgent.slice(0, 120),
      last_seen_at: new Date().toISOString()
    }, { onConflict: "event_id,user_id" });
    if (error) throw error;
  },

  async create(payload) {
    const user = await EMH.auth.requireUser();
    const { data, error } = await supabaseClient.from("events").insert({
      ...payload, created_by: user.id
    }).select().single();
    if (error) throw error;
    return data;
  },

  async update(id, payload) {
    const { data, error } = await supabaseClient.from("events").update(payload).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },

  async remove(id) {
    const { error } = await supabaseClient.from("events").delete().eq("id", id);
    if (error) throw error;
  },

  async members(eventId) {
    const { data, error } = await supabaseClient
      .from("event_members")
      .select("*, profiles:user_id(id,full_name,email,avatar_url)")
      .eq("event_id", eventId)
      .order("joined_at", {ascending:false});
    if (error) throw error;
    return data || [];
  }
};

document.addEventListener("DOMContentLoaded", async () => {
  if (!document.body.dataset.page?.includes("events")) return;
  await EMH.pageGuard();
  const list = document.querySelector("#eventList");
  if (!list) return;

  try {
    const events = await EMH.events.list();
    list.innerHTML = events.map(e => {
      const expired = new Date(e.ends_at) < new Date();
      return `<article class="card event-card">
        <div class="event-art">${expired ? "⌛" : "🎉"}</div>
        <div class="card-body">
          <span class="pill">${expired ? "Expired" : "Active"}</span>
          <h3>${EMH.escape(e.name)}</h3>
          <p>${EMH.escape(e.venue || "College campus")}</p>
          <small>${EMH.formatDate(e.starts_at)} → ${EMH.formatDate(e.ends_at)}</small>
          <div class="actions">
            <a class="btn primary" href="event.html?event=${e.id}">Open Event</a>
            <a class="btn ghost" href="gallery.html?event=${e.id}">Gallery</a>
          </div>
        </div>
      </article>`;
    }).join("") || `<div class="empty">No events yet.</div>`;
  } catch (err) {
    list.innerHTML = `<div class="empty">Could not load events: ${EMH.escape(err.message)}</div>`;
  }
});
