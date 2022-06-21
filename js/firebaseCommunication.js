var ui;
var uiConfig;
var config = {
    apiKey: "AIzaSyAOVbxtQ-kAn_B8vJ8JbmLQev4ZXfYU8Ac",
    authDomain: "apsicodb.firebaseapp.com",
    databaseURL: "https://apsicodb.firebaseio.com",
    projectId: "apsicodb",
    storageBucket: "apsicodb.appspot.com",
    messagingSenderId: "669819564345",
    appId: "1:669819564345:web:bbdcc3b00d7d357e"
};
var dbUsuarios;
var dbOfertas;
var dbTransacciones;

try {
    firebase.initializeApp(config);
    dbUsuarios = firebase.database().ref("usuarios");
    dbOfertas = firebase.database().ref("ofertas");
    dbTransacciones = firebase.database().ref("transacciones");
} catch (e) {
    console.error("Error de inicialización de Firebase", e.stack)
}

initializeFirebaseUI();

function initializeFirebaseUI() {
    uiConfig = {
        callbacks: {
            signInSuccessWithAuthResult: function (currentUser, credential, redirectUrl) {
                //setAuthUser(currentUser, credential, redirectUrl);
                return false;
            },
            uiShown: function () {
                //document.getElementById('loader').style.display = 'none';
            }
        },
        signInSuccessUrl: '<url-to-redirect-to-on-success>',
        signInOptions: [
            firebase.auth.GoogleAuthProvider.PROVIDER_ID,
            firebase.auth.EmailAuthProvider.PROVIDER_ID,
            //firebase.auth.FacebookAuthProvider.PROVIDER_ID,
            //firebase.auth.TwitterAuthProvider.PROVIDER_ID,
        ],
        tosUrl: 'tos.html',
        privacyPolicyUrl: function () {
            window.location.assign('tos.html');
        }
    };
    ui = new firebaseui.auth.AuthUI(firebase.auth());
    ui.start('#firebaseui-auth-container', uiConfig);
}

// #region USUARIO

function loadUserFromFB(userId) {
    return new Promise((resolve, reject) => {
        dbUsuarios.orderByKey().equalTo(userId).on("value", user => {
            if (user.val()) {
                resolve(addObjectKey(user));
            } else {
                resolve(null);
            }
        });
    });
}

function loadUserWorkersFromFB() {
    return new Promise((resolve, reject) => {
        dbUsuarios.on("value", users => {
            if (users.val()) {
                resolve(addObjectKey(users));
            } else {
                resolve(null);
            }
        });
    });
}

function updateUserPersonalToFB(userId, dato) {
    firebase.database().ref("usuarios/" + userId).update(dato);
}

function updateUserLaboralToFB(userId, dato) {
    firebase.database().ref("usuarios/" + userId + "/laboral").update(dato);
}

function loadUserTransactionsFromFB(userId, tipo) {
    return new Promise((resolve, reject) => {
        dbTransacciones.orderByChild("idClient").equalTo(userId).once("value", data => {
            let result = {};
            data.forEach(appointment => {
                let newAppointment = appointment.val();
                if (newAppointment.tipo == tipo) {
                    newAppointment.key = appointment.key;
                    result[newAppointment.key] = newAppointment;
                }
            });
            resolve(result);
        });
    });
}

function updateUserStatus(usuario) {
    firebase.database().ref("usuarios/" + usuario.key).update({
        activo: usuario.activo
    });
}

function updateUserDisponibility(usuario, estadoLlamada) {
    firebase.database().ref("usuarios/" + usuario.key).update({
        disponibilidad: usuario.disponibilidad,
        estadoLlamada: estadoLlamada,
        direccionLlamada: 'Entrante'
    });
}

// #endregion USUARIO

// #region ESPECIALISTAS

function loadSpecialistsFromFB() {
    return new Promise((resolve, reject) => {
        dbUsuarios.orderByChild("laboral/esEspecialista").equalTo(true).on("value", especialistas => {
            resolve(addObjectKey(especialistas));
        });
    });
}

function sendSpecialistMeetingRequest(specialistId) {
    firebase.database().ref("usuarios/" + specialistId).update({
        estadoLlamada: "Marcando",
        disponibilidad: false,
        identificadorLLamada: new Date().getTime()
    });
}

function updateSpecialistScore(specialistKey, scoreId) {
    dbUsuarios.child(specialistKey).once("value", especialistas => {
        let id = 'e' + scoreId;
        let score = especialistas.val().laboral && especialistas.val().laboral.evaluaciones && especialistas.val().laboral.evaluaciones[id] ? especialistas.val().laboral.evaluaciones[id] + 1 : 1;
        dbUsuarios.child(`${specialistKey}/laboral/evaluaciones/${id}`).set(score);
    });
}

// #endregion ESPECIALISTAS

// #region OFERTAS

function loadOfertsFromFB(tipoOferta) {
    return new Promise((resolve, reject) => {
        dbOfertas.orderByChild("tipoOferta").equalTo(tipoOferta).once("value", ofertas => {
            resolve(addObjectKey(ofertas));
        });
    });
}

function loadOfertsByIdFromFB(offertId) {
    return new Promise((resolve, reject) => {
        dbOfertas.orderByKey().equalTo(offertId).once("value", ofertas => {
            resolve(addObjectKey(ofertas));
        });
    });
}

function loadUserOfertsFromFB(userId, tipoOferta) {
    return new Promise((resolve, reject) => {
        dbOfertas.orderByChild("owner").equalTo(userId).on("value", ofertas => {
            let result = {};
            ofertas.forEach(oferta => {
                if (oferta.tipoOferta == tipoOferta) {
                    result[oferta.key] = oferta;
                }
            });
            resolve(Object.keys(result).length > 0 ? result.val() : null);
        });
    });
}

