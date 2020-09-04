//Constantes Bluetooth
const UUID_SERVICE = "cc88c38f-5da3-4ae2-aaf0-9a22f8f4d5f7";
const UUID_CHARACTERISTIC = "29619ec5-2799-4a46-8c81-fca529cd56f3";

const COMMAND_NAME_DEVICE = 'i';
const COMMAND_DATA = 'w';
const COMMAND_SET_DATE = 'a';
const COMMAND_SET_HEADER = 'b';
const COMMAND_RESET = 'r';

const BYTES_REG = 6;
const CARACTER_END_ROW = (new Uint8Array([0x3b]))[0]; //';'
const CARACTER_END_DATA = (new Uint8Array([0xff]))[0];

//Nombres paneles
const PANEL_LOADING = "loading";
const PANEL_HOME = "panel_home";
const PANEL_SET = "panel_set_data";
const PANEL_INFO = "panel_info";
const PANEL_CONNECT = "panel_connect";
const PANEL_GET = "panel_get_data";
const PANEL_ERROR = "panel_error";

//Tipos de conexion
const T_GET = 1;
const T_SET = 2;
const T_NUL = 0;
var tipo_conexion = T_NUL;


var log = "";
var device;
var foundedDevices = [];
var buffer = [];
var dataSet;
var countEndData;

// Variables para exportar
var listaRegistros = [];
var header = "";
var deviceName = "";
var lastFileCreated = "";
var fileName = "";

mostrarPanel(PANEL_LOADING);

/*
    EVENTS
*/
document.addEventListener("deviceready", onDeviceReady);
/*
    On device ready
*/
function onDeviceReady() {
    //Activar bluetooth
    bluetoothSerial.enable(
        function () {

            console.log("Bluetooth enabled");
        },
        function () {
            alert("Error: Bluetooth not enabled");
            mostrarPanel(PANEL_ERROR);
            //document.getElementById("botonRefresh").disabled = true;
        }
    );
    mostrarPanel(PANEL_HOME);
}

/* ------------------------------
    BUTTONS
   ------------------------------ */
document.getElementById("asd").addEventListener("click", onDeviceReady);

//PANEL_HOME
document.getElementById("bSetData").addEventListener("click", buttonSetData);
document.getElementById("bGetData").addEventListener("click", buttonGetData);
//PANEL_SET
document.getElementById("bSetBack").addEventListener("click", setBack);
document.getElementById("bSetNext").addEventListener("click", setNext);
//PANEL_INFO
document.getElementById("bInfoBack").addEventListener("click", infoBack);
document.getElementById("bInfoNext").addEventListener("click", infoNext);
//PANEL_CONNECT
document.getElementById("bConBack").addEventListener("click", connectBack);
document.getElementById("bConNext").addEventListener("click", connectNext);
//PANEL_GET
document.getElementById("bExport").addEventListener("click", exportarDatos);
document.getElementById("bGetHome").addEventListener("click", getHome);



/* ------------------------------
    FUNCIONES VENTANAS
   ------------------------------ */

/*
    Función para cambiar de ventana
*/
function mostrarPanel(nombrePanel) {
    //Pongo a todos los paneles en no visible
    var paneles = document.getElementsByClassName("panel");
    Array.from(paneles).forEach(panel => panel.style.display = "none");
    //Muestro el panel seleccionado
    document.getElementById(nombrePanel).style.display = "block";
    if (nombrePanel === PANEL_CONNECT) {
        getDevices();
    }
}

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
    //alert(document.getElementById("dataSetDate").value);

    dataSet =
    {
        "header": document.getElementById("dataSetDate").value,
        "datetime": document.getElementById("dataSetDate").value
    };
    mostrarPanel(PANEL_INFO);
}

function setHourAndTime() {
    var today = new Date();
    today.setHours(today.getHours() + (today.getTimezoneOffset() / -60));
    document.getElementById("dataSetDate").value = today.toJSON().slice(0, 19);
}

//Ventana info -> PANEL_INFO

function infoBack() {

    if (tipo_conexion === T_SET)
        mostrarPanel(PANEL_SET);
    else
        mostrarPanel(PANEL_HOME);
}

function infoNext() {
    mostrarPanel(PANEL_CONNECT);
}

//Ventana connexion -> PANEL_CONNECT
function connectBack() {
    if (tipo_conexion === T_SET)
        mostrarPanel(PANEL_SET);
    else
        mostrarPanel(PANEL_HOME);
}
function connectNext() {
    if (tipo_conexion === T_SET)
        enviarDatos();
    else
        obtenerDeviceName();
}

//Ventana get datos -> PANEL_GET
function getHome() {
    mostrarPanel(PANEL_HOME);
}

/* ------------------------------
FUNCIONES CONEXION BLUETOOTH
------------------------------ */

