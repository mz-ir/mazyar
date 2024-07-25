// ==UserScript==
// @name         Mazyar
// @namespace    http://tampermonkey.net/
// @version      2.26
// @description  Swiss Army knife for managerzone.com
// @copyright    z7z from managerzone.com
// @author       z7z from managerzone.com
// @license      MIT
// @run-at       document-idle
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      self
// @require      https://unpkg.com/dexie@4.0.8/dist/dexie.min.js
// @match        https://www.managerzone.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=managerzone.com
// @supportURL   https://github.com/mz-ir/mazyar
// ==/UserScript==

(async function () {
    "use strict";

    /* *********************** Changelogs ********************************** */

    const currentVersion = GM_info.script.version;
    const changelogs = {
        "2.26": [
            "<b>[new]</b> Transfer: it adds 'Days at this club' to player profiles. It is disabled by default. You can enable it from MZY Settings.",
            "<b>[improve]</b> Player Profile: it stores player profiles in local database to reduce number of requests.",
            "<b>[improve]</b> Local Database: it deletes outdated local data to reduce the size of database.",
            "<b>[improve]</b> Transfer: it uses less ajax requests now.",
        ],
        "2.25": ["<b>[new]</b> Training Report: click on player's camp package icon to open its camp report."],
        "2.24": ["<b>[fix]</b> Player Profile: fix Days at this club for injured or suspended players."],
        "2.23": [
            "<b>[new]</b> Squad Profile: add 'days at this club' to each player profile.",
            "<b>[fix]</b> Player Comment: show comment icon for players when selected tab changes.",
            "<b>[fix]</b> Player Comment: change color of comment icon to lightskyblue when player has no comment. (previous color was the same as loyal players background)",
        ],
        "2.22": ["<b>[new]</b> Hire Coaches: adds salary range of each coach. Thanks to <a href=\"https://www.managerzone.com/?p=profile&uid=8577497\">@douglaskampl</a> for suggesting the idea and sharing his implementation."],
        "2.21": ["<b>[new]</b> Club Page: adds total trophy count."],
        "2.20": ["<b>[new]</b> Player Profile: add 'Days at this club' counter."],
        "2.19": ["<b>[new]</b> Squad Summary: it marks players whose skills are shared. click on share icon to see the player in place.",
            "<b>[new]</b> Squad Summary: it marks players that are in transfer market. click on transfer icon to see the player in market."],
        "2.18": ["<b>[new]</b> show changelog after script update.",
            "<b>[improve]</b> change icon style of player's comment."],
        "2.17": ["<b>[fix]</b> fixed total skill balls"],
    }

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
        max-height: 100%;
    }

    .mazyar-flex-container {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        flex-wrap: wrap;
        max-height: 100%;
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

    div.mazyar-transfer-control-area {
        width: 50%;
    }

    .mazyar-dim-50 {
        opacity: 50%;
    }

    .mazyar-dim-60 {
        opacity: 60%;
    }

    .mazyar-hide {
        display: none;
    }

    .mazyar-scout-h {
        font-weight: bold;
    }

    .mazyar-scout-1 {
        color: red;
    }

    .mazyar-scout-2 {
        color: darkgoldenrod;
    }

    .mazyar-scout-3 {
        color: blue;
    }

    .mazyar-scout-4 {
        color: fuchsia;
    }

    .mazyar-player-comment-icon-inactive {
        position: relative;
        top: -0.2rem;
        margin-left: 0.3rem;
        font-size: 1.4rem;
        color: lightskyblue;
    }

    .mazyar-player-comment-icon-active {
        position: relative;
        top: -0.2rem;
        margin-left: 0.3rem;
        font-size: 1.4rem;
        color: blue;
    }

    .mazyar-player-comment-textarea {
        margin: 0.5rem;
        min-width: 220px;
        min-height: 100px;
    }

    .mazyar-days-at-this-club {
        margin: 5px;
        padding: 3px;
        background-color: azure;
        border-radius: 5px;
        border: 1px solid black;
        text-align: center;
    }

    .mazyar-days-at-this-club-entire {
        margin: 5px;
        padding: 3px;
        background-color: greenyellow;
        border-radius: 5px;
        border: 1px solid black;
        text-align: center;
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

    function parseMzDate(dateString) {
        const [day, month, year] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day);
    }

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

    function getClubCurrency(doc) {
        const players = doc.getElementById("playerAltViewTable")?.querySelectorAll("tbody tr");
        if (players && players.length > 0) {
            const parts = players[0].querySelector("td:nth-child(3)")?.innerText.split(" ");
            return parts[parts.length - 1].trim();
        }
        return "";
    }

    function getNationalCurrency(doc) {
        // works for both domestic and foreign countries
        const playerNode = doc.getElementById("thePlayers_0")?.querySelector("table tbody tr:nth-child(6)");
        if (playerNode) {
            const parts = playerNode.innerText.split(" ");
            return parts[parts.length - 1].trim();
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


    function getPlayerIdFromContainer(player) {
        return player?.querySelector("h2 span.player_id_span")?.innerText;
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

    function formatFileSize(b) {
        const s = 1024;
        let u = 0;
        while (b >= s || -b >= s) {
            b /= s;
            u++;
        }
        return (u ? b.toFixed(1) + " " : b) + " KMGTPEZY"[u] + "B";
    }

    function getClubPlayers(doc, currency) {
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
        for (const playerNode of playerNodes) {
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

    async function getNationalPlayersAndCurrency(tid, sport) {
        const url = `https://www.managerzone.com/ajax.php?p=nationalTeams&sub=players&ntid=${tid}&sport=${sport}`;
        let players = [];
        let currency = '';
        await fetch(url)
            .then((resp) => resp.text())
            .then((content) => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(content, "text/html");
                currency = getNationalCurrency(doc);
                players = getNationalPlayers(doc, currency);
            })
            .catch((error) => {
                console.warn(error);
            });
        return { players, currency };
    }

    async function getClubPlayersAndCurrency(tid) {
        const url = getSquadSummaryLink(tid);
        let players = [];
        let currency = '';
        await fetch(url)
            .then((resp) => resp.text())
            .then((content) => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(content, "text/html");
                currency = getClubCurrency(doc);
                players = getClubPlayers(doc, currency);
            })
            .catch((error) => {
                console.warn(error);
            });
        return { players, currency };
    }

    async function getPlayersAndCurrency(tid, sport) {
        const url = getSquadSummaryLink(tid);
        const isNational = await fetch(url, { method: "HEAD" })
            .then((resp) => (resp.url.search("p=national_teams") > -1));
        return isNational ? await getNationalPlayersAndCurrency(tid, sport) : await getClubPlayersAndCurrency(tid);
    }

    function getClubTopPlyers(doc) {
        const currency = getClubCurrency(doc);
        const players = getClubPlayers(doc, currency);
        const sport = getSportType(doc);
        const count = sport === "soccer" ? 11 : 21;
        return players ? filterPlayers(players, count).values : 0;
    }

    async function fetchPlayersProfileSummary(teamId) {
        const url = `https://www.managerzone.com/?p=players&tid=${teamId}`;
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

    function squadGetPlayersInfo(players, sport = "soccer") {
        if (!players) {
            return [];
        }
        const rows = [];
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
        return rows;
    }

    async function fetchPlayerProfileDocument(playerId) {
        const url = `https://www.managerzone.com/?p=players&pid=${playerId}`;
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

    function createMenuCheckBox(
        label,
        initialValue = true,
        style = {
            alignSelf: "flex-start",
            margin: "0.3rem 0.7rem",
        }
    ) {
        const id = generateUuidV4();

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

            const total = document.createElement("td");
            const scout = document.createElement("td");
            total.style.textAlign = "center";
            scout.style.textAlign = "center";

            mazyar.getFilterHitsFromIndexedDb(filter.id).then(({ totalHits, scoutHits }) => {
                total.innerText = filterHitsIsValid(totalHits) ? totalHits.toString() : "n/a";
                if (filter.scout) {
                    scout.innerHTML = `<a style="cursor: pointer;">${filterHitsIsValid(scoutHits) ? scoutHits.toString() : "n/a"}</a>`;
                } else {
                    scout.innerHTML = "X";
                }
            });

            if (filter.scout) {
                scout.onclick = () => {
                    const info = { name: filter.name, scout: filter.scout, count: scout.innerText };
                    mazyar.displayFilterResults(filter.id, info);
                };
            }

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
                total.replaceChildren(createLoadingIcon());
                scout.replaceChildren(createLoadingIcon());
                const { totalHits, scoutHits } = await mazyar.refreshFilterHits(filter.id);
                total.innerText = filterHitsIsValid(totalHits) ? totalHits.toString() : "n/a";
                if (filter.scout) {
                    scout.innerHTML = `<a style="cursor: pointer;">${filterHitsIsValid(scoutHits) ? scoutHits.toString() : "n/a"}</a>`;
                } else {
                    scout.innerHTML = "X";
                }
                stopSpinning(refresh);
            };

            const tools = document.createElement("td");
            tools.appendChild(del);
            tools.appendChild(refresh);

            tr.appendChild(tools);
            tr.appendChild(name);
            tr.appendChild(total);
            tr.appendChild(scout);
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

    function createIconFromFontAwesomeClass(classes = [], title = "") {
        const icon = document.createElement("i");
        icon.classList.add(...classes);
        icon.setAttribute("aria-hidden", "true");
        icon.style.cursor = "pointer";
        if (title) {
            icon.title = title;
        }
        return icon;
    }

    function createSharedIcon(title) {
        return createIconFromFontAwesomeClass(["fa", "fa-share-alt"], title);
    }

    function createMarketIcon(title) {
        return createIconFromFontAwesomeClass(["fa", "fa-legal"], title);
    }

    function createCogIcon(title = "") {
        return createIconFromFontAwesomeClass(["fa", "fa-cog"], title);
    }

    function createCommentIcon(title = "") {
        return createIconFromFontAwesomeClass(["fa-solid", "fa-comment"], title);
    }

    function createSearchIcon(title = "") {
        return createIconFromFontAwesomeClass(["fa", "fa-search"], title);
    }

    function createRefreshIcon(title = "") {
        return createIconFromFontAwesomeClass(["fa", "fa-refresh"], title);
    }

    function createLoadingIcon(title = "") {
        const icon = createIconFromFontAwesomeClass(["fa", "fa-spinner", "fa-spin"], title);
        icon.style.cursor = "unset";
        return icon;
    }

    function createLoadingIcon2(title = "") {
        const icon = createIconFromFontAwesomeClass(["fa-solid", "fa-loader", "fa-pulse", "fa-fw"], title);
        icon.style.cursor = "unset";
        return icon;
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

    /* *********************** Squad - Icons (Shared Skills & Transfer) ********************************** */

    function squadAddIconsHeaderToSummaryTable(table) {
        const th = document.createElement("th");
        th.style.width = "0px";
        const target = table.querySelector("thead tr th:nth-child(2)");
        target.parentNode.insertBefore(th, target);
    }

    function squadAddIconsBodyToSummaryTable(player, info) {
        const td = document.createElement("td");
        if (info.shared) {
            const icon = createSharedIcon("Click to see player profile.");
            icon.style.fontSize = "13px";
            icon.classList.add("special_player");
            icon.addEventListener("click", () => {
                mazyar.showPlayerInModal(info.detail);
            })
            td.appendChild(icon);
        }
        if (info.market) {
            const icon = createMarketIcon("Player is in Transfer Market.");
            icon.style.fontSize = "13px";
            icon.classList.add("special_player");
            const link = document.createElement("a");
            link.href = info.marketLink;
            link.target = "_blank";
            link.appendChild(icon);
            td.appendChild(link);
        }
        const target = player.querySelector("td:nth-child(2)");
        target.parentNode.insertBefore(td, target);
    }

    async function squadInjectIconsToSummaryTable(table) {
        const players = table?.querySelectorAll("tbody tr");
        const ownView = players?.[0]?.children?.length > 6;
        if (ownView) {
            return;
        }
        const text = document.createElement("div");
        text.innerHTML = `<b>MZY:</b> fetching players' info ...`;
        table.parentNode.insertBefore(text, table);

        const teamId = extractTeamId(document.baseURI);
        const playersInfo = await fetchPlayersProfileSummary(teamId);
        if (!playersInfo) {
            text.innerHTML = `<b>MZY:</b> fetching players' info ...<span style="color: red;"> failed</span>.`;
            return;
        }
        text.innerHTML = `<b>MZY:</b> fetching players' info ...<span style="color: green;"> done</span>.`;
        squadAddIconsHeaderToSummaryTable(table);
        for (const player of players) {
            const name = player.querySelector("a");
            const playerId = extractPlayerID(name?.href);
            squadAddIconsBodyToSummaryTable(player, playersInfo[playerId]);
        }
    }

    /* *********************** Squad - Residency ********************************** */

    function squadExtractResidencyDays(doc = document) {
        if (!doc) {
            return 0;
        }
        const transfers = doc?.querySelector("div.baz > div > div.win_back > table.hitlist > tbody");
        if (transfers?.children.length > 1) {
            const arrived = transfers.lastChild.querySelector("td")?.innerText;
            return Math.floor((new Date() - parseMzDate(arrived)) / 86_400_000);
        }
        return -1;
    }

    function squadAddDaysAtThisClubToPlayerProfile() {
        const days = squadExtractResidencyDays(document);
        const daysDiv = document.createElement("div");
        if (days >= 0) {
            const text = days === 0 ? 'N/A' : `≤ ${days}`;
            daysDiv.innerHTML = `Days at this club: <strong>${text}</strong>`;
            daysDiv.classList.add("mazyar-days-at-this-club");
        } else if (mazyar.isDaysAtThisClubEnabledForOneClubPlayers()) {
            const text = 'Entire Career';
            daysDiv.innerHTML = `Days at this club: <strong>${text}</strong>`;
            daysDiv.classList.add("mazyar-days-at-this-club-entire");
        }
        const profile = document.querySelector("div.playerContainer");
        profile?.appendChild(daysDiv);
    }

    /* *********************** Squad - Total Balls ********************************** */

    function squadSortPlayersByTotalSkillBalls(th) {
        const table = document.getElementById("playerAltViewTable");
        const players = table?.querySelectorAll("tbody tr");
        if (table.ascending) {
            table.ascending = false;
            const icon = th.querySelector("i");
            icon.classList.value = '';
            icon.classList.add("fa-solid", "fa-sort-down");
            icon.style.color = "#000";
            const rows = [...players].sort((a, b) => a.skillBalls - b.skillBalls);
            table.querySelector("tbody").replaceChildren(...rows);

        } else {
            table.ascending = true;
            const icon = th.querySelector("i");
            icon.classList.value = '';
            icon.classList.add("fa-solid", "fa-sort-up");
            icon.style.color = "#000";
            const rows = [...players].sort((a, b) => b.skillBalls - a.skillBalls);
            table.querySelector("tbody").replaceChildren(...rows);
        }
    }

    function squadAddTotalSkillBallsHeaderToSummaryTable(table) {
        const th = document.createElement("th");
        th.title = "Total Skill Balls";
        th.innerHTML = `<i aria-hidden="true" style="display: inline; font-size: 11px; color: #555;" class="fa-solid fa-sort"></i><span style="font-size: 11px;">T</span>`;
        th.style.textDecoration = "none";
        th.style.textAlign = "right";
        const target = table.querySelector("thead tr th:last-child");
        target.parentNode.insertBefore(th, target);

        th.addEventListener("click", () => {
            squadSortPlayersByTotalSkillBalls(th);
        });
    }

    function squadAddPlayerTotalSkillBallsToSummaryTable(player, sport) {
        let sum = 0;
        const start = sport === "soccer" ? 6 : 7;
        const end = 17;
        for (const skill of [...player.children].slice(start, end)) {
            sum += Number(skill.innerText);
        }
        const td = document.createElement("td");
        td.innerText = sum.toString();
        td.style.fontWeight = `${Math.ceil(900 * sum / 110)}`
        td.style.textAlign = "right";
        const target = player.querySelector("td:last-child");
        target.parentNode.insertBefore(td, target);
        player.skillBalls = sum;
    }

    function squadAddTotalSkillBallsToSummaryTable(table) {
        const sport = getSportType();
        const players = table?.querySelectorAll("tbody tr");
        if (players?.[0]?.children?.length > 6) {
            squadAddTotalSkillBallsHeaderToSummaryTable(table);
            for (const player of players) {
                squadAddPlayerTotalSkillBallsToSummaryTable(player, sport);
            }
        }
    }

    /* *********************** Squad - Top Players ********************************** */

    function squadCreateCompactElement(title, value) {
        const dd = document.createElement("dd");
        dd.innerHTML = `<span class="listHeadColor">${title}</span><span class="clippable">${value}</span>`;
        return dd;
    }

    function squadSummaryCreateCompactRow(row, currency = "USD", sport = "soccer") {
        const dl = document.createElement("dl");
        dl.classList.add("hitlist-compact-list", "columns");

        dl.appendChild(squadCreateCompactElement("Count", row.count));
        dl.appendChild(squadCreateCompactElement("Total", `${formatBigNumber(row.all)} ${currency}`));
        if (sport == "soccer") {
            dl.appendChild(squadCreateCompactElement("Top 16", `${formatBigNumber(row.top16)} ${currency}`));
            dl.appendChild(squadCreateCompactElement("Top 11", `${formatBigNumber(row.top11)} ${currency}`));
        } else {
            dl.appendChild(squadCreateCompactElement("Top 21", `${formatBigNumber(row.top21)} ${currency}`));
        }
        return dl;
    }

    function squadCreateTopPlayersTable(rows, currency = "USD", sport = "soccer") {
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

    function squadInjectTopPlayersTable(table) {
        const sport = getSportType(document);
        const currency = getClubCurrency(document);
        const players = getClubPlayers(document, currency);
        const summary = squadGetPlayersInfo(players, sport);
        const topPlayers = squadCreateTopPlayersTable(summary, currency, sport);
        topPlayers.style.marginBottom = "10px";

        const div = document.createElement("div");
        div.classList.add("mazyar-flex-container");
        div.appendChild(topPlayers);

        table.parentNode.insertBefore(div, table);
    }

    function squadInjectInformation(table) {
        squadAddTotalSkillBallsToSummaryTable(table);
        squadInjectIconsToSummaryTable(table);
        squadInjectTopPlayersTable(table);
    }

    function squadInjectInformationToSummary() {
        const target = document.getElementById('squad_summary');
        if (target) {
            if (target.style.display !== 'none') {
                // visiting squad summary directly
                const table = document.querySelector("table#playerAltViewTable");
                if (table && !table.injecting) {
                    table.injecting = true;
                    squadInjectInformation(table);
                }
            }

            // add observer if user changes from other tabs to squad summary tab
            const callback = () => {
                const table = document.querySelector("table#playerAltViewTable");
                if (table && !table.injecting) {
                    table.injecting = true;
                    squadInjectInformation(table);
                }
            };
            const observer = new MutationObserver(callback);
            const config = { childList: true, subtree: true };
            observer.observe(target, config);
        }
    }

    function squadInjectInformationToProfiles() {
        if (document.baseURI.search("/?players&pid=") > -1) {
            squadAddDaysAtThisClubToPlayerProfile();
            mazyar.addPlayerComment();
        } else {
            const target = document.getElementById('squad_profiles');
            if (target) {
                if (target.style.display !== 'none') {
                    // visiting profiles directly
                    const container = document.getElementById('players_container');
                    if (container && !container.injecting) {
                        container.injecting = true;
                        mazyar.squadAddDaysAtThisClubToAllPlayers(container);
                        mazyar.addPlayerComment();
                    }
                }

                // add observer if user changes from other tabs to squad profiles tab
                const callback = () => {
                    const container = document.getElementById('players_container');
                    if (container && !container.injecting) {
                        container.injecting = true;
                        mazyar.squadAddDaysAtThisClubToAllPlayers(container);
                        mazyar.addPlayerComment();
                    }
                };
                const observer = new MutationObserver(callback);
                const config = { childList: true, subtree: true };
                observer.observe(target, config);
            }
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
                        const currency = getClubCurrency(doc);
                        const values = getClubTopPlyers(doc);
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
                team.currency = getClubCurrency(doc);
                team.values = getClubTopPlyers(doc);

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
        const summary = squadGetPlayersInfo(players, sport);
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

    async function matchAddTopPlayersValue(team, sport) {
        const teamLink = team.querySelector("a").href;
        const tid = extractTeamId(teamLink);
        const { players, currency } = await getPlayersAndCurrency(tid, sport);
        matchInjectTopPlayersValues(players, team, currency, sport);
    }

    async function matchAddLineupValues(team, sport) {
        const teamLink = team.querySelector("a").href;
        const tid = extractTeamId(teamLink);
        const { players, currency } = await getPlayersAndCurrency(tid, sport);
        matchInjectLineupValues(players, team, currency, sport);
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
            // Note: when this event is fired, it is removed from the element or element is changed somehow.
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

    async function tableAddTeamTopPlayersInfo(team, ageLimit, sport) {
        const url = tableGetSquadSummaryUrl(team);

        // for mobile
        const mobileView = tableAddTeamToBodyForMobileView(team, url);

        // for pc
        team.classList.add("responsive-hide");
        tableModifyTeamInBodyForPcView(team, url);
        const pcView = team;

        const tid = extractTeamId(url);
        const { players, currency } = await getPlayersAndCurrency(tid, sport);

        const playersOfSport = sport === "soccer" ? 11 : 21;
        const all = filterPlayers(players, playersOfSport, 0, 99);
        const u23 = filterPlayers(players, playersOfSport, 0, 23);
        const u21 = filterPlayers(players, playersOfSport, 0, 21);
        const u18 = filterPlayers(players, playersOfSport, 0, 18);

        for (const view of [pcView, mobileView]) {
            const valueElement = view.querySelector("td.team-value");
            // prettier-ignore
            valueElement.innerHTML =
                `<span class="values-all" style="display:none">${formatBigNumber(all?.values)} ${currency}</span>` +
                `<span class="values-u23" style="display:none">${formatBigNumber(u23?.values)} ${currency}</span>` +
                `<span class="values-u21" style="display:none">${formatBigNumber(u21?.values)} ${currency}</span>` +
                `<span class="values-u18" style="display:none">${formatBigNumber(u18?.values)} ${currency}</span>`;
            valueElement.style.textAlign = "right";

            const ageElement = view.querySelector("td.age-value");
            // prettier-ignore
            ageElement.innerHTML =
                `<span class="values-all" style="display:none;">${formatAverageAge(all?.avgAge)}</span>` +
                `<span class="values-u23" style="display:none;">${formatAverageAge(u23?.avgAge)}</span>` +
                `<span class="values-u21" style="display:none;">${formatAverageAge(u21?.avgAge)}</span>` +
                `<span class="values-u18" style="display:none;">${formatAverageAge(u18?.avgAge)}</span>`;

            tableDisplayAgeInfo(view, ageLimit);
        }

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

    function transferCreateScoutOptions() {
        const div = document.createElement("div");
        div.classList.add("mazyar-flex-container-row");
        div.style.justifyContent = "left";
        div.style.marginTop = "6px";

        const highs = document.createElement("div");
        highs.classList.add("mazyar-flex-container-row");
        highs.style.justifyContent = "left";
        highs.style.border = "1px inset black";
        highs.style.marginRight = "2rem";

        const lows = document.createElement("div");
        lows.classList.add("mazyar-flex-container-row");
        lows.style.justifyContent = "left";
        lows.style.border = "1px outset black";
        lows.style.marginRight = "2rem";

        const transferOptions = mazyar.getTransferOptions();
        const H4 = createMenuCheckBox("H4", transferOptions.H4, { margin: "auto 4px auto 1px" });
        const H3 = createMenuCheckBox("H3", transferOptions.H3, { margin: "auto 4px auto 1px" });
        const L2 = createMenuCheckBox("L2", transferOptions.L2, { margin: "auto 4px auto 1px" });
        const L1 = createMenuCheckBox("L1", transferOptions.L1, { margin: "auto 4px auto 1px" });
        const hide = createMenuCheckBox("Hide Others", transferOptions.hide, { margin: "auto 4px auto 1px" });

        H4.onclick = () => {
            mazyar.updateTransferOptions("H4", H4.querySelector("input[type=checkbox]").checked);
            mazyar.applyFiltersAndStylesToTransferResult(true);
        };

        H3.onclick = () => {
            mazyar.updateTransferOptions("H3", H3.querySelector("input[type=checkbox]").checked);
            mazyar.applyFiltersAndStylesToTransferResult(true);
        };

        L2.onclick = () => {
            mazyar.updateTransferOptions("L2", L2.querySelector("input[type=checkbox]").checked);
            mazyar.applyFiltersAndStylesToTransferResult(true);
        };

        L1.onclick = () => {
            mazyar.updateTransferOptions("L1", L1.querySelector("input[type=checkbox]").checked);
            mazyar.applyFiltersAndStylesToTransferResult(true);
        };

        hide.onclick = () => {
            mazyar.updateTransferOptions("hide", hide.querySelector("input[type=checkbox]").checked);
            mazyar.applyFiltersAndStylesToTransferResult(true);
        };

        highs.appendChild(H4);
        highs.appendChild(H3);
        lows.appendChild(L2);
        lows.appendChild(L1);
        div.appendChild(highs);
        div.appendChild(lows);
        div.appendChild(hide);
        div.appendChild(hide);
        return div;
    }

    function transferInject() {
        const form = document.getElementById("searchform");
        if (form) {
            const scoutOptions = transferCreateScoutOptions();
            form.parentNode.appendChild(scoutOptions);
            transferInjectButtons(form);
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
        }
    }

    /* *********************** Transfer Agent ********************************** */

    async function getNationalRankings() {
        const rankings = [];
        const url = 'https://www.managerzone.com/?p=rank&sub=countryrank';
        const resp = await fetch(url).catch((error) => {
            console.warn(error);
        });
        if (resp) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(await resp.text(), "text/html");
            const teams = doc.querySelectorAll("table#countryRankTable tbody tr");
            for (const team of teams) {
                const columns = team.querySelectorAll("td");
                let name = columns[2].innerText;
                if (name === 'United States') {
                    name = 'USA';
                }
                rankings.push({
                    name,
                    rank: Number(columns[0].innerText),
                })
            }
        }
        return rankings;
    }

    function predictorAttachInfo(match, teams, rankings) {
        teams[0].rank = rankings.find((t) => t.name.trim() === teams[0].name.trim())?.rank;
        teams[1].rank = rankings.find((t) => t.name.trim() === teams[1].name.trim())?.rank;
        teams[0].valueColor = (teams[0].value > teams[1].value) ? "blue" : "unset";
        teams[1].valueColor = (teams[1].value > teams[0].value) ? "blue" : "unset";
        teams[0].rankColor = (teams[0].rank < teams[1].rank) ? "blue" : "unset";
        teams[1].rankColor = (teams[1].rank < teams[0].rank) ? "blue" : "unset";

        const tbody = document.createElement("tbody");
        for (const team of teams) {
            tbody.innerHTML += `
            <td style="text-align:left;padding: 0; width: 100px;"><b>${team.name}</b></td>
            <td style="text-align:left;padding: 0;">[Rank: <b style="display:inline-block; width: 1.1rem; text-align:right; color: ${team.rankColor};">${team.rank ?? 'xx'}</b>]</td>
            <td style="text-align:right;padding: 0 4px;">[Value: <b style="color: ${team.valueColor};">${formatBigNumber(team.value)}</b> ${team.currency}]</td>
            `;
        }

        const table = document.createElement("table");
        table.appendChild(tbody);
        table.classList.add("mazyar-table");
        const div = document.createElement("div");
        div.appendChild(table);
        const target = match.querySelector("td");
        target.appendChild(div);
    }

    async function predictorInjectRecommendation(match, rankings) {
        const href = match.querySelector("td > a")?.href;
        const url = href.replace("&play=2d", "").replace("&type=2d", "");

        const sport = getSportType();
        const resp = await fetch(url).catch((error) => {
            console.warn(error);
        });
        if (resp) {
            const results = [];
            const parser = new DOMParser();
            const doc = parser.parseFromString(await resp.text(), "text/html");
            const teams = doc.querySelectorAll("div.team-table");
            for (const team of teams) {
                const link = team.querySelector("a");
                const name = link.innerText;
                const tid = extractTeamId(link.href);
                const { players, currency } = await getPlayersAndCurrency(tid, sport);
                const playersOfSport = sport === "soccer" ? 11 : 21;
                const all = filterPlayers(players, playersOfSport, 0, 99);
                results.push({
                    name,
                    value: all?.values,
                    currency: currency,
                })
            }
            predictorAttachInfo(match, results, rankings);
        }
    }

    async function predictorInject() {
        const rankings = await getNationalRankings();
        const matches = document.querySelectorAll("#match-predictor-container table.match-list tbody tr");
        const jobs = [];
        for (const match of matches) {
            jobs.push(predictorInjectRecommendation(match, rankings));
        }
        Promise.all(jobs);
    }

    /* *********************** Club Page ********************************** */

    function countTrophies(doc) {
        const trophies = doc.querySelectorAll("div.trophy-wrapper:not(.icon)");
        return [...trophies].map((el) => {
            const text = el.innerText.trim();
            return text ? Number(text) : 1;
        }).reduce((a, b) => a + b, 0);
    }

    async function getTrophiesCount(url) {
        const resp = await fetch(url).catch((error) => {
            console.warn(error);
            return 'N/A';
        });
        if (resp?.status === 200) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(await resp.text(), "text/html");
            return countTrophies(doc);
        }
        return 'N/A'
    }

    function getTrophiesSection() {
        const items = document.querySelectorAll("dl#trophies-achievements-lists dd");
        for (const item of items) {
            const link = item.querySelector("a");
            if (link?.href.search("awards") > -1) {
                return { trophies: item, url: link.href };
            }
        }
        return { trophies: null, url: null };
    }

    async function addTrophyCountToClubPage() {
        const { trophies, url } = getTrophiesSection();
        if (trophies) {
            const el = document.createTextNode(` (Total: ?)`);
            trophies.querySelector("span")?.appendChild(el);
            const count = await getTrophiesCount(url);
            el.nodeValue = ` (Total: ${count})`;
        }
    }

    /* *********************** Trainers ********************************** */

    function trainersAddColumns(table) {
        const headerRow = table.querySelector('thead tr');
        const thSalary = document.createElement('th');
        thSalary.textContent = 'Salary Range';
        thSalary.style.textAlign = 'center';
        thSalary.style.textDecoration = 'none';
        headerRow?.appendChild(thSalary);

        const thBonus = document.createElement('th');
        thBonus.textContent = 'Bonus';
        thBonus.style.textAlign = 'center';
        thBonus.style.textDecoration = 'none';
        headerRow?.appendChild(thBonus);

        const thWeeks = document.createElement('th');
        thWeeks.textContent = 'Weeks';
        thWeeks.style.textAlign = 'center';
        thWeeks.style.textDecoration = 'none';
        headerRow?.appendChild(thWeeks);

        const rows = table.querySelectorAll('tbody tr:not(.minified-view)');
        rows.forEach(row => {
            const salaryCell = row.insertCell(-1);
            salaryCell.style.textAlign = 'center';
            salaryCell.replaceChildren(createLoadingIcon2());

            const bonusCell = row.insertCell(-1);
            bonusCell.style.textAlign = 'center';
            bonusCell.replaceChildren(createLoadingIcon2());

            const weeksCell = row.insertCell(-1);
            weeksCell.style.textAlign = 'center';
            weeksCell.replaceChildren(createLoadingIcon2());
        });
    }

    function trainersFetchSalaryAndWeeks(coachId, salaryCell, bonusCell, weeksCell) {
        GM_xmlhttpRequest({
            method: "GET",
            url: `https://www.managerzone.com/?p=trainers&sub=offer&extra=freeagent&cid=${coachId}`,
            onload: function (response) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(response.responseText, "text/html");
                const salaryElement = doc.querySelector('td#salary_range nobr');
                const weeksElement = doc.querySelector('td#weeks_range nobr');
                const bonusElement = doc.querySelector("div#paper-content-wrapper > table  td.contract_paper:nth-child(2)");

                const salaryText = salaryElement?.innerText?.trim()?.match(/\d+(.*?\d+)* -(.*?\d+)+/g)?.[0];
                salaryCell.textContent = salaryText ?? 'N/A';
                salaryCell.style.fontStyle = 'normal';

                const weeksText = weeksElement?.innerText?.trim()?.match(/\d+(.*?\d+)* -(.*?\d+)+/g)?.[0];
                weeksCell.textContent = weeksText ?? 'N/A';
                weeksCell.style.fontStyle = 'normal';

                const bonusText = bonusElement?.innerText?.trim()?.match(/\d+(.*?\d+)*/g)?.[0];
                bonusCell.textContent = bonusText ?? 'N/A';
                bonusCell.style.fontStyle = 'normal';
            }
        });
    }

    function trainersUpdateSalariesAndWeeks(table) {
        trainersAddColumns(table);
        const rows = table?.querySelectorAll('tbody tr:not(.minified-view)');
        rows.forEach(row => {
            const linkElement = row.querySelector('td a[href*="cid="]');
            if (linkElement) {
                const urlParams = new URLSearchParams(linkElement.search);
                const coachId = urlParams.get('cid');
                const salaryCell = row.cells[row.cells.length - 3];
                const bonusCell = row.cells[row.cells.length - 2];
                const weeksCell = row.cells[row.cells.length - 1];
                trainersFetchSalaryAndWeeks(coachId, salaryCell, bonusCell, weeksCell);
            }
        });
    }

    function trainersAddRequestedSalaries() {
        const callback = () => {
            const table = document.getElementById("coaches_list");
            if (table && !table.injecting) {
                table.injecting = true;
                trainersUpdateSalariesAndWeeks(table);
            }
        };
        const target = document.querySelector('div.in_page_navigation_top');
        if (target) {
            const observer = new MutationObserver(callback);
            const config = { childList: true, subtree: true };
            observer.observe(target, config);
        }
    }

    /* *********************** Training Report ********************************** */

    function trainingOpenPlayerTrainingCamp(player) {
        player.querySelector('td.playerColumn a')?.click();
        const interval = setInterval(() => {
            const modal = document.querySelector("#lightbox_player_profile #players_container div.playerContainer");
            if (modal) {
                clearInterval(interval);
                modal.querySelector('div.box_dark.player_tc_package_information a')?.click();
            }
        }, 300);
    }

    function trainingInjectCampOpener(table) {
        const players = table.querySelectorAll("tbody tr");
        for (const player of players) {
            const campIcon = player.querySelector("td.dailyReportRightColumn img.content_middle");
            if (campIcon) {
                campIcon.style.cursor = "pointer";
                campIcon.addEventListener("click", () => {
                    trainingOpenPlayerTrainingCamp(player);
                });
            }
        }
    }

    function trainingAddCampOpenerToReport() {
        const callback = () => {
            const tables = document.querySelectorAll('#training_report > table');
            for (const table of tables) {
                if (!table.injecting) {
                    table.injecting = true;
                    trainingInjectCampOpener(table);
                }
            }
        };
        const target = document.getElementById('training_report');
        if (target) {
            const observer = new MutationObserver(callback);
            const config = { childList: true, subtree: true };
            observer.observe(target, config);
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
            transfer_maxed: false,
            mz_predictor: false,
            player_comment: false,
            coach_salary: false,
        };
        #transferOptions = {
            hide: true,
            H4: false,
            H3: false,
            L2: false,
            L1: false,
        };
        #filters = { soccer: [], hockey: [] }; // each key is like [{id, name, params, scout, interval}]
        #sport = "soccer";
        #db;

        constructor() {
            this.#initializeIndexedDb("Mazyar");
            this.#fetchSettings();
            this.#fetchTransferOptions();
            this.#fetchFilters();

            this.#sport = getSportType();

            this.#addToolbar();
            this.#createModal();

            this.#showChangelog();
        }

        async #initializeIndexedDb(name = "db") {
            this.#db = new Dexie(name);
            this.#db.version(1).stores({
                comment: "[sport+pid]",
                scout: "[sport+pid]",
                hit: "[fid+pid],deadline",
                filter: "&fid,totalHits,scoutHits,lastCheck",
            });
            this.#db.version(2).stores({
                scout: "[sport+pid],ts",
                player: "[sport+pid],ts,maxed,days",
            }).upgrade(trans => {
                return trans.table("scout").toCollection().modify(report => {
                    report.ts = 0;
                });
            });
            this.#db.open();
            await this.#cleanOutdatedDataFromIndexedDb();
            const info = await navigator?.storage?.estimate();
            if (info) {
                console.log("ManagerZone IndexedDB size: " + formatFileSize(info.usage));
            }
        }

        async #cleanOutdatedDataFromIndexedDb() {
            const scoutOutdate = Date.now() - 7 * 24 * 60 * 60 * 1000;
            await this.#db.scout.where("ts").below(scoutOutdate).delete().then(function (deleteCount) {
                console.log("Deleted " + deleteCount + " outdated scout reports");
            }).catch((error) => {
                console.warn(error);
            });

            const startOfDay = Date.now() - Date.now() % (24 * 60 * 60 * 1000);
            await this.#db.player.where("ts").below(startOfDay).delete().then(function (deleteCount) {
                console.log("Deleted " + deleteCount + " outdated player profile.");
            }).catch((error) => {
                console.warn(error);
            });
        }

        async #clearIndexedDb() {
            // TODO: clear comments?
            await this.#db.scout.clear();
            await this.#db.hit.clear();
            await this.#db.filter.clear();
            await this.#db.player.clear();
        }

        async #fetchPlayerCommentFromIndexedDb(pid) {
            const player = await this.#db.comment.get({ pid, sport: this.#sport });
            return player?.comment ?? "";
        }

        async #setPlayerCommentInIndexedDb(pid, comment) {
            if (pid) {
                await this.#db.comment.put({ pid, sport: this.#sport, comment: comment ?? "" });
            }
        }

        async #fetchScoutReportFromIndexedDb(pid) {
            return await this.#db.scout.get({ pid, sport: this.#sport });
        }

        async #setScoutReportInIndexedDb(report) {
            if (report) {
                report.sport = this.#sport;
                report.ts = Date.now();
                await this.#db.scout.put(report);
            }
        }

        async #setHitInIndexedDb(filterId = "", playerId = "") {
            if (filterId && playerId) {
                await this.#db.hit.put({ fid: filterId, pid: playerId });
            }
        }

        async #removeHitFromIndexedDb(filterId = "", playerId = "") {
            if (filterId && playerId) {
                await this.#db.hit.delete([filterId, playerId]);
            }
        }

        async #removeAllHitsOfFilterFromIndexedDb(filterId = "") {
            if (filterId) {
                await this.#db.hit.where("fid").equals(filterId).delete();
            }
        }

        async #getHitsFromIndexedDb(filterId = "") {
            if (filterId) {
                return this.#db.hit.filter((hit) => hit.fid === filterId).toArray();
            }
            return [];
        }

        async #setFilterHitsInIndexedDb(filterId = "", totalHits = 0, scoutHits = -1) {
            if (filterId) {
                const item = {
                    fid: filterId,
                    totalHits,
                    scoutHits,
                    lastCheck: Date.now(),
                };
                await this.#db.filter.put(item);
            }
        }

        async getFilterHitsFromIndexedDb(filterId = "") {
            if (filterId) {
                const filter = await this.#db.filter.get(filterId);
                if (filter) {
                    return { totalHits: filter.totalHits, scoutHits: filter.scoutHits, lastCheck: filter.lastCheck };
                }
            }
            return { totalHits: -1, scoutHits: -1, lastCheck: Date.now() };
        }

        async #removeFilterFromIndexedDb(filterId = "") {
            await this.#db.filter.delete(filterId);
            await this.#removeAllHitsOfFilterFromIndexedDb(filterId);
        }

        async #removeAllFilterFromIndexedDb() {
            await this.#db.filter.clear();
            await this.#db.hit.clear();
        }

        #extractSkillNamesFromPlayerInfo(player) {
            const skills = player?.querySelectorAll("table.player_skills > tbody > tr > td > span.clippable");
            return [...skills].map((el) => el.innerText);
        }

        #extractStarsFromScoutReport(section) {
            return section.querySelectorAll(".stars i.lit")?.length;
        }

        #extractSkillsFromScoutReport(section, skillList) {
            const skills = section.querySelectorAll("div.flex-grow-1 ul li.blurred span");
            return [...skills].map((el) => skillList.indexOf(el.innerText));
        }


        async #fetchPlayerProfileFromIndexedDb(pid) {
            return await this.#db.player.get({ pid, sport: this.#sport });
        }

        async #setPlayerProfileInIndexedDb(profile) {
            if (profile) {
                profile.sport = this.#sport;
                profile.ts = Date.now();
                await this.#db.player.put(profile);
            }
        }

        async #extractPlayerProfile(playerId) {
            const doc = await fetchPlayerProfileDocument(playerId);
            if (doc) {
                const days = squadExtractResidencyDays(doc);
                const skills = doc.querySelectorAll("#thePlayers_0 table.player_skills tbody tr");
                let i = 0;
                const maxed = [];
                for (const skill of skills) {
                    if (skill.querySelector(".maxed")) {
                        maxed.push(i);
                    }
                    i++;
                }
                return {
                    pid: playerId,
                    maxed,
                    days,
                };
            }
            return null;
        }

        async #fetchOrExtractPlayerProfile(playerId) {
            let profile = await this.#fetchPlayerProfileFromIndexedDb(playerId);
            if (!profile) {
                profile = await this.#extractPlayerProfile(playerId);
                this.#setPlayerProfileInIndexedDb(profile);
            }
            return profile;
        }

        async #markMaxedSkills(player) {
            if (this.#mustMarkMaxedSkills()) {
                const playerId = player.querySelector("h2 a")?.href?.match(/pid=(\d+)/)?.[1];
                const profile = await this.#fetchOrExtractPlayerProfile(playerId)
                this.#colorizeMaxedSkills(player, profile?.maxed);
            }
        }

        async #extractPlayerScoutReport(pid, skills) {
            const url = `https://www.managerzone.com/ajax.php?p=players&sub=scout_report&pid=${pid}&sport=${this.#sport}`;
            const resp = await fetch(url).catch((error) => {
                console.warn(error);
            });
            if (resp) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(await resp.text(), "text/html");
                const report = doc.querySelectorAll(".paper-content.clearfix dl dd");
                if (report.length == 3) {
                    const high = this.#extractStarsFromScoutReport(report[0]);
                    const highSkills = this.#extractSkillsFromScoutReport(report[0], skills);
                    const low = this.#extractStarsFromScoutReport(report[1]);
                    const lowSkills = this.#extractSkillsFromScoutReport(report[1], skills);
                    const trainingSpeed = this.#extractStarsFromScoutReport(report[2]);
                    return {
                        pid,
                        H: high,
                        HS: highSkills,
                        L: low,
                        LS: lowSkills,
                        S: trainingSpeed,
                    };
                }
            }
            return null;
        }

        #colorizeMaxedSkills(player, maxed = []) {
            if (maxed) {
                const playerSkills = player.querySelectorAll("table.player_skills tr td.skillval span");
                for (const skill of maxed) {
                    playerSkills[skill].classList.add("maxed");
                }
            }
        }

        #colorizeSkills(player, report) {
            if (report) {
                const playerSkills = player.querySelectorAll("table.player_skills tr td:nth-child(1)");
                playerSkills[report.HS[0]]?.classList.add("mazyar-scout-h", `mazyar-scout-${report.H}`);
                playerSkills[report.HS[1]]?.classList.add("mazyar-scout-h", `mazyar-scout-${report.H}`);
                playerSkills[report.LS[0]]?.classList.add(`mazyar-scout-${report.L}`);
                playerSkills[report.LS[1]]?.classList.add(`mazyar-scout-${report.L}`);
            }
        }

        async #fetchOrExtractPlayerScoutReport(player, skills) {
            const playerId = player.querySelector("h2 a")?.href?.match(/pid=(\d+)/)?.[1];
            let report = await this.#fetchScoutReportFromIndexedDb(playerId);
            if (!report) {
                report = await this.#extractPlayerScoutReport(playerId, skills);
                if (report) {
                    this.#setScoutReportInIndexedDb(report);
                }
            }
            return report;
        }

        async #processTransferSearchResults(players, callback = null) {
            const reports = [];
            const firstPlayer = players.querySelector("#thePlayers_0");
            if (firstPlayer) {
                const skills = this.#extractSkillNamesFromPlayerInfo(firstPlayer);
                const scoutJobs = [];
                const maxedJobs = [];
                const daysJobs = [];
                for (const player of [...players.children]) {
                    if (player.classList.contains("playerContainer")) {
                        if (this.#isDaysAtThisClubEnabledForTransferMarket()) {
                            daysJobs.push(this.#squadAddDaysAtThisClubForSinglePlayer(player));
                        }
                        if (this.#isTransferMaxedSkillsEnabled()) {
                            maxedJobs.push(this.#markMaxedSkills(player));
                        }
                        if (this.#isTransferOptionsEnabled()) {
                            if (player.querySelector("span.scout_report > a")) {
                                scoutJobs.push(this.#fetchOrExtractPlayerScoutReport(player, skills).then((report) => {
                                    this.#colorizeSkills(player, report);
                                    return report;
                                }));
                            } else if (callback) {
                                callback(player);
                            }
                        }
                    }
                }
                const scoutReports = await Promise.all(scoutJobs);
                for (const scoutReport of scoutReports) {
                    if (scoutReport) {
                        reports.push(scoutReport);
                    }
                }
                await Promise.all(maxedJobs);
                await Promise.all(daysJobs);
            }
            return reports;
        }

        #isTransferHighOptionsEnabled() {
            return this.#transferOptions.H4 || this.#transferOptions.H3;
        }

        #isTransferLowOptionsEnabled() {
            return this.#transferOptions.L2 || this.#transferOptions.L1;
        }

        #isTransferOptionsEnabled() {
            return this.#isTransferHighOptionsEnabled() || this.#isTransferLowOptionsEnabled();
        }

        #isTransferMaxedSkillsEnabled() {
            return this.#settings.transfer_maxed;
        }

        #isDaysAtThisClubEnabledForTransferMarket() {
            return this.#settings.display_days_in_transfer;
        }

        isDaysAtThisClubEnabledForOneClubPlayers() {
            return this.#settings.display_days_for_one_clubs;
        }

        mustHelpWithPredictor() {
            // return this.#settings.mz_predictor;
            return false;
        }

        #mustAddPlayerComment() {
            return this.#settings.player_comment;
        }

        mustAddCoachSalaries() {
            return this.#settings.coach_salary;
        }

        #mustMarkMaxedSkills() {
            return this.#settings.transfer_maxed;
        }

        #isQualifiedForTransferScoutFilter(report, lows = [], highs = []) {
            return highs.includes(report.H) && lows.includes(report.L);
        }

        #getAcceptableHighsAndLows() {
            let lows = [];
            let highs = [];

            if (this.#isTransferLowOptionsEnabled()) {
                if (this.#transferOptions.L2) {
                    lows.push(2);
                }
                if (this.#transferOptions.L1) {
                    lows.push(1);
                }
            } else {
                lows = [1, 2, 3];
            }

            if (this.#isTransferHighOptionsEnabled()) {
                if (this.#transferOptions.H4) {
                    highs.push(4);
                }
                if (this.#transferOptions.H3) {
                    highs.push(3);
                }
            } else {
                highs = [1, 2, 3, 4];
            }

            return { lows, highs };
        }

        #getAcceptableHighsAndLowsForFilter(scout) {
            const lows = scout.low.length > 0 ? scout.low : [1, 2, 3];
            const highs = scout.high.length > 0 ? scout.high : [1, 2, 3, 4];
            return { lows, highs };
        }

        #applyTransferFilters(reports) {
            const { lows, highs } = this.#getAcceptableHighsAndLows();
            for (const report of reports) {
                if (!this.#isQualifiedForTransferScoutFilter(report, lows, highs)) {
                    const player = document.getElementById(`player_id_${report.pid}`);
                    if (player) {
                        const playerContainer = player.parentNode.parentNode.parentNode;
                        if (this.#transferOptionsMustHide()) {
                            playerContainer.classList.add("mazyar-hide");
                        } else {
                            playerContainer.classList.add("mazyar-dim-60");
                        }
                    }
                }
            }
        }

        #clearTransferFilters() {
            document.querySelectorAll(".mazyar-hide")?.forEach((el) => {
                el.classList.remove("mazyar-hide");
            });
            document.querySelectorAll(".mazyar-dim-50")?.forEach((el) => el.classList.remove("mazyar-dim-50"));
            document.querySelectorAll(".mazyar-dim-60")?.forEach((el) => el.classList.remove("mazyar-dim-60"));
        }

        async applyFiltersAndStylesToTransferResult(clear = false) {
            if (clear) {
                this.#clearTransferFilters();
            }
            if (this.#isTransferOptionsEnabled() || this.#isTransferMaxedSkillsEnabled()) {
                const players = document.getElementById("players_container");
                const reports = await this.#processTransferSearchResults(players, (player) => {
                    if (this.#isTransferOptionsEnabled()) {
                        if (this.#transferOptionsMustHide()) {
                            player.classList.add("mazyar-hide");
                        } else {
                            player.classList.add("mazyar-dim-50");
                        }
                    }
                });
                if (this.#isTransferOptionsEnabled()) {
                    this.#applyTransferFilters(reports);
                }
            }
        }

        async executeTransferTasks() {
            this.applyFiltersAndStylesToTransferResult();

            const callback = (mutationsList) => {
                if (mutationsList.find(mutation => mutation.type == "childList")) {
                    this.applyFiltersAndStylesToTransferResult();
                }
            };
            const target = document.getElementById("players_container");
            if (target) {
                const observer = new MutationObserver(callback);
                const config = { childList: true };
                observer.observe(target, config);
            }
        }

        #getSelectedScoutsOptionText() {
            const texts = [];
            const options = this.getTransferOptions();
            if (options.H4) {
                texts.push('<span class="mazyar-scout-4">H4<span>');
            }
            if (options.H3) {
                texts.push('<span class="mazyar-scout-3">H3<span>');
            }
            if (options.L2) {
                texts.push('<span class="mazyar-scout-2">L2<span>');
            }
            if (options.L1) {
                texts.push('<span class="mazyar-scout-1">L1<span>');
            }
            return texts.join(", ");
        }

        #getSelectedScoutsOptionTextForFilter(scout) {
            const texts = [];
            if (scout.high.includes(4)) {
                texts.push('<span class="mazyar-scout-4">H4<span>');
            }
            if (scout.high.includes(3)) {
                texts.push('<span class="mazyar-scout-3">H3<span>');
            }
            if (scout.low.includes(2)) {
                texts.push('<span class="mazyar-scout-2">L2<span>');
            }
            if (scout.low.includes(1)) {
                texts.push('<span class="mazyar-scout-1">L1<span>');
            }
            return texts.join(", ");
        }

        // -------------------------------- Settings -------------------------------------

        #fetchSettings() {
            this.#settings.in_progress_results = GM_getValue("display_in_progress_results", true);
            this.#settings.top_players_in_tables = GM_getValue("display_top_players_in_tables", true);
            this.#settings.transfer = GM_getValue("enable_transfer_filters", false);
            this.#settings.transfer_maxed = GM_getValue("display_maxed_in_transfer", false);
            this.#settings.mz_predictor = GM_getValue("mz_predictor", false);
            this.#settings.player_comment = GM_getValue("player_comment", false);
            this.#settings.coach_salary = GM_getValue("coach_salary", true);
            this.#settings.display_days_in_transfer = GM_getValue("display_days_in_transfer", false);
            this.#settings.display_days_for_one_clubs = GM_getValue("display_days_for_one_clubs", false);
        }

        #saveSettings() {
            GM_setValue("display_in_progress_results", this.#settings.in_progress_results);
            GM_setValue("display_top_players_in_tables", this.#settings.top_players_in_tables);
            GM_setValue("enable_transfer_filters", this.#settings.transfer);
            GM_setValue("display_maxed_in_transfer", this.#settings.transfer_maxed);
            GM_setValue("mz_predictor", this.#settings.mz_predictor);
            GM_setValue("player_comment", this.#settings.player_comment);
            GM_setValue("coach_salary", this.#settings.coach_salary);
            GM_setValue("display_days_in_transfer", this.#settings.display_days_in_transfer);
            GM_setValue("display_days_for_one_clubs", this.#settings.display_days_for_one_clubs);
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

        // -------------------------------- Player Options -------------------------------------

        async #addPlayerCommentIcon(player) {
            const playerId = getPlayerIdFromContainer(player);
            const commentIcon = createCommentIcon("MZY Comment");
            if (await this.#fetchPlayerCommentFromIndexedDb(playerId)) {
                commentIcon.classList.add("mazyar-player-comment-icon-active");
            } else {
                commentIcon.classList.add("mazyar-player-comment-icon-inactive");
            }
            player.querySelector(".p_links")?.appendChild(commentIcon);
            commentIcon.addEventListener("click", async (event) => {
                this.#displayPlayerComment(event?.target, playerId);
            })
        }

        async addPlayerComment() {
            if (this.#mustAddPlayerComment()) {
                const jobs = [];
                const players = document.querySelectorAll(".playerContainer");
                for (const player of players) {
                    jobs.push(this.#addPlayerCommentIcon(player));
                }
                Promise.all(jobs);
            }
        }

        async #squadAddDaysAtThisClubForSinglePlayer(player) {
            const playerId = getPlayerIdFromContainer(player);
            const profile = await this.#fetchOrExtractPlayerProfile(playerId);
            const daysDiv = document.createElement("div");
            if (profile?.days >= 0) {
                const text = profile?.days === 0 ? 'N/A' : `≤ ${profile?.days}`;
                daysDiv.innerHTML = `Days at this club: <strong>${text}</strong>`;
                daysDiv.classList.add("mazyar-days-at-this-club");
            } else if (this.isDaysAtThisClubEnabledForOneClubPlayers()) {
                const text = 'Entire Career';
                daysDiv.innerHTML = `Days at this club: <strong>${text}</strong>`;
                daysDiv.classList.add("mazyar-days-at-this-club-entire");
            }
            player.querySelector("div.mainContent")?.appendChild(daysDiv);
        }

        async squadAddDaysAtThisClubToAllPlayers(container) {
            const jobs = [];
            const players = container.querySelectorAll("div.playerContainer");
            for (const player of players) {
                jobs.push(this.#squadAddDaysAtThisClubForSinglePlayer(player));
            }
            Promise.all(jobs);
        }

        // -------------------------------- Transfer Options -------------------------------------

        #fetchTransferOptions() {
            this.#transferOptions.hide = GM_getValue("transfer_options_hide", true);
            this.#transferOptions.H4 = GM_getValue("transfer_options_H4", false);
            this.#transferOptions.H3 = GM_getValue("transfer_options_H3", false);
            this.#transferOptions.L2 = GM_getValue("transfer_options_L2", false);
            this.#transferOptions.L1 = GM_getValue("transfer_options_L1", false);
        }

        #saveTransferOptions() {
            GM_setValue("transfer_options_hide", this.#transferOptions.hide);
            GM_setValue("transfer_options_H4", this.#transferOptions.H4);
            GM_setValue("transfer_options_H3", this.#transferOptions.H3);
            GM_setValue("transfer_options_L2", this.#transferOptions.L2);
            GM_setValue("transfer_options_L1", this.#transferOptions.L1);
        }

        #transferOptionsMustHide() {
            return this.#transferOptions.hide;
        }

        getTransferOptions() {
            return this.#transferOptions;
        }

        updateTransferOptions(key, value) {
            this.#transferOptions[key] = value;
            this.#saveTransferOptions();
        }

        #resetTransferOptions() {
            this.#transferOptions.hide = false;
            this.#transferOptions.H4 = false;
            this.#transferOptions.H3 = false;
            this.#transferOptions.L2 = false;
            this.#transferOptions.L1 = false;
            this.#saveTransferOptions();
        }

        // -------------------------------- Filters -------------------------------------

        #fetchFilters() {
            this.#filters = GM_getValue("transfer_filters", { soccer: [], hockey: [] });
        }

        #saveFilters() {
            GM_setValue("transfer_filters", {
                soccer: this.#filters.soccer.map(({ id, name, params, scout, interval }) => ({
                    id,
                    name,
                    params,
                    scout,
                    interval,
                })),
                hockey: this.#filters.hockey.map(({ id, name, params, scout, interval }) => ({
                    id,
                    name,
                    params,
                    scout,
                    interval,
                })),
            });
        }

        #getCurrentFilters() {
            return this.#filters[this.#sport];
        }

        deleteFilter(id = "") {
            const filterIndex = this.#getCurrentFilters().findIndex((f) => f.id === id);
            if (filterIndex > -1) {
                this.#removeFilterFromIndexedDb(id);
                this.#getCurrentFilters().splice(filterIndex, 1);
                this.#checkAllFilters(true);
                this.#saveFilters();
            }
        }

        deleteAllFilters() {
            this.#removeAllFilterFromIndexedDb();
            this.#getCurrentFilters().length = 0;
            this.#checkAllFilters(true);
            this.#saveFilters();
        }

        getFilterParams(name = "") {
            return this.#getCurrentFilters().find((f) => f.name === name)?.params;
        }

        async updateFilterDetails(name, params, scout, interval) {
            const filters = this.#getCurrentFilters();
            let filter = filters.find((f) => f.name === name);
            if (filter) {
                filter.params = params;
                filter.scout = scout;
                filter.interval = interval;
            } else {
                // create a new filter if name does not exist
                filter = {
                    name,
                    params,
                    scout,
                    interval,
                    id: generateUuidV4(),
                };
                filters.push(filter);
            }
            this.#saveFilters();
            const { totalHits, scoutHits } = await this.#getFilterTotalHits(filter);
            if (totalHits >= 0) {
                await this.#setFilterHitsInIndexedDb(filter.id, totalHits, scoutHits);
                this.#checkAllFilters(true);
            }
        }

        #itsTimeToCheckFilter(filter, lastCheck) {
            const passed = Date.now() - lastCheck;
            if (filter.interval === TRANSFER_INTERVALS.never.value) {
                return false;
            } else if (filter.interval === TRANSFER_INTERVALS.onceDay.value) {
                return passed > 24 * 60 * 60 * 1000;
            } else if (filter.interval === TRANSFER_INTERVALS.onceHour.value) {
                return passed > 1 * 60 * 60 * 1000;
            } else if (filter.interval === TRANSFER_INTERVALS.onceMinute.value) {
                return passed > 1 * 60 * 1000;
            }
            // 'always' or any invalid value means always
            return true;
        }

        async #getFilterHitsByOffset(filter, offset = 0) {
            let totalHits = -1;
            let scoutHits = -1;
            const url = `https://www.managerzone.com/ajax.php?p=transfer&sub=transfer-search&sport=${this.#sport}${filter.params}&o=${offset}`;
            const response = await fetch(url).catch((error) => {
                console.warn(error);
            });
            if (response) {
                const data = await response.json();
                totalHits = Number(data?.totalHits);
                const searchResults = document.createElement("div");
                searchResults.innerHTML = data.players;
                if (filter.scout) {
                    const playersReport = await this.#processTransferSearchResults(searchResults);
                    const { lows, highs } = this.#getAcceptableHighsAndLowsForFilter(filter.scout);
                    const scouted = playersReport.filter((report) => this.#isQualifiedForTransferScoutFilter(report, lows, highs));
                    scoutHits = scouted.length;
                    // save scout hits in indexed db
                    const jobs = [];
                    for (const player of scouted) {
                        jobs.push(this.#setHitInIndexedDb(filter.id, player.pid));
                    }
                    await Promise.all(jobs);
                }
            }
            return { totalHits, scoutHits };
        }

        async #getFilterTotalHits(filter) {
            // get first page of the results
            await this.#removeAllHitsOfFilterFromIndexedDb(filter.id);
            let { totalHits, scoutHits } = await this.#getFilterHitsByOffset(filter);
            if (totalHits >= 0) {
                if (filter.scout) {
                    const pages = Math.min(Math.ceil(totalHits / 20), 26);
                    const jobs = [];
                    // when filter uses scout report, get next pages too
                    for (let i = 1; i < pages; i++) {
                        jobs.push(this.#getFilterHitsByOffset(filter, 20 * i));
                    }
                    const results = await Promise.all(jobs);
                    for (const result of results) {
                        scoutHits += result.scoutHits;
                    }
                }
            }
            return { totalHits, scoutHits };
        }

        async refreshFilterHits(id = "") {
            const filter = this.#getCurrentFilters().find((filter) => filter.id === id);
            if (filter) {
                const { totalHits, scoutHits } = await this.#getFilterTotalHits(filter);
                if (totalHits >= 0) {
                    this.#setFilterHitsInIndexedDb(filter.id, totalHits, scoutHits);
                    this.#checkAllFilters(false);
                    return { totalHits, scoutHits };
                }
            }
            return { totalHits: -1, scoutHits: -1 };
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

        async cleanInstall() {
            this.updateSettings({
                in_progress_results: false,
                top_players_in_tables: false,
                transfer: false,
                transfer_maxed: false,
                mz_predictor: false,
                player_comment: false,
                coach_salary: false,
                display_days_in_transfer: false,
                display_days_for_one_clubs: false,
            });
            this.deleteAllFilters();
            await this.#clearIndexedDb();
            this.#resetTransferOptions();
            this.#resetTransferOptions();
        }

        displayCleanMenu() {
            const that = this;

            const div = document.createElement("div");
            const title = createMzStyledTitle("MZY Settings");
            const notice = document.createElement("div");
            const buttons = document.createElement("div");
            const cancel = createMzStyledButton("Cancel", "red");
            const clean = createMzStyledButton("Clean", "blue");

            div.classList.add("mazyar-flex-container");

            buttons.classList.add("mazyar-flex-container-row");

            notice.innerHTML = "All Settings, Filters, Scout Reports and ... will be deleted.<br>Are you sure?";
            notice.style.padding = "1rem";

            clean.onclick = async () => {
                await that.cleanInstall();
                that.hideModal();
                that.displaySettingsMenu();
            };

            cancel.onclick = () => {
                that.hideModal();
                that.displaySettingsMenu();
            };

            div.appendChild(title);
            div.appendChild(notice);
            buttons.appendChild(cancel);
            buttons.appendChild(clean);
            div.appendChild(buttons);

            this.#replaceModalContent([div]);
        }

        displaySettingsMenu() {
            const that = this; // used in onclick event listener

            const div = document.createElement("div");
            const title = createMzStyledTitle("MZY Settings");
            const inProgress = createMenuCheckBox("Display In Progress Results", this.#settings.in_progress_results);
            const tableInjection = createMenuCheckBox("Display Teams' Top Players in Tables", this.#settings.top_players_in_tables);
            const transfer = createMenuCheckBox("Enable Transfer Filters", this.#settings.transfer);
            const transferMaxed = createMenuCheckBox("Display Maxed Skills in Transfer (If Available)", this.#settings.transfer_maxed);
            // const mzPredictor = createMenuCheckBox("Help with World Cup Predictor", this.#settings.mz_predictor);
            const playerComment = createMenuCheckBox("Enable Player Comment", this.#settings.player_comment);
            const coachSalaries = createMenuCheckBox("Display Salary Range in 'Hire Coaches'", this.#settings.coach_salary);
            const daysInTransfer = createMenuCheckBox("Display 'Days At this club' in transfer market", this.#settings.display_days_in_transfer);
            const daysForOneClubs = createMenuCheckBox("Display 'Days At this club' for One-Club players", this.#settings.display_days_for_one_clubs);
            const buttons = document.createElement("div");
            const clean = createMzStyledButton(`<i class="fa fa-exclamation-triangle" style="font-size: 0.9rem;"></i> Clean Install`, "blue");
            const cancel = createMzStyledButton("Cancel", "red");
            const save = createMzStyledButton("Save", "green");

            div.classList.add("mazyar-flex-container");

            buttons.classList.add("mazyar-flex-container-row");

            cancel.onclick = () => {
                that.hideModal();
            };

            save.onclick = () => {
                that.updateSettings({
                    in_progress_results: inProgress.querySelector("input[type=checkbox]").checked,
                    top_players_in_tables: tableInjection.querySelector("input[type=checkbox]").checked,
                    transfer: transfer.querySelector("input[type=checkbox]").checked,
                    transfer_maxed: transferMaxed.querySelector("input[type=checkbox]").checked,
                    // mz_predictor: mzPredictor.querySelector("input[type=checkbox]").checked,
                    mz_predictor: false,
                    player_comment: playerComment.querySelector("input[type=checkbox]").checked,
                    coach_salary: coachSalaries.querySelector("input[type=checkbox]").checked,
                    display_days_in_transfer: daysInTransfer.querySelector("input[type=checkbox]").checked,
                    display_days_for_one_clubs: daysForOneClubs.querySelector("input[type=checkbox]").checked,
                });
                that.hideModal();
            };

            clean.style.marginBottom = "0";
            clean.onclick = () => {
                that.hideModal();
                that.displayCleanMenu();
            };

            div.appendChild(title);
            div.appendChild(inProgress);
            div.appendChild(tableInjection);
            div.appendChild(transfer);
            div.appendChild(transferMaxed);
            // div.appendChild(mzPredictor);
            div.appendChild(playerComment);
            div.appendChild(coachSalaries);
            div.appendChild(daysInTransfer);
            div.appendChild(daysForOneClubs);
            div.appendChild(clean);
            buttons.appendChild(cancel);
            buttons.appendChild(save);
            div.appendChild(buttons);

            this.#replaceModalContent([div]);
        }

        displayFilterSaveMenu(params) {
            const filters = this.#getCurrentFilters();
            const that = this; // used in onclick event listener

            const scoutText = this.#getSelectedScoutsOptionText();

            const title = createMzStyledTitle("MZY Transfer Filter");
            const div = document.createElement("div");
            const datalist = createSuggestionList(filters.map((f) => f.name));
            const filterName = createTextInput("Filter Name", "U21 K-10 ST-10", datalist.id);
            const useScout = createMenuCheckBox(`Use scout reports too (${scoutText})`);
            const checkInterval = createMenuDropDown("Check Interval", TRANSFER_INTERVALS, TRANSFER_INTERVALS.onceHour.value);

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
                    const high = [];
                    const low = [];
                    if (useScout.querySelector("input[type=checkbox]").checked) {
                        const options = that.getTransferOptions();
                        if (options.H4) {
                            high.push(4);
                        }
                        if (options.H3) {
                            high.push(3);
                        }
                        if (options.L2) {
                            low.push(2);
                        }
                        if (options.L1) {
                            low.push(1);
                        }
                    }
                    const scout = high.length === 0 && low.length === 0 ? null : { high, low };
                    const interval = checkInterval.querySelector("select").value;
                    that.updateFilterDetails(name, params, scout, interval);
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
            div.appendChild(checkInterval);
            if (scoutText) {
                div.appendChild(useScout);
            }
            div.appendChild(datalist);
            div.appendChild(validation);
            div.appendChild(buttons);

            this.#replaceModalContent([div]);
        }

        #setFilterHitsInToolbar(total = -1) {
            // pass negative to create loading animation.
            const hits = document.getElementById("mazyar-transfer-filter-hits");
            if (hits) {
                if (total < 0) {
                    hits.replaceChildren(createLoadingIcon());
                } else {
                    hits.innerText = total > 100 ? "+100" : total.toString();
                    hits.style.color = total > 0 ? "cyan" : "white";
                }
            }
        }

        async #checkAllFilters(forced = false) {
            this.#setFilterHitsInToolbar(-1);
            const filters = this.#getCurrentFilters();
            let total = 0;
            for (const filter of filters) {
                let { totalHits: hits, lastCheck } = await this.getFilterHitsFromIndexedDb(filter.id);
                const needRefresh = this.#itsTimeToCheckFilter(filter, lastCheck);
                if (!filterHitsIsValid(hits) || forced || needRefresh) {
                    const { totalHits, scoutHits } = await this.#getFilterTotalHits(filter);
                    if (totalHits >= 0) {
                        hits = filter.scout ? scoutHits : totalHits;
                        await this.#setFilterHitsInIndexedDb(filter.id, totalHits, scoutHits);
                    }
                }
                total += hits;
            }
            this.#setFilterHitsInToolbar(total);
            return total;
        }

        async setInitialFiltersHitInToolbar() {
            await this.#checkAllFilters(false);
        }

        async displayTransferFilters() {
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
                const table = filtersViewCreateTable(filters);
                table.addEventListener("destroy", () => {
                    // remove 'delete all' button if no filter is left
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
                    const currency = getClubCurrency(doc);
                    const players = getClubPlayers(doc, currency);
                    const summary = squadGetPlayersInfo(players, sport);
                    const topPlayers = squadCreateTopPlayersTable(summary, currency, sport);
                    topPlayers.style.margin = "2px 5px";
                    topPlayers.style.padding = "0";

                    const header = createMzStyledTitle("MZY Squad Summary");
                    const button = createMzStyledButton("Close", "red");
                    button.onclick = () => {
                        mazyar.hideModal();
                    };
                    this.#replaceModalContent([header, topPlayers, button]);
                })
                .catch((error) => {
                    console.warn(error);
                });
        }

        #createFilterInfo(data = { name: "", scout: { high: [], low: [] }, count: "" }) {
            const info = document.createElement("div");
            const nameSpan = document.createElement("span");
            const scoutSpan = document.createElement("span");
            const countSpan = document.createElement("span");

            info.style.margin = "3px";
            info.style.padding = "3px";
            info.style.alignSelf = "flex-start";

            nameSpan.innerHTML = `<strong>Filter Name: </strong>${data.name}<br>`;
            scoutSpan.innerHTML = `<strong>Selected: ${this.#getSelectedScoutsOptionTextForFilter(data.scout)}<strong><br>`;
            countSpan.innerHTML = `<strong>Hit Count: </strong><span class="filter-count-span">${data.count}<span>`;

            info.appendChild(nameSpan);
            info.appendChild(scoutSpan);
            info.appendChild(countSpan);
            return info;
        }

        async displayFilterResults(filterId, filterInfo) {
            const div = document.createElement("div");

            const header = createMzStyledTitle("MZY Filter Results");
            const info = this.#createFilterInfo(filterInfo);
            const middle = document.createElement("div");
            const close = createMzStyledButton("Close", "red");

            div.classList.add("mazyar-flex-container");

            middle.style.flex = "1";
            middle.style.overflowY = "auto"; // make it scrollable
            middle.style.margin = "5px 2px";

            close.style.marginBottom = "1px";
            close.onclick = () => {
                this.hideModal();
                this.displayTransferFilters();
            };

            const players = await this.#getHitsFromIndexedDb(filterId);
            this.#displayLoading("MZY Filter Results");
            const jobs = [];
            for (const player of players) {
                const url = `https://www.managerzone.com/ajax.php?p=transfer&sub=transfer-search&sport=${this.#sport}&u=${player.pid}`;
                jobs.push(
                    fetch(url)
                        .then((resp) => resp.json())
                        .then((content) => {
                            return { playerId: player.pid, content };
                        })
                );
            }
            const searchResults = await Promise.all(jobs);
            let skills = [];
            const parser = new DOMParser();
            for (const result of searchResults) {
                const player = parser.parseFromString(result.content.players, "text/html").body.firstChild;
                if (!skills) {
                    skills = this.#extractSkillNamesFromPlayerInfo(player);
                }
                this.#markMaxedSkills(player);
                player.id = "";
                this.#fetchOrExtractPlayerScoutReport(player, skills).then(report => {
                    this.#colorizeSkills(player, report);
                });
                const a = player.querySelector("h2>div>a.subheader");
                if (a) {
                    a.href = `https://www.managerzone.com/?p=transfer&u=${result.playerId}`;
                    a.target = "_blank";
                    const tools = player.querySelector("td span.player_icon_placeholder.bid_button")?.parentNode;
                    if (tools) {
                        tools.style.display = "none";
                    }
                    player.querySelector("div.floatRight.transfer-control-area")?.classList.add("mazyar-transfer-control-area");
                    middle.appendChild(player);
                } else {
                    this.#removeHitFromIndexedDb(filterId, result.playerId);
                }
            }
            const noResult = middle.childNodes.length === 0;
            if (noResult) {
                middle.innerHTML = "<h3>No Players To Display</h3><span>Please refresh the filter to update hits.</span>";
                middle.style.padding = "10px";
                middle.style.textAlign = "center";
            } else {
                info.querySelector(".filter-count-span").innerText = middle.childNodes.length.toString();
            }

            div.appendChild(header);
            if (noResult) {
                div.appendChild(middle);
                div.appendChild(close);
            } else {
                div.appendChild(close);
                div.appendChild(info);
                div.appendChild(middle);
            }
            this.#replaceModalContent([div]);
        }

        async #displayPlayerComment(target, playerId) {
            this.#displayLoading("MZY Player Note");
            const header = createMzStyledTitle("MZY Player Note");
            const text = document.createElement("textarea");
            const cancel = createMzStyledButton("Cancel", "red");
            const save = createMzStyledButton("Save", "green");
            const buttons = document.createElement("div");

            buttons.classList.add("mazyar-flex-container-row");

            text.value = await this.#fetchPlayerCommentFromIndexedDb(playerId);
            text.classList.add("mazyar-player-comment-textarea");

            cancel.addEventListener("click", async () => {
                this.hideModal();
            });

            save.addEventListener("click", async () => {
                await this.#setPlayerCommentInIndexedDb(playerId, text.value);
                if (text.value) {
                    target?.classList.remove("mazyar-player-comment-icon-inactive");
                    target?.classList.add("mazyar-player-comment-icon-active");
                } else {
                    target?.classList.add("mazyar-player-comment-icon-inactive");
                    target?.classList.remove("mazyar-player-comment-icon-active");
                }
                this.hideModal();
            });

            buttons.appendChild(cancel);
            buttons.appendChild(save);

            this.#replaceModalContent([header, text, buttons]);
        }

        #getVersionNumbers(v) {
            return v.split('.').map((i) => Number(i));
        }

        #getVersionsOfChangelog(changelogs) {
            return Object.keys(changelogs).map((v) => this.#getVersionNumbers(v));
        }

        #isVersionLesserThan(version = [0, 0], base = [0, 0]) {
            return version[0] < base[0] ||
                (version[0] === base[0] && version[1] < base[1]);
        }

        #isVersionGreaterThan(version = [0, 0], base = [0, 0]) {
            return version[0] > base[0] ||
                (version[0] === base[0] && version[1] > base[1]);
        }

        #showChangelog() {
            const previousVersion = GM_getValue("previous_version", "");
            if (!previousVersion) {
                GM_setValue("previous_version", currentVersion);
                return;
            }
            const previous = this.#getVersionNumbers(previousVersion);
            const current = this.#getVersionNumbers(currentVersion);
            if (!this.#isVersionLesserThan(previous, current)) {
                return;
            }

            const headHTML = `<b>Mazyar</b> is updated<br>` +
                `from <b style="color: red;">v${previousVersion}</b><span> to </span><b style="color: blue;">v${currentVersion}</b>`;
            const head = document.createElement("div");
            head.innerHTML = headHTML;
            head.style.textAlign = "center";

            const changesTitle = document.createElement("div");
            changesTitle.innerHTML = `<b>Changelog:</b>`;
            changesTitle.style.margin = "5px";
            changesTitle.style.width = "100%";
            changesTitle.style.width = "100%";
            changesTitle.style.textAlign = "left";

            let changesHTML = '';
            const versions = this.#getVersionsOfChangelog(changelogs);
            for (const version of versions) {
                if (this.#isVersionGreaterThan(version, current)) {
                    continue;
                }
                if (this.#isVersionGreaterThan(version, previous)) {
                    const v = version.join('.');
                    changesHTML += `<div style="margin-bottom: 1rem;"><b>v${v}</b><ul style="margin: 0px 5px 5px;"><li>`
                        + changelogs[v]?.join("</li><li>") + "</li></ul></div>";
                }
            }
            const changes = document.createElement("div");
            changes.innerHTML = changesHTML;
            changes.style.maxHeight = "320px";
            changes.style.maxWidth = "320px";
            changes.style.paddingRight = "30px";
            changes.style.backgroundColor = "khaki";
            changes.style.padding = "5px";
            changes.style.flex = "1";
            changes.style.overflowY = "scroll"; // make it scrollable

            const text = document.createElement("div");
            text.classList.add("mazyar-flex-container");
            text.style.margin = "10px";
            text.style.padding = "5px";
            text.appendChild(head);
            text.appendChild(changesTitle);
            text.appendChild(changes);

            const header = createMzStyledTitle("MZY Notice");
            const close = createMzStyledButton("close", "green");

            close.addEventListener("click", async () => {
                GM_setValue("previous_version", currentVersion);
                this.hideModal();
            });

            this.#replaceModalContent([header, text, close]);
        }

        showPlayerInModal(playerView) {
            const player = document.createElement("div");
            player.style.margin = "5px";
            player.style.padding = "0px";
            player.style.backgroundColor = "wheat";
            player.appendChild(playerView);

            const header = createMzStyledTitle("MZY Player View");
            const close = createMzStyledButton("close", "green");

            close.addEventListener("click", async () => {
                this.hideModal();
            });

            this.#replaceModalContent([header, player, close]);
        }

        hideModal() {
            this.#modal.style.display = "none";
            this.#clearModalContent();
        }
    }

    /* *********************** Inject ********************************** */

    function isVisitingTeamPage() {
        const regex = /^\?((p=team)|(p=team&tid=\d+))$/g;
        return regex.test(document.location.search);
    }

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
            squadInjectInformationToSummary();
            squadInjectInformationToProfiles();
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
                mazyar.executeTransferTasks();
            }
        } else if (uri.search("/?p=clubhouse") > -1) {
            if (mazyar.mustHelpWithPredictor()) {
                predictorInject();
            }
        } else if (isVisitingTeamPage()) {
            addTrophyCountToClubPage();
        } else if (uri.search("/?p=trainers") > -1) {
            if (mazyar.mustAddCoachSalaries()) {
                trainersAddRequestedSalaries();
            }
        } else if (uri.search("/?p=training_report") > -1) {
            trainingAddCampOpenerToReport();
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
