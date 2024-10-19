// ==UserScript==
// @name         MazyarTools
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Mazyar Tools & Utilities
// @copyright    z7z from managerzone.com
// @author       z7z from managerzone.com
// @license      MIT
// @match        https://www.managerzone.com/*
// @match        https://test.managerzone.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=managerzone.com
// @supportURL   https://github.com/mz-ir/mazyar
// ==/UserScript==

function mazyarParseMzDate(dateString) {
    const [day, month, year] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
}

function mazyarParseMzDateTime(dateTimeString) {
    const [date, time] = dateTimeString.split(' ');
    const [day, month, year] = date.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes);
}

function mazyarGenerateUuidV4() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0,
            v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

function mazyarIsFilterHitsValid(hits) {
    return typeof hits === "number" && hits >= 0;
}

function mazyarHasDuplicates(array) {
    return new Set(array).size !== array.length;
}

function mazyarExtractSportType(doc = document) {
    const zone = doc.querySelector("a#shortcut_link_thezone");
    if (zone) {
        return zone.href.indexOf("hockey") > -1 ? "hockey" : "soccer";
    }
    return "soccer";
}

function mazyarExtractClubCurrency(doc) {
    const players = doc.getElementById("playerAltViewTable")?.querySelectorAll("tbody tr");
    if (players && players.length > 0) {
        const parts = players[0].querySelector("td:nth-child(3)")?.innerText.split(" ");
        return parts[parts.length - 1].trim();
    }
    return "";
}

function mazyarExtractNationalCurrency(doc) {
    // works for both domestic and foreign countries
    const playerNode = doc.getElementById("thePlayers_0")?.querySelector("table tbody tr:nth-child(6)");
    if (playerNode) {
        const parts = playerNode.innerText.split(" ");
        return parts[parts.length - 1].trim();
    }
    return "";
}

function mazyarExtractTeamId(link) {
    const regex = /tid=(\d+)/;
    const match = regex.exec(link);
    return match ? match[1] : null;
}

function mazyarExtractPlayerIdFromProfileLink(link) {
    const regex = /pid=(\d+)/;
    const match = regex.exec(link);
    return match ? match[1] : null;
}

function mazyarExtractMatchId(link) {
    const regex = /mid=(\d+)/;
    const match = regex.exec(link);
    return match ? match[1] : null;
}

function mazyarExtractPlayerIdFromTransferMonitor(link) {
    const regex = /u=(\d+)/;
    const match = regex.exec(link);
    return match ? match[1] : null;
}

function mazyarExtractPlayerIdFromContainer(player) {
    return player?.querySelector("h2 span.player_id_span")?.innerText;
}

function mazyarIsMatchInProgress(resultText) {
    const scoreRegex = /\b(X|0|[1-9]\d*) - (X|0|[1-9]\d*)\b/;
    return !scoreRegex.test(resultText);
}

function mazyarGetSquadSummaryLink(tid) {
    return `https://${location.hostname}/?p=players&sub=alt&tid=${tid}`;
}

function mazyarFormatBigNumber(n, sep = " ") {
    if (n) {
        const numberString = n.toString();
        let formattedParts = [];
        for (let i = numberString.length - 1; i >= 0; i -= 3) {
            let part = numberString.substring(Math.max(i - 2, 0), i + 1);
            formattedParts.unshift(part);
        }
        return formattedParts.join(sep);
    }
    return "0";
}

function mazyarFormatAverageAge(age, fractionDigits = 1) {
    if (age) {
        return age.toFixed(fractionDigits);
    }
    return "0.0";
}

function mazyarFormatFileSize(b) {
    const s = 1024;
    let u = 0;
    while (b >= s || -b >= s) {
        b /= s;
        u++;
    }
    return (u ? b.toFixed(1) + " " : b) + " KMGTPEZY"[u] + "B";
}

