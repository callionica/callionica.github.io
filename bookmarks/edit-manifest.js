const name = "callionica.edit-manifest";

globalThis[name] = async function editManifest() {
    const manifestLinks = [...document.querySelectorAll("link[rel='manifest']")];
    const manifestLink = manifestLinks[0];

    const originalURL = manifestLink?.href;
    
    alert(originalURL);
    
    if (originalURL === undefined) { return; }

    const response = await fetch(originalURL);
    alert("got response");
    const json = await response.json();
    alert("got JSON");
    const text = JSON.stringify(json, null, 2);
    alert(text);

    const blob = new Blob([text], { type: "application/manifest+json" });
    const editedURL = URL.createObjectURL(blob);

    manifestLink.href = editedURL;
};

globalThis[name]();
