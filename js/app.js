window.EMH = window.EMH || {};

EMH.escape = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
}[c]));

EMH.qs = (s, root=document) => root.querySelector(s);
EMH.qsa = (s, root=document) => [...root.querySelectorAll(s)];

EMH.toast = (message, type="info") => {
  const host = document.querySelector("#toastHost") || (() => {
    const el = document.createElement("div");
    el.id = "toastHost";
    el.className = "toast-host";
    document.body.appendChild(el);
    return el;
  })();
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => el.remove(), 3200);
};

EMH.formatDate = (value) => new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium", timeStyle: "short"
}).format(new Date(value));

EMH.formatBytes = (n) => {
  if (!n) return "0 B";
  const units = ["B","KB","MB","GB"];
  const i = Math.min(Math.floor(Math.log(n)/Math.log(1024)), units.length-1);
  return `${(n/1024**i).toFixed(i ? 1 : 0)} ${units[i]}`;
};

EMH.pageGuard = async () => {
  try {
    const user = await EMH.auth.requireUser();
    const p = await EMH.auth.profile();
    document.querySelectorAll("[data-user-name]").forEach(e => e.textContent = p?.full_name || user.email);
    document.querySelectorAll("[data-user-avatar]").forEach(e => {
      if (p?.avatar_url) e.src = p.avatar_url;
    });
    document.querySelectorAll("[data-signout]").forEach(e => e.onclick = () => EMH.auth.signOut());
    return { user, profile: p };
  } catch { return null; }
};

EMH.getEventId = () => new URLSearchParams(location.search).get("event");
EMH.getJoinCode = () => new URLSearchParams(location.search).get("code");
