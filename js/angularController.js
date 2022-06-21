var app = angular.module("Administracion", ["ngRoute"]);
var startWorkTime = "08:00";
var endWorkTime = "19:00";
var daysOfWeek = [1, 2, 3, 4, 5, 6, 7];
var calendar;
var calendar2;
var lastProfilePhoto = "";
var lastCedulaPhotoFile = "";
var lastTituloPhotoFile = "";
var lastDiplomasPhotoFile = "";
var lastCredencialPhotoFile = "";
var lastOffertPhoto = "";
var lastEventPhoto = "";
var mp3;

app.config(function ($routeProvider) {
    $routeProvider
        .when("/", {
            template: "<p ng-init='showHome()' style='display: none;'>home</p>"
        })
        .when("/searchResult", {
            template: "<p ng-init='showSearchResult()' style='display: none;'>searchResult</p>"
        })
        .when("/services", {
            template: "<p ng-init='showServices()' style='display: none;'>services</p>"
        })
        .when("/hideServices", {
            template: "<p ng-init='hideServices()' style='display: none;'>hideServices</p>"
        })
        .when("/controlPanel", {
            template: "<p ng-init='setNewJobData()' style='display: none;'>controlPanel</p>"
        })
        .when("/login", {
            template: "<p ng-init='showLogin()' style='display: none;'>login</p>"
        })
        .when("/userProfile", {
            template: "<p ng-init='userProfile(0)' style='display: none;'>specialist</p>"
        })
        .when("/team", {
            template: "<p ng-init='showTeam()' style='display: none;'>specialist</p>"
        })
        .when("/rent", {
            template: "<p ng-init='showRent()' style='display: none;'>specialist</p>"
        })
        .when("/events", {
            template: "<p ng-init='showEvents()' style='display: none;'>specialist</p>"
        })
        .when("/userAppointments", {
            template: "<p ng-init='getUserAppointments()' style='display: none;'>specialist</p>"
        })
        .when("/userRents", {
            template: "<p ng-init='getUserRents()' style='display: none;'>specialist</p>"
        })
        .when("/userEvents", {
            template: "<p ng-init='getUserEvents()' style='display: none;'>specialist</p>"
        })
        .when("/specialistDates", {
            template: "<p ng-init='getSpecialistDates()' style='display: none;'>specialist</p>"
        })
        .when("/specialistOfferts", {
            template: "<p ng-init='getSpecialistOfferts()' style='display: none;'>specialist</p>"
        })
        .when("/specialistEvents", {
            template: "<p ng-init='getSpecialistEvents()' style='display: none;'>specialist</p>"
        })
        .when("/specialistTransactions", {
            template: "<p ng-init='getSpecialistTransactions(true)' style='display: none;'>specialist</p>"
        })
        .when("/help", {
            template: "<p ng-init='showHelp()' style='display: none;'>specialist</p>"
        })
        .when("/adminDates", {
            template: "<p ng-init='showAdminDates()' style='display: none;'>adminDates</p>"
        })
        .when("/notifications", {
            template: "<p ng-init='showNotifications()' style='display: none;'>showNotifications</p>"
        })
        .when("/payment", {
            template: "<p ng-init='showStripePaymentAprobal()' style='display: none;'>striprPaymentAprobal</p>"
        })
});

