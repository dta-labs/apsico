function getURLParameter(paramName) {
    let result;
    let urlParam = window.location.href.split('?');
    if (urlParam[1]) {
        urlParam = urlParam[1].replace("%40", "@");
        let urlParamArray = urlParam.split('&');
        urlParamArray.forEach(param => {
            let paramArray = param.split('=');
            if (paramArray[0] == paramName) {
                result = paramArray[1];
            }
        });
    }
    return result;
}

function convertDashToDot(input) {
    return input.replace(/\-/g, ".");
}

function convertDotToDash(input) {
    return input.replace(/\./g, "-");
}

function transformItem(input) {
    let result = '';
    if (input) {
        var chars = {
            "á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u",
            "à": "a", "è": "e", "ì": "i", "ò": "o", "ù": "u",
            "â": "a", "ê": "e", "î": "i", "ô": "o", "û": "u",
            "ä": "a", "ë": "e", "ï": "i", "ö": "o", "ü": "u",
            "ã": "a", "ñ": "n", "©": "c", "®": "r", "¢": "c"
        }
        var expr = /[áàéèíìóòúùâêîôûäëïöüãñ©®¢]/ig;
        result = input.toLowerCase().replace(expr, function (e) { return chars[e] });
    }
    return result;
}

function today() {
    let now = new Date();
    let ed = easyDate(now);
    return `${ed.year}-${ed.month}-${ed.day}`; 
}

function easyDate(dateTime) {
    let year = dateTime.getFullYear();
    let month = ('0' + (dateTime.getMonth() + 1)).substr(-2);
    let day = ('0' + dateTime.getDate()).substr(-2);
    let dayOfWeek = dateTime.getDay();
    let hour = ('0' + dateTime.getHours()).substr(-2);
    let min = ('0' + dateTime.getMinutes()).substr(-2);
    return {
        year: year,
        month: month,
        day: day,
        dayOfWeek: dayOfWeek,
        date: year + '-' + month + '-' + day,
        hour: hour,
        min: min,
        time: hour + ':' + min,
        timeStamp: dateTime.getTime()
    }
}

function sortBy(list, param) {
    list.sort(function (a, b) {
        var x = a[param];
        var y = b[param];
        return (x < y) ? 1 : (x > y) ? -1 : 0;
    });
}

function getRandomID(op) {
    let rnd = Math.floor(Math.random() * 1000000);
    let tst = (new Date()).getTime();
    return op + "_" + tst + "_" + rnd;
}

