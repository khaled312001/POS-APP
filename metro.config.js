const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [
  /\.local\/skills\/\.tmp-.*/,
  /\.local\/skills\/\.old-.*/,
];

module.exports = config;
