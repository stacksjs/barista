// swift-tools-version: 5.5
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "barista",
    platforms: [
        .macOS(.v10_15)
    ],
    products: [
        // Products define the executables and libraries a package produces, making them visible to other packages.
        .library(
            name: "barista",
            targets: ["barista"])
    ],
    dependencies: [
        .package(url: "https://github.com/sparkle-project/Sparkle", from: "2.7.0"),
        .package(url: "https://github.com/soffes/HotKey", from: "0.1.3")
    ],
    targets: [
        // Targets are the basic building blocks of a package, defining a module or a test suite.
        // Targets can depend on other targets in this package and products from dependencies.
        .target(
            name: "barista",
            dependencies: [
                .product(name: "Sparkle", package: "Sparkle"),
                .product(name: "HotKey", package: "HotKey")
            ]),
        .testTarget(
            name: "baristaTests",
            dependencies: ["barista"])
    ]
)
