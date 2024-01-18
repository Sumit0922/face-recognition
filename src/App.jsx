import React, { useRef, useEffect, useState } from "react";
import "./App.css";
import * as faceapi from "face-api.js";

function App() {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [isLoading, setIsLoading] = useState(true);
  const [recognizedData, setRecognizedData] = useState([]);

  useEffect(() => {
    startCamera();
    loadModels();
  }, []);

  // this function for the start camera.
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      console.log("video recording started");
    } catch (error) {
      console.error("Error starting video:", error);
    }
  };

  // this function load all model which required to detect the face
  const loadModels = async () => {
    setIsLoading(true);

    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
        faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
        faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
        faceapi.nets.faceExpressionNet.loadFromUri("/models"),
        faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
        faceapi.nets.ageGenderNet.loadFromUri("/models"),
        faceapi.nets.mtcnn.loadFromUri("/models"),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri("/models"),
      ]);

      const labeledFaceDescriptors = await loadLabeledImages();

      // Start face detection once everything is loaded
      faceDetection(labeledFaceDescriptors);
    } catch (error) {
      console.error("Error loading models and labels:", error);
    }
  };

  const loadLabeledImages = async () => {
    const labeledDescriptors = [];
    const labels = ["ENTER YOUR NAME/ LABEL"]; //NOTE : ADD ONLY SIMILAR NAME WHICH IMAGE YOU ARE ADDED IN THE PUBLIC/LABEL FOLDER 
       //IMG NAME AND LABEL NAME SHOULD BE SAME.

    for (const label of labels) {
      const descriptors = [];

      try {
        const img = await faceapi.fetchImage(`/Lables/${label}.jpg`);

        const detectionSsd = await faceapi
          .detectSingleFace(img, new faceapi.SsdMobilenetv1Options())
          .withFaceLandmarks()
          .withFaceDescriptor();

        const detectionTiny = await faceapi
          .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detectionSsd) {
          descriptors.push(detectionSsd.descriptor);
        }
        if (detectionTiny) {
          descriptors.push(detectionTiny.descriptor);
        }
      } catch (error) {
        console.error(
          `Error loading or detecting face in image ${label}:`,
          error
        );
      }

      if (descriptors.length > 0) {
        labeledDescriptors.push(
          new faceapi.LabeledFaceDescriptors(label, descriptors)
        );
      }
    }

    return labeledDescriptors;
  };

  // this face detection function use for the  detecting the face  which appear in front of the camera

  const faceDetection = async (labeledFaceDescriptors) => {
    const detectedIds = [];

    setInterval(async () => {
      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors()
        .withFaceExpressions()
        .withAgeAndGender();

      const context = canvasRef.current.getContext("2d");
      context.clearRect(
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );
      const resized = faceapi.resizeResults(detections, {
        width: 940,
        height: 650,
      });
      faceapi.draw.drawDetections(canvasRef.current, resized);
      faceapi.draw.drawFaceLandmarks(canvasRef.current, resized);
      faceapi.draw.drawFaceExpressions(canvasRef.current, resized);

      const recognizedData = [];

      for (const detection of detections) {
        const faceDescriptor = detection.descriptor;
        const expressions = detection.expressions;
        const dominantExpression = getDominantExpression(expressions);
        const gender = detection.gender;
        const age = detection.age;

        let bestMatch = { label: "Unknown", distance: 1.0 };

        const RECOGNITION_THRESHOLD = 0.45;

        for (const labeledDescriptor of labeledFaceDescriptors) {
          if (labeledDescriptor.descriptors[0]) {
            const distance = faceapi.euclideanDistance(
              faceDescriptor,
              labeledDescriptor.descriptors[0]
            );
            if (distance < bestMatch.distance) {
              bestMatch = {
                label: labeledDescriptor.label,
                distance: distance,
              };
            }
          }
        }

        if (
          !detectedIds.some((idObj) => idObj.label === bestMatch.label) &&
          bestMatch.distance < RECOGNITION_THRESHOLD
        ) {
          detectedIds.push(bestMatch);
          console.log(`Recognized: ${bestMatch.label}`);
        }

        recognizedData.push({
          id:
            bestMatch.distance < RECOGNITION_THRESHOLD
              ? bestMatch.label
              : "Unknown",
          gender: gender,
          age: age.toFixed(0),
          expressions: expressions,
          dominantExpression: dominantExpression,
          time: new Date().toLocaleTimeString(),
          descriptors: faceDescriptor,
        });
      }

      const currentTime = new Date().toLocaleTimeString();

      setRecognizedData(recognizedData);

      console.log("Detected IDs:", [
        ...new Set(detectedIds.map((idObj) => idObj.label)),
      ]);
    }, 1000);
  };

  // this dominant function show the expression of face it  happy / sad / angry / supric
  const getDominantExpression = (expressions) => {
    let dominantExpression = null;
    let maxConfidence = 0;

    for (const expression in expressions) {
      if (expressions[expression] > maxConfidence) {
        maxConfidence = expressions[expression];
        dominantExpression = expression;
      }
    }

    return dominantExpression;
  };

  // this all part to
  return (
    <div
      className="myapp"
      style={{ backgroundColor: "white", height: "100vh" }}
    >
      <h1 style={{ backgroundColor: "black" }}>Face_Recognition</h1>
      <div className="appvideo">
        <video
          crossOrigin="anonymous"
          ref={videoRef}
          width="940"
          height="650"
          autoPlay={true}
        ></video>
      </div>
      <canvas ref={canvasRef} width="940" height="650" className="appcanvas" />

      <div className="recognized-labels">
        {recognizedData.map((data, index) => (
          <div key={index} className="recognized-person">
            <p style={{ color: "black" }}>
              ID: {data.id}, (Gender: {data.gender}, Age: {data.age},
              Expression: {data.dominantExpression})
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
