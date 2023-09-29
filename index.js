// ==UserScript==
// @name         MZ Player Values
// @namespace    http://tampermonkey.net/
// @version      0.6
// @description  Add a table to show squad value in squad summary tab
// @author       z7z
// @license      MIT
// @grant        GM_xmlhttpRequest
// @connect      self
// @match        https://www.managerzone.com/?p=players&sub=alt
// @match        https://www.managerzone.com/?p=players&sub=alt&tid=*
// @match        https://www.managerzone.com/?p=federations&sub=clash*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=managerzone.com
// ==/UserScript==
(function () {
    "use strict";

    /* *********************** Squad Summary ********************************** */

    function formatBigNumber(number) {
        let numberString = number.toString();
        let formattedParts = [];
        for (let i = numberString.length - 1; i >= 0; i -= 3) {
            let part = numberString.substring(Math.max(i - 2, 0), i + 1);
            formattedParts.unshift(part);
        }
        return formattedParts.join(" ");
    }

    function createSquadTable(rows, currency) {
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
        return info;
    };

    function getCurrency(doc) {
        const playerNode = doc.getElementById("playerAltViewTable")?.querySelectorAll("tr");
        if (playerNode && playerNode.length > 1) {
            const valueText = playerNode[1].querySelector("td:nth-child(3)")?.innerText;
            const parts = valueText?.split(' ');
            return parts[parts.length - 1];
        }
        return '';
    }

    function getPlayers(doc, currency) {
        const players = [];
        const playerNodes = doc.getElementById("playerAltViewTable")?.querySelectorAll("tr");
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

    function createSquadSummary(doc) {
        const currency = getCurrency(doc);
        const rows = [];
        const players = getPlayers(doc, currency);
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
        return createSquadTable(rows, currency);
    }

    /* *********************** Clash ********************************** */

    function createModal() {
        const modalContent = document.createElement("div");
        modalContent.style.backgroundColor = "#fefefe";
        modalContent.style.margin = "15% auto";
        modalContent.style.padding = "20px";
        modalContent.style.border = "1px solid #888";
        modalContent.style.width = "15%";

        const divContent = document.createElement("div");
        divContent.id = "squad-display-modal-content";
        modalContent.appendChild(divContent);

        const modal = document.createElement("div");
        modal.style.display = "none";
        modal.style.position = "fixed";
        modal.style.zIndex = "1";
        modal.style.left = "0";
        modal.style.top = "0";
        modal.style.width = "100%";
        modal.style.height = "100%";
        modal.style.overflow = "auto";
        modal.style.backgroundColor = "rgba(0, 0, 0, 0.4)";
        modal.id= "squad-display-modal";
        modal.appendChild(modalContent);
        modal.onclick = () => {
            modal.style.display = "none";
        };
        document.body.appendChild(modal);
    }

    function extractTeamID(link) {
        let regex = /tid=(\d+)/;
        let match = regex.exec(link);
        if (match) {
            return match[1];
        } else {
            return null;
        }
    }

    function displayOnModal(url) {
        const modal = document.getElementById('squad-display-modal');
        const divContent = document.getElementById('squad-display-modal-content');
        divContent.innerHTML = 'loading...';
        modal.style.display = "block";
        GM_xmlhttpRequest({
            method: "GET",
            url,
            onload: function (resp) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(resp.responseText, "text/html");
                const content = createSquadSummary(doc);
                divContent.innerHTML = content.innerHTML;
            }
        });
    }

    function getSquadSummaryLink(url) {
        const tid = extractTeamID(url);
        return `https://www.managerzone.com/?p=players&sub=alt&tid=${tid}`;
    }

    function addButton(target) {
        const url = getSquadSummaryLink(target.href);
        const button = document.createElement('button');
        button.innerText = `S`;
        button.style.marginLeft = "10px";
        button.style.backgroundColor = "yellow";
        button.style.color = "darkred";
        button.style.borderRadius = "50%";
        button.style.border = "dotted 2px black";
        button.style.fontWeigth = "bold";
        button.style.fontSize = "1.2em";
        button.style.width = "20px";
        button.style.heigth = "20px";
        button.style.textAlign = "center";
        target.parentNode.appendChild(button);
        button.onclick = () => {
            displayOnModal(url);
        };
    }

    function addSquadButtonsToClashPage(){
        const teams = document.querySelectorAll('a.team-name');
        for (const team of teams) {
            addButton(team);
        }
    }

    /* *********************** Inject ********************************** */

    function inject() {
        if(document.baseURI.search('/?p=federations&sub=clash') > -1) {
            createModal();
            addSquadButtonsToClashPage();
        } else {
            const content = createSquadSummary(document);
            const place = document.querySelector("table#playerAltViewTable");
            if (place) {
                place.parentNode?.insertBefore(content, place);
            }
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
