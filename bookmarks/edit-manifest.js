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

    const originalText = JSON.stringify(json, null, 2);
    alert(originalText);

    json.start_url = document.location.toString();

    const text = JSON.stringify(json, null, 2);
    alert("CHANGED\n" + text);

    // const blob = new Blob([text], { type: "application/manifest+json" });
    // const editedURL = URL.createObjectURL(blob);

    const data = `data:application/manifest+json;utf8,${encodeURIComponent(text)}`;
    const editedURL = data;

    manifestLink.href = editedURL;
};

globalThis[name]();
