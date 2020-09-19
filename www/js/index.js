//const { connect } = require("../../platforms/android/app/build/intermediates/merged_assets/debug/out/www/plugins/cordova-plugin-ftp/www/ftp");

//Constantes Bluetooth
const UUID_SERVICE = "cc88c38f-5da3-4ae2-aaf0-9a22f8f4d5f7";
const UUID_CHARACTERISTIC = "29619ec5-2799-4a46-8c81-fca529cd56f3";

//Comandos Datametric device
const COMMAND_NAME_DEVICE = 'i';//0x69; //Devuele el id unico del dispositivo -> i
const COMMAND_DATA = 'w';//0x77; //Devuelve el header y los registros temporales de temperatura -> w
const COMMAND_SET_DATE = 0x61; //Setea la hora del dispositivo -> a
const COMMAND_SET_HEADER = 'b'; //Setea el header del dispositivo -> b
const COMMAND_RESET = 'r'; //Resetea el contador de registro del dispositivo -> r

const DELAY_TIME = 150; //Retardo en ms entre cada caracter al setear el header

const BYTES_REG = 6; //Cantidad de bytes por registro temporal

//Nombres paneles
const PANEL_LOADING = "loading";
const PANEL_HOME = "panel_home";
const PANEL_SET = "panel_set_data";
const PANEL_INFO = "panel_info";
const PANEL_CONNECT = "panel_connect";
const PANEL_GET = "panel_get_data";
const PANEL_ERROR = "panel_error";
const PANEL_CONTACT = "panel_contact";

//Tipos de conexion
const T_GET = 1;
const T_SET = 2;
const T_NUL = 0;
var tipo_conexion = T_NUL;

//Variables
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
var isBackup = false;
var lastConnection;

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
        function () { console.log("Bluetooth enabled"); },
        function () {
            alert("Error: Bluetooth not enabled");
            mostrarPanel(PANEL_ERROR);
        }
    );
    mostrarPanel(PANEL_HOME);
}

/* ------------------------------
    BUTTONS
   ------------------------------ */
//PANEL_HOME
document.getElementById("bSetData").addEventListener("click", buttonSetData);
document.getElementById("bGetData").addEventListener("click", buttonGetData);
document.getElementById("bTest").addEventListener("click", func_test);

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
    dataSet = {
        "header": document.getElementById("dataSetHeader").value,
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
        isBackup = true;
    else
        isBackup = false;
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
}

function actualizarLista(list) {
    //Agrega a cada elemento a la tabla
    list.forEach((x) => { x.status = (window.cordova.platformId === "android") ? "Paired" : "Near"; });
    list.forEach(addToList);
}

function actualizarListaUnpaired(list) {
    //Agrega a cada elemento a la tabla
    list.forEach((x) => { x.status = "Near" });
    list.forEach(addToList);
}

