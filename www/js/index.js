const PANEL_INIT = "banner";
const PANEL_HOME = "panel_home";
const PANEL_SET = "panel_set_data";
const PANEL_CONNECT = "panel_connect";
const PANEL_GET = "panel_get_data";

mostrarPanel(PANEL_INIT);
document.addEventListener("deviceready", onDeviceReady);

function onDeviceReady() {
    mostrarPanel(PANEL_HOME);
}


function mostrarPanel(nombrePanel) {
    //Pongo a todos los paneles en no visible
    var paneles = document.getElementsByClassName("panel");
    Array.from(paneles).forEach(panel => panel.style.display = "none");
    //Muestro el panel seleccionado
    alert("mostrar: " + nombrePanel);
    document.getElementById(nombrePanel).style.display = "block";
    alert("mostra2");
}
