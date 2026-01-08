import {FilesetResolver, HandLandmarker} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.js"

//Declare constants
const TIP_IDS = [4, 8, 12, 16, 20]

//Declare position percents
const LEFT_REST_PERCENT = {
    x: 0.70,
    y: 0.65
}
const RIGHT_REST_PERCENT = {
    x: 1 - LEFT_REST_PERCENT.x,
    y: LEFT_REST_PERCENT.y
}

const LEFT_CPU_PERCENT = {
    x: 1 - (1 - LEFT_REST_PERCENT.x) / 2,
    y: 1 - LEFT_REST_PERCENT.y
}
const RIGHT_CPU_PERCENT = {
    x: RIGHT_REST_PERCENT.x / 2,
    y: 1 - RIGHT_REST_PERCENT.y
}

//Declare frame buffers for actions
const HIT_BUFFER = 5
const SPLIT_BUFFER = 3
const CONFIRM_BUFFER = 10
const START_CONFIRM_BUFFER = 30
const ANIMATION_LENGTH = 20

//Declare constants that have to be set later
let LEFT_REST, RIGHT_REST, REST_BUFFER, RIGHT_CPU_REST, LEFT_CPU_REST, RIGHT_CPU_ANIMATION, LEFT_CPU_ANIMATION, CANVAS_DIMENSIONS, FINGER_LENGTH

//Declare tracking across frames
let leftMoveList = []
let rightMoveList = []
let splitHist = []
let startHist = []

//Declare all Turn constants
let playerTurn, cpuTurn, playerIndex, cpuIndex

//Declare flags
let isPaused = false
let isPlayerTurn = false
let isSplit = false
let isStart = true
let isComputerAnimation = false
let isEnd = false

//Declare animation globals
let animationType = "hit"
let xChangeSplit = 0
let xChangeOpp = 0
let xChangeSame = 0
let yChange = 0
let animationRound = 0
let startRound = 0

const NODE_KEY = {
    gameRound : 0,
    playerTurn : 1,
    prevGameState : 2,
    curGameState : 3,
    isEnd : 4,
    isLoop : 5,
    payoff : 6
}

//Declare variables for cpu gameplay
let gTree
let gameState = [[1, 1], [1, 1]]
let nextMove = [[], []]