function mazyarExtractClubPlayersDetails(doc, currency) {
    const players = [];
    const playerNodes = doc.querySelectorAll("table#playerAltViewTable tr");
    for (const playerNode of playerNodes) {
        const age = playerNode.querySelector("td:nth-child(5)")?.innerText.replace(/\s/g, "");
        if (age) {
            const value = playerNode.querySelector("td:nth-child(3)")?.innerText.replaceAll(currency, "").replace(/\s/g, "");
            const shirtNumber = playerNode.querySelector("td:nth-child(0)")?.innerText.replace(/\s/g, "");
            const pid = playerNode.querySelector("a")?.href;
            players.push({
                shirtNumber,
                age: parseInt(age, 10),
                value: parseInt(value, 10),
                id: mazyarExtractPlayerIdFromProfileLink(pid),
            });
        }
    }
    return players;
}

function mazyarExtractNumberOfFlags(infoTable) {
    const images = infoTable.getElementsByTagName("img");
    return images ? [...images].filter((img) => img.src.indexOf("/flags/") > -1).length : 0;
}

function mazyarIsPlayerDomestic(infoTable) {
    return mazyarExtractNumberOfFlags(infoTable) === 1;
}

function mazyarExtractNationalPlayersDetails(doc, currency) {
    const players = [];
    const playerNodes = doc.querySelectorAll("div.playerContainer");
    for (const playerNode of playerNodes) {
        const id = mazyarExtractPlayerIdFromProfileLink(playerNode.querySelector("h2 a")?.href);
        const infoTable = playerNode.querySelector("div.dg_playerview_info table");
        const age = infoTable.querySelector("tbody tr:nth-child(1) td strong").innerText;
        const selector = mazyarIsPlayerDomestic(infoTable) ? "tbody tr:nth-child(5) td span" : "tbody tr:nth-child(6) td span";
        const value = infoTable.querySelector(selector)?.innerText.replaceAll(currency, "").replace(/\s/g, "");
        players.push({
            age: parseInt(age, 10),
            value: parseInt(value, 10),
            id,
        });
    }
    return players;
}

function mazyarGetNumberOfPlayers(players, ageLow = 0, ageHigh = 99) {
    return players.filter((player) => player.age <= ageHigh && player.age >= ageLow).length;
}

function mazyarFilterPlayers(players, count = 0, ageLow = 0, ageHigh = 99) {
    if (players.length === 0) {
        return { values: 0, avgAge: 0.0 };
    }

    const n = count === 0 ? players.length : count;
    const filtered = players
        .filter((player) => player.age <= ageHigh && player.age >= ageLow)
        .sort((a, b) => b.value - a.value)
        .slice(0, n);
    if (filtered.length === 0) {
        return { values: 0, avgAge: 0.0 };
    }
    const values = filtered.map((player) => player.value).reduce((a, b) => a + b, 0);
    const avgAge = filtered.map((player) => player.age).reduce((a, b) => a + b, 0) / filtered.length;
    return { values, avgAge };
}

async function mazyarFetchNationalPlayersAndCurrency(tid, sport) {
    const url = `https://${location.hostname}/ajax.php?p=nationalTeams&sub=players&ntid=${tid}&sport=${sport}`;
    let players = [];
    let currency = '';
    await fetch(url)
        .then((resp) => resp.text())
        .then((content) => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(content, "text/html");
            currency = mazyarExtractNationalCurrency(doc);
            players = mazyarExtractNationalPlayersDetails(doc, currency);
        })
        .catch((error) => {
            console.warn(error);
        });
    return { players, currency };
}

async function mazyarFetchClubPlayersAndCurrency(tid) {
    const url = mazyarGetSquadSummaryLink(tid);
    let players = [];
    let currency = '';
    await fetch(url)
        .then((resp) => resp.text())
        .then((content) => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(content, "text/html");
            currency = mazyarExtractClubCurrency(doc);
            players = mazyarExtractClubPlayersDetails(doc, currency);
        })
        .catch((error) => {
            console.warn(error);
        });
    return { players, currency };
}

