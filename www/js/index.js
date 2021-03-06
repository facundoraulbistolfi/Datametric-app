//const { connect } = require("../../platforms/android/app/build/intermediates/merged_assets/debug/out/www/plugins/cordova-plugin-ftp/www/ftp");

//Constantes Bluetooth
//const UUID_SERVICE = "cc88c38f-5da3-4ae2-aaf0-9a22f8f4d5f7";
//const UUID_CHARACTERISTIC = "29619ec5-2799-4a46-8c81-fca529cd56f3";
const UUID_SERVICE = "0000ffe0-0000-1000-8000-00805f9b34fb";
const UUID_CHARACTERISTIC = "0000ffe1-0000-1000-8000-00805f9b34fb";

//Comandos Datametric device
const COMMAND_NAME_DEVICE = 0x69;//'i';//0x69; //Devuele el id unico del dispositivo -> i
const COMMAND_DATA = 0x77; //'w';//0x77; //Devuelve el header y los registros temporales de temperatura -> w
const COMMAND_SET_DATE = 0x61; //Setea la hora del dispositivo -> a
const COMMAND_SET_HEADER = 0x62;//'b'; //Setea el header del dispositivo -> b
const COMMAND_RESET = 0x72;//'r'; //Resetea el contador de registro del dispositivo -> r
const END_LINE_CHAR = 0xFF;
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

//IDIOMAS
const IDI_ES = 1;
const IDI_EN = 2;
var idioma;

//Variables
var log = "";
var device;
var foundedDevices = [];
var buffer = [];
var dataSet;
var countEndData;
var magicNumber;
var setDateTime;
// Variables para exportar
var listaRegistros = [];
var header = "";
var deviceName = "";
var lastFileCreated = "";
var fileName = "";
var isBackup = false;
var lastConnection = null;



mostrarPanel(PANEL_LOADING);
cambiarIdioma(IDI_EN);
/*
    EVENTS
*/
document.addEventListener("deviceready", onDeviceReady);
document.addEventListener("pause", onPause, false);
document.addEventListener("backbutton", onBackKeyDown, false);

/*
    On device ready
*/
function onDeviceReady() {
    //Activar bluetooth
    //bluetoothle.initialize(initializeResult, params);

    checkPermissions();

    new Promise(function (resolve) {

        bluetoothle.initialize(resolve, { request: true, statusReceiver: false });

    }).then(() => {
        ble.enable(
            function () { console.log("Bluetooth enabled"); },
            function () {
                alert(getMessage("error enable bluetooth"));
                mostrarPanel(PANEL_ERROR);
            }
        );

    }, () => {
        alert(getMessage("error initialize bluetooth"));
        mostrarPanel(PANEL_ERROR);
    });

    //TODO-> PANEL_HOME
    mostrarPanel(PANEL_HOME);
}

function checkPermissions() {

    var permissions = cordova.plugins.permissions;
    var list = [
        permissions.BLUETOOTH,
        permissions.BLUETOOTH_ADMIN,
        permissions.ACCESS_COARSE_LOCATION,
        permissions.WRITE_EXTERNAL_STORAGE,
        permissions.ACCESS_FINE_LOCATION,
    ];
    for (var perm of list) {
        checkPerm(perm);
    }
}

function checkPerm(perm) {
    var permissions = cordova.plugins.permissions;
    //console.log("perm1: " + perm);
    permissions.checkPermission(perm, function (status) {
        //console.log("perm: " + perm);
        //console.log(status);
        if (!status.hasPermission)
            permissions.requestPermission(perm, (status) => {
                if (!status.hasPermission) errorPermision();
            }, errorPermision2);
    }, errorPermision2);
}


function errorPermision2() {
    //console.log("errorpermision2");
}
function errorPermision() {
    //console.log("errorpermision");
    document.getElementById("error_tit1").innerText = getMessage("errorPermissions1");
    document.getElementById("error_tit2").innerText = getMessage("errorPermissions2");
    mostrarPanel(PANEL_ERROR);
}

function onBackKeyDown() {
    resetApp();
}

function onPause() {
    resetApp();
}