function addToList(result) {
    //Revisa si ya existe un dispositivo con esa id para no tener duplicados en la lista
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
    if (confirm("Conectarse a " + device_id + "?")) {

        bluetoothSerial.connect(device_id,
            () => {
                lastConnection = device_id;

                document.getElementById("textLoading").innerText = "Loading ...";
                mostrarPanel(PANEL_LOADING);
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

/*
    FUNCIONES QUE SE EJECUTAN DURANTE LA COMUNICACION POR BLUETOOTH CON EL DISPOSITIVO, Y ANTES DE
    MOSTRAR LA PANTALLA GET DATA

    1. Obtener el nombre unico del dispositivo (id)
        1a. obtenerDeviceName() 
        1b. onReceiveMessageDeviceName()
    2. Obtener header y registros del dispositivo
        2a. obtenerDatos() -> envia el comando w
        2b. onReceiveMessageData() -> recolecta los datos devueltos por el dispositivo hasta recibir dos ff
    3. Procesar los datos recibidos y almacenarlos
        3a. procesarBuffer() -> Separa el buffer en la seccion de header y en la seccion de registros de temperatura
        3b. cargarHeader() -> Procesa el header y lo almacena
        3c. procesarBufferData() -> Procesa los registros de temperatura
        3d. escribirRegistros() -> Escribe los registros en la tabla
    4. Crear el archivo y enviarlo por FTP
        4a. guardarArchivo()
        4b. enviarPorFTP()

*/


function obtenerDeviceName() {
    bluetoothSerial.write(COMMAND_NAME_DEVICE, () => {
        console.log("Comand i enviado");
        if (!isBackup)
            document.getElementById("textLoading").innerText = "Receiving device name ...";
        else
            document.getElementById("textLoading").innerText = "Sending data .";
        bluetoothSerial.subscribeRawData((buffer_in) => {
            //Tomo los datos del buffer y los paso a un array
            deviceName = String.fromCharCode.apply(null, Array.from(new Uint8Array(buffer_in)));
            bluetoothSerial.unsubscribeRawData(() => { logger("unsubscribeRawData") }, onError);
            obtenerDatos();
        }, onError);
    }, onError);
}


function obtenerDatos() {
    if (!isBackup) document.getElementById("textLoading").innerText = "Sending command ...";
    bluetoothSerial.write(COMMAND_DATA, () => {
        buffer = [];
        countEndData = 0;
        if (!isBackup) document.getElementById("textLoading").innerText = "Receiving data ...";
        //Al recibir datos, concatenar el buffer
        bluetoothSerial.subscribeRawData((buffer_in) => { buffer = buffer.concat(Array.from(new Uint8Array(buffer_in))); }, onError);
    }, onError);
}
/*
function onReceiveMessageData(buffer_in) {

    //Tomo los datos del buffer y los paso a un array
    var data = Array.from(new Uint8Array(buffer_in));

    //Compruebo de que si el ultimo caracter un FF, se termina la trasmision
    //var contains = data.some(element => { return element === 255 });
    buffer = buffer.concat(data);

    if (contains) {
        countEndData++;
        if (countEndData == 2) {
            //logger("3er FF");
            bluetoothSerial.unsubscribeRawData(() => { logger("unsubscribeRawData") }, onError);
            bluetoothSerial.disconnect(() => { logger("bluettoth desconected") }, onError);
            procesarBuffer();
        }
    }
}
*/


function onErrorConnection(err) {
    //console.log("ERROR CONEXION" + JSON.stringify(err));
    //alert("ERROR CONEXION: " + JSON.stringify(err));
    console.log("conexion terminada");
    bluetoothSerial.unsubscribeRawData(() => { logger("unsubscribeRawData") }, onError);
    bluetoothSerial.disconnect(() => { logger("bluettoth desconected") }, onError);
    console.log(buffer);
    if (buffer.length > 0) {
        console.log("hay datos en el header");
        if (isBackup) {
            console.log("isbackup asi que ahora a setear");
            bluetoothSerial.connect(lastConnection,
                () => {
                    document.getElementById("textLoading").innerText = "Sending data ...";
                    bluetoothSerial.clear();
                    bluetoothSerial.clearDeviceDiscoveredListener();
                    enviarDatos();
                }, onError);
        }

        procesarBuffer();
    }
    else {
        mostrarPanel(PANEL_HOME);
        alert("ERROR: BLUETOOTH DISCONECTED");
    }


}


function procesarBuffer() {
    document.getElementById("textLoading").innerText = "Procesing data ...";
    console.log("PROCESAR BUFFER")
    //TODO: Contar cantidad de FF
    var primer = buffer.indexOf(255);
    var secun = buffer.indexOf(255, primer + 1);
    var terce = buffer.indexOf(255, secun + 1);
    cargarHeader(buffer.slice(0, primer));
    procesarBufferData(buffer.slice(secun + 1));
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
                "temperatura": getTemperatura(b[offset++])
            };
        } else {
            ultReg = true;
        }
        i++;
    }
    if (!isBackup)
        escribirRegistros();
    guardarArchivo();
    enviarPorFTP();

}

function getTemperatura(temp) {
    if (temp > 0x80)	// procesar el signo
        temp = temp * -1;
    return temp;
}

function escribirRegistros() {
    document.getElementById("tabla_data").innerHTML = "";
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
    window.resolveLocalFileSystemURL(cordova.file.externalDataDirectory, (dir) => {
        dir.getFile(fileName, { create: true }, (file) => {
            writeLog(file);
            lastFileCreated = fileName;

        }, onError);
    }, onError);

}

function enviarPorFTP() {
    //TODO: ver como guardar mejor las contraseñas
    window.cordova.plugin.ftp.connect('ftp.datametric.com.ar', 'app@datametric.com.ar', 'setiembre2020', function (ok) {
        console.log("ftp: connect ok=" + ok);
        // You can do any ftp actions from now on...
        console.log("FILE: " + cordova.file.externalDataDirectory + lastFileCreated);
        var ftpPath = ((isBackup) ? "/backups/" : "/") + lastFileCreated;
        console.log("ftpPath: " + ftpPath);
        window.cordova.plugin.ftp.upload(cordova.file.externalDataDirectory + lastFileCreated, ftpPath, function (percent) {
            if (percent == 1) {
                console.log("ftp: upload finish");
                if (!isBackup) mostrarPanel(PANEL_GET);
            } else {
                console.log("ftp: upload percent=" + percent * 100 + "%");
                document.getElementById("textLoading").innerText = "ftp: upload percent=" + percent * 100 + "%";
            }
        }, onFtpError);

    }, onFtpError);

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

/*
    FUNCIONES AL MOSTRAR LA PANTALLA GET DATA
*/

function exportarDatos() {
    /* Enviar archivo creado */
    window.plugins.socialsharing.share('Here is your CSV file', 'Your CSV', cordova.file.externalDataDirectory + fileName)
}

/* ------------------------------
FUNCIONES SEND DATA
------------------------------ */

function enviarDatos() {
    //Obtiene el dia y la hora ingresada por el usuario para setear
    var d = new Date(dataSet.datetime);
    //Formato: //DIA//MES//AÑO//hora//min//seg
    //var setDateTime = [COMMAND_SET_DATE, to_hex(d.getDate()), to_hex(d.getMonth() + 1), to_hex(d.getFullYear() - 2000), to_hex(d.getHours()), to_hex(d.getMinutes()), 0];
    var setDateTime = new Uint8Array(7);
    setDateTime[0] = COMMAND_SET_DATE;
    setDateTime[1] = d.getDate();
    setDateTime[2] = d.getMonth() + 1;
    setDateTime[3] = d.getFullYear() - 2000;
    setDateTime[4] = d.getHours();
    setDateTime[5] = d.getMinutes();
    setDateTime[6] = 0x0;

    document.getElementById("textLoading").innerText = "Setting date";
    console.log("set date");
    console.log(setDateTime);
    bluetoothSerial.write(setDateTime, () => {

        //Logueo lo que devuelve el SET DATE TIME
        bluetoothSerial.subscribeRawData((buffer_in) => {
            console.log("RECEIVE DATE");
            console.log(buffer_in);
            bluetoothSerial.unsubscribeRawData(() => { logger("unsubscribeRawData") }, onError);

            document.getElementById("textLoading").innerText = "Setting header";
            var i = 1;
            var headerToSend = (dataSet.header);
            console.log("Send header: " + headerToSend);
            bluetoothSerial.write(COMMAND_SET_HEADER, () => {

                for (var x of headerToSend) {
                    senWithDelay(x, DELAY_TIME * i++);
                }
                setTimeout(function () {
                    console.log("SEND FF");
                    bluetoothSerial.write('ÿ');

                    //Espero el ff
                    bluetoothSerial.subscribeRawData((buffer_in) => {
                        console.log("RECEIVE DATE");
                        console.log(buffer_in);
                        bluetoothSerial.unsubscribeRawData(() => { logger("unsubscribeRawData") }, onError);
                        document.getElementById("textLoading").innerText = "Reset device";
                        bluetoothSerial.write(COMMAND_RESET, () => {
                            //Espero a lo que devuelve el RESET
                            bluetoothSerial.subscribeRawData((buffer_in) => {
                                console.log("RECEIVE RESET");
                                console.log(buffer_in);
                                bluetoothSerial.unsubscribeRawData(() => { logger("unsubscribeRawData") }, onError);
                                bluetoothSerial.disconnect(() => { logger("bluettoth desconected") }, onError);
                                alert("DATA SETED");
                                mostrarPanel(PANEL_HOME);
                            }, onError);

                        }, onError);
                    }, onError);
                }, DELAY_TIME * i++);
            }, onError);

        }, onError);


    }, onError);


}

//TODO: ARMAR ESTO
function to_hex(dec) {
    return dec;
}

function onReceiveDateData(buffer_in) {

}

function senWithDelay(letter, time) {
    setTimeout(function () {
        console.log("SEND LETTER " + letter);
        bluetoothSerial.write(letter);
    }, time);
}

/* ------------------------------
FUNCIONES LOG Y OTRAS
------------------------------ */

function onError(err) {
    //logger("ERROR: " + JSON.stringify(err));
    console.log("ERROR: " + JSON.stringify(err));
    alert("ERROR: " + JSON.stringify(err));
}

function onFtpError(err) {
    //logger("ERROR: " + JSON.stringify(err));
    console.log("ERROR: " + JSON.stringify(err));
    alert("ERROR: " + JSON.stringify(err));
    mostrarPanel(PANEL_GET);
}

function logger(msj) {
    console.log(msj);
}

function func_test() {
    alert("test");
}