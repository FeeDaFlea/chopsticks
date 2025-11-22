import {FilesetResolver, HandLandmarker} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.js"

window.onload = async () => {
    function canvasFrame() {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        const result = handLandmarker.detectForVideo(video, performance.now())

        drawLandmarks(ctx, result)

        requestAnimationFrame(canvasFrame)
    }

    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );
    const handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "./hand_landmarker.task"
        },
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