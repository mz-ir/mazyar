// ==UserScript==
// @name         MZ Player Values
// @namespace    http://tampermonkey.net/
// @version      0.23
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
// @icon         https://www.google.com/s2/favicons?sz=64&domain=managerzone.com
// ==/UserScript==
(function () {
    "use strict";

    /* *********************** Styles ********************************** */

    GM_addStyle(`
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
        const href = doc.querySelector("#settings-wrapper a")?.href;
        return href?.indexOf("hockey") > -1 ? "soccer" : "hockey";
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
                const value = isDomesticPlayer(infoTable)
                    ? infoTable
                          .querySelector("tbody tr:nth-child(5) td span")
                          ?.innerText.replaceAll(currency, "")
                          .replace(/\s/g, "")
                    : infoTable
                          .querySelector("tbody tr:nth-child(6) td span")
                          ?.innerText.replaceAll(currency, "")
                          .replace(/\s/g, "");
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

    function getTotalValueOfAllPlayers(players) {
        const values = players.map((player) => player.value);
        return values.reduce((a, b) => a + b, 0);
    }

    function filterTopPlayers(players, count, ageLow = 0, ageHigh = 99) {
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
        const sport = getSportType(doc);
        if (players) {
            rows.push({
                title: "All",
                value: getTotalValueOfAllPlayers(players),
            });
            if (sport === "hockey") {
                rows.push({
                    title: "Top 21 - All",
                    value: filterTopPlayers(players, 21),
                });
                rows.push({
                    title: "Top 21 - U23",
                    value: filterTopPlayers(players, 21, 0, 23),
                });
                rows.push({
                    title: "Top 21 - U21",
                    value: filterTopPlayers(players, 21, 0, 21),
                });
                rows.push({
                    title: "Top 21 - U18",
                    value: filterTopPlayers(players, 21, 0, 18),
                });
            } else {
                rows.push({
                    title: "Top 16 - All",
                    value: filterTopPlayers(players, 16),
                });
                rows.push({
                    title: "Top 11 - All",
                    value: filterTopPlayers(players, 11),
                });
                rows.push({
                    title: "Top 16 - U23",
                    value: filterTopPlayers(players, 16, 0, 23),
                });
                rows.push({
                    title: "Top 11 - U23",
                    value: filterTopPlayers(players, 11, 0, 23),
                });
                rows.push({
                    title: "Top 16 - U21",
                    value: filterTopPlayers(players, 16, 0, 21),
                });
                rows.push({
                    title: "Top 11 - U21",
                    value: filterTopPlayers(players, 11, 0, 21),
                });
                rows.push({
                    title: "Top 16 - U18",
                    value: filterTopPlayers(players, 16, 0, 18),
                });
                rows.push({
                    title: "Top 11 - U18",
                    value: filterTopPlayers(players, 11, 0, 18),
                });
            }
        }
        return createSquadTable(rows, currency);
    }

    function injectToSquadSummaryPage() {
        const content = createSquadSummary(document);
        const place = document.querySelector("table#playerAltViewTable");
        if (place) {
            place.parentNode?.insertBefore(content, place);
        }
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

    function getTopPlyers(doc) {
        const currency = getCurrency(doc);
        const players = getPlayers(doc, currency);
        const sport = getSportType(doc);
        const count = sport === "soccer" ? 11 : 21;
        return players ? filterTopPlayers(players, count) : 0;
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
            });
            i++;
            GM_xmlhttpRequest({
                method: "GET",
                url,
                onload: function (resp) {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(resp.responseText, "text/html");
                    const values = getTopPlyers(doc);
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
                    const target = team.target.parentNode.querySelector("button.donut.rank");
                    target.classList.remove("loading-donut");
                    target.classList.add("final-donut");
                    target.innerText = `${rank}`;

                    const value = team.target.parentNode.querySelector("span.value");
                    value.innerText = `${formatBigNumber(team.values, ",")}`;
                }
                const newOrder = finals.map((t) => t.row);
                tbody.replaceChildren(...newOrder);
            } else {
                timeout -= step;
                if (timeout < 0) {
                    clearInterval(interval);
                    for (const team of finals) {
                        const target = team.target.parentNode.querySelector("button.donut.rank");
                        target.classList.remove("loading-donut");
                        target.classList.add("final-donut");
                        target.innerText = `-`;
                    }
                }
            }
        }, step);
    }

    function addRankView(target) {
        const name = target.querySelector("a.team-name");
        const url = getSquadSummaryLink(name.href);

        const info = document.createElement("td");
        target.parentNode.insertBefore(info, target);

        const rank = document.createElement("button");
        rank.innerText = "_";
        rank.classList.add("donut", "loading-donut", "rank");

        rank.onclick = () => {
            displayOnModal(url);
        };

        const value = document.createElement("span");
        value.innerText = "";
        value.classList.add("value");

        info.appendChild(rank);
        info.appendChild(value);

        target.insertBefore(info, target.firstChild);
    }

    function injectToClashPage() {
        createModal();

        const table = document.querySelector("table.hitlist.challenges-list");

        const headers = table.querySelector("thead tr");
        const info = document.createElement("th");
        info.innerText = "Info";
        headers.insertBefore(info, headers.firstChild);

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
                value.innerHTML = `<span style="color:red;">Top${count}: </span>${formatBigNumber(team.values, ",")} ${
                    team.currency
                }`;
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
                total.innerHTML = `<td><hr><span style="color:red;">Total: </span>${formatBigNumber(totalValue, ",")} ${
                    teams[0].currency
                }</td>`;
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
