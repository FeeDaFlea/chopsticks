import {FilesetResolver, HandLandmarker} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.js"

const TIP_IDS = [4, 8, 12, 16, 20]

const LEFT_REST_PERCENT = {
    x: 0.70,
    y: 0.65
}
const RIGHT_REST_PERCENT = {
    x: 0.30,
    y: 0.65
}
const LEFT_CPU_PERCENT = {
    x: 1 - (1 - LEFT_REST_PERCENT.x) / 2,
    y: 1 - LEFT_REST_PERCENT.y
}
const RIGHT_CPU_PERCENT = {
    x: RIGHT_REST_PERCENT.x / 2,
    y: 1 - RIGHT_REST_PERCENT.y
}
const HIT_BUFFER = 5
const SPLIT_BUFFER = 3
const CONFIRM_BUFFER = 10
const START_CONFIRM_BUFFER = 30
const ANIMATION_LENGTH = 20

const NODE_KEY = {
    gameRound : 0,
    playerTurn : 1,
    prevGameState : 2,
    curGameState : 3,
    isEnd : 4,
    isLoop : 5,
    payoff : 6
}

let LEFT_REST, RIGHT_REST, REST_BUFFER, RIGHT_CPU_REST, LEFT_CPU_REST, RIGHT_CPU_ANIMATION, LEFT_CPU_ANIMATION, canvasDimensions

let leftMoveList = []
let rightMoveList = []
let splitHist = []
let startHist = []

let playerTurn, cpuTurn, playerIndex, cpuIndex

let isPaused = false
let isPlayerTurn = false
let isSplit = false
let isStart = true
let isComputerAnimation = false
let animationToOrFrom = "to"
let animationType = "hit"
let xChangeSplit = 0
let xChangeOpp = 0
let xChangeSame = 0
let yChange = 0
let animationRound = 0
let startRound = 0
let nextMove = [[], []]

let gTree
let gameState = [[1, 1], [1, 1]]

