// ==UserScript==
// @name         MZ Player Values
// @namespace    http://tampermonkey.net/
// @version      0.9
// @description  Add a table to show squad value in squad summary tab
// @author       z7z
// @license      MIT
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      self
// @match        https://www.managerzone.com/?p=players&sub=alt
// @match        https://www.managerzone.com/?p=players&sub=alt&tid=*
// @match        https://www.managerzone.com/?p=federations&sub=clash*
// @match        https://www.managerzone.com/?p=federations
// @match        https://www.managerzone.com/?p=federations&fid=*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=managerzone.com
// ==/UserScript==
(function () {
    "use strict";

    /* *********************** Styles ********************************** */

    GM_addStyle(`
    .donut {
        width: 1.7em;
        height: 1.7em;
        margin-left: 5px;
        border-radius: 50%;
        text-align: center;
        font-weigth = bold;
        font-size = 1.2em;
        padding: 3px;
        background-color: yellow;
        color: yellow;
    }

    .final-donut {
        border: rgb(213, 232, 44) solid 2px;
        color: inherit;
        padding:0;
    }

    .loading-donut {
        border-bottom-color: rgb(213, 232, 44);
        animation: 1.5s donut-spin infinite linear;
    }

    @keyframes donut-spin {
        to {
            transform: rotate(360deg);
        }
    }
    `);

    /* *********************** Squad Summary ********************************** */

    function formatBigNumber(n, sep = " ") {
        let numberString = n.toString();
        let formattedParts = [];
        for (let i = numberString.length - 1; i >= 0; i -= 3) {
            let part = numberString.substring(Math.max(i - 2, 0), i + 1);
            formattedParts.unshift(part);
        }
        return formattedParts.join(sep);
    }

    function createSquadTable(rows, currency) {
        const table = document.createElement("table");
        table.classList.add("tablesorter", "hitlist", "marker", "hitlist-compact-list-included");
        table.width = "30%";
        table.cellSpacing = "1px";
        table.cellPadding = "3px";
        table.border = "0";
        table.align = "center";

        const titleHeader = document.createElement("th");
        titleHeader.align = "center";
        titleHeader.classList.add("header");
        titleHeader.innerText = "Group";
        const valueHeader = document.createElement("th");
        valueHeader.align = "center";
        valueHeader.classList.add("header");
        valueHeader.innerHTML = "Values";
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
            value.style.textAlign = "end";
            value.width = "e";
            tr.appendChild(title);
            tr.appendChild(value);
            tbody.appendChild(tr);
        }
        table.appendChild(tbody);

        const info = document.createElement("div");
        info.appendChild(table);
        info.style = "margin: 10px 0px";
        return info;
    }

    function getCurrency(doc) {
        const playerNode = doc.getElementById("playerAltViewTable")?.querySelectorAll("tr");
        if (playerNode && playerNode.length > 1) {
            const valueText = playerNode[1].querySelector("td:nth-child(3)")?.innerText;
            const parts = valueText?.split(" ");
            return parts[parts.length - 1];
        }
        return "";
    }

    function getPlayers(doc, currency) {
        const players = [];
        const playerNodes = doc.getElementById("playerAltViewTable")?.querySelectorAll("tr");
        for (const playerNode of [...playerNodes]) {
            const age = playerNode.querySelector("td:nth-child(5)")?.innerText.replace(/\s/g, "");
            if (age) {
                const value = playerNode
                    .querySelector("td:nth-child(3)")
                    ?.innerText.replaceAll(currency, "")
                    .replace(/\s/g, "");
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
        modal.id = "squad-display-modal";
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
        const modal = document.getElementById("squad-display-modal");
        const divContent = document.getElementById("squad-display-modal-content");
        divContent.innerHTML = "loading...";
        modal.style.display = "block";
        GM_xmlhttpRequest({
            method: "GET",
            url,
            onload: function (resp) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(resp.responseText, "text/html");
                const content = createSquadSummary(doc);
                divContent.innerHTML = content.innerHTML;
            },
        });
    }

    function getSquadSummaryLink(url) {
        const tid = extractTeamID(url);
        return `https://www.managerzone.com/?p=players&sub=alt&tid=${tid}`;
    }

    function getTopEleven(doc) {
        const currency = getCurrency(doc);
        const rows = [];
        const players = getPlayers(doc, currency);
        return players ? getTopPlayers(players, 11) : 0;
    }

    function calculateRankOfTeams(teams) {
        const finals = [];
        for (const team of teams) {
            const url = getSquadSummaryLink(team.href);
            finals.push({
                target: team,
                url,
                values: 0,
                done: false,
            });
            GM_xmlhttpRequest({
                method: "GET",
                url,
                onload: function (resp) {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(resp.responseText, "text/html");
                    const values = getTopEleven(doc);
                    const fin = finals.find((p) => resp.finalUrl === p.url);
                    fin.values = values;
                    fin.done = true;
                },
            });
        }

        let timeout = 16000;
        const step = 1000;
        let interval = setInterval(() => {
            if (finals.every((a) => a.done)) {
                clearInterval(interval);
                finals.sort((a, b) => b.values - a.values);
                let rank = 0;
                for (const team of finals) {
                    rank++;
                    const target = team.target.parentNode.querySelector("button.donut");
                    target.classList.remove("loading-donut");
                    target.classList.add("final-donut");
                    target.innerText = `${rank}`;
                }
            } else {
                timeout -= step;
                if (timeout < 0) {
                    clearInterval(interval);
                    for (const team of finals) {
                        const target = team.target.parentNode.querySelector("button.donut");
                        target.classList.remove("loading-donut");
                        target.classList.add("final-donut");
                        target.innerText = `-`;
                    }
                }
            }
        }, step);
    }

    function addSquadButton(target) {
        const url = getSquadSummaryLink(target.href);
        const button = document.createElement("button");
        button.classList.add("donut", "final-donut");
        button.innerText = `S`;
        button.style.color = "inherit";
        target.parentNode.appendChild(button);
        button.onclick = () => {
            displayOnModal(url);
        };
    }

    function addRankView(target) {
        const url = getSquadSummaryLink(target.href);
        const rank = document.createElement("button");
        rank.innerText = "_";
        rank.classList.add("donut", "loading-donut");
        target.parentNode.appendChild(rank);
    }

    function addSquadButtonsToClashPage() {
        const teams = document.querySelectorAll("a.team-name");
        for (const team of teams) {
            addRankView(team);
            addSquadButton(team);
        }
        calculateRankOfTeams(teams);
    }

    /* *********************** Sort ********************************** */

    function fetchTopEleven(context, tid) {
        const url = `https://www.managerzone.com/?p=players&sub=alt&tid=${tid}`;
        GM_xmlhttpRequest({
            method: "GET",
            url,
            context,
            onload: function (resp) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(resp.responseText, "text/html");
                const team = resp.context.teams.find((t) => t.username === resp.context.username);
                const currency = getCurrency(doc);
                team.values = getTopEleven(doc);
                const value = document.createElement("div");
                value.style.color = "blue";
                //value.style.textAlign = 'left';
                value.style.float = "inline-start";
                value.innerText = `Top Eleven: ${formatBigNumber(team.values, ",")} ${currency}`;
                team.node.querySelector("td").appendChild(value);
                team.done = true;
            },
        });
    }

    async function fetchTeamValue(teams, username) {
        const url = `https://www.managerzone.com/xml/manager_data.php?username=${username}`;
        GM_xmlhttpRequest({
            method: "GET",
            url: url,
            context: { teams, username },
            onload: function (resp) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(resp.responseText, "text/xml");
                const teamId = doc.querySelector('Team[sport="soccer"]').getAttribute("teamId");
                fetchTopEleven(resp.context, teamId);
            },
        });
    }

    function getUsername(node) {
        return node.querySelector("a").innerText;
    }

    function getTableHeader() {
        const thead = document.querySelector("#federation_clash_members_list thead td");
        return thead.innerText;
    }

    function setTableHeader(text) {
        const thead = document.querySelector("#federation_clash_members_list thead td");
        thead.innerText = text;
    }

    function sortByTopEleven() {
        console.log("sorting in progress");
        const tbody = document.querySelector("#federation_clash_members_list tbody");

        const teams = [];
        for (const child of tbody.children) {
            const username = getUsername(child);
            teams.push({
                node: child,
                username,
                teamId: "",
                values: 0,
                done: false,
            });
            fetchTeamValue(teams, username);
        }

        let timeout = 60000;
        const step = 1000;
        const tableHeader = getTableHeader();
        let dots = 0;
        let interval = setInterval(() => {
            if (teams.every((t) => t.done)) {
                clearInterval(interval);
                teams.sort((a, b) => b.values - a.values);
                const newOrder = teams.map((t) => t.node);
                tbody.replaceChildren(...newOrder);
                console.log("done");
                setTableHeader(tableHeader + " ▼");
            } else {
                timeout -= step;
                setTableHeader(tableHeader + " " + ".".repeat(1 + (dots % 3)));
                dots++;
                if (timeout < 0) {
                    clearInterval(interval);
                    setTableHeader(tableHeader + " (failed)");
                    console.log("timeout");
                }
            }
        }, step);
    }

    /* *********************** Inject ********************************** */

    function isFederationFrontPage(uri) {
        return uri.endsWith("/?p=federations") || uri.search("/?p=federations&fid=") > -1;
    }

    function inject() {
        if (document.baseURI.search("/?p=federations&sub=clash") > -1) {
            createModal();
            addSquadButtonsToClashPage();
        } else if (isFederationFrontPage(document.baseURI)) {
            sortByTopEleven();
        } else if (document.baseURI.search("/?p=players&sub=alt") > -1) {
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
