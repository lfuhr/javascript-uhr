'use strict';
/*
 Dieses Skript ist in seiner Implementierung auf das Üben der im Kurs gelernten Inhalte und der Sprache an sich zugeschnitten. Es werden folgende Praktiken soweit sinnvoll angewandt:

 http://www.w3schools.com/js/js_best_practices.asp :
 - Avoid Global Variables
 - Declarations on Top
 - Never Declare Number, String, or Boolean Objects (like new String("John");)
 - Use camelCase for names
 
 Single Responsibility Principle:
 Verschiedene SVG Dokumente können in die Methode zur Informationsextraktion injeziert werden.
 
 Livkovsches Substitutionsprinzip:
 Die SVG Uhr kann durch jede Funktion ersetzt werden, die die Parameter Stunde, Minute und Sekunde erwartet. 
 
 Don't repeat yourself:
 dreheZeiger dreht alle Zeiger.
 
 Das Dependency Inversion Principle wurde nicht angewandt. Man könnte die DOM Zugriffe komplett abstrahieren. In diesem Dokument sind DOM Zugriffe in den ersten beiden Funktionen und im DOMContentLoaded gekapselt.
*/

// SVG-Datei spezifische Informationen. Kapselt komplett den Zugriff auf die Elemente, sogar die existenz einer ID.
function SVG_DETAILS(svgDok) {
    var mittelpunkt = svgDok.getElementById('mittelkreis');
    return {
        sekundenzeiger: svgDok.getElementById('sekundenzeiger'),
        minutenzeiger: svgDok.getElementById('minutenzeiger'),
        stundenzeiger: svgDok.getElementById('stundenzeiger'),
        
        // Für beste Browser unterstützung verwende nicht die schicke Arrow Syntax als Impementierung eines funktonalen WHERE.
        // (o => ({x: o.getAttribute('cx'), y: o.getAttribute('cy')})) (document.getElementById('mittelkreis'))
        drehpunkt: {
            x: mittelpunkt.getAttribute('cx'),
            y: mittelpunkt.getAttribute('cy')
        }
    };
}

function erzeugeAnzeigeAusSvg(svgDok, svgDetails) {
    var mechanik = svgDetails(svgDok);

    function dreheZeiger(zeiger, absoluterWinkel) {
        // Hässliche String-Konkatenation in ES3.
        zeiger.setAttribute('transform', 'rotate(' + absoluterWinkel + ', ' + mechanik.drehpunkt.x + ', ' + mechanik.drehpunkt.y + ')');
    }
    // Closure verbirgt dass es sich um ein SVG Dokument handelt.
    return function (stunden, minuten, sekunden) {
        dreheZeiger(mechanik.sekundenzeiger, 6 * sekunden);
        dreheZeiger(mechanik.minutenzeiger, 6 * minuten + sekunden / 10);
        dreheZeiger(mechanik.stundenzeiger, 30 * stunden + minuten / 2);
    };
}

// Stellt sicher, dass eine Funktion nur einmal aufgerufen werden kann. Nicht mehr in Gebrauch, bin aber mächtig stolz drauf.
function einwegFunktion(f) {
    var ausgefuehrt = false;
    return function () {
        if (!ausgefuehrt) {
            ausgefuehrt = true;
            f.apply(this, arguments);
        } else {
            window.console.error("Doppelte Ausführung");
        }
    };
}


// Die Abweichung der Systemuhr von der tatsächlichen Zeit in ms. Also Zeit = Systemzeit - Drift
// Fehlerbehaftet, da im HTTP Head keine Millisekunden übertragen werden.
function getDriftFromSimpleNtp() {

    var anzahlMessungen = 5,
        minDauer = Infinity,
        drift = 0;
    
    // Einzelne Messung wird wegen der Variablen in Funktion gekapselt
    function messung() {
        var davor, danach, http, serverZeit, diffInMs;

        http = new XMLHttpRequest();
        http.open('HEAD', window.location, false);
        http.setRequestHeader('Cache-Control', 'no-cache'); // ganz wichtig sonst Probleme mit Chrome

        davor = Date.now();
        http.send(); // synchronous
        danach = Date.now();
        
        serverZeit = new Date(http.getResponseHeader('Date')).getTime();

        diffInMs = danach - davor;
        if (diffInMs < minDauer) {
            minDauer = diffInMs;
            drift = davor - serverZeit + Math.floor(diffInMs / 2);
        }
    }
    for (anzahlMessungen; anzahlMessungen > 0; anzahlMessungen -= 1) {
        messung();
    }
    return drift;
}

function Uhrwerk(anzeige, drift) { // Konstruktor
    this.drift = drift || 0;
    this.eingeschalten = true;
    
    var uhrwerk = this,
        naechsterTick = new Date(Date.now() - uhrwerk.drift);
    
    function ticke() {
        anzeige(naechsterTick.getHours(), naechsterTick.getMinutes(), naechsterTick.getSeconds());
        naechsterTick = new Date(Date.now() + 1000 - uhrwerk.drift);
        if (uhrwerk.eingeschalten) {
            setTimeout(ticke, 1000 - naechsterTick.getMilliseconds());
        }
    }
    ticke();
}


// Derzeit nicht für Internet Explorer geeignet.
window.addEventListener('DOMContentLoaded', function () {
    var svgEl = document.getElementById("radl");
    svgEl.addEventListener("load", function () {
        var analogAnzeige, doppelAnzeige, uhrwerk;
        analogAnzeige = erzeugeAnzeigeAusSvg(svgEl.contentDocument, SVG_DETAILS);
        
        // Nur zur Demonstration der Flexibilität
        doppelAnzeige = function (std, min, sek) {
            analogAnzeige(std, min, sek);
            document.getElementById("digitaluhr").innerHTML = std + ":" + min + ":" + sek;
        };
        uhrwerk = new Uhrwerk(doppelAnzeige);
        
        document.getElementById("zeitquelle").onchange = function () {
            switch (this.value) {
            case "server":
                uhrwerk.drift = getDriftFromSimpleNtp();
                break;
            case "client":
                uhrwerk.drift = 0;
                break;
            }
        };
    });
});