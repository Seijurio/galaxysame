import AVFoundation
import CoreText
import Foundation
import ImageIO

let args = CommandLine.arguments

func fail(_ text: String) -> Never {
  FileHandle.standardError.write((text + "\n").data(using: .utf8)!)
  exit(1)
}

func buildAtlas(cellW: Int, cellH: Int, fontSize: CGFloat) -> [UInt8] {
  var atlas = [UInt8](repeating: 0, count: 256 * cellW * cellH)
  let font = CTFontCreateWithName("Menlo-Regular" as CFString, fontSize, nil)
  let descent = CTFontGetDescent(font)
  let leading = (CGFloat(cellH) - CTFontGetAscent(font) - descent) / 2
  let gray = CGColorSpaceCreateDeviceGray()
  for code in 33..<256 where code != 128 && (code < 127 || code > 160) {
    guard let scalar = UnicodeScalar(code) else { continue }
    var glyph = [UInt8](repeating: 0, count: cellW * cellH)
    glyph.withUnsafeMutableBytes { raw in
      guard let ctx = CGContext(data: raw.baseAddress, width: cellW, height: cellH, bitsPerComponent: 8, bytesPerRow: cellW, space: gray, bitmapInfo: CGImageAlphaInfo.none.rawValue) else { return }
      ctx.setShouldAntialias(true)
      ctx.setFillColor(gray: 1, alpha: 1)
      let text = NSAttributedString(string: String(Character(scalar)), attributes: [kCTFontAttributeName as NSAttributedString.Key: font, kCTForegroundColorFromContextAttributeName as NSAttributedString.Key: true])
      let line = CTLineCreateWithAttributedString(text)
      ctx.textPosition = CGPoint(x: 0, y: leading + descent)
      CTLineDraw(line, ctx)
    }
    for y in 0..<cellH {
      for x in 0..<cellW {
        atlas[(code * cellH + y) * cellW + x] = glyph[y * cellW + x]
      }
    }
  }
  return atlas
}

func readFully(_ pointer: UnsafeMutablePointer<UInt8>, _ count: Int) -> Bool {
  var done = 0
  while done < count {
    let got = read(0, pointer + done, count - done)
    if got <= 0 { return false }
    done += got
  }
  return true
}

func encode() {
  let cols = Int(args[2])!
  let rows = Int(args[3])!
  let width = Int(args[4])!
  let height = Int(args[5])!
  let fps = Int32(args[6])!
  let bitrate = Int(args[7])!
  let codec = args[8]
  let out = URL(fileURLWithPath: args[9])
  try? FileManager.default.removeItem(at: out)

  let cellW = width / cols
  let cellH = height / rows + 1
  let atlas = buildAtlas(cellW: cellW, cellH: cellH, fontSize: CGFloat(cellW) / 0.602)
  var tops = [Int](repeating: 0, count: rows + 1)
  for r in 0...rows { tops[r] = r * height / rows }

  guard let writer = try? AVAssetWriter(outputURL: out, fileType: .mp4) else { fail("writer") }
  var compression: [String: Any] = [
    AVVideoAverageBitRateKey: bitrate,
    AVVideoMaxKeyFrameIntervalKey: Int(fps) * 2,
    AVVideoExpectedSourceFrameRateKey: Int(fps),
    AVVideoAllowFrameReorderingKey: true,
  ]
  if codec == "h264" { compression[AVVideoProfileLevelKey] = AVVideoProfileLevelH264HighAutoLevel }
  let settings: [String: Any] = [
    AVVideoCodecKey: codec == "h264" ? AVVideoCodecType.h264 : AVVideoCodecType.hevc,
    AVVideoWidthKey: width,
    AVVideoHeightKey: height,
    AVVideoCompressionPropertiesKey: compression,
    AVVideoColorPropertiesKey: [
      AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2,
      AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2,
      AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2,
    ],
  ]
  let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
  input.expectsMediaDataInRealTime = false
  let attributes: [String: Any] = [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
    kCVPixelBufferWidthKey as String: width,
    kCVPixelBufferHeightKey as String: height,
  ]
  let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: attributes)
  writer.add(input)
  guard writer.startWriting() else { fail("start: \(String(describing: writer.error))") }
  writer.startSession(atSourceTime: .zero)

  let n = cols * rows
  let stride7 = n * 7
  let source = UnsafeMutablePointer<UInt8>.allocate(capacity: stride7)
  var index: Int64 = 0
  atlas.withUnsafeBufferPointer { glyphs in
    let atlasBase = glyphs.baseAddress!
    while readFully(source, stride7) {
      guard let pool = adaptor.pixelBufferPool else { fail("pool") }
      var made: CVPixelBuffer?
      CVPixelBufferPoolCreatePixelBuffer(nil, pool, &made)
      guard let buffer = made else { fail("buffer") }
      CVPixelBufferLockBaseAddress(buffer, [])
      let base = CVPixelBufferGetBaseAddress(buffer)!.assumingMemoryBound(to: UInt8.self)
      let bytes = CVPixelBufferGetBytesPerRow(buffer)
      let ch = UnsafePointer(source)
      let fr = ch + n
      let fg = fr + n
      let fb = fg + n
      let br = fb + n
      let bg = br + n
      let bb = bg + n
      DispatchQueue.concurrentPerform(iterations: rows) { row in
        let top = tops[row]
        let tall = tops[row + 1] - top
        for col in 0..<cols {
          let i = row * cols + col
          let code = Int(ch[i])
          let fR = Int(fr[i]), fG = Int(fg[i]), fB = Int(fb[i])
          let bR = Int(br[i]), bG = Int(bg[i]), bB = Int(bb[i])
          let half = code == 128
          for y in 0..<tall {
            var p = base + (top + y) * bytes + col * cellW * 4
            let cover = atlasBase + (code * cellH + y) * cellW
            for x in 0..<cellW {
              let k = half ? (y * 2 < tall ? 255 : 0) : Int(cover[x])
              let inv = 255 - k
              p[0] = UInt8((fB * k + bB * inv) / 255)
              p[1] = UInt8((fG * k + bG * inv) / 255)
              p[2] = UInt8((fR * k + bR * inv) / 255)
              p[3] = 255
              p += 4
            }
          }
        }
      }
      CVPixelBufferUnlockBaseAddress(buffer, [])
      while !input.isReadyForMoreMediaData { usleep(1000) }
      if !adaptor.append(buffer, withPresentationTime: CMTime(value: index, timescale: fps)) { fail("append: \(String(describing: writer.error))") }
      index += 1
    }
  }
  input.markAsFinished()
  let done = DispatchSemaphore(value: 0)
  writer.finishWriting { done.signal() }
  done.wait()
  if writer.status != .completed { fail("finish: \(String(describing: writer.error))") }
}

