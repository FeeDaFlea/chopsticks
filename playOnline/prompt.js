let CPUTurn, response;

makeElement(
    "div", 
    document.getElementById("coverDiv"),
    {
        "id" : "popupDiv"    
    }
)

const popup = document.getElementById("popupDiv");

makeElement(
    "span", 
    popup, 
    {
        "id" : "popupText",
        "innerHTML" : "Would you like to go first or second?"
    }
)

makeElement(
    "button", 
    popup, 
    {
        "id" : "firstButton",
        "innerHTML" : "First"
    }
)

makeElement(
    "button", 
    popup, 
    {
        "id" : "secondButton",
        "innerHTML" : "Second"
    }
)

const firstButton = document.getElementById("firstButton");
const secondButton = document.getElementById("secondButton");

function firstTurn() {
    popup.remove()
    setTimeout(() => {
        response = true;
        CPUTurn = 2
        hands = [[p2L, p2R], [p1L, p1R]];
        hands[0].forEach(elm => {
            elm.style.zIndex = 1001
        })
        p1L.style.zIndex = 1000;
        p1R.style.zIndex = 1000;
        p1L.style.gridArea = "bl";
        p1R.style.gridArea = "br";
        p2L.style.gridArea = "tl";
        p2R.style.gridArea = "tr"
        playerTurn();
        document.getElementById("coverDiv").remove()
    }, 1000)

}


function secondTurn() {
    popup.remove()
    setTimeout(() => {        
        response = false;
        CPUTurn = 1;
        hands = [[p1L, p1R], [p2L, p2R]];
        hands[1].forEach(elm => {
            elm.style.zIndex = 1001
        })
        p2L.style.zIndex = 1000;
        p2R.style.zIndex = 1000;
        p1L.style.gridArea = "tl";
        p1R.style.gridArea = "tr";
        p2L.style.gridArea = "bl";
        p2R.style.gridArea = "br"
        computerTurn();
        document.getElementById("coverDiv").remove()
    }, 1000)
}


firstButton.setAttribute("onclick", "firstTurn()");
secondButton.setAttribute("onclick", "secondTurn()");