function resetApp() {
    if (lastConnection != null)
        ble.disconnect(lastConnection, () => { console.log("onPause - disconected") }, onError);
    listaRegistros = [];
    header = "";
    deviceName = "";
    lastFileCreated = "";
    fileName = "";
    isBackup = false;
    lastConnection = null;
    mostrarPanel(PANEL_HOME);
}

/* ------------------------------
    BUTTONS
   ------------------------------ */
//PANEL_CONTACT
document.getElementById("cont_wsp").addEventListener("click", contactWsp);
document.getElementById("cont_web").addEventListener("click", contactWeb);
document.getElementById("cont_mail").addEventListener("click", contactEmail);
//PANEL_HOME
document.getElementById("bSetData").addEventListener("click", buttonSetData);
document.getElementById("bGetData").addEventListener("click", buttonGetData);
document.getElementById("idi_en").addEventListener("click", () => { cambiarIdioma(IDI_EN) });
document.getElementById("idi_es").addEventListener("click", () => { cambiarIdioma(IDI_ES) });
document.getElementById("bContact").addEventListener("click", () => { mostrarPanel(PANEL_CONTACT); });
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
//PANEL_CONTACT
document.getElementById("bGoHome").addEventListener("click", getHome);

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

    //trae los dispositivos LTE cercanos
    ble.startScan([], addToList, onError);
}

function actualizarLista(list) {
    //Agrega a cada elemento a la tabla
    //list.forEach((x) => { x.status = (window.cordova.platformId === "android") ? getMessage("Paired") : getMessage("Near"); });
    list.forEach(addToList);
}

function addToList(result) {
    //Revisa si ya existe un dispositivo con esa id para no tener duplicados en la lista
    var yaExiste = (result.name === undefined) || foundedDevices.some((device) => { return device.id === result.id; });

    //Si es un dispositivo nuevo se agrega a la lista y a la tabla
    if (!yaExiste) {
        foundedDevices.push(result);
        var listItem = document.createElement('tr');
        listItem.innerHTML =
            '<td class="">' + result.id + '</td>' +
            '<td class="">' + result.name + '</td>' +
            '<td class="">' + result.rssi + '</td>';
        document.getElementById("tabla_dispositivos").appendChild(listItem);
        listItem.addEventListener('click', () => { conectar(result.id) });
    }
}

