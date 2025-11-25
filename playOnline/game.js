let cPos;

function getRandElm(arr) {
    const index = Math.floor(Math.random() * arr.length);
    return arr[index]
}

function getPos() {
    let stringPos = [
        [p1L.innerHTML, p1R.innerHTML], 
        [p2L.innerHTML, p2R.innerHTML]
    ];
    let numberPos = stringPos.map(elm => elm.map(elm => Number(elm)));
    return numberPos;
}

function getBestMove(pos, turn) {
  const x = gTree.filter(elm => (JSON.stringify(elm[2]) == JSON.stringify(pos)) && (elm[1] == turn));
  const pays = x.map(elm => elm[6]);
  let bestPay;
  if (turn == 1) {
    bestPay = Math.max(...pays);
  } else {
    bestPay = Math.min(...pays);
  }
  return getRandElm(x.filter(elm => elm[6] == bestPay))
}

function computerTurn() {
    document.getElementById("computerSign").style.textShadow = "0px 0px 10px black";
    document.getElementById("playerSign").style.removeProperty("text-shadow");
    setTimeout(() => {
        let pos = getPos();
        let to = getBestMove(pos, CPUTurn)[3]
        p1L.innerHTML = to[0][0];
        p1R.innerHTML = to[0][1];
        p2L.innerHTML = to[1][0];
        p2R.innerHTML = to[1][1];
        if(JSON.stringify(getPos()[1]) !== JSON.stringify([0,0]) && JSON.stringify(getPos()[0]) !== JSON.stringify([0,0])){
            playerTurn();
        } else if ((JSON.stringify(getPos()[1]) == "[0,0]" && CPUTurn == 1) || (JSON.stringify(getPos()[0]) == "[0,0]" && CPUTurn == 2)) {
            setTimeout(() => {if(confirm("Sorry, you lost. Would you like to play again?")){location.reload()}}, 1000);
        } else if ((JSON.stringify(getPos()[0]) == "[0,0]" && CPUTurn == 1) || (JSON.stringify(getPos()[1]) == "[0,0]" && CPUTurn == 2)) {
            setTimeout(() => {if(confirm("Great job, you won! Would you like to play again?")){location.reload()}}, 1000);
        }
    }, 1000)
}

function playerTurn() {    
    document.getElementById("computerSign").style.removeProperty("text-shadow");
    document.getElementById("playerSign").style.textShadow = "0px 0px 10px black";
    hands[0].forEach(elm => {
        elm.style.color = "rgb(200, 200, 200)"
    })
    hands[1].forEach(elm => {
        if(elm.innerHTML != 0) {
            elm.setAttribute("onclick", "handlePlayerAttackClicks(this)");
        } else {
            elm.style.color = "rgb(200, 200, 200)";
        }
    })
}

function clearClicks() {
    hands[0].forEach(elm => {
        elm.removeAttribute("onclick")
    });
    hands[1].forEach(elm => {
        elm.removeAttribute("onclick");
    });
    playerClicked = undefined;
    document.querySelectorAll("*").forEach(elm => {
        elm.style.color = "rgb(87, 87, 87)";
        elm.style.removeProperty("transform");
    })
}

function handleNum(num) { //Function declaration
  if (num > 4) { //If you don't have enough fingers
    return num - 5;
  } else {
    return num;
  }
}

function handleComputerAttackedClicks(elm) {
    let playerClickedVal = Number(document.getElementById(playerClicked).innerHTML)
    elm.innerHTML = handleNum(Number(elm.innerHTML) + playerClickedVal);
    clearClicks();
    if(JSON.stringify(getPos()[1]) !== JSON.stringify([0,0]) && JSON.stringify(getPos()[0]) !== JSON.stringify([0,0])){
        computerTurn();
        } else if ((JSON.stringify(getPos()[1]) == "[0,0]" && CPUTurn == 1) || (JSON.stringify(getPos()[0]) == "[0,0]" && CPUTurn == 2)) {
            setTimeout(() => {if(confirm("Sorry, you lost. Would you like to play again?")){location.reload()}}, 1000);
        } else if ((JSON.stringify(getPos()[0]) == "[0,0]" && CPUTurn == 1) || (JSON.stringify(getPos()[1]) == "[0,0]" && CPUTurn == 2)) {
            setTimeout(() => {if(confirm("Great job, you won! Would you like to play again?")){location.reload()}}, 1000);
        }
}

