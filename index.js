// ==UserScript==
// @name         MZ Player Values
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Add Squad Value to some pages
// @author       z7z @managerzone
// @license      MIT
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      self
// @match        https://www.managerzone.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=managerzone.com
// @downloadURL  https://update.greasyfork.org/scripts/476290/MZ%20Player%20Values.user.js
// @updateURL    https://update.greasyfork.org/scripts/476290/MZ%20Player%20Values.meta.js
// ==/UserScript==
(function () {
    "use strict";

    /* *********************** Styles ********************************** */

    const mzpStyles = `
    #mzp-modal {
        display: none;
        position: fixed;
        z-index: 9999;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        overflow: auto;
        background-color: rgba(0, 0, 0, 0.4);
    }
    
    #mzp-modal-content {
        // min-width: 20%;
        width: fit-content;
        background-color: beige;
        // border: 1px solid beige;
        border-radius: 5px;
    }

    .mzp-flex-container {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        flex-wrap: wrap;
    }

    .mzp-flex-container-row {
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
        flex-wrap: wrap;
    }

    .mzp-donut {
        width: 1.7em;
        height: 1.7em;
        margin-right: 5px;
        border-radius: 50%;
        text-align: center;
        font-size: 1.2em;
        padding: 3px;
        background-color: yellow;
        color: yellow;
    }

    .mzp-final-donut {
        border: rgb(213, 232, 44) solid 2px;
        color: inherit;
        padding:0;
    }

    .mzp-loading-donut {
        border-bottom-color: rgb(213, 232, 44);
        animation: 1.5s mzp-donut-spin infinite linear;
    }

    @keyframes mzp-donut-spin {
        to {
            transform: rotate(360deg);
        }
    }

    table.mzp-squad-summary tbody td, table.mzp-squad-summary thead th {
        padding: 0.3em 0.5em;
    }

    @media only screen and (max-device-width: 1020px) {
        thead.responsive-show.mzp-responsive-show {
            display: table-header-group !important;
        }
        tbody tr.responsive-show.mzp-responsive-show {
          display: table-row !important;
      }
    }

    a.mzp-in-progress-result {
        animation: mzp-change-result-background 3s infinite;
    }

    @keyframes mzp-change-result-background {
        0%   {background-color: inherit;}
        50%  {background-color: lightgreen;}
        100%  {background-color: inherit;}
    }
    `;

    /* *********************** Injector Class ********************************** */

    function generateUuidV4() {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
            const r = (Math.random() * 16) | 0,
                v = c == "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

    function getMzButtonColorClass(color) {
        if (color) {
            if (color === "red") {
                return "button_red";
            } else if (color === "blue") {
                return "button_blue";
            }
        }
        return "button_account";
    }

    function createMzStyledButton(title, color = "", floatDirection = null) {
        const div = document.createElement("div");
        div.style.margin = "0.3rem";
        if (floatDirection) {
            // floatDirection: floatRight, floatLeft
            div.classList.add(floatDirection);
        }

        const button = document.createElement("div");
        button.classList.add("mzbtn", "buttondiv", getMzButtonColorClass(color));
        button.innerHTML = `<span class="buttonClassMiddle"><span style="white-space: nowrap">${title}</span></span><span class="buttonClassRight">&nbsp;</span>`;

        div.appendChild(button);
        return div;
    }

    function createMzStyledTitle(text = "") {
        const div = document.createElement("div");
        div.classList.add("win_bg");

        const title = document.createElement("h3");
        title.innerText = text;
        title.style.margin = "0.4rem auto";
        title.style.padding = "0 0.6rem";

        div.appendChild(title);
        return div;
    }

    function configCreateCheckBox(label, initialValue = true) {
        const id = generateUuidV4();

        const div = document.createElement("div");
        div.style.alignSelf = "flex-start";
        div.style.margin = "0.3rem 0.7rem";

        const checkbox = document.createElement("input");
        checkbox.id = id;
        checkbox.type = "checkbox";
        checkbox.checked = initialValue;

        const labelElement = document.createElement("label");
        labelElement.htmlFor = id;
        labelElement.innerText = label;

        div.appendChild(checkbox);
        div.appendChild(labelElement);
        return div;
    }

    class MzpInjector {
        modal;
        content;
        in_progress;
        table_top_players;

        constructor() {
            this.in_progress = GM_getValue("in_progress", true);
            this.table_top_players = GM_getValue("table_top_players", true);

            this.modal = document.createElement("div");
            this.modal.id = "mzp-modal";
            this.modal.classList.add("mzp-flex-container");

            this.content = document.createElement("div");
            this.content.id = "mzp-modal-content";
            this.content.classList.add("mzp-flex-container");

            this.modal.appendChild(this.content);
            this.hide();
            document.body.appendChild(this.modal);
        }

        hide() {
            this.modal.style.display = "none";
        }

        display() {
            this.modal.style.display = "flex";
        }

        clearContent() {
            this.content.innerText = "";
        }

        replaceContent(elements = []) {
            this.clearContent();
            for (const element of elements) {
                if (element) {
                    this.content.appendChild(element);
                }
            }
        }

        displayLoading(title = "MZP") {
            const header = createMzStyledTitle(title);

            const loading = document.createElement("p");
            loading.innerText = "Loading...";
            loading.style.padding = "1rem";

            this.clearContent();
            this.content.appendChild(header);
            this.content.appendChild(loading);
            this.display();
        }

        saveMenu() {
            GM_setValue("in_progress", this.in_progress);
            GM_setValue("table_top_players", this.table_top_players);
        }

        displayMenu() {
            const that = this; // used in onclick event listener

            const div = document.createElement("div");
            div.classList.add("mzp-flex-container");

            const title = createMzStyledTitle("MZP Settings");
            const inProgress = configCreateCheckBox("Display In Progress Results", this.in_progress);
            const tableInjection = configCreateCheckBox("Display Teams' Top Players in Tables", this.table_top_players);

            const buttons = document.createElement("div");
            buttons.classList.add("mzp-flex-container-row");

            const cancel = createMzStyledButton("Cancel", "red");
            cancel.onclick = () => {
                that.hide();
                that.clearContent();
            };

            const save = createMzStyledButton("Save", "green");
            save.onclick = () => {
                // save then close
                that.in_progress = inProgress.querySelector("input[type=checkbox]").checked;
                that.table_top_players = tableInjection.querySelector("input[type=checkbox]").checked;
                that.saveMenu();
                that.hide();
                that.clearContent();
            };

            div.appendChild(title);
            div.appendChild(inProgress);
            div.appendChild(tableInjection);

            buttons.appendChild(cancel);
            buttons.appendChild(save);
            div.appendChild(buttons);

            this.replaceContent([div]);
            this.display();
        }

        mustDisplayInProgressResults() {
            return this.in_progress;
        }

        mustDisplayTopPlayersInTables() {
            return this.table_top_players;
        }
    }

    const injector = new MzpInjector();

    /* *********************** Utils ********************************** */

    function hasDuplicates(array) {
        return new Set(array).size !== array.length;
    }

    function getSportType(doc = document) {
        const zone = doc.querySelector("a#shortcut_link_thezone");
        if (zone) {
            return zone.href.indexOf("hockey") > -1 ? "hockey" : "soccer";
        }
        return "soccer";
    }

    function getCurrency(doc) {
        const players = doc.getElementById("playerAltViewTable")?.querySelectorAll("tbody tr");
        if (players && players.length > 0) {
            const parts = players[0].querySelector("td:nth-child(3)")?.innerText.split(" ");
            return parts[parts.length - 1];
        }
        return "";
    }

    function getNationalCurrency(doc) {
        // works for both domestic and foreign countries
        const playerNode = doc.getElementById("thePlayers_0")?.querySelector("table tbody tr:nth-child(6)");
        if (playerNode) {
            const parts = playerNode.innerText.split(" ");
            return parts[parts.length - 1];
        }
        return "";
    }

    function extractTeamId(link) {
        const regex = /tid=(\d+)/;
        const match = regex.exec(link);
        return match ? match[1] : null;
    }

    function extractPlayerID(link) {
        const regex = /pid=(\d+)/;
        const match = regex.exec(link);
        return match ? match[1] : null;
    }

    function extractMatchID(link) {
        const regex = /mid=(\d+)/;
        const match = regex.exec(link);
        return match ? match[1] : null;
    }

    function isMatchInProgress(resultText) {
        const scoreRegex = /\b(X|0|[1-9]\d*) - (X|0|[1-9]\d*)\b/;
        return !scoreRegex.test(resultText);
    }

    function getSquadSummaryLink(tid) {
        return `https://www.managerzone.com/?p=players&sub=alt&tid=${tid}`;
    }

    function formatBigNumber(n, sep = " ") {
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

    function formatAverageAge(age, fractionDigits = 1) {
        if (age) {
            return age.toFixed(fractionDigits);
        }
        return "0.0";
    }

    function getPlayers(doc, currency) {
        const playerNodes = doc.getElementById("playerAltViewTable")?.querySelectorAll("tr");
        if (!playerNodes) {
            return [];
        }

        const players = [];
        for (const playerNode of [...playerNodes]) {
            const age = playerNode.querySelector("td:nth-child(5)")?.innerText.replace(/\s/g, "");
            if (age) {
                const value = playerNode.querySelector("td:nth-child(3)")?.innerText.replaceAll(currency, "").replace(/\s/g, "");
                const shirtNumber = playerNode.querySelector("td:nth-child(0)")?.innerText.replace(/\s/g, "");
                const pid = playerNode.querySelector("a")?.href;
                players.push({
                    shirtNumber,
                    age: parseInt(age, 10),
                    value: parseInt(value, 10),
                    id: extractPlayerID(pid),
                });
            }
        }
        return players;
    }

    function getNumberOfFlags(infoTable) {
        const images = infoTable.getElementsByTagName("img");
        return images ? [...images].filter((img) => img.src.indexOf("/flags/") > -1).length : 0;
    }

    function isDomesticPlayer(infoTable) {
        return getNumberOfFlags(infoTable) === 1;
    }

    function getNationalPlayers(doc, currency) {
        const players = [];
        const playerNodes = doc.querySelectorAll("div.playerContainer");
        if (playerNodes) {
            for (const playerNode of [...playerNodes]) {
                const id = extractPlayerID(playerNode.querySelector("h2 a")?.href);
                const infoTable = playerNode.querySelector("div.dg_playerview_info table");
                const age = infoTable.querySelector("tbody tr:nth-child(1) td strong").innerText;
                const selector = isDomesticPlayer(infoTable) ? "tbody tr:nth-child(5) td span" : "tbody tr:nth-child(6) td span";
                const value = infoTable.querySelector(selector)?.innerText.replaceAll(currency, "").replace(/\s/g, "");
                players.push({
                    age: parseInt(age, 10),
                    value: parseInt(value, 10),
                    id,
                });
            }
        }
        return players;
    }

    function getNumberOfPlayers(players, ageLow = 0, ageHigh = 99) {
        return players.filter((player) => player.age <= ageHigh && player.age >= ageLow).length;
    }

    function filterPlayers(players, count = 0, ageLow = 0, ageHigh = 99) {
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

    function getTopPlyers(doc) {
        const currency = getCurrency(doc);
        const players = getPlayers(doc, currency);
        const sport = getSportType(doc);
        const count = sport === "soccer" ? 11 : 21;
        return players ? filterPlayers(players, count).values : 0;
    }

    function displaySquadSummaryOnModal(url) {
        injector.displayLoading("MZP Squad Summary");
        GM_xmlhttpRequest({
            method: "GET",
            url,
            onload: function (resp) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(resp.responseText, "text/html");
                const sport = getSportType(doc);
                const currency = getCurrency(doc);
                const players = getPlayers(doc, currency);
                const summary = squadSummaryGetInfo(players, sport);
                const table = squadSummaryCreateInfoTable(summary, currency, sport);

                table.style.width = "auto";
                table.style.marginTop = "2px";
                table.style.padding = "0";

                const header = createMzStyledTitle("MZP Squad Summary");
                const button = createMzStyledButton("Close", "red");
                button.onclick = () => {
                    injector.hide();
                };
                injector.replaceContent([header, table, button]);
            },
        });
    }

    /* *********************** Squad Summary ********************************** */

    function squadSummaryGetInfo(players, sport = "soccer") {
        const rows = [];
        if (players) {
            if (sport === "hockey") {
                {
                    const all = filterPlayers(players);
                    const top21 = filterPlayers(players, 21);
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
                    const all = filterPlayers(players, 0, 0, 23);
                    const top21 = filterPlayers(players, 21, 0, 23);
                    rows.push({
                        title: "U23",
                        count: getNumberOfPlayers(players, 0, 23),
                        all: all.values,
                        allAge: all.avgAge,
                        top21: top21.values,
                        top21Age: top21.avgAge,
                    });
                }
                {
                    const all = filterPlayers(players, 0, 0, 21);
                    const top21 = filterPlayers(players, 21, 0, 21);
                    rows.push({
                        title: "U21",
                        count: getNumberOfPlayers(players, 0, 21),
                        all: all.values,
                        allAge: all.avgAge,
                        top21: top21.values,
                        top21Age: top21.avgAge,
                    });
                }
                {
                    const all = filterPlayers(players, 0, 0, 18);
                    const top21 = filterPlayers(players, 21, 0, 18);
                    rows.push({
                        title: "U18",
                        count: getNumberOfPlayers(players, 0, 18),
                        all: all.values,
                        allAge: all.avgAge,
                        top21: top21.values,
                        top21Age: top21.avgAge,
                    });
                }
            } else {
                {
                    const all = filterPlayers(players);
                    const top16 = filterPlayers(players, 16);
                    const top11 = filterPlayers(players, 11);
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
                    const all = filterPlayers(players, 0, 0, 23);
                    const top16 = filterPlayers(players, 16, 0, 23);
                    const top11 = filterPlayers(players, 11, 0, 23);
                    rows.push({
                        title: "U23",
                        count: getNumberOfPlayers(players, 0, 23),
                        all: all.values,
                        allAge: all.avgAge,
                        top16: top16.values,
                        top16Age: top16.avgAge,
                        top11: top11.values,
                        top11Age: top11.avgAge,
                    });
                }
                {
                    const all = filterPlayers(players, 0, 0, 21);
                    const top16 = filterPlayers(players, 16, 0, 21);
                    const top11 = filterPlayers(players, 11, 0, 21);
                    rows.push({
                        title: "U21",
                        count: getNumberOfPlayers(players, 0, 21),
                        all: all.values,
                        allAge: all.avgAge,
                        top16: top16.values,
                        top16Age: top16.avgAge,
                        top11: top11.values,
                        top11Age: top11.avgAge,
                    });
                }
                {
                    const all = filterPlayers(players, 0, 0, 18);
                    const top16 = filterPlayers(players, 16, 0, 18);
                    const top11 = filterPlayers(players, 11, 0, 18);
                    rows.push({
                        title: "U18",
                        count: getNumberOfPlayers(players, 0, 18),
                        all: all.values,
                        allAge: all.avgAge,
                        top16: top16.values,
                        top16Age: top16.avgAge,
                        top11: top11.values,
                        top11Age: top11.avgAge,
                    });
                }
            }
        }
        return rows;
    }

    function squadSummaryCreateCompactElement(title, value) {
        const dd = document.createElement("dd");
        dd.innerHTML = `<span class="listHeadColor">${title}</span><span class="clippable">${value}</span>`;
        return dd;
    }

    function squadSummaryCreateCompactRow(row, currency = "USD", sport = "soccer") {
        const dl = document.createElement("dl");
        dl.classList.add("hitlist-compact-list", "columns");

        dl.appendChild(squadSummaryCreateCompactElement("Count", row.count));
        dl.appendChild(squadSummaryCreateCompactElement("Total", `${formatBigNumber(row.all)} ${currency}`));
        if (sport == "soccer") {
            dl.appendChild(squadSummaryCreateCompactElement("Top 16", `${formatBigNumber(row.top16)} ${currency}`));
            dl.appendChild(squadSummaryCreateCompactElement("Top 11", `${formatBigNumber(row.top11)} ${currency}`));
        } else {
            dl.appendChild(squadSummaryCreateCompactElement("Top 21", `${formatBigNumber(row.top21)} ${currency}`));
        }
        return dl;
    }

    function squadSummaryCreateInfoTable(rows, currency = "USD", sport = "soccer") {
        const thead = document.createElement("thead");
        const tr = document.createElement("tr");

        const titleHeader = document.createElement("th");
        titleHeader.classList.add("header");
        titleHeader.innerText = "Group";
        titleHeader.style.textAlign = "center";
        titleHeader.style.textDecoration = "none";

        const countHeader = document.createElement("th");
        countHeader.classList.add("header");
        countHeader.innerText = "Count";
        countHeader.title = "Number of Players";
        countHeader.style.textAlign = "center";
        countHeader.style.textDecoration = "none";

        const totalHeader = document.createElement("th");
        totalHeader.classList.add("header");
        totalHeader.innerHTML = "Total";
        totalHeader.title = "Total Value of Players";
        totalHeader.style.textAlign = "center";
        totalHeader.style.textDecoration = "none";

        tr.appendChild(titleHeader);
        tr.appendChild(countHeader);
        tr.appendChild(totalHeader);

        if (sport === "soccer") {
            const top16Header = document.createElement("th");
            top16Header.classList.add("header");
            top16Header.innerHTML = "Top 16";
            top16Header.title = "Value of Top 16 Players";
            top16Header.style.textAlign = "center";
            top16Header.style.textDecoration = "none";

            const top11Header = document.createElement("th");
            top11Header.classList.add("header");
            top11Header.innerHTML = "Top 11";
            top11Header.title = "Value of Top 11 Players";
            top11Header.style.textAlign = "center";
            top11Header.style.textDecoration = "none";

            tr.appendChild(top16Header);
            tr.appendChild(top11Header);
        } else {
            const top21Header = document.createElement("th");
            top21Header.classList.add("header");
            top21Header.innerHTML = "Top 21";
            top21Header.title = "Value of Top 21 Players";
            top21Header.style.textAlign = "center";
            top21Header.style.textDecoration = "none";

            tr.appendChild(top21Header);
        }
        thead.appendChild(tr);

        const tbody = document.createElement("tbody");
        for (const row of rows) {
            const title = document.createElement("td");
            title.innerHTML = `${row.title}`;
            title.classList.add("hitlist-compact-list-column");
            const compact = squadSummaryCreateCompactRow(row, currency, sport);

            title.appendChild(compact);

            const count = document.createElement("td");
            count.innerHTML = `${row.count}`;
            count.style.textAlign = "center";

            const all = document.createElement("td");
            all.innerText = `${formatBigNumber(row.all)} ${currency}`;
            all.style.textAlign = "end";

            const tr = document.createElement("tr");
            tr.appendChild(title);
            tr.appendChild(count);
            tr.appendChild(all);
            tbody.appendChild(tr);

            if (sport === "soccer") {
                const top16 = document.createElement("td");
                top16.innerText = `${formatBigNumber(row.top16)} ${currency}`;
                top16.style.textAlign = "end";

                const top11 = document.createElement("td");
                top11.innerText = `${formatBigNumber(row.top11)} ${currency}`;
                top11.style.textAlign = "end";

                tr.appendChild(top16);
                tr.appendChild(top11);
            } else {
                const top21 = document.createElement("td");
                top21.innerText = `${formatBigNumber(row.top21)} ${currency}`;
                top21.style.textAlign = "end";

                tr.appendChild(top21);
            }
        }

        const table = document.createElement("table");
        table.classList.add("mzp-squad-summary", "tablesorter", "hitlist", "marker", "hitlist-compact-list-included");
        table.style.borderSpacing = "0";

        table.appendChild(thead);
        table.appendChild(tbody);

        return table;
    }

    function squadSummaryInjectInfo() {
        const place = document.querySelector("table#playerAltViewTable");
        if (place) {
            const sport = getSportType(document);
            const currency = getCurrency(document);
            const players = getPlayers(document, currency);
            const summary = squadSummaryGetInfo(players, sport);
            const table = squadSummaryCreateInfoTable(summary, currency, sport);
            const div = document.createElement("div");

            table.style.marginBottom = "10px";

            div.classList.add("mzp-flex-container");

            div.appendChild(table);
            place.parentNode.insertBefore(div, place);
        }
    }

    function squadSummaryWaitAndInjectInfo(timeout = 16000) {
        const step = 500;
        const interval = setInterval(() => {
            const table = document.querySelector("table#playerAltViewTable");
            if (table) {
                clearInterval(interval);
                if (!table.SummaryInfoInjected) {
                    table.SummaryInfoInjected = true;
                    squadSummaryInjectInfo();
                }
            } else {
                timeout -= step;
                if (timeout < 0) {
                    clearInterval(interval);
                }
            }
        }, step);
    }

    function squadSummaryAddClickCallbackForTab() {
        const summaryTab = document.querySelector(`a[href="#squad_summary"]`);
        if (summaryTab) {
            summaryTab.parentNode.onclick = squadSummaryWaitAndInjectInfo;
        }
    }

    /* *********************** Clash ********************************** */

    function clashCalculateRankOfTeams(rows) {
        const finals = [];
        for (const row of rows) {
            if (!row.isMatchRow) {
                const team = row.querySelector("a.team-name");
                const tid = extractTeamId(team.href);
                const url = getSquadSummaryLink(tid);
                finals.push({
                    target: team,
                    row,
                    url,
                    values: 0,
                    done: false,
                    currency: "",
                    playedMatches: row.playedMatches,
                });
                GM_xmlhttpRequest({
                    method: "GET",
                    url,
                    context: finals,
                    onload: function (resp) {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(resp.responseText, "text/html");
                        const currency = getCurrency(doc);
                        const values = getTopPlyers(doc);
                        const fin = resp.context?.find((p) => resp.finalUrl === p.url);
                        if (fin) {
                            fin.values = values;
                            fin.done = true;
                            fin.currency = currency;
                        }
                    },
                });
            }
        }

        let timeout = 16000;
        const step = 500;
        let interval = setInterval(() => {
            if (finals.every((a) => a.done)) {
                clearInterval(interval);
                finals.sort((a, b) => b.values - a.values);
                let rank = 0;
                for (const team of finals) {
                    rank++;
                    team.row.className = rank % 2 ? "odd" : "even";
                    const target = team.row.querySelector("button.mzp-donut.rank");
                    if (target) {
                        target.classList.remove("mzp-loading-donut");
                        target.classList.add("mzp-final-donut");
                        target.innerText = `${rank}`;
                    }
                    const value = team.row.querySelector("td.value");
                    if (value) {
                        value.innerText = `${formatBigNumber(team.values, ",")} ${team.currency}`;
                    }
                }
                const newOrder = finals.map((t) => t.row);
                const newOrderWithPlayedMatches = [];
                for (const row of newOrder) {
                    newOrderWithPlayedMatches.push(row);
                    for (const playedMatch of row.playedMatches) {
                        playedMatch.className = row.className;
                        newOrderWithPlayedMatches.push(playedMatch);
                    }
                }
                const tbody = document.querySelector("div.panel-2 table tbody");
                tbody.replaceChildren(...newOrderWithPlayedMatches);
            } else {
                timeout -= step;
                if (timeout < 0) {
                    clearInterval(interval);
                    for (const team of finals) {
                        const target = team.row.querySelector("button.mzp-donut.rank");
                        target.classList.remove("mzp-loading-donut");
                        target.classList.add("mzp-final-donut");
                        target.innerText = `-`;

                        const value = team.row.querySelector("td.value");
                        value.innerText = `N/A`;
                    }
                }
            }
        }, step);
    }

    function clashAddRankElements(team, url = "") {
        const value = document.createElement("td");
        value.style.width = "max-content";
        value.innerText = "";
        value.classList.add("value");
        value.style.textAlign = "right";
        team.insertBefore(value, team.firstChild);

        const rank = document.createElement("td");
        rank.style.width = "max-content";
        team.insertBefore(rank, team.firstChild);
        const button = document.createElement("button");
        button.innerText = "_";
        button.classList.add("mzp-donut", "mzp-loading-donut", "rank", "fix-width");
        button.title = "Click to see squad summary";
        rank.appendChild(button);
        button.onclick = () => {
            displaySquadSummaryOnModal(url);
        };
    }

    function clashInjectRanks() {
        const table = document.querySelector("table.hitlist.challenges-list");

        const headers = table.querySelector("thead tr");
        // mobile view has not headers section
        if (headers) {
            const value = document.createElement("th");
            value.style.textAlign = "right";
            value.innerText = "Values";
            value.style.width = "15%";
            headers.insertBefore(value, headers.firstChild);

            const rank = document.createElement("th");
            rank.innerText = "Rank";
            rank.style.width = "5%";
            headers.insertBefore(rank, headers.firstChild);
        }

        const rows = table.querySelectorAll("tbody tr");
        for (const row of rows) {
            // in mobile view played challenges are also <tr> and for this rows, the team name is not a hyperlink
            const name = row.querySelector("a.team-name");
            if (name?.href) {
                const tid = extractTeamId(name.href);
                const url = getSquadSummaryLink(tid);
                clashAddRankElements(row, url);
                row.playedMatches = [];
                row.isMatchRow = false;
            } else {
                row.previousSibling.playedMatches?.push(row);
                const firstTd = row.querySelector("td");
                firstTd.colSpan = "3";
                row.isMatchRow = true;
            }
        }
        clashCalculateRankOfTeams(rows);
    }

    /* *********************** Federation Page ********************************** */

    function federationFetchTopPlayers(context, url) {
        GM_xmlhttpRequest({
            method: "GET",
            url,
            context,
            onload: function (resp) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(resp.responseText, "text/html");
                const team = resp.context.teams.find((t) => t.username === resp.context.username);
                team.currency = getCurrency(doc);
                team.values = getTopPlyers(doc);

                const name = document.createElement("div");
                name.style.color = "blue";
                name.style.width = "100%";
                name.style.marginTop = "0.5em";
                name.title = team.teamName;
                const teamName = team.teamName.length > 20 ? team.teamName.substring(0, 16) + " >>>" : team.teamName;
                name.innerHTML = `<span style="color:red;">Team: </span>${teamName}`;
                team.node.querySelector("td").appendChild(name);

                const value = document.createElement("div");
                value.style.color = "blue";
                value.style.width = "100%";
                value.style.marginTop = "0.5em";
                const count = resp.context.sport === "soccer" ? 11 : 21;
                value.innerHTML = `<span style="color:red;">Top${count}: </span>${formatBigNumber(team.values, ",")} ${team.currency}`;
                team.node.querySelector("td").appendChild(value);

                team.done = true;
            },
        });
    }

    function federationFetchTeamValue(sport, teams, username) {
        const url = `https://www.managerzone.com/xml/manager_data.php?username=${username}`;
        GM_xmlhttpRequest({
            method: "GET",
            url: url,
            context: { sport, teams, username },
            onload: function (resp) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(resp.responseText, "text/xml");
                const teamId = doc.querySelector(`Team[sport="${resp.context.sport}"]`).getAttribute("teamId");
                const teamName = doc.querySelector(`Team[sport="${resp.context.sport}"]`).getAttribute("teamName");
                resp.context.teams.find((t) => t.username === resp.context.username).teamName = teamName;
                const squadUrl = getSquadSummaryLink(teamId);
                federationFetchTopPlayers(resp.context, squadUrl);
            },
        });
    }

    function federationGetUsername(node) {
        return node.querySelector("a").innerText;
    }

    function federationGetTableHeader() {
        const thead = document.querySelector("#federation_clash_members_list thead td");
        return thead.innerText;
    }

    function federationSetTableHeader(text) {
        const thead = document.querySelector("#federation_clash_members_list thead td");
        thead.innerText = text;
    }

    function federationSortTeamsByTopPlayers() {
        const tbody = document.querySelector("#federation_clash_members_list tbody");
        const sport = getSportType();
        const teams = [];
        for (const child of tbody.children) {
            const username = federationGetUsername(child);
            teams.push({
                node: child,
                username,
                teamName: "",
                teamId: "",
                values: 0,
                currency: "",
                done: false,
            });
            federationFetchTeamValue(sport, teams, username);
        }

        let timeout = 60000;
        const step = 500;
        const tableHeader = federationGetTableHeader();
        let dots = 0;
        let interval = setInterval(() => {
            if (teams.every((t) => t.done)) {
                clearInterval(interval);
                teams.sort((a, b) => b.values - a.values);
                const newOrder = teams.map((t) => t.node);
                let rank = 0;
                for (const row of newOrder) {
                    rank++;
                    row.className = rank % 2 ? "odd" : "even";
                }
                tbody.replaceChildren(...newOrder);
                federationSetTableHeader(tableHeader + " ▼");

                let totalValue = 0;
                for (const team of teams) {
                    totalValue += team.values;
                }

                const total = document.createElement("tr");
                total.style.color = "blue";
                total.style.width = "100%";
                total.style.marginTop = "3px";
                total.innerHTML = `<td><hr><span style="color:red;">Total: </span>${formatBigNumber(totalValue, ",")} ${teams[0].currency}</td>`;
                tbody.appendChild(total);
            } else {
                timeout -= step;
                federationSetTableHeader(tableHeader + " " + ".".repeat(1 + (dots % 3)));
                dots++;
                if (timeout < 0) {
                    clearInterval(interval);
                    federationSetTableHeader(tableHeader + " (failed)");
                }
            }
        }, step);
    }

    /* *********************** Match ********************************** */

    // ---------------- Top Players -------------

    function matchCreateTopPlayersHeader(sport = "soccer") {
        const thead = document.createElement("thead");
        const tr = document.createElement("tr");
        const title = document.createElement("th");
        const count = document.createElement("th");
        const tops = document.createElement("th");
        const age = document.createElement("th");

        const playerCount = sport === "soccer" ? 11 : 21;

        title.classList.add("header");
        title.innerText = "Group";
        title.style.textAlign = "center";
        title.style.textDecoration = "none";

        count.classList.add("header");
        count.innerText = "Count";
        count.title = "Number of Players";
        count.style.textAlign = "center";
        count.style.textDecoration = "none";

        tops.classList.add("header");
        tops.innerHTML = `Top ${playerCount}`;
        tops.title = "Value of Top 11 Players";
        tops.style.textAlign = "center";
        tops.style.textDecoration = "none";

        age.classList.add("header");
        age.innerHTML = "Average Age";
        age.title = `Average Age of Top ${playerCount} Players`;
        age.style.textAlign = "center";
        age.style.textDecoration = "none";

        tr.appendChild(title);
        tr.appendChild(count);
        tr.appendChild(tops);
        tr.appendChild(age);
        thead.appendChild(tr);
        return thead;
    }

    function matchCreateTopPlayersBody(rows, currency = "USD", sport = "soccer") {
        const tbody = document.createElement("tbody");
        for (const row of rows) {
            const tr = document.createElement("tr");
            const title = document.createElement("td");
            const count = document.createElement("td");
            const top = document.createElement("td");
            const age = document.createElement("td");

            title.innerHTML = `${row.title}`;
            title.classList.add("hitlist-compact-list-column");

            count.innerHTML = `${row.count}`;
            count.style.textAlign = "center";

            top.style.textAlign = "end";

            age.style.textAlign = "center";

            if (sport === "soccer") {
                top.innerText = `${formatBigNumber(row.top11)} ${currency}`;
                age.innerText = `${formatAverageAge(row.top11Age)}`;
            } else {
                top.innerText = `${formatBigNumber(row.top21)} ${currency}`;
                age.innerText = `${formatAverageAge(row.top21Age)}`;
            }

            tr.appendChild(title);
            tr.appendChild(count);
            tr.appendChild(top);
            tr.appendChild(age);
            tbody.appendChild(tr);
        }
        return tbody;
    }

    function matchCreateSummaryTable(rows, currency = "USD", sport = "soccer") {
        const table = document.createElement("table");
        const thead = matchCreateTopPlayersHeader(sport);
        const tbody = matchCreateTopPlayersBody(rows, currency, sport);

        table.classList.add("mzp-squad-summary", "tablesorter", "hitlist", "marker", "hitlist-compact-list-included");
        table.style.borderSpacing = "0";
        table.style.marginBottom = "10px";
        table.style.marginTop = "2em";

        table.appendChild(thead);
        table.appendChild(tbody);
        return table;
    }

    function matchInjectTopPlayersValues(players, team, currency, sport) {
        const summary = squadSummaryGetInfo(players, sport);
        const table = matchCreateSummaryTable(summary, currency, sport);

        const div = document.createElement("div");
        div.classList.add("mzp-flex-container");

        div.appendChild(table);
        team.appendChild(div);
    }

    // ---------------- Lineup --------------------

    function matchGetLineupPlayers(teamNode, teamPlayers, sport) {
        const lineup = [];
        const teamPlayerIDs = teamPlayers.map((p) => p.id);
        const lineupPlayers = teamNode.querySelectorAll("tbody tr");

        for (const playerNode of lineupPlayers) {
            const pos = playerNode.querySelector("td:nth-child(2)");
            const order = Number(pos.querySelector("span").innerText);
            const pid = extractPlayerID(playerNode.querySelector("a").href);
            const playerInfo = {
                id: pid,
                order,
                exPlayer: !teamPlayerIDs.includes(pid),
                starting: sport === "hockey" || order < 12,
                value: teamPlayers.find((p) => p.id === pid)?.value ?? 0,
                age: teamPlayers.find((p) => p.id === pid)?.age,
            };

            const shirtNumber = playerNode.querySelector("td");
            if (playerInfo.starting) {
                shirtNumber.style.background = "lightgreen";
            }
            if (playerInfo.exPlayer) {
                shirtNumber.style.background = "#DD0000";
            }

            const value = document.createElement("td");
            value.innerText = `${playerInfo.value ? formatBigNumber(playerInfo.value, ",") : "N/A"}`;
            playerNode.appendChild(value);

            const age = document.createElement("td");
            age.innerText = `${playerInfo.age ?? "N/A"}`;
            playerNode.appendChild(age);

            lineup.push(playerInfo);
        }
        return lineup;
    }

    function matchInjectLineupValues(players, team, currency, sport) {
        const valueHeader = document.createElement("td");
        valueHeader.innerText = `Value`;
        valueHeader.title = `Player Value (in ${currency})`;
        team.querySelector("table thead tr:nth-child(2)").appendChild(valueHeader);
        team.querySelector("table tfoot tr td").colSpan += 1;

        const ageHeader = document.createElement("td");
        ageHeader.innerText = `Age`;
        ageHeader.title = `Player Age`;
        team.querySelector("table thead tr:nth-child(2)").appendChild(ageHeader);
        team.querySelector("table tfoot tr td").colSpan += 1;
        team.querySelector("table thead tr td").colSpan += 1;

        const lineupPlayers = matchGetLineupPlayers(team, players, sport).filter((player) => player.starting && !player.exPlayer);
        const value = lineupPlayers?.map((player) => player.value).reduce((a, b) => a + b, 0);
        let averageAge = lineupPlayers?.map((player) => player.age).reduce((a, b) => a + b, 0);
        if (averageAge) {
            averageAge /= lineupPlayers.length;
        }

        const div = document.createElement("div");
        div.innerHTML =
            `${sport === "soccer" ? "Starting " : ""}Lineup` +
            `<br>Value: <b>${formatBigNumber(value, ",")}</b> ${currency}` +
            `<br>Average Age: <b>${formatAverageAge(averageAge)}</b>` +
            `<br><br>Note: <span style="background:lightgreen">YYY</span>` +
            ` are ${sport === "soccer" ? "starting " : "current"} players and ` +
            `<span style="background:#DD0000">NNN</span> are ex-players.` +
            `<br>ex-player's value is N/A and not included in Lineup Value calculation.`;

        div.style.margin = "10px";
        div.style.padding = "5px";
        div.style.border = "2px solid green";
        div.style.borderRadius = "10px";
        const place = team.querySelector("table");
        team.insertBefore(div, place);
    }

    // ---------------- Top Players -------------

    function matchAddTopPlayersValueNational(team, sport) {
        const teamLink = team.querySelector("a").href;
        const tid = extractTeamId(teamLink);
        const url = `https://www.managerzone.com/ajax.php?p=nationalTeams&sub=players&ntid=${tid}&sport=${sport}`;
        GM_xmlhttpRequest({
            method: "GET",
            url,
            context: { team, sport },
            onload: function (resp) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(resp.responseText, "text/html");
                const currency = getNationalCurrency(doc);
                const players = getNationalPlayers(doc, currency);
                const team = resp.context.team;
                const sport = resp.context.sport;

                matchInjectTopPlayersValues(players, team, currency, sport);
            },
        });
    }

    function matchAddTopPlayersValue(team, sport) {
        const teamLink = team.querySelector("a").href;
        const tid = extractTeamId(teamLink);
        const url = getSquadSummaryLink(tid);
        GM_xmlhttpRequest({
            method: "GET",
            url,
            context: { team, sport },
            onload: function (resp) {
                if (resp.finalUrl.search("p=national_teams") > -1) {
                    matchAddTopPlayersValueNational(resp.context.team, resp.context.sport);
                } else {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(resp.responseText, "text/html");
                    const currency = getCurrency(doc);
                    const players = getPlayers(doc, currency);
                    const team = resp.context.team;
                    const sport = resp.context.sport;

                    matchInjectTopPlayersValues(players, team, currency, sport);
                }
            },
        });
    }

    // ------------ Lineup -----------------------

    function matchAddLineupValuesNational(team, sport) {
        const teamLink = team.querySelector("a").href;
        const tid = extractTeamId(teamLink);
        const url = `https://www.managerzone.com/ajax.php?p=nationalTeams&sub=players&ntid=${tid}&sport=${sport}`;
        GM_xmlhttpRequest({
            method: "GET",
            url,
            context: { team, sport },
            onload: function (resp) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(resp.responseText, "text/html");
                const currency = getNationalCurrency(doc);
                const players = getNationalPlayers(doc, currency);
                const team = resp.context.team;
                const sport = resp.context.sport;
                matchInjectLineupValues(players, team, currency, sport);
            },
        });
    }

    function matchAddLineupValues(team, sport) {
        const teamLink = team.querySelector("a").href;
        const tid = extractTeamId(teamLink);
        const url = getSquadSummaryLink(tid);
        GM_xmlhttpRequest({
            method: "GET",
            url,
            context: { team, sport },
            onload: function (resp) {
                if (resp.finalUrl.search("p=national_teams") > -1) {
                    matchAddLineupValuesNational(resp.context.team, resp.context.sport);
                } else {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(resp.responseText, "text/html");
                    const currency = getCurrency(doc);
                    const players = getPlayers(doc, currency);
                    const team = resp.context.team;
                    const sport = resp.context.sport;
                    matchInjectLineupValues(players, team, currency, sport);
                }
            },
        });
    }

    function matchInjectTeamValues() {
        const sport = getSportType();
        const teams = document.querySelectorAll("div.team-table");
        for (const team of teams) {
            if (team.querySelector("table")) {
                matchAddLineupValues(team, sport);
            } else {
                matchAddTopPlayersValue(team, sport);
            }
        }
    }

    /* ******************** In Progress Results ************************* */

    function matchGetWinner(context) {
        const h = Number(context.homeGoals);
        const a = Number(context.awayGoals);
        if (h > a) {
            return context.homeId;
        } else if (h < a) {
            return context.awayId;
        }
        return null;
    }

    function matchUpdateResult(result, context) {
        result.innerText = context.homeGoals + " - " + context.awayGoals;
        if ([context.homeId, context.awayId].includes(context.targetId)) {
            const winnerId = matchGetWinner(context);
            if (winnerId) {
                result.style.background = winnerId === context.targetId ? "#5D7F13" : "#930000";
                result.style.color = "#fff";
            } else {
                // equal
                result.style.background = "#F2D624";
                result.style.color = "#000";
            }
        } else {
            result.style.background = "coral";
            result.style.color = "#fff";
        }
    }

    function matchGetPossiblyInProgressMatches(section) {
        let days = 0;
        const possiblyInProgress = [];
        for (const child of [...section.children]) {
            const classes = [...child.classList];
            if (classes?.includes("odd")) {
                if (!child.updated) {
                    possiblyInProgress.push(child);
                }
            } else if (classes?.includes("group")) {
                days += 1;
                if (days == 3) {
                    break;
                }
            }
        }
        return possiblyInProgress;
    }

    function matchWaitAndInjectInProgressResults(timeout = 32000) {
        const step = 500;
        const interval = setInterval(() => {
            const matchesSection = document.getElementById("fixtures-results-list");
            if (matchesSection) {
                const games = matchesSection.querySelectorAll("dd.group");
                if (games.length > 0) {
                    matchAddInProgressResults(matchesSection);
                    clearInterval(interval);
                }
            } else {
                timeout -= step;
                if (timeout < 0) {
                    clearInterval(interval);
                }
            }
        }, step);
    }

    function matchAttachChangeEventToFilterForm() {
        const filterForm = document.getElementById("matchListForm");
        if (filterForm && !filterForm.eventAttached) {
            filterForm.eventAttached = true;
            // FIXME: when this event is fired, it is removed from the element or element is changed somehow.
            // so for now we will attach it again after each change event.
            filterForm.addEventListener("change", matchWaitAndInjectInProgressResults);
        }
    }

    function matchAddInProgressResults(section) {
        matchAttachChangeEventToFilterForm();
        const sport = getSportType();
        const matches = matchGetPossiblyInProgressMatches(section);
        // when you visit someone else fixture, this return its id
        let teamId = extractTeamId(document.baseURI);
        for (const match of matches) {
            const result = match.querySelector("dd.teams-wrapper a.score-shown");
            if (!isMatchInProgress(result.innerText)) {
                match.updated = true;
                continue;
            }
            const mid = extractMatchID(result.href);
            // this always returns your id
            const visitorId = extractTeamId(result.href);
            const url = `http://www.managerzone.com/xml/match_info.php?sport_id=${sport === "soccer" ? 1 : 2}&match_id=${mid}`;
            GM_xmlhttpRequest({
                method: "GET",
                url,
                context: { match, result, teamId: teamId ?? visitorId },
                onload: function (resp) {
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(resp.responseText, "text/xml");
                    if (!xmlDoc.querySelector("ManagerZone_Error")) {
                        const home = xmlDoc.querySelector(`Team[field="home"]`);
                        const away = xmlDoc.querySelector(`Team[field="away"]`);
                        const context = {
                            homeGoals: home.getAttribute("goals"),
                            homeId: home.getAttribute("id"),
                            awayGoals: away.getAttribute("goals"),
                            awayId: away.getAttribute("id"),
                            targetId: resp.context.teamId,
                        };
                        matchUpdateResult(resp.context.result, context);
                    }
                    resp.context.match.updated = true;
                },
            });
        }
    }

    function matchInjectInProgressResults() {
        if (injector.mustDisplayInProgressResults()) {
            const fixturesLink = document.getElementById("matches_sub_nav")?.querySelector("div.flex-grow-0 span a");
            if (fixturesLink) {
                fixturesLink.addEventListener("click", matchWaitAndInjectInProgressResults);
                if ([...fixturesLink.classList].includes("selected")) {
                    const matchesSection = document.getElementById("fixtures-results-list");
                    if (matchesSection) {
                        matchAddInProgressResults(matchesSection);
                    }
                }
            }
        }
    }

    /* *********************** League ********************************** */

    function tableGetAgeLimit(url) {
        if (url.search("type=u23") > -1) {
            return 23;
        } else if (url.search("type=u21") > -1) {
            return 21;
        } else if (url.search("type=u18") > -1) {
            return 18;
        }
        return 99;
    }

    function tableGetValeTitle(sport = "soccer", age = 99) {
        const count = sport === "soccer" ? 11 : 21;
        if ([18, 21, 23].includes(age)) {
            return `Top ${count} - U${age}`;
        }
        return `Top ${count} - All`;
    }

    function tableGetAgeClass(age = 99) {
        if ([18, 21, 23].includes(age)) {
            return `values-u${age}`;
        }
        return "values-all";
    }

    function tableGetNextAge(age = 99) {
        if (age === 99) {
            return 23;
        } else if (age === 23) {
            return 21;
        } else if (age === 21) {
            return 18;
        }
        return 99;
    }

    function tableDisplayAgeInfo(team, ageLimit) {
        const target = team ?? document;
        target.querySelectorAll("td.mzp-injected span")?.forEach((el) => {
            el.style.display = "none";
        });
        const ageClass = tableGetAgeClass(ageLimit);
        target.querySelectorAll("td.mzp-injected span." + ageClass)?.forEach((el) => {
            el.style.display = "unset";
        });
    }

    function tableGetSquadSummaryUrl(team) {
        const teamLink = team.querySelector("td:nth-child(2) a:last-child")?.href;
        const tid = extractTeamId(teamLink);
        return getSquadSummaryLink(tid);
    }

    function tableModifyTeamInBodyForPcView(team, url) {
        const teamValue = document.createElement("td");
        team.appendChild(teamValue);
        const ageValue = document.createElement("td");
        team.appendChild(ageValue);

        teamValue.innerText = "loading...";
        teamValue.classList.add("mzp-injected", "team-value");
        teamValue.title = "Click to see squad summary";
        teamValue.style.textAlign = "center";
        teamValue.style.whiteSpace = "nowrap";
        teamValue.style.padding = "auto 3px";
        teamValue.onclick = () => {
            displaySquadSummaryOnModal(url);
        };

        ageValue.classList.add("mzp-injected", "age-value");
        ageValue.innerText = "...";
        ageValue.style.textAlign = "center";
        ageValue.style.whiteSpace = "nowrap";
        ageValue.style.padding = "auto 3px";
    }

    function tableAddTeamToBodyForMobileView(team, url) {
        const firstRow = team.cloneNode(true);
        team.parentNode.insertBefore(firstRow, team.nextSibling);

        const secondRow = document.createElement("tr");
        firstRow.parentNode.insertBefore(secondRow, firstRow.nextSibling);
        const value = document.createElement("td");
        const age = document.createElement("td");
        secondRow.appendChild(value);
        secondRow.appendChild(age);

        firstRow.children[0].rowSpan = "2";
        firstRow.children[1].rowSpan = "2";

        firstRow.classList.add("responsive-show", "mzp-responsive-show");
        secondRow.classList.add("responsive-show", "mzp-responsive-show");

        value.colSpan = "6";
        value.innerText = "loading...";
        value.classList.add("mzp-injected", "team-value");
        value.title = "Click to see squad summary";
        value.style.textAlign = "center";
        value.style.whiteSpace = "nowrap";
        value.style.padding = "auto 3px";
        value.style.backgroundColor = "aquamarine";
        value.onclick = () => {
            displaySquadSummaryOnModal(url);
        };

        age.colSpan = "2";
        age.classList.add("mzp-injected", "age-value");
        age.innerText = "...";
        age.style.textAlign = "center";
        age.style.whiteSpace = "nowrap";
        age.style.padding = "auto 3px";
        age.style.backgroundColor = "aqua";

        // modify borders to match the original view
        firstRow.style.borderBottom = "inherit";
        secondRow.style.borderBottom = team.style.borderBottom;

        return secondRow;
    }

    function tableAddTeamTopPlayersInfo(team, ageLimit, sport) {
        const url = tableGetSquadSummaryUrl(team);

        // for mobile
        const mobileView = tableAddTeamToBodyForMobileView(team, url);

        // for PC
        team.classList.add("responsive-hide");
        tableModifyTeamInBodyForPcView(team, url);

        GM_xmlhttpRequest({
            method: "GET",
            url,
            context: { team, mobileView, sport, ageLimit },
            onload: function (resp) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(resp.responseText, "text/html");
                const currency = getCurrency(doc);
                const players = getPlayers(doc, currency);

                const pcView = resp.context.team;
                const mobileView = resp.context.mobileView;
                const sport = resp.context.sport;
                const ageLimit = resp.context.ageLimit;

                const playersOfSport = sport === "soccer" ? 11 : 21;

                const all = filterPlayers(players, playersOfSport, 0, 99);
                const u23 = filterPlayers(players, playersOfSport, 0, 23);
                const u21 = filterPlayers(players, playersOfSport, 0, 21);
                const u18 = filterPlayers(players, playersOfSport, 0, 18);

                for (const team of [pcView, mobileView]) {
                    const valueElement = team.querySelector("td.team-value");
                    // prettier-ignore
                    valueElement.innerHTML =
                        `<span class="values-all" style="display:none">${formatBigNumber(all?.values)} ${currency}</span>` +
                        `<span class="values-u23" style="display:none">${formatBigNumber(u23?.values)} ${currency}</span>` +
                        `<span class="values-u21" style="display:none">${formatBigNumber(u21?.values)} ${currency}</span>` +
                        `<span class="values-u18" style="display:none">${formatBigNumber(u18?.values)} ${currency}</span>`;
                    valueElement.style.textAlign = "right";

                    const ageElement = team.querySelector("td.age-value");
                    // prettier-ignore
                    ageElement.innerHTML =
                        `<span class="values-all" style="display:none;">${formatAverageAge(all?.avgAge)}</span>` +
                        `<span class="values-u23" style="display:none;">${formatAverageAge(u23?.avgAge)}</span>` +
                        `<span class="values-u21" style="display:none;">${formatAverageAge(u21?.avgAge)}</span>` +
                        `<span class="values-u18" style="display:none;">${formatAverageAge(u18?.avgAge)}</span>`;

                    tableDisplayAgeInfo(team, ageLimit);
                }
            },
        });
    }

    function tableDisplayNextAgeInfo() {
        const headers = document.querySelectorAll("th.team-value-header");
        let changed = false;
        for (const header of headers) {
            header.age = tableGetNextAge(header.age);
            header.innerText = tableGetValeTitle(header.sport, header.age);
            if (!changed) {
                changed = true;
                tableDisplayAgeInfo(null, header.age);
            }
        }
    }

    function tableModifyHeaderForPcView(header, sport = "soccer", ageLimit = 99) {
        const firstRow = header.querySelector("tr");
        const value = document.createElement("th");
        firstRow.appendChild(value);
        const age = document.createElement("th");
        firstRow.appendChild(age);

        value.classList.add("responsive-hide", "team-value-header");
        value.style.textAlign = "center";
        value.innerText = tableGetValeTitle(sport, ageLimit);
        value.title = "Click to see other age limits";
        value.age = ageLimit;
        value.sport = sport;
        value.onclick = tableDisplayNextAgeInfo;

        age.classList.add("responsive-hide");
        age.style.textAlign = "center";
        age.innerText = `Age`;
        age.title = "Average Age Of the Top Players";
    }

    function tableAddHeaderForMobileView(mainHeader, sport = "soccer", ageLimit = 99) {
        const mobileHeader = mainHeader.cloneNode(true);
        mainHeader.parentNode.insertBefore(mobileHeader, mainHeader.nextSibling);
        const secondRow = document.createElement("tr");
        mobileHeader.appendChild(secondRow);
        const value = document.createElement("th");
        const age = document.createElement("th");
        secondRow.appendChild(value);
        secondRow.appendChild(age);

        mobileHeader.classList.add("responsive-show", "mzp-responsive-show");

        const firstRow = mobileHeader.querySelector("tr");
        firstRow.children[0].rowSpan = "2";
        firstRow.children[1].rowSpan = "2";

        value.classList.add("team-value-header");
        value.colSpan = "6";
        value.style.textAlign = "center";
        value.innerText = tableGetValeTitle(sport, ageLimit);
        value.title = "Click to see other age limits";
        value.age = ageLimit;
        value.sport = sport;
        value.onclick = tableDisplayNextAgeInfo;
        value.style.backgroundColor = "aquamarine";

        age.colSpan = "2";
        age.style.textAlign = "center";
        age.innerText = `Age`;
        age.title = "Average Age Of the Top Players";
        age.style.backgroundColor = "aqua";
    }

    function tableInjectInProgressResults() {
        const sport = getSportType();
        const matches = document.querySelectorAll("table.hitlist.marker td > a");
        const inProgressMatches = [...matches].filter((match) => isMatchInProgress(match.innerText));
        for (const match of inProgressMatches) {
            const mid = extractMatchID(match.href);
            const url = `http://www.managerzone.com/xml/match_info.php?sport_id=${sport === "soccer" ? 1 : 2}&match_id=${mid}`;
            GM_xmlhttpRequest({
                method: "GET",
                url,
                context: { match },
                onload: function (resp) {
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(resp.responseText, "text/xml");
                    if (!xmlDoc.querySelector("ManagerZone_Error")) {
                        const home = xmlDoc.querySelector(`Team[field="home"]`).getAttribute("goals");
                        const away = xmlDoc.querySelector(`Team[field="away"]`).getAttribute("goals");
                        resp.context.match.innerText = home + " - " + away;
                        resp.context.match.classList.add("mzp-in-progress-result");
                    }
                },
            });
        }
    }

    function tableAddTopPlayersInfo(table) {
        const ageLimit = tableGetAgeLimit(document.baseURI);
        const sport = getSportType(document);
        const mainHeader = table.querySelector("thead");

        // for mobile
        tableAddHeaderForMobileView(mainHeader, sport, ageLimit);

        // for PC
        mainHeader.classList.add("responsive-hide");
        tableModifyHeaderForPcView(mainHeader, sport, ageLimit);

        const teams = table.querySelectorAll("tbody tr");
        for (const team of teams) {
            tableAddTeamTopPlayersInfo(team, ageLimit, sport);
        }
    }

    function tableWaitAndInjectTopPlayersInfo(timeout = 16000) {
        const step = 500;
        const interval = setInterval(() => {
            const table = document.querySelector("table.nice_table");
            if (table) {
                clearInterval(interval);
                if (!table.TopPlayersInfoInjected) {
                    table.TopPlayersInfoInjected = true;
                    if (injector.mustDisplayTopPlayersInTables()) {
                        tableAddTopPlayersInfo(table);
                    }
                    if (injector.mustDisplayInProgressResults()) {
                        tableInjectInProgressResults();
                    }
                }
            } else {
                timeout -= step;
                if (timeout < 0) {
                    clearInterval(interval);
                }
            }
        }, step);
    }

    function tableInjectTopPlayersToOfficialLeague() {
        // default sub-page (or tab) for leagues is Table. so try to inject team value after table is loaded
        tableWaitAndInjectTopPlayersInfo();

        // also add 'onclick' handler to Table tab
        const links = document.getElementsByTagName("a");
        for (const link of links) {
            if (["p=league", "sub=table"].every((text) => link.href.indexOf(text) > -1)) {
                link.onclick = tableWaitAndInjectTopPlayersInfo;
            }
        }
    }

    function tableInjectTopPlayersInfoToFriendlyLeague() {
        const links = document.getElementsByTagName("a");
        for (const link of links) {
            if (["p=friendlySeries", "sub=standings"].every((text) => link.href.indexOf(text) > -1)) {
                link.onclick = tableWaitAndInjectTopPlayersInfo;
            }
        }
    }

    function tableInjectTopPlayersInfoToCup() {
        const links = document.getElementsByTagName("a");
        for (const link of links) {
            if (["p=cups", "sub=groupplay"].every((text) => link.href.indexOf(text) > -1)) {
                link.onclick = tableWaitAndInjectTopPlayersInfo;
            }
        }
    }

    /* *********************** Schedule ********************************** */

    function scheduleClearAllColorings(teams) {
        teams.forEach((team) => {
            team.style.backgroundColor = team.originalColor;
        });
    }

    function scheduleResultColors(result) {
        if (result.length < 2) {
            return ["cyan", "cyan"];
        }
        if (result[0] === "X") {
            return ["cyan", "cyan"];
        }
        if (result[0] < result[1]) {
            return ["orangered", "lime"];
        } else if (result[0] > result[1]) {
            return ["lime", "orangered"];
        }
        return ["yellow", "yellow"];
    }

    function scheduleColorizeThisTeam(teams, selected) {
        teams.forEach((team) => {
            if (team.innerText === selected) {
                const tr = team.parentNode;
                const opponents = tr.querySelectorAll("td:nth-child(odd)");
                const result = tr.querySelector("td:nth-child(2)").innerText.split(" - ");
                const colors = scheduleResultColors(result);
                if (opponents[0].innerText === selected) {
                    opponents[0].style.setProperty("background-color", colors[0], "important");
                }
                if (opponents[1].innerText === selected) {
                    opponents[1].style.setProperty("background-color", colors[1], "important");
                }
            }
        });
    }

    function scheduleInjectColoring(tab) {
        let selected = "";
        const teams = tab.querySelectorAll("div.mainContent td:nth-child(odd)");
        for (const team of teams) {
            team.originalColor = team.style.backgroundColor;
            team.onclick = null;
            team.addEventListener("click", function (evt) {
                if (selected && selected !== this.innerText) {
                    // new team is selected
                    scheduleClearAllColorings(teams);
                    selected = "";
                }
                if (selected === this.innerText) {
                    // de-colorize
                    selected = "";
                    scheduleClearAllColorings(teams);
                } else {
                    // colorize
                    selected = this.innerText;
                    scheduleColorizeThisTeam(teams, selected);
                }
            });
        }
    }

    function scheduleHasDuplicateName(round) {
        const teams = round.querySelectorAll("td:nth-child(odd)");
        const names = [...teams].map((t) => t.innerText);
        return hasDuplicates(names);
    }

    function scheduleWaitAndInjectColoring(timeout = 16000) {
        const step = 500;
        const interval = setInterval(() => {
            const firstRound = document.querySelector("div[aria-labelledby='league_tab_schedule'] div.mainContent");
            if (firstRound) {
                const schedule = firstRound.parentNode;
                if (scheduleHasDuplicateName(firstRound)) {
                    const note = document.createElement("p");
                    note.innerHTML = `<b style="color: red;">Note: </b><span>Some teams have similar names. Coloring will not work as expected.</span>`;
                    note.style.fontSize = "1.2em";
                    schedule.insertBefore(note, schedule.firstChild);
                }
                clearInterval(interval);
                scheduleInjectColoring(schedule);
            } else {
                timeout -= step;
                if (timeout < 0) {
                    clearInterval(interval);
                }
            }
        }, step);
    }

    function scheduleInjectColoringToOfficialLeague() {
        const link = document.getElementById("league_tab_schedule");
        if (link) {
            const tab = link.parentNode;
            if (!tab.coloringInjected) {
                tab.coloringInjected = true;
                tab.onclick = scheduleWaitAndInjectColoring;
            }
        }
    }

    /* *********************** Config ********************************** */

    function configCreateMenuButton() {
        const div = document.createElement("div");
        const cog = document.createElement("i");
        div.appendChild(cog);
        const text = document.createElement("span");
        div.appendChild(text);

        div.classList.add("mzp-flex-container");
        div.style.position = "fixed";
        div.style.zIndex = "999";
        div.style.top = "50%";
        div.style.right = "5px";
        div.style.background = "black";
        div.style.color = "white";
        div.style.textAlign = "center";

        cog.classList.add("fa", "fa-cog");
        cog.setAttribute("aria-hidden", "true");
        cog.style.fontSize = "large";
        cog.style.margin = "1px";
        cog.style.padding = "0";

        text.innerText = "MZP";
        text.style.fontSize = "0.6rem";
        text.style.fontWeight = "bold";
        text.style.margin = "0";
        text.style.padding = "1px";

        return div;
    }

    function configInject() {
        const button = configCreateMenuButton();
        document.body.appendChild(button);

        button.onclick = () => {
            injector.displayMenu();
        };
    }

    /* *********************** Inject ********************************** */

    function inject() {
        GM_addStyle(mzpStyles);

        configInject();
        const uri = document.baseURI;
        const url = document.URL;
        if (uri.search("/?p=federations") > -1) {
            if (uri.search("&sub=clash") > -1) {
                clashInjectRanks();
            } else if (uri.search("&fid=") > -1 || url.endsWith("p=federations")) {
                federationSortTeamsByTopPlayers();
            } else if (url.search("p=federations#fid=") > -1) {
                // redirect
                window.location.href = url.replace("#", "&");
            }
        } else if (uri.search("/?p=players") > -1) {
            if (uri.search("/?p=players&sub=alt") > -1) {
                squadSummaryInjectInfo();
            } else {
                squadSummaryAddClickCallbackForTab();
            }
        } else if (uri.search("mid=") > -1) {
            matchInjectTeamValues();
        } else if (uri.search("/?p=match") > -1 && !uri.search("&sub=result") > -1) {
            matchInjectInProgressResults();
        } else if (uri.search("/?p=league") > -1) {
            tableInjectTopPlayersToOfficialLeague();
            scheduleInjectColoringToOfficialLeague();
        } else if (uri.search("/?p=friendlyseries") > -1) {
            tableInjectTopPlayersInfoToFriendlyLeague();
        } else if (uri.search("/?p=cup&") > -1 || uri.search("/?p=private_cup&") > -1) {
            tableInjectTopPlayersInfoToCup();
        }
    }

    if (document.readyState === "loading") {
        // Loading hasn't finished yet
        document.addEventListener("DOMContentLoaded", inject);
    } else {
        // `DOMContentLoaded` has already fired
        inject();
    }
})();
