let version = "1.0";

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.status == 'complete') {
        if (tab.url.indexOf("https://projectv.gg/teams/") > -1) {
            chrome.debugger.attach({ //debug at current tab
                tabId
            }, version, onAttachTeamPage.bind(null, tabId));
        } else if (tab.url.indexOf("https://projectv.gg/profile/") > -1) {
            console.log("Profile Page");
            // Buggy Feature atm
            if (false) {
                chrome.debugger.attach({ //debug at current tab
                    tabId
                }, version, onAttachProfilePage.bind(null, tabId));
            }
        }
    }
});

function onAttachTeamPage(tabId) {
    
    chrome.debugger.sendCommand({ //first enable the Network
        tabId: tabId
    }, "Network.enable");
    
    chrome.debugger.onEvent.addListener(teamPageEventHandler);
}

function onAttachProfilePage(tabId) {
    console.log("Attach to Profile Page!");

    chrome.debugger.sendCommand({ //first enable the Network
        tabId: tabId
    }, "Network.enable");

    chrome.debugger.onEvent.addListener(profilePageEventHandler);
}

/** UNSTABLE CODE BELOW 
 * 
 * Should be used with caution, User Data could be read*/
function teamPageEventHandler(debuggerId, message, params) {
    const nameClass = "member-card__name";
    const iconSize = 32;

    if (message == "Network.responseReceived") { //response return 
        chrome.debugger.sendCommand({
            tabId: debuggerId.tabId
        }, "Network.getResponseBody", {
            "requestId": params.requestId
        }, function (response) {
            // Filter for the right Network Data Packet
            if (response.body.indexOf("{\"data\":[{\"id\":") > -1) {
                let json = JSON.parse(response.body);

                if (json.links.first.indexOf("/frontend/teams/") > -1) {
                    chrome.scripting.executeScript({ target: { tabId: debuggerId.tabId }, function: addLoadingIcon, args: [nameClass, iconSize] });
                    // Get Rank Datas from valorant-api.com -> for Rank Icons 
                    fetch("https://valorant-api.com/v1/competitivetiers/").then(r => r.json()).then(r => {
                        return r.data.filter(e => e.assetObjectName.indexOf("Episode4") > -1)[0];
                    }).then((rankData) => {
                        for (let user of json.data) {
                            // Check if GameAccount is in the User
                            if (!user.user.gameaccounts[0]) {
                                chrome.scripting.executeScript({ target: { tabId: debuggerId.tabId }, function: addNotFoundIcon, args: [user.user.username, nameClass, iconSize] });
                                continue;
                            }
                            let valoName = user.user.gameaccounts[0].value.split('#');
                            fetch(`https://api.kyroskoh.xyz/valorant/v1/mmr/eu/${valoName[0]}/${valoName[1]}?show=rankonly&display=0`).then(r => r.text()).then(result => {
                                const rank = result.split('[')[1].split(']')[0];
                                const rankLink = rankData.tiers.filter(e => e.tierName == rank.toUpperCase())[0].smallIcon;
                                chrome.scripting.executeScript({ target: { tabId: debuggerId.tabId }, function: updateRankImage, args: [user.user.username, rank, rankLink, nameClass, iconSize] });


                                if (user == json.data[json.data.length - 1]) {
                                    chrome.debugger.detach(debuggerId);
                                }
                            }).catch(e => {
                                chrome.scripting.executeScript({ target: { tabId: debuggerId.tabId }, function: addNotFoundIcon, args: [user.user.username, nameClass, iconSize] });
                                if (user == json.data[json.data.length - 1]) {
                                    chrome.debugger.detach(debuggerId);
                                }
                            });
                        }
                    }).catch(e => {
                        console.log(e);
                    });

                }
            }
        });
    }

}

function profilePageEventHandler(debuggerId, message, params) {
    const nameClass = "profile-title__username";
    const iconSize = 64;
    console.log("Listening!");

    if (message == "Network.responseReceived") { //response return 
        chrome.debugger.sendCommand({
            tabId: debuggerId.tabId
        }, "Network.getResponseBody", {
            "requestId": params.requestId
        }, function (response) {
            // Filter for the right Network Data Packet
            if (response.body.indexOf('{"username":') > -1) {
                let user = JSON.parse(response.body);

                if (!user.links) {
                    chrome.scripting.executeScript({ target: { tabId: debuggerId.tabId }, function: addLoadingIcon, args: [nameClass, iconSize] });
                    // Get Rank Datas from valorant-api.com -> for Rank Icons 
                    fetch("https://valorant-api.com/v1/competitivetiers/").then(r => r.json()).then(r => {
                        return r.data.filter(e => e.assetObjectName.indexOf("Episode4") > -1)[0];
                    }).then((rankData) => {
                        let valoName = user.gameaccounts[0].value.split('#');
                        console.log(valoName);
                        fetch(`https://api.kyroskoh.xyz/valorant/v1/mmr/eu/${valoName[0]}/${valoName[1]}?show=rankonly&display=0`).then(r => r.text()).then(result => {
                            const rank = result.split('[')[1].split(']')[0];
                            const rankLink = rankData.tiers.filter(e => e.tierName == rank.toUpperCase())[0].smallIcon;
                            chrome.scripting.executeScript({ target: { tabId: debuggerId.tabId }, function: updateRankImage, args: [user.username, rank, rankLink, nameClass, iconSize] });
                            chrome.debugger.detach(debuggerId);

                        }).catch(e => {
                            chrome.debugger.detach(debuggerId);
                        });
                    }).catch(e => {
                        console.log(e);
                        chrome.scripting.executeScript({ target: { tabId: debuggerId.tabId }, function: addNotFoundIcon, args: [user.username, nameClass, iconSize] });
                    });
                }
            }
        });
    }

}

function addNotFoundIcon(name, className, size) {
    let imageStyle = `max-width: ${size}px; max-height: ${size}px; margin-top: ${-size/4}px;`; 

    let element = Array.from(document.getElementsByClassName(className)).filter(e => e.innerText.indexOf(name.toUpperCase()) > -1)[0]
    element.innerHTML = `\n ${name.toUpperCase()} <img src="https://c.tenor.com/eDchk3srtycAAAAi/piffle-error.gif" style="${imageStyle}", title="Not Found"/>\n`;
}

function addLoadingIcon(className, size) {
    let imageStyle = `max-width: ${size}px; max-height: ${size}px; margin-top: ${-size/4}px;`; 

    Array.from(document.getElementsByClassName(className)).forEach(element => {
        console.log(element);
        element.innerHTML = `\n ${element.innerText.toUpperCase()} <img src="https://c.tenor.com/5o2p0tH5LFQAAAAi/hug.gif" style="${imageStyle}", title="Loading..."/>\n`;
    });
}

/**
 * Function to execute on the webpage
 * 
 * @param {Name of the member} name 
 * @param {The rank name for the tooltip} rank 
 * @param {The link to the rank image} rankLink 
 */
function updateRankImage(name, rank, rankLink, className, size) {
    let imageStyle = `max-width: ${size}px; max-height: ${size}px; margin-top: ${-size/4}px;`; 

    let element = Array.from(document.getElementsByClassName(className)).filter(e => e.innerText.indexOf(name.toUpperCase()) > -1)[0]
    element.innerHTML = `\n ${name.toUpperCase()} <img src="${rankLink}" style="${imageStyle}", title="${rank}"/>\n`;
}