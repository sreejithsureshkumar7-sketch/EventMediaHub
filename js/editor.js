window.EMH = window.EMH || {};

EMH.editor = {
  ffmpeg: null,
  loaded: false,

  async load() {
    if (this.loaded) return;
    if (!window.FFmpeg) throw new Error("FFmpeg.wasm library failed to load.");
    this.ffmpeg = FFmpeg.createFFmpeg({
      log: true,
      corePath: "https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js"
    });
    await this.ffmpeg.load();
    this.loaded = true;
  },

  async edit({file, start=0, end=null, text="", music=null, filter="none"}) {
    await this.load();
    const ff = this.ffmpeg;
    const inputName = "input.mp4";
    ff.FS("writeFile", inputName, await fetchFile(file));

    let args = ["-i", inputName];
    if (music) {
      ff.FS("writeFile", "music.mp3", await fetchFile(music));
      args.push("-i", "music.mp3");
    }

    const filters = [];
    if (filter === "grayscale") filters.push("hue=s=0");
    if (filter === "warm") filters.push("eq=saturation=1.2:gamma=1.05");
    if (filter === "vintage") filters.push("curves=vintage");

    if (text) {
      const safe = text.replace(/:/g, "\\:").replace(/'/g, "\\'");
      filters.push(`drawtext=text='${safe}':x=(w-text_w)/2:y=h-100:fontsize=48:fontcolor=white:box=1:boxcolor=black@0.45`);
    }

    if (filters.length) args.push("-vf", filters.join(","));
    if (start > 0) args.push("-ss", String(start));
    if (end !== null && end > start) args.push("-t", String(end-start));

    if (music) {
      args.push("-map", "0:v:0", "-map", "1:a:0", "-shortest", "-c:a", "aac");
    } else {
      args.push("-c:a", "copy");
    }

    args.push("-c:v", "libx264", "-preset", "veryfast", "-movflags", "faststart", "output.mp4");
    await ff.run(...args);
    const data = ff.FS("readFile", "output.mp4");
    return new Blob([data.buffer], {type:"video/mp4"});
  }
};

document.addEventListener("DOMContentLoaded", async () => {
  if (document.body.dataset.page !== "editor") return;
  await EMH.pageGuard();

  const videoInput = document.querySelector("#videoInput");
  const musicInput = document.querySelector("#musicInput");
  const video = document.querySelector("#previewVideo");
  const form = document.querySelector("#editorForm");
  const status = document.querySelector("#editorStatus");

  videoInput.onchange = () => {
    const file = videoInput.files[0];
    if (file) video.src = URL.createObjectURL(file);
  };

  form.onsubmit = async e => {
    e.preventDefault();
    const file = videoInput.files[0];
    if (!file) return EMH.toast("Choose a video first", "error");

    const start = Number(document.querySelector("#startTime").value || 0);
    const endValue = document.querySelector("#endTime").value;
    const end = endValue === "" ? null : Number(endValue);
    const text = document.querySelector("#overlayText").value;
    const filter = document.querySelector("#filter").value;
    const music = musicInput.files[0] || null;

    try {
      status.textContent = "Loading FFmpeg.wasm and rendering…";
      const blob = await EMH.editor.edit({file, start, end, text, music, filter});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "eventmediahub-edited.mp4";
      a.click();
      status.textContent = "Export complete.";
    } catch (err) {
      console.error(err);
      status.textContent = `Editor error: ${err.message}`;
    }
  };
});
