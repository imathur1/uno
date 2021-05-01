import random
import pusher
import requests
from flask import Flask, render_template, request, json, jsonify

app = Flask(__name__)
with open("static/credentials.txt", "r") as f:
    appId = f.readline().strip("\n")
    key = f.readline().strip("\n")
    secret = f.readline().strip("\n")
    cluster = f.readline().strip("\n")
pusher_client = pusher.Pusher(
    app_id = appId,
    key = key,
    secret = secret,
    cluster = cluster,
    ssl = True
)
data = {
    "forward": True,
    "active": False,
    "lastMove": "Waiting for players",
    "winner": 0,
    "turn": 0,
    "color": 0,
    "owner": 0, 
    "order": [],
    "cards": [[], 0], 
    "players": {}
} 

def createDeck():
    deck = []
    colors = ["B", "G", "R", "Y"]
    later = []
    for i in range(4):
        deck.append(colors[i] + "0")
        for j in range(1, 10):
            deck.append(colors[i] + str(j))
            deck.append(colors[i] + str(j))
    firstCard = -1
    if data["cards"][1] == 0:
        index = random.randint(0, len(deck) - 1)
        firstCard = deck[index]
        data["color"] = firstCard[0]
        del deck[index]
    for i in later:
        deck.append(i)
    for i in range(4):
        deck.append(colors[i] + "S")
        deck.append(colors[i] + "S")
        deck.append(colors[i] + "R")
        deck.append(colors[i] + "R")
        deck.append(colors[i] + "T")
        deck.append(colors[i] + "T")
        deck.append("W")
        deck.append("F")

    random.shuffle(deck)
    return [deck, firstCard]

def nextTurn():
    if (data["forward"]):
        if data["turn"] == len(data["order"]) - 1:
            return 0
        else:
            return data["turn"] + 1
    else:
        if data["turn"] == 0:
            return len(data["order"]) - 1
        else:
            return data["turn"] - 1

def move(username, card):
    mapping = {"B": "Blue", "G": "Green", "R": "Red", "Y": "Yellow"}
    if card == "W":
        return username.split("=")[0] + " played a Wild card. New color is " + mapping[data["color"]]
    elif card == "F":
        return username.split("=")[0] + " played a Wild Draw 4 card. New color is " + mapping[data["color"]]
    elif card == "draw":
        return username.split("=")[0] + " drew a card"
    else:
        if card[1] == "R":
            return username.split("=")[0] + " played a " + mapping[card[0]] + " Reverse card"
        elif card[1] == "S":
            return username.split("=")[0] + " played a " + mapping[card[0]] + " Skip card"
        elif card[1] == "T":
            return username.split("=")[0] + " played a " + mapping[card[0]] + " Draw 2 card"
        else:
            return username.split("=")[0] + " played a " + mapping[card[0]] + " " + card[1] + " card"

def draw(player, count):
    for i in range(count):
        if len(data["cards"][0]) == 0:
            data["cards"][0] = createDeck()[0]
        index = random.randint(0, len(data["cards"][0]) - 1)
        data["players"][player]["cards"].append(data["cards"][0][index])
        del data["cards"][0][index]
    
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/play", methods = ["GET", "POST"])
def play():
    global data
    if request.method == "POST":
        username = request.form["username"]

        if request.form["function"] == "getCredentials":
            return jsonify({"apiKey": key, "cluster": cluster})

        elif request.form["function"] == "verifyUser":
            if data["active"]:
                players = list(data["players"].keys())
                if username in players:
                    pusher_client.trigger("presence-uno", "updateData", data)
                    return jsonify("success")
                else:
                    return jsonify("error")
            else:
                if data["owner"] == 0:
                    data["owner"] = username
                    data["players"][username] = {"cards": []}
                    pusher_client.trigger("presence-uno", "updateData", data)
                    return jsonify("success")
                elif data["owner"] == username:
                    pusher_client.trigger("presence-uno", "updateData", data)
                    return jsonify("success")
                elif len(data["players"]) < 10:
                    data["players"][username] = {"cards": []}
                    pusher_client.trigger("presence-uno", "updateData", data)
                    return jsonify("success")
                else:
                    return jsonify("error")
                
        elif request.form["function"] == "removePlayer":
            if data["active"]:
                return jsonify("error")
            else:
                removedPlayer = request.form["removedPlayer"]
                data["players"].pop(removedPlayer, None)
                pusher_client.trigger("presence-uno", "updateData", data)
                return jsonify("success")

        elif request.form["function"] == "startGame":
            players = list(data["players"].keys())
            if len(players) < 2:
                return jsonify("error")
            else: 
                if data["active"]:
                    return jsonify("error")
                else:
                    if data["owner"] == username:
                        data["active"] = True
                        cards = createDeck()
                        for i in range(len(players)):
                            hand = []
                            for j in range(7):
                                index = random.randint(0, len(cards[0]) - 1)
                                hand.append(cards[0][index])
                                del cards[0][index]
                            data["players"][players[i]]["cards"] = hand                        
                        random.shuffle(players)
                        data["cards"] = cards
                        data["order"] = players
                        data["lastMove"] = "The game has started"
                        pusher_client.trigger("presence-uno", "updateData", data)
                        return jsonify("success")
                    else:
                        return jsonify("error")

        elif request.form["function"] == "makeMove":
            card = request.form["card"]
            if card == "draw":
                draw(data["order"][data["turn"]], 1)
            else:
                if card == "W":
                    data["color"] = request.form["color"]
                elif card == "F":
                    data["color"] = request.form["color"]
                    data["turn"] = nextTurn()
                    draw(data["order"][data["turn"]], 4)
                else:
                    if card[1] == "S":
                        data["turn"] = nextTurn()
                    elif card[1] == "R":
                        data["forward"] = (not data["forward"])
                    elif card[1] == "T":
                        data["turn"] = nextTurn()
                        draw(data["order"][data["turn"]], 2)
                    data["color"] = card[0]
                data["cards"][1] = card
                error = "e"
                while (error == "e"):
                    try:
                        data["players"][username]["cards"].remove(card)
                        error = ""
                    except ValueError:
                        error = "e"
                if len(data["players"][username]["cards"]) == 0:
                    data["winner"] = username
                    data["lastMove"] = username.split("=")[0] + " has won the game"
                    pusher_client.trigger("presence-uno", "updateData", data)
                    return jsonify("success")    
            data["turn"] = nextTurn()
            data["lastMove"] = move(username, card)
            pusher_client.trigger("presence-uno", "updateData", data)
            return jsonify("success")

        elif request.form["function"] == "newGame":
            data = {
                "forward": True,
                "active": False,
                "lastMove": "Waiting for players",
                "winner": 0,
                "turn": 0,
                "color": 0,
                "owner": 0, 
                "order": [],
                "cards": [[], 0], 
                "players": {}
            } 
            pusher_client.trigger("presence-uno", "newGame", "")
            return jsonify("success")

    else:
        return render_template("play.html")

@app.route("/pusher/auth", methods = ["POST"])
def pusher_authentication():
    auth = pusher_client.authenticate(
        channel = request.form["channel_name"],
        socket_id = request.form["socket_id"],
        custom_data = {
            u"user_id": request.form["username"]
        }
    )
    return json.dumps(auth)

if __name__ == "__main__":
    app.run("0.0.0.0") 