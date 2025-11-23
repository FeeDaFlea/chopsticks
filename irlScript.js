import {FilesetResolver, HandLandmarker} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.js"

window.onload = async () => {
    function canvasFrame() {
        ctx.save()
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1)

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        const result = handLandmarker.detectForVideo(video, performance.now())

        drawLandmarks(ctx, result)

        ctx.restore()

        requestAnimationFrame(canvasFrame)
    }

    function drawLandmarks(ctx, result) {
        if (!result.landmarks || result.landmarks.length === 0){ 
            return
        }

        for (let hand of result.landmarks) {
            // Draw dots
            ctx.fillStyle = "red";
            for (const lm of hand) {   // <-- use 'hand' here
                ctx.beginPath();
                ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 5, 0, 2 * Math.PI);
                ctx.fill();
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

    video.onplaying = () => {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        setTimeout(() => requestAnimationFrame(canvasFrame), 1000)
    }
}