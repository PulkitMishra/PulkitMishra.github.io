# Teaching Machines to Notice

Jamnagar is one of the largest oil refineries on Earth. Miles of pipe. Temperatures that vaporize flesh. Pressure vessels that could flatten city blocks. High-voltage switchgear humming behind chain-link fences. Confined spaces where harmful gases pool invisibly, odorless until they kill. Catwalks and ladders stretching a hundred feet up, slick with oil and monsoon rain. Flare stacks burning off excess gas, their heat warping the air. Workers walking through it all in orange coveralls, hopefully wearing their hard hats.

**Our job:** build systems that notice when they forget.

---

## The Place

I flew out to see the site once, in the middle of the project. The refinery hums. Not one note but a chord: bass from the pumps, steam valves hissing, metal striking metal somewhere you can't see. Heat radiates off every surface. Workers move through like they've done it a thousand times, because they have. It's a different feeling seeing up close the place and the people you're building for.

These aren't abstract users. **They're people with families waiting for them. They need to go home safely tonight.**

---

## The Problem

The scope was broad: PPE compliance (helmet, gloves, boots, IFR suit), fire and smoke detection, restricted region monitoring, spillage detection, safety shower verification. RTSP streams in, RTSP streams out with results overlaid in real-time. Alerts fired immediately and persisted to a database for later analysis.

The existing system, built by an earlier team, only handled PPE. And it handled it poorly.

### The Model Problem

Each PPE check had its own model:
- **Gloves:** one neural network
- **Helmet:** another neural network
- **Boots:** third neural network
- **IFR Suit:** fourth neural network

Four separate backbones extracting features from identical pixels, burning four times the compute for no good reason. You could share a single backbone and branch into separate classification heads, cutting redundant computation significantly.

The models themselves were NVIDIA's TAO pretrained models, things like PeopleNet and TrafficCamNet. Convenient for getting started with DeepStream, but consistently underperforming compared to well-tuned open source alternatives like YOLOv8.

We replaced the entire approach with a two-stage pipeline: detect people first, then classify PPE on each person crop. This grounds every detection to a person—you can't have a phantom helmet floating in the air. We fine-tuned YOLOv8 small and nano variants on refinery-specific data.

### The Architecture Problem

The deployment architecture was worse. Here's how a request flowed:

1. A request comes from the UI to run a model on a camera
2. The backend checks a database to see if that camera is already being processed
3. If not, it looks for an existing Kubernetes pod running fewer than four processes
4. If it finds one, it **kills that pod** and restarts with a new configuration (JSON generated based on model requirements)
5. If it doesn't find one, it spawns an entirely new pod using NodeJS K8s APIs

One camera equals one DeepStream process. All processes separate. Nothing shared.

```mermaid
flowchart TB
    subgraph "Old Architecture: One Process Per Camera"
        C1[Camera 1] --> P1[Process 1]
        C2[Camera 2] --> P2[Process 2]
        C3[Camera 3] --> P3[Process 3]
        C4[Camera 4] --> P4[Process 4]
        
        P1 --> GPU1[GPU Inference]
        P2 --> GPU2[GPU Inference]
        P3 --> GPU3[GPU Inference]
        P4 --> GPU4[GPU Inference]
    end
    
    style GPU1 fill:#ff6b6b
    style GPU2 fill:#ff6b6b
    style GPU3 fill:#ff6b6b
    style GPU4 fill:#ff6b6b
```

### What is DeepStream?

DeepStream is NVIDIA's SDK for building video analytics applications. It sits on top of GStreamer (and by extension, FFmpeg), a pipeline-based multimedia framework where you construct a directed graph of elements, each performing some transformation on the data flowing through.

