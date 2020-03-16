let NB_OF_LINK;
let MIN_BREAKABLE_LINK;
let MAX_BREAKABLE_LINK;
let BREAK_TIME_OUTSIDE;
let BREAK_TIME_INSIDE;

let linkToAnalysis;
let loggerInfo;

document.getElementById("start-button").addEventListener("click", start);
document.getElementById("download-button").addEventListener("click", exportCSV);

function last(array) {return array[array.length - 1];}

function computeSingleton(links) {
    let n = 0;
    if (links[0]) {
        n++;
    }
    if (last(links)) {
        n++;
    }
    for(let i = 0; i < links.length; i ++) {
        if(links[i] && links[i + 1]) {
            n++;
        }
    }
    return n;
}

function analyse(links) {
    let linksString = links.toString();
    if(linkToAnalysis.has(linksString)) {
        return linkToAnalysis.get(linksString);
    }
    let temp;
    if(links[0]) {
        let t = analyse(links.slice(1));
        temp = BREAK_TIME_OUTSIDE + t.time;
    }
    else if(last(links)) {
        let t = analyse(links.slice(0, -1));
        temp = BREAK_TIME_OUTSIDE + t.time;
    } else {
        if (links.reduce((x, y) => x + y) > 0) {
            let index = links.indexOf(true);
            let t1 = analyse(links.slice(0, index));
            let t2 = analyse(links.slice(index + 1));
            temp = BREAK_TIME_INSIDE + t1.time + t2.time;
        } else {
            temp = 0;
        }
    }

    let n = computeSingleton(links);
    linkToAnalysis.set(linksString, {time: temp, nbSingle: n});
    return { time: temp, nbSingle: n };
}

function testAll(n) {
    let index = []
    let stop = false;
    let temp = [];

    loggerInfo.set(n, { meanTime: 0, meanNbSingle: 0,details: []});

    for (let i = 0; i < n; i++) {
        index.push(i);
    }

    for(let i = 0; i < NB_OF_LINK; i++) {
        temp.push(false);
    }

    while(!stop) {
        try {
            if(last(index) < NB_OF_LINK) {
                for(let i = 0; i < temp.length; i++) {
                    temp[i] = (index.includes(i)) ? true : false;
                }
                let analysis = analyse(temp);
                loggerInfo.get(n).meanTime += analysis.time;
                loggerInfo.get(n).meanNbSingle += analysis.nbSingle;
                loggerInfo.get(n).details.push({array: temp.slice(), time: analysis.time, nbSingle: analysis.nbSingle})
            }
            index = nextIndex(index);
        } catch(err) {
            stop = true;
        }
    }
    loggerInfo.get(n).meanTime /= loggerInfo.get(n).details.length;
    loggerInfo.get(n).meanNbSingle /= loggerInfo.get(n).details.length;
}

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
    logResults();
    document.getElementById("download-button").classList.add("discovered");
}

function logResults() {
    let meanTable = "<table><tr><th>Number of Breakable Link</th><th>Mean time</th><th>Mean nb singleton</th></tr>"
    let detailTables = "";
    loggerInfo.forEach((v, k, m) => {
        meanTable += `<tr><td>${k}</td><td>${v.meanTime.toFixed(2)}</td><td>${v.meanNbSingle.toFixed(2)}</td></tr>`;
        detailTables += logDetailTable(k, v.details);
    });
    meanTable += "</table>";
    document.getElementById("results").innerHTML = meanTable + "<div id='details'>" + detailTables + "</div>";
}

function logDetailTable(n, details) {
    let table = `<table><tr><th>Links with ${n} breakable links</th><th>Time</th><th>Nb Singleton</th></tr>`;
    details.forEach((v) => {
        table += `<tr><td>${linkToString(v.array)}</td><td>${v.time}</td><td>${v.nbSingle}</td></tr>`;
    });
    table += "</table>";
    return table;
}

function linkToString(link) {
    let s = "";
    link.forEach((v, i) => {
        s += (v) ? "b" : ".";
        s += (i == link.length - 1) ? "" : "-";
    })
    return s;
}

function exportCSV() {
    let csv = "data:text:/csv;charset=utf-8,";
    let columns = [];
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
                csv += `${linkToString(v.details[i].array)},${v.details[i].time},${v.details[i].nbSingle}`
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