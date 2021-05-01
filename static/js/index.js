function bindings() {
    $("#username").on("keyup", function(event) {
        if (event.keyCode === 13) {
            event.preventDefault();
            $("#playButton").click();
        }
    });
    
    $("#playButton").on("click", function() {
        let username = $("#username").val();
        let error = "";
        let regexp = /^[a-zA-Z0-9-_]+$/;
        if (username.length < 1 || username.length > 10) {
            error = "Username must be between 1 and 10 characters long";
        } else if (username.search(regexp) === -1) {
            error = "Username must only contain letters, numbers, dashes, and underscores";
        }
    
        if (error === "") {
            window.location = `/play?username=${username}&id=${idGenerator()}`;
        } else {
            $("#row").css({"display": "flex"});
            $("#error").html(error);
        }
    });

    $(window).on("resize", function() {
        $("#outer").css({"maxWidth": Math.floor($("#play").outerWidth() * 0.8) + "px"});
    });
}

function idGenerator() {
    let values = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let id = "";
    for (let i = 0; i < 12; i++) {
        id += values[Math.floor(Math.random() * 62)];
    }
    return id;
}

$(document).ready(function() {
    bindings();
});