func mux() {
  let video = AVURLAsset(url: URL(fileURLWithPath: args[2]))
  let audio = AVURLAsset(url: URL(fileURLWithPath: args[3]))
  let out = URL(fileURLWithPath: args[4])
  try? FileManager.default.removeItem(at: out)
  let mix = AVMutableComposition()
  guard let v = video.tracks(withMediaType: .video).first, let a = audio.tracks(withMediaType: .audio).first else { fail("tracks") }
  let span = CMTimeRange(start: .zero, duration: video.duration)
  let vt = mix.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)!
  try! vt.insertTimeRange(span, of: v, at: .zero)
  let at = mix.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)!
  let skip = CMTime(seconds: Double(args[5])!, preferredTimescale: 48000)
  let audioSpan = CMTimeRange(start: skip, duration: CMTimeMinimum(video.duration, CMTimeSubtract(audio.duration, skip)))
  try! at.insertTimeRange(audioSpan, of: a, at: .zero)
  guard let export = AVAssetExportSession(asset: mix, presetName: AVAssetExportPresetPassthrough) else { fail("export") }
  export.outputURL = out
  export.outputFileType = .mp4
  export.shouldOptimizeForNetworkUse = true
  let done = DispatchSemaphore(value: 0)
  export.exportAsynchronously { done.signal() }
  done.wait()
  if export.status != .completed { fail("mux: \(String(describing: export.error))") }
}

func grab() {
  let asset = AVURLAsset(url: URL(fileURLWithPath: args[2]))
  let reader = AVAssetImageGenerator(asset: asset)
  reader.requestedTimeToleranceBefore = .zero
  reader.requestedTimeToleranceAfter = .zero
  for text in args[4].split(separator: ",") {
    let time = CMTime(seconds: Double(text)!, preferredTimescale: 600)
    guard let image = try? reader.copyCGImage(at: time, actualTime: nil) else { continue }
    let url = URL(fileURLWithPath: args[3]).appendingPathComponent("v\(text).png") as CFURL
    guard let dest = CGImageDestinationCreateWithURL(url, "public.png" as CFString, 1, nil) else { continue }
    CGImageDestinationAddImage(dest, image, nil)
    CGImageDestinationFinalize(dest)
  }
  print(CMTimeGetSeconds(asset.duration), asset.tracks.map { "\($0.mediaType.rawValue) \(Int($0.estimatedDataRate / 1000)) kb/s" })
}

switch args[1] {
case "encode": encode()
case "mux": mux()
case "grab": grab()
default: fail("usage")
}
