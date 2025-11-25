import {FilesetResolver, HandLandmarker} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.js"

const TIP_IDS = [4, 8, 12, 16, 20]
const LEFT_REST = {
    x: 690,
    y: 475
}
const RIGHT_REST = {
    x: 320,
    y: 475
}
const REST_BUFFER = 75
const HIT_BUFFER = 5

let gameState = [[1, 1], [1, 1]]
let leftMoveList = []
let rightMoveList = []
let turn = "Player"

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

    function main(ctx, res) {
        let leftCentroidCoords = {x: null, y:null}
        let rightCentroidCoords = {x: null, y:null}
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

        if (rFound && lFound) {
            left.innerHTML = leftFingerCount
            right.innerHTML = rightFingerCount

            if (calcDist(leftCentroidCoords, LEFT_REST) > REST_BUFFER) { //Left is outside circle
                if (leftCentroidCoords.x > LEFT_REST.x - REST_BUFFER) { //Hand is to the left
                    leftCoords.innerHTML = "LL"
                    leftMoveList.push("LL")
                    if (leftMoveList.length >= HIT_BUFFER && leftMoveList.slice(-HIT_BUFFER).every(elm => elm == "LL")) {
                        console.log("LL", leftMoveList)
                        leftMoveList = []
                    }
                } else { //Hand is straight up or to the right
                    leftCoords.innerHTML = "LR"
                    leftMoveList.push("LR")
                    if (leftMoveList.length >= HIT_BUFFER && leftMoveList.slice(-HIT_BUFFER).every(elm => elm == "LR")) {
                        console.log("LR", leftMoveList)
                        leftMoveList = []
                    }
                }
            } else {
                leftCoords.innerHTML = ""
                leftMoveList = []
            }
            if (calcDist(rightCentroidCoords, RIGHT_REST) > REST_BUFFER) {
                if (rightCentroidCoords.x < RIGHT_REST.x + REST_BUFFER) { //Hand is to the left
                    rightCoords.innerHTML = "RR"
                    rightMoveList.push("RR")
                    if (rightMoveList.length >= HIT_BUFFER && rightMoveList.slice(-HIT_BUFFER).every(elm => elm == "RR")) {
                        console.log("RR", rightMoveList)
                        rightMoveList = []
                    }
                } else { //Hand is straight up or to the right
                    rightCoords.innerHTML = "RL"
                    rightMoveList.push("RL")
                    if (rightMoveList.length >= HIT_BUFFER && rightMoveList.slice(-HIT_BUFFER).every(elm => elm == "RL")) {
                        console.log("RL", rightMoveList)
                        rightMoveList = []
                    }
                }
            } else {
                rightCoords.innerHTML = ""
                rightMoveList = []
            }

            ctx.beginPath();
            ctx.arc(leftCentroidCoords.x, leftCentroidCoords.y, 5, 0, 2 * Math.PI);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(rightCentroidCoords.x, rightCentroidCoords.y, 5, 0, 2 * Math.PI);
            ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(LEFT_REST.x, LEFT_REST.y, REST_BUFFER, 0, 2 * Math.PI);
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(RIGHT_REST.x, RIGHT_REST.y, REST_BUFFER, 0, 2 * Math.PI);
        ctx.lineWidth = 3;
        ctx.stroke();
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
        } else {
            left.innerHTML = ""
            right.innerHTML = ""
        }

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
    const leftCoords = document.getElementById("compLeft")
    const rightCoords = document.getElementById("compRight")
    const ctx = canvas.getContext("2d")

    const stream = await navigator.mediaDevices.getUserMedia({
        video: true
    })
    video.srcObject = stream

    video.onplaying = () => {
        const canvasDimensions = scaleCanvas(video.videoWidth, video.videoHeight)
        canvas.width = canvasDimensions.x
        canvas.height = canvasDimensions.y
        relativeContainer.style.width = canvasDimensions.x

        setTimeout(() => requestAnimationFrame(canvasFrame), 1000)
    }
}