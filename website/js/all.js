// Options
let LENGTH_LIGNIN_POLY;
let MIN_BREAKABLE_LINK;
let MAX_BREAKABLE_LINK;

let TEMPERATURE = 453;
let LIGNIN_MASS = 0.1;
let SYRINGOL_FRACTION = 0.75;
let SALIENT_VOLUME = 20;

let REPEAT = 1;

let Na = 6.022 * Math.pow(10, 23);
let rB04 = 1.37222 * Math.pow(10, -8);
let rOther = 1.5099 * Math.pow(10, -8);
let mH = Math.pow(10, -24);
let R = 8.314;
let pi = Math.PI;
let kB = 1.38 * Math.pow(10, -23);
let mS = 222;
let mG = 196;
let H = Math.pow(9.10, 20);
let EaMiddle = 67780;
let EaEnd = 22175;
let e = Math.exp(1);

// Optimisation to compute collisionNb
let linkToAnalysis;

// Results of experiment
let loggerInfo;

function last(array) {return array[array.length - 1];}

function mLignin() {
    return (SYRINGOL_FRACTION * mS + (1 - SYRINGOL_FRACTION) * mG) * LENGTH_LIGNIN_POLY;
}

function ligninConcentration() {
    return (LIGNIN_MASS * Na) / (mLignin() * SALIENT_VOLUME)
}

function zMiddle(links) {
    let bMiddle = 0;
    links.slice(1, -1).forEach((v) => bMiddle += v);
    bMiddle *= ligninConcentration();

    return H * bMiddle * rB04 * rB04 * Math.sqrt(8 * pi * kB * TEMPERATURE / mH) * e ** (-EaMiddle / (R * TEMPERATURE))
}

function zEnd(links) {
    let bEnd = ((links.length < 2) ? links[0] : (links[0] + last(links))) * ligninConcentration();

    return H * bEnd * rB04 * rB04 * Math.sqrt(8 * pi * kB * TEMPERATURE / mH) * e ** (-EaEnd / (R * TEMPERATURE))
}

function chooseLinkType(links) {
    let size = 1000000;
    let pE = zEnd(links);
    let pM = zMiddle(links);

    let tot = (pE + pM);
    pE /= tot;
    pM /= tot;

    let p = [];
    for (let i = 0; i < Math.floor(pE * size); i++) {
        p.push("END");
    }
    for (let i = 0; i < Math.floor(pM * size); i++) {
        p.push("MIDDLE");
    }

    //p.sort(() => Math.random() - 0.5);
    //console.log(linksToString(links), "End", pE, ", ", Math.floor(pE * size), "Middle",  pM, ", ",Math.floor(pM * size));
    return p;
}

// Computes collisionNb and singleton
function analyse(links) {
    let linksString = linksToString(links);

    // If already computed, return saved results
    if (linkToAnalysis.has(linksString)) {
        return linkToAnalysis.get(linksString);
    }

    if (links.reduce((x, y) => x + y, 0) == 0) {
        switch (links.length) {
            case 0:
                return { collisionNb: 0, monomereNb: 1, dimereNb: 0, trimereNb: 0, oligoNb: 0 };
            case 1:
                return { collisionNb: 0, monomereNb: 0, dimereNb: 1, trimereNb: 0, oligoNb: 0 };
            case 2:
                return { collisionNb: 0, monomereNb: 0, dimereNb: 0, trimereNb: 1, oligoNb: 0 };
            default:
                return { collisionNb: 0, monomereNb: 0, dimereNb: 0, trimereNb: 0, oligoNb: 1 };
        }

    }

    let meanCollisionNb = 0;
    let meanMonomereNb = 0;
    let meanDimereNb = 0;
    let meanTrimereNb = 0;
    let meanOligoNb = 0;
    let nbRepeat = REPEAT;
    let probabilities = chooseLinkType(links);

    for (let _ = 0; _ < nbRepeat; _++) {
        let i = Math.floor(Math.random() * probabilities.length);
        let breakType = probabilities[i];

        let possibleLinks = [];
        if (breakType == "END") {
            if (links[0]) {
                possibleLinks.push(0);
            }
            if (last(links)) {
                possibleLinks.push(links.length - 1);
            }
        } else {
            links.slice(1, -1).forEach((v, index) => {
                if (v) {
                    possibleLinks.push(index + 1);
                }
            });
        }
        let breakIndex = possibleLinks.sort(() => Math.random() - 0.5)[0];
        let temp1 = analyse(links.slice(0, breakIndex));
        let temp2 = analyse(links.slice(breakIndex + 1));

        meanCollisionNb += 1 + temp1.collisionNb + temp2.collisionNb;
        meanMonomereNb += temp1.monomereNb + temp2.monomereNb;
        meanDimereNb += temp1.dimereNb + temp2.dimereNb;
        meanTrimereNb += temp1.trimereNb + temp2.trimereNb;
        meanOligoNb += temp1.oligoNb + temp2.oligoNb;
    }

    meanCollisionNb /= nbRepeat;
    meanMonomereNb /= nbRepeat;
    meanDimereNb /= nbRepeat;
    meanTrimereNb /= nbRepeat;
    meanOligoNb /= nbRepeat;

    //meanSingleton = meanSingleton * LIGNIN_MASS / LENGTH_LIGNIN_POLY;

    let result = {
        collisionNb: meanCollisionNb,
        monomereNb: meanMonomereNb,
        dimereNb: meanDimereNb,
        trimereNb: meanTrimereNb,
        oligoNb: meanOligoNb };
    // Save the result for this link
    linkToAnalysis.set(linksToString(links), result);

    //console.log(result);

    return result;
}

