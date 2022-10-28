const pluginFactory = function(Plugin) {
  // server-side does nothing special, just there for consistency
  return class PluginPlatform extends Plugin {}
}

export default pluginFactory;
