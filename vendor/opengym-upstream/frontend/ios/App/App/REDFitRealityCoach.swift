import SwiftUI
import RealityKit
import UIKit
import AVFoundation
import ImageIO

enum RFMovement {
    // Only recognizable supported patterns get a schematic 3D alternative.
    static func forExercise(_ name: String) -> String? {
        let name = name.lowercased()
        if name.contains("squat") || name.contains("kniebeuge") { return "squat" }
        if name.contains("bench press") || name.contains("bankdrücken") { return "push" }
        if name.contains("deadlift") || name.contains("kreuzheben") { return "hinge" }
        if name.contains("lateral raise") || name.contains("seitheben") { return "raise" }
        if name.contains("shoulder press") || name.contains("schulterdrücken") { return "press" }
        if name.contains("biceps curl") || name.contains("bizepscurl") { return "curl" }
        if name.contains("lat pulldown") || name.contains("latzug") { return "pull" }
        if name.contains("crunch") { return "crunch" }
        if name == "plank" || name == "unterarmstütz" { return "plank" }
        if name.contains("lunge") || name.contains("ausfallschritt") { return "lunges" }
        return nil
    }
}

struct RFRealityCoach: View {
    let movement: String
    @Binding var selectedMuscle: String?
    @Environment(\.accessibilityReduceMotion) var reduceMotion
    @Environment(\.scenePhase) var scenePhase
    @State private var playing = true
    @State private var visible = false
    @State private var reset = 0
    var body: some View {
        ZStack(alignment: .bottom) {
            RFRealityScene(movement: movement, playing: playing && visible && !reduceMotion && scenePhase == .active, reset: reset, selectedMuscle: $selectedMuscle)
                .accessibilityLabel("Drehbares schematisches 3D-Körpermodell")
            HStack {
                Button(playing ? "Pausieren" : "Abspielen", systemImage: playing ? "pause.fill" : "play.fill") { playing.toggle() }
                Spacer()
                Button("Ansicht zurücksetzen", systemImage: "arrow.counterclockwise") { reset += 1 }
            }.labelStyle(.iconOnly).buttonStyle(.glass).controlSize(.large).padding(12)
        }.background(.black).clipShape(.rect(cornerRadius: 16))
            .onAppear { visible = true }.onDisappear { visible = false }
    }
}

private struct RFPoseLibrary: Decodable {
    struct Segment: Decodable {
        let a: String, b: String, radius: Float
        init(from decoder: Decoder) throws { var values = try decoder.unkeyedContainer(); a = try values.decode(String.self); b = try values.decode(String.self); radius = try values.decode(Float.self) }
    }
    struct Movement: Decodable { let equipment: String; let bench: Bool; let mat: Bool; let cameraTargetY: Float; let frames: [[String: [Float]]] }
    let segments: [Segment]
    let movements: [String: Movement]
    static let shared: RFPoseLibrary? = {
        guard let url = Bundle.main.url(forResource: "redfit-poses", withExtension: "json"), let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(RFPoseLibrary.self, from: data)
    }()
}

private struct RFRealityScene: UIViewRepresentable {
    let movement: String
    let playing: Bool
    let reset: Int
    @Binding var selectedMuscle: String?
    func makeCoordinator() -> Coordinator { Coordinator(selected: $selectedMuscle) }
    func makeUIView(context: Context) -> ARView {
        let view = ARView(frame: .zero, cameraMode: .nonAR, automaticallyConfigureSession: false)
        view.environment.background = .color(.black)
        context.coordinator.attach(view)
        return view
    }
    func updateUIView(_ view: ARView, context: Context) { context.coordinator.configure(movement: movement, playing: playing, reset: reset, selected: selectedMuscle) }
    static func dismantleUIView(_ view: ARView, coordinator: Coordinator) { coordinator.stop(); view.scene.anchors.removeAll() }