// n: number of possible breakable links
function testAll(n) {
    console.log(n);
    let index = [];// indexes of breakable links
    let stop = false;
    let links = [];// One chain to analyse

    // Initialize results
    loggerInfo.set(n, { meanCollisionNb: 0, meanMonomereNb: 0, meanDimereNb: 0, meanTrimereNb: 0, meanOligoNb: 0, details: []});
    // Initialize index
    for (let i = 0; i < n; i++) {
        index.push(i);
    }

    // Initialize links, no breakable link at the beginning
    for(let i = 0; i < LENGTH_LIGNIN_POLY; i++) {
        links.push(false);
    }

    // Compute collisionNb and singleton for all possible links
    while(!stop) {
        try {
            if(last(index) < LENGTH_LIGNIN_POLY) {
                // Set breakable links
                for(let i = 0; i < links.length; i++) {
                    links[i] = (index.includes(i)) ? true : false;
                }
                let analysis = analyse(links);

                loggerInfo.get(n).meanCollisionNb += analysis.collisionNb;
                loggerInfo.get(n).meanMonomereNb += analysis.monomereNb;
                loggerInfo.get(n).meanDimereNb += analysis.dimereNb;
                loggerInfo.get(n).meanTrimereNb += analysis.trimereNb;
                loggerInfo.get(n).meanOligoNb += analysis.oligoNb;

                loggerInfo.get(n).details.push({ array: links.slice(),
                    collisionNb: analysis.collisionNb,
                    monomereNb: analysis.monomereNb * 100/(n + 1),
                    dimereNb: analysis.dimereNb * 100/(n + 1),
                    trimereNb: analysis.trimereNb * 100/(n + 1),
                    oligoNb: analysis.oligoNb * 100/(n + 1) });
            }
            index = nextIndex(index); // Can throw the error NO_MORE
        } catch(err) {
            console.log(err);
            stop = true;
        }
    }
    loggerInfo.get(n).meanCollisionNb /= loggerInfo.get(n).details.length;
    loggerInfo.get(n).meanMonomereNb /= loggerInfo.get(n).details.length;
    loggerInfo.get(n).meanDimereNb /= loggerInfo.get(n).details.length;
    loggerInfo.get(n).meanTrimereNb /= loggerInfo.get(n).details.length;
    loggerInfo.get(n).meanOligoNb /= loggerInfo.get(n).details.length;

    loggerInfo.get(n).meanMonomereNb *= 100/(n + 1);
    loggerInfo.get(n).meanDimereNb *= 100/(n + 1);
    loggerInfo.get(n).meanTrimereNb *= 100/(n + 1);
    loggerInfo.get(n).meanOligoNb *= 100/(n + 1);
}

// Compute the index of the next breakable link
function nextIndex(index) {
    if(index.length === 0) {
        throw "NO_MORE";
    }
    if (last(index) + 1 >= LENGTH_LIGNIN_POLY) {
        let temp = nextIndex(index.slice(0, -1));
        temp.push(last(temp) + 1);
        return temp;
    } else {
        index[index.length - 1] += 1;
        return index;
    }
}

