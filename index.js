// ==UserScript==
// @name         Mazyar
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  Swiss Army knife for managerzone.com
// @copyright    z7z@managerzone
// @author       z7z@managerzone
// @license      MIT
// @run-at       document-idle
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      self
// @match        https://www.managerzone.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=managerzone.com
// @downloadURL  https://update.greasyfork.org/scripts/476290/Mazyar.user.js
// @updateURL    https://update.greasyfork.org/scripts/476290/Mazyar.meta.js
// @supportURL   https://github.com/mz-ir/mazyar
// ==/UserScript==

(async function () {
    "use strict";

    let mazyar = null;

    /* *********************** Styles ********************************** */

    const styles = `
    #mazyar-modal {
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

    #mazyar-modal-content {
        width: fit-content;
        background-color: beige;
        border-radius: 5px;
    }

    .mazyar-flex-container {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        flex-wrap: wrap;
    }

    .mazyar-flex-container-row {
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
        flex-wrap: wrap;
    }

    .mazyar-donut {
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

    .mazyar-final-donut {
        border: rgb(213, 232, 44) solid 2px;
        color: inherit;
        padding:0;
    }

    .mazyar-loading-donut {
        border-bottom-color: rgb(213, 232, 44);
        animation: 1.5s mazyar-donut-spin infinite linear;
    }

    @keyframes mazyar-donut-spin {
        to {
            transform: rotate(360deg);
        }
    }

    table.mazyar-table {
        border-spacing: 0;
        width: auto;
    }

    table.mazyar-table tbody td, table.mazyar-table thead th {
        padding: 0.3em 0.5em;
        vertical-align: middle;
    }

    @media only screen and (max-device-width: 1020px) {
        thead.responsive-show.mazyar-responsive-show {
            display: table-header-group !important;
        }
        tbody tr.responsive-show.mazyar-responsive-show {
          display: table-row !important;
      }
    }

    a.mazyar-in-progress-result {
        animation: mazyar-change-result-background 3s infinite;
    }

    @keyframes mazyar-change-result-background {
        0%   {background-color: inherit;}
        50%  {background-color: lightgreen;}
        100%  {background-color: inherit;}
    }

    span.mazyar-icon-delete {
        display: inline-block;
        cursor: pointer;
        background-image: url("nocache-869/img/player/discard.png");
        width: 21px;
        height: 20px;
    }

    button.mazyar-button {
        cursor: pointer;
    }
    `;

    /* ********************** Constants ******************************** */

    const TRANSFER_INTERVALS = {
        always: {
            value: "0",
            label: "always",
        },
        onceMinute: {
            value: "1",
            label: "once a minute",
        },
        onceHour: {
            value: "2",
            label: "once an hour",
        },
        onceDay: {
            value: "3",
            label: "once a day",
        },
        never: {
            value: "4",
            label: "never",
        },
    };

    /* *********************** Utils ********************************** */

    function generateUuidV4() {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
            const r = (Math.random() * 16) | 0,
                v = c == "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

    function filterHitsIsValid(hits) {
        return typeof hits === "number" && hits >= 0;
    }

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

    /* *********************** DOM Utils ********************************** */

    function getMzButtonColorClass(color) {
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

    function createSuggestionList(items) {
        const datalist = document.createElement("datalist");
        datalist.id = generateUuidV4();
        for (const item of items) {
            const option = document.createElement("option");
            option.value = item.toString();
            datalist.appendChild(option);
        }
        return datalist;
    }

    function createTextInput(title = "input", placeholder = "example", datalistId = "") {
        const div = document.createElement("div");
        div.classList.add("mazyar-flex-container-row");
        div.style.justifyItems = "space-between";
        div.innerHTML = `
            <label style="margin: 0.5rem; font-weight: bold;">${title}: 
            </label><input list="${datalistId}" style="margin: 0.5rem;" type="text" value="" placeholder="${placeholder}">
        `;
        return div;
    }

    function createMenuCheckBox(label, initialValue = true) {
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

    function appendOptionList(parent, options, selected) {
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

    function createMenuDropDown(label, options, initialValue) {
        // options = a object full of 'key: {value, label}'
        // initialValue = one of the options.value

        const div = document.createElement("div");
        const labelElement = document.createElement("label");
        const dropdown = document.createElement("select");

        div.style.alignSelf = "flex-start";
        div.style.margin = "0.3rem 0.7rem";

        labelElement.innerText = label;
        labelElement.style.paddingRight = "0.5rem";

        appendOptionList(dropdown, options, initialValue);

        div.appendChild(labelElement);
        div.appendChild(dropdown);
        return div;
    }

    function createDeleteIcon(title) {
        const icon = document.createElement("span");
        icon.classList.add("mazyar-icon-delete");
        if (title) {
            icon.title = title;
        }
        return icon;
    }

    function createDeleteButtonWithTrashIcon(title = "Delete") {
        const icon = createDeleteIcon();

        const text = document.createElement("span");
        text.innerText = title;

        const button = document.createElement("button");
        button.classList.add("mazyar-flex-container-row", "mazyar-button");
        button.style.margin = "0.6rem 0 0";

        button.appendChild(icon);
        button.appendChild(text);
        return button;
    }

    function filtersViewCreateTableHeader() {
        const tr = document.createElement("tr");

        const name = document.createElement("th");
        name.classList.add("header");
        name.innerText = "Name";
        name.title = "Filter' name";
        name.style.textAlign = "center";
        name.style.textDecoration = "none";
        name.style.width = "11rem";

        const hits = document.createElement("th");
        hits.classList.add("header");
        hits.innerText = "Hits";
        hits.title = "Hits founds for this filter";
        hits.style.textAlign = "center";
        hits.style.textDecoration = "none";

        const tools = document.createElement("th");
        tools.classList.add("header");
        tools.innerHTML = " ";
        tools.style.textAlign = "center";
        tools.style.textDecoration = "none";

        tr.appendChild(tools);
        tr.appendChild(name);
        tr.appendChild(hits);

        const thead = document.createElement("thead");
        thead.appendChild(tr);
        return thead;
    }

    function startSpinning(element) {
        element.classList.add("fa-spin");
    }

    function stopSpinning(element) {
        element.classList.remove("fa-spin");
    }

    function filtersViewCreateTableBody(filters = []) {
        const tbody = document.createElement("tbody");

        for (const filter of filters) {
            const tr = document.createElement("tr");

            const filterName = filter.name.length > 32 ? filter.name.substring(0, 29) + "..." : filter.name;

            const name = document.createElement("td");
            name.innerHTML = `<a target="_blank" href="https://www.managerzone.com/?p=transfer&mzy_filter_name=${filter.name}">${filterName}</a>`;
            name.title = filter.name.length > 32 ? `Filter's full name: ${filter.name}` : "Filter's name";

            const hits = document.createElement("td");
            hits.innerText = filterHitsIsValid(filter.hits) ? filter.hits.toString() : "n/a";
            hits.style.textAlign = "center";

            const del = createDeleteIcon("Delete the filter permanently.");
            del.style.verticalAlign = "bottom";
            del.onclick = () => {
                mazyar.deleteFilter(filter.id);
                tbody.removeChild(tr);
                if (tbody.children.length === 0) {
                    tbody.parentNode.dispatchEvent(new Event("destroy"));
                }
            };

            const refresh = createRefreshIcon("Refresh filter hits.");
            refresh.style.fontSize = "1.1rem";
            refresh.onclick = async () => {
                startSpinning(refresh);
                const newHits = await mazyar.refreshFilterHits(filter.id);
                hits.innerText = filterHitsIsValid(newHits) ? newHits.toString() : "n/a";
                stopSpinning(refresh);
            };

            const tools = document.createElement("td");
            tools.appendChild(del);
            tools.appendChild(refresh);

            tr.appendChild(tools);
            tr.appendChild(name);
            tr.appendChild(hits);
            tbody.appendChild(tr);
        }
        return tbody;
    }

    function filtersViewCreateTable(filters) {
        const table = document.createElement("table");
        const thead = filtersViewCreateTableHeader();
        const tbody = filtersViewCreateTableBody(filters);

        table.classList.add("mazyar-table", "tablesorter", "hitlist", "marker");
        table.style.margin = "0.5rem";

        table.appendChild(thead);
        table.appendChild(tbody);
        return table;
    }

    function createIconFromFontAwesomeClass(iconClass, title = "") {
        const icon = document.createElement("i");
        icon.classList.add("fa", iconClass);
        icon.setAttribute("aria-hidden", "true");
        icon.style.cursor = "pointer";
        if (title) {
            icon.title = title;
        }
        return icon;
    }

    function createCogIcon(title = "") {
        return createIconFromFontAwesomeClass("fa-cog", title);
    }

    function createSearchIcon(title = "") {
        return createIconFromFontAwesomeClass("fa-search", title);
    }

    function createRefreshIcon(title = "") {
        return createIconFromFontAwesomeClass("fa-refresh", title);
    }

    function createToolbar() {
        const toolbar = document.createElement("div");
        const logo = document.createElement("span");
        const menu = createCogIcon();
        const separator = document.createElement("span");
        const transfer = document.createElement("div");
        const transferIcon = createSearchIcon();
        const transferCount = document.createElement("span");

        toolbar.classList.add("mazyar-flex-container");
        toolbar.style.position = "fixed";
        toolbar.style.zIndex = "9998";
        toolbar.style.top = "45%";
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
        toolbar.appendChild(separator);
        toolbar.appendChild(transfer);

        return { toolbar, menu, transfer };
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
        table.classList.add("mazyar-table", "tablesorter", "hitlist", "marker", "hitlist-compact-list-included");

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

            div.classList.add("mazyar-flex-container");

            div.appendChild(table);
            place.parentNode.insertBefore(div, place);
        }
    }

    function applyUxxFilter() {
        const minAge = 16;
        const maxAge = 21;
        let links = "";
     
        for (let i = minAge; i <= maxAge; ++i) {
          if (i !== minAge) {
            links += " ";
          }
          links += '<a href="#">' + i + "</a>";
        }
     
        $(".age-wrapper label").append(" " + links);
     
        let last = null;
        $(".age-wrapper label a").click(function () {
          const current = $(this).text().trim();
     
          if (last === current) {
            $("#age_from").val(current);
            $("#age_from").change();
          }
     
          $("#age_to").val(current);
          $("#age_to").change();
     
          if (parseInt($("#age_from").val()) > parseInt($("#age_to").val())) {
            $("#age_from").val($("#age_to").val());
            $("#age_from").change();
          }
     
          $("#filterSubmit").click();
          last = current;
        });
      }

    function applyHFilter() {
        const hValues = ['H2','H3','H4']
        let links = "";

        hValues.forEach(el => {
            links += '<div><a href="javascript:;">' + el + "</a></div>";
        })

        $("#filters_search").append("<div>" + links + "<div>");
        $("#filters_search a").click(function () {
          const current = $(this).text().trim();
          $( ".playerContainer" ).each(function(i, obj) {
            const idPlayer = $(this).find('.mainContent a').attr('name').substring(1);
              const textPlayer = $(this).find(`#GM_scout_${idPlayer}`).text()
            if(textPlayer.includes(`[${current}`)){
                $( this ).show();
            } else {
                $( this ).hide();
            }
          });
        });
        $('#resetb')[0].addEventListener('click', function () {
            $( ".playerContainer" ).each(function(i, obj) {
                $( this ).show();
            });
            return false;
        });
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
                    const target = team.row.querySelector("button.mazyar-donut.rank");
                    if (target) {
                        target.classList.remove("mazyar-loading-donut");
                        target.classList.add("mazyar-final-donut");
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
                        const target = team.row.querySelector("button.mazyar-donut.rank");
                        target.classList.remove("mazyar-loading-donut");
                        target.classList.add("mazyar-final-donut");
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
        button.classList.add("mazyar-donut", "mazyar-loading-donut", "rank", "fix-width");
        button.title = "Click to see squad summary";
        rank.appendChild(button);
        button.onclick = () => {
            mazyar.displaySquadSummary(url);
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

        table.classList.add("mazyar-table", "tablesorter", "hitlist", "marker", "hitlist-compact-list-included");
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
        div.classList.add("mazyar-flex-container");

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
        if (mazyar.mustDisplayInProgressResults()) {
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
        target.querySelectorAll("td.mazyar-injected span")?.forEach((el) => {
            el.style.display = "none";
        });
        const ageClass = tableGetAgeClass(ageLimit);
        target.querySelectorAll("td.mazyar-injected span." + ageClass)?.forEach((el) => {
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
        teamValue.classList.add("mazyar-injected", "team-value");
        teamValue.title = "Click to see squad summary";
        teamValue.style.textAlign = "center";
        teamValue.style.whiteSpace = "nowrap";
        teamValue.style.padding = "auto 3px";
        teamValue.onclick = () => {
            mazyar.displaySquadSummary(url);
        };

        ageValue.classList.add("mazyar-injected", "age-value");
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

        firstRow.classList.add("responsive-show", "mazyar-responsive-show");
        secondRow.classList.add("responsive-show", "mazyar-responsive-show");

        value.colSpan = "6";
        value.innerText = "loading...";
        value.classList.add("mazyar-injected", "team-value");
        value.title = "Click to see squad summary";
        value.style.textAlign = "center";
        value.style.whiteSpace = "nowrap";
        value.style.padding = "auto 3px";
        value.style.backgroundColor = "aquamarine";
        value.onclick = () => {
            mazyar.displaySquadSummary(url);
        };

        age.colSpan = "2";
        age.classList.add("mazyar-injected", "age-value");
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

        mobileHeader.classList.add("responsive-show", "mazyar-responsive-show");

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
                        resp.context.match.classList.add("mazyar-in-progress-result");
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
                    if (mazyar.mustDisplayTopPlayersInTables()) {
                        tableAddTopPlayersInfo(table);
                    }
                    if (mazyar.mustDisplayInProgressResults()) {
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

    /* *********************** Transfer Agent ********************************** */

    function transferGetInputValue(el) {
        if (el.type == "checkbox") {
            return el.checked ? 1 : 0;
        }
        return el.value;
    }

    function transferGetSearchParams() {
        const inputs = document.getElementById("searchform")?.querySelectorAll("input,select");
        return [...inputs].map((el) => `&${el.name}=${transferGetInputValue(el)}`).join("");
    }

    function transferGetFilterNameFromUrl() {
        const url = new URL(document.URL);
        const params = new URLSearchParams(url.search);
        if (params.has("mzy_filter_name")) {
            return params.get("mzy_filter_name");
        }
        return null;
    }

    function transferLoadFilter(filterParams) {
        const url = new URL(`https://www.managerzone.com/?${filterParams}`);
        const params = new URLSearchParams(url.search);
        for (const param of params) {
            const element = document.getElementById(param[0]);
            if (element) {
                if (element.type === "text") {
                    element.value = param[1];
                    element.dispatchEvent(new Event("blur"));
                } else if (element.type === "checkbox") {
                    element.checked = param[1] === "1";
                } else if (element.tagName === "SELECT") {
                    element.value = param[1];
                }
            }
        }
    }

    function transferInjectButtons(form) {
        const target = form.querySelector("div.buttons-wrapper.clearfix");
        if (target) {
            const filterButton = createMzStyledButton("MZY Filters", "red", "floatLeft");
            filterButton.style.margin = "0";
            filterButton.onclick = () => {
                document.getElementById("mazyar-transfer-filter-hits")?.click();
            };

            const saveButton = createMzStyledButton("MZY Save Filter", "blue", "floatLeft");
            saveButton.style.margin = "0";
            saveButton.onclick = () => {
                const params = transferGetSearchParams();
                mazyar.displayFilterSaveMenu(params);
            };

            target.appendChild(filterButton);
            target.appendChild(saveButton);
        }
    }

    function transferInject() {
        const form = document.getElementById("searchform");
        if (form) {
            const filterName = transferGetFilterNameFromUrl();
            if (filterName) {
                const filterParams = mazyar.getFilterParams(filterName);
                if (filterParams) {
                    setTimeout(() => {
                        transferLoadFilter(filterParams);
                        document.getElementById("searchb")?.click();
                    }, 5000);
                }
            }
            transferInjectButtons(form);
        }
    }

    /* *********************** Class ********************************** */

    class Mazyar {
        #modal = null; // dom element
        #content = null; // dom element
        #settings = {
            in_progress_results: true,
            top_players_in_tables: true,
            transfer: false,
            transfer_interval: TRANSFER_INTERVALS.always.value,
        };
        #filters = { soccer: [], hockey: [] }; // each key is like [{id, name, params}]
        #cache = {
            filters_last_check: 0,
            filters_last_hits: 0,
            // also a bunch of info for each filter like latest hit and ...
            // we can access them by filter id
        };
        #sport = "soccer";

        constructor() {
            this.#fetchSettings();
            this.#fetchFilters();
            this.#fetchCache();
            this.#sport = getSportType();

            this.#addToolbar();
            this.#createModal();
        }

        // -------------------------------- Settings -------------------------------------

        #fetchSettings() {
            this.#settings.in_progress_results = GM_getValue("display_in_progress_results", true);
            this.#settings.top_players_in_tables = GM_getValue("display_top_players_in_tables", true);
            this.#settings.transfer = GM_getValue("enable_transfer_filters", false);
            this.#settings.transfer_interval = GM_getValue("transfer_filters_interval", TRANSFER_INTERVALS.always.value);
        }

        #saveSettings() {
            GM_setValue("display_in_progress_results", this.#settings.in_progress_results);
            GM_setValue("display_top_players_in_tables", this.#settings.top_players_in_tables);
            GM_setValue("enable_transfer_filters", this.#settings.transfer);
            GM_setValue("transfer_filters_interval", this.#settings.transfer_interval);
        }

        updateSettings(settings) {
            this.#settings = settings;
            this.#saveSettings();
            if (this.isTransferFiltersEnabled()) {
                this.#checkAllFilters(true);
            } else {
                this.#setFilterHitsInToolbar(0);
            }
        }

        mustDisplayInProgressResults() {
            return this.#settings.in_progress_results;
        }

        mustDisplayTopPlayersInTables() {
            return this.#settings.top_players_in_tables;
        }

        isTransferFiltersEnabled() {
            return this.#settings.transfer;
        }

        #getTransferFiltersInterval() {
            return this.#settings.transfer_interval;
        }

        // -------------------------------- Cache -------------------------------------

        #fetchCache() {
            this.#cache = GM_getValue("cache", { filters_last_check: 0, filters_last_hits: 0 });
            if (typeof this.#cache.filters_last_check !== "number") {
                this.#cache.filters_last_check = 0;
            }
            if (typeof this.#cache.filters_last_check !== "number") {
                this.#cache.filters_last_hits = 0;
            }
            // console.log({ cache: this.#cache });
        }

        #saveCache() {
            GM_setValue("cache", this.#cache);
        }

        #updateCache(key, value) {
            this.#cache[key] = value;
            this.#saveCache();
        }

        #removeFromCache(key) {
            delete this.#cache[key];
            this.#saveCache();
        }

        #deleteFiltersFromCache() {
            for (const filter of this.#getCurrentFilters()) {
                delete this.#cache[filter.id];
            }
            this.#saveCache();
        }

        #getLastFilterCheckFromCache() {
            return this.#cache.filters_last_check;
        }

        #setLastFilterCheckInCache(hits = 0, id = "") {
            if (id) {
                if (this.#cache[id]) {
                    this.#cache[id].hits = hits;
                } else {
                    this.#cache[id] = {
                        hits: hits,
                    };
                }
            } else {
                // if no id is passed, it means total hits
                this.#updateCache("filters_last_check", Date.now());
                this.#updateCache("filters_last_hits", hits);
            }
        }

        #getLastFilterHitsFromCache(id = "") {
            if (id) {
                // return hist of this filter only
                return this.#cache[id]?.hits;
            }
            // return total hits
            return this.#cache.filters_last_hits;
        }

        // -------------------------------- Filters -------------------------------------

        #fetchFilters() {
            this.#filters = GM_getValue("transfer_filters", { soccer: [], hockey: [] });
        }

        #saveFilters() {
            GM_setValue("transfer_filters", {
                soccer: this.#filters.soccer.map(({ id, name, params }) => ({ id, name, params })),
                hockey: this.#filters.hockey.map(({ id, name, params }) => ({ id, name, params })),
            });
        }

        #getCurrentFilters() {
            return this.#filters[this.#sport];
        }

        deleteFilter(id = "") {
            const filterIndex = this.#getCurrentFilters().findIndex((f) => f.id === id);
            if (filterIndex > -1) {
                this.#removeFromCache(id);
                this.#getCurrentFilters().splice(filterIndex, 1);
                this.#checkAllFilters(true);
                this.#saveFilters();
            } else {
                console.log("filter with id " + id + " is not found");
            }
        }

        deleteAllFilters() {
            this.#deleteFiltersFromCache();
            this.#getCurrentFilters().length = 0;
            this.#checkAllFilters(true);
            this.#saveFilters();
        }

        getFilterParams(name = "") {
            return this.#getCurrentFilters().find((f) => f.name === name)?.params;
        }

        async updateFilterDetails(name, params) {
            const filters = this.#getCurrentFilters();
            let filter = filters.find((f) => f.name === name);
            if (filter) {
                filter.params = params;
            } else {
                // create a new filter if name does not exist
                filter = filters.push({
                    name,
                    params,
                    id: generateUuidV4(),
                });
            }
            this.#saveFilters();
            await this.#updateFilterHits(filter);
            this.#checkAllFilters(true);
        }

        itsTimeToCheckFilters() {
            const interval = this.#getTransferFiltersInterval();
            if (interval === TRANSFER_INTERVALS.never.value) {
                return false;
            } else if (interval === TRANSFER_INTERVALS.onceDay.value) {
                return Date.now() - this.#getLastFilterCheckFromCache() > 24 * 60 * 60 * 1000;
            } else if (interval === TRANSFER_INTERVALS.onceHour.value) {
                return Date.now() - this.#getLastFilterCheckFromCache() > 1 * 60 * 60 * 1000;
            } else if (interval === TRANSFER_INTERVALS.onceMinute.value) {
                return Date.now() - this.#getLastFilterCheckFromCache() > 1 * 60 * 1000;
            }
            // 'always' or any invalid value means always
            return true;
        }

        async #getFilterHits(params = "") {
            const url = `https://www.managerzone.com/ajax.php?p=transfer&sub=transfer-search&sport=${this.#sport}${params}`;
            const response = await fetch(url).catch((error) => {
                console.log(error);
            });
            if (response) {
                const data = await response.json();
                return Number(data?.totalHits);
            }
            return -1;
        }

        async #updateFilterHits(filter) {
            const hits = await this.#getFilterHits(filter.params);
            if (hits >= 0) {
                this.#setLastFilterCheckInCache(hits, filter.id);
            }
        }

        async refreshFilterHits(id = "") {
            const filter = this.#getCurrentFilters().find((filter) => filter.id === id);
            if (filter) {
                const hits = await this.#getFilterHits(filter.params);
                if (hits >= 0) {
                    this.#setLastFilterCheckInCache(hits, filter.id);
                    this.#checkAllFilters(false);
                    return hits;
                }
            }
            return -1;
        }

        // -------------------------------- Display -------------------------------------

        #createModal() {
            this.#modal = document.createElement("div");
            this.#modal.id = "mazyar-modal";
            this.#modal.classList.add("mazyar-flex-container");

            this.#content = document.createElement("div");
            this.#content.id = "mazyar-modal-content";
            this.#content.classList.add("mazyar-flex-container");

            this.#modal.appendChild(this.#content);
            this.hideModal();
            document.body?.appendChild(this.#modal);
        }

        #addToolbar() {
            const that = this;
            const { toolbar, menu, transfer } = createToolbar();
            menu.onclick = () => {
                that.displaySettingsMenu();
            };
            transfer.onclick = () => {
                that.displayTransferFilters();
            };
            document.body?.appendChild(toolbar);
        }

        #displayModal() {
            this.#modal.style.display = "flex";
        }

        #clearModalContent() {
            this.#content.innerText = "";
        }

        #replaceModalContent(elements = []) {
            this.#clearModalContent();
            for (const element of elements) {
                if (element) {
                    this.#content.appendChild(element);
                }
            }
            this.#displayModal();
        }

        #displayLoading(title = "MZY") {
            const header = createMzStyledTitle(title);

            const loading = document.createElement("p");
            loading.innerText = "Loading...";
            loading.style.padding = "1rem";

            this.#replaceModalContent([header, loading]);
        }

        displaySettingsMenu() {
            const that = this; // used in onclick event listener

            const div = document.createElement("div");
            const title = createMzStyledTitle("MZY Settings");
            const inProgress = createMenuCheckBox("Display In Progress Results", this.#settings.in_progress_results);
            const tableInjection = createMenuCheckBox("Display Teams' Top Players in Tables", this.#settings.top_players_in_tables);
            const transfer = createMenuCheckBox("Enable Transfer Filters", this.#settings.transfer);
            const transferInterval = createMenuDropDown("Check Interval", TRANSFER_INTERVALS, this.#settings.transfer_interval);
            const buttons = document.createElement("div");
            const cancel = createMzStyledButton("Cancel", "red");
            const save = createMzStyledButton("Save", "green");

            div.classList.add("mazyar-flex-container");

            transferInterval.style.paddingLeft = "2rem";
            if (!this.#settings.transfer) {
                transferInterval.style.display = "none";
            }

            transfer.oninput = () => {
                if (transfer.querySelector("input[type='checkbox'").checked) {
                    transferInterval.style.display = "unset";
                } else {
                    transferInterval.style.display = "none";
                    transferInterval.querySelector("select").value = TRANSFER_INTERVALS.always.value;
                }
            };

            buttons.classList.add("mazyar-flex-container-row");

            cancel.onclick = () => {
                that.hideModal();
            };

            save.onclick = () => {
                that.updateSettings({
                    in_progress_results: inProgress.querySelector("input[type=checkbox]").checked,
                    top_players_in_tables: tableInjection.querySelector("input[type=checkbox]").checked,
                    transfer: transfer.querySelector("input[type=checkbox]").checked,
                    transfer_interval: transferInterval.querySelector("select").value,
                });
                that.hideModal();
            };

            div.appendChild(title);
            div.appendChild(inProgress);
            div.appendChild(tableInjection);
            div.appendChild(transfer);
            div.appendChild(transferInterval);

            buttons.appendChild(cancel);
            buttons.appendChild(save);
            div.appendChild(buttons);

            this.#replaceModalContent([div]);
        }

        displayFilterSaveMenu(params) {
            const filters = this.#getCurrentFilters();
            const that = this; // used in onclick event listener

            const title = createMzStyledTitle("MZY Transfer Filter");
            const div = document.createElement("div");
            const datalist = createSuggestionList(filters.map((f) => f.name));
            const filterName = createTextInput("Filter Name", "U21 K-10 ST-10", datalist.id);
            const validation = document.createElement("div");
            const buttons = document.createElement("div");
            const cancel = createMzStyledButton("Cancel", "red");
            const save = createMzStyledButton("Save", "green");

            div.classList.add("mazyar-flex-container");

            validation.innerText = "Error: Name is empty.";
            validation.style.color = "red";
            validation.style.display = "none";
            validation.style.alignSelf = "flex-start";
            validation.style.margin = "auto 0.5rem";

            filterName.oninput = () => {
                const name = filterName.querySelector("input[type='text']").value;
                if (name) {
                    validation.style.display = "none";
                    save.classList.remove(getMzButtonColorClass("grey"));
                } else {
                    validation.style.display = "unset";
                    save.classList.add(getMzButtonColorClass("grey"));
                }
            };

            buttons.classList.add("mazyar-flex-container-row");

            cancel.onclick = () => {
                that.hideModal();
            };

            save.onclick = () => {
                // save then close
                const name = filterName.querySelector("input[type=text]").value;
                if (name) {
                    that.updateFilterDetails(name, params);
                    that.hideModal();
                } else {
                    validation.style.display = "unset";
                    save.classList.add(getMzButtonColorClass("grey"));
                }
            };

            buttons.appendChild(cancel);
            buttons.appendChild(save);

            div.appendChild(title);
            div.appendChild(filterName);
            div.appendChild(datalist);
            div.appendChild(validation);
            div.appendChild(buttons);

            this.#replaceModalContent([div]);
        }

        #setFilterHitsInToolbar(total) {
            const hits = document.getElementById("mazyar-transfer-filter-hits");
            if (hits) {
                hits.innerText = total > 100 ? "+100" : total.toString();
                hits.style.color = total > 0 ? "cyan" : "white";
            }
        }

        async #checkAllFilters(forced = false) {
            const filters = this.#getCurrentFilters();
            for (const filter of filters) {
                const hitsInCache = this.#getLastFilterHitsFromCache(filter.id);
                if (!filterHitsIsValid(hitsInCache) || forced) {
                    await this.#updateFilterHits(filter);
                }
            }
            const total = filters.map((filter) => this.#getLastFilterHitsFromCache(filter.id)).reduce((a, b) => a + b, 0);
            this.#setFilterHitsInToolbar(total);
            this.#setLastFilterCheckInCache(total);
        }

        async setInitialFiltersHitInToolbar() {
            if (mazyar.itsTimeToCheckFilters()) {
                this.#checkAllFilters(true);
            } else {
                console.log("do not check filters");
                this.#setFilterHitsInToolbar(this.#getLastFilterHitsFromCache());
            }
        }

        displayTransferFilters() {
            const that = this; // used in onclick event listener

            const div = document.createElement("div");
            div.classList.add("mazyar-flex-container");

            const title = createMzStyledTitle("MZY Transfer Filters");

            const filtersView = document.createElement("div");
            filtersView.classList.add("mazyar-flex-container");

            const noFilterView = document.createElement("span");
            noFilterView.innerText = "There is no filter to display";
            noFilterView.style.display = "none";
            noFilterView.style.margin = "1rem";

            const filters = this.#getCurrentFilters();
            if (filters.length > 0) {
                const deleteAll = createDeleteButtonWithTrashIcon("Delete all filters");
                deleteAll.onclick = () => {
                    that.deleteAllFilters();
                    filtersView.style.display = "none";
                    noFilterView.style.display = "unset";
                };

                const filtersData = filters.map((filter) => ({ ...filter, hits: this.#getLastFilterHitsFromCache(filter.id) }));
                const table = filtersViewCreateTable(filtersData);
                table.addEventListener("destroy", () => {
                    // remove delete all button if no filter is left
                    filtersView.style.display = "none";
                    noFilterView.style.display = "unset";
                });

                filtersView.appendChild(deleteAll);
                filtersView.appendChild(table);
            } else {
                noFilterView.style.display = "unset";
            }

            const close = createMzStyledButton("Close", "green");
            close.onclick = () => {
                that.hideModal();
            };

            div.appendChild(title);
            div.appendChild(filtersView);
            div.appendChild(noFilterView);
            div.appendChild(close);

            this.#replaceModalContent([div]);
        }

        async displaySquadSummary(url) {
            this.#displayLoading("MZY Squad Summary");
            await fetch(url)
                .then((resp) => resp.text())
                .then((content) => {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(content, "text/html");
                    const sport = getSportType(doc);
                    const currency = getCurrency(doc);
                    const players = getPlayers(doc, currency);
                    const summary = squadSummaryGetInfo(players, sport);
                    const table = squadSummaryCreateInfoTable(summary, currency, sport);
                    table.style.margin = "2px 5px";
                    table.style.padding = "0";

                    const header = createMzStyledTitle("MZY Squad Summary");
                    const button = createMzStyledButton("Close", "red");
                    button.onclick = () => {
                        mazyar.hideModal();
                    };
                    this.#replaceModalContent([header, table, button]);
                })
                .catch((error) => {
                    console.log(error);
                });
        }

        hideModal() {
            this.#modal.style.display = "none";
            this.#clearModalContent();
        }
    }

    /* *********************** Inject ********************************** */

    async function inject() {
        GM_addStyle(styles);

        mazyar = new Mazyar();
        if (mazyar.isTransferFiltersEnabled()) {
            mazyar.setInitialFiltersHitInToolbar();
        }

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
                applyUxxFilter()
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
        } else if (uri.search("/?p=transfer") > -1) {
            if (mazyar.isTransferFiltersEnabled()) {
                transferInject();
                applyHFilter()
            }
        }
    }

    if (document.readyState === "loading") {
        // Loading hasn't finished yet
        document.addEventListener("DOMContentLoaded", () => {
            inject();
        });
    } else {
        // `DOMContentLoaded` has already fired
        inject();
    }
})();
