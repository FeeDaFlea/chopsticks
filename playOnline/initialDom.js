let playerClicked = undefined;
function makeElement(elmName, parent, properties) {
    const elm = document.createElement(elmName);
    Object.keys(properties).forEach(property => {
        elm[property] = properties[property];
    })
    parent.append(elm);
}

makeElement(
    "div", 
    document.body, 
    {
        "id": "boardWrapper"
    }
)

makeElement(
    "span", 
    document.getElementById("boardWrapper"), 
    {
        "innerHTML": "1",
        "id": "p1LHand",
        "className" : "hands"
    }
)

makeElement(
    "span", 
    document.getElementById("boardWrapper"), 
    {
        "innerHTML": "1",
        "id": "p1RHand",
        "className" : "hands"
    }
)

makeElement(
    "span", 
    document.getElementById("boardWrapper"), 
    {
        "innerHTML": "1",
        "id": "p2LHand",  
        "className" : "hands"
    }
)

makeElement(
    "span", 
    document.getElementById("boardWrapper"), 
    {
        "innerHTML": "1",
        "id": "p2RHand",
        "className" : "hands"
    }
)

makeElement(
    "button", 
    document.body,
    {
        "innerHTML" : "Submit",
        "id" : "endSplitButton",
        "className" : "hidden"
    }
)
makeElement(
    "div",
    document.body,
    {
        "id" : "border"
    }
)

makeElement(
    "p", 
    document.body, 
    {
        "innerHTML" : "🤖",
        "id" : "computerSign"
    }
)

makeElement(
    "p", 
    document.body, 
    {
        "innerHTML" : "😀",
        "id" : "playerSign"
    }
)

const wrapper = document.getElementById("boardWrapper");
const p1L = document.getElementById("p1LHand");
const p1R = document.getElementById("p1RHand");
const p2L = document.getElementById("p2LHand");
const p2R = document.getElementById("p2RHand");
const endSplitButton = document.getElementById("endSplitButton");


let hands;


document.getElementById("endSplitButton").setAttribute("onclick", "handleEndSplit()");