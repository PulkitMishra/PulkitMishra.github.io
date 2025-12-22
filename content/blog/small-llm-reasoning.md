# On Watching Machines Watch Us

Jamnagar is the largest oil refinery on Earth. Miles of pipe. Temperatures that vaporize flesh. Pressure vessels that could flatten city blocks. Workers walking through it all in orange coveralls, hopefully wearing their hard hats.

Our job: build systems that notice when they forget.

---

I flew out to see the site once, early on. You can't build for a place you've never stood in. The refinery hums—not one note but a chord. Bass from the pumps, steam valves hissing, metal striking metal somewhere you can't see. Heat off every surface. Workers moving through like they've done it a thousand times, because they have.

These aren't abstract users. They're people who need to go home tonight.

---

The existing system was a mess.

Each PPE check had its own model. Gloves: one neural network. Helmet: another neural network. Goggles: third neural network. Three separate backbones extracting features from identical pixels, burning three times the compute for no good reason. The backbone is where most of the computation lives in any detection model—it's the feature extractor, the convolutional layers that transform raw pixels into meaningful representations. Running three of them on the same input frame is pure waste. You could share a single backbone and branch into separate classification heads, cutting compute by roughly 60%.

The models themselves were NVIDIA's TAO pretrained models—things like PeopleNet and TrafficCamNet—convenient for getting started with DeepStream but consistently underperforming compared to well-tuned open source alternatives. When your constraint is "must run in DeepStream," NVIDIA's models are the path of least resistance. But we weren't that constrained.

The architecture was worse.

A request comes from the UI to run a model on a camera. The backend checks a database to see if that camera is already being processed for that model. If not, it looks for an existing Kubernetes pod running fewer than four processes. If it finds one, it kills that pod and restarts it with a new configuration that includes the existing processes plus the new one. If it doesn't find one, it spawns an entirely new pod using NodeJS APIs that hit the Kubernetes control plane with dynamically generated JSON—the DeepStream application config, element properties, source URIs, all templated at request time.

One camera equals one DeepStream process. All processes are separate from one another. Nothing shared.

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

DeepStream is NVIDIA's SDK for building video analytics applications. It sits on top of GStreamer, which is a pipeline-based multimedia framework—you construct a directed graph of elements, each performing some transformation on the data flowing through. DeepStream adds hardware-accelerated video decode via NVDEC, inference via TensorRT through the Gst-nvinfer element, and object tracking via Gst-nvtracker. The pipeline abstraction means you can compose complex applications from simple building blocks: a source element reads an RTSP stream, a decoder element converts H.264 to raw frames, an inference element runs a neural network, a tracker element maintains object identity across frames, and a sink element writes results to file or streams them out.

The power of this abstraction is that batching happens naturally. You can attach multiple source elements to a single Gst-nvstreammux element, which collates frames from different cameras into batches that flow through the rest of the pipeline together. One inference call processes frames from eight cameras simultaneously. The GPU stays saturated. Memory bandwidth is amortized across the batch.

They weren't doing any of this. One camera, one process. Ferrari delivering groceries.

---

Team was small. Three data scientists handling model work. One backend engineer building v2 on the side. Me: responsible for one model, all DeepStream applications across all models, all deployments, and maintaining the existing backend while ripping out everything wrong with it.

The detection model I left to colleagues. I'd spent college and internships fine-tuning YOLOs and BERTs—the rhythm becomes meditative after enough iterations. Data collection, labeling, hyperparameter sweeps, training, evaluation, repeat. Good work. I'd done enough of it.

The DeepStream stuff was where things got interesting.

---

First fix: batching.

A DeepStream pipeline is a GStreamer pipeline, which means it follows GStreamer's model of elements connected by pads. Each element has source pads (outputs) and sink pads (inputs). Data flows from source pads to sink pads through links. The nvstreammux element has multiple sink pads—one per input source—and a single source pad that outputs batched frames. On the other end, the nvstreamdemux element takes batched data and splits it back to individual streams.

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
    
    MUX --> INF[nvinfer<br/>Single batched<br/>GPU call]
    INF --> TRACK[nvtracker]
    TRACK --> DEMUX[nvstreamdemux]
    
    DEMUX --> S1[Sink 1]
    DEMUX --> S2[Sink 2]
    DEMUX --> S3[Sink 3]
    DEMUX --> S4[Sink 4]
    
    style MUX fill:#4ecdc4
    style INF fill:#45b7d1
    style TRACK fill:#96ceb4