    @MainActor final class Coordinator: NSObject {
        weak var view: ARView?
        var selected: Binding<String?>
        let anchor = AnchorEntity(world: .zero)
        let figure = Entity()
        let camera = PerspectiveCamera()
        var bones: [ModelEntity] = []
        var joints: [String: ModelEntity] = [:]
        var bar: ModelEntity?
        var dumbbells: [ModelEntity] = []
        var props: [Entity] = []
        var displayLink: CADisplayLink?
        var movement = "", resetId = -1
        var phaseTime: Double = 0, previousTime: Double = 0
        var yaw: Float = 0.2, distance: Float = 3.2
        var selectedId: String?
        let silver = SimpleMaterial(color: UIColor(white: 0.88, alpha: 1), roughness: 0.65, isMetallic: false)
        let green = SimpleMaterial(color: UIColor(red: 0.1, green: 0.85, blue: 0.25, alpha: 1), roughness: 0.6, isMetallic: false)
        init(selected: Binding<String?>) { self.selected = selected }
        func attach(_ view: ARView) {
            self.view = view
            view.scene.addAnchor(anchor); anchor.addChild(figure); anchor.addChild(camera)
            let light = DirectionalLight(); light.light.intensity = 3500; light.position = [1, 3, 3]; light.look(at: [0, 0.8, 0], from: light.position, relativeTo: nil); anchor.addChild(light)
            let fill = PointLight(); fill.light.intensity = 800; fill.position = [-2, 2, -2]; anchor.addChild(fill)
            if let library = RFPoseLibrary.shared {
                for segment in library.segments {
                    let bone = ModelEntity(mesh: .generateCylinder(height: 1, radius: segment.radius), materials: [silver])
                    bone.name = muscle(for: segment.a, end: segment.b); bone.generateCollisionShapes(recursive: false); figure.addChild(bone); bones.append(bone)
                }
                let names = library.movements["squat"]?.frames.first?.keys.map { $0 } ?? []
                for name in names {
                    let radius: Float = name == "head" ? 0.105 : name == "pelvis" ? 0.1 : 0.045
                    let joint = ModelEntity(mesh: .generateSphere(radius: radius), materials: [silver]); figure.addChild(joint); joints[name] = joint
                }
            }
            view.addGestureRecognizer(UIPanGestureRecognizer(target: self, action: #selector(pan(_:))))
            view.addGestureRecognizer(UIPinchGestureRecognizer(target: self, action: #selector(pinch(_:))))
            view.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(tap(_:))))
            let link = CADisplayLink(target: self, selector: #selector(tick(_:))); link.preferredFrameRateRange = CAFrameRateRange(minimum: 30, maximum: 60, preferred: 60); link.isPaused = true; link.add(to: .main, forMode: .common); displayLink = link
        }
        func configure(movement: String, playing: Bool, reset: Int, selected: String?) {
            if self.movement != movement { self.movement = movement; phaseTime = 0; rebuildProps() }
            if resetId != reset { resetId = reset; yaw = 0.2; distance = 3.2 }
            selectedId = selected
            displayLink?.isPaused = !playing
            if !playing { previousTime = 0 }
            render()
        }
        func stop() { displayLink?.invalidate(); displayLink = nil }
        @objc func tick(_ link: CADisplayLink) { if previousTime > 0 { phaseTime += min(0.05, link.timestamp - previousTime) }; previousTime = link.timestamp; render() }
        func pose() -> [String: SIMD3<Float>] {
            guard let frames = RFPoseLibrary.shared?.movements[movement]?.frames, !frames.isEmpty else { return [:] }
            let phase = Float((sin(phaseTime * 1.7) + 1) / 2) * Float(frames.count - 1)
            let i = min(frames.count - 1, Int(phase)), j = min(frames.count - 1, i + 1), blend = phase - Float(i)
            return frames[i].reduce(into: [:]) { result, pair in
                guard pair.value.count == 3, let to = frames[j][pair.key], to.count == 3 else { return }
                let a = SIMD3<Float>(pair.value[0], pair.value[1], pair.value[2]), b = SIMD3<Float>(to[0], to[1], to[2])
                result[pair.key] = a + (b - a) * blend
            }
        }
        func render() {
            guard let library = RFPoseLibrary.shared, let movement = library.movements[movement] else { return }
            let pose = pose()
            for (i, segment) in library.segments.enumerated() where i < bones.count {
                guard let a = pose[segment.a], let b = pose[segment.b] else { continue }
                let vector = b - a, length = simd_length(vector)
                bones[i].position = (a + b) / 2; bones[i].scale = [1, max(0.001, length), 1]
                if length > 0.0001 { bones[i].orientation = simd_quatf(from: [0, 1, 0], to: simd_normalize(vector)) }
                bones[i].model?.materials = [bones[i].name == selectedId ? green : silver]
            }
            for (name, joint) in joints { if let position = pose[name] { joint.position = position } }
            if let left = pose["handL"], let right = pose["handR"] { bar?.position = (left + right) / 2; if dumbbells.count == 2 { dumbbells[0].position = left; dumbbells[1].position = right } }
            figure.orientation = simd_quatf(angle: yaw, axis: [0, 1, 0])
            let target = SIMD3<Float>(0, movement.cameraTargetY, 0)
            camera.look(at: target, from: [0, movement.cameraTargetY + 0.15, distance], relativeTo: nil)
        }
        func rebuildProps() {
            props.forEach { $0.removeFromParent() }; props.removeAll(); dumbbells.removeAll(); bar = nil
            guard let movement = RFPoseLibrary.shared?.movements[movement] else { return }
            let material = SimpleMaterial(color: .darkGray, roughness: 0.4, isMetallic: true)
            if movement.equipment == "barbell" || movement.equipment == "pulldownBar" {
                let entity = ModelEntity(mesh: .generateCylinder(height: 1.15, radius: 0.018), materials: [material]); entity.orientation = simd_quatf(angle: .pi / 2, axis: [0, 0, 1]); figure.addChild(entity); props.append(entity); bar = entity
            } else if movement.equipment == "dumbbells" {
                for _ in 0..<2 { let entity = ModelEntity(mesh: .generateBox(size: [0.2, 0.09, 0.09], cornerRadius: 0.02), materials: [material]); figure.addChild(entity); props.append(entity); dumbbells.append(entity) }
            }
            if movement.bench {
                let bench = ModelEntity(mesh: .generateBox(size: [0.38, 0.07, 1.25], cornerRadius: 0.025), materials: [material]); bench.position = [0, 0.45, 0]; figure.addChild(bench); props.append(bench)
            }
            if movement.mat {
                let mat = ModelEntity(mesh: .generateBox(size: [0.65, 0.015, 1.9], cornerRadius: 0.005), materials: [SimpleMaterial(color: UIColor(red: 0.03, green: 0.17, blue: 0.07, alpha: 1), isMetallic: false)]); mat.position = [0, 0.005, 0]; figure.addChild(mat); props.append(mat)
            }
        }
        func muscle(for start: String, end: String) -> String {
            if end.hasPrefix("knee") { return "quadriceps" }
            if end.hasPrefix("foot") { return "calves" }
            if end.hasPrefix("elbow") { return "biceps" }
            if end.hasPrefix("hand") { return "forearm" }
            if end.hasPrefix("shoulder") { return "deltoids" }
            if end.hasPrefix("hip") { return "gluteal" }
            if end == "chest" { return "abs" }
            return "chest"
        }
        @objc func pan(_ gesture: UIPanGestureRecognizer) { guard let view else { return }; yaw += Float(gesture.translation(in: view).x) * 0.012; gesture.setTranslation(.zero, in: view); render() }
        @objc func pinch(_ gesture: UIPinchGestureRecognizer) { distance = min(6, max(1.4, distance / Float(gesture.scale))); gesture.scale = 1; render() }
        @objc func tap(_ gesture: UITapGestureRecognizer) { guard let view, let entity = view.entity(at: gesture.location(in: view)), !entity.name.isEmpty else { return }; selected.wrappedValue = entity.name == selected.wrappedValue ? nil : entity.name; selectedId = selected.wrappedValue; render() }
    }
}

enum RFLocalMedia {
    static func url(_ source: String) -> URL? {
        guard let root = Bundle.main.resourceURL?.appendingPathComponent("public", isDirectory: true) else { return nil }
        let input = URL(string: source)
        if let scheme = input?.scheme, !["capacitor", "file"].contains(scheme) { return nil }
        let path = (input?.path ?? source).removingPercentEncoding ?? source
        guard !path.split(separator: "/").contains(".."), !path.contains("\\") else { return nil }
        let file = root.appendingPathComponent(path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))).standardizedFileURL
        guard file.path.hasPrefix(root.path + "/"), FileManager.default.fileExists(atPath: file.path) else { return nil }
        return file
    }
}

struct RFExerciseMedia: View {
    let exercise: RFRecord
    @Environment(\.accessibilityReduceMotion) var reduceMotion
    @Environment(\.scenePhase) var phase
    @State private var image: UIImage?
    @State private var video: URL?
    @State private var playing = true
    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            Color.black
            if let video { RFLocalVideo(url: video, playing: playing && !reduceMotion && phase == .active) }
            else if let image { RFAnimatedImage(image: image, playing: playing && !reduceMotion && phase == .active) }
            else { ContentUnavailableView("Keine lokale Vorführung", systemImage: "figure.strengthtraining.traditional", description: Text("Die Übung bleibt im Training nutzbar.")) }
            Button(playing ? "Vorführung pausieren" : "Vorführung abspielen", systemImage: playing ? "pause.fill" : "play.fill") { playing.toggle() }.labelStyle(.iconOnly).buttonStyle(.glass).controlSize(.large).padding()
        }.task(id: exercise.id) {
            let clips = exercise.raw["clips"] as? [String] ?? []
            let sources = (exercise.bool("still") ? [] : clips) + [exercise.string("image")]
            for source in sources {
                guard let url = RFLocalMedia.url(source) else { continue }
                if ["mp4", "mov"].contains(url.pathExtension.lowercased()) { video = url; return }
                if let decoded = await Task.detached(priority: .userInitiated, operation: { Self.decode(url) }).value { image = decoded; return }
            }
        }
    }
    private static func decode(_ url: URL) -> UIImage? {
        guard let source = CGImageSourceCreateWithURL(url as CFURL, nil) else { return nil }
        let count = min(CGImageSourceGetCount(source), 240)
        var images: [UIImage] = [], duration: Double = 0
        for i in 0..<count {
            let options: [CFString: Any] = [kCGImageSourceCreateThumbnailFromImageAlways: true, kCGImageSourceThumbnailMaxPixelSize: 720, kCGImageSourceCreateThumbnailWithTransform: true]
            guard let frame = CGImageSourceCreateThumbnailAtIndex(source, i, options as CFDictionary) else { continue }
            images.append(UIImage(cgImage: frame))
            let props = CGImageSourceCopyPropertiesAtIndex(source, i, nil) as? [String: Any] ?? [:]
            var delay = 0.08
            for dictionary in props.values.compactMap({ $0 as? [String: Any] }) {
                if let value = dictionary.first(where: { $0.key.lowercased().contains("delaytime") })?.value as? NSNumber { delay = max(0.02, value.doubleValue) }
            }
            duration += delay
        }
        return images.count > 1 ? UIImage.animatedImage(with: images, duration: duration) : images.first
    }
}