window.onload = async () => {
    function waitTime(time) {
        isPaused = true
        setTimeout(() => isPaused = false, time)
    }

    function countFingers(landmarks, rlHand) {
        let fingers = []
        const justThumb = [1, 0, 0, 0, 0]

        if (rlHand == "Right") {
            if (landmarks[TIP_IDS[0]].x > landmarks[TIP_IDS[0] - 1].x) {
                fingers.push(1)
            } else {
                fingers.push(0)
            }
        } else if (rlHand == "Left") {
            if (landmarks[TIP_IDS[0]].x < landmarks[TIP_IDS[0] - 1].x) {
                fingers.push(1)
            } else {
                fingers.push(0)
            }
        }

        for (let i = 1; i < 5; i++){
            if (landmarks[TIP_IDS[i]].y < landmarks[TIP_IDS[i] - 2].y) {
                fingers.push(1)
            } else {
                fingers.push(0)
            }
        }

        if (fingers.every((elm, i) => elm === justThumb[i])){
            return 0
        }

        return fingers.filter(elm => elm == 1).length
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
    } //Add one for computer

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
    } //Add one for computer

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
        if (leftMoveList.length >= SPLIT_BUFFER && rightMoveList.length >= SPLIT_BUFFER) {
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
        let leftCentroidCoords = {x: null, y: null}
        let rightCentroidCoords = {x: null, y: null}
        let rFound = false
        let lFound = false

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

        let leftFingerCount = countFingers(
            res.handednesses[0][0].categoryName == "Left" ? res.landmarks[0] : res.landmarks[1], 
            "Left"
        )

        let rightFingerCount = countFingers(
            res.handednesses[0][0].categoryName == "Right" ? res.landmarks[0] : res.landmarks[1], 
            "Right"
        )

        if (isStart) {
            if (startRound == 0) {
                if (calcDist(leftCentroidCoords, LEFT_REST) < REST_BUFFER && calcDist(rightCentroidCoords, RIGHT_REST) < REST_BUFFER) { //Both are inside
                    startRound += 1
                    console.log("START 0")
                }
            } else if (startRound == 1) {
                startHist.push(rightFingerCount)
                if ((rightFingerCount == 1 || rightFingerCount == 2) && startHist.length >= START_CONFIRM_BUFFER && startHist.slice(-START_CONFIRM_BUFFER).every(elm => elm == rightFingerCount)) {
                    playerTurn = rightFingerCount
                    cpuTurn = playerTurn == 1 ? 2 : 1
                    playerIndex = playerTurn - 1
                    cpuIndex = cpuTurn - 1
                    startRound += 1
                    if (playerTurn == 1) {
                        isPlayerTurn = true
                    }
                    console.log("START 1")
                }
            } else {
                if (calcDist(leftCentroidCoords, LEFT_REST) < REST_BUFFER  //Both are inside
                && calcDist(rightCentroidCoords, RIGHT_REST) < REST_BUFFER
                && leftFingerCount == 1 //Both hands only have one finger
                && rightFingerCount == 1) {
                    isStart = false
                    updateUI(gameState)
                    waitTime(1000)
                    console.log("GO!")
                }
            }
        } else if (isComputerAnimation) {
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
                updateUI(gameState)
                waitTime(1000)
            }
        } else if (!isPaused) {
            if (isPlayerTurn) {
                if (rFound && lFound) {
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
                        if (calcDist(leftCentroidCoords, LEFT_REST) > REST_BUFFER) { //Left is outside circle
                            if (leftCentroidCoords.x > LEFT_REST.x - REST_BUFFER) { //Hand is to the right or staight up
                                leftMoveList.push("LL")
                                if (checkSplit()) {
                                    isSplit = true
                                } else if (leftMoveList.length >= HIT_BUFFER && leftMoveList.slice(-HIT_BUFFER).every(elm => elm == "LL")) {
                                    const newGameState = genGameStatePlayer(structuredClone(gameState), "LL")
                                    if (valMove(gameState, newGameState)) {
                                        gameState = newGameState
                                        updateUI(gameState)
                                        leftMoveList = []
                                        isPlayerTurn = false
                                        waitTime(1000)
                                    }
                                }
                            } else { //Hand is to the left
                                leftMoveList.push("LR")
                                if (checkSplit()) {
                                    isSplit = true
                                } else if (leftMoveList.length >= HIT_BUFFER && leftMoveList.slice(-HIT_BUFFER).every(elm => elm == "LR")) {
                                    const newGameState = genGameStatePlayer(structuredClone(gameState), "LR")
                                    if (valMove(gameState, newGameState)) {
                                        gameState = newGameState
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
                                    isSplit = true
                                } else if (rightMoveList.length >= HIT_BUFFER && rightMoveList.slice(-HIT_BUFFER).every(elm => elm == "RR")) {
                                    const newGameState = genGameStatePlayer(structuredClone(gameState), "RR")
                                    if (valMove(gameState, newGameState)) {
                                        gameState = newGameState
                                        updateUI(gameState)
                                        rightMoveList = []
                                        isPlayerTurn = false
                                        waitTime(1000)
                                    }
                                }
                            } else { //Hand is to the left
                                rightMoveList.push("RL")
                                if (checkSplit()) {
                                    isSplit = true
                                } else if (rightMoveList.length >= HIT_BUFFER && rightMoveList.slice(-HIT_BUFFER).every(elm => elm == "RL")) {
                                    const newGameState = genGameStatePlayer(structuredClone(gameState), "RL")
                                    if (valMove(gameState, newGameState)) {
                                        gameState = newGameState
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
                }
            } else { //Computer turn
                nextMove = findBestMove(gameState)
                animationType = splitOrHit(gameState, nextMove)
                isComputerAnimation = true
                animationToOrFrom = "to"
                console.log(animationType)
                LEFT_CPU_ANIMATION = {...LEFT_CPU_REST}
                RIGHT_CPU_ANIMATION = {...RIGHT_CPU_REST}
            }
        }
        let centroidColor = (isStart) ? (
                                startRound == 0 ? "white"
                                : startRound == 1 ? "yellow"
                                : "white" )
                            : isSplit ? "purple"
                            : isPaused ? "gray"
                            : isPlayerTurn ? "blue"
                            : "gray"

        ctx.beginPath();
        ctx.arc(leftCentroidCoords.x, leftCentroidCoords.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = centroidColor
        ctx.fill();
        ctx.beginPath()
        ctx.moveTo(LEFT_REST.x, canvasDimensions.y)
        ctx.lineTo(leftCentroidCoords.x, leftCentroidCoords.y)
        ctx.lineWidth = 10
        ctx.strokeStyle = centroidColor
        ctx.stroke()

        ctx.beginPath();
        ctx.arc(rightCentroidCoords.x, rightCentroidCoords.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = centroidColor
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(RIGHT_REST.x, canvasDimensions.y)
        ctx.lineTo(rightCentroidCoords.x, rightCentroidCoords.y)
        ctx.lineWidth = 10
        ctx.strokeStyle = centroidColor
        ctx.stroke()
    }

    function canvasFrame() {
        ctx.save()
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1)

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const result = handLandmarker.detectForVideo(video, performance.now())

        if (result.landmarks && result.landmarks.length == 2){ 
            main(ctx, result)
        }
        ctx.strokeStyle = "black"

        ctx.beginPath();
        ctx.arc(LEFT_REST.x, LEFT_REST.y, REST_BUFFER, 0, 2 * Math.PI);
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(RIGHT_REST.x, RIGHT_REST.y, REST_BUFFER, 0, 2 * Math.PI);
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore()
        if (isComputerAnimation) {
            ctx.beginPath();
            ctx.moveTo(LEFT_REST.x, 0.5 * canvasDimensions.y)
            ctx.lineTo(LEFT_CPU_ANIMATION.x, LEFT_CPU_ANIMATION.y)
            ctx.lineWidth = 10
            ctx.strokeStyle = "black"
            ctx.stroke()
            drawFingers(gameState[cpuIndex][1], LEFT_CPU_ANIMATION.x, LEFT_CPU_ANIMATION.y, 100, "black", ctx)

            ctx.beginPath();
            ctx.moveTo(RIGHT_REST.x, 0.5 * canvasDimensions.y)
            ctx.lineTo(RIGHT_CPU_ANIMATION.x, RIGHT_CPU_ANIMATION.y)
            ctx.lineWidth = 10
            ctx.strokeStyle = "black"
            ctx.stroke()
            drawFingers(gameState[cpuIndex][0], RIGHT_CPU_ANIMATION.x, RIGHT_CPU_ANIMATION.y, 100, "black", ctx)
        } else if (!(isStart && startRound != 2)) {
            ctx.beginPath();
            ctx.moveTo(LEFT_REST.x, 0.5 * canvasDimensions.y)
            ctx.lineTo(LEFT_CPU_REST.x, LEFT_CPU_REST.y)
            ctx.lineWidth = 10
            ctx.strokeStyle = "black"
            ctx.stroke()
            drawFingers(gameState[cpuIndex][1], LEFT_CPU_REST.x, LEFT_CPU_REST.y, 100, "black", ctx)

            ctx.beginPath();
            ctx.moveTo(RIGHT_REST.x, 0.5 * canvasDimensions.y)
            ctx.lineTo(RIGHT_CPU_REST.x, RIGHT_CPU_REST.y)
            ctx.lineWidth = 10
            ctx.strokeStyle = "black"
            ctx.stroke()
            drawFingers(gameState[cpuIndex][0], RIGHT_CPU_REST.x, RIGHT_CPU_REST.y, 100, "black", ctx)
        }
        requestAnimationFrame(canvasFrame)
    }

    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    const handLandmarker = await HandLandmarker.createFromOptions(vision, { //Load model
        baseOptions: {
            modelAssetPath: "./hand_landmarker.task"
        },
        runningMode: "VIDEO",
        numHands: 2
    });

    const video = document.getElementById("webcam")
    const canvas = document.getElementById("outputCanvas")
    const left = document.getElementById("left")
    const right = document.getElementById("right")
    const relativeContainer = document.getElementById("relativeContainer")
    const cpuLeft = document.getElementById("compLeft")
    const cpuRight = document.getElementById("compRight")
    const ctx = canvas.getContext("2d")

    const stream = await navigator.mediaDevices.getUserMedia({
        video: true
    })
    video.srcObject = stream

    video.onplaying = () => {
        fetch("./rawGTree.txt")
            .then(result => result.text())
            .then(data => {
                gTree = JSON.parse(data);
                canvasDimensions = scaleCanvas(video.videoWidth, video.videoHeight)
                canvas.width = canvasDimensions.x
                canvas.height = canvasDimensions.y
                relativeContainer.style.width = canvasDimensions.x
                LEFT_REST = {
                    x: LEFT_REST_PERCENT.x * canvasDimensions.x,
                    y: LEFT_REST_PERCENT.y * canvasDimensions.y
                }
                RIGHT_REST = {
                    x: RIGHT_REST_PERCENT.x * canvasDimensions.x,
                    y: RIGHT_REST_PERCENT.y * canvasDimensions.y
                }
                LEFT_CPU_REST = {
                    x: LEFT_CPU_PERCENT.x * canvasDimensions.x,
                    y: LEFT_CPU_PERCENT.y * canvasDimensions.y
                }
                RIGHT_CPU_REST = {
                    x: RIGHT_CPU_PERCENT.x * canvasDimensions.x,
                    y: RIGHT_CPU_PERCENT.y * canvasDimensions.y
                }
                REST_BUFFER = canvasDimensions.x / 13

                yChange = Math.abs(RIGHT_CPU_REST.y - RIGHT_REST.y) / ANIMATION_LENGTH
                xChangeOpp = Math.abs(RIGHT_CPU_REST.x - LEFT_REST.x) / ANIMATION_LENGTH
                xChangeSplit = (Math.abs(RIGHT_CPU_REST.x - LEFT_CPU_REST.x) / 2) / ANIMATION_LENGTH
                xChangeSame = Math.abs(RIGHT_CPU_REST.x - RIGHT_REST.x) / ANIMATION_LENGTH
                setTimeout(() => requestAnimationFrame(canvasFrame), 1000)
            })
            .catch(error => {
                console.log("Error in parsing text: " + error)
            })
    }
}