```

With this architecture, one pipeline handles eight cameras. The nvinfer element receives a batch of eight frames and runs inference on all of them in a single GPU kernel launch. The memory transfer overhead between CPU and GPU happens once per batch, not once per frame. In our benchmarks, this gave roughly 8x throughput improvement from a configuration change alone—no code modifications, just restructuring the pipeline topology.

Second fix: hot-swapping cameras.

GStreamer pipelines are technically dynamic—you can add and remove elements at runtime. But the plumbing is fiddly. Adding a new source to an already-running pipeline means creating the source element, creating a new sink pad on the nvstreammux, linking them, and setting the element to PLAYING state, all while the rest of the pipeline continues processing. If you get the state transitions wrong, you deadlock. If you get the pad linking wrong, you leak memory or crash.

The previous system gave up on this entirely. Adding a camera meant stopping the pod and restarting with a new configuration. That meant several minutes of downtime—unacceptable at refinery scale.

Our solution: pre-create all pads at initialization. We knew from GPU profiling exactly how many cameras we could handle per pipeline before inference latency became unacceptable—sixteen, in our case. So at pipeline startup, we create sixteen sink pads on the nvstreammux, all linked to placeholder elements. When a camera needs to be added, we replace the placeholder with a real RTSP source. When a camera needs to be removed, we swap the source back to a placeholder. The pipeline topology never changes; only the sources feeding into it do.

```mermaid
flowchart TB
    subgraph "Hot-Swap Architecture"
        subgraph Slots["Pre-created Sink Pads"]
            S1[Slot 1: Camera A]
            S2[Slot 2: Camera B]
            S3[Slot 3: Placeholder]
            S4[Slot 4: Camera C]
            S5[Slot 5: Placeholder]
            S6[Slot 6: Placeholder]
        end
        
        S1 --> MUX[nvstreammux]
        S2 --> MUX
        S3 --> MUX
        S4 --> MUX
        S5 --> MUX
        S6 --> MUX
        
        MUX --> REST[Rest of Pipeline<br/>Never stops]
    end
    
    CONFIG[ConfigMap<br/>Watcher Thread] -.->|Swap source| S3
    CONFIG -.->|Swap source| S5
    
    style S3 fill:#ffcc00,stroke:#333
    style S5 fill:#ffcc00,stroke:#333
    style S1 fill:#4ecdc4
    style S2 fill:#4ecdc4
    style S4 fill:#4ecdc4
    style REST fill:#45b7d1
```

A background thread polls a Kubernetes ConfigMap every few seconds. When the config changes—new camera added, existing camera removed, model parameters updated—the thread performs the necessary source swaps. The inference loop continues uninterrupted throughout.

Third fix: tracking.

Running full neural network inference on every frame is expensive. At 30 FPS across eight cameras, that's 240 inference calls per second. But object positions don't change much between adjacent frames—a person walking at normal speed moves maybe 10-20 pixels per frame. You can exploit this temporal coherence by running detection intermittently and using a tracker to interpolate positions in between.

DeepStream's Gst-nvtracker element supports multiple tracking backends through the NvMultiObjectTracker library: IOU, NvSORT, NvDeepSORT, and NvDCF trackers. We used NvDCF, which maintains a discriminative correlation filter model per tracked object and updates it online as new detections arrive. The tracker receives detection results every N frames (we used N=20) and produces bounding box predictions for every frame in between. The computational cost of tracking is negligible compared to neural network inference—NvDCF runs on GPU but is far cheaper than a full forward pass through the detection network.

```mermaid
sequenceDiagram
    participant F as Frames
    participant D as Detector (nvinfer)
    participant T as Tracker (nvtracker)
    participant S as SGIE (Classifier)
    
    F->>D: Frame 1
    D->>T: Detections + IDs
    T->>S: Run classification
    
    F->>T: Frame 2
    T-->>T: Predict positions
    Note over S: Skip SGIE
    
    F->>T: Frame 3
    T-->>T: Predict positions
    Note over S: Skip SGIE
    
    F->>T: ...frames 4-19...
    T-->>T: Predict positions
    Note over S: Skip SGIE
    
    F->>D: Frame 20
    D->>T: Fresh detections
    T->>S: Run classification
    
    Note over D,S: Detection every 20 frames<br/>20x reduction in SGIE load
