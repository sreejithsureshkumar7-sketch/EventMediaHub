window.EMH = window.EMH || {};

EMH.qr = {
  render(target, event) {
    target.innerHTML = "";
    const joinUrl = `${location.origin}${location.pathname.replace(/[^/]+$/, "")}event.html?code=${encodeURIComponent(event.join_code)}`;
    new QRCode(target, {
      text: joinUrl,
      width: 220,
      height: 220,
      colorDark: "#ffffff",
      colorLight: "#10121a",
      correctLevel: QRCode.CorrectLevel.H
    });
    const out = target.parentElement?.querySelector("[data-qr-url]");
    if (out) out.textContent = joinUrl;
  },

  async scan(videoEl) {
    const scanner = new Html5Qrcode(videoEl.id);
    await scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 240, height: 240 } },
      async decoded => {
        await scanner.stop();
        const url = new URL(decoded, location.origin);
        location.href = url.href;
      },
      () => {}
    );
    return scanner;
  }
};
