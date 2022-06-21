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

try {
    firebase.initializeApp(config);
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
            //firebase.auth.GithubAuthProvider.PROVIDER_ID,
            //firebaseui.auth.AnonymousAuthProvider.PROVIDER_ID,
            // {
            //     provider: firebase.auth.PhoneAuthProvider.PROVIDER_ID,
            //     recaptchaParameters: {
            //         type: 'image',
            //         //size: 'invisible',
            //         badge: 'bottonleft'
            //     }
            // }
        ],
        tosUrl: 'tos.html',
        privacyPolicyUrl: function () {
            window.location.assign('tos.html');
        }
    };
    ui = new firebaseui.auth.AuthUI(firebase.auth());
    ui.start('#firebaseui-auth-container', uiConfig);
}

function loadSpecialistsFromFB() {
    return new Promise((resolve, reject) => {
        firebase.database().ref("Users").orderByChild("esEspecialista").equalTo(true).on("value", especialistas => {
            let specialists = addNewFields(especialistas);
            resolve(specialists);
        });
    });
}

function loadUserFromFB(userId) {
    return new Promise((resolve, reject) => {
        firebase.database().ref("Users").orderByKey().equalTo(userId).on("value", user => {
            resolve(addNewFields(user));
        });
    });
}

function addNewFields(userList) {
    let result = {};
    let count = 0;
    userList.forEach(user => {
        let newUser = user.val();
        newUser.key = user.key;
        if (newUser.evaluaciones) {
            newUser.eval = (newUser.evaluaciones.cantidad > 0) ? ((newUser.evaluaciones.e1 + (newUser.evaluaciones.e2 * 2) + (newUser.evaluaciones.e3 * 3) + (newUser.evaluaciones.e4 * 4) + (newUser.evaluaciones.e5 * 5)) / newUser.evaluaciones.cantidad).toFixed(1) : 0;
        }
        result[user.key] = newUser;
        count++;
    });
    return count > 0 ? result : null;
}

function loadEventsFromFB() {
    return new Promise((resolve, reject) => {
        firebase.database().ref("Eventos").on("value", eventos => {
            resolve(getObjectKey(eventos));
        });
    });
}

function updateEventsInFB(order) {
    firebase.database().ref("Eventos/" + order.transaction.split("_")[0] + "/capacidad").set(order.capacity);
    firebase.database().ref("Transacciones/" + order.transaction).set(order);
}

function loadOfertasFromFB() {
    return new Promise((resolve, reject) => {
        firebase.database().ref("Ofertas").on("value", ofertas => {
            resolve(getObjectKey(ofertas));
        });
    });
}

function updateOfertaInFB(newKeyoffert) {
    //let newKey = firebase.database().ref().child("Citas").push().key;
    firebase.database().ref("Citas/" + newKey).update(offert);
}

function getObjectKey(obj) {
    let newObjList = {};
    obj.forEach(o => {
        let key = o.key;
        let newObj = o.val();
        newObj.key = key;
        newObjList[key] = newObj;
    });
    return newObjList;
}

function loadCitasFromFB(userId) {
    return new Promise((resolve, reject) => {
        firebase.database().ref("Citas").orderByChild("specialist").equalTo(userId).on("value", citas => {
            resolve(citas.val());
        });
    });
}

function loadUserAppointmentFromFB(userId) {
    return new Promise((resolve, reject) => {
        firebase.database().ref("Citas").once("value", data => {
            let result = {};
            data.forEach(appointment => {
                let newAppointment = appointment.val();
                if (newAppointment.client.email == userId) {
                    newAppointment.key = appointment.key;
                    result[newAppointment.key] = newAppointment;
                }
            });
            resolve(result);
        });
    });
}

function updateCitaInFB(cita, order) {
    firebase.database().ref("Citas/" + cita.transaction).set(cita);
    firebase.database().ref("Transacciones/" + order.transaction).set(order);
}

function loadTransaccionesFromFB() {
    return new Promise((resolve, reject) => {
        firebase.database().ref("Transacciones").on("value", transacciones => {
            resolve(transacciones.val());
        });
    });
}

