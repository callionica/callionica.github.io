const name = "callionica.copy-clicked-images";

globalThis[name] = function copyClickedImages() {

    function computedStyle(element) {
        return document.defaultView.getComputedStyle(element);
    }

    function leaves(elements) {
        const leaves = [];
        const ancestors = new Set();
        for (const element of elements) {
            if (!ancestors.has(element)) {
                leaves.push(element);
                pathToRoot(element).forEach(element => ancestors.add(element));
            }
        }
        return leaves;
    }

    /**
     * Extracts the first URL from a style such as background-image
     * @param { string } text 
     * @returns { string | undefined }
     */
    function firstUrlFromStyle(text) {
        if (text == undefined) {
            return undefined;
        }

        const re = /url[(]['"](?<url>[^'"]*)['"][)]/i;
        return re.exec(text)?.groups?.url ?? undefined;
    }

    /**
     * Returns the URL of the first image in the list of elements
     * @param {HTMLElement[]} elements 
     * @returns { string }
     */
    function firstImage(elements) {
        for (const element of elements) {
            if (element.tagName === "IMG" && element.currentSrc) {
                return element.currentSrc;
            }

            const style = computedStyle(element);

            if (element.tagName === "svg") { // yes, lowercase
                // console.log("fill", style.fill);
                // console.log("stroke", style.stroke);

                // const blob = new Blob([element.outerHTML], { type: "image/svg+xml" });
                // const url = URL.createObjectURL(blob);
                // return url.toString();

                return `data:image/svg+xml;utf8,${encodeURIComponent(element.outerHTML)}`;
            }

            const bg = style.backgroundImage;
            const img = firstUrlFromStyle(bg);
            if (img !== undefined) {
                return img;
            }
        }

        for (const element of elements) {
            const es = [...element.querySelectorAll("img")].filter(e => e.currentSrc);
            if (es[0] !== undefined) {
                return es[0].currentSrc;
            }
        }
    }

    // Returns the result of calling the fn with the elements that the user clicks on.
    // We use a callback here specifically to give the caller a chance to execute code
    // within the context of the event handler since stuff like clipboard access, audio,
    // and other features are only available in user event handlers

    /**
     * @template T
     * @param { (clickedElements: HTMLElement[])=>T } fn 
     */
    async function getClickedElements(fn) {
        const timeout = async ms => new Promise(res => setTimeout(res, ms));

        /** @type { HTMLElement[] } */
        let clickedElements = null;
        /** @type { T } */
        let result = null;

        // Create an overlay to capture clicks
        const overlay = document.createElement("div");
        overlay.style = "height: 100vh; width: 100vw; position: fixed; top: 0; left: 0; margin: 0; padding: 0; border: 0; opacity: 0.2; background-color: black; z-index: 999; cursor: pointer;";

        const instructions = document.createElement("div");
        instructions.style = "height: 100vh; width: 100vw; position: fixed; top: 0; left: 0; margin: 0; padding: 0; border: 0; z-index: 999; cursor: pointer; font-size: 64px; transition: all 0.3s linear;";
        instructions.innerHTML = `
        <p style="width: 100%; height: 100%; line-height: 2; text-align: center; margin-top: 10vh; padding: 0; border: 0; color: black; background-color: rgba(255, 255, 255, 0.5);">
        CLICK IMAGE TO COPY URL
        </p>
        `;

        document.body.append(overlay, instructions);
        setTimeout(() => instructions.style.opacity = "0", 1500);

        function onclick(evt) {
            evt.stopImmediatePropagation();
            evt.stopPropagation();
            evt.preventDefault();

            const tap = document.createElement("div");
            const rect = overlay.getBoundingClientRect();
            console.log(rect);
            const width = 64;
            const height = 64;
            const x = evt.clientX - width/2;
            const y = evt.clientY - height/2;
            tap.style = `height: ${height}px; width: ${width}px; position: fixed; top: ${y}px; left: ${x}px; background-color: white; border-radius: 50%; transition: all 0.3s linear;`;
            
            setTimeout(() => {
                tap.style.transform = "scale(2.0)";
                tap.style.opacity = "0";
            }, 0);

            overlay.append(tap);

            setTimeout(() => tap.remove(), 1000);

            const foundElements = [...document.elementsFromPoint(evt.clientX, evt.clientY)].filter(e => e !== overlay);

            result = fn(foundElements)

            clickedElements = foundElements;
        }

        const event = "onclick";
        const old = document[event];

        document[event] = onclick;
    
        try {

            while (!clickedElements) {
                await timeout(100);
            }
    
            instructions.remove();
            setTimeout(() => overlay.remove(), 350);
        } finally {
            document[event] = old;
        }

        return result;
    }

    /**
     * 
     * @param { HTMLElement[] } clickedElements 
     */
    function getImages(clickedElements) {

        console.log("clickedElements", clickedElements);

        const first = firstImage(clickedElements);
        console.log("first", first);

        return [first];

        const leafElements = leaves(clickedElements);
        console.log("leafElements", leafElements);
    
        /** @type { string[] } */
        let images = [];
        
        /**
         * Returns the URLs of any img elements in the collection.
         * If no valid URLs are found, returns the URLs of any background-images applied to the elements.
         * 
         * @param { HTMLElement[] } elements 
         */
        function imgElementsOrBackgroundImages(elements) {
            // Prefer grabbing IMG elements that have been clicked on
            /** @type { HTMLImageElement[] } */
            const imageElements = elements.filter(e => e.tagName === "IMG");
            let images = imageElements.map(img => img.currentSrc).filter(url => url);
            
            // If none of those, pull URLs from the background-image style
            if (images.length === 0) {
                images = elements.map(element => computedStyle(element).backgroundImage).filter(img => img && img.startsWith(`url("`) && img.endsWith(`")`)).map(img => img.substring(5, img.length - 2));
            }

            return images;
        }

        images = imgElementsOrBackgroundImages(leafElements);

        // If none of those, check whether the leaf elements contain any IMG elements
        if (images.length === 0) {
            images = leafElements.flatMap(element => [...element.querySelectorAll("img")].map(img => img.currentSrc)).filter(url => url);
        }

        // If none of those, check entire tree
        if (images.length === 0) {
            images = imgElementsOrBackgroundImages(clickedElements);
        }

        // Ensure uniqueness while maintaining the order
        return [...new Set(images)];
    }

    function pathToRoot(node) {
        const nodes = [];
        while (node && node.nodeName !== "#document") {
            nodes.push(node);
            node = node.parentNode;
        }
        return nodes
    }

    function commonPathToRoot(node, path) {
        if (path === undefined) {
            return pathToRoot(node);
        }

        if (path.length === 0) {
            return path;
        }

        const set = new Set(pathToRoot(node));
        let index = path.length;
        for (let i = 0; i < path.length; ++i) {
            if (set.has(path[i])) {
                index = i;
                break;
            }
        }

        return path.slice(index);
    }

    function _commonPath(items) {
        return items.reduce((path, node) => commonPathToRoot(node, path), undefined);
    }

};

globalThis[name]();