function conectar(device_id) {
    if (confirm(getMessage("Connect") + device_id + "?")) {
        document.getElementById("textLoading").innerText = getMessage("Connecting");
        console.log("conectando");
        ble.connect(device_id,
            () => {
                mostrarPanel(PANEL_LOADING);
                console.log("conectando2");
                document.getElementById("textLoading").innerText = getMessage("Loading");
                lastConnection = device_id;
                device = device_id;
                //bluetoothSerial.clear();
                //bluetoothSerial.clearDeviceDiscoveredListener();
                ble.stopScan(() => { }, onError);
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
    console.warn("obtenerDeviceName");
    magicNumber = 0;
    ble.startNotification(device, UUID_SERVICE, UUID_CHARACTERISTIC, (buffer_in) => {
        console.log("mensaje: ");
        console.log(buffer_in);
        if (magicNumber == 0) {
            magicNumber++;
            //Tomo los datos del buffer y los paso a un array
            deviceName = String.fromCharCode.apply(null, Array.from(new Uint8Array(buffer_in)));
            //ble.stopNotification(device, UUID_SERVICE, UUID_CHARACTERISTIC, () => { logger("ble.stopNotification"); obtenerDatos(); }, onError);

            console.log("enviar " + COMMAND_DATA);
            var data = new Uint8Array(1);
            data[0] = COMMAND_DATA;
            buffer = [];
            ble.writeWithoutResponse(device, UUID_SERVICE, UUID_CHARACTERISTIC, data.buffer, () => {
                //Al recibir datos, concatenar el buffer
                console.log("Envia2");
            }, onError);
        }
        else {
            buffer = buffer.concat(Array.from(new Uint8Array(buffer_in)));
        }
    }, onError);

    var data = new Uint8Array(1);
    data[0] = COMMAND_NAME_DEVICE;

    ble.writeWithoutResponse(device, UUID_SERVICE, UUID_CHARACTERISTIC, data.buffer, () => {
        if (!isBackup)
            document.getElementById("textLoading").innerText = getMessage("GettingData");
        else
            document.getElementById("textLoading").innerText = getMessage("SendingData");
    }, onError);
}

/*
function obtenerDatos() {
    //if (!isBackup) document.getElementById("textLoading").innerText = "Sending command ...";

    ble.startNotification(device, UUID_SERVICE, UUID_CHARACTERISTIC,
        (buffer_in) => { buffer = buffer.concat(Array.from(new Uint8Array(buffer_in))); }, onError);

    var data = new Uint8Array(1);
    data[0] = COMMAND_DATA;

    ble.write(device, UUID_SERVICE, UUID_CHARACTERISTIC, data, () => {
        buffer = [];
        //countEndData = 0;
        //if (!isBackup) document.getElementById("textLoading").innerText = "Receiving data ...";
        //Al recibir datos, concatenar el buffer
    }, onError);
}*/
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
    //bluetoothSerial.unsubscribeRawData(() => { logger("unsubscribeRawData") }, onError);
    console.log("on error connection");
    //ble.disconnect(device, () => { logger("bluettoth desconected") }, onError);

    console.log(buffer);
    console.log("onErrorConnection - ble.stopNotification");
    ble.stopNotification(device, UUID_SERVICE, UUID_CHARACTERISTIC,
        (msj) => { console.log("MSJ:" + msj) },
        (err) => { console.log("ERR:" + err) }
    );

    if (buffer.length > 0) {
        if (isBackup) {
            setTimeout(() => {
                ble.connect(lastConnection,
                    () => {
                        console.log("reconected to " + lastConnection);
                        document.getElementById("textLoading").innerText = getMessage("SendingData");
                        enviarDatos(lastConnection);

                    }, onError);
            }, 200
            )

        }

        procesarBuffer();
    }
    else {
        mostrarPanel(PANEL_HOME);
        alert("ERROR: BLUETOOTH DISCONECTED");
    }


}


function procesarBuffer() {
    if (!isBackup) document.getElementById("textLoading").innerText = getMessage("ProcesingData");
    //console.log("PROCESAR BUFFER")
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
    if (temp >= 0x80)	// procesar el signo
        temp = (temp - 0x80) * -1;
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
        //console.log("ftp: connect ok=" + ok);
        // You can do any ftp actions from now on...
        //console.log("FILE: " + cordova.file.externalDataDirectory + lastFileCreated);
        var ftpPath = ((isBackup) ? "/backups/" : "/") + lastFileCreated;
        //console.log("ftpPath: " + ftpPath);
        window.cordova.plugin.ftp.upload(cordova.file.externalDataDirectory + lastFileCreated, ftpPath, function (percent) {
            if (percent == 1) {
                console.log("ftp: upload finish");
                if (!isBackup) mostrarPanel(PANEL_GET);
            } else {
                console.log("ftp: upload percent=" + percent * 100 + "%");
                //document.getElementById("textLoading").innerText = "ftp: upload percent=" + percent * 100 + "%";
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
    var csvFile = header + ";;\nDATA;;\n";
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

function enviarDatos(dev) {
    magicNumber = 0;

    //Obtiene el dia y la hora ingresada por el usuario para setear
    var d = new Date(dataSet.datetime);
    //Formato: //DIA//MES//AÑO//hora//min//seg
    //var setDateTime = [COMMAND_SET_DATE, to_hex(d.getDate()), to_hex(d.getMonth() + 1), to_hex(d.getFullYear() - 2000), to_hex(d.getHours()), to_hex(d.getMinutes()), 0];
    setDateTime = new Uint8Array(7);
    setDateTime[0] = COMMAND_SET_DATE;
    setDateTime[1] = d.getDate();
    setDateTime[2] = d.getMonth() + 1;
    setDateTime[3] = d.getFullYear() - 2000;
    setDateTime[4] = d.getHours();
    setDateTime[5] = d.getMinutes();
    setDateTime[6] = 0x0;

    ble.startNotification(dev, UUID_SERVICE, UUID_CHARACTERISTIC, (buffer_in) => {
        console.log("MENSAJE RECIBIDO: ");
        console.log(buffer_in);
        console.log("magicNumber " + magicNumber);
        if (magicNumber == 0) {

            if (Array.from(new Uint8Array(buffer_in))[0] != setDateTime[3]) {
                alert(getMessage("errorSetting"));
                resetApp();
            }

            var i = 1;

            var offset = new Date().getTimezoneOffset();
            var headerToSend = "GMT" + ((offset >= 0) ? ("-" + (offset / 60)) : ("+" + (offset / -60))) + " " + dataSet.header;
            console.log(headerToSend);
            var dataH = new Uint8Array(1);
            dataH[0] = COMMAND_SET_HEADER;
            console.log(dataH);
            ble.write(dev, UUID_SERVICE, UUID_CHARACTERISTIC, dataH.buffer, () => { }, onError);

            console.log("for: " + headerToSend);
            for (var x of headerToSend) {
                console.log("for: " + x);
                senWithDelay(dev, x, DELAY_TIME * i++);
            }

            magicNumber++;
            console.log("send ff ");
            setTimeout(function () {
                console.log("send ff 2");
                var dataFF = new Uint8Array(1);
                dataFF[0] = END_LINE_CHAR;
                console.log(dataFF);
                ble.write(dev, UUID_SERVICE, UUID_CHARACTERISTIC, dataFF.buffer, () => { console.log("header sended"); }, onError);
            }, DELAY_TIME * i++);


        } else if (magicNumber == 1) {
            //SEND RESET
            console.log("SEND RESET");
            var dataR = new Uint8Array(1);
            dataR[0] = COMMAND_RESET;
            console.log(dataR);
            magicNumber++;
            ble.write(dev, UUID_SERVICE, UUID_CHARACTERISTIC, dataR.buffer, () => { console.log("RESET SEND"); }, onError);

        } else if (magicNumber == 2) {
            console.log("config setted - ble.stopNotification");
            ble.stopNotification(dev, UUID_SERVICE, UUID_CHARACTERISTIC,
                (msj) => {
                    console.log("MSJ:" + msj);
                    ble.disconnect(dev, () => {
                        console.log("config setted- disconnect");
                        alert(getMessage("ConfigSuccess"));
                        mostrarPanel(PANEL_HOME);
                    }, onError)
                },
                (err) => { console.log("ERR:" + err) }
            );
        }
    }, onError);

    document.getElementById("textLoading").innerText = getMessage("SettingDevice");

    ble.writeWithoutResponse(device, UUID_SERVICE, UUID_CHARACTERISTIC, setDateTime.buffer, () => {
        document.getElementById("textLoading").innerText = getMessage("SettingDevice");
    }, onError);
}

function senWithDelay(dev, letter, time) {
    setTimeout(function () {
        console.log("send letter " + letter);
        console.log("send letter " + stringToBytes(letter));
        ble.write(dev, UUID_SERVICE, UUID_CHARACTERISTIC, stringToBytes(letter), () => { }, onError);
    }, time);
}

function enviarDatos2() {
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

    document.getElementById("textLoading").innerText = getMessage("SettingDevice");
    //console.log("set date");
    //console.log(setDateTime);
    ble.writeWithoutResponse(device, UUID_SERVICE, UUID_CHARACTERISTIC, setDateTime, () => {

        //Logueo lo que devuelve el SET DATE TIME
        ble.read(device, UUID_SERVICE, UUID_CHARACTERISTIC, (buffer_in) => {

            var i = 1;
            var headerToSend = (dataSet.header);
            //console.log("Send header: " + headerToSend);
            var data = new Uint8Array(1);
            data[0] = COMMAND_SET_HEADER;

            ble.write(device, UUID_SERVICE, UUID_CHARACTERISTIC, data, () => {

                for (var x of headerToSend) {
                    senWithDelay(x, DELAY_TIME * i++);
                }
                setTimeout(function () {
                    //console.log("SEND FF");
                    data = new Uint8Array(1);
                    data[0] = END_LINE_CHAR;
                    ble.write(device, UUID_SERVICE, UUID_CHARACTERISTIC, data, () => { }, onError);

                    //Espero el ff
                    ble.read(device, UUID_SERVICE, UUID_CHARACTERISTIC, (buffer_in) => {
                        // console.log("RECEIVE DATE");
                        console.log(buffer_in);
                        //bluetoothSerial.unsubscribeRawData(() => { logger("unsubscribeRawData") }, onError);
                        //document.getElementById("textLoading").innerText = "Reset device";
                        data = new Uint8Array(1);
                        data[0] = COMMAND_RESET;

                        ble.write(device, UUID_SERVICE, UUID_CHARACTERISTIC, data, () => {
                            //Espero a lo que devuelve el RESET
                            ble.read(device, UUID_SERVICE, UUID_CHARACTERISTIC, (buffer_in) => {
                                console.log(buffer_in);
                                //bluetoothSerial.unsubscribeRawData(() => { logger("unsubscribeRawData") }, onError);
                                ble.disconnect(device, () => { logger("bluettoth desconected") }, onError);
                                alert(getMessage("ConfigSuccess"));
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

/* funcion cambio idioma */

function cambiarIdioma(idiomaNuevo) {
    if (idioma == idiomaNuevo) return;
    switch (idiomaNuevo) {
        case IDI_ES:
            //HOME
            document.getElementById("bGetData").innerText = "Obtener datos del dispositivo";
            document.getElementById("bSetData").innerText = "Configurar dispositivo";
            //LOADING
            document.getElementById("textLoading").innerText = "Cargando aplicación ...";
            //SET
            document.getElementById("tituloSet").innerText = "Establecer encabezado\n y marca de tiempo";
            document.getElementById("set_header").innerText = "Encabezado (1900 caracteres máximo)";
            document.getElementById("bImportHeader").innerText = "Importar";
            document.getElementById("set_timestamp").innerText = "Fecha y hora";
            document.getElementById("bSetBack").innerText = "Atrás";
            document.getElementById("bSetNext").innerText = "Siguiente";
            //INFO
            document.getElementById("info_titulo").innerText = "Antes de continuar, presione el botón del dispositivo para encenderlo. La luz roja del dispositivo debe parpadear.";
            document.getElementById("bInfoBack").innerText = "Atrás";
            document.getElementById("bInfoNext").innerText = "Siguiente";
            //CONEXION
            document.getElementById("con_titulo").innerText = "Seleccione dispositivo";
            document.getElementById("con_col_id").innerText = "ID";
            document.getElementById("con_col_name").innerText = "Nombre";
            document.getElementById("con_col_status").innerText = "Señal";
            document.getElementById("bConBack").innerText = "Atrás";
            document.getElementById("bConNext").innerText = "Siguiente";
            //GET
            document.getElementById("get_device_id").innerText = "ID Dispositivo: ";
            document.getElementById("get_header").innerText = "Encabezado";
            document.getElementById("get_data").innerText = "Datos";
            document.getElementById("get_col_date").innerText = "Fecha";
            document.getElementById("get_col_hour").innerText = "Hora";
            document.getElementById("get_col_temp").innerText = "Temp";
            document.getElementById("bExport").innerText = "Exportar";
            document.getElementById("bGetHome").innerText = "Inicio";
            //ERROR
            document.getElementById("error_tit1").innerText = "Error de bluetooth";
            document.getElementById("error_tit2").innerText = "Por favor, active el bluetooth y reinicie la aplicación";
            //CONTACT
            document.getElementById("bGoHome").innerText = "Inicio";
            document.getElementById("cont_titulo").innerText = "Contacto";

            idioma = idiomaNuevo;
            break;
        case IDI_EN:
            //HOME
            document.getElementById("bGetData").innerText = "Get device data";
            document.getElementById("bSetData").innerText = "Configure device";
            //LOADING
            document.getElementById("textLoading").innerText = "Loading app ...";
            //SET
            document.getElementById("tituloSet").innerText = "Set header and timestamp";
            document.getElementById("set_header").innerText = "Header (1900 characters max)";
            document.getElementById("bImportHeader").innerText = "Import";
            document.getElementById("set_timestamp").innerText = "Date and time";
            document.getElementById("bSetBack").innerText = "Back";
            document.getElementById("bSetNext").innerText = "Next";
            //INFO
            document.getElementById("info_titulo").innerText = "Before continuing, turn on the device pressing the button. The device's red light should blink.";
            document.getElementById("bInfoBack").innerText = "Back";
            document.getElementById("bInfoNext").innerText = "Next";
            //CONEXION
            document.getElementById("con_titulo").innerText = "Select device";
            document.getElementById("con_col_id").innerText = "ID";
            document.getElementById("con_col_name").innerText = "Name";
            document.getElementById("con_col_status").innerText = "Signal";
            document.getElementById("bConBack").innerText = "Back";
            document.getElementById("bConNext").innerText = "Next";
            //GET
            document.getElementById("get_device_id").innerText = "Device ID: ";
            document.getElementById("get_header").innerText = "Header";
            document.getElementById("get_data").innerText = "Data";
            document.getElementById("get_col_date").innerText = "Date";
            document.getElementById("get_col_hour").innerText = "Hour";
            document.getElementById("get_col_temp").innerText = "Temp";
            document.getElementById("bExport").innerText = "Export";
            document.getElementById("bGetHome").innerText = "Home";
            //ERROR
            document.getElementById("error_tit1").innerText = "Error with bluetooth";
            document.getElementById("error_tit2").innerText = "Please activate bluetooth and reopen the app";
            //CONTACT
            document.getElementById("bGoHome").innerText = "Home";
            document.getElementById("cont_titulo").innerText = "Contact";
            //document.getElementById("").innerText = "";
            idioma = idiomaNuevo;
            break;
    }

}

function getMessage(id) {
    switch (id) {
        case "errorBluetooth": return (idioma == IDI_EN) ? "Error: Bluetooth not enabled" : "Error: el Bluetooth está desactivado";
        case "Paired": return (idioma == IDI_EN) ? "Paired" : "Emparejado";
        case "Near": return (idioma == IDI_EN) ? "Near" : "Cercano";
        case "Loading": return (idioma == IDI_EN) ? "Loading ..." : "Cargando ...";
        case "Connecting": return (idioma == IDI_EN) ? "Connecting ..." : "Conectando ...";
        case "Connect": return (idioma == IDI_EN) ? "Connect to " : "Conectar a ";
        case "SendingData": return (idioma == IDI_EN) ? "Sending data ... " : "Enviando datos ... ";
        case "GettingData": return (idioma == IDI_EN) ? "Getting data ... " : "Recibiendo datos ... ";
        case "ConfigSuccess": return (idioma == IDI_EN) ? "Device was succesfully configured" : "El dispositivo fue configurado correctamente";
        case "SettingDevice": return (idioma == IDI_EN) ? "Setting device ..." : "Configurando dispositivo ...";
        case "ProcesingData": return (idioma == IDI_EN) ? "Processing data" : "Procesando datos";
        case "errorPermissions1": return (idioma == IDI_EN) ? "Error with app permissions" : "Error con los permisos de la aplicación";
        case "errorPermissions2": return (idioma == IDI_EN) ? "Please restart and give the app the necessary permissions" : "Por favor, reinicie y otorgue a la app los permisos necesarios";
        case "errorSetting": return (idioma == IDI_EN) ? "There was a problem setting the device's clock, please retry setting. If the problem persist, contact support " : "Hubo un problema al configurar el reloj del dispositivo, por favor reintente. Si el problema persiste, comuníquese con soporte ";
        default: return "<<MESSAGE_ID NOT FOUND>>";
    }
}

function stringToBytes(string) {
    var array = new Uint8Array(string.length);
    for (var i = 0, l = string.length; i < l; i++) {
        array[i] = string.charCodeAt(i);
    }
    return array.buffer;
}

//Funciones de contacto
function contactWsp() { window.open("https://wa.me/5491132272283"); }
function contactWeb() { window.open("https://www.datametric.com.ar"); }
function contactEmail() { window.open('mailto:contact@datametric.com.ar'); }