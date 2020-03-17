// Options
let NB_OF_LINK;
let MIN_BREAKABLE_LINK;
let MAX_BREAKABLE_LINK;
let BREAK_TIME_OUTSIDE;
let BREAK_TIME_INSIDE;

// Optimisation to compute time
let linkToAnalysis;

// Results of experiment
let loggerInfo;

document.getElementById("start-button").addEventListener("click", start);
document.getElementById("download-button").addEventListener("click", exportCSV);

function last(array) {return array[array.length - 1];}

function computeSingleton(links) {
    let n = 0;

    // If left link breakable, left molecule will be alone
    if (links[0]) {
        n++;
    }

    // If right link breakable, right molecule will be alone
    if (last(links)) {
        n++;
    }

    // If two links are breakable, the molecule in between will be alone
    for(let i = 0; i < links.length; i++) {
        if(links[i] && links[i + 1]) {
            n++;
        }
    }
    return n;
}

// Computes Time and singleton
function analyse(links) {
    let linksString = links.toString();

    // If already computed, return saved results
    if(linkToAnalysis.has(linksString)) {
        return linkToAnalysis.get(linksString);
    }

    let time;

    // If breakable on the left
    if(links[0]) {
        let t = analyse(links.slice(1)); // Time to break the remaining links
        time = BREAK_TIME_OUTSIDE + t.time;
    }
    // If breakable on the right
    else if(last(links)) {
        let t = analyse(links.slice(0, -1));
        time = BREAK_TIME_OUTSIDE + t.time;
    } 
    
    // Break in the middle
    else {
        // If there is a breakable link
        if (links.reduce((x, y) => x + y) > 0) {
            let index = links.indexOf(true); // Find first breakable link
            let t1 = analyse(links.slice(0, index)); // Compute time for before
            let t2 = analyse(links.slice(index + 1)); // Compute time for after
            time = BREAK_TIME_INSIDE + t1.time + t2.time;
        } 
        // No breakable link
        else {
            time = 0;
        }
    }

    let n = computeSingleton(links);
    // Save the result for this link
    linkToAnalysis.set(linksString, {time: time, nbSingle: n});

    return { time: time, nbSingle: n };
}

// n: number of possible breakable links
function testAll(n) {
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
    for(let i = 0; i < NB_OF_LINK; i++) {
        links.push(false);
    }

    // Compute time and singleton for all possible links
    while(!stop) {
        try {
            if(last(index) < NB_OF_LINK) {
                // Set breakable links
                for(let i = 0; i < links.length; i++) {
                    links[i] = (index.includes(i)) ? true : false;
                }
                let analysis = analyse(links);
                loggerInfo.get(n).meanTime += analysis.time;
                loggerInfo.get(n).meanNbSingle += analysis.nbSingle;
                loggerInfo.get(n).details.push({array: links.slice(), time: analysis.time, nbSingle: analysis.nbSingle})
            }
            index = nextIndex(index); // Can throw the error NO_MORE
        } catch(err) {
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
    if (last(index) + 1 >= NB_OF_LINK) {
        let temp = nextIndex(index.slice(0, -1));
        temp.push(last(temp) + 1);
        return temp;
    } else {
        index[index.length - 1] += 1;
        return index;
    }
}

function start() {
    NB_OF_LINK = parseInt(document.getElementById("nb-of-link").value);
    MIN_BREAKABLE_LINK = parseInt(document.getElementById("min-nb-breakable").value);
    MAX_BREAKABLE_LINK = parseInt(document.getElementById("max-nb-breakable").value);
    BREAK_TIME_OUTSIDE = parseInt(document.getElementById("time-to-break-outside").value);
    BREAK_TIME_INSIDE = parseInt(document.getElementById("time-to-break-inside").value);

    linkToAnalysis = new Map();
    linkToAnalysis.set([].toString(), {time: 0, nbSingle: 0});

    loggerInfo = new Map();

    for (let n = MIN_BREAKABLE_LINK; n <= MAX_BREAKABLE_LINK; n ++) {
        testAll(n);
    }

    // Display results
    logResults();

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