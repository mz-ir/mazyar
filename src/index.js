// ==UserScript==
// @name         Mazyar
// @namespace    http://tampermonkey.net/
// @version      3.15
// @description  Swiss Army knife for managerzone.com
// @copyright    z7z from managerzone.com
// @author       z7z from managerzone.com
// @license      MIT
// @run-at       document-idle
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      self
// @require      https://unpkg.com/dexie@4.0.8/dist/dexie.min.js
// @require      https://update.greasyfork.org/scripts/513041/1499502/MazyarTools.js
// @resource     MAZYAR_STYLES https://update.greasyfork.org/scripts/513029/1484500/MazyarStyles.user.css
// @match        https://www.managerzone.com/*
// @match        https://test.managerzone.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=managerzone.com
// @supportURL   https://github.com/mz-ir/mazyar
// @downloadURL  https://update.greasyfork.org/scripts/476290/Mazyar.user.js
// @updateURL    https://update.greasyfork.org/scripts/476290/Mazyar.meta.js
// ==/UserScript==

(async function () {
    "use strict";

    let mazyar = null;

    /* ********************** Constants ******************************** */

    const CURRENT_VERSION = GM_info.script.version;
    const DEADLINE_INTERVAL_SECONDS = 30; // in seconds

    const MAZYAR_CHANGELOG = {
        "3.14": [
            "<b>[improve]</b> Table Transfer History: add a drop-down menu to filter the results to a narrower period",
        ],
        "3.13": [
            "<b>[new]</b> Table Transfer History: add teams' last month transfer history to the standing tables",
        ],
        "3.12": [
            "<b>[fix]</b> Transfer: training camp indicator in main host (www.managerzone.com)",
        ],
        "3.11": [
            "<b>[new]</b> Training Report: add player's days left in the camp",
        ],
        "3.10": [
            "<b>[fix]</b> Table Transfer List: fix undefined age",
        ],
        "3.9": [
            "<b>[new]</b> MZY Modal: add close button in title",
            "<b>[improve]</b> MZY Settings: update sections' styles",
            "<b>[improve]</b> Table's Transfer List: add team name, player age, deadline, fee and latest bid.",
        ],
        "3.8": [
            "<b>[fix]</b> fixture: full names",
        ],
        "3.7": [
            `<b>[new]</b> MZY Settings: add <i class="fa-solid fa-signal-stream" style="color: green; font-size: large;"></i> icon in MZY Toolbar to toggle 'display in progress results' settings`,
            `<b>[new]</b> Tables: add a section to league tables to display players that are in transfer market. You can disable it in Miscellaneous section of MZY Settings. (look for <b>Add transfer list in tables</b>`,
        ],
        "3.6": [
            "<b>[fix]</b> Clash: squad values",
        ],
        "3.5": [
            "<b>[fix]</b> Clash: fix crash.",
        ],
        "3.4": [
            "<b>[new]</b> MZY Settings is splitted to smaller sections.",
        ],
        "3.3": [
            "<b>[fix]</b> Fixtures: make it compatible with <b>ylOppTactsPreview (MODIFIED)</b> script.",
        ],
        "3.2": [
            "<b>[fix]</b> bump version to overwrite the latest version in greasyfork",
        ],
        "3.1": [
            "<b>[fix]</b> required wrong version of scripts.",
        ],
        "3.0": [
            "<b>[fix]</b> Fixtures: truncate full names if they are very long.",
            "<b>[new]</b> make displaying full names in fixture page optional. It is disabled by default. To enable it check 'Display team's full name in fixture' in MZY Settings.",
            "<b>[Refactor]</b> restructured the project to multiple files.",
        ],
        "2.54": [
            "<b>[new]</b> Fixtures: add full name of the teams."
        ],
        "2.53": [
            "<b>[new]</b> show transfer fee in tactic page.",
            "<b>[fix]</b> Squad Summary: top players table in mobile view.",
        ],
        "2.52": [
            "<b>[new]</b> show residency days and transfer fee in shortlist."
        ],
        "2.51": [
            "<b>[new]</b> show transfer fee in more places."
        ],
        "2.50": [
            "<b>[new]</b> Players Profile: add transfer fee."
        ],
        "2.49": [
            "<b>[fix]</b> Transfer Market: wrong camp status in test domain"
        ],
        "2.48": [
            "<b>[fix]</b> download and update urls for userscript were missing."
        ],
        "2.47": [
            "<b>[fix]</b> some features were not compatible with test version of the site (test.managerzone.com)."
        ],
        "2.46": [
            "<b>[new]</b> if 'deadline alert' is enabled from MZY Settings, it adds a section to Transfer Monitor to display players you added to monitor their deadline.</b>.",
            "<b>[fix]</b> clean install was broken."
        ],
        "2.45": [
            "<b>[new]</b> Market: add optional feature to show training camp status of players. It is disabled by default. To enable it, please select 'Check if player is sent to camp' option from <b>MZY Settings</b>."
        ],
        "2.44": [
            "<b>[fix]</b> Tables: fix not adding top players to friendly league tables."
        ],
        "2.43": [
            "<b>[new]</b> Manager Ranking: add value and average top players for each team. You can sort them by this two columns too."
        ],
        "2.42": [
            "<b>[improve]</b> Squad Summary: add share and market icon for your own players too."
        ],
        "2.41": [
            "<b>[new]</b> Notebook: add a note icon to MZY Toolbar to open/hide a notebook. It stores your note and you can stick it to a corner to be always be available and visible."
        ],
        "2.40": [
            "<b>[fix]</b> Transfer: change Fee font color to blue."
        ],
        "2.39": [
            "<b>[new]</b> Transfer: for non one-club players, the price that current club paid for the player is added next to 'Days at this club'."
        ],
        "2.38": [
            "<b>[fix]</b> Transfer Filters: delete icon was missing in 'MZY Transfer Filters' modal."
        ],
        "2.37": [
            "<b>[new]</b> support Managerzone Test Site (test.managerzone.com). It is not fully tested. Please report any issues you encounter in Test site too."
        ],
        "2.36": [
            "<b>[new]</b> Deadline Alert: add 'Timeout' option in <b>MZY Settings</b> to set deadline timeout. Its value must be between 1 and 360 minutes.",
            "<b>[new]</b> Deadline Alert: add 'Sound Notification' option to play a bell sound when deadline of at least one of monitored players is less than timeout.",
            "<b>[fix]</b> Deadline Alert: trash icon was missing in 'MZY Transfer Deadlines' modal when 'van.mz.playerAdvanced' script is enabled.",
            "<b>[fix]</b> MZY Settings: 'Mark maxed skills' option was missing."
        ],
        "2.35": [
            "<b>[new]</b> Days at this club: add to player profiles in training report. It is optional and disabled by default. You can enable it from MZY Settings."
        ],
        "2.34": [
            "<b>[new]</b> <b>(Experimental)</b> Transfer: add deadline alert."
        ],
        "2.33": [
            "<b>[fix]</b> Federation Front Page: add top players when current federation is changed."
        ],
        "2.32": [
            "<b>[improve]</b> Federation: first team member sort"
        ],
        "2.31": [
            "<b>[new]</b> Clash: add average age of top players and teams senior league for each team. this feature is not supported in mobile view."
        ],
        "2.30": [
            "<b>[fix]</b> Transfer Filters: reset selected H & L checkboxes when Transfer filter is not enabled."
        ],
        "2.29": [
            "<b>[fix]</b> Hide Players: fixed an issue about hide icon when transfer scout filters are used."
        ],
        "2.28": [
            "<b>[fix]</b> Days at this club: after v2.27, it was broken in players page."
        ],
        "2.27": [
            "<b>[new]</b> Transfer Market: it adds a trash icon next to player ID in search result. click on the icon to <b>hide the player. To remove players from hide list, use 'MZY Hide' button."
        ],
        "2.26": [
            "<b>[improve]</b> Days at this club: it is optional. It is disabled by default. You can enable it from MZY Settings.",
            "<b>[improve]</b> Player Profile: it stores player profiles in local database to reduce number of requests.",
            "<b>[improve]</b> Local Database: it deletes outdated local data to reduce the size of database.",
            "<b>[improve]</b> Transfer: it uses less ajax requests now.",
        ],
        "2.25": [
            "<b>[new]</b> Training Report: click on player's camp package icon to open its camp report."
        ],
        "2.24": [
            "<b>[fix]</b> Player Profile: fix Days at this club for injured or suspended players."
        ],
        "2.23": [
            "<b>[new]</b> Squad Profile: add 'days at this club' to each player profile.",
            "<b>[fix]</b> Player Comment: show comment icon for players when selected tab changes.",
            "<b>[fix]</b> Player Comment: change color of comment icon to lightskyblue when player has no comment. (previous color was the same as loyal players background)",
        ],
        "2.22": [
            "<b>[new]</b> Hire Coaches: adds salary range of each coach. Thanks to <a href=\"https://www.managerzone.com/?p=profile&uid=8577497\">@douglaskampl</a> for suggesting the idea and sharing his implementation."
        ],
        "2.21": [
            "<b>[new]</b> Club Page: adds total trophy count."
        ],
        "2.20": [
            "<b>[new]</b> Player Profile: add 'Days at this club' counter."
        ],
        "2.19": [
            "<b>[new]</b> Squad Summary: it marks players whose skills are shared. click on share icon to see the player in place.",
            "<b>[new]</b> Squad Summary: it marks players that are in transfer market. click on transfer icon to see the player in market."
        ],
        "2.18": [
            "<b>[new]</b> show changelog after script update.",
            "<b>[improve]</b> change icon style of player's comment."
        ],
        "2.17": [
            "<b>[fix]</b> fixed total skill balls"
        ],
    }

    const MAZYAR_TRANSFER_INTERVALS = {
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

    const MAZYAR_FILTER_BACKUP_TITLE = "Mazyar Filters Backup\n\n";

    const MAZYAR_DEADLINE_ALERT_SOUND =
        "data:audio/mpeg;base64,//OExAAAAAAAAAAAAFhpbmcAAAAPAAAAKAAADbAAAQEfHy4uLjMzOTk5Pz9CQkJISE9PT2ZmbW1tc"
        + "3N2dnZ6eoCAgImJlJSUo6OoqKiurrOzs7m5v7+/xMTKysrNzdHR0dXV2dnZ3Nzg4ODk5Ofn5+vr7+/v8/P09PT4+P7+/v//AAAAC"
        + "kxBTUUzLjEwMARIAAAAAAAAAAAVCCQCzCEAAZoAAA2wXtypYQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUxAAAAAP8AUAAAACAS"
        + "QCQRgCASLq7//PExAsjqwbDH4dpIB1CMEAD6dTAceIh3ZSwkBKkv/gDUEnGWPf6boppjjHOHIAuAsH0EGMjxmOcpE8OeRA5gmYKe"
        + "CRoflaB40QTHmHMOl8RgYoXMFb3/SOjwUaLL7HAtYywQgSgviYEoaEv/+ipSKZcVTMDRMe5THoShocHAPApjgHgX///Wp//5fNwu"
        + "g2EuseMh+mJdpVnl7fQKJA0AAMYlm5M3efLtmZ5pmpiPi+lPeGNDVo8maLthyIjQOnQUKcHBPHPC86JxSY1y6Sw0DATakZLSWQIZ"
        + "YrmIrUZwslwgRZJ4umKZVMiKmpDSdZIgIBAhGatZYC1Qad7A3THKNEBeA2MjtLpeOEy8bhJn18nSyH7D0ntaktEyNiZI4eiqY/0r"
        + "M9ev67OOoMGn//2MgAZP//KICzT1ZkAcAABn2BbgANQeBkFvylb//5MjaS/orSRpfqp7X5xHv//0SZJEBsJ1NH+y1f//rMP/Q9PS"
        + "/WuqqizrYvGxSFbDjHaBBgs//OExO8p2wbjH5iYJOJ4qtwAAAd9gqwA9A7N6hlx3f+r/3X3TQsZD0l/+v9Y6gWlEMNm/6///zpn/"
        + "6f////uxsMqBiwYUAn2Az3CwB8FkFDf/6cw4y2nY4bOvdP/6hugHgOmr/3dL//+r//////1qGuBiuQGmggAAcDXgDv+Bjf///+kg"
        + "MUn//+cCbu//t//+pf//////RckRrGsX2oAAe4DfcOQAHqcv9fkAZ/czPTqellTejNNGFToMr//UZgJ//M0xPoSaqa7H8WYAWMG/"
        + "+v//6lf/////+pZEAHgTqoCCS0j+oDQP7J9Z/WgggdSUibTXdaisMiHVLL5RFjRIJ5fJFCmuQia//M0xOsOAqqqXhAoNIjQjPrPZ"
        + "tFdxg1xmTp2p1L9loLFCAD1Fbn2/TVe3//rX//////9h1hQxQa/b/YDeAGgAbtBQEACJhTQ//M0xO4LYqKkXAKm9bUQ42ig/jRkF"
        + "GZrOMIGC5Uy5EcPBywwRQCBzKjyEcTDDAixkUZIQOi5NK44/C80mmu3+all2fQkIUl+//MkxPsJ4qa0ngCa1JahVCjRgAozJgDMA"
        + "DFqTAkDYJjBnxYEAm4GADplB4wwhBKn//M0xPYNEqKmXgHanFFkGsGPGjp43yQxM06JcvIrQ+ymjPH5fNiEEwM7kzJIfjzAGoI3p"
        + "Jx8CiROuscgABwRW9uTOUAYgIky//NExPwUwqaaXGsnKAZAVClUdJKAsGRoAo1NgctjDQLeMvpImtYyhIBIWl+y1A4UFfQwYSOBB"
        + "2wQhH1NY0OHIgtYEIlcnRD5aili8Qh1QNoLjuAo6DhsYZKimsAqNyKF//OkxPxF4r6SXtY1yOh5Ibl8ELEVQSAMJyWB0vRoAJmRa"
        + "djNIAg6X9rrqYbUqwACcACOKgICPYPFjrprgWaVimlY1hv/Q9/rak6Ojdf/Wyklo//9JLRBSDdH7KU6P0bfo+pKjrbUl/baLmzJc"
        + "dCUUxFiSk1Ke1W0ucxEp0lH4CBHgS2HCIAfDygAfu3m0N//+NDP/9BFT///rH4DXzA+3+rf//1f//////TLgucLoi3oKuAAAMH4t"
        + "wAcPx1Dt////d/WpPf//6A6wgwi3/V///U3/r////6KKRdJcJgEDNUAB4H41wA+MHfXtVs3/s6e79///TLgBEldf/Z///1t///+v"
        + "9/61GZIBjhxagAB/gAOB5QAdxon18ix/////fqT//NExPcWaqLW/kNZHXV///Y3AVROK+rfu3//W///////sfJYMjDEertpfgd8w"
        + "JQAm4tHEMMSAc3UyVhQDjgIr6DEEHtN76ziJmkpTE2keNzhVQLpsYLJsyQTL5F5MIUN//M0xPALiqa2niglJP7/0CYIIFYFMpk+n"
        + "/X//qdWgimhQ3Qp7skymNzA0mCBoX01WW3QroHSkSwFHjIn15mIeoCQeFVAB/4y//MkxPwLWqauPggmGLeAVAP5OT0hhleGHOcFi"
        + "RHPH/hue6ablgXIlIcVqxnx7UeG//MkxPEK2qasngCk8OjfX/4zZwQDHQS1a02UyClKYcwgh4gAyhU6ygHJAsb2Bvcc//M0xOgLo"
        + "qaqXgBiiMGYIoeJguglEKFN1K/GZSLyOvDAAnAQUEoFQToRQ0Of///oMpBkNi+bm+sjD//84Mgaf/dhYAbnil3e//NUxPQZ+qqeX"
        + "0OYAIu5vYnYhYa3/hgUkTQAAbuDis9Wrqkaa0nWrVZfTbyuBdVBAYa4thFy0MsiUiSFmg3QYjY+i1I0L1B6pRLBsYECGuXSDEWJ8"
        + "mVlhFjInjcZkbw7gxidcxJJAmtaisRtFFSY5A7kbpKDEY+k//NkxPciswbDHZiYALnQacNMNyVK5FzE1dFSJiYjicnnyRMhBUiJ4"
        + "umubGJkmXVHUCmVRzjL/qXW31LQe51ILsHK//qFv//zMFgbqpiAgAAAi2g8gAGDweFyK1e1f//izCfb6m7f9TPq3WWTZ1Kb6/+iT"
        + "IfqARgypBTX/t//9ZgNd2/rUr////1E0MsDdxEc//OExO8qiwbjH5iIBLXgADug8APN6h3CZv///0evsmeZbt//1JkwBR5JJ/q1f"
        + "//zhKf/////+s4NcEEyfUoADa8GwAfCYHif/r9+6PW93Z0BsoHGa739f1oEPADIiCv+p///zIa7f9v////RSNSBAIgQM1UADUYDb"
        + "8OQAEwxD8wNP1CnjSf9Jbf9TKSOo2QSSL5QJl1s3qfo/uaA8hPo/60av//pkx//////7JmAmZk6/G//E3AF6vW/xXAiV21P//M0x"
        + "PcRGqa3H8WQATzz36up5+nn0lSILaN16NRv5kAD88l/6///yse///6000EKqy+9mXb2UakuJCoAD4ULfcH8AGIQif4h//M0xO0L2"
        + "qap/BAmGAvjGjs/WtkUdlooUlIsnZ9svkk6ls7qd2R/6hugVhw8//b/+ikkk5iPD//r3U/UlMS6zJLWpJKroF8X//M0xPgNSqagf"
        + "gKk4CBsw8PVHAtgA+DeGjf///+hglki///0x0Adjk2/1UF///5gO7//////qWZD5CRy6pUQwH/AHzxCf/////M0xP0PKqaiXgBmb"
        + "P6mLX///SBHjD/mMp1//+UFn/////+k04lAOAoDqgwHA9wA+JQd////+gUC6h///ogjgm2+1f///UZf//M0xPsPEp6sfgKavP///"
        + "+3+mOgWUaUCBwBoAPkoPP////qW5SHf///0gFWXH////+o9//////+gvB1VABkBgPsAPjgAKd3///M0xPkTCqaqXgBibP//1NF3/"
        + "//KwLhNv1N///1mX//////2L5MdEOBLSB8Ihf////+oHjZ///6zAIG/9////O///////j5K//M0xOcK0qakHgKm8MeVIOAMyB8aD"
        + "P////6KEn///WAzlf////qMv//////zo7Ug4HoQHyYz////+g8GW///zAD1O/7f//9S//MkxPYJ2qK0PgRU+P//////+VOqCQcCw"
        + "ID5dHr///9/Uw1C7///0gGSMP9v///J//MkxPEJqqKsXgHk5P//////x2oAQDgCBAfEIFv///1N8qobf///QA4mf////9f///Mkx"
        + "O0JIqKwXgRU+P/////MagFwOBvIB8zGA/////Wohf//84FOh/p///1J//////MkxOsJcqK4ngHa8P//oCoDBwLQwPhQsf////xXO"
        + "///6gEF93/p///6ajDAD5MG//MkxOgIkqKsPgHg8H////6GCz///nASdX/////9dRwH8uDah////7IJic///8vg//MkxOgH8p6wP"
        + "gHa8MBn7/////9SAD0AoVepE/8XwqrChgzJftMv/NjGih/1PRZI//MkxOsICqK0PgHa8MieM/YCokdCCEqCkwFm4UeF46akNIKKG"
        + "HJb/b/IqYF0EhE3//MkxO0IYqKoXgSE+P//pkxBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//MkxO4IUp6sfgHa8Kqqq"
        + "qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//MkxO8IIp64fgNE+Kqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq"
        + "qqqqqqq//MkxPEGUW60XgCU4Kqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//MUxPoFmW6oOAHa8Kqqqqqqqqqqq"
        + "qqq//MkxO4GKW6gGUBoAKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//M0xPgQMcqoeYCgAKqqqqqqqqqqqqqqq"
        + "qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//MUxPIAAAP8AYAAAKqqqqqqqqqqqqqq";


    /* *********************** Squad - Icons (Shared Skills & Transfer) ********************************** */

    function squadAddIconsHeaderToSummaryTable(table, ownView = false) {
        if (ownView) {
            const age = table.querySelector("thead tr th:nth-child(5) a");
            age.innerText = age.innerText[0];
            const born = table.querySelector("thead tr th:nth-child(6) a");
            born.innerText = born.innerText[0];
        }
        const th = document.createElement("th");
        th.style.width = "0px";
        const target = table.querySelector("thead tr th:nth-child(2)");
        target.parentNode.insertBefore(th, target);
    }

    function squadAddIconsBodyToSummaryTable(player, info) {
        const td = document.createElement("td");
        if (info.shared) {
            const icon = mazyarCreateSharedIcon("Click to see player profile.");
            icon.style.fontSize = "13px";
            icon.classList.add("special_player");
            icon.addEventListener("click", () => {
                mazyar.showPlayerInModal(info.detail);
            })
            td.appendChild(icon);
        }
        if (info.market) {
            const icon = mazyarCreateMarketIcon("Player is in Transfer Market.");
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
        const text = document.createElement("div");
        text.innerHTML = `<b>MZY:</b> fetching players' info ...`;
        table.parentNode.insertBefore(text, table);

        const teamId = mazyarExtractTeamId(document.baseURI);
        const playersInfo = await mazyarExtractPlayersProfileDetails(teamId);
        if (!playersInfo) {
            text.innerHTML = `<b>MZY:</b> fetching players' info ...<span style="color: red;"> failed</span>.`;
            return;
        }
        text.innerHTML = `<b>MZY:</b> fetching players' info ...<span style="color: green;"> done</span>.`;
        squadAddIconsHeaderToSummaryTable(table, ownView);
        for (const player of players) {
            const name = player.querySelector("a");
            const playerId = mazyarExtractPlayerIdFromProfileLink(name?.href);
            squadAddIconsBodyToSummaryTable(player, playersInfo[playerId]);
        }
    }

    /* *********************** Squad - Residency ********************************** */

    function squadAddDaysAtThisClubToPlayerProfile() {
        if (mazyar.isDaysAtThisClubEnabledForPlayerProfiles()) {
            const { days, price } = mazyarExtractResidencyDaysAndPrice(document);
            const daysDiv = document.createElement("div");
            if (days >= 0) {
                const text = days === 0 ? 'N/A' : `≤ ${days}`;
                daysDiv.innerHTML = `Days at this club: <strong>${text}</strong>`;
                daysDiv.classList.add("mazyar-days-at-this-club");
                if (price) {
                    daysDiv.innerHTML += ` <span style="margin-left: 25px;">Transfer Fee: <strong style="color: blue;">${price}</strong><span>`;
                }
            } else if (mazyar.isDaysAtThisClubEnabledForOneClubPlayers()) {
                const text = 'Entire Career';
                daysDiv.innerHTML = `Days at this club: <strong>${text}</strong>`;
                daysDiv.classList.add("mazyar-days-at-this-club", "mazyar-days-entire");
            }
            const profile = document.querySelector("div.playerContainer");
            profile?.appendChild(daysDiv);
        }
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
        const sport = mazyarExtractSportType();
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
        dl.appendChild(squadCreateCompactElement("Total", `${mazyarFormatBigNumber(row.all)} ${currency}`));
        if (sport == "soccer") {
            dl.appendChild(squadCreateCompactElement("Top 16", `${mazyarFormatBigNumber(row.top16)} ${currency}`));
            dl.appendChild(squadCreateCompactElement("Top 11", `${mazyarFormatBigNumber(row.top11)} ${currency}`));
        } else {
            dl.appendChild(squadCreateCompactElement("Top 21", `${mazyarFormatBigNumber(row.top21)} ${currency}`));
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
            all.innerText = `${mazyarFormatBigNumber(row.all)} ${currency}`;
            all.style.textAlign = "end";

            const tr = document.createElement("tr");
            tr.appendChild(title);
            tr.appendChild(count);
            tr.appendChild(all);
            tbody.appendChild(tr);

            if (sport === "soccer") {
                const top16 = document.createElement("td");
                top16.innerText = `${mazyarFormatBigNumber(row.top16)} ${currency}`;
                top16.style.textAlign = "end";

                const top11 = document.createElement("td");
                top11.innerText = `${mazyarFormatBigNumber(row.top11)} ${currency}`;
                top11.style.textAlign = "end";

                tr.appendChild(top16);
                tr.appendChild(top11);
            } else {
                const top21 = document.createElement("td");
                top21.innerText = `${mazyarFormatBigNumber(row.top21)} ${currency}`;
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
        const sport = mazyarExtractSportType(document);
        const currency = mazyarExtractClubCurrency(document);
        const players = mazyarExtractClubPlayersDetails(document, currency);
        const summary = mazyarExtractSquadSummaryDetails(players, sport);
        const topPlayers = squadCreateTopPlayersTable(summary, currency, sport);
        topPlayers.style.marginBottom = "10px";

        const div = document.createElement("div");
        div.classList.add("mazyar-flex-container");
        div.appendChild(topPlayers);
        div.style.marginTop = "10px";
        const target = table.parentNode.parentNode;
        target.parentNode.insertBefore(div, target);
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

    function calendarInject() {
        if (document.getElementById('calendar-new')) {
            // add observer if user changes from other tabs to squad summary tab
            const callback = (mutationsList,) => {
                for (let mutation of mutationsList) {
                    if (mutation.type === 'childList') {
                        const modal = document.getElementById('lightbox_calendar-administration');
                        if (modal && !modal.injecting) {
                            modal.injecting = true;
                            mazyar.injectToCalendar(modal);
                        }
                    }
                }
            };
            const observer = new MutationObserver(callback);
            const config = { childList: true };
            observer.observe(document.body, config);
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
                        mazyar.addDaysAtThisClubToAllPlayers(container);
                        mazyar.addPlayerComment();
                    }
                }

                // add observer if user changes from other tabs to squad profiles tab
                const callback = () => {
                    const container = document.getElementById('players_container');
                    if (container && !container.injecting) {
                        container.injecting = true;
                        mazyar.addDaysAtThisClubToAllPlayers(container);
                        mazyar.addPlayerComment();
                    }
                };
                const observer = new MutationObserver(callback);
                const config = { childList: true, subtree: true };
                observer.observe(target, config);
            }
        }
    }

    /* *********************** Rankings ********************************** */

    function createSortableHeaderCell(cellText = "", options = { title: "", textAlign: "", marginBetween: "" }) {
        const cell = document.createElement("th");
        const sortIcon = document.createElement("i");
        const text = document.createElement("span");
        cell.appendChild(sortIcon);
        cell.appendChild(text);

        cell.style.textDecoration = "none";

        sortIcon.style.display = "inline";
        sortIcon.style.fontSize = "11px";
        sortIcon.style.color = "#555";
        sortIcon.classList.add("fa-solid", "fa-sort", "mazyar-sort-icon");
        sortIcon.setAttribute("aria-hidden", "true");

        text.style.fontSize = "11px";
        text.innerText = cellText;
        if (options?.marginBetween) {
            text.style.marginLeft = options.marginBetween;
        }

        if (options?.title) {
            cell.title = options.title;
        }
        if (options?.textAlign) {
            cell.style.textAlign = options.textAlign;
        }
        return cell;
    }

    function resetMazyarSortIcons(table) {
        const sortIcons = table.querySelectorAll("thead th i.mazyar-sort-icon");
        for (const icon of sortIcons) {
            icon.classList.value = '';
            icon.classList.add("fa-solid", "fa-sort", "mazyar-sort-icon");
        }
    }

    function rankingSortTeamsByKey(table, th, key) {
        resetMazyarSortIcons(table);
        const teams = table?.querySelectorAll("tbody tr");
        if (table.ascending) {
            table.ascending = false;
            const icon = th.querySelector("i");
            icon.classList.value = '';
            icon.classList.add("fa-solid", "fa-sort-down", "mazyar-sort-icon");
            icon.style.color = "#000";
            const rows = [...teams].sort((a, b) => a[key] - b[key]);
            table.querySelector("tbody").replaceChildren(...rows);
        } else {
            table.ascending = true;
            const icon = th.querySelector("i");
            icon.classList.value = '';
            icon.classList.add("fa-solid", "fa-sort-up", "mazyar-sort-icon");
            icon.style.color = "#000";
            const rows = [...teams].sort((a, b) => b[key] - a[key]);
            table.querySelector("tbody").replaceChildren(...rows);
        }
    }

    function rankingAddSquadHeaders(table) {
        const header = table.querySelector("thead tr");
        const value = createSortableHeaderCell("Value", { textAlign: "center", marginBetween: "3px" });
        const age = createSortableHeaderCell("Age", { textAlign: "center", marginBetween: "2px" });
        header.appendChild(value);
        header.appendChild(age);

        value.addEventListener("click", () => {
            rankingSortTeamsByKey(table, value, "topPlayersValue");
        });

        age.addEventListener("click", () => {
            rankingSortTeamsByKey(table, age, "topPlayersAge");
        });
    }

    async function rankingInjectTeamInfo(team) {
        const value = document.createElement("td");
        value.style.whiteSpace = "nowrap";
        value.style.textAlign = "center";
        value.replaceChildren(mazyarCreateLoadingIcon2());

        const age = document.createElement("td");
        age.style.whiteSpace = "nowrap";
        age.style.textAlign = "center";
        age.replaceChildren(mazyarCreateLoadingIcon2());

        team.appendChild(value);
        team.appendChild(age);

        team.topPlayersValue = 0;
        team.topPlayersAge = 0;

        const link = team.querySelector("td:nth-child(4) a");
        const teamId = mazyarExtractTeamId(link?.href);
        const url = mazyarGetSquadSummaryUrl(teamId);
        const doc = await mazyarFetchHtml(url);
        if (doc) {
            const currency = mazyarExtractClubCurrency(doc);
            ({ values: team.topPlayersValue, avgAge: team.topPlayersAge } = mazyarExtractClubTopPlyers(doc));
            value.innerHTML = `<strong>${mazyarFormatBigNumber(team.topPlayersValue, ",")}</strong> ${currency}`;
            age.innerHTML = `<strong>${mazyarFormatAverageAge(team.topPlayersAge)}</strong>`;
        }
    }

    async function rankingInjectSquadValue() {
        const table = document.getElementById("userRankTable");
        const teams = table.querySelectorAll("tbody tr");
        if (teams[0]?.childElementCount > 1) {
            rankingAddSquadHeaders(table);
            const jobs = [];
            for (const team of teams) {
                jobs.push(rankingInjectTeamInfo(team));
            }
            await Promise.all(jobs);
        }
    }

    /* *********************** Clash ********************************** */

    async function clashFetchAndTeamLeagueAndFlag(team) {
        const url = `https://${location.hostname}/?p=team&tid=${team.teamId}`;
        const doc = await mazyarFetchHtml(url);
        if (doc) {
            const leagueRow = doc.querySelector("#infoAboutTeam > dd:nth-child(6)");
            const flag = leagueRow.querySelector("img");
            const seriesName = leagueRow.querySelector("span:last-child");
            team.querySelector("td.flag").appendChild(flag);
            team.querySelector("td.league").appendChild(seriesName);
        }
    }

    async function clashFetchAndUpdateTeamsInfo(team, mobileView) {
        if (!mobileView) {
            clashFetchAndTeamLeagueAndFlag(team);
        }

        const info = {
            currency: "",
            averageAge: 0,
        };

        const doc = await mazyarFetchHtml(team.url);
        let successful = false;
        if (doc) {
            info.currency = mazyarExtractClubCurrency(doc);
            ({ values: team.topPlayersValue, avgAge: info.averageAge } = mazyarExtractClubTopPlyers(doc));
            successful = true;
        } else {
            team.topPlayersAverageAge = 0;
        }

        team.querySelector("td.value").innerHTML = successful
            ? `${mazyarFormatBigNumber(team.topPlayersValue, ",")} ${info.currency}`
            : 'N/A';

        if (!mobileView) {
            team.querySelector("td.age").innerHTML = successful
                ? `<strong>${mazyarFormatAverageAge(info.averageAge)}</strong>` :
                'N/A';
        }
        return successful;
    }

    function clashSortTeams(teams) {
        teams.sort((a, b) => b.topPlayersValue - a.topPlayersValue);
        let rank = 0;
        for (const team of teams) {
            rank++;
            team.className = rank % 2 ? "odd" : "even";
            const target = team.querySelector("button.mazyar-donut.rank");
            if (target) {
                target.classList.remove("mazyar-loading-donut");
                target.classList.add("mazyar-final-donut");
                target.innerText = `${rank}`;
            }
        }
        const newOrderWithPlayedMatches = [];
        for (const row of teams) {
            newOrderWithPlayedMatches.push(row);
            for (const playedMatch of row.playedMatches) {
                playedMatch.className = row.className;
                newOrderWithPlayedMatches.push(playedMatch);
            }
        }
        const tbody = document.querySelector("div.panel-2 table tbody");
        tbody.replaceChildren(...newOrderWithPlayedMatches);
    }

    async function clashCalculateRankOfTeams(teams, mobileView) {
        const jobs = [];
        for (const team of teams) {
            jobs.push(clashFetchAndUpdateTeamsInfo(team, mobileView));
        }
        const results = await Promise.all(jobs);
        if (results.every(Boolean)) {
            // data for all teams are fetched successfully
            clashSortTeams(teams);
        } else {
            // data for some teams are not fetched
            for (const team of teams) {
                const target = team.querySelector("button.mazyar-donut.rank");
                target.classList.remove("mazyar-loading-donut");
                target.classList.add("mazyar-final-donut");
                target.innerText = `-`;
            }
        }
    }

    function clashAddRankElements(team, mobileView) {
        if (!mobileView) {
            const league = document.createElement("td");
            league.style.whiteSpace = "collapse";
            league.style.width = "max-content";
            league.innerText = "";
            league.classList.add("league");
            league.style.textAlign = "center";
            team.insertBefore(league, team.firstChild);

            const flag = document.createElement("td");
            flag.style.width = "max-content";
            flag.innerText = "";
            flag.classList.add("flag");
            flag.style.textAlign = "center";
            team.insertBefore(flag, team.firstChild);

            const age = document.createElement("td");
            age.style.width = "max-content";
            age.innerText = "";
            age.classList.add("age");
            age.style.textAlign = "center";
            team.insertBefore(age, team.firstChild);
        }

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
            mazyar.displaySquadSummary(team.url);
        };
    }

    function clashInjectRanks() {
        const table = document.querySelector("table.hitlist.challenges-list");

        const headers = table.querySelector("thead tr");
        const mobileView = !headers;
        // mobile view has not headers section
        if (headers) {
            const league = document.createElement("th");
            league.style.textAlign = "center";
            league.innerText = "League";
            league.style.whiteSpace = "collapse";
            league.style.width = "11%";
            headers.insertBefore(league, headers.firstChild);

            const flag = document.createElement("th");
            flag.style.textAlign = "center";
            flag.innerText = "";
            flag.style.width = "2%";
            headers.insertBefore(flag, headers.firstChild);

            const age = document.createElement("th");
            age.style.textAlign = "center";
            age.innerText = "Age";
            age.title = "Average Age of Top Players";
            age.style.width = "4%";
            headers.insertBefore(age, headers.firstChild);

            const values = document.createElement("th");
            values.style.textAlign = "center";
            values.innerText = "Values";
            values.title = "Top Players Total Values";
            values.style.width = "13%";
            headers.insertBefore(values, headers.firstChild);

            const rank = document.createElement("th");
            rank.style.textAlign = "center";
            rank.innerText = "Rank";
            rank.title = "Team Rank in This Federation";
            rank.style.width = "3%";
            headers.insertBefore(rank, headers.firstChild);
        }

        const rows = table.querySelectorAll("tbody tr");
        for (const row of rows) {
            // in mobile view played challenges are also <tr> and for this rows, the team name is not a hyperlink
            const name = row.querySelector("a.team-name");
            if (name?.href) {
                // this is info row
                row.teamId = mazyarExtractTeamId(name.href);
                row.url = mazyarGetSquadSummaryUrl(row.teamId);
                clashAddRankElements(row, mobileView);
                row.playedMatches = [];
            } else {
                // this is match row (in mobile view)
                // expand to match the previous row
                row.querySelector("td").colSpan = mobileView ? "3" : "6";
                row.previousSibling.playedMatches?.push(row);
            }
        }
        const teams = [...rows].filter((team) => team.url?.length > 0);
        clashCalculateRankOfTeams(teams, mobileView);
    }

    /* *********************** Federation Page ********************************** */

    function federationGetUsername(node) {
        return node?.querySelector("a")?.innerText;
    }

    async function federationUpdateMemberInfo(member, username, sport) {
        let values = 0;
        let currency = "";
        const url = `https://${location.hostname}/xml/manager_data.php?username=${username}`;
        const doc = await mazyarFetchXml(url);
        const team = {
            id: doc?.querySelector(`Team[sport="${sport}"]`).getAttribute("teamId"),
            name: doc?.querySelector(`Team[sport="${sport}"]`).getAttribute("teamName"),
        }
        if (team.id) {
            const squadUrl = mazyarGetSquadSummaryUrl(team.id);
            const doc = await mazyarFetchHtml(squadUrl);
            if (doc) {
                currency = mazyarExtractClubCurrency(doc);
                values = mazyarExtractClubTopPlyers(doc).values;
            }
        }

        const name = document.createElement("div");
        name.style.color = "blue";
        name.style.width = "100%";
        name.style.marginTop = "0.5em";
        name.title = team.name;
        name.innerHTML = `<strong style="color:black;">Team: </strong>${team.name.length > 20 ? team.name.substring(0, 16) + " >>>" : team.name}`;
        member.querySelector("td").appendChild(name);

        const value = document.createElement("div");
        value.style.color = "blue";
        value.style.width = "100%";
        value.style.marginTop = "0.5em";
        value.innerHTML = `<strong style="color:black;">Top${sport === "soccer" ? 11 : 21}: </strong>${mazyarFormatBigNumber(values, ",")} ${currency}`;
        member.querySelector("td").appendChild(value);

        const separator = document.createElement("hr");
        separator.style.marginBottom = "-3px";
        member.querySelector("td").appendChild(separator);

        return {
            member,
            values,
            currency
        };
    }

    function federationGetTableHeader(target) {
        const thead = target.querySelector("thead td");
        return thead.innerText;
    }

    function federationSetTableHeader(target, text) {
        const thead = target.querySelector("thead td");
        thead.innerText = text;
    }

    async function federationSortTeamsByTopPlayers(target) {
        const sport = mazyarExtractSportType();
        const jobs = [];
        const tbody = target?.querySelector(" tbody");
        for (const member of tbody.children) {
            const username = federationGetUsername(member);
            if (username) {
                jobs.push(federationUpdateMemberInfo(member, username, sport));
            }
        }
        if (jobs.length > 0) {
            const tableHeader = federationGetTableHeader(target);
            let dots = 0;
            const loadingInterval = setInterval(() => {
                federationSetTableHeader(target, tableHeader + " " + ".".repeat(1 + (dots % 3)));
                dots++;
            }, 1000);
            const members = await Promise.all(jobs);
            clearInterval(loadingInterval);
            federationSetTableHeader(target, tableHeader + " ▼");

            members.sort((a, b) => b.values - a.values);
            const newOrder = members.map((t) => t.member);
            let rank = 0;
            for (const row of newOrder) {
                rank++;
                row.className = rank % 2 ? "odd" : "even";
            }
            tbody.replaceChildren(...newOrder);

            let totalValue = 0;
            for (const member of members) {
                totalValue += member.values;
            }
            const total = document.createElement("tr");
            total.style.color = "blue";
            total.style.textAlign = "center";
            total.style.width = "100%";
            total.innerHTML = `<td><strong style="color:black;">Total: </strong>${mazyarFormatBigNumber(totalValue, ",")} ${members[0].currency}</td>`;
            tbody.appendChild(total);
        }
    }

    function federationFrontPage() {
        const content = document.getElementById('federation-content');
        if (content) {
            const target = document.getElementById("federation_clash_members_list");
            if (target && !target.topPlayersInjected) {
                target.topPlayersInjected = true;
                federationSortTeamsByTopPlayers(target);
            }

            const callback = () => {
                const target = document.getElementById("federation_clash_members_list");
                if (target && !target.topPlayersInjected) {
                    target.topPlayersInjected = true;
                    federationSortTeamsByTopPlayers(target);
                }
            };
            const observer = new MutationObserver(callback);
            const config = { childList: true, subtree: true };
            observer.observe(content, config);
        }
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
                top.innerText = `${mazyarFormatBigNumber(row.top11)} ${currency}`;
                age.innerText = `${mazyarFormatAverageAge(row.top11Age)}`;
            } else {
                top.innerText = `${mazyarFormatBigNumber(row.top21)} ${currency}`;
                age.innerText = `${mazyarFormatAverageAge(row.top21Age)}`;
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
        const summary = mazyarExtractSquadSummaryDetails(players, sport);
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
            const pid = mazyarExtractPlayerIdFromProfileLink(playerNode.querySelector("a").href);
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
            value.innerText = `${playerInfo.value ? mazyarFormatBigNumber(playerInfo.value, ",") : "N/A"}`;
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
            `<br>Value: <b>${mazyarFormatBigNumber(value, ",")}</b> ${currency}` +
            `<br>Average Age: <b>${mazyarFormatAverageAge(averageAge)}</b>` +
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
        const tid = mazyarExtractTeamId(teamLink);
        const { players, currency } = await mazyarFetchPlayersAndCurrency(tid, sport);
        matchInjectTopPlayersValues(players, team, currency, sport);
    }

    async function matchAddLineupValues(team, sport) {
        const teamLink = team.querySelector("a").href;
        const tid = mazyarExtractTeamId(teamLink);
        const { players, currency } = await mazyarFetchPlayersAndCurrency(tid, sport);
        matchInjectLineupValues(players, team, currency, sport);
    }

    function matchInjectTeamValues() {
        const sport = mazyarExtractSportType();
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
        const sport = mazyarExtractSportType();
        const matches = matchGetPossiblyInProgressMatches(section);
        // when you visit someone else fixture, this return its id
        let teamId = mazyarExtractTeamId(document.baseURI);
        for (const match of matches) {
            const result = match.querySelector("dd.teams-wrapper a.score-shown");
            if (!mazyarIsMatchInProgress(result.innerText)) {
                match.updated = true;
                continue;
            }
            const mid = mazyarExtractMatchId(result.href);
            // this always returns your id
            const visitorId = mazyarExtractTeamId(result.href);
            const url = `http://${location.hostname}/xml/match_info.php?sport_id=${sport === "soccer" ? 1 : 2}&match_id=${mid}`;
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

    function fixtureCreateFullNameElement(name, tag) {
        const element = document.createElement(tag);
        element.classList.add("mazyar-text-truncate");
        element.title = name;
        element.innerText = name;
        return element;
    }

    function fixtureChangeTeamNames(section) {
        section.querySelectorAll("dl.flex-wrap > dd.teams-wrapper.flex-grow-1").forEach((el) => {
            el.classList.add("mazyar-responsive-block");
        });
        section.querySelectorAll("dd.score-cell-wrapper").forEach((el) => {
            el.style.alignSelf = "center";
        });
        section.querySelectorAll("dd:is(.home-team-column, .away-team-column)").forEach((el) => {
            const fullName = el.querySelector("span.full-name");
            const tag = (fullName?.parentNode.tagName === 'STRONG') ? "strong" : "span";
            const name = fixtureCreateFullNameElement(fullName.innerText, tag);
            el.appendChild(document.createElement("br"));
            el.appendChild(name);
        })
    }

    function fixtureChangeNames() {
        const callback = () => {
            const section = document.querySelector("dl#fixtures-results-list.fixtures");
            if (section && !section.injecting) {
                section.injecting = true;
                fixtureChangeTeamNames(section);
            }
        };
        callback();
        const target = document.getElementById('fixtures-results-list-wrapper');
        if (target) {
            const observer = new MutationObserver(callback);
            const config = { childList: true, subtree: true };
            observer.observe(target, config);
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
        const tid = mazyarExtractTeamId(teamLink);
        return mazyarGetSquadSummaryUrl(tid);
    }

    function tableModifyTeamInBodyForPcView(team, url) {
        const teamValue = document.createElement("td");
        team.appendChild(teamValue);
        const ageValue = document.createElement("td");
        team.appendChild(ageValue);

        teamValue.replaceChildren(mazyarCreateLoadingIcon2());
        teamValue.classList.add("mazyar-injected", "team-value");
        teamValue.title = "Click to see squad summary";
        teamValue.style.textAlign = "center";
        teamValue.style.whiteSpace = "nowrap";
        teamValue.style.padding = "auto 3px";
        teamValue.onclick = () => {
            mazyar.displaySquadSummary(url);
        };

        ageValue.replaceChildren(mazyarCreateLoadingIcon2());
        ageValue.classList.add("mazyar-injected", "age-value");
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
        value.replaceChildren(mazyarCreateLoadingIcon2());
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
        age.replaceChildren(mazyarCreateLoadingIcon2());
        age.classList.add("mazyar-injected", "age-value");
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

        const tid = mazyarExtractTeamId(url);
        const { players, currency } = await mazyarFetchPlayersAndCurrency(tid, sport);

        const playersOfSport = sport === "soccer" ? 11 : 21;
        const all = mazyarFilterPlayers(players, playersOfSport, 0, 99);
        const u23 = mazyarFilterPlayers(players, playersOfSport, 0, 23);
        const u21 = mazyarFilterPlayers(players, playersOfSport, 0, 21);
        const u18 = mazyarFilterPlayers(players, playersOfSport, 0, 18);

        for (const view of [pcView, mobileView]) {
            const valueElement = view.querySelector("td.team-value");
            // prettier-ignore
            valueElement.innerHTML =
                `<span class="values-all" style="display:none">${mazyarFormatBigNumber(all?.values)} ${currency}</span>` +
                `<span class="values-u23" style="display:none">${mazyarFormatBigNumber(u23?.values)} ${currency}</span>` +
                `<span class="values-u21" style="display:none">${mazyarFormatBigNumber(u21?.values)} ${currency}</span>` +
                `<span class="values-u18" style="display:none">${mazyarFormatBigNumber(u18?.values)} ${currency}</span>`;
            valueElement.style.textAlign = "right";

            const ageElement = view.querySelector("td.age-value");
            // prettier-ignore
            ageElement.innerHTML =
                `<span class="values-all" style="display:none;">${mazyarFormatAverageAge(all?.avgAge)}</span>` +
                `<span class="values-u23" style="display:none;">${mazyarFormatAverageAge(u23?.avgAge)}</span>` +
                `<span class="values-u21" style="display:none;">${mazyarFormatAverageAge(u21?.avgAge)}</span>` +
                `<span class="values-u18" style="display:none;">${mazyarFormatAverageAge(u18?.avgAge)}</span>`;

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
        const sport = mazyarExtractSportType();
        const matches = document.querySelectorAll("table.hitlist.marker td > a");
        const inProgressMatches = [...matches].filter((match) => mazyarIsMatchInProgress(match.innerText));
        for (const match of inProgressMatches) {
            const mid = mazyarExtractMatchId(match.href);
            const url = `http://${location.hostname}/xml/match_info.php?sport_id=${sport === "soccer" ? 1 : 2}&match_id=${mid}`;
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
        const sport = mazyarExtractSportType(document);
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

    async function tableCreateTransferList(teams) {
        const sport = mazyarExtractSportType();
        let rows = 0;
        const table = document.createElement("table");
        table.classList.add("nice_table");

        const thead = document.createElement("thead");
        table.appendChild(thead);
        thead.innerHTML = `
        <tr>
            <th>Team</th>
            <th>Player</th>
            <th>Age</th>
            <th>Deadline</th>
            <th>Fee</th>
            <th>Latest Bid</th>
        </tr>`;

        const tbody = document.createElement("tbody");
        table.appendChild(tbody);
        for (const teamPlayers of teams) {
            for (const player of Object.keys(teamPlayers)) {
                if (teamPlayers[player].market) {
                    rows += 1;
                    const tr = document.createElement("tr");
                    tbody.appendChild(tr);
                    tr.innerHTML = `
                    <td>${teamPlayers.team.outerHTML}</td>
                    <td><a href="${teamPlayers[player]?.marketLink}">${teamPlayers[player]?.name}</a></td>
                    <td>${teamPlayers[player]?.age}</td>
                    <td class="mazyar-deadline">${mazyarCreateLoadingIcon2().outerHTML}</td>
                    <td class="mazyar-fee">${mazyarCreateLoadingIcon2().outerHTML}</td>
                    <td class="mazyar-bid">${mazyarCreateLoadingIcon2().outerHTML}</td>`;
                    mazyarFetchPlayerMarketDetail(player, sport).then((detail) => {
                        tr.querySelector(".mazyar-deadline").innerText = detail?.player?.deadlineFull ?? "passed";
                        tr.querySelector(".mazyar-fee").innerText = detail?.player?.fee ?? "n/a";
                        tr.querySelector(".mazyar-bid").innerText = detail?.player?.latestBid ?? "n/a";
                    });

                }
            }
        }

        return rows > 0 ? table : document.createTextNode('No players in transfer market.');
    }

    async function tableInjectTransferList(table) {
        const parent = table.parentNode.parentNode;

        const header = document.createElement("h2");
        header.classList.add("subheader", "clearfix");
        header.style.marginTop = "5px";
        header.innerText = "MZY Transfer List";
        header.style.fontWeight = "bold";
        parent?.appendChild(header);

        const div = document.createElement("div");
        div.classList.add("mainContent");
        div.style.padding = "5px";
        div.innerText = "fetching...";
        parent?.appendChild(div);

        const teams = table.querySelectorAll("tbody tr.responsive-hide");
        const jobs = [];
        for (const team of teams) {
            const teamLink = team.querySelector("td:nth-child(2) a:last-child");
            const tid = mazyarExtractTeamId(teamLink?.href);
            jobs.push(mazyarExtractPlayersProfileDetails(tid).then((detail) => {
                detail.team = teamLink;
                return detail;
            }));
        }
        const teamsPlayers = await Promise.all(jobs);
        const result = await tableCreateTransferList(teamsPlayers);
        div.replaceChildren(result);
    }

    function tableCreateTransferHistoryResultTable(histories, weeks) {
        let hasRows = false;
        const table = histories?.[0]?.cloneNode(2);
        table.classList.remove("marker");
        table.classList.add("nice_table");
        const [th3, th2] = table.querySelectorAll("thead tr td")[3].innerText.split("/");
        table.querySelectorAll("thead tr td")[2].innerText = th2;
        table.querySelectorAll("thead tr td")[3].innerText = th3;
        const tbody = table?.querySelector("tbody");
        tbody.replaceChildren();
        histories.forEach((history) => {
            mazyarFilterTransferHistory(history, weeks);
            if (history.filterResults > 0) {
                tbody.append(...[...history.querySelectorAll("tbody tr")].map((el) => el.cloneNode(2)));
                hasRows = true;
            }
        });
        return hasRows ? table : document.createTextNode("No history to display");
    }

    async function tableInjectRecentTransferHistory(table) {
        const parent = table.parentNode.parentNode;

        const header = document.createElement("div");
        header.classList.add("mazyar-flex-container-row", "subheader", "clearfix");
        header.style.justifyContent = "space-between";
        header.style.marginTop = "5px";

        const headerTitle = document.createElement("div");
        headerTitle.innerText = "MZY Transfer History";
        headerTitle.style.fontWeight = "bold";
        headerTitle.style.margin = "3px 0px";

        const options = {
            1: {
                value: "1",
                label: "last week",
            },
            2: {
                value: "2",
                label: "last two weeks",
            },
            3: {
                value: "3",
                label: "last three weeks",
            },
            4: {
                value: "4",
                label: "last month",
            },
        }
        const weekSelector = mazyarCreateDropDownMenu("", options, options[4].value);
        weekSelector.style.alignSelf = "unset";
        weekSelector.style.margin = "unset";
        weekSelector.style.marginLeft = "auto";
        header.appendChild(headerTitle);
        parent?.appendChild(header);

        const div = document.createElement("div");
        div.classList.add("mainContent");
        div.style.padding = "5px";
        div.innerText = "fetching...";
        parent?.appendChild(div);

        const histories = await mazyarGetTableTransferHistories(table);
        // now is the time to attach the selector
        header.appendChild(weekSelector);

        // delete histories older than maximum period
        const maxWeeks = Math.max(...Object.keys(options));
        histories.forEach((history) => mazyarRemoveOldTransferHistory(history, maxWeeks));

        const selectedWeeks = weekSelector.querySelector("select");
        const result = tableCreateTransferHistoryResultTable(histories, parseInt(selectedWeeks.value));
        div.replaceChildren(result);

        selectedWeeks.addEventListener("input", () => {
            const result = tableCreateTransferHistoryResultTable(histories, parseInt(selectedWeeks.value));
            div.replaceChildren(result);
        })
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
                    if (mazyar.mustAddTransferListToTable()) {
                        tableInjectTransferList(table);
                    }
                    if (mazyar.mustAddTransferHistoryToTable()) {
                        tableInjectRecentTransferHistory(table);
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
        tableWaitAndInjectTopPlayersInfo();

        const links = document.getElementsByTagName("a");
        for (const link of links) {
            if (["p=friendlySeries", "sub=standings"].every((text) => link.href.indexOf(text) > -1)) {
                link.onclick = tableWaitAndInjectTopPlayersInfo;
            }
        }
    }

    function tableInjectTopPlayersInfoToCup() {
        tableWaitAndInjectTopPlayersInfo();

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
        return mazyarHasDuplicates(names);
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
        const url = new URL(`https://${location.hostname}/?${filterParams}`);
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
            const filterButton = mazyarCreateMzStyledButton("MZY Filters", "red", "floatLeft");
            filterButton.style.margin = "0";
            filterButton.onclick = () => {
                document.getElementById("mazyar-transfer-filter-hits")?.click();
            };

            const saveButton = mazyarCreateMzStyledButton("MZY Save Filter", "blue", "floatLeft");
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
        const H4 = mazyarCreateMenuCheckBox("H4", transferOptions.H4, { margin: "auto 4px auto 1px" });
        const H3 = mazyarCreateMenuCheckBox("H3", transferOptions.H3, { margin: "auto 4px auto 1px" });
        const L2 = mazyarCreateMenuCheckBox("L2", transferOptions.L2, { margin: "auto 4px auto 1px" });
        const L1 = mazyarCreateMenuCheckBox("L1", transferOptions.L1, { margin: "auto 4px auto 1px" });
        const hide = mazyarCreateMenuCheckBox("Hide Others", transferOptions.hide, { margin: "auto 4px auto 1px" });

        H4.onclick = () => {
            mazyar.updateTransferOptions("H4", H4.querySelector("input[type=checkbox]").checked);
            mazyar.updateDisplayForTransferSearchResults(true);
        };

        H3.onclick = () => {
            mazyar.updateTransferOptions("H3", H3.querySelector("input[type=checkbox]").checked);
            mazyar.updateDisplayForTransferSearchResults(true);
        };

        L2.onclick = () => {
            mazyar.updateTransferOptions("L2", L2.querySelector("input[type=checkbox]").checked);
            mazyar.updateDisplayForTransferSearchResults(true);
        };

        L1.onclick = () => {
            mazyar.updateTransferOptions("L1", L1.querySelector("input[type=checkbox]").checked);
            mazyar.updateDisplayForTransferSearchResults(true);
        };

        hide.onclick = () => {
            mazyar.updateTransferOptions("hide", hide.querySelector("input[type=checkbox]").checked);
            mazyar.updateDisplayForTransferSearchResults(true);
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

    /* *********************** Predictor ********************************** */

    async function getNationalRankings() {
        const url = `https://${location.hostname}/?p=rank&sub=countryrank`;
        const doc = await mazyarFetchHtml(url);
        const rankings = [];
        if (doc) {
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
            <td style="text-align:right;padding: 0 4px;">[Value: <b style="color: ${team.valueColor};">${mazyarFormatBigNumber(team.value)}</b> ${team.currency}]</td>
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

        const sport = mazyarExtractSportType();
        const doc = await mazyarFetchHtml(url);
        if (doc) {
            const teams = doc.querySelectorAll("div.team-table");
            const results = [];
            for (const team of teams) {
                const link = team.querySelector("a");
                const name = link.innerText;
                const tid = mazyarExtractTeamId(link.href);
                const { players, currency } = await mazyarFetchPlayersAndCurrency(tid, sport);
                const playersOfSport = sport === "soccer" ? 11 : 21;
                const all = mazyarFilterPlayers(players, playersOfSport, 0, 99);
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

    async function getTrophiesCount(url) {
        const doc = await mazyarFetchHtml(url);
        if (doc) {
            const trophies = doc.querySelectorAll("div.trophy-wrapper:not(.icon)");
            return [...trophies].map((el) => {
                const text = el.innerText.trim();
                return text ? Number(text) : 1;
            }).reduce((a, b) => a + b, 0);
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
            salaryCell.replaceChildren(mazyarCreateLoadingIcon2());

            const bonusCell = row.insertCell(-1);
            bonusCell.style.textAlign = 'center';
            bonusCell.replaceChildren(mazyarCreateLoadingIcon2());

            const weeksCell = row.insertCell(-1);
            weeksCell.style.textAlign = 'center';
            weeksCell.replaceChildren(mazyarCreateLoadingIcon2());
        });
    }

    function trainersFetchSalaryAndWeeks(coachId, salaryCell, bonusCell, weeksCell) {
        const url = `https://${location.hostname}/?p=trainers&sub=offer&extra=freeagent&cid=${coachId}`;
        GM_xmlhttpRequest({
            method: "GET",
            url,
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

    /* *********************** Tactic ********************************** */

    function tacticAddDays() {
        const cssSelector = '#lightboxContent_player_profile #players_container';
        const callback = () => {
            const profile = document.querySelector(cssSelector);
            if (profile && !profile.daysInjected) {
                profile.daysInjected = true;
                mazyar.trainingAddDaysAtThisClubToPlayerProfile(profile);
                mazyar.addPlayerComment();
            }
        }
        const target = document.body;
        const config = { childList: true, subtree: true };
        const observer = new MutationObserver(callback);
        observer.observe(target, config);
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

    async function trainingInjectCampOpener(table) {
        const column = 6;
        const head = table.querySelector("thead tr");
        const th = document.createElement("td");
        th.style.textAlign = "right";
        th.innerText = "Left";
        head.insertBefore(th, head.children[column]);

        const players = table.querySelectorAll("tbody tr");
        for (const player of players) {
            const pid = mazyarExtractPlayerIdFromProfileLink(player.querySelector(".player_link")?.href);
            const campIcon = player.querySelector("td.dailyReportRightColumn img.content_middle");
            const td = document.createElement("td");
            td.style.textAlign = "right";
            if (campIcon) {
                campIcon.style.cursor = "pointer";
                campIcon.addEventListener("click", () => {
                    trainingOpenPlayerTrainingCamp(player);
                });
                td.innerHTML = `<strong id="mazyar-pid-${pid}"></strong>`;
            }
            player.insertBefore(td, player.children[column]);
        }
        mazyarFetchTrainingCampDetail().then((detail) => {
            if (detail) {
                for (const pid of Object.keys(detail)) {
                    const player = table.querySelector(`#mazyar-pid-${pid}`);
                    if (player) {
                        player.innerText = detail[pid].days ?? "n/a";
                    }
                }
            }
        })
    }

    function trainingAddCampOpenerToReport() {
        const callback = () => {
            const table = document.querySelector('#training_report > table');
            if (!table.injecting) {
                table.injecting = true;
                trainingInjectCampOpener(table);
            }
        };
        const target = document.getElementById('training_report');
        if (target) {
            const observer = new MutationObserver(callback);
            const config = { childList: true, subtree: true };
            observer.observe(target, config);
        }
    }

    function trainingAddDays() {
        const cssSelector = '#lightboxContent_player_profile #players_container';
        const callback = () => {
            const profile = document.querySelector(cssSelector);
            if (profile && !profile.daysInjected) {
                profile.daysInjected = true;
                mazyar.trainingAddDaysAtThisClubToPlayerProfile(profile);
                mazyar.addPlayerComment();
            }
        }
        const target = document.body;
        const config = { childList: true, subtree: true };
        const observer = new MutationObserver(callback);
        observer.observe(target, config);
    }

    /* *********************** Shortlist ********************************** */

    function shortlistAddDays() {
        const container = document.querySelector('div#shortlist_window div#players_container');
        mazyar.addDaysAtThisClubToAllPlayers(container);
        mazyar.addPlayerComment();
    }

    /* *********************** Class ********************************** */

    class Mazyar {
        #modal = null; // dom element
        #content = null; // dom element
        #notebook = {
            element: null,
            text: "",
            style: {
                hide: true,
                top: 0,
                left: 0,
                width: 200,
                height: 250,
            }
        }
        #settings = {
            miscellaneous: {
                in_progress_results: true,
                fixture_full_name: false,
                top_players_in_tables: true,
                mz_predictor: false,
                player_comment: false,
                coach_salary: false,
                table_transfer_list: false,
                table_transfer_history: false,
            },
            transfer: {
                enable_filters: false,
                display_maxed: false,
                display_camp: false,
                deadline: {
                    enabled: false,
                    play_bell: false,
                    timeout: 30,// minutes,
                },
            },
            days: {
                display_in_profiles: false,
                display_in_transfer: false,
                display_in_training: false,
                display_for_one_clubs: false,
            },
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
        #deadlines = {}; // {pid1: {name, deadline}, ...}
        #db;
        #deadlineLockAcquired;

        constructor(db) {
            this.#db = db;
            this.#fetchSettings();
            this.#fetchTransferOptions();
            this.#fetchFilters();

            this.#sport = mazyarExtractSportType();

            this.#createNotebook();
            this.#addToolbar();
            this.#createModal();

            this.#showChangelog();

            if (!this.isTransferFiltersEnabled()) {
                this.#resetTransferOptions();
            }
        }

        // -------------------------------- Settings -------------------------------------

        #fetchSettings() {
            this.#settings.transfer.enable_filters = GM_getValue("enable_transfer_filters", true);
            this.#settings.transfer.display_maxed = GM_getValue("display_maxed_in_transfer", true);
            this.#settings.transfer.display_camp = GM_getValue("display_camp_in_transfer", true);
            this.#settings.transfer.deadline.enabled = GM_getValue("deadline", true);
            this.#settings.transfer.deadline.play_bell = GM_getValue("deadline_play_bell", false);
            this.#settings.transfer.deadline.timeout = GM_getValue("deadline_timeout", 30);

            this.#settings.days.display_in_profiles = GM_getValue("display_days_in_profiles", true);
            this.#settings.days.display_in_transfer = GM_getValue("display_days_in_transfer", false);
            this.#settings.days.display_in_training = GM_getValue("display_days_in_training", true);
            this.#settings.days.display_for_one_clubs = GM_getValue("display_days_for_one_clubs", true);

            this.#settings.miscellaneous.in_progress_results = GM_getValue("display_in_progress_results", true);
            this.#settings.miscellaneous.top_players_in_tables = GM_getValue("display_top_players_in_tables", true);
            this.#settings.miscellaneous.mz_predictor = GM_getValue("mz_predictor", false);
            this.#settings.miscellaneous.player_comment = GM_getValue("player_comment", true);
            this.#settings.miscellaneous.coach_salary = GM_getValue("coach_salary", true);
            this.#settings.miscellaneous.fixture_full_name = GM_getValue("fixture_full_name", true);
            this.#settings.miscellaneous.table_transfer_list = GM_getValue("table_transfer_list", true);
            this.#settings.miscellaneous.table_transfer_history = GM_getValue("table_transfer_history", true);
        }

        #saveMiscellaneousSettings() {
            GM_setValue("display_in_progress_results", this.#settings.miscellaneous.in_progress_results);
            GM_setValue("display_top_players_in_tables", this.#settings.miscellaneous.top_players_in_tables);
            GM_setValue("mz_predictor", this.#settings.miscellaneous.mz_predictor);
            GM_setValue("player_comment", this.#settings.miscellaneous.player_comment);
            GM_setValue("coach_salary", this.#settings.miscellaneous.coach_salary);
            GM_setValue("fixture_full_name", this.#settings.miscellaneous.fixture_full_name);
            GM_setValue("table_transfer_list", this.#settings.miscellaneous.table_transfer_list);
            GM_setValue("table_transfer_history", this.#settings.miscellaneous.table_transfer_history);
            document.getElementById("mazyar-in-progress-icon").style.color = this.mustDisplayInProgressResults() ? "greenyellow" : "unset";
        }

        #saveTransferSettings() {
            GM_setValue("enable_transfer_filters", this.#settings.transfer.enable_filters);
            GM_setValue("display_maxed_in_transfer", this.#settings.transfer.display_maxed);
            GM_setValue("display_camp_in_transfer", this.#settings.transfer.display_camp);
            GM_setValue("deadline", this.#settings.transfer.deadline.enabled);
            GM_setValue("deadline_play_bell", this.#settings.transfer.deadline.play_bell);
            GM_setValue("deadline_timeout", this.#settings.transfer.deadline.timeout);
        }

        #saveDaysSettings() {
            GM_setValue("display_days_in_profiles", this.#settings.days.display_in_profiles);
            GM_setValue("display_days_in_transfer", this.#settings.days.display_in_transfer);
            GM_setValue("display_days_in_training", this.#settings.days.display_in_training);
            GM_setValue("display_days_for_one_clubs", this.#settings.days.display_for_one_clubs);
        }

        #updateTransferSettings(settings) {
            this.#settings.transfer = JSON.parse(JSON.stringify(settings));
            this.#saveTransferSettings();
            this.#resetTransferOptions();
            if (this.isTransferFiltersEnabled()) {
                this.#checkAllFilters(true);
            } else {
                this.#setFilterHitsInToolbar(0);
            }
        }

        #updateDaysSettings(settings) {
            this.#settings.days = JSON.parse(JSON.stringify(settings));
            this.#saveDaysSettings();
        }

        #updateMiscellaneousSettings(settings) {
            this.#settings.miscellaneous = JSON.parse(JSON.stringify(settings));
            this.#saveMiscellaneousSettings();
        }

        #disableDisplayingInProgressResults() {
            this.#settings.miscellaneous.in_progress_results = false;
            GM_setValue("display_in_progress_results", this.#settings.miscellaneous.in_progress_results);
        }

        #enableDisplayingInProgressResults() {
            this.#settings.miscellaneous.in_progress_results = true;
            GM_setValue("display_in_progress_results", this.#settings.miscellaneous.in_progress_results);
        }

        async #cleanInstall() {
            this.#updateMiscellaneousSettings({
                in_progress_results: false,
                top_players_in_tables: false,
                mz_predictor: false,
                player_comment: false,
                coach_salary: false,
                fixture_full_name: false,
                table_transfer_list: false,
                table_transfer_history: false,
            });
            this.#updateDaysSettings({
                display_in_profiles: false,
                display_in_transfer: false,
                display_in_training: false,
                display_for_one_clubs: false,
            });
            this.#updateTransferSettings({
                enable_filters: false,
                display_maxed: false,
                display_camp: false,
                deadline: {
                    enabled: false,
                    play_bell: false,
                    timeout: 30,// minutes,
                },
            });
            this.deleteAllFilters();
            await this.#clearIndexedDb();
            this.#resetTransferOptions();
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

        // -------------------------------- Settings Getters -------------------------------------

        isTransferFiltersEnabled() {
            return this.#settings.transfer.enable_filters;
        }

        #mustMarkMaxedSkills() {
            return this.#settings.transfer.display_maxed;
        }
        #isTransferCampEnabled() {
            return this.#settings.transfer.display_camp;
        }

        #isTransferDeadlineAlertEnabled() {
            return this.#settings.transfer.deadline.enabled;
        }

        #getTransferDeadlineTimeout() {
            return this.#settings.transfer.deadline.timeout
        }

        #mustPlayBellForDeadline() {
            return this.#settings.transfer.deadline.play_bell;
        }

        isDaysAtThisClubEnabledForPlayerProfiles() {
            return this.#settings.days.display_in_profiles;
        }

        #isDaysAtThisClubEnabledForTraining() {
            return this.#settings.days.display_in_training;
        }

        #isDaysAtThisClubEnabledForTransferMarket() {
            return this.#settings.days.display_in_transfer;
        }

        isDaysAtThisClubEnabledForOneClubPlayers() {
            return this.#settings.days.display_for_one_clubs;
        }

        mustDisplayInProgressResults() {
            return this.#settings.miscellaneous.in_progress_results;
        }

        mustDisplayTopPlayersInTables() {
            return this.#settings.miscellaneous.top_players_in_tables;
        }

        mustHelpWithPredictor() {
            return this.#settings.miscellaneous.mz_predictor;
        }

        #mustAddPlayerComment() {
            return this.#settings.miscellaneous.player_comment;
        }

        mustAddCoachSalaries() {
            return this.#settings.miscellaneous.coach_salary;
        }

        mustAddFullNamesToFixture() {
            return this.#settings.miscellaneous.fixture_full_name;
        }

        mustAddTransferListToTable() {
            return this.#settings.miscellaneous.table_transfer_list;
        }

        mustAddTransferHistoryToTable() {
            return this.#settings.miscellaneous.table_transfer_history;
        }

        // -------------------------------- Database -------------------------------------

        async #clearIndexedDb() {
            // TODO: clear comments?
            await this.#db.scout.clear();
            await this.#db.hit.clear();
            await this.#db.filter.clear();
            await this.#db.player.clear();
            await this.#db.hide.clear();
            await this.#db.deadline.clear();
        }

        async #isPlayerInHideListInIndexDb(pid) {
            const player = await this.#db.hide.get({ pid, sport: this.#sport });
            return player?.ts > 0;
        }

        async #addPlayerToHideListInIndexDb(pid) {
            if (pid) {
                await this.#db.hide.put({ pid, sport: this.#sport, ts: Date.now() });
            }
        }

        async #addPlayerToDeadlineListInIndexDb(player = {
            pid: "",
            deadline: 0,
            name: "",
            deadlineFull: "",
            latestBid: "",
            source: "monitor",
            flag: "",
        }) {
            if (player?.pid) {
                this.#deadlines[player.pid] = { ...player };
                await this.#db.deadline.put({
                    sport: this.#sport,
                    ts: Date.now(),
                    pid: player.pid,
                    deadline: player.deadline,
                    name: player.name,
                    deadlineFull: player.deadlineFull,
                    latestBid: player.latestBid,
                    source: player.source,
                    flag: player.flag,
                });
            }
        }

        async #removePlayerFromDeadlineList(pid) {
            if (pid) {
                delete this.#deadlines[pid];
                await this.#db.deadline.delete([this.#sport, pid])
                    .catch((err) => console.warn(err));
            }
        }

        async #fetchDeadlinePlayersFromIndexedDb() {
            if (!this.#isTransferDeadlineAlertEnabled()) {
                return [];
            }
            return await this.#db.deadline.toArray()
                .then((players) => {
                    return players?.filter((player) => player.sport === this.#sport);
                }
                ).catch((err) => {
                    console.warn(err);
                    return [];
                });
        }

        async #deletePlayersFromHideListInIndexDb(days = 0) {
            const outdate = Date.now() - days * 24 * 60 * 60 * 1000;
            return await this.#db.hide.where("ts").below(outdate).delete().then((deleteCount) => {
                return deleteCount;
            }).catch((error) => {
                console.warn(error);
                return 0;
            });
        }

        async #countPlayersOfHideListInIndexDb() {
            return await this.#db.hide.where("ts").above(0).count();
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

        async #fetchOrExtractPlayerProfile(playerId) {
            let profile = await this.#fetchPlayerProfileFromIndexedDb(playerId);
            if (!profile || (profile.days > 0 && !profile.price) || (profile.camp === undefined)) {
                profile = await mazyarExtractPlayerProfile(playerId);
                this.#setPlayerProfileInIndexedDb(profile);
            }
            return profile;
        }

        async #fetchOrExtractPlayerScoutReport(player) {
            const playerId = player.querySelector("h2 a")?.href?.match(/pid=(\d+)/)?.[1];
            let report = await this.#fetchScoutReportFromIndexedDb(playerId);
            if (!report) {
                const skills = mazyarExtractSkillNamesFromPlayerInfo(player);
                report = await mazyarExtractPlayerScoutReport(playerId, skills, this.#sport);
                if (report) {
                    this.#setScoutReportInIndexedDb(report);
                }
            }
            return report;
        }

        async #getPlayerScoutReportForSearchResult(players) {
            const jobs = [];
            for (const player of [...players.children]) {
                if (player.classList.contains("playerContainer") && player.querySelector("span.scout_report > a")) {
                    jobs.push(this.#fetchOrExtractPlayerScoutReport(player));
                }
            }
            const reports = await Promise.all(jobs);
            return reports.filter((report) => report != null);
        }

        #isQualifiedForTransferScoutFilter(report, lows = [], highs = []) {
            return highs.includes(report.H) && lows.includes(report.L);
        }

        #areTransferLowOptionsSelected() {
            return this.#transferOptions.L2 || this.#transferOptions.L1;
        }

        #areTransferHighOptionsSelected() {
            return this.#transferOptions.H4 || this.#transferOptions.H3;
        }

        #areTransferScoutOptionsSelected() {
            return this.#areTransferLowOptionsSelected() || this.#areTransferHighOptionsSelected();
        }

        #getAcceptableHighsAndLows() {
            let lows = [];
            let highs = [];

            if (this.#areTransferLowOptionsSelected()) {
                if (this.#transferOptions.L2) {
                    lows.push(2);
                }
                if (this.#transferOptions.L1) {
                    lows.push(1);
                }
            } else {
                lows = [1, 2, 3];
            }

            if (this.#areTransferHighOptionsSelected()) {
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

        #applyTransferFilters(report, lows, highs) {
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

        #clearTransferFilters() {
            document.querySelectorAll(".mazyar-hide")?.forEach((el) => {
                el.classList.remove("mazyar-hide");
            });
            document.querySelectorAll(".mazyar-dim-50")?.forEach((el) => el.classList.remove("mazyar-dim-50"));
            document.querySelectorAll(".mazyar-dim-60")?.forEach((el) => el.classList.remove("mazyar-dim-60"));
        }

        #doesTransferNeedPlayerProfile() {
            return this.#isDaysAtThisClubEnabledForTransferMarket() || this.#mustMarkMaxedSkills() || this.#isTransferCampEnabled();
        }

        #addCampIconToTransferProfile(player, isSent) {
            if (player.campInjected) {
                return;
            }
            player.campInjected = true;
            const camp = document.createElement("tr");

            const label = document.createElement("td");
            label.innerText = "Camp Status:";

            const status = document.createElement("td");
            status.innerHTML = `<img style="height:1rem; border: solid 1px;" src="nocache-904/img/player/icon_trainingcamp_${isSent ? "dg" : "bw"}.png">`

            camp.appendChild(label);
            camp.appendChild(status);

            const target = player.querySelector("div.floatLeft table td:nth-child(2) > table tbody");
            target?.appendChild(camp);
        }

        async #updateProfileRelatedFieldsInTransfer(player) {
            const playerId = mazyarExtractPlayerIdFromContainer(player);
            await this.#fetchOrExtractPlayerProfile(playerId).then((profile) => {
                if (this.#isDaysAtThisClubEnabledForTransferMarket()) {
                    this.#squadAddDaysAtThisClubForSinglePlayer(player, profile);
                }
                if (this.#mustMarkMaxedSkills()) {
                    mazyarColorizeMaxedSkills(player, profile?.maxed);
                }
                if (this.#isTransferCampEnabled()) {
                    this.#addCampIconToTransferProfile(player, profile?.camp);
                }
            });
        };

        async #hidePlayerAccordingToHideList(player) {
            const playerId = mazyarExtractPlayerIdFromContainer(player);
            if (await this.#isPlayerInHideListInIndexDb(playerId)) {
                player.style.display = 'none';
            }
        }

        #addHideButtonToPlayerInTransferMarket(player) {
            if (player.hideButtonInjected) {
                return;
            }
            player.hideButtonInjected = true;
            const playerId = mazyarExtractPlayerIdFromContainer(player);
            const hideIcon = mazyarCreateDeleteIcon("Hide player from search result.");
            hideIcon.classList.add("floatRight");
            hideIcon.style.marginTop = "0.2rem";
            player.querySelector("h2.clearfix div")?.appendChild(hideIcon);

            hideIcon.addEventListener("click", () => {
                this.#addPlayerToHideListInIndexDb(playerId);
                player.style.display = 'none';
            });
        }

        async #processTransferSearchResults(results) {
            const { lows, highs } = this.#getAcceptableHighsAndLows();
            const players = [...results.children].filter((player) => player.classList.contains("playerContainer"));
            const deadlines = await this.#fetchDeadlinePlayersFromIndexedDb();
            const jobs = [];
            for (const player of players) {
                this.#addHideButtonToPlayerInTransferMarket(player);
                if (this.#isTransferDeadlineAlertEnabled()) {
                    this.#addDeadlineButtonToPlayerInTransferMarket(player, deadlines);
                }
                jobs.push(this.#hidePlayerAccordingToHideList(player));
                if (this.#doesTransferNeedPlayerProfile()) {
                    jobs.push(this.#updateProfileRelatedFieldsInTransfer(player));
                }
                if (this.#areTransferScoutOptionsSelected()) {
                    if (player.querySelector("span.scout_report > a")) {
                        jobs.push(this.#fetchOrExtractPlayerScoutReport(player).then((report) => {
                            mazyarColorizeSkills(player, report);
                            this.#applyTransferFilters(report, lows, highs);
                        }));
                    } else {
                        const className = this.#transferOptionsMustHide() ? "mazyar-hide" : "mazyar-dim-50";
                        player.classList.add(className);
                    }
                }
            }
            await Promise.all(jobs);
        }

        #mustUpdateDisplayForTransferSearchResults() {
            return this.#areTransferScoutOptionsSelected() || this.#doesTransferNeedPlayerProfile();
        }

        async updateDisplayForTransferSearchResults(clear = false) {
            if (clear) {
                this.#clearTransferFilters();
            }
            if (this.#mustUpdateDisplayForTransferSearchResults()) {
                const results = document.getElementById("players_container");
                if (results) {
                    await this.#processTransferSearchResults(results);
                }
            }
        }

        #injectHideButtonToTransferMarket() {
            const target = document.querySelector("#searchform div.buttons-wrapper.clearfix");
            if (target) {
                const hideButton = mazyarCreateMzStyledButton("MZY Hide", "red", "floatLeft");
                hideButton.style.margin = "0";
                hideButton.onclick = () => {
                    this.#displayTransferHideMenu();
                };
                target.appendChild(hideButton);
            }
        }

        async executeTransferTasks() {
            this.#injectHideButtonToTransferMarket();
            this.updateDisplayForTransferSearchResults();

            const callback = (mutationsList) => {
                if (mutationsList.find(mutation => mutation.type == "childList")) {
                    this.updateDisplayForTransferSearchResults();
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
                texts.push('<span class="mazyar-scout-4">H4</span>');
            }
            if (options.H3) {
                texts.push('<span class="mazyar-scout-3">H3</span>');
            }
            if (options.L2) {
                texts.push('<span class="mazyar-scout-2">L2</span>');
            }
            if (options.L1) {
                texts.push('<span class="mazyar-scout-1">L1</span>');
            }
            return texts.join(", ");
        }

        #getSelectedScoutsOptionTextForFilter(scout) {
            const texts = [];
            if (scout.high.includes(4)) {
                texts.push('<span class="mazyar-scout-4">H4</span>');
            }
            if (scout.high.includes(3)) {
                texts.push('<span class="mazyar-scout-3">H3</span>');
            }
            if (scout.low.includes(2)) {
                texts.push('<span class="mazyar-scout-2">L2</span>');
            }
            if (scout.low.includes(1)) {
                texts.push('<span class="mazyar-scout-1">L1</span>');
            }
            return texts.join(", ");
        }

        #monitorCreateNoPlayerWarning() {
            const warning = document.createElement("div");
            warning.classList.add("mazyar-monitor-player-row");
            warning.innerText = "No players have been added to the MZY Deadline Monitor.";
            warning.style.padding = "1rem 0.5rem 0";
            return warning;
        }

        #monitorAddPlayers(tbody, players) {
            mazyarClearPlayerRowsInMonitor(tbody);
            if (players.length === 0) {
                const warning = this.#monitorCreateNoPlayerWarning();
                tbody.appendChild(warning);
                return;
            }

            const deadlineTimeout = this.#getTransferDeadlineTimeout();
            for (const player of players) {
                const row = mazyarCreatePlayerRowForMonitor(player, deadlineTimeout);
                const removeIcon = mazyarCreateAddToDeadlineIcon("Remove player from MZY Deadline Monitor", "red");
                removeIcon.style.fontSize = "11px";
                row.querySelector("table.deadline-table tbody tr").appendChild(removeIcon);
                tbody.appendChild(row);
                const separators = monitorAddRowSeparator();
                separators?.forEach((sep) => tbody.appendChild(sep));

                removeIcon.addEventListener("click", async () => {
                    await this.#removePlayerFromDeadlineList(player.pid);
                    this.#deadlineUpdateIconStyle();
                    tbody.removeChild(row);
                    separators.forEach((sep) => tbody.removeChild(sep));
                    if (!tbody.querySelector(".mazyar-monitor-player-row")) {
                        const warning = this.#monitorCreateNoPlayerWarning();
                        tbody.appendChild(warning);
                    }
                });
            }
        }

        monitorInject() {
            if (this.#isTransferDeadlineAlertEnabled()) {
                const target = document.querySelector('div.baz.bazCenter >div > div.win_back > table');
                if (target) {
                    const monitor = mazyarCreateSectionForMonitor("MZY Monitor", "mazyar-monitor-section");
                    target.appendChild(monitor);
                    target.appendChild(mazyarCreateSectionSeparatorForMonitor());

                    const tbody = monitor.querySelector("td > div > table > tbody");
                    document.body.addEventListener("deadlines-updated", () => {
                        const players = Object.values(this.#deadlines)
                            .filter((player) => player.source === "mzy")
                            .sort((a, b) => a.deadline - b.deadline);
                        this.#monitorAddPlayers(tbody, players);
                    });
                }
            }
        }

        // -------------------------------- Player Options -------------------------------------

        async #addPlayerCommentIcon(player) {
            const playerId = mazyarExtractPlayerIdFromContainer(player);

            const parent = document.createElement("span");
            parent.classList.add("player_icon_placeholder");

            const a = document.createElement("a");
            a.classList.add("player_icon");
            parent.appendChild(a);

            const iconSpan = document.createElement("span");
            iconSpan.classList.add("player_icon_wrapper");
            a.appendChild(iconSpan);

            const commentIcon = mazyarCreateCommentIcon("MZY Comment");
            commentIcon.style.fontSize = "1.2rem";
            iconSpan.appendChild(commentIcon);

            if (location.hostname === 'www.managerzone.com') {
                parent.classList.add("mazyar-player-comment-icon-www");
            }

            if (await this.#fetchPlayerCommentFromIndexedDb(playerId)) {
                commentIcon.classList.add("mazyar-player-comment-icon-active");
            } else {
                commentIcon.classList.add("mazyar-player-comment-icon-inactive");
            }

            commentIcon.addEventListener("click", (event) => {
                this.#displayPlayerComment(event?.target, playerId);
            });

            const whitespace = document.createTextNode(" ");
            player.querySelector(".p_links")?.appendChild(whitespace);
            player.querySelector(".p_links")?.appendChild(parent);
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

        async #squadAddDaysAtThisClubForSinglePlayer(player, profile, addPrice = true) {
            if (player.daysInjected) {
                return;
            }
            player.daysInjected = true;
            const daysDiv = document.createElement("div");
            if (profile?.days >= 0) {
                const text = profile?.days === 0 ? 'N/A' : `≤ ${profile?.days}`;
                daysDiv.innerHTML = `Days at this club: <strong>${text}</strong>`;
                if (addPrice && profile?.price !== null) {
                    daysDiv.innerHTML += ` <span style="margin-left: 25px;">Transfer Fee: <strong style="color: blue;">${profile?.price}</strong><span>`;
                }
                daysDiv.classList.add("mazyar-days-at-this-club");
            } else if (this.isDaysAtThisClubEnabledForOneClubPlayers()) {
                const text = 'Entire Career';
                daysDiv.innerHTML = `Days at this club: <strong>${text}</strong>`;
                daysDiv.classList.add("mazyar-days-at-this-club", "mazyar-days-entire");
            }
            player.querySelector("div.mainContent")?.appendChild(daysDiv);
        }

        async addDaysAtThisClubToAllPlayers(container) {
            if (this.isDaysAtThisClubEnabledForPlayerProfiles()) {
                const jobs = [];
                const players = container?.querySelectorAll("div.playerContainer");
                for (const player of players) {
                    jobs.push((async (player) => {
                        const playerId = mazyarExtractPlayerIdFromContainer(player);
                        await this.#fetchOrExtractPlayerProfile(playerId).then((profile) => {
                            this.#squadAddDaysAtThisClubForSinglePlayer(player, profile);
                        });
                    })(player));
                }
                Promise.all(jobs);
            }
        }

        async trainingAddDaysAtThisClubToPlayerProfile(container) {
            if (this.#isDaysAtThisClubEnabledForTraining()) {
                const player = container.querySelector("div.playerContainer");
                const playerId = mazyarExtractPlayerIdFromContainer(player);
                await this.#fetchOrExtractPlayerProfile(playerId).then((profile) => {
                    this.#squadAddDaysAtThisClubForSinglePlayer(player, profile);
                });
            }
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

        async #updateFilterDetails(name, params, scout, interval) {
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
                    id: mazyarGenerateUuidV4(),
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
            if (filter.interval === MAZYAR_TRANSFER_INTERVALS.never.value) {
                return false;
            } else if (filter.interval === MAZYAR_TRANSFER_INTERVALS.onceDay.value) {
                return passed > 24 * 60 * 60 * 1000;
            } else if (filter.interval === MAZYAR_TRANSFER_INTERVALS.onceHour.value) {
                return passed > 1 * 60 * 60 * 1000;
            } else if (filter.interval === MAZYAR_TRANSFER_INTERVALS.onceMinute.value) {
                return passed > 1 * 60 * 1000;
            }
            // 'always' or any invalid value means always
            return true;
        }

        #getAcceptableHighsAndLowsForFilter(scout) {
            const lows = scout.low.length > 0 ? scout.low : [1, 2, 3];
            const highs = scout.high.length > 0 ? scout.high : [1, 2, 3, 4];
            return { lows, highs };
        }

        async #getFilterHitsByOffset(filter, offset = 0) {
            let totalHits = -1;
            let scoutHits = -1;
            const url = `https://${location.hostname}/ajax.php?p=transfer&sub=transfer-search&sport=${this.#sport}${filter.params}&o=${offset}`;
            const data = await mazyarFetchJson(url);
            if (data) {
                totalHits = Number(data?.totalHits);
                const searchResults = document.createElement("div");
                searchResults.innerHTML = data.players;
                if (filter.scout) {
                    const playersReport = await this.#getPlayerScoutReportForSearchResult(searchResults);
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
            this.#modal.id = "mazyar-modal-overlay";
            this.#modal.classList.add("mazyar-flex-container");

            this.#content = document.createElement("div");
            this.#content.id = "mazyar-modal";
            this.#content.classList.add("mazyar-flex-container", "mazyar-scrollable-vertical");

            this.#modal.appendChild(this.#content);
            this.#hideModal();
            document.body?.appendChild(this.#modal);
        }

        #addToolbar() {
            const { toolbar, menu, transfer, note, live } = mazyarCreateToolbar();
            menu.addEventListener("click", () => {
                this.#displaySettingsMenu();
            });
            transfer.addEventListener("click", () => {
                this.#displayTransferFilters();
            });
            note.addEventListener("click", () => {
                if (this.#notebook.style.hide) {
                    this.#showNotebook();
                    this.#saveNotebookStyle();
                } else {
                    this.#hideNotebook();
                    this.#saveNotebookStyle();
                }
            });
            live.style.color = this.mustDisplayInProgressResults() ? "greenyellow" : "unset";
            live.addEventListener("click", () => {
                if (this.mustDisplayInProgressResults()) {
                    this.#disableDisplayingInProgressResults();
                    live.style.color = "unset";
                } else {
                    this.#enableDisplayingInProgressResults();
                    live.style.color = "greenyellow";
                }
                if (this.#couldInjectInProgressResults()) {
                    location.reload();
                }
            });
            document.addEventListener("focus", () => {
                this.#updateInProgressIconDisplay(live);
            });
            document.body?.appendChild(toolbar);
        }

        #couldInjectInProgressResults() {
            const uri = document.baseURI;
            return (uri.search("/?p=match") > -1 && (uri.search("&sub=result") < 0))
                || (uri.search("/?p=cup&") > -1)
                || (uri.search("/?p=private_cup&") > -1)
                || (uri.search("/?p=friendlyseries") > -1)
                || (uri.search("/?p=league") > -1);
        }

        #updateInProgressIconDisplay(icon) {
            const last = this.mustDisplayInProgressResults();
            this.#settings.miscellaneous.in_progress_results = GM_getValue("display_in_progress_results", true);
            const current = this.mustDisplayInProgressResults();
            if (last !== current) {
                icon.style.color = current ? "greenyellow" : "unset";
                if (this.#couldInjectInProgressResults()) {
                    location.reload();
                }
            }
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
            const header = mazyarCreateMzStyledTitle(title, () => {
                this.#hideModal();
            });

            const div = document.createElement("div");
            div.style.margin = "1rem";

            const loading = mazyarCreateLoadingIcon2();
            loading.style.fontSize = "x-large";

            div.appendChild(loading);

            this.#replaceModalContent([header, div]);
        }

        #displayCleanInstallMenu() {
            const div = document.createElement("div");
            const title = mazyarCreateMzStyledTitle("MZY Settings - Clean", () => {
                this.#hideModal();
                this.#displaySettingsMenu();
            });
            const notice = document.createElement("div");
            const buttons = document.createElement("div");
            const cancel = mazyarCreateMzStyledButton("Cancel", "red");
            const clean = mazyarCreateMzStyledButton("Clean", "blue");

            div.classList.add("mazyar-flex-container");

            buttons.classList.add("mazyar-flex-container-row");

            notice.innerHTML = "All Settings, Filters, Scout Reports and ... will be deleted.<br>Are you sure?";
            notice.style.padding = "1rem";

            clean.addEventListener("click", async () => {
                await this.#cleanInstall();
                this.#hideModal();
                this.#displaySettingsMenu();
            });

            cancel.addEventListener("click", () => {
                this.#hideModal();
                this.#displaySettingsMenu();
            });

            div.appendChild(title);
            div.appendChild(notice);
            buttons.appendChild(cancel);
            buttons.appendChild(clean);
            div.appendChild(buttons);

            this.#replaceModalContent([div]);
        }

        // --------------------------- Notebook ------------------------------------

        #fetchNotebookStyle() {
            const defaultStyle = {
                hide: true,
                top: 0,
                left: 0,
                width: 200,
                height: 250,
            };
            this.#notebook.style = GM_getValue("notebook_style", defaultStyle);

            // reject invalid data
            if (this.#notebook.style.top < 0
                || this.#notebook.style.left < 0
                || this.#notebook.style.left > window.innerWidth
                || this.#notebook.style.top > window.innerHeight) {
                this.#notebook.style.top = 0;
                this.#notebook.style.left = 0;
                this.#saveNotebookStyle();
            }
        }

        #saveNotebookStyle() {
            GM_setValue("notebook_style", this.#notebook.style);
        }

        #fetchNotebookText() {
            this.#notebook.text = GM_getValue("notebook_text", "");
        }

        #saveNotebookText() {
            GM_setValue("notebook_text", this.#notebook.text);
        }

        #updateNotebookDisplay(content, text) {
            this.#fetchNotebookStyle();
            this.#fetchNotebookText();

            if (this.#notebook.style.hide) {
                this.#notebook.element.style.display = "none";
            } else {
                this.#notebook.element.style.display = "flex";
            }
            text.value = this.#notebook.text;
            content.style.width = this.#notebook.style.width + "px";
            content.style.height = this.#notebook.style.height + "px";
            content.style.top = this.#notebook.style.top + "px";
            content.style.left = this.#notebook.style.left + "px";
        }

        #updateNotebookLocation(content) {
            const { top, left, width, height } = content.getBoundingClientRect();
            this.#notebook.style.top = top;
            this.#notebook.style.left = left;
            this.#notebook.style.width = width;
            this.#notebook.style.height = height;
        }

        #hideNotebook() {
            this.#notebook.element.style.display = "none";
            this.#notebook.style.hide = true;
        }

        #showNotebook() {
            this.#notebook.element.style.display = "flex";
            this.#notebook.style.hide = false;
        }

        #createNotebook() {
            this.#notebook.element = document.createElement("div");
            const content = document.createElement("div");

            const contentHeader = mazyarCreateMzStyledTitle("MZY Notebook", () => {
                this.#hideNotebook();
                this.#saveNotebookStyle();
            });
            const text = document.createElement("textarea");
            const hide = mazyarCreateMzStyledButton("Hide", "blue");
            const save = mazyarCreateMzStyledButton("Save", "green");
            const warning = document.createElement("div");
            const discard = mazyarCreateMzStyledButton("Discard", "red");
            const buttons = document.createElement("div");

            this.#notebook.element.classList.add("mazyar-flex-container", "mazyar-notebook-plain", "mazyar-scrollable-vertical");
            content.classList.add("mazyar-flex-container", "mazyar-resizable", "mazyar-scrollable-vertical", "mazyar-notebook-modal");
            text.classList.add("mazyar-notebook-textarea");
            buttons.classList.add("mazyar-flex-container-row");

            warning.innerText = "You have unsaved changes!";
            warning.style.color = "red";
            warning.style.display = "none";
            warning.style.marginTop = "5px";
            save.style.display = "none";
            discard.style.display = "none";

            this.#updateNotebookDisplay(content, text);
            document.addEventListener("focus", () => {
                this.#updateNotebookDisplay(content, text);
                save.style.display = "none";
                warning.style.display = "none";
                discard.style.display = "none";
            });

            mazyarMakeElementDraggable(content, contentHeader, () => {
                this.#updateNotebookLocation(content);
                this.#saveNotebookStyle();
            });

            content.addEventListener("mouseup", () => {
                this.#updateNotebookLocation(content);
                this.#saveNotebookStyle();
            })

            text.addEventListener("input", () => {
                if (text.value !== this.#notebook.text) {
                    save.style.display = "unset";
                    warning.style.display = "unset";
                    discard.style.display = "unset";
                } else {
                    save.style.display = "none";
                    warning.style.display = "none";
                    discard.style.display = "none";
                }
            })

            discard.addEventListener("click", () => {
                text.value = this.#notebook.text;
                save.style.display = "none";
                warning.style.display = "none";
                discard.style.display = "none";
            });

            hide.addEventListener("click", () => {
                this.#hideNotebook();
                this.#saveNotebookStyle();
            });

            save.addEventListener("click", () => {
                this.#notebook.text = text.value;
                this.#saveNotebookText();
                save.style.display = "none";
                warning.style.display = "none";
                discard.style.display = "none";
            });

            buttons.appendChild(hide);
            buttons.appendChild(discard);
            buttons.appendChild(save);
            content.appendChild(contentHeader);
            content.appendChild(text);
            content.appendChild(warning);
            content.appendChild(buttons);
            this.#notebook.element.appendChild(content);
            document.body?.appendChild(this.#notebook.element);
        }

        // ----------------------------------------------------------------------------------

        #createDeadlineOptions(level1Style, level2Style) {
            const div = document.createElement("div");
            div.classList.add("mazyar-flex-container");
            const enabled = mazyarCreateMenuCheckBox("Enable deadline alert", this.#settings.transfer.deadline.enabled, level1Style);
            const playBell = mazyarCreateMenuCheckBox("Sound Notification", this.#settings.transfer.deadline.play_bell, level2Style);
            const timeout = mazyarCreateSubMenuTextInput("Timeout", "30", this.#settings.transfer.deadline.timeout);
            const unit = document.createTextNode("minute(s)");
            timeout.appendChild(unit);

            timeout.style.display = this.#settings.transfer.deadline.enabled ? "unset" : "none";
            playBell.style.display = this.#settings.transfer.deadline.enabled ? "unset" : "none";

            div.appendChild(enabled); // child node 0
            div.appendChild(timeout); // child node 1
            div.appendChild(playBell); // child node 2

            enabled.addEventListener("input", () => {
                timeout.style.display = enabled.querySelector("input[type='checkbox']").checked ? "unset" : "none";
                playBell.style.display = enabled.querySelector("input[type='checkbox']").checked ? "unset" : "none";
            });

            timeout.addEventListener("input", () => {
                const minutes = timeout.querySelector("input[type='text']");
                if (minutes?.value?.match(/^\d+$/)) {
                    const value = Number(minutes?.value)
                    if (value < 1) {
                        minutes.value = "1";
                    } else if (value > 360) {
                        minutes.value = "360";
                    }
                } else {
                    minutes.value = "";
                }
            });

            return div;
        }

        #displayTransferSettingsMenu() {
            const level1Style = { margin: "0.3rem 0.7rem" };
            const level2Style = { margin: "0.3rem 1.2rem" };

            const div = document.createElement("div");
            const title = mazyarCreateMzStyledTitle(`MZY Transfer Settings`, () => {
                this.#hideModal();
                this.#displaySettingsMenu();
            });

            const group = document.createElement("div");
            const filters = mazyarCreateMenuCheckBox("Enable transfer filters", this.#settings.transfer.enable_filters, level1Style);
            const maxed = mazyarCreateMenuCheckBox("Mark maxed skills", this.#settings.transfer.display_maxed, level1Style);
            const camp = mazyarCreateMenuCheckBox("Check if player is sent to camp", this.#settings.transfer.display_camp, level1Style);
            const deadline = this.#createDeadlineOptions(level1Style, level2Style);
            group.appendChild(filters);
            group.appendChild(maxed);
            group.appendChild(camp);
            group.appendChild(deadline);

            const buttons = document.createElement("div");
            const cancel = mazyarCreateMzStyledButton("Cancel", "red");
            const save = mazyarCreateMzStyledButton("Save", "green");

            div.classList.add("mazyar-flex-container");

            buttons.classList.add("mazyar-flex-container-row");

            cancel.addEventListener("click", () => {
                this.#hideModal();
                this.#displaySettingsMenu();
            });

            save.onclick = () => {
                const deadlineTimeout = Number(deadline.childNodes[1].querySelector("input[type=text]")?.value);
                this.#updateTransferSettings({
                    enable_filters: filters.querySelector("input[type=checkbox]").checked,
                    display_maxed: maxed.querySelector("input[type=checkbox]").checked,
                    display_camp: camp.querySelector("input[type=checkbox]").checked,
                    deadline: {
                        enabled: deadline.childNodes[0].querySelector("input[type=checkbox]")?.checked,
                        play_bell: deadline.childNodes[2].querySelector("input[type=checkbox]")?.checked,
                        timeout: deadlineTimeout > 0 && deadlineTimeout <= 360 ? deadlineTimeout : 30,
                    },
                });
                this.#hideModal();
                this.#displaySettingsMenu();
            };

            div.appendChild(title);
            div.appendChild(group);
            buttons.appendChild(cancel);
            buttons.appendChild(save);
            div.appendChild(buttons);

            this.#replaceModalContent([div]);
        }

        #displayDaysSettingsMenu() {
            const level1Style = { margin: "0.3rem 0.7rem" };

            const div = document.createElement("div");
            const title = mazyarCreateMzStyledTitle(`MZY Days Settings`, () => {
                this.#hideModal();
                this.#displaySettingsMenu();
            });

            const group = document.createElement("div");
            const daysInProfiles = mazyarCreateMenuCheckBox("Display in player profiles", this.#settings.days.display_in_profiles, level1Style);
            const daysInTransfer = mazyarCreateMenuCheckBox("Display in transfer market", this.#settings.days.display_in_transfer, level1Style);
            const daysInTraining = mazyarCreateMenuCheckBox("Display in training report", this.#settings.days.display_in_training, level1Style);
            const daysForOneClubs = mazyarCreateMenuCheckBox("Display for One-Club players", this.#settings.days.display_for_one_clubs, level1Style);
            group.appendChild(daysInProfiles);
            group.appendChild(daysInTransfer);
            group.appendChild(daysInTraining);
            group.appendChild(daysForOneClubs);

            const buttons = document.createElement("div");
            const cancel = mazyarCreateMzStyledButton("Cancel", "red");
            const save = mazyarCreateMzStyledButton("Save", "green");

            div.classList.add("mazyar-flex-container");

            buttons.classList.add("mazyar-flex-container-row");

            cancel.addEventListener("click", () => {
                this.#hideModal();
                this.#displaySettingsMenu();
            });

            save.onclick = () => {
                this.#updateDaysSettings({
                    display_in_profiles: daysInProfiles.querySelector("input[type=checkbox]").checked,
                    display_in_transfer: daysInTransfer.querySelector("input[type=checkbox]").checked,
                    display_in_training: daysInTraining.querySelector("input[type=checkbox]").checked,
                    display_for_one_clubs: daysForOneClubs.querySelector("input[type=checkbox]").checked,
                });
                this.#hideModal();
                this.#displaySettingsMenu();
            };

            div.appendChild(title);
            div.appendChild(group);
            buttons.appendChild(cancel);
            buttons.appendChild(save);
            div.appendChild(buttons);

            this.#replaceModalContent([div]);
        }

        #displayMiscellaneousSettingsMenu() {
            const level1Style = { margin: "0.3rem 0.7rem" };

            const div = document.createElement("div");
            const title = mazyarCreateMzStyledTitle(`MZY Miscellaneous Settings`, () => {
                this.#hideModal();
                this.#displaySettingsMenu();
            });

            const group = document.createElement("div");
            const playerComment = mazyarCreateMenuCheckBox("Enable player comment", this.#settings.miscellaneous.player_comment, level1Style);
            const inProgress = mazyarCreateMenuCheckBox("Display in progress results", this.#settings.miscellaneous.in_progress_results, level1Style);
            const tableInjection = mazyarCreateMenuCheckBox("Display teams' top players in tables", this.#settings.miscellaneous.top_players_in_tables, level1Style);
            const mzPredictor = mazyarCreateMenuCheckBox("Help with World Cup Predictor", this.#settings.miscellaneous.mz_predictor, level1Style);
            const fixtureFullName = mazyarCreateMenuCheckBox("Display team's full name in fixture", this.#settings.miscellaneous.fixture_full_name, level1Style);
            const tableTransferList = mazyarCreateMenuCheckBox("Add transfer list in tables", this.#settings.miscellaneous.table_transfer_list, level1Style);
            const tableTransferHistory = mazyarCreateMenuCheckBox("Add transfer history in tables", this.#settings.miscellaneous.table_transfer_history, level1Style);
            const coachSalaries = mazyarCreateMenuCheckBox("Display salaries in search results", this.#settings.miscellaneous.coach_salary, level1Style);
            mzPredictor.style.display = 'none';
            group.appendChild(playerComment);
            group.appendChild(inProgress);
            group.appendChild(tableInjection);
            group.appendChild(fixtureFullName);
            group.appendChild(coachSalaries);
            group.appendChild(mzPredictor);
            group.appendChild(tableTransferList);
            group.appendChild(tableTransferHistory);

            const buttons = document.createElement("div");
            const cancel = mazyarCreateMzStyledButton("Cancel", "red");
            const save = mazyarCreateMzStyledButton("Save", "green");

            div.classList.add("mazyar-flex-container");

            buttons.classList.add("mazyar-flex-container-row");

            cancel.addEventListener("click", () => {
                this.#hideModal();
                this.#displaySettingsMenu();
            });

            save.onclick = () => {
                this.#updateMiscellaneousSettings({
                    in_progress_results: inProgress.querySelector("input[type=checkbox]").checked,
                    top_players_in_tables: tableInjection.querySelector("input[type=checkbox]").checked,
                    mz_predictor: mzPredictor.querySelector("input[type=checkbox]").checked,
                    player_comment: playerComment.querySelector("input[type=checkbox]").checked,
                    coach_salary: coachSalaries.querySelector("input[type=checkbox]").checked,
                    fixture_full_name: fixtureFullName.querySelector("input[type=checkbox]").checked,
                    table_transfer_list: tableTransferList.querySelector("input[type=checkbox]").checked,
                    table_transfer_history: tableTransferHistory.querySelector("input[type=checkbox]").checked,
                });
                this.#hideModal();
                this.#displaySettingsMenu();
            };

            div.appendChild(title);
            div.appendChild(group);
            buttons.appendChild(cancel);
            buttons.appendChild(save);
            div.appendChild(buttons);

            this.#replaceModalContent([div]);
        }

        #displaySettingsMenu() {
            const div = document.createElement("div");
            const title = mazyarCreateMzStyledTitle(`MZY Settings (v${CURRENT_VERSION})`, () => {
                this.#hideModal();
            });

            const days = mazyarCreateSettingsSectionButton("Days Settings");
            const transfer = mazyarCreateSettingsSectionButton("Transfer Settings");
            const miscellaneous = mazyarCreateSettingsSectionButton("Miscellaneous Settings");

            const clean = mazyarCreateMzStyledButton(`<i class="fa fa-exclamation-triangle" style="font-size: 0.9rem;"></i> Clean Install`, "red");

            div.classList.add("mazyar-flex-container");

            transfer.addEventListener("click", () => {
                this.#hideModal();
                this.#displayTransferSettingsMenu();
            });

            days.addEventListener("click", () => {
                this.#hideModal();
                this.#displayDaysSettingsMenu();
            });

            miscellaneous.addEventListener("click", () => {
                this.#hideModal();
                this.#displayMiscellaneousSettingsMenu();
            });

            clean.style.marginTop = "15px";
            clean.addEventListener("click", () => {
                this.#hideModal();
                this.#displayCleanInstallMenu();
            });

            div.appendChild(title);
            div.appendChild(days);
            div.appendChild(transfer);
            div.appendChild(miscellaneous);
            div.appendChild(clean);

            this.#replaceModalContent([div]);
        }

        #getSelectedHighLows(useScout) {
            const high = [];
            const low = [];
            if (useScout.querySelector("input[type=checkbox]").checked) {
                const options = this.getTransferOptions();
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
            return { low, high };
        }

        displayFilterSaveMenu(params) {
            const filters = this.#getCurrentFilters();

            const scoutText = this.#getSelectedScoutsOptionText();

            const title = mazyarCreateMzStyledTitle("MZY Transfer Filter", () => {
                this.#hideModal();
            });
            const div = document.createElement("div");
            const datalist = mazyarCreateSuggestionList(filters.map((f) => f.name));
            const filterName = mazyarCreateMenuTextInput("Filter Name", "U21 K-10 ST-10", datalist.id);
            const useScout = mazyarCreateMenuCheckBox(`Use scout reports too (${scoutText})`);
            const checkInterval = mazyarCreateDropDownMenu("Check Interval", MAZYAR_TRANSFER_INTERVALS, MAZYAR_TRANSFER_INTERVALS.onceHour.value);

            const validation = document.createElement("div");
            const buttons = document.createElement("div");
            const save = mazyarCreateMzStyledButton("Save", "green");

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
                    save.classList.remove(mazyarGetMzButtonColorClass("grey"));
                } else {
                    validation.style.display = "unset";
                    save.classList.add(mazyarGetMzButtonColorClass("grey"));
                }
            };

            buttons.classList.add("mazyar-flex-container-row");

            save.addEventListener("click", () => {
                // save then close
                const name = filterName.querySelector("input[type=text]").value;
                if (name) {
                    const { low, high } = this.#getSelectedHighLows(useScout);
                    const scout = high.length === 0 && low.length === 0 ? null : { high, low };
                    const interval = checkInterval.querySelector("select").value;
                    this.#updateFilterDetails(name, params, scout, interval);
                    this.#hideModal();
                } else {
                    validation.style.display = "unset";
                    save.classList.add(mazyarGetMzButtonColorClass("grey"));
                }
            });

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
                    hits.replaceChildren(mazyarCreateLoadingIcon());
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
                if (!mazyarIsFilterHitsValid(hits) || forced || needRefresh) {
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

        async #displayTransferHideMenu() {
            const div = document.createElement("div");
            div.classList.add("mazyar-flex-container");

            const title = mazyarCreateMzStyledTitle("MZY Transfer Hide List", () => {
                this.#hideModal();
            });
            await this.#countPlayersOfHideListInIndexDb();
            const body = document.createElement("div");
            const description = document.createElement("div");
            const dayClearDiv = document.createElement("div");
            const daysInput = mazyarCreateMenuTextInput("Days", "0", "");
            const clear = mazyarCreateMzStyledButton("Remove", "red", "floatRight");
            const validation = document.createElement("div");
            const result = document.createElement("div");
            dayClearDiv.appendChild(daysInput);
            dayClearDiv.appendChild(clear);
            body.appendChild(description);
            body.appendChild(dayClearDiv);
            body.appendChild(validation);
            body.appendChild(result);

            body.classList.add("mazyar-flex-container");
            body.style.maxWidth = "320px";
            dayClearDiv.classList.add("mazyar-flex-container-row");
            daysInput.querySelector("input[type='text']").style.width = "2rem";

            description.innerHTML = `<p>There are <strong style="color:red;">${await this.#countPlayersOfHideListInIndexDb()}</strong> player(s) hidden from transfer market.</p>
            <p>You can remove players from hide list.</p>
            <p>Enter the number of days to remove players hidden before this period.<br>Enter 0 to remove all.</p>`;
            description.style.paddingLeft = "0.7rem";

            validation.innerText = "Error: Invalid value for days.";
            validation.style.color = "red";
            validation.style.display = "none";
            validation.style.margin = "auto 0.5rem";

            result.style.display = "none";
            result.style.margin = "auto 0.5rem";
            result.innerHTML = `Removed <strong style="color:blue;">0</strong> player(s) from hide list.</p>`

            daysInput.addEventListener("input", () => {
                result.style.display = "none";
                const days = daysInput.querySelector("input[type='text']").value;
                if (days.match(/^\d+$/)) {
                    validation.style.display = "none";
                    clear.classList.remove(mazyarGetMzButtonColorClass("grey"));
                } else {
                    validation.style.display = "unset";
                    clear.classList.add(mazyarGetMzButtonColorClass("grey"));
                }
            });

            clear.addEventListener("click", async () => {
                const days = daysInput.querySelector("input[type='text']").value
                if (days.match(/\d+/)) {
                    const deleteCount = await this.#deletePlayersFromHideListInIndexDb(days);
                    result.querySelector("strong").innerText = deleteCount;
                    result.style.display = "unset";
                    description.querySelector("strong").innerText = await this.#countPlayersOfHideListInIndexDb();
                } else {
                    validation.style.display = "unset";
                    clear.classList.add(mazyarGetMzButtonColorClass("grey"));
                }
            });

            div.appendChild(title);
            div.appendChild(body);

            this.#replaceModalContent([div]);
        }

        #filtersViewCreateTableBody(filters = []) {
            const tbody = document.createElement("tbody");

            for (const filter of filters) {
                const tr = document.createElement("tr");

                const filterName = filter.name.length > 32 ? filter.name.substring(0, 29) + "..." : filter.name;

                const name = document.createElement("td");
                name.innerHTML = `<a target="_blank" href="https://${location.hostname}/?p=transfer&mzy_filter_name=${filter.name}">${filterName}</a>`;
                name.title = filter.name.length > 32 ? `Filter's full name: ${filter.name}` : "Filter's name";

                const total = document.createElement("td");
                const scout = document.createElement("td");
                total.style.textAlign = "center";
                scout.style.textAlign = "center";

                this.getFilterHitsFromIndexedDb(filter.id).then(({ totalHits, scoutHits }) => {
                    total.innerText = mazyarIsFilterHitsValid(totalHits) ? totalHits.toString() : "n/a";
                    if (filter.scout) {
                        scout.innerHTML = `<a style="cursor: pointer;">${mazyarIsFilterHitsValid(scoutHits) ? scoutHits.toString() : "n/a"}</a>`;
                    } else {
                        scout.innerHTML = "X";
                    }
                });

                if (filter.scout) {
                    scout.onclick = () => {
                        const info = { name: filter.name, scout: filter.scout, count: scout.innerText };
                        this.displayFilterResults(filter.id, info);
                    };
                }

                const del = mazyarCreateDeleteIcon("Delete the filter permanently.");
                del.style.verticalAlign = "bottom";
                del.onclick = () => {
                    this.deleteFilter(filter.id);
                    tbody.removeChild(tr);
                    if (tbody.children.length === 0) {
                        tbody.parentNode.dispatchEvent(new Event("destroy"));
                    }
                };

                const refresh = mazyarCreateRefreshIcon("Refresh filter hits.");
                refresh.style.fontSize = "1.1rem";
                refresh.onclick = async () => {
                    mazyarStartSpinning(refresh);
                    total.replaceChildren(mazyarCreateLoadingIcon());
                    scout.replaceChildren(mazyarCreateLoadingIcon());
                    const { totalHits, scoutHits } = await this.refreshFilterHits(filter.id);
                    total.innerText = mazyarIsFilterHitsValid(totalHits) ? totalHits.toString() : "n/a";
                    if (filter.scout) {
                        scout.innerHTML = `<a style="cursor: pointer;">${mazyarIsFilterHitsValid(scoutHits) ? scoutHits.toString() : "n/a"}</a>`;
                    } else {
                        scout.innerHTML = "X";
                    }
                    mazyarStopSpinning(refresh);
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

        #filtersViewCreateTable(filters) {
            const table = document.createElement("table");
            const thead = mazyarCreateTableHeaderForFiltersView();
            const tbody = this.#filtersViewCreateTableBody(filters);

            table.classList.add("mazyar-table", "tablesorter", "hitlist", "marker");
            table.style.margin = "0.5rem";

            table.appendChild(thead);
            table.appendChild(tbody);
            return table;
        }

        async #displayTransferFilters() {
            const div = document.createElement("div");
            div.classList.add("mazyar-flex-container");

            const title = mazyarCreateMzStyledTitle("MZY Transfer Filters", () => {
                this.#hideModal();
            });

            const filtersView = document.createElement("div");
            filtersView.classList.add("mazyar-flex-container");

            const noFilterView = document.createElement("span");
            noFilterView.innerText = "There is no filter to display";
            noFilterView.style.display = "none";
            noFilterView.style.margin = "1rem";

            const filters = this.#getCurrentFilters();
            if (filters.length > 0) {
                const deleteAll = mazyarCreateDeleteButtonWithTrashIcon("Delete all filters");
                deleteAll.addEventListener("click", () => {
                    this.deleteAllFilters();
                    filtersView.style.display = "none";
                    noFilterView.style.display = "unset";
                });
                const table = this.#filtersViewCreateTable(filters);
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

            div.appendChild(title);
            div.appendChild(filtersView);
            div.appendChild(noFilterView);

            this.#replaceModalContent([div]);
        }

        async displaySquadSummary(url) {
            this.#displayLoading("MZY Squad Summary");
            const doc = await mazyarFetchHtml(url);
            if (doc) {
                const sport = mazyarExtractSportType(doc);
                const currency = mazyarExtractClubCurrency(doc);
                const players = mazyarExtractClubPlayersDetails(doc, currency);
                const summary = mazyarExtractSquadSummaryDetails(players, sport);
                const topPlayers = squadCreateTopPlayersTable(summary, currency, sport);
                topPlayers.style.margin = "2px 5px";
                topPlayers.style.padding = "0";

                const header = mazyarCreateMzStyledTitle("MZY Squad Summary", () => {
                    this.#hideModal();
                });
                this.#replaceModalContent([header, topPlayers]);
            }
        }

        async #displayTransferDeadlines() {
            const div = document.createElement("div");
            div.classList.add("mazyar-flex-container");

            const title = mazyarCreateMzStyledTitle("MZY Transfer Deadlines", () => {
                this.#hideModal();
            });

            const middle = document.createElement("div");
            middle.classList.add("mazyar-scrollable-vertical");

            middle.style.flex = "1";
            middle.style.margin = "5px 2px";

            const bids = document.createElement("table");
            bids.style.margin = "5px 2px";
            middle.appendChild(bids);

            const thead = document.createElement("thead");
            thead.innerHTML = `<tr><th style="width: 15px;"></th><th style="text-align: left;"><strong>Player</strong></th><th><strong>Deadline</strong></th></tr>`;
            bids.appendChild(thead);

            const sortedBids = Object.values(this.#deadlines)?.sort((a, b) => a.deadline - b.deadline);
            const tbody = document.createElement("tbody");
            bids.appendChild(tbody);
            const deadlineTimeout = this.#getTransferDeadlineTimeout();
            for (const bid of sortedBids) {
                const row = document.createElement("tr");

                const deleteButton = document.createElement("td");
                deleteButton.addEventListener("click", async () => {
                    await this.#removePlayerFromDeadlineList(bid.pid);
                    row.remove();
                    if (tbody.childElementCount === 0) {
                        this.#deadlineUpdateIconStyle();
                        this.#hideModal();
                    }
                });

                const trashIcon = mazyarCreateTrashIcon("Remove from deadline list");
                deleteButton.appendChild(trashIcon);

                const name = document.createElement("td");
                name.innerHTML = `<a href="/?p=transfer&sub=players&u=${bid.pid}" target="_blank">${bid.name}</a>`;
                name.style.paddingRight = "15px";

                const deadline = document.createElement("td");
                deadline.innerHTML = `<strong>${bid.deadline}</strong> minutes`;
                deadline.style.paddingRight = "15px";
                if (bid.deadline <= deadlineTimeout) {
                    deadline.style.color = "red";
                }

                row.appendChild(deleteButton);
                row.appendChild(name);
                row.appendChild(deadline);
                tbody.appendChild(row);
            }

            div.appendChild(title);
            div.appendChild(middle);

            this.#replaceModalContent([div]);
        }

        #addDeadlineIndicator() {
            const deadline = mazyarCreateDeadlineIndicator();
            deadline.id = "mazyar-deadline";
            deadline.style.display = "none";
            deadline.style.border = "1px solid black";
            deadline.style.borderRadius = "50%";
            deadline.style.padding = "0.5rem";
            document.body?.appendChild(deadline);
            deadline.addEventListener("click", () => {
                this.#displayTransferDeadlines();
            });
            return deadline;
        }

        async #monitorFetchAndProcessYourBidsPlayers() {
            const url = `https://${location.hostname}/ajax.php?p=transfer&sub=your-bids&sport=${this.#sport}`;
            const response = await mazyarFetchJson(url);
            if (response) {
                const yourBids = document.createElement("div");
                yourBids.innerHTML = response.content;
                const bids = yourBids.querySelectorAll(`table[cellpadding="0"][border="0"] table img[src*="/flags/"]`);
                const rows = [...bids].map((element) => element.parentNode.parentNode.parentNode.parentNode.parentElement.parentNode);
                return rows.map((row) => {
                    const sections = [...row.childNodes].filter((el) => el.tagName === "TD");
                    // sections are: [0: player name], [1:deadline], [2:latest bid]
                    const deadlineFull = sections[1].innerText?.trim();
                    return {
                        name: sections[0].innerText.trim(),
                        pid: mazyarExtractPlayerIdFromTransferMonitor(sections[0].querySelector(`a:not([class="player_icon"]`).href),
                        deadline: 1 + Math.ceil((mazyarParseMzDateTime(deadlineFull) - new Date()) / 60_000),
                        deadlineFull,
                        latestBid: sections[2].querySelector(`td[align="right"]`).innerText,
                    }
                });
            }
            return [];
        }

        async #updatePlayerDeadlineFromMarket(pid) {
            const { player, remove } = await mazyarFetchPlayerMarketDetail(pid, this.#sport);
            if (player) {
                await this.#addPlayerToDeadlineListInIndexDb(player);
            } else if (remove) {
                await this.#removePlayerFromDeadlineList(pid);
            }
        }

        async #deadlineProcessPlayersInIndexedDb() {
            const players = await this.#fetchDeadlinePlayersFromIndexedDb();
            const jobs = [];
            for (const player of players) {
                if (this.#deadlineLockAcquired) {
                    jobs.push(this.#updatePlayerDeadlineFromMarket(player.pid));
                } else if (player.deadline > 0) {
                    this.#deadlines[player.pid] = player;
                } else {
                    delete this.#deadlines[player.pid];
                }
            }
            await Promise.all(jobs);
        }

        #deadlineIsLockerTabDead() {
            return Date.now() - Number(GM_getValue("deadline_locker_last_call", 0)) > (2 * DEADLINE_INTERVAL_SECONDS * 1000);
        }

        #deadlineUpdateLockStatus() {
            if (this.#deadlineLockAcquired) {
                // we have the lock
                GM_setValue("deadline_locker_last_call", Date.now());
            } else {
                // check whether if lock is available to acquire
                const isLocked = GM_getValue("deadline_is_locked", false);
                if (isLocked) {
                    // other instance of mazyar is already required the lock
                    this.#deadlineLockAcquired = false;
                    if (this.#deadlineIsLockerTabDead()) {
                        // it seems locker tab is not alive. make it available for other tabs
                        console.warn("locker tab is dead. release the lock.");
                        GM_setValue("deadline_is_locked", false);
                    }
                } else {
                    // we can acquire the lock
                    GM_setValue("deadline_is_locked", true);
                    GM_setValue("deadline_locker_last_call", Date.now());
                    this.#deadlineLockAcquired = true;
                    window.onbeforeunload = () => {
                        // release lock
                        GM_setValue("deadline_is_locked", false);
                        this.#deadlineLockAcquired = false;
                    }
                }
            }
        }

        #playDeadlineAlert() {
            if (this.#mustPlayBellForDeadline()) {
                const ding = new Audio(MAZYAR_DEADLINE_ALERT_SOUND);
                ding.play();
            }
        }

        #deadlineUpdateIconStyle() {
            const deadlineTimeout = this.#getTransferDeadlineTimeout();
            const deadlineIcon = document.getElementById("mazyar-deadline");
            const strobe = Object.values(this.#deadlines).filter((player) => player.deadline <= deadlineTimeout).length > 0;
            if (strobe && deadlineIcon) {
                deadlineIcon.style.display = 'unset';
                deadlineIcon.classList.add("mazyar-deadline-throb-lightgreen");
                this.#playDeadlineAlert();
            } else {
                deadlineIcon.style.display = 'none';
                deadlineIcon.classList.remove("mazyar-deadline-throb-lightgreen");
            }
        }

        async #updateDeadlines() {
            this.#deadlineUpdateLockStatus();
            // remove old data
            this.#deadlines = {};
            await this.#deadlineProcessPlayersInIndexedDb();
            if (this.#deadlineLockAcquired) {
                const players = await this.#monitorFetchAndProcessYourBidsPlayers();
                for (const player of players) {
                    if (player.deadline > 0) {
                        player.source = "monitor";
                        await this.#addPlayerToDeadlineListInIndexDb(player);
                    } else {
                        await this.#removePlayerFromDeadlineList(player.pid);
                    }
                }
            }
            this.#deadlineUpdateIconStyle();
            document.body.dispatchEvent(new Event("deadlines-updated"));
        }

        async injectTransferDeadlineAlert() {
            if (this.#isTransferDeadlineAlertEnabled()) {
                this.#addDeadlineIndicator();
                await this.#updateDeadlines();
                setInterval(() => {
                    this.#updateDeadlines();
                }, 1000 * DEADLINE_INTERVAL_SECONDS);
            }
        }

        #addDeadlineButtonToPlayerInTransferMarket(player, deadlines) {
            if (player.deadlineIconInjected) {
                return;
            }
            player.deadlineIconInjected = true;
            const playerId = mazyarExtractPlayerIdFromContainer(player);
            let alreadyAdded = deadlines.find((player) => player.pid == playerId);
            const addButton = mazyarCreateAddToDeadlineIcon("Deadline Monitor Add/Remove", alreadyAdded ? "red" : "green")
            player.querySelector("h2.clearfix div")?.appendChild(addButton);

            addButton.addEventListener("click", async () => {
                if (alreadyAdded) {
                    alreadyAdded = false;
                    addButton.style.color = "green";
                    await this.#removePlayerFromDeadlineList(playerId);
                } else {
                    alreadyAdded = true;
                    addButton.style.color = "red";
                    await this.#updatePlayerDeadlineFromMarket(playerId);
                }
                this.#deadlineUpdateIconStyle();
            });
        }

        #createFilterInfo(data = { name: "", scout: { high: [], low: [] }, count: "" }) {
            const info = document.createElement("div");
            const nameSpan = document.createElement("p");
            const scoutSpan = document.createElement("p");
            const countSpan = document.createElement("p");

            info.classList.add("mazyar-scout-filter-info");

            nameSpan.innerHTML = `<strong>Filter Name: </strong>${data.name}`;
            scoutSpan.innerHTML = `<strong>Selected: ${this.#getSelectedScoutsOptionTextForFilter(data.scout)}</strong>`;
            countSpan.innerHTML = `<strong>Hit Count: </strong><span class="filter-count-span">${data.count}</span>`;

            info.appendChild(nameSpan);
            info.appendChild(scoutSpan);
            info.appendChild(countSpan);
            return info;
        }

        async #appendFilterResultToModal(middle, searchResults, filterId) {
            for (const result of searchResults) {
                const parser = new DOMParser();
                const player = parser.parseFromString(result.content.players, "text/html").body.firstChild;
                if (this.#doesTransferNeedPlayerProfile()) {
                    this.#updateProfileRelatedFieldsInTransfer(player);
                }
                player.id = "";
                this.#fetchOrExtractPlayerScoutReport(player).then(report => {
                    mazyarColorizeSkills(player, report);
                });
                const a = player.querySelector("h2>div>a.subheader");
                if (a) {
                    a.href = `https://${location.hostname}/?p=transfer&u=${result.playerId}`;
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
        }

        async displayFilterResults(filterId, filterInfo) {
            const div = document.createElement("div");

            const header = mazyarCreateMzStyledTitle("MZY Filter Results", () => {
                this.#hideModal();
                this.#displayTransferFilters();
            });
            const info = this.#createFilterInfo(filterInfo);
            const middle = document.createElement("div");

            div.classList.add("mazyar-flex-container");

            middle.classList.add("mazyar-scrollable-vertical");
            middle.style.flex = "1";
            middle.style.padding = "5px 2px";

            const players = await this.#getHitsFromIndexedDb(filterId);
            this.#displayLoading("MZY Filter Results");
            const jobs = [];
            for (const player of players) {
                const url = `https://${location.hostname}/ajax.php?p=transfer&sub=transfer-search&sport=${this.#sport}&u=${player.pid}`;
                jobs.push(
                    mazyarFetchJson(url).then((content) => {
                        return { playerId: player.pid, content };
                    })
                );
            }
            const searchResults = await Promise.all(jobs);
            this.#appendFilterResultToModal(middle, searchResults, filterId);

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
            } else {
                div.appendChild(info);
                div.appendChild(middle);
            }
            this.#replaceModalContent([div]);
        }

        async #displayPlayerComment(target, playerId) {
            this.#displayLoading("MZY Player Note");
            const header = mazyarCreateMzStyledTitle("MZY Player Note", () => {
                this.#hideModal();
            });
            const text = document.createElement("textarea");
            const save = mazyarCreateMzStyledButton("Save", "green");
            const buttons = document.createElement("div");

            buttons.classList.add("mazyar-flex-container-row");

            text.value = await this.#fetchPlayerCommentFromIndexedDb(playerId);
            text.classList.add("mazyar-player-comment-textarea");

            save.addEventListener("click", async () => {
                await this.#setPlayerCommentInIndexedDb(playerId, text.value);
                if (text.value) {
                    target?.classList.remove("mazyar-player-comment-icon-inactive");
                    target?.classList.add("mazyar-player-comment-icon-active");
                } else {
                    target?.classList.add("mazyar-player-comment-icon-inactive");
                    target?.classList.remove("mazyar-player-comment-icon-active");
                }
                this.#hideModal();
            });

            buttons.appendChild(save);

            this.#replaceModalContent([header, text, buttons]);
        }

        #getVersionNumbers(v) {
            return v.split('.').map((i) => Number(i));
        }

        #getVersionsOfChangelog(MAZYAR_CHANGELOG) {
            return Object.keys(MAZYAR_CHANGELOG).map((v) => this.#getVersionNumbers(v));
        }

        #isVersionLesserThan(version = [0, 0], base = [0, 0]) {
            return version[0] < base[0] ||
                (version[0] === base[0] && version[1] < base[1]);
        }

        #isVersionGreaterThan(version = [0, 0], base = [0, 0]) {
            return version[0] > base[0] ||
                (version[0] === base[0] && version[1] > base[1]);
        }

        #showChangelog(force = false) {
            const previousVersion = GM_getValue("previous_version", "");
            if (!previousVersion) {
                GM_setValue("previous_version", CURRENT_VERSION);
                return;
            }
            const previous = this.#getVersionNumbers(previousVersion);
            const current = this.#getVersionNumbers(CURRENT_VERSION);
            if (!force && !this.#isVersionLesserThan(previous, current)) {
                return;
            }

            const headHTML = `<b>Mazyar</b> is updated<br>` +
                `from <b style="color: red;">v${previousVersion}</b><span> to </span><b style="color: blue;">v${CURRENT_VERSION}</b>`;
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
            const versions = this.#getVersionsOfChangelog(MAZYAR_CHANGELOG);
            for (const version of versions) {
                if (this.#isVersionGreaterThan(version, current)) {
                    continue;
                }
                if (this.#isVersionGreaterThan(version, previous)) {
                    const v = version.join('.');
                    changesHTML += `<div style="margin-bottom: 1rem;"><b>v${v}</b><ul style="margin: 0px 5px 5px;"><li>`
                        + MAZYAR_CHANGELOG[v]?.join("</li><li>") + "</li></ul></div>";
                }
            }
            if (changesHTML === '' && force) {
                const v = versions[0].join('.');
                changesHTML += `<div style="margin-bottom: 1rem;"><b>v${v}</b><ul style="margin: 0px 5px 5px;"><li>`
                    + MAZYAR_CHANGELOG[v]?.join("</li><li>") + "</li></ul></div>";
            }
            const changes = document.createElement("div");
            changes.innerHTML = changesHTML;
            changes.style.maxHeight = "320px";
            changes.style.maxWidth = "320px";
            changes.style.paddingRight = "30px";
            changes.style.backgroundColor = "khaki";
            changes.style.padding = "5px";
            changes.style.flex = "1";
            changes.classList.add("mazyar-scrollable-vertical");

            const text = document.createElement("div");
            text.classList.add("mazyar-flex-container");
            text.style.margin = "10px";
            text.style.padding = "5px";
            text.appendChild(head);
            text.appendChild(changesTitle);
            text.appendChild(changes);

            const header = mazyarCreateMzStyledTitle("MZY Notice", () => {
                GM_setValue("previous_version", CURRENT_VERSION);
                this.#hideModal();
            });

            this.#replaceModalContent([header, text]);
        }

        showPlayerInModal(playerView) {
            const player = document.createElement("div");
            player.style.margin = "5px";
            player.style.padding = "0px";
            player.style.backgroundColor = "wheat";
            player.appendChild(playerView);

            const header = mazyarCreateMzStyledTitle("MZY Player View", () => {
                this.#hideModal();
            });

            this.#replaceModalContent([header, player]);
        }

        #mergeAndKeepFilters(filters) {
            const hockey = mazyarMergeFilters(filters.hockey, this.#filters.hockey);
            const soccer = mazyarMergeFilters(filters.soccer, this.#filters.soccer);
            this.#filters = JSON.parse(JSON.stringify({ hockey, soccer }));
        }

        #mergeAndReplaceFilters(filters) {
            const hockey = mazyarMergeFilters(this.#filters.hockey, filters.hockey);
            const soccer = mazyarMergeFilters(this.#filters.soccer, filters.soccer);
            this.#filters = JSON.parse(JSON.stringify({ hockey, soccer }));
        }

        #createExportButtons(modal) {
            const filtersButton = mazyarCreateMzStyledButton("MZY Filters", "blue", "floatLeft");
            filtersButton.addEventListener("click", () => {
                const notepad = modal.querySelector("textarea.calendar_textarea");
                const filters = btoa(JSON.stringify(this.#filters, null, 0));
                notepad.value = MAZYAR_FILTER_BACKUP_TITLE + filters;
            });
            return [filtersButton,];
        }

        #openImportFiltersModal(filters) {
            const header = mazyarCreateMzStyledTitle("MZY Import Filters", () => {
                this.#hideModal();
            });
            const overview = document.createElement("div");
            const overviewOld = mazyarCreateFiltersOverview(this.#filters, "Current");
            const overviewNew = mazyarCreateFiltersOverview(filters, "New");
            const keep = mazyarCreateMzStyledButton("Merge & Keep", "blue");
            const replace = mazyarCreateMzStyledButton("Merge & Replace", "red");
            const buttons = document.createElement("div");

            overview.classList.add("mazyar-flex-container");
            buttons.classList.add("mazyar-flex-container-row");

            keep.addEventListener("click", () => {
                this.#mergeAndKeepFilters(filters);
                this.#hideModal();
            });

            replace.addEventListener("click", () => {
                this.#mergeAndReplaceFilters(filters);
                this.#hideModal();
            });

            buttons.appendChild(keep);
            buttons.appendChild(replace);

            overview.appendChild(overviewOld);
            overview.appendChild(overviewNew);

            this.#replaceModalContent([header, overview, buttons]);
        }

        #attachImportButton(note) {
            if (note.value.startsWith(MAZYAR_FILTER_BACKUP_TITLE)) {
                const button = mazyarCreateMzStyledButton("MZY Import Filters", "blue", "floatLeft");
                button.style.marginTop = "10px";
                button.addEventListener("click", () => {
                    try {
                        const filters = JSON.parse(atob(note.value.replace(MAZYAR_FILTER_BACKUP_TITLE, "")));
                        this.#openImportFiltersModal(filters);
                    } catch (e) {
                        console.log(e);
                    }
                });
                note.parentNode.appendChild(button);
            }
        }

        injectToCalendar(modal) {
            const addButton = document.getElementById("calendar_add_not_btn");
            if (addButton) {
                const exportButtons = this.#createExportButtons(modal);
                addButton.parentNode.append(...exportButtons);
            } else {
                const createButton = document.getElementById("create_note_btn");
                if (createButton) {
                    createButton.addEventListener("click", () => {
                        const addButton = document.getElementById("calendar_add_not_btn");
                        if (addButton) {
                            const exportButtons = this.#createExportButtons(modal);
                            addButton.parentNode.append(...exportButtons);
                        }
                    });
                    const notes = modal.querySelectorAll("textarea.calendar_textarea_disabled");
                    for (const note of notes) {
                        this.#attachImportButton(note);
                    }
                }
            }
        }

        #hideModal() {
            this.#modal.style.display = "none";
            this.#clearModalContent();
        }
    }

    /* *********************** Database ********************************** */

    async function initializeIndexedDb(name = "db") {
        const db = new Dexie(name);
        db.version(1).stores({
            comment: "[sport+pid]",
            scout: "[sport+pid]",
            hit: "[fid+pid],deadline",
            filter: "&fid,totalHits,scoutHits,lastCheck",
        });
        db.version(2).stores({
            scout: "[sport+pid],ts",
            player: "[sport+pid],ts,maxed,days,camp",
            hide: "[sport+pid],ts",
            deadline: "[sport+pid],ts,deadline,name,deadlineFull,latestBid,source,flag",
        }).upgrade(trans => {
            return trans.table("scout").toCollection().modify(report => {
                report.ts = 0;
            });
        });
        db.open();

        // remove outdated data from db
        const scoutOutdate = Date.now() - 7 * 24 * 60 * 60 * 1000;
        await db.scout.where("ts").below(scoutOutdate).delete().then((deleteCount) => {
            console.log("Deleted " + deleteCount + " outdated scout reports");
        }).catch((error) => {
            console.warn(error);
        });

        // remove outdated data from db
        const startOfDay = Date.now() - Date.now() % (24 * 60 * 60 * 1000);
        await db.player.where("ts").below(startOfDay).delete().then((deleteCount) => {
            console.log("Deleted " + deleteCount + " outdated player profile.");
        }).catch((error) => {
            console.warn(error);
        });

        const info = await navigator?.storage?.estimate();
        if (info) {
            console.log("ManagerZone IndexedDB size: " + mazyarFormatFileSize(info.usage));
        }
        return db;
    }

    /* *********************** Inject ********************************** */

    function isVisitingTeamPage() {
        const regex = /^\?((p=team)|(p=team&tid=\d+))$/g;
        return regex.test(document.location.search);
    }

    async function inject() {
        const styles = GM_getResourceText("MAZYAR_STYLES");
        GM_addStyle(styles);

        const db = await initializeIndexedDb("Mazyar");
        mazyar = new Mazyar(db);

        if (mazyar.isTransferFiltersEnabled()) {
            mazyar.setInitialFiltersHitInToolbar();
        }
        mazyar.injectTransferDeadlineAlert();
        calendarInject();
        const uri = document.baseURI;
        if (uri.search("/?p=federations") > -1) {
            if (uri.search("&sub=clash") > -1) {
                clashInjectRanks();
            } else if (uri.search("&fid=") > -1 || uri.endsWith("p=federations")) {
                federationFrontPage();
            }
        } else if (uri.search("/?p=players") > -1) {
            squadInjectInformationToSummary();
            squadInjectInformationToProfiles();
        } else if (uri.search("mid=") > -1) {
            matchInjectTeamValues();
        } else if (uri.search("/?p=match") > -1) {
            if (uri.search("&sub=result") < 0) {
                matchInjectInProgressResults();
            }
            if (uri.endsWith("&sub=scheduled") > -1 && mazyar.mustAddFullNamesToFixture()) {
                fixtureChangeNames();
            }
        } else if (uri.search("/?p=league") > -1) {
            tableInjectTopPlayersToOfficialLeague();
            scheduleInjectColoringToOfficialLeague();
        } else if (uri.search("/?p=friendlyseries") > -1) {
            tableInjectTopPlayersInfoToFriendlyLeague();
        } else if (uri.search("/?p=cup&") > -1 || uri.search("/?p=private_cup&") > -1) {
            tableInjectTopPlayersInfoToCup();
        } else if (uri.search("/?p=transfer") > -1) {
            if (uri.search("/?p=transfer&sub=yourplayers") > -1) {
                mazyar.monitorInject();
            } else {
                if (mazyar.isTransferFiltersEnabled()) {
                    transferInject();
                }
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
            trainingAddDays();
        } else if (uri.search("/?p=rank&sub=userrank") > -1) {
            rankingInjectSquadValue();
        } else if (uri.search("/?p=shortlist") > -1) {
            shortlistAddDays();
        } else if (uri.search("/?p=tactics") > -1) {
            tacticAddDays();
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