async function mazyarFetchPlayersAndCurrency(tid, sport) {
    const url = mazyarGetSquadSummaryLink(tid);
    const isNational = await fetch(url, { method: "HEAD" })
        .then((resp) => (resp.url.search("p=national_teams") > -1));
    return isNational ? await mazyarFetchNationalPlayersAndCurrency(tid, sport) : await mazyarFetchClubPlayersAndCurrency(tid);
}

function mazyarExtractClubTopPlyers(doc) {
    const currency = mazyarExtractClubCurrency(doc);
    const players = mazyarExtractClubPlayersDetails(doc, currency);
    const sport = mazyarExtractSportType(doc);
    const count = sport === "soccer" ? 11 : 21;
    return players ? mazyarFilterPlayers(players, count) : { values: 0, avgAge: 0 };
}

async function mazyarExtractPlayersProfileDetails(teamId) {
    const url = `https://${location.hostname}/?p=players&tid=${teamId}`;
    return await fetch(url)
        .then((resp) => {
            return resp.text();
        }).then((content) => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(content, "text/html");
            const players = doc.getElementById("players_container")?.querySelectorAll("div.playerContainer");
            const info = {};
            for (const player of players) {
                const playerId = player.querySelector("span.player_id_span")?.innerText;
                const inMarket = [...player.querySelectorAll("a")].find((el) => el.href?.indexOf("p=transfer&sub") > -1);
                info[playerId] = {
                    detail: player,
                    shared: !!player.querySelector("i.special_player.fa-share-alt"),
                    market: !!inMarket,
                    marketLink: inMarket?.href,
                }
            }
            return info;
        }).catch((error) => {
            console.warn(error);
            return null;
        });
}

function mazyarExtractSquadSummaryDetails(players, sport = "soccer") {
    if (!players) {
        return [];
    }
    const rows = [];
    if (sport === "hockey") {
        {
            const all = mazyarFilterPlayers(players);
            const top21 = mazyarFilterPlayers(players, 21);
            rows.push({
                title: "All",
                count: players.length,
                all: all.values,
                allAge: all.avgAge,
                top21: top21.values,
                top21Age: top21.avgAge,
            });
        }
        {
            const all = mazyarFilterPlayers(players, 0, 0, 23);
            const top21 = mazyarFilterPlayers(players, 21, 0, 23);
            rows.push({
                title: "U23",
                count: mazyarGetNumberOfPlayers(players, 0, 23),
                all: all.values,
                allAge: all.avgAge,
                top21: top21.values,
                top21Age: top21.avgAge,
            });
        }
        {
            const all = mazyarFilterPlayers(players, 0, 0, 21);
            const top21 = mazyarFilterPlayers(players, 21, 0, 21);
            rows.push({
                title: "U21",
                count: mazyarGetNumberOfPlayers(players, 0, 21),
                all: all.values,
                allAge: all.avgAge,
                top21: top21.values,
                top21Age: top21.avgAge,
            });
        }
        {
            const all = mazyarFilterPlayers(players, 0, 0, 18);
            const top21 = mazyarFilterPlayers(players, 21, 0, 18);
            rows.push({
                title: "U18",
                count: mazyarGetNumberOfPlayers(players, 0, 18),
                all: all.values,
                allAge: all.avgAge,
                top21: top21.values,
                top21Age: top21.avgAge,
            });
        }
    } else {
        {
            const all = mazyarFilterPlayers(players);
            const top16 = mazyarFilterPlayers(players, 16);
            const top11 = mazyarFilterPlayers(players, 11);
            rows.push({
                title: "All",
                count: players.length,
                all: all.values,
                allAge: all.avgAge,
                top16: top16.values,
                top16Age: top16.avgAge,
                top11: top11.values,
                top11Age: top11.avgAge,
            });
        }
        {
            const all = mazyarFilterPlayers(players, 0, 0, 23);
            const top16 = mazyarFilterPlayers(players, 16, 0, 23);
            const top11 = mazyarFilterPlayers(players, 11, 0, 23);
            rows.push({
                title: "U23",
                count: mazyarGetNumberOfPlayers(players, 0, 23),
                all: all.values,
                allAge: all.avgAge,
                top16: top16.values,
                top16Age: top16.avgAge,
                top11: top11.values,
                top11Age: top11.avgAge,
            });
        }
        {
            const all = mazyarFilterPlayers(players, 0, 0, 21);
            const top16 = mazyarFilterPlayers(players, 16, 0, 21);
            const top11 = mazyarFilterPlayers(players, 11, 0, 21);
            rows.push({
                title: "U21",
                count: mazyarGetNumberOfPlayers(players, 0, 21),
                all: all.values,
                allAge: all.avgAge,
                top16: top16.values,
                top16Age: top16.avgAge,
                top11: top11.values,
                top11Age: top11.avgAge,
            });
        }
        {
            const all = mazyarFilterPlayers(players, 0, 0, 18);
            const top16 = mazyarFilterPlayers(players, 16, 0, 18);
            const top11 = mazyarFilterPlayers(players, 11, 0, 18);
            rows.push({
                title: "U18",
                count: mazyarGetNumberOfPlayers(players, 0, 18),
                all: all.values,
                allAge: all.avgAge,
                top16: top16.values,
                top16Age: top16.avgAge,
                top11: top11.values,
                top11Age: top11.avgAge,
            });
        }
    }
    return rows;
}

