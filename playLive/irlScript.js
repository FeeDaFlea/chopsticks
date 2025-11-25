import {FilesetResolver, HandLandmarker} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.js"

const TIP_IDS = [4, 8, 12, 16, 20]

const LEFT_REST_PERCENT = {
    x: 0.69,
    y: 0.65
}
const RIGHT_REST_PERCENT = {
    x: 0.32,
    y: 0.65
}
const HIT_BUFFER = 5

const NODE_KEY = {
    gameRound : 0,
    playerTurn : 1,
    prevGameState : 2,
    curGameState : 3,
    isEnd : 4,
    isLoop : 5,
    payoff : 6
}

let LEFT_REST, RIGHT_REST, REST_BUFFER

let leftMoveList = []
let rightMoveList = []

let playerTurn = 1
let cpuTurn = playerTurn == 1 ? 2 : 1
const playerIndex = playerTurn - 1
const cpuIndex = cpuTurn - 1

let isPaused = false
let isPlayerTurn = false

let gTree
let gameState = [[1, 1], [1, 1]]

window.onload = async () => {
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

    function genGameState(state, move) {
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

        if (!isPaused) {
            if (isPlayerTurn) {
                if (rFound && lFound) {
                    if (calcDist(leftCentroidCoords, LEFT_REST) > REST_BUFFER) { //Left is outside circle
                        if (leftCentroidCoords.x > LEFT_REST.x - REST_BUFFER) { //Hand is to the right or staight up
                            leftMoveList.push("LL")
                            if (leftMoveList.length >= HIT_BUFFER && leftMoveList.slice(-HIT_BUFFER).every(elm => elm == "LL")) {
                                const newGameState = genGameState(structuredClone(gameState), "LL")
                                if (valMove(gameState, newGameState)) {
                                    gameState = newGameState
                                    updateUI(gameState)
                                    leftMoveList = []
                                    isPlayerTurn = false
                                    isPaused = true
                                    setTimeout(() => isPaused = false, 1000)
                                }
                            }
                        } else { //Hand is to the left
                            leftMoveList.push("LR")
                            if (leftMoveList.length >= HIT_BUFFER && leftMoveList.slice(-HIT_BUFFER).every(elm => elm == "LR")) {
                                const newGameState = genGameState(structuredClone(gameState), "LR")
                                if (valMove(gameState, newGameState)) {
                                    gameState = newGameState
                                    updateUI(gameState)
                                    leftMoveList = []
                                    isPlayerTurn = false
                                    isPaused = true
                                    setTimeout(() => isPaused = false, 1000)
                                }
                            }
                        }
                    } else { //Left is inside circle
                        leftMoveList = []
                    }
                    
                    if (calcDist(rightCentroidCoords, RIGHT_REST) > REST_BUFFER) { //Right is outside
                        if (rightCentroidCoords.x < RIGHT_REST.x + REST_BUFFER) { //Hand is to the right or straight up
                            rightMoveList.push("RR")
                            if (rightMoveList.length >= HIT_BUFFER && rightMoveList.slice(-HIT_BUFFER).every(elm => elm == "RR")) {
                                const newGameState = genGameState(structuredClone(gameState), "RR")
                                if (valMove(gameState, newGameState)) {
                                    gameState = newGameState
                                    updateUI(gameState)
                                    rightMoveList = []
                                    isPlayerTurn = false
                                    isPaused = true
                                    setTimeout(() => isPaused = false, 1000)
                                }
                            }
                        } else { //Hand is to the left
                            rightMoveList.push("RL")
                            if (rightMoveList.length >= HIT_BUFFER && rightMoveList.slice(-HIT_BUFFER).every(elm => elm == "RL")) {
                                const newGameState = genGameState(structuredClone(gameState), "RL")
                                if (valMove(gameState, newGameState)) {
                                    gameState = newGameState
                                    updateUI(gameState)
                                    rightMoveList = []
                                    isPlayerTurn = false
                                    isPaused = true
                                    setTimeout(() => isPaused = false, 1000)
                                }
                            }
                        }
                    } else { //Right is inside circle
                        rightMoveList = []
                    }
                }
            } else { //Computer turn
                gameState = findBestMove(gameState)
                isPlayerTurn = true
                updateUI(gameState)
                isPaused = true
                setTimeout(() => isPaused = false, 1000)
            }
        }
        ctx.beginPath();
        ctx.arc(leftCentroidCoords.x, leftCentroidCoords.y, 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rightCentroidCoords.x, rightCentroidCoords.y, 5, 0, 2 * Math.PI);
        ctx.fill();
    }

    function canvasFrame() {
        ctx.save()
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1)

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        const result = handLandmarker.detectForVideo(video, performance.now())

        if (result.landmarks && result.landmarks.length == 2){ 
            main(ctx, result)
        }

        ctx.beginPath();
        ctx.arc(LEFT_REST.x, LEFT_REST.y, REST_BUFFER, 0, 2 * Math.PI);
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(RIGHT_REST.x, RIGHT_REST.y, REST_BUFFER, 0, 2 * Math.PI);
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore()

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
                const canvasDimensions = scaleCanvas(video.videoWidth, video.videoHeight)
                canvas.width = canvasDimensions.x
                canvas.height = canvasDimensions.y
                relativeContainer.style.width = canvasDimensions.x
                updateUI(gameState)
                LEFT_REST = {
                    x: LEFT_REST_PERCENT.x * canvasDimensions.x,
                    y: LEFT_REST_PERCENT.y * canvasDimensions.y
                }
                RIGHT_REST = {
                    x: RIGHT_REST_PERCENT.x * canvasDimensions.x,
                    y: RIGHT_REST_PERCENT.y * canvasDimensions.y
                }
                REST_BUFFER = canvasDimensions.x / 13
                if (playerTurn == 1) {
                    isPlayerTurn = true
                }
                setTimeout(() => requestAnimationFrame(canvasFrame), 1000)
            })
            .catch(error => {
                console.log("Error in parsing text: " + error)
            })
    }
}