app.controller("ControladorPrincipal", function ($scope) {

    //#region ********************* UI *********************

    initPromises = () => {
        Promise.all([loadSpecialistsFromFB(), loadOfertsFromFB("Evento"), loadOfertsFromFB("Renta")]).then(promises => {
            $scope.listSpecialists = promises[0];
            $scope.listEvents = promises[1];
            $scope.listPublications = promises[2];
            showDisplay();
            $scope.showWindow("home");
            $scope.$apply(function () {
                $scope.selectedWindow = "home";
            });
            showWelcomePoppover();
        });
    };

    refreshData = () => {
        checkUsers();
        checkEvents();
        checkRents();
        checkPayedTransaction();
    }

    checkUsers = () => {
        dbUsuarios.orderByChild("laboral/esEspecialista").equalTo(true).on("value", especialistas => {
            $scope.listSpecialists = addObjectKey(especialistas);
            if ($scope.authUser) {
                delete $scope.listSpecialists[convertDotToDash($scope.authUser.email)];
            }
            $scope.specialists = $scope.listSpecialists;
            if ($scope.selectedWindow == 'specialistDetail') {
                $scope.showSpecialistDetails($scope.listSpecialists[$scope.specialist.key]);
            }
            if ($scope.estadoLlamada == "Marcando") {
                checkCallResponse($scope.listSpecialists[$scope.specialist.key]);
            }
            $scope.$apply();
        });
    }

    checkEvents = () => {
        dbOfertas.orderByChild("tipoOferta").equalTo("Evento").once("value", ofertas => {
            $scope.listEvents = addObjectKey(ofertas);
            $scope.$apply();
        });
    }

    checkRents = () => {
        dbOfertas.orderByChild("tipoOferta").equalTo("Renta").once("value", ofertas => {
            $scope.listPublications = addObjectKey(ofertas);
            $scope.$apply();
        });
    }

    checkPayedTransaction = () => {
        dbTransacciones.orderByKey().limitToLast(1).on("value", transacciones => {
            let lastTransaction = transacciones.val();
            let key = Object.keys(lastTransaction)[0];
            $scope.order = JSON.parse(localStorage.getItem("actualOrder"));
            if ($scope.order && $scope.order.token == lastTransaction[key].token && lastTransaction[key].cobrado) {
                createPurchaseTransaction($scope.order.type, true);
                updateEventCapacity();
                $scope.showWindow("clientConfirmModal");
                $scope.$apply();
                localStorage.removeItem("actualOrder");
                deleteElement("rentaStripeForm", "input");
                deleteElement("citaStripeForm", "input");
            }
        });
    }

    updateEventCapacity = () => {
        if ($scope.order.type == 'evento' || $scope.order.type == 'event') {
            delete $scope.listEvents[$scope.order.id].$$hashKey;
            $scope.listEvents[$scope.order.id].asistentes = $scope.listEvents[$scope.order.id].asistentes >= 0 ? $scope.listEvents[$scope.order.id].asistentes + $scope.order.reservations : $scope.order.reservations;
            updateEditedOffertInFB($scope.listEvents[$scope.order.id], $scope.order.id);
        }
    }

    deleteElement = (sform, ele) => {
        let list = document.getElementById(sform).getElementsByTagName(ele);
        for (var i = list.length - 1; 0 <= i; i--) {
            if (list[i] && list[i].parentElement) list[i].parentElement.removeChild(list[i]);
        }
    }

    refreshSpecialists = () => {
        loadSpecialistsFromFB().then(specialists => {
            $scope.listSpecialists = specialists;
            $scope.$apply();
        });
    }

    refreshOferts = (ofert, loadSpecialistOfert = false) => {
        loadOfertsFromFB(ofert).then(oferts => {
            if (ofert == "Evento") {
                $scope.listEvents = oferts;
                if (loadSpecialistOfert) {
                    $scope.getSpecialistEvents();
                }
            } else {
                $scope.listPublications = oferts;
                if (loadSpecialistOfert) {
                    $scope.getSpecialistOfferts();
                }
            }
            $scope.$apply();
        });
    }

    refreshOfertsInRealTime = () => {
        dbOfertas.orderByChild("tipoOferta").equalTo("Evento").on("value", oferts => {
            $scope.listEvents = addObjectKey(oferts);
            getActiveAvents();
            $scope.$apply();
        });
        dbOfertas.orderByChild("tipoOferta").equalTo("Renta").on("value", oferts => {
            $scope.listPublications = addObjectKey(oferts);
            $scope.publications = $scope.listPublications;
            $scope.$apply();
        });
    }

    $scope.showHome = () => {
        $scope.showWindow('home');
    }

    $scope.showSearchResult = () => {
        $scope.showWindow('searchResult');
    }

    $scope.showServices = () => {
        $scope.showWindow('services');
    }

    $scope.hideServices = () => {
        $scope.goBack();
        $scope.goBack();
    }

    $scope.showLogin = () => {
        $scope.showWindow('login');
    }

    $scope.showTeam = () => {
        $scope.showWindow('team');
    }

    $scope.showRent = () => {
        $scope.showWindow('rent');
    }

    $scope.showEvents = () => {
        $scope.showWindow('events');
    }

    $scope.showHelp = () => {
        $scope.showWindow('help');
    }

    $scope.showAdminDates = () => {
        $scope.showWindow("adminDates");
    }

    $scope.showAdminDateView = () => {
        $scope.showWindow("adminDates");
    }

    $scope.showNotifications = () => {
        $scope.showWindow("notifications");
    }

    $scope.showWindow = (windowsName = "home") => {
        $scope.selectedWindow = windowsName;
        // hideVideoCall();
        $scope.closeModals();
        $scope.searchMobile = true;
        switch (windowsName) {
            case "endLogin":
                endLogin();
                break;
            case "videoCall":
                let title = $scope.authUser ? "Consulta virtual" : "Prueba de <span id='testCallTimer'>30</span> seg";
                break;
            case "notifications":
                if ($scope.authUser) {
                    $scope.getSpecialistTransactions(false);
                }
                break;
        }
        $scope.areSpecialists = true;
        $scope.areEvents = true;
        $scope.arePublications = true;
        if ($scope.authUser) {
            delete $scope.listSpecialists[convertDotToDash($scope.authUser.email)];
        }
        $scope.specialists = $scope.listSpecialists;
        $scope.publications = $scope.listPublications;
        getActiveAvents();
        $scope.backWindow = $scope.selectedWindow;
        window.scrollTo(0, 0);
        navBarStyle(windowsName);
    };

    getActiveAvents = () => {
        $scope.events = [];
        for (i in $scope.listEvents) {
            if ($scope.listEvents[i].fechaHoraFin.split(" ")[0] >= $scope.today) {
                $scope.events.push($scope.listEvents[i]);
            }
        }
        let a = 0;
    }

    $scope.showStripePaymentAprobal = () => {
        stripePaymentAprobal();
    };

    endLogin = () => {
        if ($scope.authUser) {
            let opperation = JSON.parse(localStorage.getItem("opperation"));
            if (opperation) {
                switch (opperation.type) {
                    case "createNewOrder":
                        // $scope.showSpecialistDetails(opperation.data);
                        $scope.createNewOrder(opperation.data, opperation.date);
                        break;
                    case "createNewBuyOrder":
                        $scope.continueBuyOrder(true);
                        break;
                    case "createNewEventOrder":
                        $scope.continueBuyOrder(false);
                        // $scope.createNewReservationOrder();
                        break;
                }
                showDisplay();
            } else {
                $scope.showWindow("home");
            }
        }
    }

    navBarStyle = windowsName => {
        if (windowsName != "home") {
            $(".main-nav").removeClass("navbar-transparent");
            $(".main-nav").addClass("navbar-blue");
            $(".main-nav").removeClass("navbar-white-mobile");
        }
    };

    $scope.clearNotifications = () => {
        $scope.authUser.notificaciones = today();
        updateUserPersonalToFB($scope.authUser.key, $scope.authUser);
    }

    $scope.showClientDetails = (idClient, date) => {
        loadUserFromFB(idClient).then(selectedClient => {
            $scope.clientDetail = selectedClient[idClient];
            $scope.clientDetail.appointment = date.key;
            $scope.clientDetail.fechaHoraInicio = date.fechaHoraInicio;
            if (screen.width < 480) {
                $("#clientDetailsModal").modal("show");
            }
        });
    };

    $scope.goBack = () => {
        // if ($scope.selectedWindow == "jobModal" && $scope.perfilPageNav > 0) {
        //     $scope.perfilPageNav = 0;
        // } else {
        //     $scope.showWindow($scope.backWindow);
        // }
        window.history.back();
    };

    //#endregion

    //#region ********************* User management *********************

    listenUserStatus = () => {
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                $scope.$apply(function () {
                    $scope.authUser = user;
                    setAuthImg();
                    loadUserData(user, true);
                });
                showWelcomePoppover();
            } else {
                $scope.$apply(function () {
                    $scope.authUser = null;
                });
                //initializeFirebaseUI();
            }
        });
    };

    loadUserData = (user, changeWindow) => {
        loadUserFromFB(convertDotToDash(user.email)).then(selectedUser => {
            if (selectedUser) {
                setAuthUserData(user, selectedUser);
            } else {
                let dato = {
                    key: convertDotToDash(user.email),
                    nombre: $scope.authUser.displayName,
                    email: $scope.authUser.email,
                    foto: $scope.authUser.photoURL,
                    esEspecialista: $scope.authUser.laboral ? $scope.authUser.laboral.esEspecialista : false,
                    direccion: "",
                    sexo: "",
                    tipoUsuario: "usuario",
                    activo: true
                };
                updateUserPersonalToFB(convertDotToDash(user.email), dato);
                $scope.authUser = dato;
            }
            requestMessagingPermission($scope.authUser);
            if (changeWindow) {
                $scope.showWindow("endLogin");
            }
            // $scope.userProfile();
        });
    }

    setAuthUserData = (user, selectedUser) => {
        let key = convertDotToDash(user.email);
        $scope.authUser = selectedUser[key];
        $scope.authUser["email"] = user.email;
        // $scope.tipoUsuario = !$scope.laboral ? 0 : $scope.laboral.esEspecialist ? 1 : 0;
        $scope.tipoUsuario = $scope.authUser.tipoUsuario == "especialista" ? 1 : $scope.authUser.tipoUsuario == "anunciante" ? 2 : 0;
        loadAuthUserDataFromFB();
        $scope.getSpecialistTransactions();
    }

    loadAuthUserDataFromFB = () => {
        dbUsuarios.orderByKey().equalTo($scope.authUser.key).on("value", user => {
            if (user.val()) {
                $scope.authUser = addObjectKey(user)[$scope.authUser.key];
                checkForIncomingCall();
            }
        });
    }

    setAuthImg = () => {
        document.getElementById("imgAuthMobil").src = $scope.authUser.photoURL;
        document.getElementById("imgAuthPC").src = $scope.authUser.photoURL;
    };

    showWelcomePoppover = () => {
        // let popoverOn = $scope.authUser ? "welcomeMsg2" : "welcomeMsg1";
        // let popoverOff = $scope.authUser ? "welcomeMsg1" : "welcomeMsg2";
        // $('[data-toggle="' + popoverOn + '"]').popover("show");
        // $('[data-toggle="' + popoverOff + '"]').popover("hide");
        // setTimeout(function () {
        //     $('[data-toggle="' + popoverOn + '"]').popover("hide");
        // }, 5000);

        let popover = $scope.authUser ? "welcomeMsg2" : "welcomeMsg1";
        $('[data-toggle="' + popover + '"]').popover("show");
        setTimeout(function () {
            $('[data-toggle="' + popover + '"]').popover("hide");
        }, 7000);
    };

    $scope.isAnSpecialist = () => {
        return $scope.laboral ? $scope.laboral.esEspecialista : false;
    };

    $scope.isAnOffertant = () => {
        return true;
    };

    $scope.logout = () => {
        firebase.auth().signOut().then(function () {
            //ui = null;
            $scope.showWindow("home");
            $scope.authUser = null;
            $scope.tipoUsuario = 0;
            ui.start("#firebaseui-auth-container", uiConfig);
            //logoutAutUser();
            //document.getElementById("logout").style.display = "none";
        });
    };

    $scope.getSpecialistDates = () => {
        loadTransactionsByTypeFromFB($scope.authUser.key, "cita").then(citas => {
            if (citas) {
                $scope.specialistDates = Object.values(citas);
            }
            getSpecialistAppointmentCalendar();
            $scope.showWindow("adminDates");
            $scope.$apply();
        });
    };

    getSpecialistAppointmentCalendar = () => {
        $scope.specialist = $scope.authUser;
        updateSpecialistSchedule();
    }

    showSpecialistAppointmentCalendar = () => {
        let adminDateCalendar = document.getElementById("adminDateCalendar");
        let specialist = $scope.authUser;
        // $scope.specialist = specialist;
        adminDateCalendar.innerHTML = "";
        calendar2 = new FullCalendar.Calendar(adminDateCalendar, {
            plugins: ["interaction", "dayGrid", "timeGrid"],
            locale: "es",
            height: 350,
            width: 650,
            defaultDate: new Date(),
            selectable: true,
            eventLimit: true,
            navLinks: true,
            draggable: true,
            header: {
                left: "prev,next",
                center: "title",
                right: "dayGridMonth,timeGridDay",
            },
            defaultView: "dayGridMonth",
            businessHours: [{
                daysOfWeek: specialist.laboral.diasLaborables ? specialist.laboral.diasLaborables.split(",") : daysOfWeek,
                startTime: specialist.laboral.horaInicio ? specialist.laboral.horaInicio : startWorkTime,
                endTime: specialist.laboral.horaFin ? specialist.laboral.horaFin : endWorkTime,
            },],
            dateClick: function (info) {
                selectUnUsedDate(info, specialist);
            },
            events: getSpecialistSchedule(specialist.key),
        });

        calendar2.render();
    }

    selectUnUsedDate = (info, specialist) => {
        loadUsersTransactionsByTypeFromFB(convertDashToDot(specialist.key), "cita").then(result => {
            $scope.listDates = result;
            if (isElegibleDate(info.date, specialist.key)) {
                confirmUnUsedDate(info, specialist);
            } else {
                confirmation(
                    "Alerta",
                    "Lamentablemente este horario no está disponible, puede que ya esté reservado. Por favor seleccione un nuevo horario.",
                );
            }
        });
    };

    confirmUnUsedDate = (info, scheduleObject) => {
        let ed = info.dateStr ? easyDate(info.date) : info;
        // let ed = easyDate(info.date);
        $scope.$apply(function () {
            $scope.appointmentDate = ed;
            $scope.scheduleObject = scheduleObject;
            $scope.info = info;
        });
        $("#confirmUnUsedDateModal").modal("show");
    };

    $scope.getUserAppointments = () => {
        loadUserTransactionsFromFB(convertDashToDot($scope.authUser.key), "cita").then(citas => {
            $scope.myAppointments = [];
            let offertArray = [];
            let citasArr = Object.values(citas);
            citasArr.forEach(cita => {
                offertArray.push(loadUserFromFB(convertDotToDash(cita.idOferta)));
            });
            Promise.all(offertArray).then(specialists => {
                let index = 0;
                citasArr.forEach(cita => {
                    if (cita.idClient != cita.idOferta) {
                        cita.specialist = specialists[index][convertDotToDash(cita.idOferta)].nombre;
                        cita.enlaceVideoLlamada = specialists[index][convertDotToDash(cita.idOferta)].laboral.enlaceVideoLlamada;
                        $scope.myAppointments.push(cita);
                        if (cita.fechaHoraInicio.split(' ')[0] == $scope.today) {
                            $scope.eventoHoy = true;
                        }
                    }
                    index++;
                });
                $scope.showWindow("showUserAppointments");
                $scope.$apply();
            });
        });
    }

    $scope.setAppointmentToScore = (appointmentKey, specialistKey) => {
        $scope.scoreAppointment = appointmentKey;
        $scope.scoreSpecialist = specialistKey;
    }

    $scope.sendScore = (score) => {
        updateScore($scope.scoreAppointment);
        updateSpecialistScore($scope.scoreSpecialist, score);
        $scope.getUserAppointments();
    }

    $scope.getUserRents = () => {
        loadUserTransactionsFromFB(convertDashToDot($scope.authUser.key), "renta").then(citas => {
            $scope.myRents = [];
            let offertArray = [];
            let citasArr = Object.values(citas);
            citasArr.forEach(cita => {
                offertArray.push(loadOfertsByIdFromFB(cita.idOferta));
            });
            Promise.all(offertArray).then(specialists => {
                let index = 0;
                citasArr.forEach(cita => {
                    cita.renta = specialists[index][cita.idOferta].nombre;
                    $scope.myRents.push(cita);
                    index++;
                });
                $scope.showWindow("showUserRents");
                $scope.$apply();
            });
        });
    }

    $scope.getUserEvents = () => {
        if ($scope.authUser) {
            loadUserTransactionsFromFB(convertDashToDot($scope.authUser.key), "evento").then(citas => {
                $scope.myEvents = [];
                let offertArray = [];
                let citasArr = Object.values(citas);
                citasArr.forEach(cita => {
                    offertArray.push(loadOfertsByIdFromFB(cita.idOferta));
                });
                Promise.all(offertArray).then(specialists => {
                    let index = 0;
                    citasArr.forEach(cita => {
                        cita.evento = specialists[index][cita.idOferta].nombre;
                        $scope.myEvents.push(cita);
                        index++;
                    });
                    $scope.showWindow("showUserEvents");
                    $scope.$apply();
                });
            });
        }
    }

    $scope.getSpecialistTransactions = (show) => {
        // loadSpecialistTransactionsFromFB($scope.authUser.key).then(specialistTransactions => {
        dbTransacciones.orderByChild("owner").equalTo(convertDashToDot($scope.authUser.key)).on("value", transactions => {
            let specialistTransactions = transactions.val();
            $scope.specialistTransactions = [];
            $scope.specialistTransactionsNumber = 0;
            $scope.transationTotal = 0;
            $scope.transationDisponible = 0;
            $scope.transationTransito = 0;
            $scope.transationPendiente = 0;
            $scope.transactionToday = false;
            for (tran in specialistTransactions) {
                let transaction = specialistTransactions[tran];
                if (transaction.idClient != $scope.authUser.key) {
                    $scope.specialistTransactions.push(transaction);
                    $scope.transationTotal += parseInt(transaction.costo);
                    if (transaction.pagado && transaction.transferida) {
                        $scope.transationDisponible += parseInt(transaction.costo);
                    } else if (transaction.pagado) {
                        $scope.transationTransito += parseInt(transaction.costo);
                    } else {
                        $scope.transationPendiente += parseInt(transaction.costo);
                    }
                    if (transaction.fechaHoraInicio.split(' ')[0] >= $scope.today) {
                        $scope.specialistTransactionsNumber++;
                    }
                    if (transaction.fechaHoraInicio.split(' ')[0] == $scope.today) {
                        $scope.transactionToday = true;
                    }
                }
            }
            show ? $scope.showWindow("adminTransactions") : null;
            //$scope.$apply();
        });
    };

    $scope.usersAdministration = () => {
        loadUserWorkersFromFB().then(usuarios => {
            $scope.userWorkers = Object.values(usuarios);
            $scope.showWindow("usersAdministration");
            $scope.$apply();
        });
    }

    $scope.adminPayments = () => {
        loadTransactionsToPay().then(transacciones => {
            $scope.transacciones = addSpecialistName(transacciones);
            $scope.showWindow("adminPayments");
            $scope.$apply();
        });
    }

    addSpecialistName = (transacciones) => {
        transacciones.forEach(t => {
            t.nombre = findName(convertDotToDash(t.owner));
            t.CB = findCB(convertDotToDash(t.owner));
        });
        return transacciones;
    }

    findName = (id) => {
        for (let i in $scope.specialists) {
            if ($scope.specialists[i].key == id) {
                return $scope.specialists[i].nombre;
            } else if (convertDotToDash($scope.authUser.email) == id) {
                return $scope.authUser.nombre;
            }
        }
    }

    findCB = (id) => {
        for (let i in $scope.specialists) {
            if ($scope.specialists[i].key == id) {
                return $scope.specialists[i].laboral.cuentaBancaria;
            } else if (convertDotToDash($scope.authUser.email) == id) {
                return $scope.authUser.laboral.cuentaBancaria;
            }
        }
    }

    $scope.selectTransaccionToPay = (key) => {
        $scope.transacciones.forEach(t => {
            if (t.key == key) {
                $scope.payTransaccion = t;
            }
        })
    }

    $scope.comfirmPayment = () => {
        $scope.payTransaccion.transferida = true;
        updatePaymentInFB($scope.payTransaccion);
        $scope.payTransaccion = null;
    }

    $scope.cancelPayment = () => {
        $scope.payTransaccion = null;
        localStorage.removeItem("specialist");
        localStorage.removeItem("actualOrder");
        localStorage.removeItem("opperation");
    }

    $scope.changeUserStatus = (usuario) => {
        usuario.activo = !usuario.activo;
        updateUserStatus(usuario);
        $scope.$apply();
    }

    //#endregion

    //#region ********************* User Videollamada *********************

    $scope.changeUserDisponibility = () => {
        $scope.authUser.disponibilidad = !$scope.authUser.disponibilidad;
        updateUserDisponibility($scope.authUser, $scope.estadoLlamada);
    }

    $scope.inciarConsulaEspecialista = () => {
        window.location.href = $scope.authUser.laboral.enlaceVideoLlamada;
    }

    $scope.solicitarConsulta = (specialist_Id) => {
        let specialistId = convertDotToDash(specialist_Id);
        if ($scope.specialists[specialistId] && $scope.specialists[specialistId].laboral.enlaceVideoLlamada) {
            window.location.href = $scope.specialists[specialistId].laboral.enlaceVideoLlamada;
        } else {
            $scope.estadoLlamada = 'Marcando';
            $scope.direccionLlamada = 'Saliente';
            $scope.especialistaLlamada = specialistId;
            sendSpecialistMeetingRequest(specialistId);
            mp3 = document.getElementById("llamadaSaliente");
            mp3.play();
            document.getElementById("outcomingMeetingRequestWindow").style.display = "block";
        }
    }

    $scope.aceptarConsulta = () => {
        document.getElementById("incomingMeetingRequestWindow").style.display = "none";
        document.getElementById("outcomingMeetingRequestWindow").style.display = "block";
        $scope.estadoLlamada = 'Hablando';
        $scope.authUser.disponibilidad = false;
        updateUserDisponibility($scope.authUser, $scope.estadoLlamada);
        $scope.showVideoCall($scope.authUser.identificadorLLamada);
        mp3 ? mp3.pause() : null;
    }

    $scope.rechazarConsulta = () => {
        if ($scope.authUser) {
            $scope.authUser.disponibilidad = true;
        }
        hideVideoCall();
    }

    checkForIncomingCall = () => {
        $scope.estadoLlamada = $scope.authUser.estadoLlamada;
        $scope.direccionLlamada = $scope.authUser.direccionLlamada;
        if ($scope.estadoLlamada == "Marcando" && $scope.direccionLlamada == 'Entrante') {
            mp3 = document.getElementById("llamadaEntrante");
            mp3.play();
            document.getElementById("incomingMeetingRequestWindow").style.display = "block";
        }
    }

    checkCallResponse = (specialist) => {
        if (specialist.key == $scope.especialistaLlamada && specialist.estadoLlamada == "Hablando" && specialist.direccionLlamada == 'Entrante') {
            document.getElementById("outcomingMeetingRequestWindow").style.display = "block";
            $scope.estadoLlamada = 'Hablando';
            $scope.authUser.disponibilidad = false;
            updateUserDisponibility($scope.authUser, $scope.estadoLlamada);
            $scope.showVideoCall(specialist.identificadorLLamada);
            mp3 ? mp3.pause() : null;
        }
    }

    $scope.showVideoCall = (identificadorLLamada) => {
        $scope.showWindow('videoCall');
        document.getElementById("videoFrame").setAttribute("src", `https://appr.tc/r/${identificadorLLamada}`);
    }

    hideVideoCall = () => {
        mp3 ? mp3.pause() : null;
        document.getElementById("videoFrame").setAttribute("src", "");
        document.getElementById("incomingMeetingRequestWindow").style.display = "none";
        document.getElementById("outcomingMeetingRequestWindow").style.display = "none";
        $scope.estadoLlamada = "Colgado";
        if ($scope.specialist) {
            updateUserDisponibility($scope.specialist, $scope.estadoLlamada);
            $scope.showSpecialistDetails($scope.specialist);
        } else {
            if ($scope.authUser) {
                updateUserDisponibility($scope.authUser, $scope.estadoLlamada);
                $scope.selectedWindow = "home";
            }
        }
    }

    //#endregion

    //#region ********************* Notifications *********************

    checkDateNotifications = () => {
        firebase
            .database()
            .ref("transacciones")
            .on("child_changed", transaccion => {
                let item = transaccion.val();
                //if (convertDotToDash($scope.authUser.email) == cita.specialist) {
                new Notification(`Alerta de ${item.tipo} "Apsico"`, {
                    token: $scope.listSpecialists[item.idOferta].token,
                    body: `Fecha: ${item.fechaHoraInicio.split(" ")[0]}` +
                        `\nHora ${item.fechaHoraInicio.split(" ")[1]}`,
                    onclick: $scope.$apply(function () {
                        $scope.showWindow("team");
                    }),
                    icon: "images/favicon.webp",
                    image: "images/favicon.webp",
                });
                //}
            });
    };

    checkOffertNotifications = () => {
        firebase
            .database()
            .ref("Ofertas")
            .on("child_changed", offert => {
                let oferta = offert.val();
                //if (convertDotToDash($scope.authUser.email) == cita.owner) {
                new Notification('Alerta de venta "Apsico"', {
                    body: oferta.nombre +
                        "\n" +
                        oferta.direccion +
                        "\n" +
                        oferta.localizacion +
                        "\n$ " +
                        oferta.costo,
                    onclick: $scope.$apply(function () {
                        $scope.showWindow("rent");
                    }),
                    icon: "images/favicon.webp",
                    image: "images/favicon.webp",
                });
                //}
            });
    };

    //#endregion

    //#region ********************* Searcher *********************

    $scope.searchBox = () => {
        $scope.search();
    };

    $scope.search = () => {
        $scope.specialists = $scope.searchFilter == "team" || $scope.searchFilter == "searchResult" ? $scope.searchByCriteria($scope.listSpecialists) : {};
        //$scope.specialists = sortBy($scope.specialists, "eval");
        $scope.areSpecialists = Object.keys($scope.specialists).length > 0 ? true : false;

        $scope.events = $scope.searchFilter == "event" || $scope.searchFilter == "searchResult" ? $scope.searchByCriteria($scope.listEvents) : {};
        //$scope.events = sortBy($scope.events, "fecha");
        $scope.areEvents = Object.keys($scope.events).length > 0 ? true : false;

        $scope.publications = $scope.searchFilter == "rent" || $scope.searchFilter == "searchResult" ? $scope.searchByCriteria($scope.listPublications) : {};
        $scope.arePublications = Object.keys($scope.publications).length > 0 ? true : false;
        $scope.selectedWindow = "searchResult";
        // $scope.showWindow("searchResult");
    };

    $scope.searchByCriteria = data => {
        let result = {};
        for (let i in data) {
            let item = data[i];
            if (isItem(item, $scope.searchCriteria)) {
                result[i] = item;
            }
        }
        return result;
    };

    isItem = (item, searchCriteria) => {
        let result = false;
        let searchList = searchCriteria ? searchCriteria.split(" ") : [];
        if (searchList.length == 0) {
            result = true;
        } else {
            searchList.forEach(search => {
                search = transformItem(search);
                let nombre = transformItem(item.nombre);
                if (item.nombre && nombre.includes(search)) {
                    result = true;
                }
                let localizacion = transformItem(item.localizacion);
                if (item.localizacion && localizacion.includes(search)) {
                    result = true;
                }
                let zipCode = transformItem(item.zipCode);
                if (item.zipCode && zipCode.includes(search)) {
                    result = true;
                }
                let especialidad = transformItem(item.especialidad);
                if (item.especialidad && especialidad.includes(search)) {
                    result = true;
                }
            });
        }
        return result;
    };

    //#endregion

    //#region ********************* Job *********************

    $scope.setNewJobData = () => {
        if ($scope.authUser) {
            $scope.userProfile(2);
            // Horarios
            document.getElementById("inputDaysOfWeek1").checked = true;
            document.getElementById("inputDaysOfWeek2").checked = true;
            document.getElementById("inputDaysOfWeek3").checked = true;
            document.getElementById("inputDaysOfWeek4").checked = true;
            document.getElementById("inputDaysOfWeek5").checked = true;
            document.getElementById("inputDaysOfWeek6").checked = true;
            document.getElementById("inputDaysOfWeek7").checked = false;
            document.getElementById("inputStartWorkTime").value = "08:00";
            document.getElementById("inputEndWorkTime").value = "18:00";
        } else {
            document.getElementById("loginCaller").innerHTML = "jobModal";
            $scope.showWindow("login");
            // $("#login").modal("show");
        }
    };

    $scope.userProfile = (perfilPageNav = 0) => {
        let user = $scope.authUser;
        if (user) {
            if (user.nombre) {
                // Datos personales
                document.getElementById("inputBirthday").value = user.fechaNacimiento ? user.fechaNacimiento : "";
                document.getElementById("inputSex").value = user.sexo ? user.sexo : "";
                document.getElementById("inputContact").value = user.contacto ? user.contacto : "";
                document.getElementById("inputTelefono").value = user.telefono ? user.telefono : "";
                document.getElementById("inputEmail").value = user.email ? user.email : "";
                document.getElementById("inputAddress").value = user.direccion ? user.direccion : "";
                document.getElementById("inputNumExt").value = user.numExt ? user.numExt : "";
                document.getElementById("inputNumInt").value = user.numInt ? user.numInt : "";
                document.getElementById("inputColonia").value = user.colonia ? user.colonia : "";
                document.getElementById("inputZip").value = user.zipCode ? user.zipCode : "";
                document.getElementById("inputEstado").value = user.estado ? user.estado : "";
                document.getElementById("inputMunicipio").value = user.municipio ? user.municipio : "";
                document.getElementById("inputLocation").value = user.localizacion ? user.localizacion : "";
                document.getElementById("inputName").value = user.nombre ? user.nombre : "";
                document.getElementById("showSpecialistPhoto").src = user.foto ? user.foto : "images/user.png";
                lastProfilePhoto = user.foto ? user.foto : "";
                // Datos laborales
                if (user.laboral) {
                    lastCedulaPhotoFile = user.laboral.fotoCedula ? user.laboral.fotoCedula : "";
                    lastTituloPhotoFile = user.laboral.fotoTitulo ? user.laboral.fotoTitulo : "";
                    lastDiplomasPhotoFile = user.laboral.fotoDiplomas ? user.laboral.fotoDiplomas : "";
                    lastCredencialPhotoFile = user.laboral.fotoCredencial ? user.laboral.fotoCredencial : "";
                    // document.getElementById("inputINE").value = user.laboral.INE ? user.laboral.INE : "";
                    document.getElementById("jobModalCenterTitle").innerHTML = "Perfil del " + ($scope.authUser && $scope.authUser.tipoUsuario ? $scope.authUser.tipoUsuario : "usuario");
                    // document.getElementById("jobModalComment").style.display = "none";
                    document.getElementById("cupon").style.display = "none";
                    document.getElementById("cuponTitle").style.display = "none";
                    document.getElementById("profileToS1").style.display = "none";
                    document.getElementById("profileToS2").style.display = "none";
                    document.getElementById("profileToS3").style.display = "none";
                    document.getElementById("profileToS4").style.display = "none";
                    document.getElementById("profileToS5").style.display = "none";
                    document.getElementById("jobModalDatosContables").style.display = "block";
                    document.getElementById("inputCedula").value = user.laboral.cedulaProfesional ? user.laboral.cedulaProfesional : "";
                    document.getElementById("inputComentario").innerHTML = user.laboral.comentario ? user.laboral.comentario : "";
                    document.getElementById("inputResumenCurricular").innerHTML = user.laboral.resumenCurricular ? user.laboral.resumenCurricular : "";
                    document.getElementById("inputCost").value = user.laboral.costo ? user.laboral.costo : "";
                    document.getElementById("showFotoCedula").src = user.laboral.fotoCedula ? user.laboral.fotoCedula : "images/uploadDocs.webp";
                    document.getElementById("showFotoCredencial").src = user.laboral.fotoCredencial ? user.laboral.fotoCredencial : "images/uploadDocs.webp";
                    document.getElementById("showFotoDiplomas").src = user.laboral.fotoDiplomas ? user.laboral.fotoDiplomas : "images/uploadDocs.webp";
                    document.getElementById("showFotoTitulo").src = user.laboral.fotoTitulo ? user.laboral.fotoTitulo : "images/uploadDocs.webp";
                    document.getElementById("inputDisponibilidad").value = user.laboral.disponibilidad ? user.laboral.disponibilidad : "";
                    document.getElementById("inputPreaviso").value = user.laboral.preaviso ? user.laboral.preaviso : "";
                    document.getElementById("inputSpeciality").value = user.laboral.especialidad ? user.laboral.especialidad : "";
                    document.getElementById("inputBanco").value = user.laboral.banco ? user.laboral.banco : "";
                    document.getElementById("inputCBancaria").value = user.laboral.cuentaBancaria ? user.laboral.cuentaBancaria : "";
                    document.getElementById("inputCClabe").value = user.laboral.cuentaClabe ? user.laboral.cuentaClabe : "";
                    document.getElementById("inputRFC").value = user.laboral.RFC ? user.laboral.RFC : "";
                    document.getElementById("logout").style.display = "block";
                    // Horarios
                    let diasLaborables = user.laboral.diasLaborables ? user.laboral.diasLaborables : "";
                    document.getElementById("inputDaysOfWeek1").checked = diasLaborables.includes("1") ? true : false;
                    document.getElementById("inputDaysOfWeek2").checked = diasLaborables.includes("2") ? true : false;
                    document.getElementById("inputDaysOfWeek3").checked = diasLaborables.includes("3") ? true : false;
                    document.getElementById("inputDaysOfWeek4").checked = diasLaborables.includes("4") ? true : false;
                    document.getElementById("inputDaysOfWeek5").checked = diasLaborables.includes("5") ? true : false;
                    document.getElementById("inputDaysOfWeek6").checked = diasLaborables.includes("6") ? true : false;
                    document.getElementById("inputDaysOfWeek7").checked = diasLaborables.includes("7") ? true : false;
                    document.getElementById("inputStartWorkTime").value = user.laboral.horaInicio ? user.laboral.horaInicio : "";
                    document.getElementById("inputEndWorkTime").value = user.laboral.horaFin ? user.laboral.horaFin : "";
                }
            } else {
                document.getElementById("inputEmail").value = user.email;
                document.getElementById("inputName").value = user.displayName;
                document.getElementById("showSpecialistPhoto").src = user.photoURL ? user.photoURL : "images/user.png";
                lastProfilePhoto = user.photoURL;
            }
            $scope.showWindow("jobModal");
            $scope.perfilPageNav = perfilPageNav;
        }
    };

    $scope.uploadPhoto = () => {
        $scope.specialistPhotoFile = document.getElementById("inputFotoLocal").files[0];
        let foto = new FileReader();
        foto.onload = function (e) {
            document.getElementById("showSpecialistPhoto").src = e.target.result;
        };
        foto.readAsDataURL($scope.specialistPhotoFile);
        document.getElementById("inputFotoLocal").style.display = "none";
    };

    $scope.uploadFotoCedula = () => {
        $scope.cedulaPhotoFile = document.getElementById("inputFotoCedulaLocal").files[0];
        let foto = new FileReader();
        foto.onload = function (e) {
            document.getElementById("showFotoCedula").src = e.target.result;
        };
        foto.readAsDataURL($scope.cedulaPhotoFile);
        document.getElementById("inputFotoCedulaLocal").style.display = "none";
    };

    $scope.uploadPhotoTitulo = () => {
        $scope.tituloPhotoFile = document.getElementById("inputFotoTituloLocal").files[0];
        let foto = new FileReader();
        foto.onload = function (e) {
            document.getElementById("showFotoTitulo").src = e.target.result;
        };
        foto.readAsDataURL($scope.tituloPhotoFile);
        document.getElementById("inputFotoTituloLocal").style.display = "none";
    };

    $scope.uploadPhotoDiplomas = () => {
        $scope.diplomasPhotoFile = document.getElementById("inputFotoDiplomasLocal").files[0];
        let foto = new FileReader();
        foto.onload = function (e) {
            document.getElementById("showFotoDiplomas").src = e.target.result;
        };
        foto.readAsDataURL($scope.diplomasPhotoFile);
        document.getElementById("inputFotoDiplomasLocal").style.display = "none";
    };

    $scope.uploadPhotoCredencial = () => {
        $scope.credencialPhotoFile = document.getElementById("inputFotoCredencialLocal").files[0];
        let foto = new FileReader();
        foto.onload = function (e) {
            document.getElementById("showFotoCredencial").src = e.target.result;
        };
        foto.readAsDataURL($scope.credencialPhotoFile);
        document.getElementById("inputFotoCredencialLocal").style.display = "none";
    };

    $scope.changePerfil = tipoUsuario => {
        $scope.tipoUsuario = tipoUsuario;
        if (tipoUsuario == 1) {
            $scope.perfilPageNav = 33;
            document.getElementById("jobModalDatosContables").style.minHeight = "150px";
            document.getElementById("jobModalTarifaPreferencial").style.minHeight = "auto";
            document.getElementById("profileToS2").style.display = "none";
            document.getElementById("profileToS3").style.display = "none";
            document.getElementById("profileToS4").style.display = "none";
        } else {
            $scope.perfilPageNav = 55;
            document.getElementById("profileToS2").style.display = "inherit";
            document.getElementById("profileToS3").style.display = "inherit";
            document.getElementById("profileToS4").style.display = "none";
        }
    };

    $scope.cancelProfile = () => {
        $scope.perfilPageNav == 0 ? $scope.showWindow('home') : $scope.perfilPageNav == 2 && !$scope.authUser ? $scope.showWindow('home') : $scope.perfilPageNav = 0
        document.getElementById("inputFotoCedulaLocal").style.display = "none";
        document.getElementById("inputFotoTituloLocal").style.display = "none";
        document.getElementById("inputFotoDiplomasLocal").style.display = "none";
        document.getElementById("inputFotoCredencialLocal").style.display = "none";
    }

    $scope.updateProfile = () => {
        switch ($scope.perfilPageNav) {
            case 1:
                setDatosPersonales();
                break;
            case 3:
                setDatosProfesionales();
                break;
            case 4:
                setDatosConsulta();
                break;
            case 5:
            case 55:
                setDatosContables();
                break;
            case 6:
                setAplicarDescuento();
                break;
            case 33:
                setDatosProfesionales();
                setDatosConsulta();
                setDatosContables();
                setAplicarDescuento();
                break;
        }
    };

    // Actualizar datos personales

    setDatosPersonales = () => {
        document.getElementById("personalErrorMessage").style.display = "none";
        if (isValidPersonalData()) {
            let idUsuario = convertDotToDash(
                document.getElementById("inputEmail").value,
            );
            let dbRef = "Users/" + idUsuario;
            let specialistPhotoFile =
                lastProfilePhoto != document.getElementById("showSpecialistPhoto").src ?
                    $scope.specialistPhotoFile :
                    "";
            $(".preloader").show();
            loadFileToFB(specialistPhotoFile, dbRef).then(fotoURL => {
                updateDatosPersonales(idUsuario, fotoURL);
                loadUserData($scope.authUser, false);
                confirmation(
                    "Confirmación",
                    "Su perfil ha sido actualizado correctamente.",
                    true,
                );
            });
            $scope.showWindow("services");
        } else {
            document.getElementById("personalErrorMessage").style.display = "block";
        }
    };

    isValidPersonalData = () => {
        let result = true;
        if (!document.getElementById("inputName").value) {
            result = false;
            document.getElementById("inputName").style.border = "1px solid red";
        }
        if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,4})+$/.test(document.getElementById("inputEmail").value)) {
            result = false;
            document.getElementById("inputEmail").style.border = "1px solid red";
        }
        // if (!document.getElementById("inputINE").value) {
        //     result = false;
        //     document.getElementById("inputINE").style.border = "1px solid red";
        // }
        if (!document.getElementById("inputBirthday").value) {
            result = false;
            document.getElementById("inputBirthday").style.border = "1px solid red";
        }
        if (!document.getElementById("inputAddress").value) {
            result = false;
            document.getElementById("inputAddress").style.border = "1px solid red";
        }
        if (!document.getElementById("inputEstado").value) {
            result = false;
            document.getElementById("inputEstado").style.border = "1px solid red";
        }
        if (!document.getElementById("inputMunicipio").value) {
            result = false;
            document.getElementById("inputMunicipio").style.border = "1px solid red";
        }
        if (!document.getElementById("inputLocation").value) {
            result = false;
            document.getElementById("inputLocation").style.border = "1px solid red";
        }
        if (!document.getElementById("inputZip").value) {
            result = false;
            document.getElementById("inputZip").style.border = "1px solid red";
        }
        return result;
    };

    updateDatosPersonales = (idUsuario, fotoURL) => {
        let usuario = {
            // Datos personales
            fechaNacimiento: document.getElementById("inputBirthday").value,
            sexo: document.getElementById("inputSex").value,
            telefono: document.getElementById("inputTelefono").value,
            contacto: document.getElementById("inputContact").value,
            direccion: document.getElementById("inputAddress").value,
            numExt: document.getElementById("inputNumExt").value,
            numInt: document.getElementById("inputNumInt").value,
            colonia: document.getElementById("inputColonia").value,
            zipCode: document.getElementById("inputZip").value,
            estado: document.getElementById("inputEstado").value,
            municipio: document.getElementById("inputMunicipio").value,
            localizacion: document.getElementById("inputLocation").value,
            nombre: document.getElementById("inputName").value,
            email: document.getElementById("inputEmail").value,
            foto: fotoURL ? fotoURL : lastProfilePhoto,
            tipoUsuario: $scope.tipoUsuario == 1 ? "especialista" : $scope.tipoUsuario == 2 ? "anunciante" : "usuario",
        };
        updateUserPersonalToFB(idUsuario, usuario);
        $(".preloader").hide();
    };

    // Actualizar datos profesionales

    setDatosProfesionales = () => {
        document.getElementById("professionalErrorMessage").style.display = "none";
        if (isValidProfessionalData()) {
            let idUsuario = convertDotToDash(
                document.getElementById("inputEmail").value,
            );
            let dbRef = "Users/" + idUsuario;
            let specialistPhotoFile = lastProfilePhoto != document.getElementById("showSpecialistPhoto").src ? $scope.specialistPhotoFile : "";
            let cedulaPhotoFile = lastCedulaPhotoFile != document.getElementById("showFotoCedula").src ? $scope.cedulaPhotoFile : "";
            let tituloPhotoFile = lastTituloPhotoFile != document.getElementById("showFotoTitulo").src ? $scope.tituloPhotoFile : "";
            let diplomasPhotoFile = lastDiplomasPhotoFile != document.getElementById("showFotoDiplomas").src ? $scope.diplomasPhotoFile : "";
            let credencialPhotoFile = lastCredencialPhotoFile != document.getElementById("showFotoCredencial").src ? $scope.credencialPhotoFile : "";
            $(".preloader").show();
            Promise.all([loadFileToFB(cedulaPhotoFile, dbRef), loadFileToFB(tituloPhotoFile, dbRef), loadFileToFB(diplomasPhotoFile, dbRef), loadFileToFB(credencialPhotoFile, dbRef)]).then(promises => {
                updateDatosProfesionales(idUsuario, promises);
                confirmation(
                    "Confirmación",
                    "Su perfil ha sido actualizado correctamente.",
                    true
                );
            });
            $scope.showWindow("services");
        } else {
            document.getElementById("professionalErrorMessage").style.display = "block";
        }
    };

    isValidProfessionalData = () => {
        let result = true;
        if (!document.getElementById("inputCedula").value) {
            result = false;
            document.getElementById("inputCedula").style.border = "1px solid red";
        }
        if (!document.getElementById("inputSpeciality").value) {
            result = false;
            document.getElementById("inputSpeciality").style.border = "1px solid red";
        }
        if (!document.getElementById("inputCedula").value) {
            result = false;
            document.getElementById("inputCedula").style.border = "1px solid red";
        }
        // if (!lastCedulaPhotoFile && !document.getElementById("inputFotoCedula").value) {
        //     result = false;
        //     document.getElementById("inputFotoCedula").style.border = "1px solid red";
        // }
        return result;
    };

    updateDatosProfesionales = (idUsuario, fotosURL) => {
        let laboral = {
            // INE: document.getElementById("inputINE").value,
            especialidad: document.getElementById("inputSpeciality").value,
            cedulaProfesional: document.getElementById("inputCedula").value,
            comentario: document.getElementById("inputComentario").value,
            resumenCurricular: document.getElementById("inputResumenCurricular").value,
            fotoCedula: fotosURL[0] ? fotosURL[0] : lastCedulaPhotoFile,
            fotoTitulo: fotosURL[1] ? fotosURL[1] : lastTituloPhotoFile,
            fotoDiplomas: fotosURL[2] ? fotosURL[2] : lastDiplomasPhotoFile,
            fotoCredencial: fotosURL[3] ? fotosURL[3] : lastCredencialPhotoFile,
            esEspecialista: true
        };
        updateDatosLaborales(idUsuario, laboral);
    };

    // Actualizar datos de consulta

    setDatosConsulta = () => {
        document.getElementById("consultaErrorMessage").style.display = "none";
        if (isValidConsultData()) {
            let idUsuario = convertDotToDash(document.getElementById("inputEmail").value);
            $(".preloader").show();
            updateDatosConsulta(idUsuario);
            confirmation(
                "Confirmación",
                "Su perfil ha sido actualizado correctamente.",
                true,
            );
            $scope.showWindow("services");
        } else {
            document.getElementById("consultaErrorMessage").style.display = "block";
        }
    };

    isValidConsultData = () => {
        let result = true;
        if (!document.getElementById("inputCost").value) {
            result = false;
            document.getElementById("inputCost").style.border = "1px solid red";
        }
        return result;
    };

    updateDatosConsulta = idUsuario => {
        let laboral = {
            costo: document.getElementById("inputCost").value,
            // periodo: document.getElementById("inputPeriod").value,
            periodo: "0",
            disponibilidad: document.getElementById("inputDisponibilidad").value,
            preaviso: document.getElementById("inputPreaviso").value,
            enlaceVideoLlamada: document.getElementById("inputVideoLlamada").value,
            diasLaborables:
                (document.getElementById("inputDaysOfWeek1").checked ? "1," : "") +
                (document.getElementById("inputDaysOfWeek2").checked ? "2," : "") +
                (document.getElementById("inputDaysOfWeek3").checked ? "3," : "") +
                (document.getElementById("inputDaysOfWeek4").checked ? "4," : "") +
                (document.getElementById("inputDaysOfWeek5").checked ? "5," : "") +
                (document.getElementById("inputDaysOfWeek6").checked ? "6," : "") +
                (document.getElementById("inputDaysOfWeek7").checked ? "7" : ""),
            horaInicio: document.getElementById("inputStartWorkTime").value,
            horaFin: document.getElementById("inputEndWorkTime").value,
        };
        updateDatosLaborales(idUsuario, laboral);
    };

    updateDatosLaborales = (idUsuario, laboral) => {
        updateUserLaboralToFB(idUsuario, laboral);
        refreshSpecialists();
        loadUserData($scope.authUser, false);
        $(".preloader").hide();
    }

    // Actualizar datos contables

    setDatosContables = () => {
        document.getElementById("contableErrorMessage").style.display = "none";
        if (isValidContable()) {
            let idUsuario = convertDotToDash(document.getElementById("inputEmail").value);
            $(".preloader").show();
            updateDatosContable(idUsuario);
            confirmation(
                "Confirmación",
                "Su perfil ha sido actualizado correctamente.",
                true
            );
            $scope.showWindow("services");
        } else {
            document.getElementById("contableErrorMessage").style.display = "block";
        }
    };

    isValidContable = () => {
        let result = true;
        if (!document.getElementById("inputRFC").value) {
            result = false;
            document.getElementById("inputRFC").style.border = "1px solid red";
        }
        if (!document.getElementById("inputCBancaria").value) {
            result = false;
            document.getElementById("inputCBancaria").style.border = "1px solid red";
        }
        return result;
    };

    updateDatosContable = idUsuario => {
        let laboral = {
            RFC: document.getElementById("inputRFC").value,
            cuentaBancaria: document.getElementById("inputCBancaria").value,
            cuentaClabe: document.getElementById("inputCClabe").value,
            banco: document.getElementById("inputBanco").value,
            esEspecialista: $scope.perfilPageNav == 33 ? true : false
        };
        updateUserLaboralToFB(idUsuario, laboral);
        $(".preloader").hide();
    };

    // Actualizar datos de descuento

    setAplicarDescuento = () => {
        let idUsuario = convertDotToDash(
            document.getElementById("inputEmail").value,
        );
        $(".preloader").show();
        updateDescuento(idUsuario);
        confirmation(
            "Confirmación",
            "Su perfil ha sido actualizado correctamente.",
            true,
        );
        $scope.showWindow("services");
    };

    updateDescuento = idUsuario => {
        let laboral = {
            cupon: document.getElementById("inputCoupon").value,
        };
        updateUserLaboralToFB(idUsuario, laboral);
        $(".preloader").hide();
    };

    //#endregion

    //#region ********************* Invitation *********************

    $scope.sendInvitation = () => {
        if (isValidInvitation()) {
            let nombreInvita = document.getElementById("inputInvitationSpecialist").value;
            let nombreInvitado = document.getElementById("inputInvitationName").value;
            let cuponInvitado = document.getElementById("inputInvitationCupon").value;
            let emailInvitado = document.getElementById("inputInvitationEmail").value;
            let invitacion = {
                especialista: convertDotToDash(emailInvitado),
                cupon: cuponInvitado,
                fecha: new Date(),
            };
            sendMail(nombreInvita, nombreInvitado, cuponInvitado, emailInvitado);
            saveInvitationToFB(convertDotToDash($scope.authUser.email), invitacion);
            confirmation(
                "Confirmación",
                "Invitación enviada a " + document.getElementById("inputInvitationName").value + " correctamente!",
                true,
            );
        } else {
            confirmation(
                "Alerta",
                "Por favor, complete los campos de la invitación correctamente!",
                false,
            );
        }
        $scope.hideInvitation();
    };

    isValidInvitation = () => {
        let result = true;
        if (!document.getElementById("inputInvitationSpecialist").value) {
            result = false;
            document.getElementById("inputInvitationSpecialist").style.border = "1px solid red";
        }
        if (!document.getElementById("inputInvitationName").value) {
            result = false;
            document.getElementById("inputInvitationName").style.border = "1px solid red";
        }
        if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,4})+$/.test(document.getElementById("inputInvitationEmail").value)) {
            result = false;
            document.getElementById("inputInvitationEmail").style.border = "1px solid red";
        }
        return result;
    };

    sendMail = (nombreInvita, nombreInvitado, cuponInvitado, emailInvitado) => {
        let subject = "Invitación a trabajar con Apscio";
        let body =
            "Estimado " + nombreInvitado + "\n\nTe escribe " + nombreInvita +
            " para invitarte a unirte al equipo de Apsico. Un proyecto que busca contar " +
            "con el mejor talento en nuestra rama e inmediatamente pensé en ti. Es fácil " +
            "solo tendrías que seguir unos pasos muy simples:\n\n" +
            " 1.- Accede a nuestro portal https://dta-labs.github.io/apsico \n" +
            ' 2.- Haz clic en "Nuestros servicios" y "Trabajar" \n' +
            " 3.- Introduce la información solicitada \n" +
            " 4.- Introduce el código del cupón de invitación: " + cuponInvitado + "\n\n" +
            "El contar con un cupón de invitación te permitirá acceder a ciertas preferencias " +
            "de pago que hemos pensado para ti. \n\nTe esperamos!!! \n\nEquipo de Apsico \n\n" +
            "La psicología a un clic de distancia \n\n<hr>\nSi Ud. no es " + nombreInvitado +
            " o no reconoce al remitente de este correo, por favor elimínelo. La información " +
            "de datos personales está protegida por Apsico acorde a lo establecido en los artículos " +
            "22 de la Ley del Seguro Social, 13 fracciones IV y V, 18, 19, 20 y 21 de la Ley Federal " +
            "de Transparencia y Acceso a la Información Pública Gubernamental de México.";
        var mail = "mailto:" + emailInvitado + "?subject=" + subject + "&body=" + encodeURIComponent(body);
        window.location.href = mail;
    };

    $scope.getNewCupon = () => {
        let initials = $scope.authUser ? $scope.authUser.nombre.split(" ")[0].replace("a", "1").replace("e", "2").replace("i", "3").replace("o", "4").replace("u", "5") : "D2F15LT";
        $scope.newCupon = "-" + initials + "x" + new Date().getTime();
    };

    //#endregion

    //#region ********************* Gestión de Ofertas *********************

    $scope.getSpecialistOfferts = () => {
        let specialistOfferts = [];
        for (let publication in $scope.listPublications) {
            if ($scope.listPublications[publication].owner == $scope.authUser.key) {
                specialistOfferts.push($scope.listPublications[publication]);
            }
        }
        $scope.specialistOfferts = specialistOfferts;
        $scope.tipoOferta = 0;
        $scope.showWindow("adminOfferts");
    };

    $scope.getSpecialistEvents = () => {
        let specialistOfferts = [];
        for (let event in $scope.listEvents) {
            if ($scope.listEvents[event].owner == $scope.authUser.key) {
                specialistOfferts.push($scope.listEvents[event]);
            }
        }
        $scope.specialistOfferts = specialistOfferts;
        $scope.tipoOferta = 1;
        $scope.showWindow("adminOfferts");
    };

    $scope.newOffert = (tipoOferta) => {
        cleanOffertModal();
        $scope.offertToEdit.tipoOferta = tipoOferta;
        $("#offertEditModal").modal("show");
        lastOffertPhoto = "";
    };

    cleanOffertModal = () => {
        $scope.offertToEdit = {
            key: "",
            nombre: "",
            direccion: "",
            localizacion: "",
            costo: "",
            periodo: "",
            tipoOferta: "",
            fotos: "",
            descripcion: "",
            owner: "",
            capacidad: "",
            asistentes: 0,
            fechaHoraInicio: "",
            fechaHoraFin: ""
        };
        document.getElementById("inputOffertFoto").files = null;
        $scope.photoList = ""; // No hay refrencia
        $scope.photoListArray = []; // No hay refrencia
        $scope.photoOffertListArray = [];
    };

    $scope.editOffert = offert => {
        cleanOffertModal();
        $scope.offertToEdit = {
            key: offert.key,
            nombre: offert.nombre ? offert.nombre : "",
            direccion: offert.direccion ? offert.direccion : "",
            localizacion: offert.localizacion ? offert.localizacion : "",
            municipio: offert.municipio ? offert.municipio : "",
            estado: offert.estado ? offert.estado : "",
            zipCode: offert.zipCode ? offert.zipCode : "",
            telefono: offert.telefono ? offert.telefono : "",
            numExt: offert.numExt ? offert.numExt : "",
            numInt: offert.numInt ? offert.numInt : "",
            colonia: offert.colonia ? offert.colonia : "",
            costo: offert.costo ? parseInt(offert.costo) : 0,
            desc7: offert.costo ? parseInt(offert.desc7) : 0,
            // desc15: offert.desc15 ? parseInt(offert.desc15) : 0,
            desc30: offert.desc30 ? parseInt(offert.desc30) : 0,
            periodo: offert.periodo ? offert.periodo : "",
            tipoOferta: offert.tipoOferta ? offert.tipoOferta : "",
            fotos: offert.fotos ? offert.fotos : "",
            descripcion: offert.descripcion ? offert.descripcion : "",
            owner: offert.owner ? offert.owner : "",
            capacidad: offert.capacidad ? parseInt(offert.capacidad) : "",
            asistentes: offert.asistentes >= 0 ? parseInt(offert.asistentes) : "",
            fechaHoraInicio: offert.fechaHoraInicio ? offert.fechaHoraInicio.replace(' ', 'T') : "",
            fechaHoraFin: offert.fechaHoraFin ? offert.fechaHoraFin.replace(' ', 'T') : "",
        };
        $scope.photoOffertListArray = offert.fotos.split(",");
        lastOffertPhoto = offert.fotos;
        $("#offertEditModal").modal("show");
    };

    $scope.addPhotoToOffert = () => {
        $scope.offertPhotoFiles = document.getElementById("inputOffertFoto").files;
        let fotos = [];
        let i = 0;
        for (let offertPhoto in $scope.offertPhotoFiles) {
            if (i < $scope.offertPhotoFiles.length) {
                fotos.push(new FileReader());
                fotos[offertPhoto].onload = function (e) {
                    $scope.$apply(function () {
                        $scope.photoOffertListArray.push(e.target.result);
                    });
                };
                fotos[offertPhoto].readAsDataURL($scope.offertPhotoFiles[offertPhoto]);
            }
            i++;
        }
    };

    $scope.deleteOffertPhoto = (photo, index) => {
        let lastOffertPhotoArray = lastOffertPhoto.split(",");
        let lastOffertPhotoLength = lastOffertPhotoArray.length;
        if (lastOffertPhotoArray[index] == photo) {
            lastOffertPhotoArray.splice(index, 1);
            lastOffertPhoto = lastOffertPhotoArray.toString();
        } else {
            removeFileFromFileList(index - lastOffertPhotoLength);
        }
        $scope.photoOffertListArray.splice(index, 1);
        // $scope.offertToEdit.fotos = "" + $scope.photoOffertListArray;
        if (photo.includes("https")) {
            let aux = photo.split("?")[0];
            let photoName = aux.split("%2F")[aux.split("%2F").length - 1];
            deleteFileInFB(
                photoName,
                "Ofertas/" + $scope.offertToEdit.key,
            );
        }
    };

    removeFileFromFileList = (index) => {
        const dt = new DataTransfer();
        const input = document.getElementById('inputOffertFoto');
        const { files } = input;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (index !== i) dt.items.add(file);
            input.files = dt.files;
        }
        $scope.offertPhotoFiles = document.getElementById("inputOffertFoto").files;
    }

    removeAllFilesFromFileList = () => {
        const dt = new DataTransfer();
        document.getElementById('inputOffertFoto').files = dt.files;
        $scope.offertPhotoFiles = "";
    }

    $scope.updateOffert = () => {
        showPreloader();
        let key = $scope.offertToEdit.key;
        if ($scope.offertPhotoFiles) {
            let loadPhotoPromises = [];
            for (let i = 0; i < $scope.offertPhotoFiles.length; i++) {
                loadPhotoPromises.push(
                    loadFileToFB($scope.offertPhotoFiles[i], "Ofertas/" + key),
                );
            }
            removeAllFilesFromFileList();
            Promise.all(loadPhotoPromises).then(promises => {
                let fileURLs = "";
                promises.forEach(photoURL => {
                    fileURLs += (fileURLs == "" ? "" : ",") + photoURL;
                });
                updateCurrentOffert(fileURLs, key);
            });
        } else {
            updateCurrentOffert("", key);
        }
    };

    updateCurrentOffert = (fileURLs, key) => {
        if (isValidOffert(fileURLs)) {
            restoreFormStyle();
            // $(".preloader").show();
            modifyOfertDates();
            $scope.offertToEdit.owner = $scope.authUser.key;
            // $scope.offertToEdit.periodo = document.getElementById("inputOffertPeriodoRenta").value;
            $scope.offertToEdit.desc7 = document.getElementById("inputOffertDesc7").value;
            // $scope.offertToEdit.desc15 = document.getElementById("inputOffertDesc15").value;
            $scope.offertToEdit.desc30 = document.getElementById("inputOffertDesc30").value;
            $scope.offertToEdit.fotos = lastOffertPhoto + (lastOffertPhoto && fileURLs != "" ? "," : "") + fileURLs;
            $scope.offertToEdit.fotos = $scope.offertToEdit.fotos.replace(/,,/g, ",");
            $scope.offertToEdit.fotos = $scope.offertToEdit.fotos.startsWith(",") ? $scope.offertToEdit.fotos.slice(1, $scope.offertToEdit.fotos.length) : $scope.offertToEdit.fotos;
            updateEditedOffertInFB($scope.offertToEdit, key);
            refreshOferts($scope.offertToEdit.tipoOferta, true);
            $("#offertEditModal").modal("hide");
            $("#offertConfirmModal").modal("show");
            // $(".preloader").hide();
        } else {
            document.getElementById("offertErrorMessage").style.display = "block";
        }
        hidePreloader();
    };
    
    modifyOfertDates = () => {
        let fechaHoraInicio = "";
        if ($scope.offertToEdit.fechaHoraInicio != "NaN-aN-aNTaN:aN") {
            fechaHoraInicio = easyDate(new Date($scope.offertToEdit.fechaHoraInicio));
            $scope.offertToEdit.fechaHoraInicio = fechaHoraInicio.date + " " + fechaHoraInicio.time;
        } else {
            $scope.offertToEdit.fechaHoraInicio = fechaHoraInicio;
        }
        let fechaHoraFin = "";
        if ($scope.offertToEdit.fechaHoraFin != "NaN-aN-aNTaN:aN") {
            fechaHoraFin = easyDate(new Date($scope.offertToEdit.fechaHoraFin));
            $scope.offertToEdit.fechaHoraFin = fechaHoraFin.date + " " + fechaHoraFin.time;
        } else {
            $scope.offertToEdit.fechaHoraFin = fechaHoraFin;
        }
    }
    
    restoreFormStyle = () => {
        document.getElementById("offertErrorMessage").style.display = "none";
        document.getElementById("inputOffertName").style.border = "0 0 1px 0 solid lighthgrey";
        document.getElementById("inputOffertAddress").style.border = "0 0 1px 0 solid lighthgrey";
        document.getElementById("inputOffertLocation").style.border ="0 0 1px 0 solid lighthgrey";
        document.getElementById("inputOffertDescription").style.border = "0 0 1px 0 solid lighthgrey";
        document.getElementById("inputOffertCost").style.border = "0 0 1px 0 solid lighthgrey";
    }

    isValidOffert = fileURLs => {
        let result = true;
        if (!document.getElementById("inputOffertName").value) {
            result = false;
            document.getElementById("inputOffertName").style.border = "1px solid red";
        }
        if (!document.getElementById("inputOffertAddress").value) {
            result = false;
            document.getElementById("inputOffertAddress").style.border =
                "1px solid red";
        }
        if (!document.getElementById("inputOffertLocation").value) {
            result = false;
            document.getElementById("inputOffertLocation").style.border =
                "1px solid red";
        }
        if (!document.getElementById("inputOffertCost").value) {
            result = false;
            document.getElementById("inputOffertCost").style.border = "1px solid red";
        }
        // if (!document.getElementById("inputOffertPeriodoRenta").value) {
        //     result = false;
        //     document.getElementById("inputOffertPeriodoRenta").style.border =
        //         "1px solid red";
        // }
        if (!document.getElementById("inputOffertDescription").value) {
            result = false;
            document.getElementById("inputOffertDescription").style.border =
                "1px solid red";
        }
        let photos =
            lastOffertPhoto +
            (lastOffertPhoto && fileURLs != "" ? "," : "") +
            fileURLs;
        result = photos ? result : false;
        return result;
    };

    $scope.deleteOffert = () => {
        let key = $scope.offertToEdit.key;
        deleteCurrentOffertInFB(key);
        refreshOferts($scope.offertToEdit.tipoOferta, true);
        $("#offertEditModal").modal("hide");
    };

    //#endregion

    //#region ********************* Appointment Order *********************

    $scope.showSpecialistDetails = specialist => {
        $scope.specialist = specialist;
        updateSpecialistSchedule();
        $scope.showWindow("specialistDetail");
    };

    updateSpecialistSchedule = () => {
        loadUsersTransactionsByTypeFromFB(convertDashToDot($scope.specialist.key), "cita").then(result => {
            $scope.listDates = result;
            showSpecialistSchedule();
            showSpecialistAppointmentCalendar();
        });
    };

    showSpecialistSchedule = () => {
        let specialist = $scope.specialist;
        let calendarEl = document.getElementById("dateCalendar");
        calendarEl.innerHTML = "";
        calendar = new FullCalendar.Calendar(calendarEl, {
            plugins: ["interaction", "dayGrid", "timeGrid"],
            locale: "es",
            height: 350,
            width: 650,
            defaultDate: new Date(),
            selectable: true,
            eventLimit: true,
            navLinks: true,
            draggable: true,
            header: {
                left: "prev,next",
                center: "title",
                right: "dayGridMonth,timeGridDay",
            },
            defaultView: "dayGridMonth",
            businessHours: [{
                daysOfWeek: specialist.laboral.diasLaborables ? specialist.laboral.diasLaborables.split(",") : daysOfWeek,
                startTime: specialist.laboral.horaInicio ? specialist.laboral.horaInicio : startWorkTime,
                endTime: specialist.laboral.horaFin ? specialist.laboral.horaFin : endWorkTime,
            },],
            dateClick: function (info) {
                validateDate(info, specialist);
            },
            events: getSpecialistSchedule(convertDashToDot(specialist.key)),
        });

        calendar.render();
    };

    getSpecialistSchedule = key => {
        let result = [];
        let listOfSchedule = $scope.listDates;
        for (let date in listOfSchedule) {
            listOfSchedule[date].title = convertDotToDash(listOfSchedule[date].idClient) == listOfSchedule[date].idOferta ? "Inhábil" : "Reservado";
            listOfSchedule[date].start = listOfSchedule[date].fechaHoraInicio;
            listOfSchedule[date].end = listOfSchedule[date].fechaHoraFin;
            listOfSchedule[date].color = convertDotToDash(listOfSchedule[date].idClient) == listOfSchedule[date].idOferta ? "red" : "blue";
            result.push(listOfSchedule[date]);
        }
        return result;
    };

    validateDate = (info, specialist) => {
        loadUsersTransactionsByTypeFromFB(convertDashToDot(specialist.key), "cita").then(result => {
            $scope.listDates = result;
            if (isElegibleDate(info.date, specialist.key)) {
                confirmDate(info, specialist);
            } else {
                confirmation(
                    "Alerta",
                    "Lamentablemente este horario no está disponible, puede que ya esté reservado. Por favor seleccione un nuevo horario.",
                );
            }
        });
    };

    isElegibleDate = (dateTime, specialistKey) => {
        let today = new Date();
        let ed = easyDate(dateTime);
        let specialist = $scope.specialist;
        let preaviso = specialist.laboral.preaviso ? specialist.laboral.preaviso * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
        let disponibilidad = specialist.laboral.disponibilidad ? specialist.laboral.disponibilidad * 30 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
        let result = dateTime.getTime() > today.getTime() + preaviso && dateTime.getTime() < today.getTime() + disponibilidad && ed.dayOfWeek in daysOfWeek && ed.time >= startWorkTime && ed.time < endWorkTime ? true : false;
        if (result) {
            // result = false;
            let d = new Date(dateTime);
            let dateIni = new Date(d);
            let dateFin = new Date(d.setHours(d.getHours() + 1));
            for (dateId in $scope.listDates) {
                let date = $scope.listDates[dateId];
                let start = new Date(date.fechaHoraInicio);
                let end = new Date(date.fechaHoraFin);
                if (start.getTime() > today.getTime() + preaviso) {
                    if (start.getFullYear() == d.getFullYear() && start.getMonth() == d.getMonth() && start.getDate() == d.getDate()) {
                        if (end <= dateIni || dateFin <= start) {
                            result = true;
                        } else {
                            return false;
                        }
                    } else {
                        result = true;
                    }
                }
            }
        }
        return result;
    };

    confirmDate = (info, scheduleObject) => {
        let ed = info.dateStr ? easyDate(info.date) : info;
        // let ed = easyDate(info.date);
        $scope.$apply(function () {
            $scope.appointmentDate = ed;
            $scope.scheduleObject = scheduleObject;
            $scope.info = info;
        });
        $scope.createNewOrder(scheduleObject, ed);
        // createStripeForm("citaStripeForm");
        if ($scope.order) {
            let parametrosURL = "https://pprsar.com/cosme/apsico/conekta/index.html" +
                "?name=" + $scope.order.client.name +
                "&email=" + convertDashToDot($scope.order.client.email) +
                "&monto=" + $scope.order.cost +
                "&fechaHoraFin=" + $scope.order.end +
                "&fechaHoraInicio=" + $scope.order.start +
                "&idClient=" + $scope.order.client.email +
                "&idOferta=" + ($scope.order.type == 'date' ? $scope.order.specialist.key : $scope.order.type == 'rent' ? $scope.order.product.key : $scope.order.event.key) +
                "&description=" + ($scope.order.type == 'date' ? $scope.order.specialist.key : $scope.order.type == 'rent' ? $scope.order.product.key : $scope.order.event.key) +
                "&owner=" + convertDashToDot($scope.order.owner) +
                "&id=" + $scope.order.id +
                "&reservations=" + ($scope.order.type == 'event' ? $scope.order.reservations : '0') +
                "&token=" + $scope.order.token +
                "&tipo=" + ($scope.order.type == 'rent' ? 'renta' : $scope.order.type == 'event' ? 'evento' : 'cita');
            document.getElementById("citaConektaForm").setAttribute("action", parametrosURL);
        }
        $("#confirmDateModal").modal("show");
        document.getElementById("confirmDateModal").style.display = "block";
    };

    $scope.createNewOrder = (specialist, date) => {
        let ed = date.dateStr ? easyDate(date.date) : date;
        if (!$scope.authUser) {
            saveOrderToLocalStore(specialist, ed);
            // $scope.showWindow("login");
            // $scope.$apply();
            // $("#login").modal("show");
        } else {
            localStorage.removeItem("actualOrder");
            $scope.order = {
                id: specialist.key + "_date" + ed.timeStamp,
                token: getRandomID(specialist.key),
                client: {
                    name: $scope.authUser.nombre,
                    address: $scope.authUser.direccion,
                    sex: $scope.authUser.sexo,
                    email: convertDashToDot($scope.authUser.key),
                },
                specialist: {
                    key: specialist.key,
                    name: specialist.nombre,
                    speciality: specialist.especialidad,
                    address: specialist.direccion,
                    location: specialist.localizacion,
                    email: convertDashToDot(specialist.key)
                },
                start: ed.date + " " + ed.time,
                end: ed.date + " " + addOneHour(ed.time),
                cost: specialist.laboral.costo,
                owner: convertDashToDot(specialist.key),
                paid: false,
                title: specialist.key == $scope.authUser.key ? "Reservado" : "Cita",
                type: "date",
            };
            localStorage.setItem("actualOrder", JSON.stringify($scope.order));
            localStorage.setItem("specialist", JSON.stringify($scope.specialist));
            if (localStorage.getItem("opperation")) {
                let op = JSON.parse(localStorage.getItem("opperation"));
                localStorage.removeItem("opperation");
                $scope.showSpecialistDetails(op.data);
                confirmDate(op.date, op.data);
            } else if (specialist.key == $scope.authUser.key) {
                // createPurchaseTransaction("cita", false);
                confirmCancelation();
            } else {
                //$scope.payWithPayPal();
            }
        }
    };

    saveOrderToLocalStore = (specialist, ed) => {
        let opperation = {
            type: "createNewOrder",
            data: specialist,
            date: ed
        };
        localStorage.setItem("opperation", JSON.stringify(opperation));
    };

    addOneHour = timeText => {
        let hourArray = timeText.split(":");
        hourArray[0] = ("0" + (parseInt(hourArray[0]) + 1)).substr(-2);
        return hourArray[0] + ":" + hourArray[1];
    };

    //#endregion

    //#region ********************* Rent Order (buy) *********************

    $scope.showBuyDetails = (buy, type) => {
        $scope.rent = buy;
        $scope.rent.type = type;
        getBuySchedule(buy);
        $scope.showWindow("buyDetailModal");
        set_foto();
    };

    $scope.continueBuyOrder = (save) => {
        if (!$scope.authUser) {
            if (save) {
                saveBuyOrderToLocalStore();
            }
            $scope.showWindow("login");
            // $("#login").modal("show");
        } else {
            if (localStorage.getItem("opperation")) {
                let op = JSON.parse(localStorage.getItem("opperation"));
                localStorage.removeItem("opperation");
                $scope.order = op.data;
                $scope.order.client.name = $scope.authUser.nombre;
                $scope.order.client.address = $scope.authUser.direccion;
                $scope.order.client.sex = $scope.authUser.sexo;
                $scope.order.client.email = convertDashToDot($scope.authUser.key);
                $scope.showBuyDetails(op.data, op.data.type);
                if (op.data.type == 'event') {
                    rentConfirmation(
                        "Confirmación",
                        `
                        <div class="row">
                            <div class="col-xs-12">
                                <span>Ud. está a punto de reservar "<b>${op.data.event.name}</b>" del ${op.data.start.split("T")[0]} al ${op.data.end.split("T")[0]}, por $ <b>${op.data.cost}</b> MXN</span>
                            </div>
                        </div>
                        `,
                        false,
                    );
                } else {
                    rentConfirmation(
                        "Confirmación",
                        `
                            <div class="row">
                                <div class="col-xs-3">
                                    <img src="${op.data.product.photos.split(",")[0]}" style="width: 100%; border-radius: 3px;">
                                </div>
                                <div class="col-xs-9">
                                    <span>Ud. está a punto de reservar "<b>${op.data.product.name}</b>" del ${op.data.start.split("T")[0]} al ${op.data.end.split("T")[0]}, por $ <b>${op.data.cost}</b> MXN</span>
                                </div>
                            </div>
                            `,
                        false,
                    );
                }
            } else {
                //$scope.payWithPayPal();
            }
            // $scope.createRent();
            // $scope.showWindow("clientGeneralDataModal");
        }
    };

    saveBuyOrderToLocalStore = () => {
        let opperation = {
            type: "createNewBuyOrder",
            data: $scope.order
        };
        localStorage.setItem("opperation", JSON.stringify(opperation));
    };

    getBuySchedule = (buy) => {
        let key = buy.key ? buy.key : buy.id;
        loadTransactionsByTypeFromFB(key, "renta").then(result => {
            let result1 = [];
            let result2 = {};
            let rentas = result;
            for (let rentaId in rentas) {
                let renta = rentas[rentaId];
                let diaI = new Date(renta.fechaHoraInicio);
                if (diaI > new Date()) {
                    result1.push(renta);
                    let diaF = new Date(renta.fechaHoraFin);
                    while (diaI <= diaF) {
                        let arr2 = result2[diaI.getMonth()] ?
                            result2[diaI.getMonth()] : [];
                        arr2.push(diaI.getDate());
                        result2[diaI.getMonth()] = arr2;
                        diaI.setDate(diaI.getDate() + 1);
                    }
                }
            }
            let events = {
                dates: result1,
                days: result2,
            };
            showRentSchedule(buy, events);
        });
    };

    showRentSchedule = (buy, events) => {
        // let  = getBuySchedule(buy);
        let minDate = new Date();
        minDate.setDate(minDate.getDate() + 1);
        $("#rentCalendar").datepicker({
            language: "es",
            minDate: minDate,
            onRenderCell: function (date, cellType) {
                let currentDate = date.getDate();
                if (cellType == "day" && events.days[date.getMonth()] && events.days[date.getMonth()].indexOf(currentDate) != -1) {
                    return {
                        disabled: true,
                        html: '<span class="text-danger"><strong>' + currentDate + "</strong></span>",
                    };
                }
            },
            onSelect: function onSelect(fd, date, picker) {
                if ((!$scope.rentaMultiple) || (date.length == 2 && $scope.rentaMultiple)) {
                    processRent(buy, events, date);
                }
            },
        });
    };

    processRent = (buy, events, date) => {
        if (isValidRent(events.dates, date)) {
            let dateIni = easyDate(date[0]).date;
            let dateEnd = date[1] ? easyDate(date[1]).date : dateIni;
            let newEvent = {
                title: "Nueva renta",
                start: dateIni + " 00:00",
                end: dateEnd + " 23:59"
            };
            let start = moment(newEvent.start);
            let end = moment(newEvent.end);
            let days = end.diff(start, "days") + 1;
            let eventArr = [];
            eventArr.push(newEvent);
            createNewBuyOrder(buy, newEvent);
            let confirmationTxt = (dateIni != dateEnd) ? `del ${dateIni} al ${dateEnd}` : `el ${dateIni}`;
            rentConfirmation(
                "Confirmación",
                `
                <div class="row">
                    <div class="col-xs-3">
                        <img src="${buy.fotos.split(",")[0]}" style="width: 100%; border-radius: 3px;">
                    </div>
                    <div class="col-xs-9">
                        <span>Ud. está a punto de reservar "<b>${buy.nombre}</b>" ${confirmationTxt}, por $ <b>${calculteRentCost(newEvent, buy)}</b> MXN</span>
                    </div>
                </div>
                `,
                false,
            );
            // $("#buyGeneralDataModal").modal("show");
            // createStripeForm("rentaStripeForm");
        } else {
            confirmation(
                "Alerta",
                "Solo se puede rentar días que aún no estén ocupados",
                false,
            );
        }
    }

    $scope.confirmPayRent = () => {
        document.getElementById('rentMessagesModal').style.display = 'none';
        $("#rentaConektaForm").submit();
    }

    rentConfirmation = (title, msg) => {
        $(".preloader").hide();
        let parametrosURL = "https://pprsar.com/cosme/apsico/conekta/index.html" +
            "?name=" + $scope.order.client.name +
            "&email=" + convertDashToDot($scope.order.client.email) +
            "&monto=" + $scope.order.cost +
            "&fechaHoraFin=" + $scope.order.end +
            "&fechaHoraInicio=" + $scope.order.start +
            "&idClient=" + $scope.order.client.email +
            "&idOferta=" + ($scope.order.type == 'date' ? $scope.order.specialist.key : $scope.order.type == 'rent' ? $scope.order.product.key : $scope.order.event.key) +
            "&description=" + ($scope.order.type == 'date' ? $scope.order.specialist.key : $scope.order.type == 'rent' ? $scope.order.product.key : $scope.order.event.key) +
            "&owner=" + convertDashToDot($scope.order.owner) +
            "&id=" + $scope.order.id +
            "&reservations=" + ($scope.order.type == 'event' ? $scope.order.reservations : '0') +
            "&token=" + $scope.order.token +
            "&tipo=" + ($scope.order.type == 'rent' ? 'renta' : $scope.order.type == 'event' ? 'evento' : 'cita');
        document.getElementById("rentMessagesModalCenterTitle").innerHTML = title;
        document.getElementById("rentMessagesModalCenterText").innerHTML = msg;
        document.getElementById("rentaConektaForm").setAttribute("action", parametrosURL);
        $("#rentMessagesModal").modal("show");
        document.getElementById("rentMessagesModal").style.display = "block";
    }

    isValidRent = (events, date) => {
        let result = true;
        for (let id in events) {
            if (events[id]) {
                let event = events[id];
                if ((date[0] <= new Date(event.fechaHoraInicio) && new Date(event.fechaHoraInicio) < date[1]) || (date[0] <= new Date(event.fechaHoraFin) && new Date(event.fechaHoraFin) < date[1])) {
                    result = false;
                }
            }
        }
        return result;
    };

    createNewBuyOrder = (buy, myRent) => {
        $scope.order = {
            id: buy.key,
            token: getRandomID(buy.key),
            client: {
                name: $scope.authUser ? $scope.authUser.nombre : "",
                address: $scope.authUser ? $scope.authUser.direccion : "",
                sex: $scope.authUser ? $scope.authUser.sexo : "",
                email: $scope.authUser ? convertDashToDot($scope.authUser.key) : "",
            },
            product: {
                key: buy.key,
                name: buy.nombre,
                description: buy.descripcion,
                location: buy.localizacion,
                address: buy.direccion,
                email: buy.owner,
                photos: buy.fotos,
                amount: buy.costo
            },
            start: myRent.start,
            end: myRent.end,
            cost: calculteRentCost(myRent, buy),
            owner: convertDashToDot(buy.owner),
            paid: false,
            title: "Rentado",
            type: "rent",
        };
        localStorage.setItem("actualOrder", JSON.stringify($scope.order));
        // localStorage.setItem("opperation", JSON.stringify(opperation));
    };

    generateOrderNumber = (buy, type) => {
        let timeStamp = new Date().getTime();
        let orderNumber = buy.key + "_" + buy.owner + "_" + buy.type + timeStamp;
        return orderNumber;
    };

    calculteRentCost = (rent, buy) => {
        let start = moment(rent.start);
        let end = moment(rent.end);
        let days = end.diff(start, "days") + 1;
        let desc7 = buy.desc7 ? (100 - parseInt(buy.desc7)) / 100 : 1;
        // let desc15 = buy.desc15 ? (100 - parseInt(buy.desc15)) / 100 : 1;
        let desc30 = buy.desc30 ? (100 - parseInt(buy.desc30)) / 100 : 1;
        // let coefic = days < 7 ? 1 : days < 15 ? desc7 : days < 30 ? desc15 : desc30;
        let coefic = days < 7 ? 1 : days < 30 ? desc7 : desc30;
        return parseInt(buy.costo) * days * coefic;
    };

    refreshOfferts = () => {
        loadOfertasFromFB().then(result => {
            $scope.$apply(function () {
                $scope.listPublications = result;
                $scope.publications = $scope.listPublications;
            });
        });
    };

    //#endregion

    //#region ********************* Event Order *********************

    $scope.showEventDetails = event => {
        $scope.event = event;
        $scope.showWindow("eventDetailModal");
        set_foto();
    };

    $scope.createNewReservationOrder = (event) => {
        // let event = JSON.parse(localStorage.getItem('opperation')).data;
        let storedReservation = localStorage.getItem("opperation") ? JSON.parse(localStorage.getItem("opperation")).data.reservations : null;
        let reservations = storedReservation ? parseInt(storedReservation) : parseInt(document.getElementById("eventNoReservations").value);
        let capacidad = event.capacidad ? event.capacidad : event.event.capacity;
        let asistentes = event.asistentes >= 0 ? event.asistentes : event.event.asistentes;
        if ((reservations + parseInt(asistentes)) <= parseInt(capacidad)) {
            createReservation(event, reservations);
            localStorage.setItem("actualOrder", JSON.stringify($scope.order));
            if (!$scope.authUser) {
                saveEventOrderToLocalStore();
                // $scope.showWindow("login");
                // $("#login").modal("show");
            } else {
                if (localStorage.getItem("opperation")) {
                    document.getElementById("reservationErrorMessage").style.display = "none";
                    localStorage.removeItem("opperation");
                }
                // createStripeForm("rentaStripeForm");
            }
            rentConfirmation(
                "Confirmación",
                `Ud. está a punto de reservar ${$scope.order.reservations} cupo${$scope.order.reservations > 1 ? "nes" : ""} en "<b>${$scope.order.event.name}</b>" por un monto de $ <b>${$scope.order.cost}</b> MXN.`,
                false,
            );
        } else {
            document.getElementById("reservationErrorMessage").style.display = "block";
        }
    };

    saveEventOrderToLocalStore = () => {
        let opperation = {
            type: "createNewEventOrder",
            data: $scope.order
        };
        localStorage.setItem("opperation", JSON.stringify(opperation));
    };

    createReservation = (event, reservations) => {
        $scope.order = {
            id: event.key,
            token: getRandomID(event.key),
            client: {
                name: $scope.authUser ? $scope.authUser.nombre : "",
                address: $scope.authUser ? $scope.authUser.direccion : "",
                sex: $scope.authUser ? $scope.authUser.sexo : "",
                email: $scope.authUser ? convertDashToDot($scope.authUser.key) : "",
            },
            event: {
                description: event.event ? event.event.descripcion : event.descripcion,
                key: event.event ? event.event.key : event.key,
                name: event.event ? event.event.name : event.nombre,
                address: event.event ? event.event.address : event.direccion,
                location: event.event ? event.event.location : event.localizacion,
                hour: event.event ? event.event.hour : event.hora,
                date: event.event ? event.event.date : event.fecha,
                amount: event.event ? event.event.amount : event.costo,
                capacity: event.event ? event.event.capacity : event.capacidad,
                organizador: event.event ? event.event.organizador : event.organizador,
            },
            start: event.event ? event.event.fechaHoraInicio : event.fechaHoraInicio,
            end: event.event ? event.event.fechaHoraFin : event.fechaHoraFin,
            cost: event.event ? event.cost : (parseFloat(event.costo) * reservations),
            owner: convertDashToDot(event.owner),
            paid: false,
            title: "Reservación",
            type: "event",
            reservations: reservations
        };
    };

    //TODO: Actualizar eventos
    // createEventPurchase = () => {
    //     let order = {
    //         client: $scope.order.client.name + " (" + $scope.order.client.email + ")",
    //         cost: $scope.order.cost,
    //         dateTime: $scope.order.event.date,
    //         specialist: $scope.order.event.organizador,
    //         transaction: $scope.order.id,
    //         paid: false,
    //         reservations: $scope.order.reservations,
    //         capacity: "" +
    //             (parseInt($scope.order.event.capacity) -
    //                 parseInt($scope.order.reservations)),
    //         type: $scope.order.type,
    //     };
    //     updateEventsInFB(order);
    //     updateEvens();
    //     let text = "Cliente: " + $scope.order.client.name + " \nEvento: " + $scope.order.event.name + " \nFecha: " + $scope.order.event.date + " \nNo. de personas: " + $scope.order.reservations + " \nCódigo de reserva: " + $scope.order.id;
    //     generateQR("eventQR", text);
    //     // $("#eventConfirmModal").modal("show");
    //     localStorage.removeItem("opperation");
    //     $scope.showWindow("clientConfirmModal");
    // };

    updateEvens = () => {
        loadCitasFromFB($scope.specialist.key).then(result => {
            $scope.$apply(function () {
                $scope.listEvents = result;
            });
        });
    };

    //#endregion

    //#region ********************* Stripe / PayPal *********************

    $scope.payWithPayPal = () => {
        $scope.closeModals();
        setUpPaypalTransaction();
    };

    setUpPaypalTransaction = () => {
        let order = $scope.order;
        $scope.showWindow("pay");
        $("#paypal-button-container").html("");
        paypal
            .Buttons({
                createOrder: function (data, actions) {
                    return actions.order.create({
                        purchase_units: [{
                            description: order.title + ": " + order.id.split("_")[1] + " - " + order.client.name,
                            amount: {
                                value: order.cost,
                            },
                        }],
                    });
                },
                onApprove: function (data, actions) {
                    return actions.order.capture().then(function (details) {
                        $scope.showWindow("service");
                        let orderType = order.type == "date" ? "cita" : order.type == "rent" ? "renta" : "evento";
                        createPurchaseTransaction(orderType);
                    });
                },
            })
            .render("#paypal-button-container");
    };

    createStripeForm = (sform) => {
        let form = document.getElementById(sform);
        deleteElement(sform, "input");

        let id = document.createElement('input');
        id.setAttribute('type', 'hidden');
        id.setAttribute('name', 'id');
        id.setAttribute('value', $scope.order.id);
        form.appendChild(id);
        let costo = document.createElement('input');
        costo.setAttribute('type', 'hidden');
        costo.setAttribute('name', 'costo');
        costo.setAttribute('value', $scope.order.cost);
        form.appendChild(costo);
        let fechaHoraFin = document.createElement('input');
        fechaHoraFin.setAttribute('type', 'hidden');
        fechaHoraFin.setAttribute('name', 'fechaHoraFin');
        fechaHoraFin.setAttribute('value', $scope.order.end);
        form.appendChild(fechaHoraFin);
        let fechaHoraInicio = document.createElement('input');
        fechaHoraInicio.setAttribute('type', 'hidden');
        fechaHoraInicio.setAttribute('name', 'fechaHoraInicio');
        fechaHoraInicio.setAttribute('value', $scope.order.start);
        form.appendChild(fechaHoraInicio);
        let idClient = document.createElement('input');
        idClient.setAttribute('type', 'hidden');
        idClient.setAttribute('name', 'idClient');
        idClient.setAttribute('value', convertDotToDash($scope.order.client.email));
        form.appendChild(idClient);
        let idOferta = document.createElement('input');
        idOferta.setAttribute('type', 'hidden');
        idOferta.setAttribute('name', 'idOferta');
        idOferta.setAttribute('value', convertDotToDash($scope.order.specialist ? $scope.order.specialist.key : $scope.order.product ? $scope.order.product.key : $scope.order.event.key));
        let owner = document.createElement('input');
        owner.setAttribute('type', 'hidden');
        owner.setAttribute('name', 'idOferta');
        owner.setAttribute('value', convertDotToDash($scope.order.owner));
        form.appendChild(owner);
        let reservations = document.createElement('input');
        reservations.setAttribute('type', 'hidden');
        reservations.setAttribute('name', 'reservations');
        reservations.setAttribute('value', $scope.order.reservations ? $scope.order.reservations : '');
        form.appendChild(reservations);
        let type = document.createElement('input');
        type.setAttribute('type', 'hidden');
        type.setAttribute('name', 'type');
        type.setAttribute('value', $scope.order.type == "date" ? "cita" : $scope.order.type == "rent" ? "renta" : "evento");
        form.appendChild(type);

        let idOfertante = document.createElement('input');
        idOfertante.setAttribute('type', 'hidden');
        idOfertante.setAttribute('name', 'idOfertante');
        idOfertante.setAttribute('value', $scope.order.specialist ? $scope.order.specialist.email : $scope.order.product ? $scope.order.product.email : $scope.order.event.email);
        form.appendChild(idOfertante);
        let Client_name = document.createElement('input');
        Client_name.setAttribute('type', 'hidden');
        Client_name.setAttribute('name', 'Client_name');
        Client_name.setAttribute('value', $scope.order.client.name);
        form.appendChild(Client_name);
        let Address = document.createElement('input');
        Address.setAttribute('type', 'hidden');
        Address.setAttribute('name', 'Address');
        Address.setAttribute('value', $scope.order.client.address);
        form.appendChild(Address);
        let Email = document.createElement('input');
        Email.setAttribute('type', 'hidden');
        Email.setAttribute('name', 'Email');
        Email.setAttribute('value', $scope.order.client.email);
        form.appendChild(Email);
    }

    stripePaymentAprobal = () => {
        $scope.specialist = JSON.parse(localStorage.getItem("specialist"));
        $scope.order = JSON.parse(localStorage.getItem("actualOrder"));
        let order = $scope.order;
        let orderType = order.type == "date" ? "cita" : order.type == "rent" ? "renta" : "evento";
        // processStripeOrder();
        createPurchaseTransaction(orderType);
        localStorage.removeItem("specialist");
        localStorage.removeItem("actualOrder");
    }

    processStripeOrder = async () => {
        let stripeToken = getURLParameter("stripeToken");
        let stripeTokenType = getURLParameter("stripeTokenType");
        let stripeEmail = getURLParameter("stripeEmail").split("#")[0];
        // let stripe = Stripe('pk_test_51HPeqZDOaHmRbwWWMD8TbfuZCCbyqdPMsPl3eWDDGX9BQqu8xGSgf00EqNbDmp3yxaKkEb1zmmQ4Sh08YYZBhWXq00F7fsM0aR', {
        //     stripeAccount: stripeToken
        // });

        // curl https://api.stripe.com/v1/charges \
        // -u sk_test_51HPeqZDOaHmRbwWW4ExFBW9hWxFgQRJEvdifZEuBSF40LFoLcB7vuMwSBIbejygLgMsrcwKJC8vHZwdCuXPfZBGL00SkqTPRcR: \
        // -d amount = 999 \
        // -d currency = mxn \
        // -d description = "Example charge" \
        // -d source = tok_visa

        $.ajax("https://api.stripe.com/v1/payment_intents", {
            method: "GET",
            crossDomain: true,
            beforeSend: function (req) {
                req.setRequestHeader('Authorization', 'Bearer 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');
            },
            data: {
                'amount': $scope.order.cost * 100,
                'currency': 'mxn'
            },
            dataType: "json",
            success: (data) => {
                console.log(data) // your data
            },
            error: (xhr, textStatus, errorThrown) => {
                console.log(textStatus, errorThrown);
            }
        });

        // curl https://api.stripe.com/v1/payment_intents \
        // -u sk_test_51HPeqZDOaHmRbwWW4ExFBW9hWxFgQRJEvdifZEuBSF40LFoLcB7vuMwSBIbejygLgMsrcwKJC8vHZwdCuXPfZBGL00SkqTPRcR: \
        // -d "payment_method_types[]" = card \
        // -d amount = 1000 \
        // -d currency = mxn \
        // -d application_fee_amount = 123 \
        // -H "Stripe-Account: {{CONNECTED_STRIPE_ACCOUNT_ID}}"

        // $.ajax("https://api.stripe.com/v1/payment_intents", {
        //     method: "GET",
        //     crossDomain: true,
        //     beforeSend: function (req) {
        //         req.setRequestHeader('Authorization', 'Bearer sk_test_51HPeqZDOaHmRbwWW4ExFBW9hWxFgQRJEvdifZEuBSF40LFoLcB7vuMwSBIbejygLgMsrcwKJC8vHZwdCuXPfZBGL00SkqTPRcR');
        //     },
        //     data: {
        //         'amount': $scope.order.cost,
        //         'currency': 'mxn'
        //     },
        //     dataType: "json",
        //     success: (data) => {
        //         console.log(data) // your data
        //     },
        //     error: (xhr, textStatus, errorThrown) => {
        //         console.log(textStatus, errorThrown);
        //     }
        // });

    }

    createPurchaseTransaction = (tipo, generateConfirmation = true) => {
        let text;
        let idOferta = $scope.order.id;
        if (tipo == "cita" || tipo == "date") {
            idOferta = $scope.order.specialist.key;
            text = "Cliente: " + $scope.order.client.name + " \nEspecialista: " + $scope.order.specialist.name + " \nFecha: " + $scope.order.start + " \nCódigo de reserva: " + $scope.order.id;
        } else if (tipo == "renta" || tipo == "rent") {
            text = "Cliente: " + $scope.order.client.name + " \nRenta: " + $scope.order.product.name + " \nCódigo de reserva: " + $scope.order.id;
        } else {
            text = "Cliente: " + $scope.order.client.name + " \nEvento: " + $scope.order.event.name + " \nFecha: " + $scope.order.event.date + " \nNo. de personas: " + $scope.order.reservations + " \nCódigo de reserva: " + $scope.order.id;
        }
        generateQR("confirmationQR", text);
        $scope.cancelPayment();
    };

    confirmCancelation = () => {
        let transaccion = {
            costo: $scope.order.cost,
            pagado: false,
            fechaHoraFin: $scope.order.end,
            fechaHoraInicio: $scope.order.start,
            reservations: $scope.order.reservations ? $scope.order.reservations : "",
            tipo: "cita",
            idOferta: $scope.authUser.key,
            idClient: $scope.authUser.key,
            owner: convertDashToDot($scope.authUser.key)
        };
        $scope.order.id = updateTransaccionInFB(transaccion);
        $scope.getSpecialistDates();
    };

    $scope.showReservation = (date) => {
        let text;
        let temporalOrder = $scope.order;
        $scope.order = {
            "client": { "name": $scope.authUser.nombre },
            "token": date.token,
            "specialist": date.tipo == "cita" || date.tipo == "date" ? {
                "name": date.specialist,
                "address": $scope.listSpecialists[date.idOferta].direccion,
                "location": $scope.listSpecialists[date.idOferta].localizacion,
                "email": $scope.listSpecialists[date.idOferta].email
            } : null,
            "product": date.tipo == "renta" ? { "name": date.idOferta } : null,
            "event": date.tipo == "evento" ? { "name": date.idOferta } : null,
            "start": date.fechaHoraInicio,
            "cost": date.tipo == "cita" ? $scope.listSpecialists[date.idOferta].laboral.costo : date.tipo == "renta" ? $scope.listPublications[date.idOferta].costo : $scope.listEvents[date.idOferta].costo
        };
        if (date.tipo == "cita" || date.tipo == "date") {
            text = "Cliente: " + $scope.authUser.nombre + " \nEspecialista: " + date.specialist + " \nFecha: " + date.fechaHoraInicio + " \nCódigo de reserva: " + date.key;
        } else if (date.tipo == "renta" || date.tipo == "rent") {
            text = "Cliente: " + $scope.authUser.nombre + " \nRenta: " + date.idOferta + " \nCódigo de reserva: " + date.key;
        } else {
            text = "Cliente: " + $scope.authUser.nombre + " \nEvento: " + date.idOferta + " \nFecha: " + date.fechaHoraInicio + " \nNo. de personas: " + date.reservations + " \nCódigo de reserva: " + date.key;
        }
        generateQR("confirmationQR", text);
        localStorage.removeItem("opperation");
        $scope.showWindow("clientConfirmModal");
        $scope.$apply();
        $scope.order = temporalOrder;
    }

    $scope.setNotifications = (date) => {
        $scope.specialist.notificaciones = date;
        updateUserPersonalToFB($scope.specialist.key, $scope.specialist);
    }

    sendNotificationSMS = (cell, cmd) => {
        if (cell) {
            var data = JSON.stringify({
                "messages": [
                    {
                        "source": "mashape",
                        "from": "+525549998455",
                        "body": cmd,
                        "to": cell,
                        "schedule": "1452244637",
                        "custom_string": ""
                    }
                ]
            });

            var xhr = new XMLHttpRequest();
            xhr.withCredentials = true;

            xhr.addEventListener("readystatechange", function () {
                if (this.readyState === this.DONE) {
                    console.log(this.responseText);
                }
            });

            xhr.open("POST", "https://clicksend.p.rapidapi.com/sms/send");
            xhr.setRequestHeader("authorization", "Basic ZHRhLmxhYnMuY29udGFjdEBnbWFpbC5jb206Q2xpY2tTZW5kMSE=");
            xhr.setRequestHeader("x-rapidapi-host", "clicksend.p.rapidapi.com");
            xhr.setRequestHeader("x-rapidapi-key", "b5b6923ae4msh2a00690679b59b2p197fb2jsn06eb2d5a0c3a");
            xhr.setRequestHeader("content-type", "application/json");
            xhr.setRequestHeader("accept", "application/json");

            xhr.send(data);
        }
    }

    //#endregion

    //#region ********************* Generales *********************

    $scope.closeModals = () => {
        $(".modal").modal("hide");
    };

    confirmation = (title, msg, hide) => {
        $(".preloader").hide();
        if (hide) {
            $scope.closeModals();
        }
        document.getElementById("messagesModalCenterTitle").innerHTML = title;
        document.getElementById("messagesModalCenterText").innerHTML = msg;
        $("#messagesModal").modal("show");
    };

    generateQR = (placeHolder, text) => {
        let typeNumber = 0;
        let errorCorrectionLevel = "L";
        let qr = qrcode(typeNumber, errorCorrectionLevel);
        qr.addData(text);
        qr.make();
        document.getElementById(placeHolder).innerHTML = qr.createImgTag();
    };

    setSlider = () => {
        $(".variable").slick({
            dots: true,
            infinite: true,
            autoplay: true,
            variableWidth: true
        });
    }

    showPreloader = () => {
        document.getElementById("preloader").style.display = "block";
        document.getElementById("preloader").style.position = "fixed";
    }

    hidePreloader = () => {
        document.getElementById("preloader").style.display = "none";
        // document.getElementById("preloader").style.position = "relative";
    }

    // isValidUserData = () => {
    //     let result = true;
    //     result = document.getElementById("inputClienteEdad").value && document.getElementById("inputClienteEdad").value > 15 ? result : false;
    //     result = document.getElementById("inputClienteTelefono").value ? result : false;
    //     result = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,4})+$/.test(document.getElementById("inputClienteEmail").value) ? result : false;
    //     return result;
    // }

    //#endregion

    //#region ********************* Cámara *********************
    let videoObj = {
        video: true,
    };
    let errBack = function (error) {
        alert("Error Capturando el video: ", error.code);
    };
    let video = document.getElementById("video");
    let canvas = document.getElementById("canvas");
    let localMedia;

    $scope.iniciarMedia = () => {
        if (navigator.getUserMedia) {
            navigator.getUserMedia(videoObj, $scope.iniciarWebcam, errBack);
        } else if (navigator.webkitGetUserMedia) {
            navigator.webkitGetUserMedia(videoObj, $scope.iniciarWebcam, errBack);
        } else if (navigator.mozGetUserMedia) {
            navigator.mozGetUserMedia(videoObj, $scope.iniciarWebcam, errBack);
        }
    };

    $scope.iniciarWebcam = stream => {
        localMedia = stream;
        if (navigator.getUserMedia) {
            video.srcObject = stream;
        } else if (navigator.webkitGetUserMedia) {
            video.srcObject = window.webkitURL.createObjectURL(stream);
        } else if (navigator.mozGetUserMedia) {
            video.srcObjects = window.URL.createObjectURL(stream);
        }
        video.play();
    };

    $scope.hideCamera = () => {
        video.style.display = "none";
        canvas.style.display = "none";
        document.getElementById("cameraBtn1").style.display = "initial";
        document.getElementById("cameraBtn2").style.display = "none";
        document.getElementById("captureBtn").style.display = "none";
        document.getElementById("inputFotoLocal").style.display = "initial";
    };

    $scope.showCamera = () => {
        video.style.display = "block";
        canvas.style.display = "none";
        document.getElementById("cameraBtn1").style.display = "none";
        document.getElementById("cameraBtn2").style.display = "initial";
        document.getElementById("captureBtn").style.display = "initial";
        document.getElementById("inputFotoLocal").style.display = "none";
        $scope.iniciarMedia();
    };

    $scope.capturePhoto = imgContainer => {
        canvas.style.display = "block";
        canvas.width = video.offsetWidth;
        canvas.height = video.offsetHeight;
        let context = canvas.getContext("2d");
        context.drawImage(video, 0, 0, canvas.offsetWidth, canvas.offsetHeight);
        video.style.display = "none";
        document.getElementById(imgContainer).src = canvas.toDataURL("image/png");
        $scope.specialistPhotoFile = canvas.toDataURL("image/png");
        $scope.specialistPhotoFile.files[0].name = "fotoEspecialista";
    };
    //#endregion ********************* Cámara *********************

    //#region ********************* Initialization *********************

    $scope.initialization = () => {
        $scope.searchCriteria = "";
        $scope.searchFilter = "searchResult";
        $scope.selectedWindow = "home";
        $scope.backWindow = "home";
        $scope.searchMobile = true;
        $scope.maxNoSpecialists = 4;
        $scope.maxNoOferts = 3;
        $scope.maxNoEvents = 3;
        $scope.modalResult = false;
        $scope.perfilPageNav = 0;
        $scope.today = today();
        $scope.showLoginModal = false;
        $scope.tipoUsuario = 0;
        $scope.tipoOferta = 0;
        $scope.rentaMultiple = true;
        $scope.estadoLlamada = 'Colgado';
        $scope.direccionLlamada = 'Entrante';
        $scope.scoreAppointment = '';
        $scope.eventoHoy = false;
        $scope.messages = {
            "home": "Apsico",
            "services": "Servicios",
            "showUserAppointments": "Mis citas",
            "jobModal": "Mi perfil",
            "team": "Especialistas",
            "rent": "Rentas",
            "events": "Eventos",
            "showUserRents": "Mis rentas",
            "showUserEvents": "Mis eventos",
            "adminDates": "Consultas",
            "adminOfferts": "Administrar",
            "adminTransactions": "Transacciones",
            "help": "Ayuda",
            "specialistDetail": "Apsico",
            "buyDetailModal": "Apsico",
            "eventDetailModal": "Apsico",
            "searchResult": "Apsico",
            "usersAdministration": "Usuarios",
            "adminPayments": "Pagos",
            "notifications": "Notificaciones"
        };
        $scope.rent_foto = 0;

        //nobackbutton();

        let href = window.location.href.split('#!');
        if (!(href[0].includes('https') || href[0].includes('localhost')) || href[1] != '/') {
            window.location.href = href[0] + "#!/";
        }

        initPromises();
        listenUserStatus();
        refreshData();
        checkOffertNotifications();
        checkDateNotifications();
        refreshOfertsInRealTime();
        //getFullscreen(document.documentElement);
    };

    set_foto = () => {
        $scope.rent_foto = 0;
    }

    $scope.select_foto = (idx) => {
        $scope.rent_foto = idx;
    }

    showDisplay = () => {
        $('.preloader').hide();
        document.getElementById("displayRegion").style.display = "block";
    }

    //#endregion ********************* Initialization *********************

});

