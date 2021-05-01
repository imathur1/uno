let username = 0;
let pusher = 0;
let channel = 0;
let gameData = {};

function bindings() {
    channel.bind("pusher:subscription_succeeded", function(players) {
        $.ajax({
            type : "POST",
            url : "/play",
            data: {
                "function": "verifyUser",
                "username": username
            }
        }).done(function(data) {
            if (data === "error") {
                pusher.unsubscribe("presence-uno");
                window.location = "/";
            }
        });
    });
    channel.bind("pusher:subscription_error", function() {
        window.location = "/";
    });
    channel.bind("pusher:member_removed", function(player) {
        if (player.id !== gameData["owner"]) {
            $.ajax({
                type : "POST",
                url : "/play",
                data: {
                    "function": "removePlayer",
                    "username": username,
                    "removedPlayer": player.id
                }
            });
        }
    });
    channel.bind("updateData", function(data) {
        gameData = data;
        updateDisplay();
        if (gameData["winner"] !== 0) {
            if (gameData["owner"] === username) {
                $("#startButton").html("NEW GAME");
            }
        }
        $(window).on("resize", function() {
            updateDisplay();
        });
    });
    channel.bind("newGame", function() {
        window.location.reload();
    });

    $("#startButton").on("click", function() {
        if (gameData["winner"] !== 0) {
            $.ajax({
                type : "POST",
                url : "/play",
                data: {
                    "function": "newGame",
                    "username": username
                }
            });
        } else {
            $.ajax({
                type : "POST",
                url : "/play",
                data: {
                    "function": "startGame",
                    "username": username
                }
            });
        }
    });

    $("#deck").on("click", function() {
        if (gameData["winner"] === 0) {
            if (gameData["order"][gameData["turn"]] === username) {
                $.ajax({
                    type : "POST",
                    url : "/play",
                    data: {
                        "function": "makeMove",
                        "username": username,
                        "card": "draw"
                    }
                });
            }
        }
    });
}

function updateDisplay() {
    $("#myName").css({"color": "#000"});
    if (gameData["owner"] === username) {
        $("#startButton").css({"display": "inline-block"});
        $("#headerText").css({"margin-top": "-53px"});
    }
    if (gameData["active"]) {
        $(".loading1").eq(0).removeClass("loading1");
        $("#parent1").css({"display": "inline-block"});
        $("#parent2").css({"display": "inline-block"});
        let width = 100;
        if (window.innerWidth <= 700) {
            width = 50;
        } else if (window.innerWidth <= 1100) {
            width = 80;
        }
        let left = window.innerWidth / 2 - width;
        let bottom = window.innerHeight / 2 - width * 1.5 / 2;
        $("#parent1").css({"left": left + 1 + "px", "bottom": bottom + "px"});
        $("#parent2").css({"left": left + width - 1 + "px", "bottom": bottom + "px"});
        $("#direction").css({"display": "block", "left": window.innerWidth/2 - 50 + "px", "bottom": bottom - 100 + "px"})
        if (gameData["forward"]) {
            $("#direction").css({"transform": "scaleX(-1)"});
        } else {
            $("#direction").css({"transform": "scaleX(1)"});
        }
        let lastPlayed = gameData["cards"][1];
        $("#played").css({"background-image": "url(/static/images/cards/" + lastPlayed + ".png"});
    }
    $(".loading2").eq(0).html(gameData["lastMove"]);
    $("#players").empty();
    $("#players").removeClass();
    let players = [];
    if (gameData["active"]) {
        index = gameData["order"].indexOf(username);
        players.push(username);
        let start = index;
        if (index === gameData["order"].length - 1) {
            start = 0;
        } else {
            start += 1;
        }
        while (start !== index) {
            players.push(gameData["order"][start]);
            if (start === gameData["order"].length - 1) {
                start = 0;
            } else {
                start += 1;
            }
        }
    } else {
        players = Object.keys(gameData["players"]);
    }
    if (players.length === 2){
        $("#players").addClass("row d-flex justify-content-center");
    } else {
        $("#players").addClass("row d-flex justify-content-between");
    }
    let count = 0;
    for (let i = 0; i < players.length; i++) {
        if (players[i] !== username) {
            let div = $("<div class=" + "player" + "></div>");
            let multiplier = 0.7;
            let distance = 450 - multiplier * Math.sin(count * Math.PI/(players.length - 2)) * 400;
            if (window.innerWidth <= 700) {
                multiplier = 0.1;
                if (players.length === 2) {
                    distance = 350;
                }
            } else if (window.innerWidth <= 1100) {
                multiplier = 0.4;
                if (players.length === 2) {
                    distance = 275;
                }
            } else {
                if (players.length === 2) {
                    distance = 150;
                }
            }
            div.css({"margin-top": distance + "px"});
            let h4 = $("<h4 class=" + "names" + "></h4>");
            h4.html(players[i].split("=")[0]);
            if (gameData["order"][gameData["turn"]] === players[i]) {
                h4.css({"color": "#007bff"});
            }
            let opponent = $("<div class=" + "opponentCards" + "></div>");
            let h1 = $("<h1 class=" + "cardCount" + "></h1>");
            if (gameData["players"][players[i]]["cards"].length !== 0) {
                h1.html(gameData["players"][players[i]]["cards"].length);
            }
            opponent.append(h1);
            div.append(h4);
            div.append(opponent);
            $("#players").append(div);
            count += 1;
        }
    }

    let width = 120;
    if (window.innerWidth <= 700) {
        width = 60;
    } else if (window.innerWidth <= 1100) {
        width = 100;
    }
    if (gameData["active"]) {
        $("#myName").html(username.split("=")[0]);
        if (gameData["order"][gameData["turn"]] === username) {
            $("#myName").css({"color": "#007bff"});
        }
        $("#myName").css({"display": "inline-block", "left": window.innerWidth/2 - $("#myName").outerWidth()/2 + "px", "bottom": 30 + width * 1.5 + "px"});
    }

    $("#myCardsRow").empty();
    let length = gameData["players"][username]["cards"].length
    for (let i = 0; i < length; i++) {
        let img = $("<img class=" + "myCards" + ">");
        img.attr("src", "/static/images/cards/" + gameData["players"][username]["cards"][i] + ".png");
        let left = 0;
        if (length <= 7) {
            left = window.innerWidth / 2 - ((length * width) - (length - 1) * width * 1/4)/2 + i * width * 3/4;
        } else if (length <= 14) {
            left = window.innerWidth / 2 - ((length * width) - (length - 1) * width * 2/4)/2 + i * width * 2/4;
        } else if (length <= 21) {
            left = window.innerWidth / 2 - ((length * width) - (length - 1) * width * 5/8)/2 + i * width * 3/8;
        } else {
            left = window.innerWidth / 2 - ((length * width) - (length - 1) * width * 3/4)/2 + i * width * 1/4;
        }
        img.css({"left": left + "px", "bottom": "18px"});
        img.on("click", clickedCard);
        $("#myCardsRow").append(img);
    }
    $("#myCardsRow").css({"display": "flex"});
}