```

This gave us more than just performance gains. Without tracking, the same person walking across frame would trigger separate PPE violation alerts for each detection—potentially dozens of alerts for a single event. With tracking, we assign a persistent ID to each person. The alert logic becomes "person 47 has been in violation for 30 seconds" rather than "we detected 900 separate violations in the last 30 seconds."

The secondary inference—the classifier that looks at detected person crops and determines PPE compliance—only runs on keyframes where we have fresh detections. This reduces SGIE (Secondary GPU Inference Engine) load dramatically.

Beyond PPE detection, I added new use cases: fire and smoke detection, restricted region monitoring (geofenced areas where presence triggers alerts), safety shower usage tracking, specialized equipment detection like arc suits for electrical work. Each new use case meant new models, new post-processing logic, new alert schemas—but the pipeline architecture remained the same.

---

Fall detection was the nightmare that kept coming up in safety team meetings.

Someone goes down near heavy machinery. Every second of response delay matters. Could we build a system that notices?

The constraint was edge deployment. Refineries have areas with limited connectivity, places where you can't rely on round-trip latency to a cloud GPU. We needed a model small enough to run on CPU, fast enough to process in real-time, accurate enough to avoid false alarms. Initial detection happens on-device; the system can phone home for confirmation from larger models afterward, but the first alert has to be local and immediate.

Image-based action recognition was too heavy. Models like SlowFast or TimeSformer consume entire video clips—16 or 32 frames—and run 3D convolutions or spatiotemporal attention over them. Accurate, but way too expensive for edge inference. And we didn't need that level of visual understanding. Fall detection isn't about recognizing subtle actions; it's about detecting abrupt changes in body configuration. For that, skeleton data is sufficient.

Why GCNs for skeleton-based action recognition? The human body is a graph. Joints are nodes; bones are edges. An elbow is connected to a shoulder and a wrist, not to an ankle. This adjacency structure is fixed and known. Graph Convolutional Networks let you build this prior directly into the architecture rather than forcing the network to learn it from data.

```mermaid
graph TB
    subgraph "Human Skeleton as Graph"
        HEAD((Head))
        NECK((Neck))
        LSHO((L.Shoulder))
        RSHO((R.Shoulder))
        LELB((L.Elbow))
        RELB((R.Elbow))
        LWRI((L.Wrist))
        RWRI((R.Wrist))
        SPINE((Spine))
        LHIP((L.Hip))
        RHIP((R.Hip))
        LKNE((L.Knee))
        RKNE((R.Knee))
        LANK((L.Ankle))
        RANK((R.Ankle))
        
        HEAD --- NECK
        NECK --- LSHO
        NECK --- RSHO
        NECK --- SPINE
        LSHO --- LELB
        RSHO --- RELB
        LELB --- LWRI
        RELB --- RWRI
        SPINE --- LHIP
        SPINE --- RHIP
        LHIP --- LKNE
        RHIP --- RKNE
        LKNE --- LANK
        RKNE --- RANK
    end
