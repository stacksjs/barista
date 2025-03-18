// swift-tools-version: 5.7
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "barista",
    defaultLocalization: "en",
    platforms: [
        .macOS(.v12)
    ],
    products: [
        // Products define the executables and libraries a package produces, making them visible to other packages.
        .executable(
            name: "barista",
            targets: ["barista"])
    ],
    dependencies: [
        .package(url: "https://github.com/sparkle-project/Sparkle", from: "2.7.0"),
        .package(url: "https://github.com/soffes/HotKey", from: "0.2.1")
    ],
    targets: [
        // Targets are the basic building blocks of a package, defining a module or a test suite.
        // Targets can depend on other targets in this package and products from dependencies.
        .target(
            name: "barista",
            dependencies: [
                .product(name: "Sparkle", package: "Sparkle"),
                .product(name: "HotKey", package: "HotKey")
            ],
            path: "src/barista"),
        .testTarget(
            name: "baristaTests",
            dependencies: ["barista"],
            path: "tests")
    ]
)