function updateEditedOffertInFB(offert, key) {
    let newKey = !key ? dbOfertas.push().key : key;
    firebase.database().ref("ofertas/" + newKey).update(offert);
}

function deleteCurrentOffertInFB(key) {
    firebase.database().ref("ofertas/" + key).remove();
}

// #endregion OFERTAS

// #region TRANSACCIONES

function loadTransactionsByTypeFromFB(idOferta, tipo) {
    return new Promise((resolve, reject) => {
        dbTransacciones.orderByChild("idOferta").equalTo(idOferta).on("value", transacciones => {
            let result = {};
            transacciones.forEach(transaccion => {
                if (transaccion.val().tipo == tipo) {
                    let newTransaction = transaccion.val();
                    newTransaction["key"] = transaccion.key;
                    result[transaccion.key] = newTransaction;
                }
            });
            resolve(Object.keys(result).length > 0 ? result : null);
        });
    });
}

function loadUsersTransactionsByTypeFromFB(idUser, tipo) {
    return new Promise((resolve, reject) => {
        dbTransacciones.orderByChild("owner").equalTo(idUser).on("value", transacciones => {
            let result = {};
            transacciones.forEach(transaccion => {
                if (transaccion.val().tipo == tipo) {
                    let newTransaction = transaccion.val();
                    newTransaction["key"] = transaccion.key;
                    result[transaccion.key] = newTransaction;
                }
            });
            resolve(Object.keys(result).length > 0 ? result : null);
        });
    });
}

function loadSpecialistTransactionsFromFB(userId) {
    return new Promise((resolve, reject) => {
        // dbOfertas.orderByChild("owner").equalTo(userId).once("value", offerts => {
        //     let transactionsArray = [];
        //     let offertsArr = Object.values(addObjectKey(offerts));
        //     offertsArr.forEach(offert => {
        //         transactionsArray.push(loadOffertTransactions(offert.key));
        //     });
        //     Promise.all(transactionsArray).then(transactions => {
        //         let result = [];
        //         let index = 0;
        //         offertsArr.forEach(offert => {
        //             result = transactions[index] ? result.concat(Object.values(transactions[index])) : result;
        //             index++;
        //         });
        //         resolve(result.length > 0 ? result : null);
        //     });

        // });
        dbTransacciones.orderByChild("owner").equalTo(userId).on("value", transactions => {
            resolve(transactions.val());
        });
    });
}

function loadOffertTransactions(offertKey) {
    return new Promise((resolve, reject) => {
        dbTransacciones.orderByChild("idOferta").equalTo(offertKey).on("value", transacciones => {
            resolve(transacciones.val());
        });
    });
}

function loadTransactionsToPay() {
    return new Promise((resolve, reject) => {
        // dbTransacciones.orderByChild("pagado").equalTo(true).on("value", transacciones => {
        dbTransacciones.on("value", transacciones => {
            resolve(Object.values(addObjectKey(transacciones)));
        });
    });
}

function updatePaymentInFB(transaccion) {
    dbTransacciones.child(`${transaccion.key}/transferida`).set(transaccion.transferida);
}

function updateTransaccionInFB(transaccion) {
    let newTransaccion = dbTransacciones.push();
    newTransaccion.set(transaccion);
    return newTransaccion.key;
}

function updateScore(appointmentKey) {
    dbTransacciones.child(`${appointmentKey}/evaluado`).set(true);
}

// #endregion TRANSACCIONES

// #region COMUNES

function addObjectKey(obj) {
    let newObjList = {};
    obj.forEach(o => {
        let key = o.key;
        let newObj = o.val();
        newObj.key = key;
        if (newObj.laboral && newObj.laboral.evaluaciones) {
            let evaluaciones = newObj.laboral.evaluaciones;
            let cantidad = (evaluaciones.e1 ? evaluaciones.e1 : 0) + 
                            (evaluaciones.e2 ? evaluaciones.e2 : 0) + 
                            (evaluaciones.e3 ? evaluaciones.e3 : 0) + 
                            (evaluaciones.e4 ? evaluaciones.e4 : 0) + 
                            (evaluaciones.e5 ? evaluaciones.e5 : 0);
            newObj.eval = (cantidad > 0) ? parseFloat((((evaluaciones.e1 ? evaluaciones.e1 : 0) + (evaluaciones.e2 ? evaluaciones.e2 * 2 : 0) + (evaluaciones.e3 ? evaluaciones.e3 * 3 : 0) + (evaluaciones.e4 ? evaluaciones.e4 * 4 : 0) + (evaluaciones.e5 ? evaluaciones.e5 * 5 : 0)) / cantidad).toFixed(1)) : 0;
        }
        newObjList[key] = newObj;
    });
    return newObjList;
}

function loadFileToFB(file, ref) {
    return new Promise((resolve, reject) => {
        if (file) {
            firebase.storage().ref(ref).child(file.name).put(file)
                .then(snapshot => {
                    return snapshot.ref.getDownloadURL();
                })
                .then(downloadURL => {
                    resolve(downloadURL);
                    return downloadURL;
                })
                .catch(error => {
                    console.log(`Failed to upload file - ${error}`);
                })
        } else {
            resolve("");
        }
    });
}

function deleteFileInFB(fileName, ref) {
    let refStorage = firebase.storage().ref(ref).child(fileName);
    refStorage.delete().then(function () {
        confirmation("Alerta", "Fichero eliminado exitosamente!");
    });
}

// #endregion COMUNES