function getDevices() {

    foundedDevices = [];
    //Actualizar elementos visuales
    document.getElementById("dispositivos").style.visibility = "visible";
    document.getElementById("tabla_dispositivos").innerHTML = "";

    //En el caso de ser una aplicación android, los dispositivos que no estan emparejados
    //se deben traer con bluetoothSerial.discoverUnpaired()
    if (window.cordova.platformId === "android")
        bluetoothSerial.discoverUnpaired(actualizarListaUnpaired, onError);

    //bluetoothSerial.list()
    //En android: trae los dispositivos emparejados
    //En iOS: trae los dispositivos LTE cercanos
    bluetoothSerial.list(actualizarLista, onError);

    //alert("getDEvices");
}

function actualizarLista(list) {
    //logger("Actualizar lista");
    list.forEach((x) => { x.status = (window.cordova.platformId === "android") ? "Paired" : "Near"; });
    list.forEach(addToList);
    //document.getElementById("botonRefresh").disabled = false;
    //document.getElementById("botonCancel").disabled = true;
    //document.getElementById("botonRefresh").innerHTML = "Refresh";
}

function actualizarListaUnpaired(list) {
    //logger("Actualizar lista");
    list.forEach((x) => { x.status = "Near" });
    list.forEach(addToList);
    //document.getElementById("botonRefresh").disabled = false;
    //document.getElementById("botonCancel").disabled = true;
    //document.getElementById("botonRefresh").innerHTML = "Refresh";
}

function addToList(result) {
    //Revisa si ya existe un dispositivo con esa id para no tener duplicados en la lista
    //alert("addToList" + result);

    var yaExiste = foundedDevices.some((device) => { return device.id === result.id; });
    //Si es un dispositivo nuevo se agrega a la lista y a la tabla
    if (!yaExiste) {
        foundedDevices.push(result);
        var listItem = document.createElement('tr');
        listItem.innerHTML =
            '<td class="">' + result.id + '</td>' +
            '<td class="">' + result.name + '</td>' +
            '<td class="">' + result.status + '</td>';
        document.getElementById("tabla_dispositivos").appendChild(listItem);
        listItem.addEventListener('click', () => { conectar(result.id) });
    }
}

function conectar(device_id) {
    //logger("Conectar a:" + device_id);
    if (confirm("Conectarse a " + device_id + "?")) {
        bluetoothSerial.connect(device_id,
            () => {
                device = device_id;
                bluetoothSerial.clear();
                bluetoothSerial.clearDeviceDiscoveredListener();
                connectNext();


            }, onErrorConnection);
    }
}

/* ------------------------------
FUNCIONES GET DATA
------------------------------ */

function obtenerDeviceName() {

    mostrarPanel(PANEL_LOADING);

    bluetoothSerial.write(COMMAND_NAME_DEVICE, () => {
        logger("Comand i  enviado");
        document.getElementById("textLoading").innerText = "Receiving device name ...";
        bluetoothSerial.subscribeRawData(onReceiveMessageDeviceName, onError);
    }, onError);
}

function onReceiveMessageDeviceName(buffer_in) {

    //Tomo los datos del buffer y los paso a un array
    deviceName = String.fromCharCode.apply(null, Array.from(new Uint8Array(buffer_in)));
    //console.log("device name " + deviceName);
    bluetoothSerial.unsubscribeRawData(() => { logger("unsubscribeRawData") }, onError);
    //console.log("obtener DAtos");
    obtenerDatos();
}

function obtenerDatos() {

    document.getElementById("textLoading").innerText = "Sending command ...";

    bluetoothSerial.write(COMMAND_DATA, () => {
        //logger("Comando enviado");
        buffer = [];
        countEndData = 0;
        document.getElementById("textLoading").innerText = "Receiving data ...";
        bluetoothSerial.subscribeRawData(onReceiveMessageData, onError);
    }, onError);

    //mostrarPanel(PANEL_GET);
}

function onReceiveMessageData(buffer_in) {

    //Tomo los datos del buffer y los paso a un array
    var data = Array.from(new Uint8Array(buffer_in));

    //Compruebo de que si el ultimo caracter un FF, se termina la trasmision
    var contains = data.some(element => { return element === 255 });
    buffer = buffer.concat(data);
    if (contains) countEndData++;
    if (countEndData == 3) {
        //logger("3er FF");
        bluetoothSerial.unsubscribeRawData(() => { logger("unsubscribeRawData") }, onError);
        bluetoothSerial.disconnect(() => { logger("bluettoth desconected") }, onError);
        procesarBuffer(buffer);
    }
}

function procesarBuffer(b) {
    document.getElementById("textLoading").innerText = "Procesing data ...";
    var primer = b.indexOf(255);
    var secun = b.indexOf(255, primer + 1);
    var terce = b.indexOf(255, secun + 1);
    cargarHeader(b.slice(0, primer));
    procesarBufferData(b.slice(secun + 1));


}

function cargarHeader(b) {
    header = String.fromCharCode.apply(null, b);
    document.getElementById("getDeviceName").innerText = deviceName;
    document.getElementById("getHeader").value = header;
}

