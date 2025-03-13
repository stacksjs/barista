import PackagePlugin

@main
struct SwiftLintCommandPlugin: CommandPlugin {
    func performCommand(context: PluginContext, arguments: [String]) async throws {
        let swiftlint = try context.tool(named: "swiftlint")
        let process = Process()
        process.executableURL = URL(fileURLWithPath: swiftlint.path.string)
        process.arguments = arguments
        try process.run()
        process.waitUntilExit()

        if process.terminationStatus != 0 {
            Diagnostics.error("swiftlint exited with non-zero status: \(process.terminationStatus)")
        }
    }
}