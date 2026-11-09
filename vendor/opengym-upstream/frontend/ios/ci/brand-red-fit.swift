// Generates private RED Fit iOS assets from the repository's existing RED Fit icon.
// Run from vendor/opengym-upstream/frontend with: swift ios/ci/brand-red-fit.swift
// This changes the default iPhone and companion Watch app icons and splash; alternate icons and entitlements remain untouched.
import AppKit
import Foundation

let fileManager = FileManager.default
let frontend = URL(fileURLWithPath: fileManager.currentDirectoryPath, isDirectory: true)
let source = frontend.appendingPathComponent("../../../public/icons/icon-512.png").standardizedFileURL
let assetRoot = frontend.appendingPathComponent("ios/App/App/Assets.xcassets", isDirectory: true)
guard let icon = NSImage(contentsOf: source) else {
    fputs("RED Fit icon missing at \(source.path)\n", stderr)
    exit(1)
}

func drawAsset(to path: URL, size: Int, imageSize: CGFloat) throws {
    guard let bitmap = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: size,
        pixelsHigh: size,
        bitsPerSample: 8,
        samplesPerPixel: 3,
        hasAlpha: false,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    ), let context = NSGraphicsContext(bitmapImageRep: bitmap) else {
        throw NSError(domain: "REDFitAssets", code: 1,
                      userInfo: [NSLocalizedDescriptionKey: "Cannot create RGB bitmap"])
    }
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = context
    context.imageInterpolation = .high
    NSColor(calibratedRed: 12.0 / 255.0, green: 14.0 / 255.0,
            blue: 18.0 / 255.0, alpha: 1.0).setFill()
    NSRect(x: 0, y: 0, width: size, height: size).fill()
    let offset = (CGFloat(size) - imageSize) / 2
    icon.draw(in: NSRect(x: offset, y: offset, width: imageSize, height: imageSize),
              from: .zero, operation: .sourceOver, fraction: 1.0)
    context.flushGraphics()
    NSGraphicsContext.restoreGraphicsState()
    guard let data = bitmap.representation(using: .png, properties: [:]) else {
        throw NSError(domain: "REDFitAssets", code: 2,
                      userInfo: [NSLocalizedDescriptionKey: "Cannot encode PNG"])
    }
    try data.write(to: path, options: .atomic)
    print("RED Fit asset: \(path.lastPathComponent) — \(size)x\(size) RGB")
}

do {
    try drawAsset(to: assetRoot.appendingPathComponent("AppIcon.appiconset/AppIcon-512@2x.png"),
                  size: 1024, imageSize: 1024)
    // Keep the embedded Apple Watch app branded consistently with the RED Fit iPhone app.
    // Filename is defined by Watch/Assets.xcassets/AppIcon.appiconset/Contents.json.
    try drawAsset(to: frontend.appendingPathComponent("ios/App/Watch/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png"),
                  size: 1024, imageSize: 1024)
    let splashDir = assetRoot.appendingPathComponent("Splash.imageset")
    for scale in 1...3 {
        for appearance in ["", "-dark"] {
            let file = "Default@\(scale)x~universal~anyany\(appearance).png"
            try drawAsset(to: splashDir.appendingPathComponent(file),
                          size: 1366, imageSize: 420)
        }
    }
} catch {
    fputs("RED Fit asset generation failed: \(error)\n", stderr)
    exit(1)
}
