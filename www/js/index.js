const PANEL_INIT = "banner";
const PANEL_HOME = "panel_home";
const PANEL_SET = "panel_set_data";
const PANEL_INFO = "panel_info";
const PANEL_CONNECT = "panel_connect";
const PANEL_GET = "panel_get_data";

const T_GET = 1;
const T_SET = 2;
const T_NUL = 0;
var tipo_conexion = T_NUL;

mostrarPanel(PANEL_INIT);
/*
    EVENTS
*/
document.addEventListener("deviceready", onDeviceReady);

/*
    BUTTONS
*/
document.getElementById("asd").addEventListener("click", onDeviceReady);

//PANEL_HOME
document.getElementById("bSetData").addEventListener("click", buttonSetData);
document.getElementById("bGetData").addEventListener("click", buttonGetData);
//PANEL_SET
document.getElementById("bSetBack").addEventListener("click", setBack);
document.getElementById("bSetNext").addEventListener("click", setNext);

/*
    On device ready
*/
function onDeviceReady() {
    mostrarPanel(PANEL_HOME);
}

/*
    Función para cambiar de ventana
*/
function mostrarPanel(nombrePanel) {
    //Pongo a todos los paneles en no visible
    var paneles = document.getElementsByClassName("panel");
    Array.from(paneles).forEach(panel => panel.style.display = "none");
    //Muestro el panel seleccionado
    document.getElementById(nombrePanel).style.display = "block";
}


/* ------------------------------
    FUNCIONES VENTANAS
   ------------------------------ */

//Ventana principal -> PANEL_HOME

function buttonSetData() {
    setHourAndTime();
    mostrarPanel(PANEL_SET);
}

function buttonGetData() {
    tipo_conexion = T_GET;
    mostrarPanel(PANEL_INFO);
}

//Ventana set data -> PANEL_SET

function setBack() {
    mostrarPanel(PANEL_HOME);
}

function setNext() {
    tipo_conexion = T_SET;
    alert(document.getElementById("dataSetDate").value);
    mostrarPanel(PANEL_INFO);
}

function setHourAndTime() {
    var today = new Date();
    today.setHours(today.getHours() + (today.getTimezoneOffset() / -60));


    document.getElementById("dataSetDate").value = today.toJSON().slice(0, 19);
}

//Ventana info -> PANEL_INFO




/* ------------------------------
 FUNCIONES CONEXION BLUETOOTH
------------------------------ */