app.filter("capitalize", function () {
    return function (input) {
        return !!input ?
            input.charAt(0).toUpperCase() + input.substr(1).toLowerCase() :
            "";
    };
});

// #region Geolocation

function getmyIPLocation() {
    $.getJSON("http://www.geoplugin.net/json.gp?jsoncallback=?", function (data) {
        console.log(JSON.stringify(data, null, 2));
    });
}

function getMyGeolocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function (objPosition) {
                let lon = objPosition.coords.longitude;
                let lat = objPosition.coords.latitude;
                console.log("Latitud: " + lon + " Longitud: " + lat);
                findLocation(lon, lat);
            },
            function (objPositionError) {
                geolocationErrors(objPositionError);
            }, {
            maximumAge: 75000,
            timeout: 15000,
        },
        );
    } else {
        console.log("Su sistema no permite geolocalización.");
    }
}

function geolocationErrors(objPositionError) {
    switch (objPositionError.code) {
        case objPositionError.PERMISSION_DENIED:
            console.log("No se ha permitido el acceso a la posición del usuario.");
            break;
        case objPositionError.POSITION_UNAVAILABLE:
            console.log("No se ha podido acceder a la información de su posición.");
            break;
        case objPositionError.TIMEOUT:
            console.log("El servicio ha tardado demasiado tiempo en responder.");
            break;
        default:
            console.log("Error desconocido.");
    }
}

function findLocation(lon, lat) {
    let geocoder = new google.maps.Geocoder();
    let latlng = {
        lat: parseFloat(lat),
        lng: parseFloat(lon),
    };
    geocoder.geocode({ location: latlng }, function (results, status) {
        // si la solicitud fue exitosa
        if (status === google.maps.GeocoderStatus.OK) {
            // si encontró algún resultado.
            if (results[1]) {
                console.log(results[1].formatted_address);
            }
        }
    });
}

// #endregion Geolocation

function nobackbutton() {
    // window.location.hash = "no-back-button";
    // window.location.hash = "Again-No-back-button" //chrome
    // window.onhashchange = function () { window.location.hash = "no-back-button"; }
}

function getFullscreen(element) {
    if (element.requestFullscreen) {
        element.requestFullscreen();
    } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
    } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
    }
}
