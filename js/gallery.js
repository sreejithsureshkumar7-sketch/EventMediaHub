window.EMH = window.EMH || {};

EMH.gallery = {
  async load(eventId) {
    const { data, error } = await supabaseClient
      .from("media").select("*").eq("event_id", eventId)
      .neq("status", "deleted").order("created_at", {ascending:false});
    if (error) throw error;
    return data || [];
  },

  subscribe(eventId, render) {
    return supabaseClient.channel(`media-${eventId}`)
      .on("postgres_changes", {event:"*", schema:"public", table:"media", filter:`event_id=eq.${eventId}`},
        payload => render(payload)
      ).subscribe();
  },

  async render(rows, host, isAdmin=false) {
    host.innerHTML = "";
    for (const row of rows) {
      try {
        const url = await EMH.upload.signedUrl(row);
        const media = row.media_type === "video"
          ? `<video src="${url}" controls preload="metadata"></video>`
          : `<img src="${url}" alt="${EMH.escape(row.original_name || "Event photo")}" loading="lazy">`;
        host.insertAdjacentHTML("beforeend", `<article class="media-card" data-id="${row.id}">
          ${media}
          <div class="media-meta">
            <span>${row.media_type}</span>
            <small>${EMH.formatDate(row.created_at)}</small>
            <a class="btn tiny" href="${url}" target="_blank" download>Download</a>
            ${row.media_type === "video" ? `<a class="btn tiny" href="editor.html?event=${row.event_id}&media=${row.id}">Edit</a>` : ""}
            ${isAdmin ? `<button class="btn tiny danger" data-delete="${row.id}">Delete</button>` : ""}
          </div>
        </article>`);
      } catch (e) {
        console.warn("Media URL error", e);
      }
    }
    if (!host.children.length) host.innerHTML = `<div class="empty">No media yet. Upload the first memory.</div>`;
  }
};

document.addEventListener("DOMContentLoaded", async () => {
  if (document.body.dataset.page !== "gallery") return;
  const { profile } = await EMH.pageGuard();
  const eventId = EMH.getEventId();
  if (!eventId) return;
  const host = document.querySelector("#galleryGrid");
  let rows = await EMH.gallery.load(eventId);
  await EMH.gallery.render(rows, host, profile?.role === "admin");

  EMH.gallery.subscribe(eventId, async payload => {
    if (payload.eventType === "INSERT") rows = [payload.new, ...rows.filter(x => x.id !== payload.new.id)];
    if (payload.eventType === "UPDATE") rows = rows.map(x => x.id === payload.new.id ? payload.new : x);
    if (payload.eventType === "DELETE") rows = rows.filter(x => x.id !== payload.old.id);
    await EMH.gallery.render(rows, host, profile?.role === "admin");
  });

  host.addEventListener("click", async e => {
    const id = e.target.dataset.delete;
    if (!id) return;
    const row = rows.find(x => x.id === id);
    if (!row || !confirm("Delete this media permanently?")) return;
    try {
      await EMH.upload.remove(row);
      EMH.toast("Media deleted", "success");
    } catch (err) { EMH.toast(err.message, "error"); }
  });
});
