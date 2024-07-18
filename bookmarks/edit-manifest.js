const name = "callionica.edit-manifest";

globalThis[name] = function editManifest() {
    const manifestLinks = [...document.querySelectorAll("link[rel='manifest']")];
    const url = manifestLinks[0]?.href;
    alert(url);
};

globalThis[name]();
