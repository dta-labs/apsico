// let videoObj = {
//     "video": true
// };
// let errBack = function (error) {
//     alert("Error Capturando el video: ", error.code);
// };
// let video = document.getElementById('video');
// let canvas = document.getElementById('canvas');
// let localMedia;

// function iniciarMedia() {
//     if (navigator.getUserMedia) {
//         navigator.getUserMedia(videoObj, iniciarWebcam, errBack);
//     } else if (navigator.webkitGetUserMedia) {
//         navigator.webkitGetUserMedia(videoObj, iniciarWebcam, errBack);
//     } else if (navigator.mozGetUserMedia) {
//         navigator.mozGetUserMedia(videoObj, iniciarWebcam, errBack);
//     };
// }

// function iniciarWebcam(stream) {
//     localMedia = stream;
//     if (navigator.getUserMedia) {
//         video.srcObject = stream;
//     } else if (navigator.webkitGetUserMedia) {
//         video.srcObject = window.webkitURL.createObjectURL(stream);
//     } else if (navigator.mozGetUserMedia) {
//         video.srcObjects = window.URL.createObjectURL(stream);
//     };
//     video.play();
// };

// function hideCamera() {
//     video.style.display = "none";
//     canvas.style.display = "none";
//     document.getElementById("cameraBtn1").style.display = "initial";
//     document.getElementById("cameraBtn2").style.display = "none";
//     document.getElementById("captureBtn").style.display = "none";
//     document.getElementById('inputFotoLocal').style.display = 'initial';
// }

// function showCamera() {
//     video.style.display = "block";
//     canvas.style.display = "none";
//     document.getElementById("cameraBtn1").style.display = "none";
//     document.getElementById("cameraBtn2").style.display = "initial";
//     document.getElementById("captureBtn").style.display = "initial";
//     document.getElementById('inputFotoLocal').style.display = 'none';
//     iniciarMedia();
// }

// function capturePhoto(imgContainer, imageURL) {
//     canvas.style.display = "block";
//     canvas.width = video.offsetWidth;
//     canvas.height = video.offsetHeight;
//     let context = canvas.getContext("2d");
//     context.drawImage(video, 0, 0, canvas.offsetWidth, canvas.offsetHeight);
//     video.style.display = "none";
//     document.getElementById(imgContainer).src = canvas.toDataURL("image/png");
//     imageURL = canvas.toDataURL("image/png");
// }