async function mazyarFetchDocument(url) {
    return await fetch(url)
        .then((resp) => resp.text())
        .then((content) => {
            const parser = new DOMParser();
            return parser.parseFromString(content, "text/html");
        })
        .catch((error) => {
            console.warn(error);
            return null;
        });
}

async function mazyarFetchJson(url) {
    return await fetch(url)
        .then((resp) => resp.json())
        .catch((error) => {
            console.warn(error);
            return null;
        });
}

async function mazyarFetchPlayerProfileDocument(playerId) {
    const url = `https://${location.hostname}/?p=players&pid=${playerId}`;
    return await mazyarFetchDocument(url);
}

async function mazyarFetchTransferMonitorData(sport = "soccer") {
    const url = `https://${location.hostname}/ajax.php?p=transfer&sub=your-bids&sport=${sport}`;
    return await mazyarFetchJson(url);
}

async function mazyarFetchSquadSummaryDocument(teamId) {
    const url = mazyarGetSquadSummaryLink(teamId);
    return await mazyarFetchDocument(url);
}

/* *********************** DOM Utils ********************************** */

function mazyarMakeElementDraggable(element, dragHandleElement, dragEndCallback = null) {
    let deltaX = 0, deltaY = 0, lastX = 0, lastY = 0;

    dragHandleElement.style.cursor = "move";
    dragHandleElement.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        // get the mouse cursor position at startup:
        lastX = e.clientX;
        lastY = e.clientY;
        document.onmouseup = closeDragElement;
        // call a function whenever the cursor moves:
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();

        // calculate the new cursor position:
        deltaX = lastX - e.clientX;
        deltaY = lastY - e.clientY;
        lastX = e.clientX;
        lastY = e.clientY;

        // set the element's new position:
        let newTop = Math.max(0, element.offsetTop - deltaY);
        let newLeft = Math.max(0, element.offsetLeft - deltaX);

        const { right, bottom, width, height } = element.getBoundingClientRect();
        if (right > window.innerWidth) {
            newLeft = window.innerWidth - width;
        }
        if (bottom > window.innerHeight) {
            newTop = window.innerHeight - height;
        }

        element.style.top = newTop + "px";
        element.style.left = newLeft + "px";
    }

    function closeDragElement() {
        // stop moving when mouse button is released:
        document.onmouseup = null;
        document.onmousemove = null;
        if (dragEndCallback) {
            dragEndCallback();
        }
    }
}

function mazyarGetMzButtonColorClass(color) {
    if (color) {
        if (color === "red") {
            return "button_red";
        } else if (color === "blue") {
            return "button_blue";
        } else if (color === "grey") {
            return "buttondiv_disabled";
        }
    }
    // green or other values
    return "button_account";
}

