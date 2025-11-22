import {FilesetResolver, HandLandmarker} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.js"

window.onload = async () => {
    function canvasFrame() {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        const result = handLandmarker.detectForVideo(video, performance.now())

        drawLandmarks(ctx, result)

        requestAnimationFrame(canvasFrame)
    }

    function drawLandmarks(ctx, result) {
        if (!result.handLandmarks || result.handLandmarks.length === 0) return

        for (let hand of result.handLandmarks) {
    // Draw dots
    ctx.fillStyle = "red";
    for (const lm of hand) {   // <-- use 'hand' here
        ctx.beginPath();
        ctx.arc(lm.x * ctx.canvas.width, lm.y * ctx.canvas.height, 5, 0, 2 * Math.PI);
        ctx.fill();
    }

    // Draw connections (skeleton)
    const connections = [
        [0,1],[1,2],[2,3],[3,4],
        [0,5],[5,6],[6,7],[7,8],
        [0,9],[9,10],[10,11],[11,12],
        [0,13],[13,14],[14,15],[15,16],
        [0,17],[17,18],[18,19],[19,20]
    ];
    ctx.strokeStyle = "green";
    ctx.lineWidth = 2;
    for (const [i,j] of connections) {
        ctx.beginPath();
        ctx.moveTo(hand[i].x * ctx.canvas.width, hand[i].y * ctx.canvas.height);
        ctx.lineTo(hand[j].x * ctx.canvas.width, hand[j].y * ctx.canvas.height);
        ctx.stroke();
    }
}

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
    const ctx = canvas.getContext("2d")

    const stream = await navigator.mediaDevices.getUserMedia({video:true})
    video.srcObject = stream

    video.onloadeddata = () => {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        requestAnimationFrame(canvasFrame)
    }
}