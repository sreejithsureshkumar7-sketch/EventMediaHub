window.EMH = window.EMH || {};

document.addEventListener("DOMContentLoaded", async () => {
  if (document.body.dataset.page !== "admin") return;
  const { profile } = await EMH.pageGuard();
  if (profile?.role !== "admin") {
    document.querySelector("main").innerHTML = `<section class="empty">Admin access required.</section>`;
    return;
  }

  const eventList = document.querySelector("#adminEvents");
  const form = document.querySelector("#createEventForm");

  async function renderEvents() {
    const events = await EMH.events.list();
    eventList.innerHTML = events.map(e => `
      <div class="admin-row">
        <div><strong>${EMH.escape(e.name)}</strong><small>${EMH.formatDate(e.starts_at)}</small></div>
        <div class="admin-actions">
          <a class="btn tiny" href="event.html?event=${e.id}">Open</a>
          <a class="btn tiny" href="gallery.html?event=${e.id}">Gallery</a>
          <button class="btn tiny danger" data-remove="${e.id}">Delete</button>
        </div>
      </div>`).join("");
  }

  form.onsubmit = async e => {
    e.preventDefault();
    try {
      const fd = new FormData(form);
      await EMH.events.create({
        name: fd.get("name"),
        description: fd.get("description"),
        venue: fd.get("venue"),
        starts_at: new Date(fd.get("starts_at")).toISOString(),
        ends_at: new Date(fd.get("ends_at")).toISOString()
      });
      form.reset();
      EMH.toast("Event created", "success");
      renderEvents();
    } catch (err) { EMH.toast(err.message, "error"); }
  };

  eventList.onclick = async e => {
    const id = e.target.dataset.remove;
    if (!id || !confirm("Delete this event and its media records?")) return;
    try { await EMH.events.remove(id); renderEvents(); }
    catch (err) { EMH.toast(err.message, "error"); }
  };

  renderEvents();
});