function mazyarCreateMzStyledButton(title, color = "", floatDirection = null) {
    const div = document.createElement("div");
    div.style.margin = "0.3rem";
    if (floatDirection) {
        // floatDirection: floatRight, floatLeft
        div.classList.add(floatDirection);
    }

    const button = document.createElement("div");
    button.classList.add("mzbtn", "buttondiv", mazyarGetMzButtonColorClass(color));
    button.innerHTML = `<span class="buttonClassMiddle"><span style="white-space: nowrap">${title}</span></span><span class="buttonClassRight">&nbsp;</span>`;

    div.appendChild(button);
    return div;
}

function mazyarCreateMzStyledTitle(text = "") {
    const div = document.createElement("div");
    div.classList.add("win_bg");

    const title = document.createElement("h3");
    title.innerText = text;
    title.style.margin = "0.4rem auto";
    title.style.padding = "0 0.6rem";

    div.appendChild(title);
    return div;
}

function mazyarCreateSuggestionList(items) {
    const datalist = document.createElement("datalist");
    datalist.id = mazyarGenerateUuidV4();
    for (const item of items) {
        const option = document.createElement("option");
        option.value = item.toString();
        datalist.appendChild(option);
    }
    return datalist;
}

function mazyarCreateMenuTextInput(title = "input", placeholder = "example", datalistId = "") {
    const div = document.createElement("div");
    div.classList.add("mazyar-flex-container-row");
    div.style.justifyItems = "space-between";
    div.innerHTML = `
            <label style="margin: 0.5rem; font-weight: bold;">${title}: </label>
            <input list="${datalistId}" style="margin: 0.5rem;" type="text" value="" placeholder="${placeholder}">
        `;
    return div;
}

function mazyarCreateSubMenuTextInput(title = "input", placeholder = "example", initialValue = 0, style = {
    margin: "0.1rem 2.2rem",
    inputSize: "5px"
}) {
    const div = document.createElement("div");
    div.classList.add("mazyar-flex-container-row");
    div.style.justifyItems = "space-between";
    div.style.margin = style?.margin ?? "0.1rem 2.2rem";
    div.innerHTML = `
            <label style="margin-left: 0.5rem;">${title}: </label>
            <input style="margin-left: 0.5rem;" type="text" size="${style?.inputSize ?? "5px"}" placeholder="${placeholder}", value="${initialValue}">
        `;
    return div;
}

function mazyarCreateMenuCheckBox(
    label,
    initialValue = true,
    style = {
        alignSelf: "flex-start",
        margin: "0.3rem 0.7rem",
    }
) {
    const id = mazyarGenerateUuidV4();

    const div = document.createElement("div");
    div.style.alignSelf = style?.alignSelf ?? "flex-start";
    div.style.margin = style?.margin ?? "0.3rem 0.7rem";

    const checkbox = document.createElement("input");
    checkbox.id = id;
    checkbox.type = "checkbox";
    checkbox.checked = initialValue;

    const labelElement = document.createElement("label");
    labelElement.htmlFor = id;
    labelElement.innerHTML = label;

    div.appendChild(checkbox);
    div.appendChild(labelElement);
    return div;
}

function mazyarCreateMenuGroup(title = "") {
    const group = document.createElement("div");
    group.classList.add("mazyar-flex-container");
    group.style.alignSelf = "flex-start";
    group.style.alignItems = "flex-start";
    group.style.margin = "0.2rem 0.6rem";
    const header = document.createElement("h4");
    header.innerText = title;
    header.style.margin = "0.3rem 0rem";
    group.appendChild(header);
    return group;
}

function mazyarAppendOptionList(parent, options, selected) {
    // options = a object full of 'key: {value, label}'
    for (const key in options) {
        if (options.hasOwnProperty(key)) {
            const child = document.createElement("option");
            child.value = options[key].value;
            child.innerText = options[key].label;
            if (child.value === selected) {
                child.selected = true;
            }
            parent.appendChild(child);
        }
    }
}