function clickedCard() {
    if (gameData["order"][gameData["turn"]] === username) {
        let card = this.src.split("cards/")[1].split(".")[0];
        if (card === "W" || card === "F") {
            changeColor(card);
        } else if (validCard(card)) {
            $.ajax({
                type : "POST",
                url : "/play",
                data: {
                    "function": "makeMove",
                    "username": username,
                    "card": card
                }
            });
        }
    }
}

function changeColor(card) {
    $(".loading2").eq(0).html("New color: ");
    $(".colors").css({"display": "inline-block"});
    for (let i = 0; i < 4; i++) {
        $(".colors").eq(i).on("click", function() {
            let color = "";
            if (i === 0) {
                color = "B";
            } else if (i == 1) {
                color = "G";
            } else if (i == 2) {
                color = "R";
            } else {
                color = "Y";
            }
            $.ajax({
                type : "POST",
                url : "/play",
                data: {
                    "function": "makeMove",
                    "username": username,
                    "card": card,
                    "color": color
                }
            }).done(function() {
                $(".colors").css({"display": "none"});
            })
        });
    }
}

function validCard(card) {
    if (card[0] === gameData["color"]) {
        return true;
    } else {
        if (gameData["cards"][1].length === 2 && card[1] === gameData["cards"][1][1]) {
            return true;
        }
        return false;
    }
}

$(document).ready(function() {
    let url = new URL(window.location.href);
    username = url.searchParams.get("username") + "=" + url.searchParams.get("id");
    if (username === "null=null") {
        window.location = "/";
    } else {
        $.ajax({
            type : "POST",
            url : "/play",
            data: {
                "function": "getCredentials",
                "username": username
            }
        }).done(function(data) {
            apiKey = data["apiKey"]
            cluster = data["cluster"]
            pusher = new Pusher(apiKey, {cluster: cluster, forceTLS: true, auth: {params: {"username": username}}});
            channel = pusher.subscribe("presence-uno");
            bindings();
        });
    }
});