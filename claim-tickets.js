/* *********************** Managerzone Events ********************************** */

function eventsAddNotice() {
    const target = document.getElementById("event-reset-purchase");
    if (target) {
        const notice = document.createElement("div");
        const status = `<strong style="color: maroon;">${mazyar.isAutoClaimEnabled() ? "on" : "off"}</strong>`;
        notice.innerHTML = `<strong style="color: crimson;">MZY Notice: </strong>Auto Claim is ${status}.`;
        notice.classList.add("textCenter");
        target.parentNode.insertBefore(notice, target);
    }
}

function eventsInject() {
    eventsAddNotice();
    if (mazyar.isAutoClaimEnabled()) {
        // Callback function to execute when mutations are observed
        const callback = function (mutationsList) {
            for (const mutation of mutationsList) {
                if (mutation.type == "attributes") {
                    const claim = document.getElementById("claim");
                    if (!claim?.classList.contains("buttondiv_disabled")) {
                        claim?.click();
                    }
                }
            }
        };
        const observer = new MutationObserver(callback);
        const claim = document.getElementById("claim");
        observer.observe(claim, {
            attributes: true,
            attributeFilter: ["class"],
        });
    }
}
