window.EMH = window.EMH || {};

EMH.upload = {
  async file(eventId, file, onProgress) {
    const user = await EMH.auth.requireUser();
    const isVideo = file.type.startsWith("video/");
    const bucket = isVideo ? "videos" : "photos";
    const ext = (file.name.split(".").pop() || (isVideo ? "mp4" : "jpg")).toLowerCase();
    const objectPath = `${eventId}/${user.id}/${crypto.randomUUID()}.${ext}`;

    onProgress?.(10);
    const { error: uploadError } = await supabaseClient.storage.from(bucket).upload(
      objectPath, file, { contentType: file.type, upsert: false }
    );
    if (uploadError) throw uploadError;
    onProgress?.(75);

    const { data, error } = await supabaseClient.from("media").insert({
      event_id: eventId,
      uploaded_by: user.id,
      bucket,
      object_path: objectPath,
      media_type: isVideo ? "video" : "photo",
      mime_type: file.type,
      original_name: file.name,
      size_bytes: file.size,
      duration_seconds: null
    }).select().single();

    if (error) {
      await supabaseClient.storage.from(bucket).remove([objectPath]);
      throw error;
    }
    onProgress?.(100);
    return data;
  },

  async signedUrl(row, expires=3600) {
    const { data, error } = await supabaseClient.storage
      .from(row.bucket).createSignedUrl(row.object_path, expires);
    if (error) throw error;
    return data.signedUrl;
  },

  async remove(row) {
    const { error: storageError } = await supabaseClient.storage
      .from(row.bucket).remove([row.object_path]);
    if (storageError) throw storageError;
    const { error } = await supabaseClient.from("media").delete().eq("id", row.id);
    if (error) throw error;
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const input = document.querySelector("#mediaInput");
  const eventId = EMH.getEventId();
  const list = document.querySelector("#uploadList");
  if (!input || !eventId) return;

  input.onchange = async () => {
    for (const file of [...input.files]) {
      const item = document.createElement("div");
      item.className = "upload-item";
      item.innerHTML = `<span>${EMH.escape(file.name)}</span><progress value="0" max="100"></progress>`;
      list?.prepend(item);
      try {
        await EMH.upload.file(eventId, file, p => item.querySelector("progress").value = p);
        item.querySelector("span").textContent += " ✓";
      } catch (err) {
        item.querySelector("span").textContent += ` — ${err.message}`;
      }
    }
    input.value = "";
  };
});