function handlePlayerAttackClicks(elm) {
    elm.style.setProperty("transform", "scale(1.5)", "important");
    if (response) {
        cPos = getPos()[0]
    } else {
        cPos = getPos()[1]
    }
    if(JSON.stringify(cPos) != "[0,1]" && JSON.stringify(cPos) != "[1,0]"){
        hands[1][0].setAttribute("onclick", "handlePlayerSplit(this)");
        hands[1][0].style.color = "rgb(87, 87, 87)";
        hands[1][1].setAttribute("onclick", "handlePlayerSplit(this)");
        hands[1][1].style.color = "rgb(87, 87, 87)";
    } else {        
        hands[1][0].style.color = "rgb(200, 200, 200)";
        hands[1][1].style.color = "rgb(200, 200, 200)";
    }
    playerClicked = elm.getAttribute('id'); 
    hands[0].forEach(e => {
        if(e.innerHTML != 0) {
            e.setAttribute("onclick", "handleComputerAttackedClicks(this)")
            e.style.color = "rgb(87, 87, 87)"
        } else {
            e.style.color = "rgb(200, 200, 200)";
        }
    })
}

function handleEndSplit() {
    if (
        JSON.stringify([Number(hands[1][0].innerHTML), Number(hands[1][1].innerHTML)]) != JSON.stringify(cPos) &&
        JSON.stringify([Number(hands[1][1].innerHTML), Number(hands[1][0].innerHTML)]) != JSON.stringify(cPos)
    ) {
        clearClicks();
        hands[1].forEach(elm => {
            elm.innerHTML = handleNum(Number(elm.innerHTML))
        })
        endSplitButton.classList.add("hidden");
        if(JSON.stringify(getPos()[1]) !== JSON.stringify([0,0]) && JSON.stringify(getPos()[0]) !== JSON.stringify([0,0])){
            computerTurn();
        } else if ((JSON.stringify(getPos()[1]) == "[0,0]" && CPUTurn == 1) || (JSON.stringify(getPos()[0]) == "[0,0]" && CPUTurn == 2)) {
            setTimeout(() => {if(confirm("Sorry, you lost. Would you like to play again?")){location.reload()}}, 1000);
        } else if ((JSON.stringify(getPos()[0]) == "[0,0]" && CPUTurn == 1) || (JSON.stringify(getPos()[1]) == "[0,0]" && CPUTurn == 2)) {
            setTimeout(() => {if(confirm("Great job, you won! Would you like to play again?")){location.reload()}}, 1000);
        }
    }
}

function handlePlayerSplit(elm) {
    hands[1].forEach(elm => {
        elm.style.removeProperty("transform");
        elm.style.color = "rgb(87, 87, 87)";
    })
    hands[0].forEach(elm => {
        elm.removeAttribute("onclick");
    })
    let val;
    if(elm.getAttribute("id") == "p1LHand") {
        val = Number(document.getElementById("p1RHand").innerHTML) - 1;
    } else if(elm.getAttribute("id") == "p1RHand") {
        val = Number(document.getElementById("p1LHand").innerHTML) - 1;
    } else if(elm.getAttribute("id") == "p2LHand") {
        val = Number(document.getElementById("p2RHand").innerHTML) - 1;
    } else {
        val = Number(document.getElementById("p2LHand").innerHTML) - 1;
    }
    if(
        val >= 0 && 
        Number(elm.innerHTML) + 1 <= 5
    ) {
        endSplitButton.classList.remove("hidden");
        if(elm.getAttribute("id") == "p1LHand") {
            p1R.innerHTML = val;
        } else if(elm.getAttribute("id") == "p1RHand") {
            p1L.innerHTML = val;
        } else if(elm.getAttribute("id") == "p2LHand") {
            p2R.innerHTML = val;
        } else {
            p2L.innerHTML = val;
        }
        elm.innerHTML = Number(elm.innerHTML) + 1;
        if (
            JSON.stringify([Number(hands[1][0].innerHTML), Number(hands[1][1].innerHTML)]) != JSON.stringify(cPos) &&
            JSON.stringify([Number(hands[1][1].innerHTML), Number(hands[1][0].innerHTML)]) != JSON.stringify(cPos)
        ) {
            endSplitButton.style.color = "rgb(87, 87, 87)";
        } else {
            endSplitButton.style.color = "rgb(200, 200, 200)";
        }
    }
    
}