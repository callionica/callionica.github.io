const name = "callionica.view-source";

globalThis[name] = function viewSource() {
    const source = document.documentElement.outerHTML;
    const body = document.body;
    body.style = "font-size: 28px; color: black; background-color: beige; border: 0; margin: 0; padding: 2vw; overflow-y: scroll; overflow-x: hidden;";
    body.innerText = source;
};

globalThis[name]();