There's also a parallel ecosystem from Intel: DL Streamer built on OpenVINO. Similar concepts, different hardware targets. I'll write [another post](#blog/tools-of-the-trade) comparing these stacks and other toolings I've worked with and my opinions about them.

Why DeepStream matters:
- **Hardware-accelerated encode/decode** via NVDEC/NVENC
- **Optimized inference** via TensorRT (models converted to `.engine` format)
- **Zero-copy GPU memory:** the main performance win. No CPU↔GPU transfers between pipeline stages. Data stays on device.

The programming model: you construct a pipeline by connecting elements via pads. Each element has a source pad (input) and a sink pad (output). Data flows through: an upstream element's sink pad connects to the downstream element's source pad. Each element can have properties you configure. Probes are Python or C++ functions that act as hooks, letting you access and modify metadata as it flows through.

```mermaid
flowchart LR
    subgraph Element1["Element A"]
        SRC1[Source Pad<br/>Input]
        E1[Processing]
        SINK1[Sink Pad<br/>Output]
    end
    
    subgraph Element2["Element B"]
        SRC2[Source Pad<br/>Input]
        E2[Processing]
        SINK2[Sink Pad<br/>Output]
    end
    
    subgraph Element3["Element C"]
        SRC3[Source Pad<br/>Input]
        E3[Processing]
        SINK3[Sink Pad<br/>Output]
    end
    
    SINK1 --> SRC2
    SINK2 --> SRC3
    
    style SRC1 fill:#4ecdc4
    style SRC2 fill:#4ecdc4
    style SRC3 fill:#4ecdc4
    style SINK1 fill:#ff6b6b
    style SINK2 fill:#ff6b6b
    style SINK3 fill:#ff6b6b
```

DeepStream uses a two-tier inference model:
- **PGIE (Primary GPU Inference Engine):** The first-stage model that runs on full frames. Typically a person or object detector.
- **SGIE (Secondary GPU Inference Engine):** Runs after PGIE—either on cropped regions from PGIE detections or on features extracted by PGIE. Used for classification, attribute recognition, or fine-grained analysis.

This separation is fundamental to how we structured the PPE pipeline.

The pipeline abstraction means you can compose complex applications from simple building blocks:
1. A *source element* reads an RTSP stream
2. A *decoder element* converts H.264 to raw frames
3. A *PGIE element* runs the primary neural network
4. A *tracker element* maintains object identity across frames
5. An *SGIE element* runs secondary classification on detected objects
6. A *sink element* writes results to file or streams them out

The previous team wasn't exploiting any of this. One camera, one process. Ferrari delivering groceries.

---

## The Fixes

I'd spent college and internships fine-tuning YOLOs and BERTs. The rhythm becomes meditative after enough iterations: data collection, labeling, hyperparameter sweeps, training, evaluation, repeat. Good work, but I'd done enough of it. I left most of the detection model work to colleagues. The DeepStream pipeline architecture and fall detection model were more interesting to me—and that's what this post focuses on. PPE serves as the running example. Fire, smoke, spillage, and the other detection modes followed similar patterns.

### Two-Stage PPE Detection

The old system detected PPE items directly in the frame. This caused two problems: small objects (gloves, boots) were hard to detect at typical camera distances, and false positives appeared everywhere—the model would hallucinate helmets on lamp posts or gloves on valve handles.

The fix was grounding: every PPE detection must belong to a person.

```mermaid
flowchart TB
    subgraph Stage1["Stage 1: Person Detection (PGIE)"]
        FRAME[Full Frame] --> YOLO1[YOLOv8]
        YOLO1 --> P1[Person 1<br/>Bounding Box]
        YOLO1 --> P2[Person 2<br/>Bounding Box]
        YOLO1 --> P3[Person 3<br/>Bounding Box]
    end
    
    subgraph Stage2["Stage 2: PPE Detection (SGIE)"]
        P1 --> CROP1[Crop 1]
        P2 --> CROP2[Crop 2]
        P3 --> CROP3[Crop 3]
        
        CROP1 --> MODEL[Multi-Head Model]
        CROP2 --> MODEL
        CROP3 --> MODEL
        
        subgraph Heads["Per-Class Heads"]
            MODEL --> HH[Helmet Head]
            MODEL --> GH[Gloves Head]
            MODEL --> BH[Boots Head]
            MODEL --> VH[IFR Suit Head]
            
            HH --> HC[Class ✓/✗]
            HH --> HB[BBox]
            GH --> GC[Class ✓/✗]
            GH --> GB[BBox]
            BH --> BC[Class ✓/✗]
            BH --> BB[BBox]
            VH --> VC[Class ✓/✗]
            VH --> VB[BBox]
        end
    end
    
    style FRAME fill:#45b7d1
    style MODEL fill:#4ecdc4
    style HH fill:#96ceb4
    style GH fill:#96ceb4
    style BH fill:#96ceb4
    style VH fill:#96ceb4
```

**Stage 1 (PGIE):** A YOLOv8 model detects people in the full frame, outputting bounding boxes.

**Stage 2 (SGIE):** Each person crop is passed to a multi-head model. For each PPE class (helmet, gloves, boots, IFR suit), there's a dedicated head with two outputs:
- **Classification head:** binary yes/no for presence
- **Regression head:** bounding box coordinates for the PPE item within the crop

The regression heads aren't used at inference time—you just need the classification outputs to know if each PPE component is present or not. But during training, predicting bounding box locations forces the model to learn spatial priors: a helmet can only appear at the top of the crop, gloves near the edges at arm-height, boots at the bottom. This auxiliary task makes the classifier more robust.

The grounding constraint is simple but powerful: no person, no PPE detection. A hard hat sitting on a shelf doesn't trigger an alert. A glove on a railing is ignored. Only PPE—or its absence—on actual workers matters.

### Batching

A DeepStream pipeline follows GStreamer's model of elements connected by pads. Each element has source pads (inputs) and sink pads (outputs). Data flows from sink to source through links.

The `nvstreammux` element has multiple source pads (one per input source) and a single sink pad that outputs batched frames. On the other end, `nvstreamdemux` takes batched data and splits it back to individual streams.

```mermaid
flowchart LR
    subgraph Sources
        C1[Camera 1<br/>RTSP Source]
        C2[Camera 2<br/>RTSP Source]
        C3[Camera 3<br/>RTSP Source]
        C4[Camera 4<br/>RTSP Source]
    end
    
    subgraph Decode
        D1[NVDEC]
        D2[NVDEC]
        D3[NVDEC]
        D4[NVDEC]
    end
    
    C1 --> D1
    C2 --> D2
    C3 --> D3
    C4 --> D4
    
    D1 --> MUX[nvstreammux<br/>Batches frames]
    D2 --> MUX
    D3 --> MUX
    D4 --> MUX
    
    MUX --> PGIE[PGIE<br/>Person Detection]
    PGIE --> TRACK[nvtracker]
    TRACK --> SGIE[SGIE<br/>PPE Detection]
    SGIE --> DEMUX[nvstreamdemux]
    
    DEMUX --> S1[Sink 1]
    DEMUX --> S2[Sink 2]
    DEMUX --> S3[Sink 3]
    DEMUX --> S4[Sink 4]
    
    style MUX fill:#4ecdc4
    style PGIE fill:#45b7d1
    style SGIE fill:#45b7d1
    style TRACK fill:#96ceb4
```

With this architecture, **one pipeline handles eight cameras**. The PGIE element receives a batch of eight frames and runs inference on all of them in a single GPU kernel launch. Memory transfer overhead happens once per batch, not once per frame. The GPU stays saturated. Memory bandwidth is amortized across the batch.

### Intelligent Tracking

Running full neural network inference on every frame is expensive. At 30 FPS across eight cameras, that's 240 inference calls per second. But object positions don't change much between adjacent frames. A person walking at normal speed moves maybe 10-20 pixels per frame.

You can exploit this temporal coherence by running detection *intermittently* and using a tracker to interpolate positions in between.

DeepStream's `Gst-nvtracker` element supports multiple backends:
- **IOU tracker:** simple, fast
- **NvSORT:** Kalman filter based
- **NvDeepSORT:** with appearance features
- **NvDCF:** discriminative correlation filters

We used NvDCF, which maintains a discriminative correlation filter model per tracked object and updates it online as new detections arrive. The tracker receives detection results every N frames (we used N=20) and produces bounding box predictions for every frame in between. SGIE only runs on detection frames, not tracked frames.

```mermaid
sequenceDiagram
    participant F as Frames
    participant D as PGIE (Detector)
    participant T as Tracker
    participant S as SGIE (PPE Detection)
    
    F->>D: Frame 1
    D->>T: Detections
    T->>S: Detect PPE on crops
    
    F->>T: Frame 2-20
    T-->>T: Predict positions
    Note over S: Skip
    
    F->>D: Frame 21
    D->>T: Fresh detections
    T->>S: Detect PPE on crops
```

This gave us more than just performance gains. Without tracking, the same person walking across frame would trigger separate PPE violation alerts for each detection, potentially dozens of alerts for a single event. With tracking, we assign a persistent ID to each person. Alert logic becomes "person 47 has been in violation for 30 seconds" rather than "900 separate violations detected."

This persistent identity also enabled smarter alerting. Early versions flagged workers removing helmets momentarily to wipe sweat—technically a violation, but not one worth interrupting the control room for. We added temporal persistence: a violation must persist for 30 seconds before triggering an alert. Simple post-processing rule, dramatic reduction in false positives.

**With tracking enabled, we pushed from 8 to 32 concurrent camera streams per pipeline** while maintaining acceptable latency.

### Hot-Swapping Cameras

GStreamer pipelines are technically dynamic. You can add and remove elements at runtime. But the plumbing is fiddly. Adding a new source to an already-running pipeline means creating the source element, creating a new source pad on `nvstreammux`, linking them, and setting the element to PLAYING state. All while the rest of the pipeline continues processing. Get the state transitions wrong, you deadlock. Get the pad linking wrong, you leak memory or crash.

The previous system gave up on this entirely. Adding a camera meant stopping the pod and restarting with a new configuration. That meant several minutes of downtime.

**Pre-allocated Slots**

You cannot add or delete pads at runtime without stopping the pipeline. But you can create them all upfront.

We profiled the pipeline on a T4 GPU (our production inference hardware) to find the sweet spot: maximum GPU utilization without exceeding memory limits or pushing latency past our threshold. The answer was thirty-two streams per pipeline.

So at startup:

1. Create thirty-two source pads on `nvstreammux`
2. Link all to placeholder sources (`fakesrc` elements producing black frames)
3. When a camera needs to be added, swap the placeholder with a real RTSP source
4. When a camera needs to be removed, swap back to placeholder

Swapping works like this:
1. Pause the slot
2. Unlink `fakesrc` from the mux source pad
3. Create new `uridecodebin` with the RTSP URI
4. Link new source to the *same* source pad (the pad persists)
5. Set new source to PLAYING

The mux's source pads never change—only the upstream elements get swapped. Think of it like tubes existing within the pipeline. You're just slotting cameras into tubes or pulling them out. The topology never changes.

```mermaid
flowchart TB
    subgraph Slots["Pre-created Source Pads"]
        S1[Slot 1: Camera A]
        S2[Slot 2: Camera B]
        S3[Slot 3: Empty<br/>fakesrc]
        S4[Slot 4: Camera C]
        S5[Slot 5: Empty<br/>fakesrc]
        S6[Slot 6: Empty<br/>fakesrc]
    end
    
    S1 --> MUX[nvstreammux]
    S2 --> MUX
    S3 --> MUX
    S4 --> MUX
    S5 --> MUX
    S6 --> MUX
    
    MUX --> REST[Rest of Pipeline<br/>Never stops]
    
    CONFIG[ConfigMap Watcher] -.->|Swap source| S3
    CONFIG -.->|Swap source| S5
    
    style S3 fill:#ffcc00
    style S5 fill:#ffcc00
    style S1 fill:#4ecdc4
    style S2 fill:#4ecdc4
    style S4 fill:#4ecdc4
```

A polling mechanism checks a Kubernetes ConfigMap every few seconds. If a pod already exists for a use case and camera count is under 32, we simply add to it. No pod restarts needed.

### Custom Model Integration

Here's the catch with using DeepStream: you get hardware acceleration, optimized memory flow, and production-ready infrastructure out of the box. But the framework expects NVIDIA's models. Custom models—fine-tuned YOLOs, our EfficientGCN—have different input formats, different output tensor shapes, different preprocessing and postprocessing requirements.

DeepStream's `nvinfer` element has a plugin system for this. You write a C++ shared library (`.so` file) that handles the mismatch between what DeepStream provides and what your model expects.

**Preprocessing:** DeepStream sends data in its native format (NvBufSurface, NHWC layout, specific color spaces). Your model might expect different normalization, different tensor layouts, different resolutions. One example: some models expect a depth channel, but DeepStream doesn't natively support depth—you'd need to handle that in the preprocessing library. The preprocessing function transforms DeepStream's buffers into model-ready tensors.

**Postprocessing:** Your model outputs raw tensors. For YOLO, that's detection grids that need decoding, NMS, and thresholding. For classifiers, it's logits that need softmax and thresholding. The postprocessing function parses these outputs and populates DeepStream's metadata structures.

You specify the library path and function names in the PGIE/SGIE config file:

```ini
[property]
parse-bbox-func-name=NvDsInferParseCustomYolo
custom-lib-path=/opt/nvidia/deepstream/lib/libnvds_infercustomparser.so
```

The postprocessing function signature looks like this:

```cpp
extern "C" bool NvDsInferParseCustomYolo(
    std::vector<NvDsInferLayerInfo> const& outputLayers,
    NvDsInferNetworkInfo const& networkInfo,
    NvDsInferParseDetectionParams const& detectionParams,
    std::vector<NvDsInferObjectDetectionInfo>& objectList)
{
    // Parse YOLO output tensors
    // Apply NMS, threshold filtering
    // Populate objectList with detections:
    for (auto& det : decoded_detections) {
        NvDsInferObjectDetectionInfo obj;
        obj.classId = det.class_id;
        obj.left = det.x1;
        obj.top = det.y1;
        obj.width = det.x2 - det.x1;
        obj.height = det.y2 - det.y1;
        obj.detectionConfidence = det.confidence;
        objectList.push_back(obj);
    }
    return true;
}
```

DeepStream's `nvinfer` reads `objectList` and creates `NvDsObjectMeta` entries that flow through the rest of the pipeline. Downstream elements (tracker, SGIE, sinks) consume this metadata without knowing it came from a custom model.

```mermaid
flowchart LR
    subgraph nvinfer["nvinfer Element"]
        INPUT[DeepStream Buffer] --> PREPROC[Preprocess .so]
        PREPROC --> MODEL[TensorRT Engine]
        MODEL --> POSTPROC[Postprocess .so]
        POSTPROC --> META[NvDsObjectMeta]
    end
    
    META --> DOWNSTREAM[Tracker / SGIE / Sink]
    
    style PREPROC fill:#ff6b6b
    style POSTPROC fill:#ff6b6b
    style MODEL fill:#4ecdc4
```

### Model Export and TensorRT

DeepStream requires models in TensorRT `.engine` format. The conversion pipeline:

1. Export PyTorch model to ONNX
2. Convert ONNX to TensorRT engine using `trtexec`

We used FP16 precision—half the memory footprint of FP32 with negligible accuracy loss on our tasks. Dynamic batch sizes (1–32) were configured to handle variable camera loads without recompiling engines.

```bash
trtexec --onnx=yolov8.onnx \
        --saveEngine=yolov8.engine \
        --fp16 \
        --minShapes=images:1x3x640x640 \
        --optShapes=images:16x3x640x640 \
        --maxShapes=images:32x3x640x640
```

More on model export tooling in the [tools post](#blog/tools-of-the-trade).

---

## The New Architecture

The old system conflated everything: inference, configuration, artifact storage, logging—all tangled together, restarting pods whenever anything changed. We separated concerns into control plane and data plane.

**Data plane:** the inference pods. Each handles up to 32 camera streams, runs the DeepStream pipeline, and does one thing well—process video and emit results.

**Control plane:** everything else. Configuration management, camera assignment, artifact routing, log aggregation. Changes here don't require restarting inference.

```mermaid
flowchart TB
    subgraph ControlPlane["Control Plane"]
        API[Backend API]
        CM[ConfigMaps]
        KF[Kafka]
    end
    
    subgraph DataPlane["Data Plane - Inference Pod"]
        subgraph Pod["Pod Components"]
            DS[DeepStream App<br/>32 camera streams]
            WS[Watcher Service]
            MC[mcmirror]
            FL[Fluentd]
        end
    end
    
    subgraph Storage["Storage Layer"]
        DB[(PostgreSQL<br/>Alerts & Metadata)]
        BLOB[(Blob Storage<br/>Clips & Snapshots)]
    end
    
    API -->|Update config| CM
    CM -.->|Poll changes| WS
    WS -->|Add/remove cameras| DS
    
    DS -->|Alerts & logs| FL
    DS -->|Video clips| MC
    
    FL --> KF
    KF --> DB
    MC --> BLOB
    
    style DS fill:#4ecdc4
    style WS fill:#45b7d1
    style ControlPlane fill:#f0f0f0
    style DataPlane fill:#e8f4e8
```

Each inference pod contains four components:

**DeepStream Application:** The pipeline itself. Reads RTSP streams, runs PGIE/SGIE inference, outputs annotated video and detection metadata. This is the only component that touches the GPU.

**Watcher Service:** Polls a Kubernetes ConfigMap every few seconds. When configuration changes—new camera added, camera removed, model parameters updated—it orchestrates the hot-swap without restarting the pipeline. Exposes an API for the backend to query pod state: which cameras are running, current GPU utilization, slot availability.

**mcmirror:** Handles artifact persistence. When a violation is detected, the pipeline saves a short video clip and snapshot locally. mcmirror picks these up and forwards them to blob storage asynchronously. Decouples inference latency from storage latency.

**Fluentd:** Log aggregation. Detection events, performance metrics, errors—all flow through Fluentd to Kafka. A separate consumer batches and persists to the database. Inference pods never talk to the database directly.

The separation pays off operationally. Need to add a camera? Update the ConfigMap. Backend notifies the right pod, watcher picks it up, camera starts streaming within seconds. No restarts. Need to update model parameters? Same flow. Need to debug an issue? Logs are centralized, artifacts are in blob storage, pod state is queryable. The inference pipeline stays focused on inference.

Beyond PPE, we added fire detection, restricted region monitoring, safety shower compliance, and specialized PPE like arc suits—each following the same architecture.

---

## The Fall Detection Problem

Fall detection kept coming up in safety team meetings.

Someone goes down. Maybe near heavy machinery. Maybe from a stairwell or elevated platform. Every second of response delay matters. Could we build a system that notices?

### The Constraint: Model Size

The goal was a small, low-latency model—efficient enough to scale across many streams without saturating GPU resources.

We needed to avoid image-based action recognition. Models like SlowFast consume entire video clips and run 3D convolutions over them. I had used SlowFast for a [cricket action recognition project](#blog/cricket-shots-slowfast) with Mumbai Indians, classifying batting strokes. Accurate for that use case, but expensive. And importantly, SlowFast makes sense when you absolutely need visual cues to differentiate between actions.

Fall detection doesn't need that. It's about detecting **abrupt changes in body configuration**. For that, skeleton data is sufficient.

### Why Graph Convolutional Networks?

Several options existed for skeleton-based action recognition:

**RNN + Attention:** Good for long-range temporal modeling, but harder to train and overkill for fall detection where the signal is sudden and local.

**Temporal Convolutional Networks (TCN):** Good when spatial modeling isn't critical. Falls are inherently spatial.

**Graph Convolutional Networks (GCN):** Best fit. The human body is a graph. Joints are nodes; bones are edges. An elbow connects to a shoulder and a wrist, not to an ankle. This adjacency structure is fixed and known. GCNs let you build this prior directly into the architecture.

The core operation in a GCN is **neighborhood aggregation**. For each node, you:
1. Gather features from its neighbors
2. Combine them through a learned linear transformation
3. Apply a nonlinearity

Compare this to self-attention, where attention weights are *fully learned from data*. In a GCN, the weights are fixed by the graph structure—a node attends uniformly to its neighbors and ignores everything else. This is a **strong prior**, and when the prior matches reality (as it does for skeletal data), it dramatically improves sample efficiency and generalization.

The downside is that GCNs feel hand-engineered. You're explicitly encoding skeletal topology rather than learning it. But when the prior matches reality, it works.

```mermaid
flowchart TB
    subgraph Body["Human Skeleton as Graph"]
        H[Head]
        
        N[Neck]
        
        LS[L.Shoulder]
        SP[Spine]
        RS[R.Shoulder]
        
        LE[L.Elbow]
        LH[L.Hip]
        RH[R.Hip]
        RE[R.Elbow]
        
        LW[L.Wrist]
        LK[L.Knee]
        RK[R.Knee]
        RW[R.Wrist]
        
        LA[L.Ankle]
        RA[R.Ankle]
        
        H --- N
        N --- LS
        N --- SP
        N --- RS
        LS --- LE
        LE --- LW
        SP --- LH
        SP --- RH
        LH --- LK
        LK --- LA
        RH --- RK
        RK --- RA
        RS --- RE
        RE --- RW
    end
    
    style H fill:#45b7d1
    style N fill:#45b7d1
    style SP fill:#45b7d1
```

---

## EfficientGCN

Current state-of-the-art GCN models for action recognition use multi-stream architectures with massive parameter counts. Highly sophisticated but overparameterized and computationally expensive.

EfficientGCN solves this: reduce parameters while maintaining performance.

The original model was trained on NTU RGB+D with 60 action classes, 25 body keypoints per frame, and 3D coordinates from Kinect depth cameras. We adapted it to work with 14 keypoints in 2D from standard RGB cameras.

### Training Data

For fall detection, we used the NTU RGB+D dataset directly—it already includes fall actions as one of its 60 classes.

### Three Input Branches

The model processes three input branches, each capturing different aspects of motion. Let C be the coordinate dimensions (2 for 2D, 3 for 3D).

**Joint Branch:**
- First C channels: joint coordinate relative to spine center (position independent of global location)
- Last C channels: absolute joint coordinate

**Velocity Branch:**
- First C channels: position at frame i minus position at frame i+1 (slow motion)
- Last C channels: position at frame i minus position at frame i+2 (fast motion)

Actions have characteristic velocity signatures. A fall involves sudden downward acceleration followed by abrupt deceleration on impact.

**Bone Branch:**
- First C channels: joint coordinate minus adjacent joint coordinate (bone length and direction, adjacency predefined)
- Last C channels: angle between these adjacent joints

This captures body proportions and limb orientations that persist across frames.

```mermaid
flowchart TB
    subgraph Input["Raw Skeleton Sequence (T frames × V joints)"]
        RAW[Keypoint Coordinates<br/>per frame]
    end
    
    RAW --> JB
    RAW --> VB
    RAW --> BB
    
    subgraph Branches["Three Input Branches"]
        subgraph JB["Joint Branch"]
            J1[Relative position<br/>to spine center]
            J2[Absolute position]
            J1 --> JC[Concat: 2C channels]
            J2 --> JC
        end
        
        subgraph VB["Velocity Branch"]
            V1["Δ(frame t → t+1)<br/>Short-term velocity"]
            V2["Δ(frame t → t+2)<br/>Longer-term motion"]
            V1 --> VC[Concat: 2C channels]
            V2 --> VC
        end
        
        subgraph BB["Bone Branch"]
            B1[Bone vectors<br/>length + direction]
            B2[Joint angles]
            B1 --> BC[Concat: 2C channels]
            B2 --> BC
        end
    end
    
    JC --> BN1[BatchNorm]
    VC --> BN2[BatchNorm]
    BC --> BN3[BatchNorm]
    
    BN1 --> STGCN1[Initial ST-GCN Block]
    BN2 --> STGCN2[Initial ST-GCN Block]
    BN3 --> STGCN3[Initial ST-GCN Block]
    
    STGCN1 --> ATT1[EfficientGCN Blocks<br/>+ Attention]
    STGCN2 --> ATT2[EfficientGCN Blocks<br/>+ Attention]
    STGCN3 --> ATT3[EfficientGCN Blocks<br/>+ Attention]
    
    ATT1 --> FUSION[Early Fusion<br/>Concatenate]
    ATT2 --> FUSION
    ATT3 --> FUSION
    
    FUSION --> MORE[More EfficientGCN Blocks]
    MORE --> GAP[Global Average Pooling]
    GAP --> FC[Fully Connected]
    FC --> OUT[Action Classes]
    
    style JB fill:#ff6b6b,color:#fff
    style VB fill:#4ecdc4,color:#fff
    style BB fill:#45b7d1,color:#fff
    style FUSION fill:#96ceb4
```

### Why 64 Frames?

EfficientGCN expects 64-frame sequences as input. At 30 FPS, that's roughly 2.1 seconds of video.

Falls typically complete in 0.5–1.5 seconds. 64 frames captures the full event with context before and after—the stumble, the fall, the impact, the motionless aftermath. We tested 32, 64, and 128 frames. 32 missed slow falls (elderly workers stumbling gradually). 128 added latency without improving accuracy. 64 was what the paper used, and it made sense for our use case.

### Architecture Details

Each branch passes through batch normalization, then an initial block (same as ST-GCN: spatial graph convolution followed by temporal convolution) for feature extraction.

Then come two GCN blocks with attention. The attention mechanism here is key: **spatial-temporal joint attention**. Considering frames and joints separately is suboptimal. What matters is the importance of a specific joint at a specific time.

The attention works like this:
1. Input tensor shape: C × T × V (channels × frames × joints)
2. Temporal pooling: average over T, get C × V
3. Spatial pooling: average over V, get C × T
4. Concatenate: C × (V + T)
5. Pass through a neural network to compress
6. Split into two separate networks: one outputs frame importance scores (T values), one outputs joint importance scores (V values)
7. Outer product of the two: T × V matrix where entry (t, v) indicates the importance of joint v at frame t

```mermaid
flowchart LR
    subgraph Input
        IN["Input Tensor<br/>C × T × V"]
    end
    
    IN --> TP["Temporal Pool<br/>avg over T"]
    IN --> SP["Spatial Pool<br/>avg over V"]
    
    TP --> TPO["C × V"]
    SP --> SPO["C × T"]
    
    TPO --> CAT["Concatenate<br/>C × (T+V)"]
    SPO --> CAT
    
    CAT --> MLP["MLP<br/>Compress"]
    
    MLP --> SPLIT{Split}
    
    SPLIT --> JA["Joint Attention<br/>V scores"]
    SPLIT --> FA["Frame Attention<br/>T scores"]
    
    JA --> OP["Outer Product<br/>T × V matrix"]
    FA --> OP
    
    OP --> OUT["Attention Matrix<br/>importance of joint v<br/>at frame t"]
    
    style OP fill:#ff6b6b
    style OUT fill:#4ecdc4
```

A person's right hand at the moment of impact is highly informative for fall detection; that same hand ten frames earlier is not.

After two attention-augmented GCN blocks per branch, the features are concatenated (early fusion makes training efficient). The main stream has two more GCN blocks with attention, followed by global average pooling and a fully connected layer.

### Scaling and Results

EfficientGCN follows EfficientNet's scaling philosophy. The B0 variant is tiny (0.19MB). You can scale up by increasing width and depth.

| Metric | Value |
|--------|-------|
| Model Size (B0) | **0.19MB** |
| Original Accuracy (3D, 25 keypoints) | 86.5% |
| Our Accuracy (2D, 14 keypoints) | 83.6% |

A few points lost to reduced input dimensionality, but the model still worked.

---

## Integration

DeepStream doesn't support keypoint data structures natively. The framework's metadata is built around bounding boxes and segmentation masks.

Three approaches:

1. **Hacky:** abuse segmentation mask fields, disable display. Quick but problematic long-term.
2. **Middle path:** define custom structs in the `.so` file, use `cudaMemcpy` to manage GPU memory. Requires managing memory carefully. *Not fun, but clean.* This is what we did.
3. **Best but most involved:** fork and modify `nvinfer` itself to support keypoints. Not worth it for our timeline.

### The Full Pipeline

```mermaid
flowchart TB
    CAM[Camera RTSP] --> DEC[NVDEC]
    DEC --> MUX[nvstreammux]
    MUX --> PGIE[PGIE: YoloPose]
    PGIE --> TRACK[nvtracker]
    TRACK --> PRE[Preprocess Element]
    PRE --> SGIE[SGIE: EfficientGCN]
    SGIE --> POST[Post Process]
    POST --> ALERT{Fall?}
    ALERT -->|Yes| NOTIFY[Alert]
    ALERT -->|No| SINK[Continue]
    
    style PGIE fill:#ff6b6b
    style PRE fill:#ffcc00
    style SGIE fill:#4ecdc4
```

**PGIE (Primary Inference):** YoloPose, a YOLO variant that outputs bounding boxes and body keypoints in a single forward pass. Custom post-processing (C++) extracts both, creates standard metadata for boxes, allocates separate buffers for keypoint data.

**Preprocess Element:** Custom element that accumulates keypoints across frames. EfficientGCN expects 64 frames as input. The element maintains a circular buffer per tracked object and prepares all three input tensors (joint, velocity, bone). Temporal batching and coordinate transformations happen here, all in C++.

**SGIE (Secondary Inference):** EfficientGCN. Output is a probability distribution over action classes. Post-processing thresholds on the fall class probability.

---

## Coda

In October 2024, the project won the Gulf Energy Information Excellence Award for Best Health, Safety or Environmental Contribution in the downstream category. "Pioneering AI-driven plant video surveillance project with Jio Platforms and Reliance Industries Limited."

Found out about it the way ICs usually find out about awards: got forwarded a link months after the ceremony.

But that's not really the point.

Somewhere in Gujarat right now, cameras are running. Pipelines flowing. Neural networks parsing frames nobody will ever watch, looking for missing helmets and sudden falls.

The work is invisible when it's working. Success measured in non-events. **Accidents not happening. Workers safely going home to their families.**

That's what matters.