function saveInvitationToFB(specialistId, invitacion) {
    let newKey = firebase.database().ref().child("Especialistas/" + specialistId + "/invitaciones/").push().key;
    firebase.database().ref("Especialistas/" + specialistId + "/invitaciones/" + newKey).set(invitacion);
}

function updateUserPersonalToFB(userId, dato) {
    firebase.database().ref("Users/" + userId).update(dato);
}

function updateUserLaboralToFB(userId, dato) {
    firebase.database().ref("Users/" + userId + "/laboral").update(dato);
}

// function updateUserHorarioToFB(userId, dato) {
//     firebase.database().ref("Users/" + userId + "/horario").update(dato);
// }

function setAuthUser(currentUser, credential, redirectUrl) {
    let userName = currentUser.displayName.split(" ")[0];
    let userPicture = '<img src="' + currentUser.photoURL + '" class="img-auth">';
    document.getElementById('loginLink').innerHTML = '<a href="#" ng-click="logout()" title="Cerrar sesión">' + userName + ' ' + userPicture + '</a>';
    console.log(currentUser, credential, redirectUrl);
}

// function logoutAutUser() {
//     firebase.auth().signOut().then(function () {
//         //ui = null;
//     });
// }

function updateEditedOffertInFB(offert, key) {
    let newKey = !key ? firebase.database().ref().child("Ofertas/").push().key : key;
    firebase.database().ref("Ofertas/" + newKey).update(offert);
}

function updateOffertInFB(offertId, rentas, order) {
    rentas.forEach(renta => {
        let newKey = firebase.database().ref().child("Ofertas/" + offertId + "/rentas/").push().key;
        firebase.database().ref("Ofertas/" + offertId + "/rentas/" + newKey).update(renta);
    })
    firebase.database().ref("Transacciones/" + order.transaction).set(order);
}

function deleteCurrentOffert(key) {
    firebase.database().ref("Ofertas/" + key).remove();
}

function updateEvent() {
    let event = {
        "nombre": document.getElementById("inputEventName").value,
        "direccion": document.getElementById("inputEventAddress").value,
        "localizacion": document.getElementById("inputEventLocation").value,
        "costo": document.getElementById("inputEventCost").value,
        "foto": document.getElementById("inputEventFoto").value,
        "fecha": document.getElementById("inputEventFecha").value,
        "hora": document.getElementById("inputEventHora").value,
        "descripcion": document.getElementById("inputEventDescription").value
    }
    updateEventInFB(event)
}

function updateEventInFB(event) {
    let newKey = firebase.database().ref().child("Eventos").push().key;
    firebase.database().ref("Eventos/" + newKey).set(event);
}

//#region ********************* Cargar ficheros en Firebase *********************

function setFileUploadEvent() {
    /*document.getElementById('inputOffertFotoIn').addEventListener('change', function (event) {
        event.preventDefault();
        showImagePreview(event);
        //loadFileToFB(file, "Eventos/");
    });
    document.getElementById('inputFotoLocal').addEventListener('change', function (event) {
        event.preventDefault();
        showImagePreview(event);
        //loadFileToFB(file, "Especialistas/");
    });*/
}

function showImagePreview(event) {
    let file = event.target.files[0];
    let foto = new FileReader();
    foto.onload = function (e) {
        document.getElementById('showSpecialistPhoto').setAttribute("src", e.target.result);
    };
    foto.readAsDataURL(file);
}

setFileUploadEvent();

function loadFileToFB(file, ref, fileURL) {
    let refStorage = firebase.storage().ref(ref).child(file.name).put(file)
        .then(snapshot => {
            return snapshot.ref.getDownloadURL();
        })
        .then(downloadURL => {
            fileURL(downloadURL);
            return downloadURL;
        })
        .catch(error => {
            console.log(`Failed to upload file - ${error}`);
        })
}

function ploadFileToFB(file, ref) {
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

function getFileFromFB(fileName, fileURL) {
    let refStorage = firebase.storage().ref(fileName);
    refStorage.getDownloadUrl().then(function (url) {
        fileURL(url);
    });
}

function deleteFileInFB(fileName, ref) {
    let refStorage = firebase.storage().ref(ref).child(fileName);
    refStorage.delete().then(function () {
        confirmation("Alerta", "Fichero eliminado exitosamente!");
    });
}

//#endregion