function start() {
    LENGTH_LIGNIN_POLY = parseInt(document.getElementById("nb-of-link").value);
    MIN_BREAKABLE_LINK = parseInt(document.getElementById("nb-breakable").value);
    MAX_BREAKABLE_LINK = parseInt(document.getElementById("nb-breakable").value);

    TEMPERATURE = parseFloat(document.getElementById("temperature").value);
    LIGNIN_MASS = parseFloat(document.getElementById("lignin-mass").value);
    SYRINGOL_FRACTION = parseFloat(document.getElementById("syringal-fraction").value);
    SALIENT_VOLUME = parseFloat(document.getElementById("salient-volume").value);
    REPEAT = parseFloat(document.getElementById("repeat").value);

    linkToAnalysis = new Map();

    loggerInfo = new Map();

    for (let n = MIN_BREAKABLE_LINK; n <= MAX_BREAKABLE_LINK; n ++) {
        testAll(n);
    }

    // Display results
    logResults();
    console.log(linkToAnalysis);

    // Make the download button appears
    document.getElementById("download-button").classList.add("discovered");
}

function logResults() {
    let meanTable = "<table><tr><th>Number of Breakable Link</th><th>Collision Number</th><th>Monomere Yield (%)</th><th>Dimere Yield (%)</th><th>Trimere Yield (%)</th><th>Oligo Yield (%)</th></tr>"
    let detailTables = "";
    loggerInfo.forEach((v, k, m) => {
        meanTable += `<tr><td>${k}</td><td>${v.meanCollisionNb.toFixed(3)}</td><td>${v.meanMonomereNb.toFixed(3)}</td><td>${(v.meanDimereNb).toFixed(3)}</td><td>${(v.meanTrimereNb).toFixed(3)}</td><td>${(v.meanOligoNb).toFixed(3)}</td></tr>`;
        detailTables += logDetailTable(k, v.details);
    });
    meanTable += "</table>";
    document.getElementById("results").innerHTML = meanTable + "<div id='details'>" + detailTables + "</div>";
}

function logDetailTable(n, details) {
    let table = `<table><tr><th>Links with ${n} breakable links</th><th>Collision Number</th><th>Monomere Yield (%)</th><th>Dimere Yield (%)</th><th>Trimere Yield (%)</th><th>Oligo Yield (%)</th></tr>`;
    details.forEach((v) => {
        table += `<tr><td>${linksToString(v.array)}</td><td>${v.collisionNb}</td><td>${v.monomereNb}</td><td>${v.dimereNb}</td><td>${v.trimereNb}</td><td>${v.oligoNb}</td></tr>`;
    });
    table += "</table>";
    return table;
}

function linksToString(links) {
    let s = "-";
    links.forEach((v, i) => {
        s += (v) ? "b" : ".";
        s += "-";
    })
    return s;
}

function exportCSV() {
    let csv = "data:text:/csv;charset=utf-8,";
    let maxLength = 0;
    loggerInfo.forEach((v, k, m) => {
        maxLength = Math.max(maxLength, v.details.length);
        csv += `,${k},`;
        csv += (k == MAX_BREAKABLE_LINK)? "\n":",";
    });

    loggerInfo.forEach((v, k, m) => {
        csv += `Links,Collision Number,Singleton Yield`;
        csv += (k == MAX_BREAKABLE_LINK) ? "\n" : ",";
    });

    for (let i = 0; i < maxLength; i++) {
        loggerInfo.forEach((v, k, m) => {
            if(v.details.length > i) {
                csv += `${linksToString(v.details[i].array)},${v.details[i].collisionNb},${v.details[i].monomereNb}`
            } else {
                csv += ",";
            }
            csv += (k == MAX_BREAKABLE_LINK) ? "\n" : ",";
        });
    }


    let encodedURI = encodeURI(csv);
    let link = document.createElement("a");
    link.setAttribute("href", encodedURI);
    link.setAttribute("download", "my_data.csv");
    document.body.appendChild(link);
    link.click();
}

document.getElementById("start-button").addEventListener("click", start);
document.getElementById("download-button").addEventListener("click", exportCSV);