function mazyarCreateMenuDropDown(label, options, initialValue) {
    // options = a object full of 'key: {value, label}'
    // initialValue = one of the options.value

    const div = document.createElement("div");
    const labelElement = document.createElement("label");
    const dropdown = document.createElement("select");

    div.style.alignSelf = "flex-start";
    div.style.margin = "0.3rem 0.7rem";

    labelElement.innerText = label;
    labelElement.style.paddingRight = "0.5rem";

    mazyarAppendOptionList(dropdown, options, initialValue);

    div.appendChild(labelElement);
    div.appendChild(dropdown);
    return div;
}

function mazyarCreateDeleteIcon(title) {
    const icon = document.createElement("span");
    icon.classList.add("mazyar-icon-delete");
    if (title) {
        icon.title = title;
    }
    return icon;
}

function mazyarCreateAddToDeadlineIcon(title, color) {
    const icon = mazyarCreateLegalIcon();
    icon.style.verticalAlign = "unset";
    icon.style.borderRadius = "50%";
    icon.style.border = "solid 1px";
    icon.style.padding = "3px";

    const span = document.createElement("span");
    span.style.color = color;
    span.classList.add("floatRight");
    if (title) {
        span.title = title;
    }
    span.appendChild(icon);
    return span;
}

function mazyarCreateDeleteButtonWithTrashIcon(title = "Delete") {
    const icon = mazyarCreateDeleteIcon();

    const text = document.createElement("span");
    text.innerText = title;

    const button = document.createElement("button");
    button.classList.add("mazyar-flex-container-row", "mazyar-button");
    button.style.margin = "0.6rem 0 0";

    button.appendChild(icon);
    button.appendChild(text);
    return button;
}

function mazyarFiltersViewCreateTableHeader() {
    const tr = document.createElement("tr");

    const name = document.createElement("th");
    name.classList.add("header");
    name.innerText = "Name";
    name.title = "Filter' name";
    name.style.textAlign = "left";
    name.style.textDecoration = "none";
    name.style.width = "11rem";

    const totalHits = document.createElement("th");
    totalHits.classList.add("header");
    totalHits.innerText = "Total";
    totalHits.title = "Total hits founds for this filter";
    totalHits.style.textAlign = "center";
    totalHits.style.textDecoration = "none";

    const scoutHits = document.createElement("th");
    scoutHits.classList.add("header");
    scoutHits.innerText = "Scout";
    scoutHits.title = "Hits found after applying scout filters";
    scoutHits.style.textAlign = "center";
    scoutHits.style.textDecoration = "none";

    const tools = document.createElement("th");
    tools.classList.add("header");
    tools.innerHTML = " ";
    tools.style.textAlign = "center";
    tools.style.textDecoration = "none";

    tr.appendChild(tools);
    tr.appendChild(name);
    tr.appendChild(totalHits);
    tr.appendChild(scoutHits);

    const thead = document.createElement("thead");
    thead.appendChild(tr);
    return thead;
}

function mazyarStartSpinning(element) {
    element.classList.add("fa-spin");
}

function mazyarStopSpinning(element) {
    element.classList.remove("fa-spin");
}

function mazyarCreateIconFromFontAwesomeClass(classes = [], title = "") {
    const icon = document.createElement("i");
    icon.classList.add(...classes);
    icon.setAttribute("aria-hidden", "true");
    icon.style.cursor = "pointer";
    if (title) {
        icon.title = title;
    }
    return icon;
}

function mazyarCreateMoveIcon(title) {
    return mazyarCreateIconFromFontAwesomeClass(["fa-solid", "fa-up-down-left-right"], title);
}

function mazyarCreateSharedIcon(title) {
    return mazyarCreateIconFromFontAwesomeClass(["fa", "fa-share-alt"], title);
}

function mazyarCreateMarketIcon(title) {
    return mazyarCreateIconFromFontAwesomeClass(["fa", "fa-legal"], title);
}

function mazyarCreateCogIcon(title = "") {
    return mazyarCreateIconFromFontAwesomeClass(["fa", "fa-cog"], title);
}