window.onload = async () => {
    //Declare functions
    function waitTime(time) {
        isPaused = true
        setTimeout(() => isPaused = false, time) //Unflag after time
    }

    function countFingers(landmarks, rlHand) {
        let fingers = []
        const justThumb = [1, 0, 0, 0, 0]

        //Thumbs
        if (rlHand == "Right") {
            if (landmarks[TIP_IDS[0]].x > landmarks[TIP_IDS[0] - 1].x) { //Tip is to the left
                fingers.push(1)
            } else {
                fingers.push(0)
            }
        } else if (rlHand == "Left") {
            if (landmarks[TIP_IDS[0]].x < landmarks[TIP_IDS[0] - 1].x) { //Tip is to the right
                fingers.push(1)
            } else {
                fingers.push(0)
            }
        }

        //Fingers
        for (let i = 1; i < 5; i++){
            if (landmarks[TIP_IDS[i]].y < landmarks[TIP_IDS[i] - 2].y) { //Tip is higher then next joint
                fingers.push(1)
            } else {
                fingers.push(0)
            }
        }

        if (fingers.every((elm, i) => elm === justThumb[i])){ //Just thumb
            return 0
        }

        return fingers.filter(elm => elm == 1).length //Count ones
    }

    function valFingerCount(count) { 
        if (count >= 5) {
            return count - 5
        } else {
            return count
        }
    }

    function valMove(state, next) {
        const nextNodes = gTree.filter(node => 
            JSON.stringify(node[NODE_KEY.prevGameState]) == JSON.stringify(state) && 
            JSON.stringify(node[NODE_KEY.curGameState]) == JSON.stringify(next)
        )
        if (nextNodes.length >= 1) {
            return true
        } else {
            return false
        }
    }

    function splitOrHit(prevState, curState) {
        console.log(prevState, curState)
        let prevCPU = prevState[cpuIndex]
        let curCPU = curState[cpuIndex]

        if (JSON.stringify(prevCPU) !== JSON.stringify(curCPU)) {
            return "split"
        } else {
            if (prevState[playerIndex][0] !== curState[playerIndex][0]) { //Left was hit
                console.log(JSON.stringify(genGameStateCPU(structuredClone(prevState), "LL")))
                if (prevCPU[0] == prevCPU[1]) {
                    console.log("Same")
                    const moveList = ["LL", "RL"]
                    return moveList[Math.floor(Math.random() * moveList.length)]
                } else if (JSON.stringify(genGameStateCPU(structuredClone(prevState), "LL")) == JSON.stringify(curState)) { //Too fancy. Just use the val move and gen game state
                    return "LL"
                } else {
                    return "RL"
                }
            } else {
                if (prevCPU[0] == prevCPU[1]) {
                    const moveList = ["LR", "RR"]
                    return moveList[Math.floor(Math.random() * moveList.length)]
                } else if (JSON.stringify(genGameStateCPU(structuredClone(prevState), "LR")) == JSON.stringify(curState)) {
                    return "LR"
                } else {
                    return "RR"
                }                
            }
        }
    }

    function genGameStatePlayer(state, move) {
        let playerHands = state[playerIndex]
        let cpuHands = state[cpuIndex]

        switch (move) {
            case "LR":
                cpuHands[1] += playerHands[0]
                break
            case "LL":
                cpuHands[0] += playerHands[0]
                break
            case "RR":
                cpuHands[1] += playerHands[1]
                break
            case "RL":
                cpuHands[0] += playerHands[1]
                break  
        }
        cpuHands[0] = valFingerCount(cpuHands[0])
        cpuHands[1] = valFingerCount(cpuHands[1])
        playerHands[0] = valFingerCount(playerHands[0])
        playerHands[1] = valFingerCount(playerHands[1])

        let returnState = [[],[]]
        returnState[playerIndex] = playerHands
        returnState[cpuIndex] = cpuHands

        return returnState
    }

    function genGameStateCPU(state, move) {
        let playerHands = state[playerIndex]
        let cpuHands = state[cpuIndex]

        switch (move) {
            case "LR":
                playerHands[1] += cpuHands[0]
                break
            case "LL":
                playerHands[0] += cpuHands[0]
                break
            case "RR":
                playerHands[1] += cpuHands[1]
                break
            case "RL":
                playerHands[0] += cpuHands[1]
                break  
        }
        cpuHands[0] = valFingerCount(cpuHands[0])
        cpuHands[1] = valFingerCount(cpuHands[1])
        playerHands[0] = valFingerCount(playerHands[0])
        playerHands[1] = valFingerCount(playerHands[1])

        let returnState = [[],[]]
        returnState[playerIndex] = playerHands
        returnState[cpuIndex] = cpuHands

        return returnState
    }

    function findBestMove(state) {
        const nextNodes = gTree.filter(node => 
            JSON.stringify(node[NODE_KEY.prevGameState]) == JSON.stringify(state) &&
            node[NODE_KEY.playerTurn] == cpuTurn
        )
        const pays = nextNodes.map(node => node[NODE_KEY.payoff])
        const maxPay = (cpuTurn == 1) ? Math.max(...pays) : Math.min(...pays)
        const maxPayNextNodes = nextNodes.filter(node => node[NODE_KEY.payoff] == maxPay)
        const next = maxPayNextNodes[Math.floor(Math.random() * maxPayNextNodes.length)]
        return next[NODE_KEY.curGameState]
    }

    function checkSplit() {
        if ((leftMoveList.length >= SPLIT_BUFFER && rightMoveList.length >= SPLIT_BUFFER) &&
            (JSON.stringify(gameState[playerIndex]) !== "[0,1]") &&
            (JSON.stringify(gameState[playerIndex]) !== "[1,0]")) {
            return true
        } else {
            return false
        }
    }

    function calcDist(point1, point2) {
        const xDist = (point1.x - point2.x) ** 2
        const yDist = (point1.y - point2.y) ** 2
        const dist = (xDist + yDist) ** 0.5

        return dist
    }

    function scaleCanvas(videoWidth, videoHeight) {
        const xScale = window.innerWidth / videoWidth
        const yScale = window.innerHeight / videoHeight
        if (yScale * videoWidth <= window.innerWidth) {
            return {
                x: yScale * videoWidth,
                y: yScale * videoHeight
            }
        } else {
            return {
                x: xScale * videoWidth,
                y: xScale * videoHeight
            }
        }
    }

    function drawFingers(numFingers, pointX, pointY, fingerLength, color, ctx) {
        const degreesPerFinger = 90 / numFingers
        const radPerFinger = degreesPerFinger * Math.PI / 180
        let runningRad = 0
        let fingersToDraw = numFingers
        if (numFingers == 0) return

        if (numFingers % 2 == 0) { //Even
            let endX = pointX + Math.cos(Math.PI / 2 + radPerFinger / 2) * -fingerLength
            let endY = pointY + Math.sin(Math.PI / 2 + radPerFinger / 2) * -fingerLength

            ctx.beginPath()
            ctx.moveTo(pointX, pointY)
            ctx.lineTo(endX, endY)
            ctx.lineWidth = 10
            ctx.strokeStyle = color
            ctx.stroke()

            endX = pointX + Math.cos(Math.PI / 2 - radPerFinger / 2) * -fingerLength
            endY = pointY + Math.sin(Math.PI / 2 - radPerFinger / 2) * -fingerLength

            ctx.beginPath()
            ctx.moveTo(pointX, pointY)
            ctx.lineTo(endX, endY)
            ctx.lineWidth = 10
            ctx.strokeStyle = color
            ctx.stroke()

            runningRad += radPerFinger / 2
            fingersToDraw -= 2
        } else { //odd
            let endX = pointX + Math.cos(Math.PI / 2) * -fingerLength
            let endY = pointY + Math.sin(Math.PI / 2) * -fingerLength

            ctx.beginPath()
            ctx.moveTo(pointX, pointY)
            ctx.lineTo(endX, endY)
            ctx.lineWidth = 10
            ctx.strokeStyle = color
            ctx.stroke()
            fingersToDraw -= 1
        }

        for (let i = 0; i < fingersToDraw / 2; i ++) {
            let endX = pointX + Math.cos(Math.PI / 2 + runningRad + radPerFinger) * -fingerLength
            let endY = pointY + Math.sin(Math.PI / 2 + runningRad + radPerFinger) * -fingerLength

            ctx.beginPath()
            ctx.moveTo(pointX, pointY)
            ctx.lineTo(endX, endY)
            ctx.lineWidth = 10
            ctx.strokeStyle = color
            ctx.stroke()

            endX = pointX + Math.cos(Math.PI / 2 - runningRad - radPerFinger) * -fingerLength
            endY = pointY + Math.sin(Math.PI / 2 - runningRad - radPerFinger) * -fingerLength

            ctx.beginPath()
            ctx.moveTo(pointX, pointY)
            ctx.lineTo(endX, endY)
            ctx.lineWidth = 10
            ctx.strokeStyle = color
            ctx.stroke()

            runningRad += radPerFinger
        }
    }

    function updateUI(state) {
        cpuLeft.innerHTML = state[cpuIndex][0]
        cpuRight.innerHTML = state[cpuIndex][1]
        left.innerHTML = state[playerIndex][0]
        right.innerHTML = state[playerIndex][1]
    }

    function main(ctx, res) {
        //Initialize frame specific local
        let leftCentroidCoords = {x: null, y: null}
        let rightCentroidCoords = {x: null, y: null}
        let rFound = false
        let lFound = false
        let leftFingerCount = 0
        let rightFingerCount = 0

        if (isComputerAnimation) {
            animationRound += 1
            if (animationType == "split") { //Check
                LEFT_CPU_ANIMATION.x -= xChangeSplit
                RIGHT_CPU_ANIMATION.x += xChangeSplit
            } else if (animationType == "RL") {
                LEFT_CPU_ANIMATION.x -= xChangeOpp
                LEFT_CPU_ANIMATION.y += yChange
            } else if (animationType == "LR") {
                RIGHT_CPU_ANIMATION.x += xChangeOpp
                RIGHT_CPU_ANIMATION.y += yChange
            } else if (animationType == "LL") {
                RIGHT_CPU_ANIMATION.x += xChangeSame
                RIGHT_CPU_ANIMATION.y += yChange
            } else {
                LEFT_CPU_ANIMATION.x -= xChangeSame
                LEFT_CPU_ANIMATION.y += yChange
            }
            if (animationRound >= ANIMATION_LENGTH) {
                isComputerAnimation = false
                isPlayerTurn = true
                animationRound = 0
                gameState = nextMove
                if (JSON.stringify(gameState).includes("[0,0]")) isEnd = true
                updateUI(gameState)
                waitTime(1000)
            }
        } 

        if (res.landmarks && res.landmarks.length >= 2) {
            for (let i = 0; i < 2; i++){
                let hand = res.landmarks[i]
                let palm = [hand[0], hand[1], hand[5], hand[9], hand[13], hand[17]]
                let [centroidX, centroidY] = palm.reduce((p, c) => [p[0] + c.x, p[1] + c.y], [0, 0]).map(elm => elm / palm.length)

                if (res.handednesses[i][0].categoryName == "Left") {
                    leftCentroidCoords.x = centroidX * canvas.width
                    leftCentroidCoords.y = centroidY * canvas.height
                    lFound = true
                } else {
                    rightCentroidCoords.x = centroidX * canvas.width
                    rightCentroidCoords.y = centroidY * canvas.height
                    rFound = true
                }
            }

        
            leftFingerCount = countFingers(
                res.handednesses[0][0].categoryName == "Left" ? res.landmarks[0] : res.landmarks[1], 
                "Left"
            )

            rightFingerCount = countFingers(
                res.handednesses[0][0].categoryName == "Right" ? res.landmarks[0] : res.landmarks[1], 
                "Right"
            )
            
            if (rFound && lFound && !isEnd) {
                if (isStart) {
                    if (startRound == 0) {
                        if (calcDist(leftCentroidCoords, LEFT_REST) < REST_BUFFER && calcDist(rightCentroidCoords, RIGHT_REST) < REST_BUFFER) { //Both are inside
                            startRound += 1
                        }
                    } else if (startRound == 1) {
                        startHist.push(rightFingerCount)
                        banner.innerHTML = "Pick first or second on your right hand: " + rightFingerCount.toString()
                        if ((rightFingerCount == 1 || rightFingerCount == 2) && startHist.length >= START_CONFIRM_BUFFER && startHist.slice(-START_CONFIRM_BUFFER).every(elm => elm == rightFingerCount)) {
                            playerTurn = rightFingerCount
                            cpuTurn = playerTurn == 1 ? 2 : 1
                            playerIndex = playerTurn - 1
                            cpuIndex = cpuTurn - 1
                            startRound += 1
                            if (playerTurn == 1) {
                                isPlayerTurn = true
                            }
                        }
                    } else {
                        banner.innerHTML = "Get Ready!"
                        if (calcDist(leftCentroidCoords, LEFT_REST) < REST_BUFFER  //Both are inside
                        && calcDist(rightCentroidCoords, RIGHT_REST) < REST_BUFFER
                        && leftFingerCount == 1 //Both hands only have one finger
                        && rightFingerCount == 1) {
                            isStart = false
                            updateUI(gameState)
                            waitTime(1000)
                        }
                    }
                } else if (!isPaused && !isComputerAnimation) {
                    if (isPlayerTurn) {
                        if (isSplit) {
                            splitHist.push([leftFingerCount, rightFingerCount])
                            let newGameState = [[], []]
                            newGameState[cpuIndex] = gameState[cpuIndex]
                            newGameState[playerIndex] = [leftFingerCount, rightFingerCount]
                            updateUI(newGameState)
                            if (splitHist.length >= CONFIRM_BUFFER && 
                                splitHist.slice(-CONFIRM_BUFFER).every(elm => JSON.stringify(elm) == JSON.stringify([leftFingerCount, rightFingerCount]))) {
                                splitHist = []
                                if (valMove(gameState, newGameState)) {
                                    gameState[playerIndex] = [leftFingerCount, rightFingerCount]
                                    isSplit = false
                                    isPlayerTurn = false
                                    waitTime(1000)
                                }
                            }
                        } else {
                            banner.innerHTML = "Your Turn"
                            if (calcDist(leftCentroidCoords, LEFT_REST) > REST_BUFFER) { //Left is outside circle
                                if (leftCentroidCoords.x > LEFT_REST.x - REST_BUFFER) { //Hand is to the right or staight up
                                    leftMoveList.push("LL")
                                    if (checkSplit()) {
                                        banner.innerHTML = `Split! (Sum ${gameState[playerIndex][0] + gameState[playerIndex][1]})`
                                        isSplit = true
                                    } else if (leftMoveList.length >= HIT_BUFFER && leftMoveList.slice(-HIT_BUFFER).every(elm => elm == "LL")) {
                                        const newGameState = genGameStatePlayer(structuredClone(gameState), "LL")
                                        if (valMove(gameState, newGameState)) {
                                            gameState = newGameState
                                            if (JSON.stringify(gameState).includes("[0,0]")) isEnd = true
                                            updateUI(gameState)
                                            leftMoveList = []
                                            isPlayerTurn = false
                                            waitTime(1000)
                                        }
                                    }
                                } else { //Hand is to the left
                                    leftMoveList.push("LR")
                                    if (checkSplit()) {
                                        banner.innerHTML = `Split! (Sum ${gameState[playerIndex][0] + gameState[playerIndex][1]})`
                                        isSplit = true
                                    } else if (leftMoveList.length >= HIT_BUFFER && leftMoveList.slice(-HIT_BUFFER).every(elm => elm == "LR")) {
                                        const newGameState = genGameStatePlayer(structuredClone(gameState), "LR")
                                        if (valMove(gameState, newGameState)) {
                                            gameState = newGameState
                                            if (JSON.stringify(gameState).includes("[0,0]")) isEnd = true
                                            updateUI(gameState)
                                            leftMoveList = []
                                            isPlayerTurn = false
                                            waitTime(1000)
                                        }
                                    }
                                }
                            } else { //Left is inside circle
                                leftMoveList = []
                            }
                            
                            if (calcDist(rightCentroidCoords, RIGHT_REST) > REST_BUFFER) { //Right is outside
                                if (rightCentroidCoords.x < RIGHT_REST.x + REST_BUFFER) { //Hand is to the right or straight up
                                    rightMoveList.push("RR")
                                    if (checkSplit()) {
                                        banner.innerHTML = `Split! (Sum ${gameState[playerIndex][0] + gameState[playerIndex][1]})`
                                        isSplit = true
                                    } else if (rightMoveList.length >= HIT_BUFFER && rightMoveList.slice(-HIT_BUFFER).every(elm => elm == "RR")) {
                                        const newGameState = genGameStatePlayer(structuredClone(gameState), "RR")
                                        if (valMove(gameState, newGameState)) {
                                            gameState = newGameState
                                            if (JSON.stringify(gameState).includes("[0,0]")) isEnd = true
                                            updateUI(gameState)
                                            rightMoveList = []
                                            isPlayerTurn = false
                                            waitTime(1000)
                                        }
                                    }
                                } else { //Hand is to the left
                                    rightMoveList.push("RL")
                                    if (checkSplit()) {
                                        banner.innerHTML = `Split! (Sum ${gameState[playerIndex][0] + gameState[playerIndex][1]})`
                                        isSplit = true
                                    } else if (rightMoveList.length >= HIT_BUFFER && rightMoveList.slice(-HIT_BUFFER).every(elm => elm == "RL")) {
                                        const newGameState = genGameStatePlayer(structuredClone(gameState), "RL")
                                        if (valMove(gameState, newGameState)) {
                                            gameState = newGameState
                                            if (JSON.stringify(gameState).includes("[0,0]")) isEnd = true
                                            updateUI(gameState)
                                            rightMoveList = []
                                            isPlayerTurn = false
                                            waitTime(1000)
                                        }
                                    }
                                }
                            } else { //Right is inside circle
                                rightMoveList = []
                            }
                        }
                    } else { //Computer Turn
                        banner.innerHTML = "CPU Turn"
                        nextMove = findBestMove(gameState)
                        animationType = splitOrHit(gameState, nextMove)
                        isComputerAnimation = true
                        LEFT_CPU_ANIMATION = {...LEFT_CPU_REST}
                        RIGHT_CPU_ANIMATION = {...RIGHT_CPU_REST}
                    }
                }

                let armColor = (isStart) ? (
                                        startRound == 0 ? "black"
                                        : startRound == 1 ? "yellow"
                                        : "black" 
                                ) : isSplit ? "purple"
                                : isPaused ? "gray"
                                : isPlayerTurn ? "blue"
                                : "gray"

                ctx.beginPath();
                ctx.arc(leftCentroidCoords.x, leftCentroidCoords.y, 5, 0, 2 * Math.PI);
                if ((!isStart && leftFingerCount == gameState[playerIndex][0]) || isStart || isSplit) {
                    ctx.fillStyle = armColor
                } else {
                    ctx.fillStyle = "red"
                }
                ctx.fill();
                ctx.beginPath()
                ctx.moveTo(LEFT_REST.x, CANVAS_DIMENSIONS.y)
                ctx.lineTo(leftCentroidCoords.x, leftCentroidCoords.y)
                ctx.lineWidth = 10
                if ((!isStart && leftFingerCount == gameState[playerIndex][0]) || isStart || isSplit) {
                    ctx.strokeStyle = armColor
                } else {
                    ctx.strokeStyle = "red"
                }                    
                ctx.stroke()

                ctx.beginPath();
                ctx.arc(rightCentroidCoords.x, rightCentroidCoords.y, 5, 0, 2 * Math.PI);
                if ((!isStart && rightFingerCount == gameState[playerIndex][1]) || isStart || isSplit) {
                    ctx.fillStyle = armColor
                } else {
                    ctx.fillStyle = "red"
                }                    
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(RIGHT_REST.x, CANVAS_DIMENSIONS.y)
                ctx.lineTo(rightCentroidCoords.x, rightCentroidCoords.y)
                ctx.lineWidth = 10
                if ((!isStart && rightFingerCount == gameState[playerIndex][1]) || isStart || isSplit) {
                    ctx.strokeStyle = armColor
                } else {
                    ctx.strokeStyle = "red"
                }      
                ctx.stroke()
            }
        }
    }

    function canvasFrame() {
        //Setup canvas
        ctx.save()
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1)

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        //Process frame with mediapipe
        const result = handLandmarker.detectForVideo(video, performance.now())

        main(ctx, result)

        //Draw left and right rest circles
        ctx.strokeStyle = "black"
        ctx.beginPath();
        ctx.arc(LEFT_REST.x, LEFT_REST.y, REST_BUFFER, 0, 2 * Math.PI);
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(RIGHT_REST.x, RIGHT_REST.y, REST_BUFFER, 0, 2 * Math.PI);
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();

        //Draw robot
        if (!(isStart && startRound != 2)) {
            //Draw moving parts (arm, hand)
            if (isComputerAnimation) {
                //Draw computer left hand at animation coords
                ctx.beginPath();
                ctx.moveTo(LEFT_REST.x, 0.5 * CANVAS_DIMENSIONS.y)
                ctx.lineTo(LEFT_CPU_ANIMATION.x, LEFT_CPU_ANIMATION.y)
                ctx.lineWidth = 10
                ctx.stroke()
                drawFingers(gameState[cpuIndex][1], LEFT_CPU_ANIMATION.x, LEFT_CPU_ANIMATION.y, FINGER_LENGTH, "black", ctx)

                ctx.beginPath();
                ctx.arc(LEFT_CPU_ANIMATION.x, LEFT_CPU_ANIMATION.y, 10, 0, 2 * Math.PI)
                ctx.fillStyle = "black"
                ctx.fill()

                //Draw computer right hand at animation coords
                ctx.beginPath();
                ctx.moveTo(RIGHT_REST.x, 0.5 * CANVAS_DIMENSIONS.y)
                ctx.lineTo(RIGHT_CPU_ANIMATION.x, RIGHT_CPU_ANIMATION.y)
                ctx.lineWidth = 10
                ctx.stroke()
                drawFingers(gameState[cpuIndex][0], RIGHT_CPU_ANIMATION.x, RIGHT_CPU_ANIMATION.y, FINGER_LENGTH, "black", ctx)
                
                ctx.beginPath();
                ctx.arc(RIGHT_CPU_ANIMATION.x, RIGHT_CPU_ANIMATION.y, 10, 0, 2 * Math.PI)
                ctx.fillStyle = "black"
                ctx.fill()

            } else {
                //Draw computer left arm
                ctx.beginPath();
                ctx.moveTo(LEFT_REST.x, 0.5 * CANVAS_DIMENSIONS.y)
                ctx.lineTo(LEFT_CPU_REST.x, LEFT_CPU_REST.y)
                ctx.lineWidth = 10
                ctx.stroke()

                //Draw computer left hand at rest coords                
                drawFingers(gameState[cpuIndex][1], LEFT_CPU_REST.x, LEFT_CPU_REST.y, FINGER_LENGTH, "black", ctx)

                ctx.beginPath();
                ctx.arc(LEFT_CPU_REST.x, LEFT_CPU_REST.y, 10, 0, 2 * Math.PI)
                ctx.fillStyle = "black"
                ctx.fill()

                //Draw computer right arm
                ctx.beginPath();
                ctx.moveTo(RIGHT_REST.x, 0.5 * CANVAS_DIMENSIONS.y)
                ctx.lineTo(RIGHT_CPU_REST.x, RIGHT_CPU_REST.y)
                ctx.lineWidth = 10
                ctx.stroke()

                //Draw computer right hand at rest coords
                drawFingers(gameState[cpuIndex][0], RIGHT_CPU_REST.x, RIGHT_CPU_REST.y, FINGER_LENGTH, "black", ctx)

                ctx.beginPath();
                ctx.arc(RIGHT_CPU_REST.x, RIGHT_CPU_REST.y, 10, 0, 2 * Math.PI)
                ctx.fillStyle = "black"
                ctx.fill()
            }

            //Draw line connecting arms
            ctx.beginPath()
            ctx.moveTo(RIGHT_REST.x, 0.5 * CANVAS_DIMENSIONS.y)
            ctx.lineTo(LEFT_REST.x, 0.5 * CANVAS_DIMENSIONS.y)
            ctx.lineWidth = 10
            ctx.stroke()

            //Draw body line
            ctx.beginPath()
            ctx.moveTo((RIGHT_REST.x + LEFT_REST.x) / 2, 0.5 * CANVAS_DIMENSIONS.y)
            ctx.lineTo((RIGHT_REST.x + LEFT_REST.x) / 2, CANVAS_DIMENSIONS.y)
            ctx.lineWidth = 10
            ctx.stroke()

            //Draw neck
            ctx.beginPath()
            ctx.moveTo((RIGHT_REST.x + LEFT_REST.x) / 2, 0.5 * CANVAS_DIMENSIONS.y)
            ctx.lineTo((RIGHT_REST.x + LEFT_REST.x) / 2, 0.375 * CANVAS_DIMENSIONS.y)
            ctx.lineWidth = 10
            ctx.stroke()

            //Draw head
            ctx.beginPath()
            ctx.rect((RIGHT_REST.x + LEFT_REST.x) / 2 - 0.125 * CANVAS_DIMENSIONS.y, 0.125 * CANVAS_DIMENSIONS.y, 0.25 * CANVAS_DIMENSIONS.y, 0.25 * CANVAS_DIMENSIONS.y)
            ctx.stroke()
        }

        //Draw next frame
        requestAnimationFrame(canvasFrame)
    }

    //Load model loader
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    //Load computer vision movel
    const handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "./hand_landmarker.task"
        },
        runningMode: "VIDEO",
        numHands: 2
    });

    //Get elements in DOM
    const video = document.getElementById("webcam")
    const canvas = document.getElementById("outputCanvas")
    const left = document.getElementById("left")
    const right = document.getElementById("right")
    const relativeContainer = document.getElementById("relativeContainer")
    const cpuLeft = document.getElementById("compLeft")
    const cpuRight = document.getElementById("compRight")
    const ctx = canvas.getContext("2d")
    const sheet = document.getElementById("dynamyicStyleSheet").sheet
    const banner = document.getElementById("announcementBanner")
    const loseScreen = document.getElementById("loseScreen")

    //Open webcam
    const stream = await navigator.mediaDevices.getUserMedia({
        video: true
    })
    video.srcObject = stream

    video.onplaying = () => { //Wait until after the webcam is accessed
        fetch("./rawGTree.txt")
            .then(result => result.text())
            .then(data => {
                //Load computer backend
                gTree = JSON.parse(data);

                //Scale the canvas
                CANVAS_DIMENSIONS = scaleCanvas(video.videoWidth, video.videoHeight)
                canvas.width = CANVAS_DIMENSIONS.x
                canvas.height = CANVAS_DIMENSIONS.y

                //Set container width
                relativeContainer.style.width = CANVAS_DIMENSIONS.x

                //Set real coords from percents
                LEFT_REST = {
                    x: LEFT_REST_PERCENT.x * CANVAS_DIMENSIONS.x,
                    y: LEFT_REST_PERCENT.y * CANVAS_DIMENSIONS.y
                }
                RIGHT_REST = {
                    x: RIGHT_REST_PERCENT.x * CANVAS_DIMENSIONS.x,
                    y: RIGHT_REST_PERCENT.y * CANVAS_DIMENSIONS.y
                }
                LEFT_CPU_REST = {
                    x: LEFT_CPU_PERCENT.x * CANVAS_DIMENSIONS.x,
                    y: LEFT_CPU_PERCENT.y * CANVAS_DIMENSIONS.y
                }
                RIGHT_CPU_REST = {
                    x: RIGHT_CPU_PERCENT.x * CANVAS_DIMENSIONS.x,
                    y: RIGHT_CPU_PERCENT.y * CANVAS_DIMENSIONS.y
                }

                REST_BUFFER = CANVAS_DIMENSIONS.x / 13
                FINGER_LENGTH = CANVAS_DIMENSIONS.y / 8

                //Scale animation distances
                yChange = Math.abs(RIGHT_CPU_REST.y - RIGHT_REST.y) / ANIMATION_LENGTH
                xChangeOpp = Math.abs(RIGHT_CPU_REST.x - LEFT_REST.x) / ANIMATION_LENGTH
                xChangeSplit = (Math.abs(RIGHT_CPU_REST.x - LEFT_CPU_REST.x) / 2) / ANIMATION_LENGTH
                xChangeSame = Math.abs(RIGHT_CPU_REST.x - RIGHT_REST.x) / ANIMATION_LENGTH

                //Set text size
                sheet.insertRule(`.fingerCount {font-size: ${canvas.width * 0.04}px;}`)
                sheet.insertRule(`#announcementBanner {font-size: ${canvas.height * 0.09}px;}`)

                ctx.lineCap = "round"

                //Begin frame loop
                setTimeout(() => {
                    requestAnimationFrame(canvasFrame)
                    banner.innerHTML = "Put your hands in the circles"
                }, 1000)
            })
            .catch(error => { //Error handle
                console.log("Error in parsing text: " + error)
            })
    }
}