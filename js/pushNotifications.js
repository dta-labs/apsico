// Retrieve Firebase Messaging object.
const messaging = firebase.messaging();
var actualToken;

// Add the public key generated from the console here.
messaging.usePublicVapidKey("BFfDgWur30XrAJqVz8kkbhqNyDFx37ikhW2mzUIt4tMUkDD8b8INEzXlmUhJJAmtjBkS8J8G13NeLcPxr8PRIiw");

function requestMessagingPermission(usuario) {
    messaging.requestPermission()
        .then(function () {
            console.log('Se han aceptado las notificaciones');
            return messaging.getToken();
        })
        .then(function (token) {
            if (token) {
                actualToken = token;
                guardarToken(token, usuario)
            } else {
                // anulaToken();
                console.log('Error de token!');
            }
        })
        .catch(function (err) {
            // mensajeFeedback(err);
            console.log('No se ha recibido permiso / token: ', err);
        });
}

function guardarToken(token, usuario) {
    firebase.database().ref("usuarios/" + usuario.key).update({
        token: token
    });
    console.log("Token -> " + token);
}

messaging.onMessage(function (payload) {
    console.log("Mensaje recibido con el sitio activo", payload);
    mensajeFeedback(payload.notification.title + ': ' + payload.notification.body);
});

// Callback fired if Instance ID token is updated.
// messaging.onTokenRefresh(() => {
//     messaging.getToken().then((refreshedToken) => {
//         console.log('Token refreshed.');
//         // Indicate that the new Instance ID token has not yet been sent to the
//         // app server.
//         setTokenSentToServer(false);
//         // Send Instance ID token to app server.
//         sendTokenToServer(refreshedToken);
//         // ...
//     }).catch((err) => {
//         console.log('Unable to retrieve refreshed token ', err);
//         showToken('Unable to retrieve refreshed token ', err);
//     });
// });

