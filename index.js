// ==UserScript==
// @name         MZ Player Values
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Add a table to show squad value in squad summary tab
// @author       z7z
// @license      MIT
// @match        https://www.managerzone.com/?p=players&sub=alt
// @match        https://www.managerzone.com/?p=players&sub=alt&tid=*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=managerzone.com
// @grant        none
// ==/UserScript==
(function () {
    "use strict";

    function formatBigNumber(number) {
        let numberString = number.toString();
        let formattedParts = [];
        for (let i = numberString.length - 1; i >= 0; i -= 3) {
            let part = numberString.substring(Math.max(i - 2, 0), i + 1);
            formattedParts.unshift(part);
        }
        return formattedParts.join(" ");
    }

    function insertAsTable(rows, currency) {
        const table = document.createElement("table");
        table.classList.add("tablesorter", "hitlist", "marker", "hitlist-compact-list-included");
        table.width = "30%";
        table.cellSpacing = "1px";
        table.cellPadding = "3px";
        table.border = "0";
        table.align = 'center';

        const titleHeader = document.createElement("th");
        titleHeader.align = "center";
        titleHeader.classList.add("header");
        titleHeader.innerText = "Group";
        const valueHeader = document.createElement("th");
        valueHeader.align = "center";
        valueHeader.classList.add("header");
        valueHeader.innerHTML = 'Values';
        const thead = document.createElement("thead");
        thead.appendChild(titleHeader);
        thead.appendChild(valueHeader);
        table.appendChild(thead);

        const tbody = document.createElement("tbody");
        for (const row of rows) {
            const tr = document.createElement("tr");
            const title = document.createElement("td");
            title.innerHTML = `${row.title}`;
            const value = document.createElement("td");
            value.innerText = `${formatBigNumber(row.value)} ${currency}`;
            value.style.textAlign = 'end';
            value.width = 'e';
            tr.appendChild(title);
            tr.appendChild(value);
            tbody.appendChild(tr);
        }
        table.appendChild(tbody);

        const info = document.createElement("div");
        info.appendChild(table);
        info.style = "margin: 10px 0px";
        const place = document.querySelector("table#playerAltViewTable");
        if (place) {
            place.parentNode?.insertBefore(info, place);
        }
    };

    function getCurrency() {
        const playerNode = document.getElementById("playerAltViewTable")?.querySelectorAll("tr");
        if (playerNode && playerNode.length > 1) {
            const valueText = playerNode[1].querySelector("td:nth-child(3)")?.innerText;
            const parts = valueText?.split(' ');
            return parts[parts.length - 1];
        }
        return '';
    }

    function getPlayers(currency) {
        const players = [];
        const playerNodes = document.getElementById("playerAltViewTable")?.querySelectorAll("tr");
        for (const playerNode of [...playerNodes]) {
            const age = playerNode.querySelector("td:nth-child(5)")?.innerText.replace(/\s/g, "");
            if (age) {
                const value = playerNode.querySelector("td:nth-child(3)")?.innerText.replaceAll(currency, "").replace(/\s/g, "");
                const shirtNumber = playerNode.querySelector("td:nth-child(0)")?.innerText.replace(/\s/g, "");
                players.push({
                    shirtNumber,
                    age: parseInt(age, 10),
                    value: parseInt(value, 10),
                });
            }
        }
        console.log(players.length);
        console.log(players);
        return players;
    }

    function getTotal(players) {
        const values = players.map((player) => player.value);
        return values.reduce((a, b) => a + b, 0);
    }

    function getTopPlayers(players, count, ageLow = 0, ageHigh = 99) {
        return players
            .filter((player) => player.age <= ageHigh && player.age >= ageLow)
            .sort((a, b) => b.value - a.value)
            .slice(0, count)
            .map((player) => player.value)
            .reduce((a, b) => a + b, 0);
    }

    function inject() {
        const currency = getCurrency();
        const rows = [];
        const players = getPlayers(currency);
        if (players) {
            rows.push({
                title: "All",
                value: getTotal(players),
            });
            rows.push({
                title: "Top 16 - All",
                value: getTopPlayers(players, 16),
            });
            rows.push({
                title: "Top 11 - All",
                value: getTopPlayers(players, 11),
            });

            rows.push({
                title: "Top 16 - U23",
                value: getTopPlayers(players, 16, 0, 23),
            });
            rows.push({
                title: "Top 11 - U23",
                value: getTopPlayers(players, 11, 0, 23),
            });
            rows.push({
                title: "Top 16 - U21",
                value: getTopPlayers(players, 16, 0, 21),
            });
            rows.push({
                title: "Top 11 - U21",
                value: getTopPlayers(players, 11, 0, 21),
            });
            rows.push({
                title: "Top 16 - U18",
                value: getTopPlayers(players, 16, 0, 18),
            });
            rows.push({
                title: "Top 11 - U18",
                value: getTopPlayers(players, 11, 0, 18),
            });
        }
        insertAsTable(rows, currency);
    }

    if (document.readyState === "loading") {
        // Loading hasn't finished yet
        document.addEventListener("DOMContentLoaded", inject);
    } else {
        // `DOMContentLoaded` has already fired
        inject();
    }
})();
