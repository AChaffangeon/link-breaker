// Options
let LENGTH_LIGNIM_POLY;
let MIN_BREAKABLE_LINK;
let MAX_BREAKABLE_LINK;

let TEMPERATURE = 453;
let LIGNIM_MASS = 0.1;
let SYRINGAL_FRACTION = 0.75;
let SALIENT_VOLUME = 20;

let SECURITY = 1000;
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
let EaMiddle = 30000;
let EaEnd = 20000;
let e = Math.exp(1);

// Optimisation to compute time
let linkToAnalysis;

// Results of experiment
let loggerInfo;

function last(array) {return array[array.length - 1];}

function mLignim(links) {
    return (SYRINGAL_FRACTION * mS + (1 - SYRINGAL_FRACTION) * mG) * links.length;
}

function lignimConcentration(links) {
    return (LIGNIM_MASS * Na) / (mLignim(links) * SALIENT_VOLUME)
}

function zMiddle(links) {
    let bMiddle = 0; 
    links.slice(1, -1).forEach((v) => bMiddle += v);
    bMiddle *= lignimConcentration(links);

    return H * bMiddle * rB04 * rB04 * Math.sqrt(8 * pi * kB * TEMPERATURE / mH) * e ** (-EaMiddle / (R * TEMPERATURE)) 
}

function zEnd(links) {
    let bEnd = ((links.length < 2) ? links[0] : (links[0] + last(links))) * lignimConcentration(links);

    return H * bEnd * rB04 * rB04 * Math.sqrt(8 * pi * kB * TEMPERATURE / mH) * e ** (-EaEnd / (R * TEMPERATURE))
}

function zOther(links) {
    let other = 0;
    links.slice(1, -1).forEach((v) => other += !v);
    other *= lignimConcentration(links)

    return H * other * rOther * rOther * Math.sqrt(8 * pi * kB * TEMPERATURE / mH)
}

function chooseLinkType(links) {
    let pE = zEnd(links);
    let pO = zOther(links);
    let pM = zMiddle(links);

    let tot = (pE + pO + pM);
    pE /= tot;
    pO /= tot;
    pM /= tot;

    let p = [];
    for (let i = 0; i < Math.floor(pE * 1000); i++) {
        p.push("END");
    }
    for (let i = 0; i < Math.floor(pO * 1000); i++) {
        p.push("OTHER");
    }
    for (let i = 0; i < Math.floor(pM * 1000); i++) {
        p.push("MIDDLE");
    }

    p.sort(() => Math.random() - 0.5);
    //console.log(linksToString(links),  "End", pE, "Middle", pM, "Other", pO);
    return p[0];
}

// Computes Time and singleton
function analyse(links) {
    let linksString = linksToString(links);

    // If already computed, return saved results
    if (linkToAnalysis.has(linksString)) {
        return linkToAnalysis.get(linksString);
    }

    if (links.length == 0) {
        return { time: 0, nbSingle: 1 };
    }

    if (links.reduce((x, y) => x + y) == 0) {
        return { time: 0, nbSingle: 0 };
    }

    let meanTime = 0;
    let meanSingleton = 0;
    let nbRepeat = REPEAT;
    for (let _ = 0; _ < nbRepeat; _++) {
        let breakType = chooseLinkType(links);
        let time = 0;
        let singleton = 0;
        let s = 0;

        while (breakType == "OTHER" && s < SECURITY) {
            time++;
            breakType = chooseLinkType(links);
            s++;
        }

        if (s >= SECURITY) {
            if (zEnd(links) > zMiddle(links)) {
                breakType = "END";
            } else {
                breakType = "MIDDLE";
            }
        }

        
        let possibleLinks = [];
        if (breakType == "END") {
            if (links[0]) {
                possibleLinks.push(0);
            }
            if (last(links)) {
                possibleLinks.push(links.length - 1);
            }
        } else if (breakType == "MIDDLE" ) {
            links.slice(1, -1).forEach((v, index) => {
                if (v) {
                    possibleLinks.push(index + 1);
                }
            });
        }
        let breakIndex = possibleLinks.sort(() => Math.random() - 0.5)[0];
        let temp1 = analyse(links.slice(0, breakIndex));
        let temp2 = analyse(links.slice(breakIndex + 1));
        
        time += 1 + temp1.time + temp2.time;
        singleton += temp1.nbSingle + temp2.nbSingle;

        meanTime += time;
        meanSingleton += singleton;
    }

    meanTime /= nbRepeat;
    meanSingleton /= nbRepeat;

    let result = {
        time: meanTime,
        nbSingle: meanSingleton
    }
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
    loggerInfo.set(n, { meanTime: 0, meanNbSingle: 0, details: []});

    // Initialize index
    for (let i = 0; i < n; i++) {
        index.push(i);
    }

    // Initialize links, no breakable link at the beginning
    for(let i = 0; i < LENGTH_LIGNIM_POLY; i++) {
        links.push(false);
    }

    // Compute time and singleton for all possible links
    while(!stop) {
        try {
            if(last(index) < LENGTH_LIGNIM_POLY) {
                // Set breakable links
                for(let i = 0; i < links.length; i++) {
                    links[i] = (index.includes(i)) ? true : false;
                }
                let analysis = analyse(links);
                
                loggerInfo.get(n).meanTime += analysis.time;
                loggerInfo.get(n).meanNbSingle += analysis.nbSingle;
                loggerInfo.get(n).details.push({ array: links.slice(), time: analysis.time, nbSingle: analysis.nbSingle})
            }   
            index = nextIndex(index); // Can throw the error NO_MORE
        } catch(err) {
            console.log(err);
            stop = true;
        }
    }
    loggerInfo.get(n).meanTime /= loggerInfo.get(n).details.length;
    loggerInfo.get(n).meanNbSingle /= loggerInfo.get(n).details.length;
}