function mazyarCreateCommentIcon(title = "") {
    return mazyarCreateIconFromFontAwesomeClass(["fa-solid", "fa-comment"], title);
}

function mazyarCreateSearchIcon(title = "") {
    return mazyarCreateIconFromFontAwesomeClass(["fa", "fa-search"], title);
}

function mazyarCreateNoteIcon(title = "") {
    return mazyarCreateIconFromFontAwesomeClass(["fa-solid", "fa-note-sticky"], title);
}

function mazyarCreateRefreshIcon(title = "") {
    return mazyarCreateIconFromFontAwesomeClass(["fa", "fa-refresh"], title);
}

function mazyarCreateLegalIcon(title = "") {
    return mazyarCreateIconFromFontAwesomeClass(["fa", "fa-legal"], title);
}

function mazyarCreateTrashIcon(title = "") {
    return mazyarCreateIconFromFontAwesomeClass(["fas", "fa-trash"], title);
}

function mazyarCreateLoadingIcon(title = "") {
    const icon = mazyarCreateIconFromFontAwesomeClass(["fa", "fa-spinner", "fa-spin"], title);
    icon.style.cursor = "unset";
    return icon;
}

function mazyarCreateLoadingIcon2(title = "") {
    const icon = mazyarCreateIconFromFontAwesomeClass(["fa-solid", "fa-loader", "fa-pulse", "fa-fw"], title);
    icon.style.cursor = "unset";
    return icon;
}

function mazyarCreateToolbar() {
    const toolbar = document.createElement("div");
    const logo = document.createElement("span");
    const menu = mazyarCreateCogIcon("Settings");
    const note = mazyarCreateNoteIcon("Notebook");
    const separator = document.createElement("span");
    const transfer = document.createElement("div");
    const transferIcon = mazyarCreateSearchIcon("Transfer");
    const transferCount = document.createElement("span");

    toolbar.classList.add("mazyar-flex-container");
    toolbar.style.position = "fixed";
    toolbar.style.zIndex = "9998";
    toolbar.style.top = "40%";
    toolbar.style.right = "5px";
    toolbar.style.background = "black";
    toolbar.style.color = "white";
    toolbar.style.textAlign = "center";

    logo.innerText = "MZY";
    logo.style.fontSize = "0.6rem";
    logo.style.fontWeight = "bold";
    logo.style.margin = "2px";
    logo.style.padding = "1px";

    menu.style.fontSize = "large";
    transferIcon.style.fontSize = "large";
    note.style.fontSize = "large";
    note.style.marginTop = "5px";

    separator.innerText = "-------";
    separator.style.textAlign = "center";
    separator.style.fontSize = "0.6rem";
    separator.style.fontWeight = "bolder";
    separator.style.margin = "0";
    separator.style.padding = "0";

    transfer.classList.add("mazyar-flex-container");
    transfer.style.cursor = "pointer";

    transferCount.id = "mazyar-transfer-filter-hits";
    transferCount.innerText = "0";
    transferCount.style.fontSize = "0.6rem";
    transferCount.style.fontWeight = "bold";
    transferCount.style.margin = "1px 0";
    transferCount.style.padding = "1px";

    transfer.appendChild(transferIcon);
    transfer.appendChild(transferCount);

    toolbar.appendChild(logo);
    toolbar.appendChild(menu);
    toolbar.appendChild(note);
    toolbar.appendChild(separator);
    toolbar.appendChild(transfer);

    return { toolbar, menu, transfer, note };
}

function mazyarCreateDeadlineIndicator() {
    const div = document.createElement("div");
    const transferIcon = mazyarCreateLegalIcon();

    div.classList.add("mazyar-flex-container");
    div.style.position = "fixed";
    div.style.zIndex = "9997";
    div.style.top = "48%";
    div.style.right = "35px";
    div.style.color = "white";
    div.style.textAlign = "center";

    transferIcon.style.fontSize = "2rem";

    div.appendChild(transferIcon);

    return div;
}