function procesarBufferData(b) {
    //logger("Procesar lista de registros");
    listaRegistros = [];
    var ultReg = false;
    var i = 0;
    while (!ultReg) {
        //logger("Registro " + (i + 1));
        var offset = BYTES_REG * i;
        if ((b[offset] !== 255) && (b[offset] !== undefined)) {
            listaRegistros[i] = {
                "dia": normNumero(b[offset++]) + "/" + normNumero(b[offset++]) + "/" + (b[offset++] + 2000),
                "hora": normNumero(b[offset++]) + ":" + normNumero(b[offset++]),
                "temperatura": b[offset++]
            };
        } else {
            ultReg = true;
        }
        i++;
    }
    escribirRegistros();
    guardarArchivo();
    mostrarPanel(PANEL_GET);
}

function getTemperatura(temp) {
    if (temp > 0x80)	// procesar el signo
        temp = temp * -1;
    return (temp / 16);
}

function escribirRegistros() {
    //document.getElementById("getHeader").value = document.getElementById("getHeader").value + "\nLista Registros: \n" + JSON.stringify(lista);

    for (var elem of listaRegistros) {
        var listItem = document.createElement('tr');
        listItem.innerHTML =
            '<td class="">' + elem.dia + '</td>' +
            '<td class="">' + elem.hora + '</td>' +
            '<td class="">' + elem.temperatura + ' °C </td>';
        document.getElementById("tabla_data").appendChild(listItem);
    }

}

//Agregar el 0 a la izquierda
function normNumero(n) {
    return ('0' + n).slice(-2);
}

function guardarArchivo() {
    /*Guardar en file system*/
    fileName = 'datametric-' + deviceName + '-' + formatDate(new Date(Date.now())) + '.csv';
    //alert("Save to file: " + cordova.file.externalDataDirectory + fileName);
    window.resolveLocalFileSystemURL(cordova.file.externalDataDirectory, (dir) => {
        dir.getFile(fileName, { create: true }, (file) => {
            writeLog(file);
            lastFileCreated = fileName;
        }, onError);
    }, onError);
}

function exportarDatos() {
    /* Enviar */
    window.plugins.socialsharing.share('Here is your CSV file', 'Your CSV', cordova.file.externalDataDirectory + fileName)
}


function writeLog(logOb) {
    if (!logOb) return;
    logOb.createWriter(function (fileWriter) {
        //fileWriter.seek(fileWriter.length);
        var obj = exportToCsv(header, listaRegistros);
        fileWriter.write(obj);
    }, onError);
}

function exportToCsv(header, data) {
    function processRow(reg) {
        return reg.dia + ';' + reg.hora + ';' + reg.temperatura + '\n';
    }
    var csvFile = header + ";;\nDATOS;;\n";
    csvFile += "Date;Hour;Temperature\n"
    for (var i = 0; i < data.length; i++) {
        csvFile += processRow(data[i]);
    }
    return (new Blob([csvFile], { type: 'text/csv;charset=utf-8;' }));
}

function formatDate(date) {
    var hours = date.getHours();
    var minutes = date.getMinutes();
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return '' + date.getFullYear() + (date.getMonth() + 1) + date.getDate() + hours + minutes;
}

/* ------------------------------
FUNCIONES SEND DATA
------------------------------ */

function enviarDatos() {

    document.getElementById("textLoading").innerText = "RESET DEVICE";
    mostrarPanel(PANEL_LOADING);

    var d = new Date(dataSet.datetime);
    //DIA//MES//AÑO//hora//min//seg
    var setDateTime = [COMMAND_SET_DATE, d.getDate(), d.getMonth() + 1, d.getFullYear() - 2000, d.getHours(), d.getMinutes(), 0];

    bluetoothSerial.write(COMMAND_RESET, () => {
        logger("Reset device");

        document.getElementById("textLoading").innerText = "Setting date";
        bluetoothSerial.write(setDateTime, () => {
            logger("date Seted");


            document.getElementById("textLoading").innerText = "Setting header";

            alert("DATA SETED")
            mostrarPanel(PANEL_HOME);
        }, onError);
    }, onError);

}

/* ------------------------------
FUNCIONES LOG Y OTRAS
------------------------------ */

function onError(err) {
    //logger("ERROR: " + JSON.stringify(err));
    console.log("ERROR: " + JSON.stringify(err));
    alert("ERROR: " + JSON.stringify(err));
}

function onErrorConnection(err) {
    console.log("ERROR CONEXION" + JSON.stringify(err));
    alert("ERROR CONEXION: " + JSON.stringify(err));
    bluetoothSerial.unsubscribeRawData(() => { logger("unsubscribeRawData") }, onError);
    bluetoothSerial.disconnect(() => { logger("bluettoth desconected") }, onError);
    mostrarPanel(PANEL_HOME);

}

function logger(msj) {
    console.log(msj);
    log = log.concat("\n" + msj);
}