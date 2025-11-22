import {FilesetResolver, HandLandmarker} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.js"
window.onload = async function() {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );
    const handLandmarker = await HandLandmarker.createFromOptions(
        vision,
        {
            baseOptions: {
                modelAssetPath: "./hand_landmarker.task"
            },
            numHands: 2
        });

    const video = document.getElementById("webcam")
    const stream = await navigator.mediaDevices.getUserMedia({video:true})
    video.srcObject = stream
}