```

The core operation in a GCN is neighborhood aggregation. For each node, you gather features from its neighbors, combine them through a learned linear transformation, and apply a nonlinearity. In matrix form, if A is the adjacency matrix (where A[i,j] = 1 if nodes i and j are connected), X is the feature matrix (where row i contains features for node i), and W is the weight matrix, then one GCN layer computes something like H = σ(ÃXW), where Ã is a normalized version of A that includes self-loops and degree normalization. The adjacency matrix controls which nodes talk to which; the weight matrix controls how their features combine.

Compare this to self-attention, where the attention weights are fully learned from data. In attention, you compute pairwise compatibility scores between all nodes and use softmax to convert them to weights. In a GCN, the weights are fixed by the graph structure—a node attends uniformly to its neighbors and ignores everything else. This is a strong prior, and when the prior matches reality (as it does for skeletal data), it dramatically improves sample efficiency and generalization.

---

We used EfficientGCN. The original model was trained on NTU RGB+D, a large-scale action recognition dataset with 60 action classes, 25 body keypoints per frame, and 3D coordinates from Kinect depth cameras. We needed it to work with fewer keypoints in 2D from standard RGB cameras—a significant simplification, but one that dropped the depth camera requirement entirely.

The model processes three input branches, each capturing different aspects of motion.

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

The joint branch encodes spatial position. For each frame t and each joint v, the input consists of two vectors: the joint's position relative to the spine center (capturing pose independent of global location) and the joint's absolute position (capturing where in the frame the action is happening). Concatenating these gives a feature vector of dimension 2C, where C is the number of coordinate dimensions (2 for our 2D case, 3 for the original 3D case).

The velocity branch encodes temporal dynamics. For each joint at frame t, we compute two difference vectors: the displacement from frame t to frame t+1 (capturing short-term velocity) and the displacement from frame t to frame t+2 (capturing slightly longer-term motion). Actions have characteristic velocity signatures—a fall involves sudden downward acceleration followed by abrupt deceleration on impact. The dual-scale velocity representation helps the network distinguish between fast and slow versions of similar actions.

The bone branch encodes structural relationships. For each pair of adjacent joints (as defined by skeletal topology), we compute the bone vector (endpoint minus startpoint, giving length and direction) and the bone angle relative to some reference axis. This captures body proportions and limb orientations that persist across frames—information that's invariant to global position and velocity.

Each branch passes through batch normalization (stabilizing training by normalizing activations), then through an initial block modeled on ST-GCN (the original spatial-temporal graph convolution paper) that establishes the basic feature extraction, then through the main EfficientGCN blocks that apply a spatial-temporal joint attention mechanism.

The attention mechanism is where EfficientGCN improves over prior work. Earlier approaches applied temporal attention and spatial attention independently—first aggregate across time to get joint importance, then aggregate across joints to get frame importance, or vice versa. But this misses the point: what matters is the importance of a specific joint at a specific time. A person's right hand at the moment of impact is highly informative for fall detection; that same hand ten frames earlier is not.

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

EfficientGCN computes joint-temporal attention scores directly. Given an input tensor of shape C×T×V (channels × frames × joints), it first computes temporal pooling by averaging across the T dimension, yielding a C×V tensor that summarizes each joint's features across time. It then computes spatial pooling by averaging across the V dimension, yielding a C×T tensor that summarizes each frame's features across joints. These are concatenated, passed through a small MLP to compress the information, then split into two branches: one that outputs V attention scores (joint importance) and one that outputs T attention scores (frame importance). The outer product of these two vectors gives a T×V attention matrix, where entry (t,v) indicates the importance of joint v at frame t.

After the attention blocks, the three branch features are concatenated—early fusion, computationally efficient. More EfficientGCN blocks follow, then global average pooling collapses the spatial and temporal dimensions, and a final fully connected layer produces class probabilities.

The scaling philosophy follows EfficientNet: a baseline architecture (B0) can be scaled up by increasing width (channels per layer) and depth (number of layers) according to compound scaling rules. We used B0 at 0.19MB. On the original 3D 25-keypoint NTU RGB+D data, it achieved 86.5% mAP. On our 2D 14-keypoint setup, we got 83.6% mAP—a few points lost to reduced input dimensionality, but the model still worked.

---

DeepStream doesn't support keypoint data natively. The framework's metadata structures are built around bounding boxes (NvDsObjectMeta) and segmentation masks, not skeletal data. You can't just pass a list of (x, y) keypoint coordinates through the pipeline the way you can pass detection boxes.

Three options existed. 

The first was to abuse existing data structures—stuff keypoint coordinates into the segmentation mask fields, treat joint IDs as class IDs, generally make a mess that technically works but that anyone maintaining the code later will curse you for.

The second was to implement custom data structures in the post-processing shared library. DeepStream's nvinfer element allows you to specify a .so file and function name for custom post-processing. The function receives the inference output buffer and a pointer to the frame's metadata structure; it can parse the raw tensor outputs however it wants and attach custom data to the metadata. This requires managing memory carefully—allocating buffers for keypoint data, ensuring proper cleanup when frames exit the pipeline. Not fun, but clean.

The third option was to modify nvinfer itself to add native keypoint support. This would give the best result but require forking NVIDIA's code and maintaining a custom build of DeepStream. Not worth it for our timeline.

We went with option two.

```mermaid
flowchart TB
    subgraph Pipeline["Fall Detection Pipeline"]
        CAM[Camera<br/>RTSP] --> DEC[NVDEC<br/>Decode]
        DEC --> MUX[nvstreammux]
        MUX --> PGIE
        
        subgraph PGIE["PGIE: YoloPose"]
            YOLO[YoloPose Model]
            POST1["Custom Post-process<br/>(parse keypoints)"]
            YOLO --> POST1
        end
        
        PGIE --> TRACK[nvtracker<br/>Persistent IDs]
        
        TRACK --> PRE
        
        subgraph PRE["Custom Preprocessing"]
            BUF["Circular Buffer<br/>(64 frames per person)"]
            COMP["Compute branches:<br/>• Joint positions<br/>• Velocities<br/>• Bone vectors"]
            BUF --> COMP
        end
        
        PRE --> SGIE
        
        subgraph SGIE["SGIE: EfficientGCN"]
            GCN[EfficientGCN-B0<br/>0.19MB]
            POST2["Post-process<br/>(threshold fall prob)"]
            GCN --> POST2
        end
        
        SGIE --> ALERT{Fall<br/>Detected?}
        ALERT -->|Yes| NOTIFY[Trigger Alert]
        ALERT -->|No| SINK[Continue]
    end
    
    style PGIE fill:#ff6b6b
    style SGIE fill:#4ecdc4
    style PRE fill:#45b7d1
