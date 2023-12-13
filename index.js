// ==UserScript==
// @name         MZ Player Values
// @namespace    http://tampermonkey.net/
// @version      0.28
// @description  Add Squad Value to some pages
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
// @match        https://www.managerzone.com/?p=match&sub=result&mid=*
// @match        https://www.managerzone.com/?p=league*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=managerzone.com
// @downloadURL https://update.greasyfork.org/scripts/476290/MZ%20Player%20Values.user.js
// @updateURL https://update.greasyfork.org/scripts/476290/MZ%20Player%20Values.meta.js
// ==/UserScript==
(function () {
    "use strict";

    /* *********************** Styles ********************************** */

    GM_addStyle(`

    table.squad-summary tbody td, table.squad-summary thead th {
        padding: 0.3em 0.5em;
    }

    .donut {
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

    /* *********************** Utils ********************************** */

    function getSportType(doc = document) {
        const zone = doc.querySelector("a#shortcut_link_thezone");
        if (zone) {
            return zone.href.indexOf("hockey") > -1 ? "hockey" : "soccer";
        }
        return "soccer";
    }

    function isNationalTeam(teamTable) {
        const images = teamTable.getElementsByTagName("img");
        if (images) {
            return [...images].some((img) => img.src.endsWith("mz.png"));
        }
        return false;
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

    function extractTeamID(link) {
        const regex = /tid=(\d+)/;
        const match = regex.exec(link);
        return match ? match[1] : null;
    }

    function extractPlayerID(link) {
        const regex = /pid=(\d+)/;
        const match = regex.exec(link);
        return match ? match[1] : null;
    }

    function formatBigNumber(n, sep = " ") {
        const numberString = n.toString();
        let formattedParts = [];
        for (let i = numberString.length - 1; i >= 0; i -= 3) {
            let part = numberString.substring(Math.max(i - 2, 0), i + 1);
            formattedParts.unshift(part);
        }
        return formattedParts.join(sep);
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
                const value = playerNode
                .querySelector("td:nth-child(3)")
                ?.innerText.replaceAll(currency, "")
                .replace(/\s/g, "");
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
                const selector = isDomesticPlayer(infoTable)
                ? "tbody tr:nth-child(5) td span"
                : "tbody tr:nth-child(6) td span";
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

    /* *********************** Squad Summary ********************************** */

    function filterPlayers(players, count = 0, ageLow = 0, ageHigh = 99) {
        if(players.length === 0) {
            return { values: 0, avgAge: 0.0 };
        }

        const n = count === 0 ? players.length : count;
        const filtered = players
        .filter((player) => player.age <= ageHigh && player.age >= ageLow)
        .sort((a, b) => b.value - a.value)
        .slice(0, n);
        if(filtered.length === 0) {
            return {values: 0, avgAge: 0.0};
        }

        const values = filtered.map((player) => player.value).reduce((a, b) => a + b, 0);
        const avgAge = filtered.map((player) => player.age).reduce((a, b) => a + b, 0) / filtered.length;
        return { values, avgAge };
    }

    function getNumberOfPlayers(players, ageLow = 0, ageHigh = 99) {
        return players.filter((player) => player.age <= ageHigh && player.age >= ageLow).length;
    }

    function getSquadSummary(players, currency = "USD", sport = "soccer") {
        const rows = [];
        if (players) {
            if (sport === "hockey") {
                rows.push({
                    title: "All",
                    count: players.length,
                    all: filterPlayers(players).values,
                    top21: filterPlayers(players, 21).values,
                });
                rows.push({
                    title: "U23",
                    count: getNumberOfPlayers(players, 0, 23),
                    all: filterPlayers(players, 0, 0, 23).values,
                    top21: filterPlayers(players, 21, 0, 23).values,
                });
                rows.push({
                    title: "U21",
                    count: getNumberOfPlayers(players, 0, 21),
                    all: filterPlayers(players, 0, 0, 21).values,
                    top21: filterPlayers(players, 21, 0, 21).values,
                });
                rows.push({
                    title: "U18",
                    count: getNumberOfPlayers(players, 0, 18),
                    all: filterPlayers(players, 0, 0, 18).values,
                    top21: filterPlayers(players, 21, 0, 18).values,
                });
            } else {
                rows.push({
                    title: "All",
                    count: players.length,
                    all: filterPlayers(players).values,
                    top16: filterPlayers(players, 16).values,
                    top11: filterPlayers(players, 11).values,
                });
                rows.push({
                    title: "U23",
                    count: getNumberOfPlayers(players, 0, 23),
                    all: filterPlayers(players, 0, 0, 23).values,
                    top16: filterPlayers(players, 16, 0, 23).values,
                    top11: filterPlayers(players, 11, 0, 23).values,
                });
                rows.push({
                    title: "U21",
                    count: getNumberOfPlayers(players, 0, 21),
                    all: filterPlayers(players, 0, 0, 21).values,
                    top16: filterPlayers(players, 16, 0, 21).values,
                    top11: filterPlayers(players, 11, 0, 21).values,
                });
                rows.push({
                    title: "U18",
                    count: getNumberOfPlayers(players, 0, 18),
                    all: filterPlayers(players, 0, 0, 18).values,
                    top16: filterPlayers(players, 16, 0, 18).values,
                    top11: filterPlayers(players, 11, 0, 18).values,
                });
            }
        }
        return rows;
    }

    function createCompactElement(title, value){
        const dd = document.createElement("dd");
        dd.innerHTML = `<span class="listHeadColor">${title}</span><span class="clippable">${value}</span>`;
        return dd;
    }

    function createCompactSquadRow(row, currency = "USD", sport = "soccer") {
        const dl = document.createElement("dl");
        dl.classList.add("hitlist-compact-list", "columns");

        dl.appendChild(createCompactElement("Count", row.count));
        dl.appendChild(createCompactElement("Total", `${formatBigNumber(row.all)} ${currency}`));
        if (sport == "soccer") {
            dl.appendChild(createCompactElement("Top 16", `${formatBigNumber(row.top16)} ${currency}`));
            dl.appendChild(createCompactElement("Top 11", `${formatBigNumber(row.top11)} ${currency}`));
        } else {
            dl.appendChild(createCompactElement("Top 21", `${formatBigNumber(row.top21)} ${currency}`));
        }
        return dl;
    }

    function createSquadTable(rows, currency = "USD", sport = "soccer") {
        const table = document.createElement("table");
        table.classList.add("squad-summary");

        const thead = document.createElement("thead");
        table.appendChild(thead);

        const tr = document.createElement("tr");
        thead.appendChild(tr);

        const titleHeader = document.createElement("th");
        tr.appendChild(titleHeader);
        titleHeader.classList.add("header");
        titleHeader.innerText = "Group";
        titleHeader.style.textAlign = "center";
        titleHeader.style.textDecoration = "none";

        const countHeader = document.createElement("th");
        tr.appendChild(countHeader);
        countHeader.classList.add("header");
        countHeader.innerText = "Count";
        countHeader.title = "Number of Players";
        countHeader.style.textAlign = "center";
        countHeader.style.textDecoration = "none";

        const totalHeader = document.createElement("th");
        tr.appendChild(totalHeader);
        totalHeader.classList.add("header");
        totalHeader.innerHTML = "Total";
        totalHeader.title = "Total Value of Players";
        totalHeader.style.textAlign = "center";
        totalHeader.style.textDecoration = "none";

        if (sport === "soccer") {
            const top16Header = document.createElement("th");
            tr.appendChild(top16Header);
            top16Header.classList.add("header");
            top16Header.innerHTML = "Top 16";
            top16Header.title = "Value of Top 16 Players";
            top16Header.style.textAlign = "center";
            top16Header.style.textDecoration = "none";

            const top11Header = document.createElement("th");
            tr.appendChild(top11Header);
            top11Header.classList.add("header");
            top11Header.innerHTML = "Top 11";
            top11Header.title = "Value of Top 11 Players";
            top11Header.style.textAlign = "center";
            top11Header.style.textDecoration = "none";
        } else {
            const top21Header = document.createElement("th");
            tr.appendChild(top21Header);
            top21Header.classList.add("header");
            top21Header.innerHTML = "Top 21";
            top21Header.title = "Value of Top 21 Players";
            top21Header.style.textAlign = "center";
            top21Header.style.textDecoration = "none";
        }

        const tbody = document.createElement("tbody");
        table.appendChild(tbody);

        for (const row of rows) {
            const tr = document.createElement("tr");
            tbody.appendChild(tr);

            const title = document.createElement("td");
            title.innerHTML = `${row.title}`;
            title.classList.add("hitlist-compact-list-column");
            tr.appendChild(title);
            const compact = createCompactSquadRow(row, currency, sport);
            title.appendChild(compact);

            const count = document.createElement("td");
            count.innerHTML = `${row.count}`;
            count.style.textAlign = "center";
            tr.appendChild(count);

            const all = document.createElement("td");
            all.innerText = `${formatBigNumber(row.all)} ${currency}`;
            all.style.textAlign = "end";
            tr.appendChild(all);

            if (sport === "soccer") {
                const top16 = document.createElement("td");
                top16.innerText = `${formatBigNumber(row.top16)} ${currency}`;
                top16.style.textAlign = "end";
                tr.appendChild(top16);

                const top11 = document.createElement("td");
                top11.innerText = `${formatBigNumber(row.top11)} ${currency}`;
                top11.style.textAlign = "end";
                tr.appendChild(top11);
            } else {
                const top21 = document.createElement("td");
                tr.appendChild(top21);
                top21.innerText = `${formatBigNumber(row.top21)} ${currency}`;
                top21.style.textAlign = "end";
            }
        }

        return table;
    }

    function injectToSquadSummaryPage() {
        const sport = getSportType(document);
        const currency = getCurrency(document);
        const players = getPlayers(document, currency);
        const summary = getSquadSummary(players, currency, sport);
        const table = createSquadTable(summary, currency, sport);

        table.classList.add("tablesorter", "hitlist", "marker", "hitlist-compact-list-included");
        table.style.borderSpacing = 0;
        table.style.marginBottom = "10px";
        table.align = "center";

        const place = document.querySelector("table#playerAltViewTable");
        if (place) {
            place.parentNode?.insertBefore(table, place);
        }
    }

    /* *********************** Clash ********************************** */

    function createModal() {
        const modal = document.createElement("div");
        document.body.appendChild(modal);

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
        modal.onclick = () => {
            modal.style.display = "none";
        };

        const modalContent = document.createElement("div");
        modal.appendChild(modalContent);
        modalContent.style.margin = "15% auto";
        modalContent.style.padding = "20px";

        const divContent = document.createElement("div");
        modalContent.appendChild(divContent);
        divContent.id = "squad-display-modal-content";
    }

    function displayOnModal(url) {
        const divContent = document.getElementById("squad-display-modal-content");

        const loading = document.createElement("p");
        divContent.replaceChildren(loading);
        loading.innerText = "loading...";
        loading.style.width = "fit-content";
        loading.style.textAlign = "center";
        loading.style.backgroundColor = "#fefefe";
        loading.style.padding = "0.5em";

        const modal = document.getElementById("squad-display-modal");
        modal.style.display = "flex";
        modal.style.alignItems = "center";
        modal.style.justifyContent = "center";

        GM_xmlhttpRequest({
            method: "GET",
            url,
            onload: function (resp) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(resp.responseText, "text/html");
                const sport = getSportType(doc);
                const currency = getCurrency(doc);
                const players = getPlayers(doc, currency);
                const summary = getSquadSummary(players, currency, sport);
                const table = createSquadTable(summary, currency, sport);
                table.classList.add("tablesorter", "hitlist", "marker", "hitlist-compact-list-included");
                table.style.width = "auto";
                table.align = "center";
                table.style.backgroundColor = "#fefefe";
                table.style.padding = "0.5em";

                const target = document.getElementById("squad-display-modal-content");
                target.replaceChildren(table);
            },
        });
    }

    function getSquadSummaryLink(url) {
        const tid = extractTeamID(url);
        return `https://www.managerzone.com/?p=players&sub=alt&tid=${tid}`;
    }

    function getTopPlyers(doc) {
        const currency = getCurrency(doc);
        const players = getPlayers(doc, currency);
        const sport = getSportType(doc);
        const count = sport === "soccer" ? 11 : 21;
        return players ? filterPlayers(players, count).values : 0;
    }

    function calculateRankOfTeams() {
        const tbody = document.querySelector("div.panel-2 table tbody");
        const rows = tbody.querySelectorAll("tr");
        const teams = document.querySelectorAll("a.team-name");
        const finals = [];
        let i = 0;
        for (const team of teams) {
            const url = getSquadSummaryLink(team.href);
            finals.push({
                target: team,
                row: rows[i],
                url,
                values: 0,
                done: false,
                currency: "",
            });
            i++;
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

        let timeout = 16000;
        const step = 1000;
        let interval = setInterval(() => {
            if (finals.every((a) => a.done)) {
                clearInterval(interval);
                finals.sort((a, b) => b.values - a.values);
                let rank = 0;
                for (const team of finals) {
                    rank++;
                    team.row.className = rank % 2 ? "odd" : "even";
                    const target = team.row.querySelector("button.donut.rank");
                    target.classList.remove("loading-donut");
                    target.classList.add("final-donut");
                    target.innerText = `${rank}`;

                    const value = team.row.querySelector("td.value");
                    value.innerText = `${formatBigNumber(team.values, ",")} ${team.currency}`;
                }
                const newOrder = finals.map((t) => t.row);
                tbody.replaceChildren(...newOrder);
            } else {
                timeout -= step;
                if (timeout < 0) {
                    clearInterval(interval);
                    for (const team of finals) {
                        const target = team.row.querySelector("button.donut.rank");
                        target.classList.remove("loading-donut");
                        target.classList.add("final-donut");
                        target.innerText = `-`;

                        const value = team.row.querySelector("td.value");
                        value.innerText = `N/A`;
                    }
                }
            }
        }, step);
    }

    function addRankView(target) {
        const value = document.createElement("td");
        value.innerText = "";
        value.classList.add("value");
        value.style.textAlign = "right";
        target.insertBefore(value, target.firstChild);

        const rank = document.createElement("td");
        const button = document.createElement("button");
        button.innerText = "_";
        button.classList.add("donut", "loading-donut", "rank");
        button.title = "Click to see squad summary";
        rank.appendChild(button);
        target.insertBefore(rank, target.firstChild);

        const name = target.querySelector("a.team-name");
        const url = getSquadSummaryLink(name.href);
        button.onclick = () => {
            displayOnModal(url);
        };
    }

    function injectToClashPage() {
        createModal();

        const table = document.querySelector("table.hitlist.challenges-list");

        const headers = table.querySelector("thead tr");
        const value = document.createElement("th");
        value.style.textAlign = "right";
        value.innerText = "Values";
        value.style.width = "15%";
        headers.insertBefore(value, headers.firstChild);

        const rank = document.createElement("th");
        rank.innerText = "Rank";
        rank.style.width = "5%";
        headers.insertBefore(rank, headers.firstChild);

        const teams = table.querySelectorAll("tbody tr");
        for (const team of teams) {
            addRankView(team);
        }
        calculateRankOfTeams();
    }

    /* *********************** Federation Page ********************************** */

    function fetchTopPlayers(context, tid) {
        const url = `https://www.managerzone.com/?p=players&sub=alt&tid=${tid}`;
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
                name.style.marginTop = "3px";
                name.title = team.name;
                const teamName = team.name.length > 20 ? team.name.substring(0, 16) + " >>>" : team.name;
                name.innerHTML = `<span style="color:red;">Team: </span>${teamName}`;
                team.node.querySelector("td").appendChild(name);

                const value = document.createElement("div");
                value.style.color = "blue";
                value.style.width = "100%";
                value.style.marginTop = "3px";
                const count = resp.context.sport === "soccer" ? 11 : 21;
                value.innerHTML =
                    `<span style="color:red;">Top${count}: </span>` +
                    `${formatBigNumber(team.values, ",")} ${team.currency}`;
                team.node.querySelector("td").appendChild(value);

                team.done = true;
            },
        });
    }

    async function fetchTeamValue(sport, teams, username) {
        const url = `https://www.managerzone.com/xml/manager_data.php?username=${username}`;
        GM_xmlhttpRequest({
            method: "GET",
            url: url,
            context: { sport, teams, username },
            onload: function (resp) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(resp.responseText, "text/xml");
                const teamId = doc.querySelector(`Team[sport="${resp.context.sport}"]`).getAttribute("teamId");
                const name = doc.querySelector(`Team[sport="${resp.context.sport}"]`).getAttribute("teamName");
                resp.context.teams.find((t) => t.username === resp.context.username).name = name;
                fetchTopPlayers(resp.context, teamId);
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

    function sortFederationTeamsByTopPlayers() {
        const tbody = document.querySelector("#federation_clash_members_list tbody");
        const sport = getSportType();
        const teams = [];
        for (const child of tbody.children) {
            const username = getUsername(child);
            teams.push({
                node: child,
                username,
                name,
                teamId: "",
                values: 0,
                currency: "",
                done: false,
            });
            fetchTeamValue(sport, teams, username);
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
                let rank = 0;
                for (const row of newOrder) {
                    rank++;
                    row.className = rank % 2 ? "odd" : "even";
                }
                tbody.replaceChildren(...newOrder);
                setTableHeader(tableHeader + " ▼");

                let totalValue = 0;
                for (const team of teams) {
                    totalValue += team.values;
                }

                const total = document.createElement("tr");
                total.style.color = "blue";
                total.style.width = "100%";
                total.style.marginTop = "3px";
                total.innerHTML =
                    `<td><hr><span style="color:red;">Total: </span>` +
                    `${formatBigNumber(totalValue, ",")} ${teams[0].currency}</td>`;
                tbody.appendChild(total);
            } else {
                timeout -= step;
                setTableHeader(tableHeader + " " + ".".repeat(1 + (dots % 3)));
                dots++;
                if (timeout < 0) {
                    clearInterval(interval);
                    setTableHeader(tableHeader + " (failed)");
                }
            }
        }, step);
    }

    /* *********************** Match ********************************** */

    function getLineupPlayers(teamNode, teamPlayers, sport) {
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

    function injectLineupValues(players, team, currency, sport) {
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

        const lineupValue = getLineupPlayers(team, players, sport)
        .filter((player) => player.starting && !player.exPlayer)
        .map((player) => player.value)
        .reduce((a, b) => a + b, 0);

        const div = document.createElement("div");
        div.innerHTML =
            `${sport === "soccer" ? "Starting " : ""}Lineup Value: ` +
            `<b>${formatBigNumber(lineupValue, ",")}</b> ${currency}` +
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

    function addLineupValuesNational(team, sport) {
        const teamLink = team.querySelector("a").href;
        const tid = extractTeamID(teamLink);
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

                injectLineupValues(players, team, currency, sport);
            },
        });
    }

    function addLineupValues(team, sport) {
        const teamLink = team.querySelector("a").href;
        const tid = extractTeamID(teamLink);
        const url = `https://www.managerzone.com/?p=players&sub=alt&tid=${tid}`;
        GM_xmlhttpRequest({
            method: "GET",
            url,
            context: { team, sport },
            onload: function (resp) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(resp.responseText, "text/html");
                const currency = getCurrency(doc);
                const players = getPlayers(doc, currency);
                const team = resp.context.team;
                const sport = resp.context.sport;

                injectLineupValues(players, team, currency, sport);
            },
        });
    }

    function injectTeamValuesToMatchPage() {
        const sport = getSportType();
        const teams = document.querySelectorAll("div.team-table");
        for (const team of teams) {
            if (team.querySelector("table")) {
                if (isNationalTeam(team)) {
                    addLineupValuesNational(team, sport);
                } else {
                    addLineupValues(team, sport);
                }
            }
        }
    }

    /* *********************** League ********************************** */

    function addTeamTopPlayersValueToTable(team, age, sport) {
        const teamLink = team.querySelector("td:nth-child(2) a:last-child")?.href;
        const tid = extractTeamID(teamLink);
        const url = `https://www.managerzone.com/?p=players&sub=alt&tid=${tid}`;

        const teamValue = document.createElement("td");
        team.appendChild(teamValue);
        teamValue.innerText = "loading...";
        teamValue.classList.add("team-value");
        teamValue.title = "Click to see quad summary";
        teamValue.style.textAlign = "center";
        teamValue.style.whiteSpace = 'nowrap';
        teamValue.style.padding = 'auto 3px';
        teamValue.onclick = () => {
            displayOnModal(url);
        };

        const ageValue = document.createElement("td");
        team.appendChild(ageValue);
        ageValue.innerText = "...";
        ageValue.style.textAlign = "center";
        teamValue.style.whiteSpace = 'nowrap';
        teamValue.style.padding = 'auto 3px';
        ageValue.classList.add("avg-age-value");

        GM_xmlhttpRequest({
            method: "GET",
            url,
            context: { team, sport, age },
            onload: function (resp) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(resp.responseText, "text/html");
                const currency = getCurrency(doc);
                const players = getPlayers(doc, currency);
                const team = resp.context.team;
                const sport = resp.context.sport;
                const age = resp.context.age;
                const { values, avgAge } = filterPlayers(players, sport === "soccer" ? 11 : 21, 0, age);
                const valueElement = team.querySelector("td.team-value");
                valueElement.innerText = `${formatBigNumber(values)} ${currency}`;
                valueElement.style.textAlign = "right";

                const ageElement = team.querySelector("td.avg-age-value");
                ageElement.innerText = `${avgAge.toFixed(1)}`;
            },
        });
    }

    function getLeagueAgeLimit(url) {
        if (url.search("type=u23") > -1) {
            return 23;
        } else if (url.search("type=u21") > -1) {
            return 21;
        } else if (url.search("type=u18") > -1) {
            return 18;
        }
        return 99;
    }

    function addTopPlayersValueToTable() {
        createModal();
        const age = getLeagueAgeLimit(document.baseURI);
        const sport = getSportType(document);
        const table = document.querySelector("table.nice_table");

        const valueH = document.createElement("th");
        valueH.style.textAlign = "center";
        valueH.innerText = `Top ${sport === "soccer" ? 11 : 21}`;

        const ageH = document.createElement("th");
        ageH.style.textAlign = "center";
        ageH.innerText = `Age`;
        ageH.title = 'Average Age Of the Top Players';

        const headers = table.querySelector("thead tr");
        headers.appendChild(valueH);
        headers.appendChild(ageH);

        const teams = table.querySelectorAll("tbody tr");
        for (const team of teams) {
            addTeamTopPlayersValueToTable(team, age, sport);
        }
    }

    function injectTeamValuesToLeagueTable() {
        let timeout = 16000;
        const step = 1000;
        const interval = setInterval(() => {
            if (document.querySelector("table.nice_table")) {
                clearInterval(interval);
                addTopPlayersValueToTable();
            } else {
                timeout -= step;
                if (timeout < 0) {
                    clearInterval(interval);
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
            injectToClashPage();
        } else if (isFederationFrontPage(document.baseURI)) {
            sortFederationTeamsByTopPlayers();
        } else if (document.baseURI.search("/?p=players&sub=alt") > -1) {
            injectToSquadSummaryPage();
        } else if (document.baseURI.search("mid=") > -1) {
            injectTeamValuesToMatchPage();
        } else if (document.baseURI.search("/?p=league") > -1) {
            injectTeamValuesToLeagueTable();
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