// Compute the index of the next breakable link
function nextIndex(index) {
    if(index.length === 0) {
        throw "NO_MORE";
    }
    if (last(index) + 1 >= LENGTH_LIGNIM_POLY) {
        let temp = nextIndex(index.slice(0, -1));
        temp.push(last(temp) + 1);
        return temp;
    } else {
        index[index.length - 1] += 1;
        return index;
    }
}

function start() {
    LENGTH_LIGNIM_POLY = parseInt(document.getElementById("nb-of-link").value);
    MIN_BREAKABLE_LINK = parseInt(document.getElementById("nb-breakable").value);
    MAX_BREAKABLE_LINK = parseInt(document.getElementById("nb-breakable").value);

    TEMPERATURE = parseFloat(document.getElementById("temperature").value);
    LIGNIM_MASS = parseFloat(document.getElementById("lignim-mass").value);
    SYRINGAL_FRACTION = parseFloat(document.getElementById("syringal-fraction").value);
    SALIENT_VOLUME = parseFloat(document.getElementById("salient-volume").value);
    REPEAT = parseFloat(document.getElementById("repeat").value);

    linkToAnalysis = new Map();
    linkToAnalysis.set([].toString(), {time: 0, nbSingle: 1});

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
    let meanTable = "<table><tr><th>Number of Breakable Link</th><th>Mean time</th><th>Mean nb singleton</th><th>Mean Time/ Mean nb singleton</th></tr>"
    let detailTables = "";
    loggerInfo.forEach((v, k, m) => {
        meanTable += `<tr><td>${k}</td><td>${v.meanTime.toFixed(3)}</td><td>${v.meanNbSingle.toFixed(3)}</td><td>${(v.meanTime.toFixed(3) / v.meanNbSingle.toFixed(3)).toFixed(3)}</td></tr>`;
        detailTables += logDetailTable(k, v.details);
    });
    meanTable += "</table>";
    document.getElementById("results").innerHTML = meanTable + "<div id='details'>" + detailTables + "</div>";
}

function logDetailTable(n, details) {
    let table = `<table><tr><th>Links with ${n} breakable links</th><th>Time</th><th>Nb Singleton</th></tr>`;
    details.forEach((v) => {
        table += `<tr><td>${linksToString(v.array)}</td><td>${v.time}</td><td>${v.nbSingle}</td></tr>`;
    });
    table += "</table>";
    return table;
}

function linksToString(links) {
    let s = "";
    links.forEach((v, i) => {
        s += (v) ? "b" : ".";
        s += (i == links.length - 1) ? "" : "-";
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
        csv += `Links,Time,Nb Singleton`;
        csv += (k == MAX_BREAKABLE_LINK) ? "\n" : ",";
    });

    for (let i = 0; i < maxLength; i++) {
        loggerInfo.forEach((v, k, m) => {
            if(v.details.length > i) {
                csv += `${linksToString(v.details[i].array)},${v.details[i].time},${v.details[i].nbSingle}`
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