```

The primary inference element (PGIE) runs YoloPose, a variant of YOLO that outputs both bounding boxes and body keypoints in a single forward pass. The network architecture adds a keypoint regression head alongside the standard detection head, predicting 17 keypoint coordinates per detected person. Our custom post-processing parses the YoloPose output tensor, extracts the bounding boxes and keypoints, creates NvDsObjectMeta entries for the boxes (which DeepStream handles natively), and allocates a separate buffer for keypoint data that we attach to the metadata as a user-defined extension.

Between PGIE and SGIE (Secondary GPU Inference Engine, which runs the fall detection GCN), a custom pre-processing element accumulates keypoints across frames. The GCN expects a temporal window of T frames as input; we use T=64. The pre-processing element maintains a circular buffer per tracked object, pushing new keypoint data each frame and computing the three input branches (joint positions, velocities, bone vectors) when the buffer is full. This involves substantial computation—coordinate transformations, difference calculations, normalization—all implemented in C++ because that's what DeepStream's plugin architecture requires.

The SGIE runs EfficientGCN on the prepared input tensors. Output is a probability distribution over action classes; our post-processing thresholds on the "fall" class probability and triggers alerts when it exceeds a configurable value for a configurable number of consecutive frames.

When I left the project, I was working on extending the alert system to save video clips as evidence rather than just keyframe images. The challenge is memory management: you need to buffer several seconds of decoded frames in case an alert fires, but decoded video at 1080p30 consumes substantial memory across eight camera streams. The tee element in GStreamer can split a stream, sending one copy to the inference pipeline and another to a circular buffer, but coordinating the buffer flush on alert requires careful synchronization. Several approaches exist; I was evaluating them when I moved on.

---

For edge deployment, we built a proof-of-concept using Intel's OpenVINO toolkit and DL Streamer framework. OpenVINO is Intel's inference optimization toolkit—it takes trained models in formats like ONNX or TensorFlow SavedModel, applies optimizations (layer fusion, quantization, memory layout transformations), and produces executables tuned for Intel CPUs, integrated GPUs, or VPUs. DL Streamer is Intel's equivalent of DeepStream: a GStreamer-based streaming analytics framework with elements for inference (gvadetect, gvaclassify), tracking (gvatrack), and metadata handling.

The pipeline topology mirrored our DeepStream implementation. Source elements read from cameras, decoder elements convert to raw frames, an inference element runs Intel's pose estimation model (from their Open Model Zoo), tracking uses DeepSort with appearance features, and our GCN runs on accumulated skeleton sequences. GVA Python elements serve as hooks for custom logic, equivalent to DeepStream probe functions.

Performance on a single CPU core: 45 FPS for multi-person pose estimation, tracking, and fall classification combined. Adequate for real-time processing of a single camera stream on an edge device with modest compute.

---

In October 2024, the project won the Gulf Energy Information Excellence Award for Best Health, Safety or Environmental Contribution in the downstream category. "Pioneering AI-driven plant video surveillance project with Jio Platforms – Reliance Industries Limited."

Found out about it the way engineers usually find out about awards—someone forwarded a link months after the ceremony.

---

Somewhere in Gujarat right now, cameras are running. Pipelines flowing. Neural networks parsing frames nobody will ever watch, looking for missing helmets and sudden falls.

The work is invisible when it's working. Success measured in non-events. Accidents not happening. Workers going home.
