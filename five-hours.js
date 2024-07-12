const name = "five-hours";

globalThis[name] = function () {
    alert("5 Hours");
};

globalThis[name]();
