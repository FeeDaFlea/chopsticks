import {FilesetResolver, HandLandmarker} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.js"

const TIP_IDS = [4, 8, 12, 16, 20]

window.onload = async () => {
    function countFingers(landmarks, rlHand) {
        let fingers = []

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

        if (fingers == [1, 0, 0, 0, 0]){
            return 0
        }

        return fingers.filter(elm => elm == 1).length
    }

    function main(ctx, res) {
        for (let hand of res.landmarks){
            let palm = [hand[0], hand[1], hand[5], hand[9], hand[13], hand[15]]
            let [centroidX, centroidY] = palm.reduce((p, c) => [p[0] + c.x, p[1] + c.y], [0, 0]).map(elm => elm / palm.length)

            ctx.beginPath();
            ctx.arc(centroidX * canvas.width, centroidY * canvas.height, 5, 0, 2 * Math.PI);
            ctx.fill();
        }

        left.innerHTML = countFingers(
            res.handednesses[0][0].categoryName == "Left" ? res.landmarks[0] : res.landmarks[1], 
            "Left"
        )
        right.innerHTML = countFingers(
            res.handednesses[0][0].categoryName == "Right" ? res.landmarks[0] : res.landmarks[1], 
            "Right"
        )
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
    const ctx = canvas.getContext("2d")

    const stream = await navigator.mediaDevices.getUserMedia({
        video: true
    })
    video.srcObject = stream

    video.onplaying = () => {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        setTimeout(() => requestAnimationFrame(canvasFrame), 1000)
    }
}