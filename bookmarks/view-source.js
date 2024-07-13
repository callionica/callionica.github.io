const name = "callionica.view-source";

globalThis[name] = function viewSource() {
    alert("view-source") ;   
};

globalThis[name]();