private struct RFAnimatedImage: UIViewRepresentable {
    let image: UIImage
    let playing: Bool
    func makeUIView(context: Context) -> UIImageView { let view = UIImageView(); view.contentMode = .scaleAspectFit; view.clipsToBounds = true; return view }
    func updateUIView(_ view: UIImageView, context: Context) { if view.image !== image { view.image = image }; if playing { view.startAnimating() } else { view.stopAnimating(); if let first = image.images?.first { view.image = first } } }
    static func dismantleUIView(_ view: UIImageView, coordinator: ()) { view.stopAnimating(); view.image = nil }
}
private struct RFLocalVideo: UIViewRepresentable {
    let url: URL
    let playing: Bool
    final class PlayerView: UIView { override class var layerClass: AnyClass { AVPlayerLayer.self }; var queue: AVQueuePlayer?; var looper: AVPlayerLooper? }
    func makeUIView(context: Context) -> PlayerView { let view = PlayerView(); let queue = AVQueuePlayer(); queue.isMuted = true; view.queue = queue; view.looper = AVPlayerLooper(player: queue, templateItem: AVPlayerItem(url: url)); (view.layer as? AVPlayerLayer)?.player = queue; (view.layer as? AVPlayerLayer)?.videoGravity = .resizeAspect; return view }
    func updateUIView(_ view: PlayerView, context: Context) { if playing { view.queue?.play() } else { view.queue?.pause() } }
    static func dismantleUIView(_ view: PlayerView, coordinator: ()) { view.queue?.pause(); view.looper?.disableLooping(); view.queue?.removeAllItems() }
}
